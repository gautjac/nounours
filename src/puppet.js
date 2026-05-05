// Nounours — segmented puppet rig.
//
// Hierarchy (Y up, origin at feet):
//
//   group (root, world transform)
//     glow disc (floor)
//     body (group — facing flip + breathing + hop + sway happen here)
//       lLegPivot   (hip, pivots leg around top)
//         leg mesh
//       rLegPivot
//         leg mesh
//       torso mesh
//       lArmPivot   (shoulder, pivots arm around top)
//         arm mesh
//       rArmPivot
//         arm mesh
//       headPivot   (neck, pivots head around bottom)
//         head mesh
//
// Animation states are layered: walk-cycle adds bob + leg/arm swings,
// idle adds breathing + slow head bob, react/hop/wave/reach are
// short-lived envelopes added on top.

import * as THREE from 'three';
import { makeHeadTex, makeBodyTex, makeArmTex, makeLegTex } from './textures.js';
import { sfx } from './audio.js';

const WALK_SPEED  = 6.5;
const DEPTH_SPEED = 3.0;
const STAGE_Z_RANGE = [-0.6, 0.6];

const HEAD_H  = 2.6;
const TORSO_H = 2.4;
const ARM_H   = 1.9;
const LEG_H   = 1.5;

export class Puppet {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'nounours';

