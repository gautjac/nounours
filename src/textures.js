// Procedural canvas textures used as Three.js sprite/quad textures.
// Each function returns a THREE.CanvasTexture sized to fit a sprite.
// Tweaking these is how the puppet/NPCs/backdrops will evolve.
// All inspired by the Nounours reference photo: warm browns, patchwork
// vest, bandage detail, big expressive eyes.

import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function asTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// soft circle with radial gradient (used for shadows, glows, fur clusters)
function softCircle(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
}

function furBlob(ctx, x, y, r, base) {
  // base brown plus a few random highlights/shadows for fabric texture
  ctx.save();
  ctx.fillStyle = base;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  for (let i = 0; i < 80; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.random() * r * 0.95;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    const dot = 1 + Math.random() * 2.4;
    const dark = Math.random() < 0.5;
    ctx.fillStyle = dark ? 'rgba(40, 22, 12, 0.22)' : 'rgba(255, 220, 170, 0.18)';
    ctx.beginPath(); ctx.arc(px, py, dot, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ----------------- NOUNOURS -----------------

export function makeNounoursTexture() {
  const W = 512, H = 640;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');

  // soft drop-shadow under feet
  softCircle(ctx, W/2, H - 40, 130, 'rgba(0,0,0,0.35)', 0.6);

  // ----- Body -----
  ctx.save();
  ctx.translate(W/2, H/2 + 40);
  // legs/feet stub
  furBlob(ctx, -55, 200, 60, '#5a3622');
  furBlob(ctx,  55, 200, 60, '#5a3622');

  // torso
  ctx.save();
  ctx.scale(1, 1.05);
  furBlob(ctx, 0, 110, 130, '#6a3f25');
  ctx.restore();

  // arms
  furBlob(ctx, -130, 70, 55, '#5a3622');
  furBlob(ctx,  130, 70, 55, '#5a3622');

  // patchwork vest
  drawVest(ctx, 0, 110);

  // head
  furBlob(ctx, 0, -60, 150, '#6e4126');

  // ears
  furBlob(ctx, -110, -160, 50, '#5a3622');
  furBlob(ctx,  110, -160, 50, '#5a3622');
  // inner ears
  ctx.fillStyle = '#a8755a';
  ctx.beginPath(); ctx.ellipse(-110, -155, 22, 28, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 110, -155, 22, 28, 0, 0, Math.PI*2); ctx.fill();

  // muzzle (lighter fur)
  ctx.save();
  ctx.fillStyle = '#caa07a';
  ctx.beginPath(); ctx.ellipse(0, -10, 75, 60, 0, 0, Math.PI*2); ctx.fill();
  // muzzle texture dots
  for (let i = 0; i < 60; i++) {
    const a = Math.random()*Math.PI*2, rr = Math.random()*60;
    ctx.fillStyle = 'rgba(120, 80, 50, 0.25)';
    ctx.beginPath(); ctx.arc(Math.cos(a)*rr, -10 + Math.sin(a)*40, 1.2, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // nose
  ctx.fillStyle = '#1c1208';
  ctx.beginPath(); ctx.ellipse(0, -42, 24, 18, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(-6, -48, 7, 4, 0, 0, Math.PI*2); ctx.fill();

  // smile (very subtle)
  ctx.strokeStyle = 'rgba(28, 18, 8, 0.6)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1, -22);
  ctx.lineTo(-1,  -8);
  ctx.moveTo(-1,  -8);
  ctx.quadraticCurveTo(-18, 8, -28, 0);
  ctx.moveTo(-1,  -8);
  ctx.quadraticCurveTo(18, 8, 28, 0);
  ctx.stroke();

  // eyes — big, round, googly
  drawEye(ctx, -55, -95, 30);
  drawEye(ctx,  55, -95, 30);

  // bandage on forehead
  drawBandage(ctx, -30, -170);

  ctx.restore();

  return asTexture(c);
}

function drawEye(ctx, x, y, r) {
  // sclera shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + 4, r*1.05, r*1.05, 0, 0, Math.PI*2); ctx.fill();
  // sclera
  ctx.fillStyle = '#fbf1d8';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  // outline
  ctx.strokeStyle = '#3a2616'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
  // pupil
  ctx.fillStyle = '#150c06';
  ctx.beginPath(); ctx.arc(x - 2, y + 4, r * 0.55, 0, Math.PI*2); ctx.fill();
  // shine
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 8, y - 4, r * 0.18, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 6, y + 9, r * 0.08, 0, Math.PI*2); ctx.fill();
}

function drawBandage(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.18);
  // bandage rect
  ctx.fillStyle = '#ead7b7';
  ctx.fillRect(-32, -12, 64, 24);
  ctx.strokeStyle = '#b09870'; ctx.lineWidth = 1.5;
  ctx.strokeRect(-32, -12, 64, 24);
  // colored cross/patches
  ctx.fillStyle = '#c66a4d';
  ctx.fillRect(-6, -10, 12, 20);
  ctx.fillStyle = '#3e6a8a';
  ctx.fillRect(-30, -10, 8, 20);
  // stitches
  ctx.strokeStyle = '#7a5c3a'; ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(-32, -6); ctx.lineTo(32, -6);
  ctx.moveTo(-32,  6); ctx.lineTo(32,  6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawVest(ctx, cx, cy) {
  // patchwork vest as a rough rectangle of patches
  ctx.save();
  const patches = [
    { c: '#d97a3a', pat: 'dots'   },
    { c: '#3e6a8a', pat: 'cross'  },
    { c: '#caa337', pat: 'lines'  },
    { c: '#5e8a4a', pat: 'dots'   },
    { c: '#b13a3a', pat: 'cross'  },
    { c: '#6c5b8a', pat: 'lines'  },
  ];
  // outline: vest area
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(-90, -20);
  ctx.bezierCurveTo(-130, 30, -120, 110, -80, 130);
  ctx.lineTo(80, 130);
  ctx.bezierCurveTo(120, 110, 130, 30, 90, -20);
  ctx.bezierCurveTo(40, 10, -40, 10, -90, -20);
  ctx.closePath();
  ctx.save();
  ctx.clip();

  // fill patches in a 3x2 grid distorted slightly
  const cols = 3, rows = 2;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const i = r * cols + col;
      const px = -120 + col * 80 + (r % 2 ? 6 : -4);
      const py = -20 + r * 70;
      const p = patches[i % patches.length];
      ctx.fillStyle = p.c;
      ctx.fillRect(px, py, 86, 76);
      // pattern
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      if (p.pat === 'dots') {
        for (let k = 0; k < 12; k++) {
          ctx.beginPath();
          ctx.arc(px + 8 + (k % 4) * 22, py + 12 + Math.floor(k/4) * 22, 3, 0, Math.PI*2);
          ctx.fill();
        }
      } else if (p.pat === 'cross') {
        ctx.fillRect(px + 38, py + 4, 6, 70);
        ctx.fillRect(px + 4, py + 36, 78, 6);
      } else if (p.pat === 'lines') {
        for (let k = 0; k < 8; k++) {
          ctx.fillRect(px + 4, py + 6 + k * 9, 78, 3);
        }
      }
      // stitch border
      ctx.strokeStyle = 'rgba(20, 12, 6, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(px, py, 86, 76);
      ctx.setLineDash([]);
    }
  }
  ctx.restore();

  // outline of vest
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(20, 10, 4, 0.5)';
  ctx.stroke();
  ctx.restore();
}

// ----------------- NPCs -----------------

export function makeBirdTexture() {
  const W = 320, H = 360;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  softCircle(ctx, W/2, H - 18, 80, 'rgba(0,0,0,0.4)', 0.6);

  ctx.save(); ctx.translate(W/2, H/2 + 20);

  // body
  ctx.fillStyle = '#5a3a72';
  ctx.beginPath(); ctx.ellipse(0, 30, 80, 95, 0, 0, Math.PI*2); ctx.fill();
  // belly
  ctx.fillStyle = '#a07cc4';
  ctx.beginPath(); ctx.ellipse(-6, 60, 38, 48, 0, 0, Math.PI*2); ctx.fill();

  // wing
  ctx.save();
  ctx.fillStyle = '#3e2856';
  ctx.beginPath();
  ctx.moveTo(-30, 20);
  ctx.bezierCurveTo(-90, 30, -80, 110, -10, 90);
  ctx.bezierCurveTo(-20, 60, -10, 30, -30, 20);
  ctx.fill();
  // feather lines
  ctx.strokeStyle = 'rgba(20, 12, 30, 0.5)'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-30 + i * 4, 22 + i * 6);
    ctx.quadraticCurveTo(-50 - i * 4, 40 + i * 8, -20 - i * 4, 80 + i * 2);
    ctx.stroke();
  }
  ctx.restore();

  // head
  ctx.fillStyle = '#5a3a72';
  ctx.beginPath(); ctx.arc(0, -55, 60, 0, Math.PI*2); ctx.fill();
  // crest tuft
  ctx.fillStyle = '#3e2856';
  ctx.beginPath();
  ctx.moveTo(-12, -110);
  ctx.quadraticCurveTo(0, -150, 12, -110);
  ctx.quadraticCurveTo(0, -100, -12, -110);
  ctx.fill();

  // eye — big and sad
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(15, -60, 16, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#0a0a14';
  ctx.beginPath(); ctx.arc(18, -57, 9, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(15, -60, 3, 0, Math.PI*2); ctx.fill();
  // sad eyelid
  ctx.fillStyle = '#5a3a72';
  ctx.beginPath();
  ctx.moveTo(-2, -70);
  ctx.quadraticCurveTo(15, -80, 32, -68);
  ctx.lineTo(32, -60); ctx.quadraticCurveTo(15, -68, -2, -60);
  ctx.fill();

  // beak
  ctx.fillStyle = '#caa337';
  ctx.beginPath();
  ctx.moveTo(48, -50);
  ctx.lineTo(80, -42);
  ctx.lineTo(48, -36);
  ctx.fill();
  ctx.strokeStyle = '#6a5318'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(48, -43); ctx.lineTo(78, -42); ctx.stroke();

  // little legs
  ctx.strokeStyle = '#caa337'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, 120); ctx.lineTo(-14, 150);
  ctx.moveTo( 12, 120); ctx.lineTo( 14, 150);
  ctx.stroke();
  // toes
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-22, 152); ctx.lineTo(-14, 150); ctx.lineTo(-6, 152);
  ctx.moveTo( 22, 152); ctx.lineTo( 14, 150); ctx.lineTo( 6, 152);
  ctx.stroke();

  ctx.restore();
  return asTexture(c);
}

export function makeLanternMakerTexture() {
  const W = 360, H = 600;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  softCircle(ctx, W/2, H - 18, 110, 'rgba(0,0,0,0.4)', 0.6);

  ctx.save(); ctx.translate(W/2, H/2 + 20);

  // robe
  ctx.fillStyle = '#3a4a6a';
  ctx.beginPath();
  ctx.moveTo(-95, -120);
  ctx.bezierCurveTo(-130, 0, -120, 200, -90, 250);
  ctx.lineTo(90, 250);
  ctx.bezierCurveTo(120, 200, 130, 0, 95, -120);
  ctx.bezierCurveTo(60, -130, -60, -130, -95, -120);
  ctx.closePath();
  ctx.fill();

  // robe folds
  ctx.strokeStyle = 'rgba(20, 24, 50, 0.5)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-50, -100); ctx.bezierCurveTo(-30, 50, -40, 200, -20, 240);
  ctx.moveTo( 50, -100); ctx.bezierCurveTo( 30, 50,  40, 200,  20, 240);
  ctx.moveTo(  0, -100); ctx.lineTo(  0, 240);
  ctx.stroke();

  // collar
  ctx.fillStyle = '#caa337';
  ctx.beginPath(); ctx.moveTo(-50, -110); ctx.lineTo(0, -90); ctx.lineTo(50, -110); ctx.lineTo(40, -100); ctx.lineTo(0, -82); ctx.lineTo(-40, -100); ctx.closePath(); ctx.fill();

  // head — pale, oval, hood
  ctx.fillStyle = '#1f2540';
  ctx.beginPath();
  ctx.moveTo(-90, -130);
  ctx.bezierCurveTo(-90, -240, 90, -240, 90, -130);
  ctx.lineTo(60, -110); ctx.lineTo(-60, -110); ctx.closePath();
  ctx.fill();

  // face
  ctx.fillStyle = '#ecd5b6';
  ctx.beginPath(); ctx.ellipse(0, -160, 42, 52, 0, 0, Math.PI*2); ctx.fill();

  // calm eyes
  ctx.fillStyle = '#1c1208';
  ctx.beginPath(); ctx.arc(-14, -160, 3.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 14, -160, 3.2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-22, -168); ctx.lineTo(-6, -170);
                   ctx.moveTo( 22, -168); ctx.lineTo( 6, -170); ctx.stroke();

  // small smile
  ctx.beginPath(); ctx.moveTo(-8, -148); ctx.quadraticCurveTo(0, -142, 8, -148); ctx.stroke();

  // arm holding lantern
  ctx.fillStyle = '#3a4a6a';
  ctx.beginPath();
  ctx.moveTo(60, -60); ctx.lineTo(120, -10); ctx.lineTo(110, 10); ctx.lineTo(50, -40); ctx.closePath(); ctx.fill();

  // lantern
  ctx.save();
  ctx.translate(120, 30);
  // chain
  ctx.strokeStyle = '#caa337'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, -10); ctx.stroke();
  // top
  ctx.fillStyle = '#3a2a14'; ctx.fillRect(-22, -10, 44, 6);
  // body — paper warm light
  const lg = ctx.createRadialGradient(0, 14, 4, 0, 14, 26);
  lg.addColorStop(0, '#fff6c8'); lg.addColorStop(0.6, '#f0c668'); lg.addColorStop(1, '#a86a18');
  ctx.fillStyle = lg;
  ctx.fillRect(-20, -4, 40, 36);
  // panes
  ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 1.6;
  ctx.strokeRect(-20, -4, 40, 36);
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 32); ctx.stroke();
  // bottom
  ctx.fillStyle = '#3a2a14'; ctx.fillRect(-22, 32, 44, 6);
  // glow
  softCircle(ctx, 0, 14, 90, 'rgba(255, 220, 140, 0.7)', 0.9);
  ctx.restore();

  ctx.restore();
  return asTexture(c);
}

