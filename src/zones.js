// Zones — each is a "stage" in the puppet theatre. A zone defines
// its palette (driven partly by the player's chosen time of day),
// backdrop layers, props, exits to other zones, and which NPCs live
// there. Zones are built lazily into a THREE.Group so we can swap.

import * as THREE from 'three';
import {
  makeSkyTexture, makeGroundTexture, makeFarLayerTexture,
  makeTreeTexture, makeHouseTexture, makeDoorTexture, makeLanternPropTexture,
  makeCurtainTexture, makePaperBoatTexture,
} from './textures.js';

// ---------- Palette by time-of-day ----------

const palettesByTime = {
  dawn: {
    sky:    ['#ffd2a0', '#f3a07a', '#a87aa0', '#5a4a7a'],
    ground: ['#7c5a4a', '#3a2820'],
    far:    '#5a4a7a',
    farAlt: '#3a3060',
    tufts:  '#caa07a',
    clouds: 'rgba(255,230,200,0.4)',
    body:   { x: 0.18, y: 0.7, r: 26, color: '#ffe0a0', glow: 'rgba(255, 200, 140, 0.7)' },
    stars:  0,
    fog:    0x6a4a5c, fogNear: 24, fogFar: 70,
  },
  twilight: {
    sky:    ['#3a2a4a', '#5e3a5e', '#a85a5a', '#caa07a'],
    ground: ['#4a3548', '#211625'],
    far:    '#3a2a4a',
    farAlt: '#2a1a3a',
    tufts:  '#7a5a78',
    clouds: 'rgba(180, 130, 160, 0.35)',
    body:   { x: 0.82, y: 0.78, r: 30, color: '#ffd870', glow: 'rgba(255, 200, 100, 0.6)' },
    stars:  60,
    fog:    0x2a1c30, fogNear: 22, fogFar: 60,
  },
  midnight: {
    sky:    ['#0a0a1e', '#0e1430', '#1a2042', '#2a2452'],
    ground: ['#1a1a2e', '#0a0a16'],
    far:    '#101830',
    farAlt: '#0a1024',
    tufts:  '#3a3a5a',
    clouds: 'rgba(60, 60, 100, 0.35)',
    body:   { x: 0.78, y: 0.22, r: 32, color: '#f5f0d8', glow: 'rgba(220, 220, 255, 0.55)' },
    stars:  220,
    fog:    0x080614, fogNear: 18, fogFar: 55,
  },
  rain: {
    sky:    ['#3a4858', '#4a5868', '#5a6878', '#7a8898'],
    ground: ['#3a4448', '#1c2024'],
    far:    '#3a4858',
    farAlt: '#2a3848',
    tufts:  '#4a5a5a',
    clouds: 'rgba(80,90,110,0.55)',
    body:   { x: 0.22, y: 0.32, r: 22, color: '#cad0d8', glow: 'rgba(180, 200, 220, 0.45)' },
    stars:  10,
    fog:    0x3a4858, fogNear: 22, fogFar: 60,
  },
};

export function getPalette(profile) {
  const t = (profile?.time) || 'twilight';
  return palettesByTime[t] || palettesByTime.twilight;
}

// ---------- Helpers ----------

function planeMesh(tex, w, h, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: opts.alphaTest ?? 0.02,
      depthWrite: opts.depthWrite ?? false, opacity: opts.opacity ?? 1,
    })
  );
  return m;
}

// ---------- Zone definitions ----------

export const zoneDefs = {
  theatre: {
    name: 'The Theatre Curtain',
    label: 'the theatre curtain',
    bounds: [-22, 22],
    spawnAt: { left: -18, right: 18, default: 0 },
    exits: [
      { side: 'right', target: 'forest', label: 'into the path' },
    ],
    npcs: ['embre_intro_floater'], // a floating storyteller voice — uses a small prop
    props: ['curtain_left', 'curtain_right', 'stage_floor', 'spotlight'],
    backdrop: 'theatre',
  },
  forest: {
    name: 'The Whispering Forest',
    label: 'the whispering forest',
    bounds: [-30, 30],
    spawnAt: { left: -26, right: 26, default: 0 },
    exits: [
      { side: 'left',  target: 'theatre', label: 'back to the curtain' },
      { side: 'right', target: 'village', label: 'toward the lanterns' },
    ],
    npcs: ['embre'],
    props: ['tree_a', 'tree_b', 'tree_c'],
    backdrop: 'forest',
  },
  village: {
    name: 'The Lantern Village',
    label: 'the lantern village',
    bounds: [-28, 28],
    spawnAt: { left: -24, right: 24, default: 0 },
    exits: [
      { side: 'left',  target: 'forest', label: 'back into the trees' },
      { side: 'right', target: 'shore',  label: 'toward the water' },
    ],
    npcs: ['lior'],
    props: ['house', 'lantern_post_a', 'lantern_post_b'],
    backdrop: 'village',
  },
  shore: {
    name: 'The Moonlit Shore',
    label: 'the moonlit shore',
    bounds: [-26, 26],
    spawnAt: { left: -22, right: 22, default: 0 },
    exits: [
      { side: 'left',  target: 'village', label: 'back to the lanterns' },
    ],
    npcs: ['maru'],
    props: ['shore_door', 'paper_boat_a', 'paper_boat_b'],
    backdrop: 'shore',
  },
};

