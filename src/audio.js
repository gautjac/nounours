// Lightweight WebAudio synth for ambient pads, dialogue blips,
// and interaction chimes. No external assets — all generated.
// initAudio() must run after a user gesture (we call it on Begin).

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let currentPad = null;
let muted = false;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('Audio unavailable', e);
    return;
  }
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.7;
  masterGain.connect(ctx.destination);

  musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(masterGain);
  sfxGain   = ctx.createGain(); sfxGain.gain.value   = 0.6; sfxGain.connect(masterGain);
}

export function setMuted(v) {
  muted = !!v;
  if (!ctx) return;
  masterGain.gain.cancelScheduledValues(ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(muted ? 0.0 : 0.7, ctx.currentTime + 0.4);
}
export function isMuted() { return muted; }

// ---------- ambient music ----------

const moodToScale = {
  wonder:    [261.63, 329.63, 392.00, 440.00, 493.88], // C E G A B
  courage:   [220.00, 261.63, 329.63, 392.00, 440.00], // A C E G A
  friendship:[293.66, 349.23, 392.00, 440.00, 523.25], // D F G A C
  mystery:   [196.00, 233.08, 277.18, 311.13, 369.99], // G Bb Db Eb Gb-ish
  mischief:  [261.63, 311.13, 349.23, 415.30, 466.16], // C Eb F Ab Bb
};

const timeToFilter = {
  dawn:    { color: 1700, drift: 0.3 },
  twilight:{ color: 1100, drift: 0.4 },
  midnight:{ color:  720, drift: 0.6 },
  rain:    { color:  900, drift: 0.5 },
};

export function playMusic(profile) {
  if (!ctx) return;
  if (currentPad) {
    try { currentPad.stop(0.6); } catch {}
  }

  const mood = profile?.journey || 'wonder';
  const time = profile?.time || 'twilight';
  const scale = moodToScale[mood] || moodToScale.wonder;
  const tone  = timeToFilter[time] || timeToFilter.twilight;

  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(musicGain);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = tone.color;
  filter.Q.value = 0.5;
  filter.connect(out);

  const oscs = scale.slice(0, 4).map((freq, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'sine' : 'triangle';
    o.frequency.value = freq * (i === 0 ? 0.5 : 1); // root drone
    const og = ctx.createGain();
    og.gain.value = i === 0 ? 0.18 : 0.08;
    o.connect(og); og.connect(filter);

    // slow detune drift for warmth
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + i * 0.03;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 4 + i * 2;
    lfo.connect(lfoGain); lfoGain.connect(o.detune);
    lfo.start();
    o.start();
    return { o, og, lfo };
  });

  // Sparse melodic shimmer
  const shimmerInterval = setInterval(() => {
    if (!ctx || muted) return;
    if (Math.random() < (mood === 'mystery' ? 0.35 : 0.2)) {
      const note = scale[Math.floor(Math.random() * scale.length)];
      pluck(note * 2, sfxGain, 0.05, 1.6);
    }
  }, 1800);

  // fade in
  out.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 2.5);

  currentPad = {
    stop: (fade = 0.6) => {
      clearInterval(shimmerInterval);
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.linearRampToValueAtTime(0, t + fade);
      oscs.forEach(({o, lfo}) => { try { o.stop(t + fade + 0.1); lfo.stop(t + fade + 0.1); } catch {} });
    }
  };
}

// ---------- one-shots ----------

function pluck(freq, dest, peak = 0.18, decay = 0.4) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g); g.connect(dest || sfxGain || masterGain);
  o.start(t);
  o.stop(t + decay + 0.05);
}

export function sfx(name) {
  if (!ctx) return;
  switch (name) {
    case 'step':       pluck(160 + Math.random()*40, sfxGain, 0.05, 0.18); break;
    case 'hop':        pluck(420, sfxGain, 0.18, 0.4); pluck(620, sfxGain, 0.10, 0.35); break;
    case 'interact':   pluck(660, sfxGain, 0.18, 0.6); pluck(880, sfxGain, 0.12, 0.5); break;
    case 'dialogue':   pluck(540 + Math.random()*120, sfxGain, 0.06, 0.18); break;
    case 'choice':     pluck(720, sfxGain, 0.16, 0.45); break;
    case 'memory':     pluck(523.25, sfxGain, 0.18, 0.7);
                       setTimeout(()=>pluck(659.25, sfxGain, 0.16, 0.8), 110);
                       setTimeout(()=>pluck(783.99, sfxGain, 0.20, 1.2), 230); break;
    case 'door':       pluck(196, sfxGain, 0.22, 1.4); pluck(261, sfxGain, 0.16, 1.6); break;
    case 'ending':     pluck(329.63, sfxGain, 0.22, 1.6);
                       setTimeout(()=>pluck(392, sfxGain, 0.20, 1.6), 200);
                       setTimeout(()=>pluck(523.25, sfxGain, 0.22, 2.0), 420); break;
    default: pluck(440, sfxGain, 0.1, 0.3);
  }
}