export function makeMoonKeeperTexture() {
  const W = 320, H = 540;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  softCircle(ctx, W/2, H - 18, 90, 'rgba(0,0,0,0.4)', 0.6);

  ctx.save(); ctx.translate(W/2, H/2 + 30);

  // long shawl/dress
  ctx.fillStyle = '#1c2a4a';
  ctx.beginPath();
  ctx.moveTo(-70, -80);
  ctx.bezierCurveTo(-110, 40, -90, 180, -60, 210);
  ctx.lineTo(60, 210);
  ctx.bezierCurveTo(90, 180, 110, 40, 70, -80);
  ctx.bezierCurveTo(40, -90, -40, -90, -70, -80);
  ctx.closePath();
  ctx.fill();

  // stars on shawl
  for (let i = 0; i < 30; i++) {
    const sx = -70 + Math.random() * 140;
    const sy = -60 + Math.random() * 250;
    const s = 1 + Math.random() * 2;
    ctx.fillStyle = `rgba(255, 240, 200, ${0.4 + Math.random()*0.5})`;
    ctx.beginPath(); ctx.arc(sx, sy, s, 0, Math.PI*2); ctx.fill();
  }

  // hood
  ctx.fillStyle = '#0e1530';
  ctx.beginPath();
  ctx.moveTo(-70, -90);
  ctx.bezierCurveTo(-80, -180, 80, -180, 70, -90);
  ctx.lineTo(50, -78); ctx.lineTo(-50, -78); ctx.closePath();
  ctx.fill();

  // pale face
  ctx.fillStyle = '#f0d8c0';
  ctx.beginPath(); ctx.ellipse(0, -120, 36, 48, 0, 0, Math.PI*2); ctx.fill();

  // shy looking down eyes (closed-ish curves)
  ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-18, -118); ctx.quadraticCurveTo(-12, -110, -6, -118);
  ctx.moveTo( 18, -118); ctx.quadraticCurveTo( 12, -110,  6, -118);
  ctx.stroke();
  // tiny blush
  ctx.fillStyle = 'rgba(220, 120, 130, 0.4)';
  ctx.beginPath(); ctx.ellipse(-18, -106, 8, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 18, -106, 8, 4, 0, 0, Math.PI*2); ctx.fill();
  // tiny mouth
  ctx.beginPath();
  ctx.moveTo(-3, -94); ctx.quadraticCurveTo(0, -90, 3, -94); ctx.stroke();

  // hand cradling something
  ctx.fillStyle = '#1c2a4a';
  ctx.beginPath();
  ctx.moveTo(-30, 30); ctx.lineTo(-10, 60); ctx.lineTo(20, 60); ctx.lineTo(40, 30); ctx.closePath();
  ctx.fill();
  // star fragment in hand
  ctx.save();
  ctx.translate(15, 50);
  ctx.fillStyle = '#fff5c8';
  drawStar(ctx, 0, 0, 6, 13, 5);
  softCircle(ctx, 0, 0, 30, 'rgba(255, 240, 180, 0.6)', 0.8);
  ctx.restore();

  ctx.restore();
  return asTexture(c);
}