// ---------- Builders ----------

export function buildBackdrop(zoneId, palette) {
  const group = new THREE.Group();
  group.name = 'backdrop:' + zoneId;

  // Sky (huge plane far back)
  const skyTex = makeSkyTexture(palette);
  const sky = planeMesh(skyTex, 220, 80, { depthWrite: false });
  sky.position.set(0, 24, -38);
  group.add(sky);

  // Far layer — silhouettes
  const farTex = makeFarLayerTexture(palette, zoneId === 'theatre' ? 'forest' : zoneId);
  const far = planeMesh(farTex, 240, 28, { depthWrite: false });
  far.position.set(0, 8, -22);
  group.add(far);

  // Mid layer — slight darker tint of far
  const mid = planeMesh(farTex, 200, 22, { depthWrite: false, opacity: 0.7 });
  mid.position.set(-4, 6.4, -14);
  mid.material.color.set(0x222233);
  group.add(mid);

  // Ground
  const groundTex = makeGroundTexture(palette);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 26),
    new THREE.MeshBasicMaterial({ map: groundTex })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -2);
  group.add(ground);

  return group;
}

export function buildProps(zoneId, palette) {
  const group = new THREE.Group();
  group.name = 'props:' + zoneId;

  const def = zoneDefs[zoneId];

  if (zoneId === 'theatre') {
    const cTex = makeCurtainTexture();
    const left = planeMesh(cTex, 30, 30, { depthWrite: false });
    left.position.set(-22, 12, -1.5);
    const right = planeMesh(cTex, 30, 30, { depthWrite: false });
    right.position.set(22, 12, -1.5);
    right.scale.x = -1;
    group.add(left, right);

    // spotlight cone
    const spot = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 14),
      new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.18, depthWrite: false })
    );
    spot.position.set(0, 6, -0.5);
    group.add(spot);

    // wooden stage edge
    const edge = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x3a2412 })
    );
    edge.position.set(0, 0.25, 0.4);
    group.add(edge);
  }

  if (zoneId === 'forest') {
    const offsets = [-22, -8, 6, 18, 26];
    offsets.forEach((x, i) => {
      const tex = makeTreeTexture(i + 7);
      const aspect = tex.image.width / tex.image.height;
      const h = 8 + (i % 2) * 1.8;
      const tree = planeMesh(tex, h * aspect, h);
      tree.position.set(x, h/2 - 0.1, -3.5 - (i % 3) * 1.2);
      group.add(tree);
    });
  }

  if (zoneId === 'village') {
    const houseTex = makeHouseTexture();
    const ar = houseTex.image.width / houseTex.image.height;
    const hH = 9;
    const house = planeMesh(houseTex, hH * ar, hH);
    house.position.set(-6, hH/2 - 0.1, -4);
    group.add(house);

    const ltex = makeLanternPropTexture();
    const lar = ltex.image.width / ltex.image.height;
    [-18, 8, 18].forEach((x, i) => {
      const lh = 4.2;
      const post = planeMesh(ltex, lh * lar, lh);
      post.position.set(x, lh/2 - 0.05, -1.8 + (i%2)*0.4);
      group.add(post);
    });
  }

  if (zoneId === 'shore') {
    // gentle water stripes (drawn as long thin planes)
    for (let i = 0; i < 6; i++) {
      const w = 240, h = 0.6;
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? 0x6a8aa8 : 0x4a6688,
          transparent: true, opacity: 0.45, depthWrite: false,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, 0.02 + i * 0.005, -6 - i * 1.2);
      group.add(water);
    }
    // hidden door (revealed via flag)
    const dTex = makeDoorTexture();
    const dar = dTex.image.width / dTex.image.height;
    const dH = 7.2;
    const door = planeMesh(dTex, dH * dar, dH, { opacity: 0 });
    door.position.set(18, dH/2 - 0.1, -3.6);
    door.userData.isHiddenDoor = true;
    group.add(door);

    // paper boats
    const boatTex = makePaperBoatTexture();
    const bAr = boatTex.image.width / boatTex.image.height;
    for (let i = 0; i < 3; i++) {
      const bH = 1.5 + (i % 2) * 0.4;
      const boat = planeMesh(boatTex, bH * bAr, bH, { depthWrite: false });
      boat.position.set(-12 + i*8, bH/2 + 0.1, -3 - i * 0.4);
      boat.userData.bobPhase = i * 1.2;
      group.add(boat);
    }
  }

  return group;
}
