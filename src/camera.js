// Cinematic, gentle 2.5D camera. Locked to look at Z=0 stage,
// pulls slightly toward player on X with eased follow, with a
// subtle breathing dolly that makes the world feel alive.

import * as THREE from 'three';

const CAM_Y = 4.4;
const CAM_Z = 14.0;
const FOLLOW_LERP = 2.5;

let target = new THREE.Vector3(0, CAM_Y * 0.55, 0);
let t0 = 0;

export function initCamera(camera) {
  camera.position.set(0, CAM_Y, CAM_Z);
  camera.lookAt(target);
}

export function snapCamera(camera, x) {
  camera.position.x = x;
  target.x = x;
  camera.lookAt(target.x, target.y, 0);
}

export function updateCamera(camera, puppet, dt) {
  t0 += dt;
  const px = puppet.group.position.x;
  // ease toward player
  const k = 1 - Math.exp(-FOLLOW_LERP * dt);
  camera.position.x += (px - camera.position.x) * k;

  // breathing dolly
  const dolly = Math.sin(t0 * 0.4) * 0.18;
  camera.position.z = CAM_Z + dolly;
  camera.position.y = CAM_Y + Math.sin(t0 * 0.25) * 0.05;

  target.set(camera.position.x, CAM_Y * 0.55, 0);
  camera.lookAt(target);
}