function drawStar(ctx, cx, cy, inner, outer, points) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - Math.PI/2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ----------------- World props -----------------

export function makeTreeTexture(seed = 1) {
  const W = 420, H = 700;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  softCircle(ctx, W/2, H - 14, 100, 'rgba(0,0,0,0.42)', 0.55);

  // trunk
  ctx.save(); ctx.translate(W/2, H);
  ctx.fillStyle = '#4a3018';
  ctx.beginPath();
  ctx.moveTo(-22, 0); ctx.lineTo(-30, -200);
  ctx.lineTo(-10, -340); ctx.lineTo(-2, -480);
  ctx.lineTo( 18, -340); ctx.lineTo( 30, -200);
  ctx.lineTo( 22, 0); ctx.closePath();
  ctx.fill();

  // trunk stripes
  ctx.strokeStyle = 'rgba(30, 16, 8, 0.6)'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-26 + i * 2, -50 - i * 60);
    ctx.bezierCurveTo(-15, -100 - i*60, 8, -120 - i*60, 22 - i, -150 - i*60);
    ctx.stroke();
  }

  // canopy clusters — soft blobs with seeded variety
  const canopyColors = ['#3a5a32', '#2d4a28', '#4f7042', '#284a3a'];
  function rng(){ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (let i = 0; i < 24; i++) {
    const a = rng() * Math.PI * 2;
    const rr = 100 + rng() * 110;
    const cx = Math.cos(a) * rr * 0.7;
    const cy = -460 + Math.sin(a) * rr * 0.55;
    const r = 60 + rng() * 50;
    ctx.fillStyle = canopyColors[Math.floor(rng()*canopyColors.length)];
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  }
  // highlight
  for (let i = 0; i < 30; i++) {
    const a = rng() * Math.PI * 2;
    const rr = 60 + rng() * 130;
    const cx = Math.cos(a) * rr * 0.7;
    const cy = -480 + Math.sin(a) * rr * 0.55;
    ctx.fillStyle = 'rgba(255, 240, 180, 0.10)';
    ctx.beginPath(); ctx.arc(cx, cy, 3 + rng()*5, 0, Math.PI*2); ctx.fill();
  }

  ctx.restore();
  return asTexture(c);
}

