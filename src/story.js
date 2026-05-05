// Story / endings logic. Looks at flags + profile and decides
// when to nudge the world toward an ending. The player must
// trigger the door to actually reach the "door beyond" ending.

import { state, memoryCount, setFlag } from './state.js';

export const endings = {
  found_friend: {
    title: 'The Found Friend',
    body: (p) => `In the end Nounours did not find ${seekingNoun(p)} the way he expected. He found a hand to hold, then another, then another. The forest stopped whispering. The lanterns leaned in. The moon was almost smiling. Sometimes that is the whole story.`,
  },
  song_returned: {
    title: 'The Lost Song Returned',
    body: (p) => `He hummed it for the bird, and then for the lantern-maker, and then for the shy keeper of the moon. Each of them remembered something. The song stayed small and silver, but it was no longer lost. Neither was Nounours.`,
  },
  door_beyond: {
    title: 'The Door Beyond',
    body: (p) => `With a star in his patchwork pocket and a lantern at his side, Nounours touched the door at the edge of the water. It opened the way doors open in stories: gently, and only for those who came carefully. He stepped through. The curtain fell.`,
  },
  curtain_call: {
    title: 'A Curtain Call',
    body: (p) => `The story did not finish itself, but Nounours took a small bow anyway, the way puppets do — because every walk through a world is its own quiet ending.`,
  },
};

function seekingNoun(p) {
  return ({
    friend: 'a friend',
    song: 'the song',
    door: 'the hidden door',
    memory: 'the memory',
    star: 'the star',
  })[p?.seeks] || 'what he sought';
}

// Returns the ending key ready to trigger automatically (e.g., when
// the player has befriended everyone). The `door_beyond` ending is
// triggered by interacting with the revealed door, not auto-pull.
export function checkEndings() {
  const f = state.flags;
  if (f.ending) return null;

  // If the hidden door is revealed, defer to the player — they can walk
  // to it for the door ending. Don't pre-empt with a different ending.
  if (f.door_revealed) return null;

  // Auto: befriended all three with at least two memory tokens
  if (f.befriended_embre && f.befriended_lior && f.befriended_maru
      && memoryCount() >= 2) {
    return 'found_friend';
  }
  return null;
}

export function shouldOfferReturnSong() {
  const f = state.flags;
  return f.mem_song && (f.befriended_lior || f.befriended_maru);
}

export function triggerEnding(key) {
  if (!endings[key] || state.flags.ending) return;
  state.flags.ending = key;
  // signal to UI via a custom event the main loop listens to
  window.dispatchEvent(new CustomEvent('story:ending', { detail: { key }}));
}

export function reachCurtainCall() {
  if (state.flags.ending) return;
  triggerEnding('curtain_call');
}
