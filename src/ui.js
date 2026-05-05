// UI overlays: intro, questionnaire shell, HUD, prompt, ending,
// curtain transition. Wires button actions to callbacks given by main.

import { state, memoryCount } from './state.js';
import { startQuestionnaire } from './questionnaire.js';
import { setMuted, isMuted } from './audio.js';
import { endings } from './story.js';

const introEl   = document.getElementById('intro');
const qEl       = document.getElementById('questionnaire');
const hudEl     = document.getElementById('hud');
const endEl     = document.getElementById('ending');
const promptEl  = document.getElementById('prompt');
const promptText= promptEl.querySelector('span');
const curtainEl = document.getElementById('curtain');

let cb = {};

export function initUI(callbacks) {
  cb = callbacks;

  // Intro begin
  document.querySelector('[data-action="begin"]').addEventListener('click', () => {
    cb.onBegin?.();
  });

  // HUD restart / mute
  document.querySelectorAll('[data-action="restart"]').forEach(b => {
    b.addEventListener('click', () => cb.onRestart?.());
  });
  document.querySelector('[data-action="mute"]').addEventListener('click', (e) => {
    setMuted(!isMuted());
    e.target.textContent = isMuted() ? 'unmute' : 'mute';
  });
}

export function showIntro() {
  hideAll();
  introEl.classList.remove('hidden');
}

export function showQuestionnaireUI(onComplete) {
  hideAll();
  startQuestionnaire(onComplete);
}

export function showHud() { hudEl.classList.remove('hidden'); }
export function hideHud() { hudEl.classList.add('hidden'); }

export function hideAll() {
  introEl.classList.add('hidden');
  qEl.classList.add('hidden');
  endEl.classList.add('hidden');
  hudEl.classList.add('hidden');
  hidePrompt();
}

export function showPrompt(text) {
  promptText.textContent = text;
  promptEl.classList.remove('hidden');
}
export function hidePrompt() { promptEl.classList.add('hidden'); }

export function updateHud() {
  const zoneEl = hudEl.querySelector('.hud-zone');
  const memsEl = hudEl.querySelector('.hud-mems');
  const def = (state.profile) ? null : null;
  const labelMap = {
    theatre: 'the theatre curtain',
    forest:  'the whispering forest',
    village: 'the lantern village',
    shore:   'the moonlit shore',
  };
  zoneEl.textContent = labelMap[state.currentZone] || '';

  // memories
  const f = state.flags;
  const items = [
    { k: 'mem_song',    label: 'song'    },
    { k: 'mem_lantern', label: 'lantern' },
    { k: 'mem_star',    label: 'star'    },
  ];
  memsEl.innerHTML = '';
  items.forEach(it => {
    const d = document.createElement('div');
    d.className = 'hud-mem' + (f[it.k] ? ' active' : '');
    d.title = it.label;
    memsEl.appendChild(d);
  });
}

// ---- Curtain transition ----

export function curtain(showMs = 500, holdMs = 250) {
  return new Promise(resolve => {
    curtainEl.classList.add('active');
    setTimeout(() => {
      // call middle callback at peak
      setTimeout(() => {
        curtainEl.classList.remove('active');
        setTimeout(resolve, showMs);
      }, holdMs);
    }, showMs);
  });
}

// Lower curtain only (caller must call rise() to lift).
export function curtainDown() {
  curtainEl.classList.add('active');
  return new Promise(r => setTimeout(r, 700));
}
export function curtainUp() {
  curtainEl.classList.remove('active');
  return new Promise(r => setTimeout(r, 700));
}

// ---- Ending screen ----

export function showEnding(key) {
  const data = endings[key];
  if (!data) return;
  endEl.querySelector('.end-title').textContent = data.title;
  endEl.querySelector('.end-body').textContent = data.body(state.profile);
  endEl.classList.remove('hidden');
}
