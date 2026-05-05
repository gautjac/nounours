// Interaction system: proximity-based highlighting + E-to-interact,
// plus mouse click via raycaster against NPC sprites and the hidden
// door. Interactions push dialogue nodes or trigger story events.

import * as THREE from 'three';
import { state, setFlag, memoryCount } from './state.js';
import { getNpcInstances, getZoneRoot, getCurrentZone } from './world.js';
import { openDialogue, isDialogueOpen } from './dialogue.js';
import { consumeEvent, consumeMouseClick } from './input.js';
import { showPrompt, hidePrompt } from './ui.js';
import { sfx } from './audio.js';
import { triggerEnding, checkEndings } from './story.js';

let raycaster = new THREE.Raycaster();
let camera = null;

export function initInteractions(c) { camera = c; }

let lastHovered = null;
let lastWavedAt = null;       // npc id → only wave once per proximity entry
let lastDoorPromptedAt = 0;   // ms — debounce reach gesture trigger
let doorReachArmed = true;    // re-arm reach when leaving door proximity

export function updateInteractions(puppet, scene, sceneCamera) {
  if (isDialogueOpen()) return;
  camera = sceneCamera;

  const ppos = puppet.group.position;

  // Proximity: nearest NPC within radius
  let nearest = null, nearestDist = Infinity;
  for (const npc of getNpcInstances()) {
    const dx = npc.group.position.x + npc.basePos[0]*0 - ppos.x; // group pos.x stays as basePos[0]
    // easier: use def position x
    const dxd = npc.def.position[0] - ppos.x;
    const dzd = npc.def.position[2] - ppos.z;
    const d = Math.hypot(dxd, dzd);
    if (d < (npc.def.radius || 2.5) && d < nearestDist) {
      nearest = npc; nearestDist = d;
    }
  }

  // Hidden door proximity (shore). The door is parked on the back layer
  // for the painted effect, so check only X-distance.
  let doorNear = null;
  if (state.flags.door_revealed && getCurrentZone() === 'shore') {
    const doorMesh = findDoorMesh();
    if (doorMesh) {
      const dx = Math.abs(doorMesh.position.x - ppos.x);
      if (dx < 3.0) doorNear = doorMesh;
    }
  }

  if (nearest) {
    // --- expressive: face NPC, look at them, wave on first approach ---
    if (Math.abs(puppet.vx) < 0.6) {
      const dx = nearest.def.position[0] - ppos.x;
      if (Math.abs(dx) > 0.3) puppet.setFacing(Math.sign(dx));
    }
    puppet.lookAt(nearest.def.position[0]);
    if (lastWavedAt !== nearest.id) {
      puppet.wave();
      lastWavedAt = nearest.id;
    }

    showPrompt(`speak with ${cleanName(nearest.def.name)}`);
    if (consumeEvent('interact')) {
      sfx('interact');
      puppet.react();
      const node = nearest.def.dialogue();
      openDialogue(node, () => {
        // After closing, check endings
        const reached = checkEndings();
        if (reached) {
          setTimeout(() => triggerEnding(reached), 350);
        }
      });
    }
  } else if (doorNear) {
    if (Math.abs(puppet.vx) < 0.6) {
      const dx = doorNear.position.x - ppos.x;
      if (Math.abs(dx) > 0.3) puppet.setFacing(Math.sign(dx));
    }
    puppet.lookAt(doorNear.position.x);
    if (doorReachArmed) {
      puppet.reach();
      doorReachArmed = false;
    }
    showPrompt('open the door');
    if (consumeEvent('interact')) {
      sfx('door');
      puppet.react();
      puppet.reach();
      // Open ending — the door
      setTimeout(() => triggerEnding('door_beyond'), 700);
    }
  } else {
    hidePrompt();
    puppet.lookAt(null);
    lastWavedAt = null;
    doorReachArmed = true;
    consumeEvent('interact'); // swallow stray E presses
  }

  // Hop
  if (consumeEvent('hop')) puppet.hop();

  // Mouse click — raycast against NPC sprites
  const click = consumeMouseClick();
  if (click) {
    raycaster.setFromCamera(new THREE.Vector2(click.x, click.y), camera);
    const hits = [];
    for (const npc of getNpcInstances()) {
      const meshes = [];
      npc.group.traverse(o => { if (o.isMesh) meshes.push(o); });
      const hit = raycaster.intersectObjects(meshes, false);
      if (hit.length) hits.push({ npc, dist: hit[0].distance });
    }
    if (hits.length) {
      hits.sort((a, b) => a.dist - b.dist);
      const target = hits[0].npc;
      // step toward NPC
      const tx = target.def.position[0] - Math.sign(target.def.position[0] - ppos.x) * 1.6;
      // simple: snap puppet halfway, let dialogue open
      ppos.x += (tx - ppos.x) * 0.8;
      sfx('interact');
      puppet.react();
      openDialogue(target.def.dialogue(), () => {
        const reached = checkEndings();
        if (reached) setTimeout(() => triggerEnding(reached), 350);
      });
    }
  }
}

function findDoorMesh() {
  const root = getZoneRoot();
  let result = null;
  root.traverse(o => { if (o.userData?.isHiddenDoor) result = o; });
  return result;
}

function cleanName(n) {
  if (n.startsWith('a voice')) return 'the voice';
  return n.split(',')[0];
}
