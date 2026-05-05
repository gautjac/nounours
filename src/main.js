// App bootstrap + finite state machine.
// Phases: intro → questionnaire → world → ending
//
// HOW IT FITS TOGETHER
// --------------------
// 1. Intro overlay shows; "Begin" calls startQuestionnaire().
// 2. Questionnaire collects 5 answers (questions.js), then we
//    initialize the world (palette, mood, music) and build the
//    starting zone (theatre curtain), spawn Nounours.
// 3. The animation loop drives the puppet (player input), camera,
//    interactions, NPC bobs, and dialogue input each frame.
// 4. Dialogue/Endings can flip flags; reaching an ending (auto or via
//    the hidden door) shows the Ending overlay with a Restart action.
//
// HOW ANSWERS SHAPE THE STORY
// ---------------------------
//  - profile.time     → palette + lighting + which body in sky
//  - profile.journey  → ambient music scale + opening NPC tone
//  - profile.seeks    → narrator phrasing in intro voice
//  - profile.bravery  → opener variations on Maru
//  - profile.world    → narrator world-noun + endings text colorings
//
// HOW TO ADD CONTENT
// ------------------
//  - New zone:   add to zoneDefs in zones.js, plus a `buildProps` arm.
//  - New NPC:    add to npcDefs in npcs.js with a build() and a
//                dialogue() function returning a node tree.
//  - New ending: add a key to endings in story.js, then trigger via
//                checkEndings() (auto) or a prop interaction.
//  - New question: append to `questions` in questionnaire.js and
//                  consume profile[key] anywhere downstream.

import * as THREE from 'three';
import { state, resetState, memoryCount } from './state.js';
import { initAudio, playMusic, sfx, setMuted } from './audio.js';
import { Puppet } from './puppet.js';
import { initInput, consumeEvent } from './input.js';
import { initCamera, updateCamera, snapCamera } from './camera.js';
import {
  initWorld, buildZone, updateWorld, getCurrentZone, getZoneDef,
  setOnExit, tryTriggerExit,
} from './world.js';
import {
  initInteractions, updateInteractions,
} from './interaction.js';
import {
  initUI, showIntro, showQuestionnaireUI, hideAll, showHud,
  updateHud, curtainDown, curtainUp, showEnding,
} from './ui.js';
import { isDialogueOpen, updateDialogueInput } from './dialogue.js';
import { reachCurtainCall } from './story.js';

// ---------- Three.js setup ----------

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0a14);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
initCamera(camera);

// hemisphere-ish baseline lighting for any future depth (not strictly
// needed since we use MeshBasicMaterial — but cheap insurance for
// upgrade-path materials).
scene.add(new THREE.AmbientLight(0xffffff, 0.9));

const clock = new THREE.Clock();
let puppet = null;
let isLoopRunning = false;

// debug hook — non-load-bearing, useful for `window.__nounours.puppet.group.position`
window.__nounours = { get puppet() { return puppet; }, scene, camera, state };

// ---------- Bootstrap UI + Input ----------

initInput();
initInteractions(camera);
initUI({
  onBegin: handleBegin,
  onRestart: handleRestart,
});

window.addEventListener('story:ending', (e) => {
  // give the player a beat, then show ending
  sfx('ending');
  setTimeout(() => {
    state.phase = 'ending';
    showEnding(e.detail.key);
  }, 600);
});

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

showIntro();
startLoop();

// ---------- Phase transitions ----------

function handleBegin() {
  // Audio must initialize on a user gesture
  initAudio();
  state.phase = 'questionnaire';
  showQuestionnaireUI((profile) => enterWorld(profile));
}

async function enterWorld(profile) {
  state.profile = profile;
  state.phase = 'world';
  hideAll();
  await curtainDown();

  initWorld(scene, profile);
  const { spawnX } = buildZone('theatre', null);

  if (!puppet) {
    puppet = new Puppet();
    scene.add(puppet.group);
  }
  puppet.setPosition(spawnX, 0, 0);
  applyZoneBounds();
  snapCamera(camera, spawnX);

  setOnExit(handleZoneExit);

  showHud();
  updateHud();
  playMusic(profile);
  await curtainUp();
}

async function handleZoneExit(targetZone, fromSide) {
  if (state.phase !== 'world') return;
  await curtainDown();
  const { spawnX } = buildZone(targetZone, fromSide);
  puppet.setPosition(spawnX, 0, 0);
  applyZoneBounds();
  snapCamera(camera, spawnX);
  updateHud();
  await curtainUp();
}

function applyZoneBounds() {
  const def = getZoneDef();
  if (!def) return;
  puppet.setBounds(def.bounds[0], def.bounds[1]);
}

function handleRestart() {
  // Tear down the world: keep the renderer, scene, lights.
  // Drop puppet + zoneRoot via buildZone path.
  state.flags = freshFlags();
  state.profile = null;
  state.phase = 'intro';
  state.currentZone = 'theatre';

  if (puppet) {
    scene.remove(puppet.group);
    puppet = null;
  }
  // Remove zone root if present
  for (let i = scene.children.length - 1; i >= 0; i--) {
    const c = scene.children[i];
    if (c.name && c.name.startsWith('zone:')) scene.remove(c);
  }
  scene.fog = null;
  scene.background = new THREE.Color(0x0e0a14);

  hideAll();
  showIntro();
}

function freshFlags() {
  // mirror state.js fresh flags but local — avoids importing internals
  return {
    mem_song: false, mem_lantern: false, mem_star: false,
    befriended_embre: false, befriended_lior: false, befriended_maru: false,
    door_revealed: false, ending: null,
  };
}

// ---------- Animation loop ----------

function startLoop() {
  if (isLoopRunning) return;
  isLoopRunning = true;
  clock.start();
  requestAnimationFrame(frame);
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.066);

  if (state.phase === 'world' && puppet) {
    if (!isDialogueOpen()) {
      const input = readInput();
      puppet.update(dt, input);

      // try exit if at zone edge moving outward
      tryTriggerExit(puppet);

      updateInteractions(puppet, scene, camera);

      // Escape opens nothing right now; reserved for future menu
      if (consumeEvent('escape')) {
        // currently nothing
      }
    } else {
      puppet.update(dt, { x: 0, z: 0 });
      updateDialogueInput();
    }
    updateCamera(camera, puppet, dt);
    updateWorld(dt);
    updateHud();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function readInput() {
  // import lazy to avoid circular imports at module init time
  return inputSnapshot();
}

import { getInput } from './input.js';
function inputSnapshot() { return getInput(); }
