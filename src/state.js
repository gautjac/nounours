// Central app state. Single source of truth for the FSM,
// the player profile derived from the questionnaire, and
// the story flags that gate dialogue and ending logic.

export const state = freshState();

export function freshState() {
  return {
    phase: 'intro', // intro | questionnaire | world | ending
    profile: null,  // populated by questionnaire
    flags: {
      // memory tokens — collected by helping NPCs / discovering things
      mem_song:    false, // got a forgotten song from Embre
      mem_lantern: false, // got a lantern from Lior
      mem_star:    false, // got a star fragment from Maru

      // relational flags — small story choices
      befriended_embre: false,
      befriended_lior:  false,
      befriended_maru:  false,

      // discovery
      door_revealed: false,

      // a single ending flag once reached
      ending: null,
    },
    audio: { muted: false, mood: 'wonder' },
    currentZone: 'theatre',
  };
}

export function resetState() {
  Object.assign(state, freshState());
}

export function setFlag(key, val = true) {
  state.flags[key] = val;
}

export function memoryCount() {
  const f = state.flags;
  return (f.mem_song ? 1 : 0) + (f.mem_lantern ? 1 : 0) + (f.mem_star ? 1 : 0);
}
