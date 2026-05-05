// Dialogue UI + traversal of dialogue tree nodes.
// Nodes look like: { name, text, choices:[ { label, then } ] }
// `then` may be: another node, or a function returning a node.
// While dialogue is open, the world simulation pauses.

import { sfx } from './audio.js';
import { consumeEvent } from './input.js';

const dialogueEl = document.getElementById('dialogue');
const nameEl = dialogueEl.querySelector('.d-name');
const textEl = dialogueEl.querySelector('.d-text');
const choicesEl = dialogueEl.querySelector('.d-choices');

let open = false;
let typing = null;       // current typewriter timer id
let pendingFull = '';
let onCloseCb = null;
let currentChoices = [];

export function isDialogueOpen() { return open; }

export function openDialogue(node, onClose) {
  if (!node) { closeDialogue(); return; }
  open = true;
  onCloseCb = onClose || null;
  dialogueEl.classList.remove('hidden');
  showNode(node);
}

function showNode(node) {
  // resolve dynamic node
  let resolved = node;
  if (typeof resolved === 'function') resolved = resolved();
  if (!resolved) { closeDialogue(); return; }

  nameEl.textContent = resolved.name || '';
  pendingFull = resolved.text || '';
  // typewriter
  textEl.textContent = '';
  let i = 0;
  if (typing) clearInterval(typing);
  typing = setInterval(() => {
    if (i >= pendingFull.length) {
      clearInterval(typing); typing = null;
      renderChoices(resolved);
      return;
    }
    textEl.textContent += pendingFull[i];
    if (i % 3 === 0) sfx('dialogue');
    i++;
  }, 18);

  // fast-forward & advance handler stored on the box
  dialogueEl.onclick = (e) => {
    if (e.target.closest('.d-choice')) return;
    if (typing) {
      clearInterval(typing); typing = null;
      textEl.textContent = pendingFull;
      renderChoices(resolved);
    } else if (currentChoices.length === 0) {
      closeDialogue();
    }
  };
}

function renderChoices(node) {
  choicesEl.innerHTML = '';
  currentChoices = node.choices || [];
  if (currentChoices.length === 0) {
    // no choices — clicking advances/closes
    return;
  }
  currentChoices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'd-choice';
    btn.innerHTML = `<span class="num">${i + 1}.</span>${c.label}`;
    btn.addEventListener('click', () => pickChoice(i));
    choicesEl.appendChild(btn);
  });
}

function pickChoice(i) {
  const c = currentChoices[i];
  if (!c) return;
  sfx('choice');
  showNode(c.then);
}

export function closeDialogue() {
  if (typing) clearInterval(typing); typing = null;
  open = false;
  currentChoices = [];
  dialogueEl.classList.add('hidden');
  dialogueEl.onclick = null;
  const cb = onCloseCb; onCloseCb = null;
  if (cb) cb();
}

// Hooked into the main loop so keys (E/Enter, 1-4) are consumed.
export function updateDialogueInput() {
  if (!open) return;
  if (consumeEvent('interact')) {
    if (typing) {
      clearInterval(typing); typing = null;
      textEl.textContent = pendingFull;
      // re-resolve choices via a synthetic reflow — we know currentChoices set in showNode timer
      // (timer set them at end); if it hadn't yet, force render:
      if (!choicesEl.childElementCount) {
        renderChoices({ choices: currentChoices });
      }
    } else if (currentChoices.length === 0) {
      closeDialogue();
    } else if (currentChoices.length === 1) {
      pickChoice(0);
    }
  }
  for (let n = 1; n <= 4; n++) {
    if (consumeEvent('choice' + n)) {
      pickChoice(n - 1);
    }
  }
  if (consumeEvent('escape')) {
    if (currentChoices.length === 0) closeDialogue();
  }
}
