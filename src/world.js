// World: holds the active zone, builds backdrop+props+NPCs, swaps
// between zones with a quick curtain transition, and animates
// ambient details (NPC bobs, sky drift) every frame.

import * as THREE from 'three';
import { state } from './state.js';
import { zoneDefs, getPalette, buildBackdrop, buildProps } from './zones.js';
import { npcDefs } from './npcs.js';
import { sfx } from './audio.js';

let scene = null;
let zoneRoot = null;
let palette = null;
let zoneId = null;
let npcInstances = [];
let propInstances = [];
let exits = []; // {x, target, side, label}
let onExitCallback = null;

let _t = 0;

export function getCurrentZone() { return zoneId; }
export function getZoneDef() { return zoneDefs[zoneId]; }
export function getNpcInstances() { return npcInstances; }
export function getExits() { return exits; }
export function getZoneRoot() { return zoneRoot; }

export function initWorld(threeScene, profile) {
  scene = threeScene;
  palette = getPalette(profile);
  scene.background = new THREE.Color(palette.sky[palette.sky.length - 1]);
  scene.fog = new THREE.Fog(palette.fog, palette.fogNear, palette.fogFar);
}

export function buildZone(id, fromSide = null) {
  if (zoneRoot) {
    scene.remove(zoneRoot);
    zoneRoot.traverse((o) => {
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose && m.dispose());
        else o.material.dispose && o.material.dispose();
      }
      if (o.geometry) o.geometry.dispose && o.geometry.dispose();
    });
  }
  npcInstances = [];
  propInstances = [];
  exits = [];

  const def = zoneDefs[id];
  if (!def) throw new Error('Unknown zone ' + id);

  zoneRoot = new THREE.Group();
  zoneRoot.name = 'zone:' + id;

  zoneRoot.add(buildBackdrop(id, palette));
  const propsGroup = buildProps(id, palette);
  zoneRoot.add(propsGroup);

  // Track special props (hidden door)
  propsGroup.traverse((o) => {
    if (o.userData?.isHiddenDoor) {
      propInstances.push({ name: 'hidden_door', mesh: o, kind: 'door' });
      o.userData.proxyRadius = 3.0;
    }
  });

  // NPCs
  for (const npcId of def.npcs || []) {
    const def2 = npcDefs[npcId];
    if (!def2) continue;
    const built = def2.build();
    built.group.position.set(...def2.position);
    zoneRoot.add(built.group);
    npcInstances.push({
      id: npcId,
      def: def2,
      group: built.group,
      sprite: built.sprite,
      basePos: [...def2.position],
    });
  }

  // Exits — at the X bounds, slightly inside, with invisible markers
  const [minX, maxX] = def.bounds;
  for (const exit of (def.exits || [])) {
    const ex = exit.side === 'left' ? minX + 1.2 : maxX - 1.2;
    exits.push({
      x: ex, target: exit.target, side: exit.side, label: exit.label,
    });
  }

  scene.add(zoneRoot);
  zoneId = id;
  state.currentZone = id;

  // determine spawn x for player from side
  let spawnX = def.spawnAt.default;
  if (fromSide && def.spawnAt[fromSide] !== undefined) spawnX = def.spawnAt[fromSide];
  return { spawnX, bounds: def.bounds };
}

export function setOnExit(cb) { onExitCallback = cb; }

export function tryTriggerExit(puppet) {
  const px = puppet.group.position.x;
  for (const e of exits) {
    const close = e.side === 'left' ? (px < e.x + 0.4) : (px > e.x - 0.4);
    if (close) {
      onExitCallback?.(e.target, e.side === 'left' ? 'right' : 'left');
      return true;
    }
  }
  return false;
}

export function updateWorld(dt) {
  _t += dt;

  // Animate NPCs (gentle bob + sway)
  for (const npc of npcInstances) {
    const amp = npc.group.userData.bobAmp ?? 0.05;
    const freq = npc.group.userData.bobFreq ?? 1.4;
    npc.group.position.y = Math.sin(_t * freq + npc.basePos[0]) * amp;
    if (npc.sprite) {
      npc.sprite.rotation.z = Math.sin(_t * freq * 0.7 + 1) * 0.03;
    }
  }

  // Reveal door if flag set
  for (const p of propInstances) {
    if (p.kind === 'door') {
      const target = state.flags.door_revealed ? 1 : 0;
      const cur = p.mesh.material.opacity;
      p.mesh.material.opacity += (target - cur) * Math.min(1, dt * 1.2);
    }
  }
}