export function makeHouseTexture() {
  const W = 480, H = 540;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  softCircle(ctx, W/2, H - 14, 130, 'rgba(0,0,0,0.45)', 0.5);

  ctx.save(); ctx.translate(W/2, H);

  // body
  ctx.fillStyle = '#caa07a';
  ctx.fillRect(-160, -260, 320, 240);
  // wood frame
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(-160, -260, 14, 240);
  ctx.fillRect( 146, -260, 14, 240);
  ctx.fillRect(-160, -262, 320, 14);
  ctx.fillRect(-160,  -34, 320, 14);
  // diagonal beams
  ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-150, -250); ctx.lineTo( 150, -28);
  ctx.moveTo( 150, -250); ctx.lineTo(-150, -28);
  ctx.stroke();

  // windows
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(-110, -200, 70, 70);
  ctx.fillRect(  40, -200, 70, 70);
  ctx.fillStyle = '#f0c668';
  ctx.fillRect(-104, -194, 58, 58);
  ctx.fillRect(  46, -194, 58, 58);
  ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-75, -194); ctx.lineTo(-75, -136);
  ctx.moveTo(-104, -165); ctx.lineTo(-46, -165);
  ctx.moveTo( 75, -194); ctx.lineTo( 75, -136);
  ctx.moveTo( 46, -165); ctx.lineTo(104, -165);
  ctx.stroke();

  // door
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(-30, -120, 60, 100);
  ctx.fillStyle = '#2a1a08';
  ctx.fillRect(-26, -116, 52, 96);
  ctx.fillStyle = '#caa337';
  ctx.beginPath(); ctx.arc(18, -68, 3, 0, Math.PI*2); ctx.fill();

  // roof
  ctx.fillStyle = '#7a3522';
  ctx.beginPath();
  ctx.moveTo(-180, -260); ctx.lineTo(0, -380); ctx.lineTo(180, -260); ctx.closePath();
  ctx.fill();
  // roof tiles
  ctx.strokeStyle = 'rgba(40, 12, 8, 0.5)'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const y = -260 - i * 24;
    const w = 180 - i * 36;
    ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // chimney with smoke
  ctx.fillStyle = '#5a3a22'; ctx.fillRect(70, -350, 26, 60);
  ctx.fillStyle = 'rgba(255, 250, 240, 0.5)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(82 + i * 3, -360 - i * 18, 10 + i * 3, 0, Math.PI*2);
    ctx.fill();
  }

  // hanging lantern by door
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(-60, -90, 4, 30);
  ctx.fillStyle = '#f0c668';
  ctx.fillRect(-72, -60, 28, 24);
  softCircle(ctx, -58, -48, 60, 'rgba(255, 220, 140, 0.5)', 0.9);

  ctx.restore();
  return asTexture(c);
}

