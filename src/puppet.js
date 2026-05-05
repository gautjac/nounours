// Nounours, the puppet. Two textured planes (body+arms) parented to
// a group so we can apply soft secondary motion: breathing scale,
// walking sway/bob, hop, and reaction tilt. Easy to upgrade later
// to a fully segmented rig (head, body, arms, legs as separate planes).

import * as THREE from 'three';
import { makeNounoursTexture } from './textures.js';
import { sfx } from './audio.js';

const WALK_SPEED = 6.5;     // units/s along stage
const DEPTH_SPEED = 3.0;    // units/s into stage (Z)
const STAGE_Z_RANGE = [-0.6, 0.6];

export class Puppet {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'nounours';

    // Composite body sprite
    const tex = makeNounoursTexture();
    const aspect = tex.image.width / tex.image.height;
    const height = 4.4;
    const geo = new THREE.PlaneGeometry(height * aspect, height);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02 });
    this.bodyMesh = new THREE.Mesh(geo, mat);
    this.bodyMesh.position.y = height / 2 - 0.1; // feet near 0
    this.group.add(this.bodyMesh);

    // soft glow disc at feet
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.0),
      new THREE.MeshBasicMaterial({
        color: 0xffe0a0, transparent: true, opacity: 0.18,
        depthWrite: false,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    this.group.add(glow);
    this.glow = glow;

    // state
    this.t = 0;
    this.facing = 1; // 1 = right, -1 = left
    this.vx = 0; this.vz = 0;
    this.hopT = 0;
    this.reactT = 0;

    // logical bounds: zone clamps externally; internally a per-zone soft bound
    this.bounds = { minX: -40, maxX: 40 };
    this.height = height;
  }

  setPosition(x, y, z) { this.group.position.set(x, y, z); }
  getPosition() { return this.group.position; }

  setBounds(minX, maxX) { this.bounds = { minX, maxX }; }

  hop() {
    if (this.hopT > 0) return;
    this.hopT = 0.55;
    sfx('hop');
  }

  react() {
    this.reactT = 0.45;
  }

  setFacing(dir) {
    if (dir === 0) return;
    this.facing = dir;
  }

  update(dt, input) {
    this.t += dt;

    // Inputs
    const ix = input.x || 0;       // -1..1
    const iz = input.z || 0;       // -1..1 (depth)
    if (Math.abs(ix) > 0.05) this.facing = ix > 0 ? 1 : -1;

    // Velocity smoothing
    const targetVx = ix * WALK_SPEED;
    const targetVz = iz * DEPTH_SPEED;
    this.vx += (targetVx - this.vx) * Math.min(1, dt * 8);
    this.vz += (targetVz - this.vz) * Math.min(1, dt * 8);

    // Position
    const p = this.group.position;
    p.x += this.vx * dt;
    p.z += this.vz * dt;
    if (p.x < this.bounds.minX) p.x = this.bounds.minX;
    if (p.x > this.bounds.maxX) p.x = this.bounds.maxX;
    if (p.z < STAGE_Z_RANGE[0]) p.z = STAGE_Z_RANGE[0];
    if (p.z > STAGE_Z_RANGE[1]) p.z = STAGE_Z_RANGE[1];

    // Hop
    let hopY = 0;
    if (this.hopT > 0) {
      this.hopT -= dt;
      const k = 1 - Math.max(0, this.hopT) / 0.55; // 0..1
      hopY = Math.sin(k * Math.PI) * 1.2;
    }

    // Animation: idle breathing + walking bob + sway tilt
    const speed = Math.min(1, Math.abs(this.vx) / WALK_SPEED);
    const breathe = Math.sin(this.t * 1.6) * 0.022;
    const bob     = Math.sin(this.t * 9.0) * 0.07 * speed;
    const sway    = Math.sin(this.t * 9.0) * 0.06 * speed;

    // Reaction (head tilt + bounce)
    let reactScale = 0, reactTilt = 0;
    if (this.reactT > 0) {
      this.reactT -= dt;
      const k = this.reactT / 0.45; // 1..0
      reactScale = Math.sin((1 - k) * Math.PI) * 0.08;
      reactTilt  = Math.sin((1 - k) * Math.PI * 2) * 0.18;
    }

    // Apply to body mesh
    this.bodyMesh.position.y = this.height / 2 - 0.1 + bob + hopY;
    this.bodyMesh.scale.set(
      this.facing * (1 + breathe + reactScale),
      1 - breathe + reactScale + bob * 0.2,
      1
    );
    this.bodyMesh.rotation.z = sway * this.facing + reactTilt;

    // Glow scales with depth
    const depthK = (p.z - STAGE_Z_RANGE[0]) / (STAGE_Z_RANGE[1] - STAGE_Z_RANGE[0]);
    this.glow.material.opacity = 0.10 + 0.18 * (1 - depthK);

    // step blip
    if (speed > 0.3 && Math.sin(this.t * 9.0) * Math.sin((this.t - dt) * 9.0) < 0) {
      sfx('step');
    }
  }
}
