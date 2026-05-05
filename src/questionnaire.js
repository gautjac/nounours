// Questionnaire — 5 elegant story-shaping questions.
// Resolves to a `profile` object: { journey, time, seeks, bravery, world }
// which initializes mood, palette, NPC dialogue variations, and ending pulls.

import { sfx } from './audio.js';

export const questions = [
  {
    key: 'journey',
    prompt: 'What kind of journey do you seek?',
    options: [
      { value: 'wonder',     label: 'Wonder',     hint: 'soft, dreaming' },
      { value: 'courage',    label: 'Courage',    hint: 'small but braver' },
      { value: 'friendship', label: 'Friendship', hint: 'someone to find' },
      { value: 'mystery',    label: 'Mystery',    hint: 'something half-seen' },
      { value: 'mischief',   label: 'Mischief',   hint: 'a kind of trouble' },
    ],
  },
  {
    key: 'time',
    prompt: 'When should this story begin?',
    options: [
      { value: 'dawn',     label: 'At dawn',     hint: 'pink and quiet' },
      { value: 'twilight', label: 'At twilight', hint: 'gold turning blue' },
      { value: 'midnight', label: 'At midnight', hint: 'stars wide open' },
      { value: 'rain',     label: 'In rain',     hint: 'tin roofs and breath' },
    ],
  },
  {
    key: 'seeks',
    prompt: 'What is Nounours looking for?',
    options: [
      { value: 'friend',  label: 'A friend',     hint: 'one who waits' },
      { value: 'song',    label: 'A lost song',  hint: 'small and silver' },
      { value: 'door',    label: 'A hidden door',hint: 'where the air thins' },
      { value: 'memory',  label: 'A memory',     hint: 'he can’t name' },
      { value: 'star',    label: 'A star',       hint: 'that fell too soon' },
    ],
  },
  {
    key: 'bravery',
    prompt: 'How brave do you feel today?',
    options: [
      { value: 'gentle',  label: 'Gentle',  hint: 'soft hands' },
      { value: 'curious', label: 'Curious', hint: 'open eyes' },
      { value: 'bold',    label: 'Bold',    hint: 'forward feet' },
    ],
  },
  {
    key: 'world',
    prompt: 'What kind of world do you want?',
    options: [
      { value: 'forest',  label: 'A forest',         hint: 'patient trees' },
      { value: 'village', label: 'A village',        hint: 'too many lanterns' },
      { value: 'moonlit', label: 'A moonlit dream',  hint: 'half asleep' },
      { value: 'theatre', label: 'A theatre',        hint: 'still applauding' },
      { value: 'seaside', label: 'A quiet shore',    hint: 'breathing water' },
    ],
  },
];

let step = 0;
let answers = {};
let onCompleteCb = null;

const root = document.getElementById('questionnaire');
const inner = root.querySelector('.q-inner');
const promptEl = root.querySelector('.q-prompt');
const optionsEl = root.querySelector('.q-options');
const stepLabel = root.querySelector('.q-step-label');
const progressFill = root.querySelector('.q-progress-fill');
const backBtn = root.querySelector('.q-back');

backBtn.addEventListener('click', () => {
  if (step > 0) { step--; renderStep(); }
});

export function startQuestionnaire(onComplete) {
  step = 0; answers = {}; onCompleteCb = onComplete;
  root.classList.remove('hidden');
  renderStep();
}

function renderStep() {
  const q = questions[step];
  stepLabel.textContent = `Question ${step + 1} of ${questions.length}`;
  promptEl.textContent = q.prompt;
  progressFill.style.width = ((step + 1) / questions.length * 100) + '%';
  optionsEl.innerHTML = '';
  q.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'q-option';
    btn.innerHTML = `<span class="q-emoji">${opt.hint}</span>${opt.label}`;
    btn.addEventListener('click', () => choose(q.key, opt.value));
    optionsEl.appendChild(btn);
  });
  backBtn.classList.toggle('hidden', step === 0);
  // focus first option for keyboard
  setTimeout(() => optionsEl.firstChild?.focus(), 30);
}

function choose(key, value) {
  sfx('choice');
  answers[key] = value;
  step++;
  if (step >= questions.length) {
    finish();
  } else {
    // gentle fade
    inner.style.opacity = '0';
    inner.style.transform = 'translateY(8px)';
    inner.style.transition = 'opacity 220ms ease, transform 220ms ease';
    setTimeout(() => {
      renderStep();
      inner.style.opacity = '1';
      inner.style.transform = 'translateY(0)';
    }, 200);
  }
}

function finish() {
  root.classList.add('hidden');
  const profile = { ...answers };
  onCompleteCb && onCompleteCb(profile);
}

// keyboard support
window.addEventListener('keydown', (e) => {
  if (root.classList.contains('hidden')) return;
  const num = parseInt(e.key, 10);
  if (!Number.isNaN(num) && num >= 1 && num <= 9) {
    const btns = optionsEl.querySelectorAll('.q-option');
    const target = btns[num - 1];
    if (target) target.click();
  }
});