export function makeDoorTexture() {
  const W = 280, H = 420;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');

  ctx.save(); ctx.translate(W/2, H);
  // archway stones
  ctx.fillStyle = '#3a2818';
  ctx.beginPath();
  ctx.moveTo(-100, 0);
  ctx.lineTo(-100, -260);
  ctx.bezierCurveTo(-100, -380, 100, -380, 100, -260);
  ctx.lineTo(100, 0);
  ctx.closePath(); ctx.fill();

  // wood
  ctx.fillStyle = '#7a4a22';
  ctx.beginPath();
  ctx.moveTo(-80, 0);
  ctx.lineTo(-80, -260);
  ctx.bezierCurveTo(-80, -360, 80, -360, 80, -260);
  ctx.lineTo(80, 0);
  ctx.closePath(); ctx.fill();

  // planks
  ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2;
  for (let i = -60; i <= 60; i += 30) {
    ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i, -340); ctx.stroke();
  }
  // metal bands
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(-80, -60, 160, 10);
  ctx.fillRect(-80, -200, 160, 10);
  // ring handle
  ctx.strokeStyle = '#caa337'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(50, -150, 12, 0, Math.PI*2); ctx.stroke();

  // glow when revealed (drawn here, faded by sprite opacity)
  softCircle(ctx, 0, -180, 200, 'rgba(255, 240, 180, 0.45)', 0.8);

  ctx.restore();
  return asTexture(c);
}