    // shadow disc
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.0),
      new THREE.MeshBasicMaterial({
        color: 0xffe0a0, transparent: true, opacity: 0.18, depthWrite: false,
      })
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.01;
    this.group.add(this.glow);

    // body group — owns facing scale, breathing, hop offset
    this.body = new THREE.Group();
    this.group.add(this.body);

    // ----- LEGS (drawn first → behind torso) -----
    const legTex = makeLegTex();
    const legAr  = legTex.image.width / legTex.image.height;
    const legPlane = new THREE.PlaneGeometry(LEG_H * legAr, LEG_H);

    this.lLegPivot = new THREE.Group();
    this.lLegPivot.position.set(-0.5, 1.0, -0.05);
    const lLeg = new THREE.Mesh(legPlane, this._mat(legTex));
    lLeg.position.y = -LEG_H / 2;
    this.lLegPivot.add(lLeg);
    this.body.add(this.lLegPivot);

    this.rLegPivot = new THREE.Group();
    this.rLegPivot.position.set( 0.5, 1.0, -0.05);
    const rLeg = new THREE.Mesh(legPlane, this._mat(legTex));
    rLeg.position.y = -LEG_H / 2;
    this.rLegPivot.add(rLeg);
    this.body.add(this.rLegPivot);

    // ----- TORSO -----
    const torsoTex = makeBodyTex();
    const torsoAr  = torsoTex.image.width / torsoTex.image.height;
    this.torso = new THREE.Mesh(
      new THREE.PlaneGeometry(TORSO_H * torsoAr, TORSO_H),
      this._mat(torsoTex)
    );
    this.torso.position.set(0, 1.9, 0);
    this.body.add(this.torso);

    // ----- ARMS (in front of torso, behind head) -----
    const armTex = makeArmTex();
    const armAr  = armTex.image.width / armTex.image.height;
    const armPlane = new THREE.PlaneGeometry(ARM_H * armAr, ARM_H);

    this.lArmPivot = new THREE.Group();
    // arm Z > head Z so a raised hand renders in front of the head
    this.lArmPivot.position.set(-0.95, 2.55, 0.20);
    const lArm = new THREE.Mesh(armPlane, this._mat(armTex));
    lArm.position.y = -ARM_H / 2;
    lArm.scale.x = -1; // mirror so the paw highlight reads correctly on the bear's left
    this.lArmPivot.add(lArm);
    this.body.add(this.lArmPivot);

    this.rArmPivot = new THREE.Group();
    this.rArmPivot.position.set( 0.95, 2.55, 0.20);
    const rArm = new THREE.Mesh(armPlane, this._mat(armTex));
    rArm.position.y = -ARM_H / 2;
    this.rArmPivot.add(rArm);
    this.body.add(this.rArmPivot);

    // ----- HEAD -----
    const headTex = makeHeadTex();
    const headAr  = headTex.image.width / headTex.image.height;
    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 3.0, 0.10);
    this.head = new THREE.Mesh(
      new THREE.PlaneGeometry(HEAD_H * headAr, HEAD_H),
      this._mat(headTex)
    );
    // pivot at the chin: lift the head plane so its bottom is at the pivot
    this.head.position.y = HEAD_H * 0.30;
    this.headPivot.add(this.head);
    this.body.add(this.headPivot);

    // state
    this.t       = 0;
    this.facing  = 1;
    this.vx      = 0;
    this.vz      = 0;
    this.hopT    = 0;
    this.reactT  = 0;
    this.waveT   = 0;
    this.reachT  = 0;
    this.lookAtX = null;
    this.bounds  = { minX: -40, maxX: 40 };
    this.height  = 4.4;
  }

  _mat(tex) {
    return new THREE.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: 0.02, depthWrite: false,
    });
  }

  setPosition(x, y, z) { this.group.position.set(x, y, z); }
  getPosition()        { return this.group.position; }
  setBounds(minX, maxX){ this.bounds = { minX, maxX }; }
  setFacing(dir)       { if (dir !== 0) this.facing = dir; }

  hop()    { if (this.hopT <= 0) { this.hopT = 0.55; sfx('hop'); } }
  react()  { this.reactT = 0.45; }
  wave()   { if (this.waveT <= 0) this.waveT = 1.6; }
  reach()  { this.reachT = 1.0; }
  lookAt(worldX) { this.lookAtX = worldX; }

  update(dt, input) {
    this.t += dt;

    // ----- input → velocity -----
    const ix = input.x || 0;
    const iz = input.z || 0;
    if (Math.abs(ix) > 0.05) this.facing = ix > 0 ? 1 : -1;

    const targetVx = ix * WALK_SPEED;
    const targetVz = iz * DEPTH_SPEED;
    this.vx += (targetVx - this.vx) * Math.min(1, dt * 8);
    this.vz += (targetVz - this.vz) * Math.min(1, dt * 8);

    // ----- world position -----
    const p = this.group.position;
    p.x += this.vx * dt;
    p.z += this.vz * dt;
    if (p.x < this.bounds.minX) p.x = this.bounds.minX;
    if (p.x > this.bounds.maxX) p.x = this.bounds.maxX;
    if (p.z < STAGE_Z_RANGE[0]) p.z = STAGE_Z_RANGE[0];
    if (p.z > STAGE_Z_RANGE[1]) p.z = STAGE_Z_RANGE[1];

    // ----- hop envelope -----
    let hopY = 0;
    if (this.hopT > 0) {
      this.hopT -= dt;
      const k = 1 - Math.max(0, this.hopT) / 0.55;
      hopY = Math.sin(k * Math.PI) * 1.2;
    }

    const speed = Math.min(1, Math.abs(this.vx) / WALK_SPEED);
    const breathe = Math.sin(this.t * 1.6) * 0.022;
    const bob     = Math.sin(this.t * 9.0) * 0.06 * speed;
    const sway    = Math.sin(this.t * 9.0) * 0.05 * speed;

    // ----- react envelope (head/body bounce after interact) -----
    let reactScale = 0, reactTilt = 0;
    if (this.reactT > 0) {
      this.reactT -= dt;
      const k = this.reactT / 0.45;
      reactScale = Math.sin((1 - k) * Math.PI) * 0.06;
      reactTilt  = Math.sin((1 - k) * Math.PI * 2) * 0.18;
    }

    // ----- body root: apply hop, breathing, facing flip, sway -----
    this.body.position.y = hopY + bob;
    this.body.scale.set(
      this.facing * (1 + breathe + reactScale),
      1 - breathe + reactScale + bob * 0.2,
      1
    );
    this.body.rotation.z = sway * this.facing;

    // ----- legs: alternating swing while walking -----
    // positive rotation.z swings the foot toward +x (forward when facing right)
    const swing = Math.sin(this.t * 9.0) * 0.55 * speed;
    this.lLegPivot.rotation.z = -swing;  // L opposite phase
    this.rLegPivot.rotation.z =  swing;  // R with phase

    // ----- arms: cross-coordinated with legs (L arm forward when R leg forward) -----
    const armAmp = 0.70;
    let lArmRot =  swing * armAmp; // matches R leg phase → forward when R leg forward
    let rArmRot = -swing * armAmp; // matches L leg phase → backward when R leg forward

    // wave: right arm raises up-and-out to bear's right with hand wiggle.
    // The body group's facing scale auto-mirrors this when bear faces left.
    if (this.waveT > 0) {
      this.waveT -= dt;
      const wk  = Math.max(0, Math.min(1, this.waveT / 1.6));
      const env = Math.sin((1 - wk) * Math.PI);
      const wiggle = Math.sin(this.t * 14) * 0.30;
      rArmRot = 2.4 * env + wiggle * env;
    }

    // reach: both arms forward (toward facing direction)
    if (this.reachT > 0) {
      this.reachT -= dt;
      const rk  = Math.max(0, Math.min(1, this.reachT / 1.0));
      const env = Math.sin((1 - rk) * Math.PI);
      lArmRot += 1.4 * env;
      rArmRot += 1.4 * env;
    }

    this.lArmPivot.rotation.z = lArmRot;
    this.rArmPivot.rotation.z = rArmRot;

    // ----- head: idle bob, react tilt, look-at hint -----
    let headTilt = Math.sin(this.t * 1.4) * 0.04;
    headTilt += reactTilt * 0.6;

    if (this.lookAtX !== null) {
      // dxLocal is in the bear's local frame (positive = bear's right).
      // Head leans toward the target → negative rotation when target is right.
      const dxWorld = this.lookAtX - p.x;
      const dxLocal = dxWorld * this.facing;
      const intensity = Math.min(1, Math.abs(dxLocal) / 4);
      headTilt += -Math.sign(dxLocal) * intensity * 0.22;
    }

    this.headPivot.rotation.z = headTilt;

    // ----- glow scaled by depth -----
    const depthK = (p.z - STAGE_Z_RANGE[0]) / (STAGE_Z_RANGE[1] - STAGE_Z_RANGE[0]);
    this.glow.material.opacity = 0.10 + 0.18 * (1 - depthK);

    // step blip on walk-cycle zero crossings
    if (speed > 0.3 && Math.sin(this.t * 9.0) * Math.sin((this.t - dt) * 9.0) < 0) {
      sfx('step');
    }
  }
}