export function makePaperBoatTexture() {
  const W = 220, H = 130;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  // ripple
  ctx.strokeStyle = 'rgba(180, 200, 220, 0.5)'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(10, H - 14); ctx.bezierCurveTo(60, H - 10, 160, H - 18, W - 10, H - 14);
  ctx.stroke();
  // hull
  ctx.fillStyle = '#f6efd8';
  ctx.beginPath();
  ctx.moveTo(20, H - 22); ctx.lineTo(W - 20, H - 22);
  ctx.lineTo(W - 50, H - 4); ctx.lineTo(50, H - 4); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a08868'; ctx.lineWidth = 1.6;
  ctx.stroke();
  // sail
  ctx.fillStyle = '#fbf6e2';
  ctx.beginPath();
  ctx.moveTo(W/2, 14); ctx.lineTo(W/2 - 60, H - 24); ctx.lineTo(W/2 + 4, H - 24); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a08868'; ctx.stroke();
  // sail fold line
  ctx.beginPath(); ctx.moveTo(W/2, 14); ctx.lineTo(W/2, H - 24); ctx.stroke();
  // little lantern dot on the prow
  softCircle(ctx, W - 36, H - 26, 22, 'rgba(255, 220, 140, 0.55)', 0.8);
  ctx.fillStyle = '#ffd870';
  ctx.beginPath(); ctx.arc(W - 36, H - 26, 2.4, 0, Math.PI*2); ctx.fill();
  return asTexture(c);
}

export function makeLanternPropTexture() {
  const W = 120, H = 200;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  softCircle(ctx, W/2, H - 8, 38, 'rgba(0,0,0,0.4)', 0.6);
  ctx.save(); ctx.translate(W/2, H - 8);
  // post
  ctx.fillStyle = '#3a2818'; ctx.fillRect(-3, -180, 6, 170);
  // top cap
  ctx.fillRect(-22, -180, 44, 8);
  // lantern body
  const g = ctx.createRadialGradient(0, -150, 4, 0, -150, 28);
  g.addColorStop(0, '#fff6c8'); g.addColorStop(0.6, '#f0c668'); g.addColorStop(1, '#a86a18');
  ctx.fillStyle = g; ctx.fillRect(-18, -170, 36, 36);
  ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 1.6;
  ctx.strokeRect(-18, -170, 36, 36);
  ctx.beginPath(); ctx.moveTo(0, -170); ctx.lineTo(0, -134); ctx.stroke();
  // glow
  softCircle(ctx, 0, -150, 70, 'rgba(255, 220, 140, 0.55)', 0.9);
  ctx.restore();
  return asTexture(c);
}

// ----------------- Backdrop layers -----------------

export function makeSkyTexture(palette) {
  const W = 1024, H = 512;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  palette.sky.forEach((stop, i) => g.addColorStop(i / (palette.sky.length - 1), stop));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // sun/moon
  if (palette.body) {
    const {x, y, r, color, glow} = palette.body;
    softCircle(ctx, x * W, y * H, r * 4.5, glow, 0.8);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, Math.PI*2); ctx.fill();
  }

  // stars (only at night/twilight)
  if (palette.stars > 0) {
    for (let i = 0; i < palette.stars; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H * 0.7;
      const s = 0.5 + Math.random() * 1.4;
      ctx.fillStyle = `rgba(255, 250, 220, ${0.4 + Math.random()*0.6})`;
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI*2); ctx.fill();
    }
  }

  // soft cloud bands
  if (palette.clouds) {
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * W, y = 60 + Math.random() * 240;
      ctx.fillStyle = palette.clouds;
      const w = 200 + Math.random() * 280;
      const h = 18 + Math.random() * 22;
      ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI*2); ctx.fill();
    }
  }
  return asTexture(c);
}

export function makeGroundTexture(palette) {
  const W = 1024, H = 256;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  palette.ground.forEach((stop, i) => g.addColorStop(i / (palette.ground.length - 1), stop));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // texture noise
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    ctx.fillStyle = `rgba(0,0,0,${Math.random()*0.12})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  // grass tufts
  if (palette.tufts) {
    ctx.strokeStyle = palette.tufts; ctx.lineWidth = 1.2;
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * W, y = 6 + Math.random() * 60;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + (Math.random()-0.5)*4, y - 6 - Math.random()*8);
      ctx.stroke();
    }
  }
  return asTexture(c);
}

export function makeFarLayerTexture(palette, kind) {
  const W = 2048, H = 384;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  if (kind === 'forest') {
    // distant treeline silhouettes
    ctx.fillStyle = palette.far;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 18) {
      const h = 80 + Math.sin(x * 0.012) * 40 + Math.random() * 60;
      ctx.lineTo(x, H - h);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  } else if (kind === 'village') {
    // distant rooftops
    ctx.fillStyle = palette.far;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    for (let x = 0; x < W; x += 60 + Math.random()*40) {
      const h = 40 + Math.random() * 90;
      const w = 30 + Math.random() * 50;
      ctx.fillRect(x, H * 0.55 - h, w, h);
      // roof
      ctx.beginPath();
      ctx.moveTo(x - 4, H * 0.55 - h);
      ctx.lineTo(x + w/2, H * 0.55 - h - 18);
      ctx.lineTo(x + w + 4, H * 0.55 - h);
      ctx.fill();
    }
  } else if (kind === 'shore') {
    // distant horizon water + island
    ctx.fillStyle = palette.far;
    ctx.fillRect(0, H * 0.65, W, H * 0.35);
    // island
    ctx.fillStyle = palette.farAlt || palette.far;
    ctx.beginPath();
    ctx.ellipse(W * 0.7, H * 0.62, 220, 30, 0, 0, Math.PI*2);
    ctx.fill();
  } else { // theatre / default
    ctx.fillStyle = palette.far;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
  }
  return asTexture(c);
}

export function makeCurtainTexture() {
  const W = 1024, H = 1024;
  const c = makeCanvas(W, H); const ctx = c.getContext('2d');
  // velvet red gradient with vertical fluting
  for (let x = 0; x < W; x += 4) {
    const t = (Math.sin(x * 0.03) + 1) * 0.5;
    const shade = 30 + t * 40;
    ctx.fillStyle = `rgb(${shade + 50}, ${15 + shade*0.2}, ${15 + shade*0.2})`;
    ctx.fillRect(x, 0, 4, H);
  }
  // top sweep
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, W, 60);
  // golden fringe
  ctx.fillStyle = '#c89a3c'; ctx.fillRect(0, 60, W, 6);
  return asTexture(c);
}
