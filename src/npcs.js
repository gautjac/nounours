// NPC definitions and visual builders. Each NPC is a small group
// (sprite plane + soft glow + nameplate placeholder) and a dialogue
// tree resolved at runtime. Dialogue can branch on the player profile
// and on story flags, and can mutate flags through choice handlers.

import * as THREE from 'three';
import { makeBirdTexture, makeLanternMakerTexture, makeMoonKeeperTexture } from './textures.js';
import { state, setFlag, memoryCount } from './state.js';
import { sfx } from './audio.js';

// ---------- Visual builders ----------

function spriteFrom(tex, height) {
  const ar = tex.image.width / tex.image.height;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(height * ar, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02 })
  );
  return m;
}

function glowDisc(color = 0xffe0a0, opacity = 0.16) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 0.9),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  return m;
}

function buildEmbre(zone) {
  const g = new THREE.Group();
  const tex = makeBirdTexture();
  const sprite = spriteFrom(tex, 3.0);
  sprite.position.y = 1.5;
  g.add(sprite);
  g.add(glowDisc(0x8a6acc, 0.18));
  // perched on a small twig — render twig as a thin dark plane
  const twig = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.15),
    new THREE.MeshBasicMaterial({ color: 0x3a2412, transparent: true })
  );
  twig.position.set(0.3, 0.05, -0.05);
  g.add(twig);
  g.userData.bobAmp = 0.06;
  return { group: g, sprite };
}

function buildLior() {
  const g = new THREE.Group();
  const tex = makeLanternMakerTexture();
  const sprite = spriteFrom(tex, 4.6);
  sprite.position.y = 2.3;
  g.add(sprite);
  g.add(glowDisc(0xffd070, 0.22));
  g.userData.bobAmp = 0.04;
  return { group: g, sprite };
}

function buildMaru() {
  const g = new THREE.Group();
  const tex = makeMoonKeeperTexture();
  const sprite = spriteFrom(tex, 4.2);
  sprite.position.y = 2.1;
  g.add(sprite);
  g.add(glowDisc(0xb8c8ff, 0.2));
  g.userData.bobAmp = 0.05;
  return { group: g, sprite };
}

// ---------- Floating storyteller (theatre intro voice) ----------

function buildIntroFloater() {
  const g = new THREE.Group();
  // a small glowing orb — the "voice"
  const tex = makeMoonKeeperTexture(); // re-use; we'll make it tiny + faded
  const orb = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.85 })
  );
  orb.position.y = 3.2;
  g.add(orb);
  // halo
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.18, depthWrite: false })
  );
  halo.position.y = 3.2;
  g.add(halo);
  g.userData.bobAmp = 0.18;
  g.userData.bobFreq = 0.9;
  return { group: g, sprite: orb };
}

// ---------- Registry ----------

export const npcDefs = {
  embre_intro_floater: {
    name: 'a voice in the curtain',
    zone: 'theatre',
    position: [4, 0, -1],
    radius: 3.0,
    build: buildIntroFloater,
    dialogue: introFloaterDialogue,
  },
  embre: {
    name: 'Embre',
    zone: 'forest',
    position: [-12, 0, -1.4],
    radius: 2.6,
    build: buildEmbre,
    dialogue: embreDialogue,
  },
  lior: {
    name: 'Lior, the Lantern-Maker',
    zone: 'village',
    position: [10, 0, -1.6],
    radius: 2.8,
    build: buildLior,
    dialogue: liorDialogue,
  },
  maru: {
    name: 'Maru, the Moon-Keeper',
    zone: 'shore',
    position: [-6, 0, -1.6],
    radius: 2.8,
    build: buildMaru,
    dialogue: maruDialogue,
  },
};

// ---------- Dialogue trees ----------
// A dialogue tree is a function returning a node. A node:
//   { name, text, choices:[ { label, then } ] }
// `then` may be another node or a function returning a node, allowing
// flags to be set as a side effect before the next line resolves.

function introFloaterDialogue() {
  const p = state.profile || {};
  const place = p.world ? worldNoun(p.world) : 'a half-painted world';
  return {
    name: 'a voice in the curtain',
    text: `Ah — Nounours stirs. The curtain trembles. He has come looking for ${seekingPhrase(p)}, and outside the velvet there is ${place}, waiting.`,
    choices: [
      { label: 'Step into the story.', then: {
        name: 'a voice in the curtain',
        text: 'Then go softly. The path bends right. Press → and the world will open.',
        choices: [],
      }},
    ],
  };
}

// ----- Embre — the melancholic bird -----

function embreDialogue() {
  const p = state.profile || {};
  const f = state.flags;

  if (f.mem_song) {
    return {
      name: 'Embre',
      text: f.befriended_embre
        ? 'I keep humming the song you brought back. It tastes like rain on a window.'
        : 'You returned with the song. I kept your kindness on my feathers.',
      choices: [],
    };
  }

  const opener = {
    wonder:    'Hello, small bear. I keep songs nobody sings anymore. Do you hear them?',
    courage:   'You’re brave to come here. I lose songs in this wood; would you carry one for me?',
    friendship:'Oh — a friend. I’ve been collecting songs that have no one to sing them.',
    mystery:   'You walk with the patient kind of footsteps. I have a song that won’t stay still.',
    mischief:  'You smell of new trouble. Good. Songs love a little mischief.',
  }[p.journey] || 'Hello, traveler. I gather forgotten songs.';

  return {
    name: 'Embre',
    text: opener,
    choices: [
      { label: 'I can carry your song.', then: {
        name: 'Embre',
        text: 'It is small and silver. Hum it back to whoever taught it. They’ll remember.',
        choices: [
          { label: 'I will.', then: () => {
            setFlag('mem_song'); setFlag('befriended_embre');
            sfx('memory');
            return {
              name: 'Embre',
              text: 'Thank you. The wood feels less heavy already.',
              choices: [],
            };
          }},
        ],
      }},
      { label: 'What do songs taste like to you?', then: {
        name: 'Embre',
        text: 'Like the second before someone says they love you. Like a window left open.',
        choices: [
          { label: 'I’ll come back for it.', then: { name: 'Embre', text: 'I’ll be here. Songs are patient.', choices: [] }},
          { label: 'Give me the song now.', then: () => {
            setFlag('mem_song'); setFlag('befriended_embre');
            sfx('memory');
            return { name: 'Embre', text: 'Then carry it gently. It bruises easily.', choices: [] };
          }},
        ],
      }},
    ],
  };
}

// ----- Lior — the Lantern-Maker -----

function liorDialogue() {
  const p = state.profile || {};
  const f = state.flags;

  if (f.mem_lantern) {
    return {
      name: 'Lior, the Lantern-Maker',
      text: f.befriended_lior
        ? 'Your lantern still burns? Good. Light is a quiet promise — keep it.'
        : 'You took the lantern. I hope it leads somewhere worth the walk.',
      choices: [],
    };
  }

  const opener = (p.time === 'midnight' || p.time === 'rain')
    ? 'You came on a dim hour. Most do. Lanterns are for those who are not yet sure.'
    : 'A small traveler with a small heart, and a great deal of patchwork. Welcome.';

  return {
    name: 'Lior, the Lantern-Maker',
    text: opener,
    choices: [
      { label: 'May I have a lantern?', then: {
        name: 'Lior, the Lantern-Maker',
        text: 'A lantern asks something of its keeper. Tell me — what do you carry already?',
        choices: [
          {
            label: f.mem_song ? 'A song that wants to be returned.' : 'Mostly stitches and questions.',
            then: () => {
              setFlag('mem_lantern'); setFlag('befriended_lior');
              sfx('memory');
              return {
                name: 'Lior, the Lantern-Maker',
                text: f.mem_song
                  ? 'Then take this — it likes carriers of small bright things.'
                  : 'Then take this; it will keep you company until the answers do.',
                choices: [],
              };
            }
          },
          { label: 'Maybe later.', then: { name: 'Lior, the Lantern-Maker', text: 'The fire will wait.', choices: [] }},
        ],
      }},
      { label: 'Have you seen anyone strange?', then: {
        name: 'Lior, the Lantern-Maker',
        text: 'There is one by the water. She does not look up much. If you bring her light, she may.',
        choices: [],
      }},
    ],
  };
}

// ----- Maru — the Moon-Keeper -----

function maruDialogue() {
  const p = state.profile || {};
  const f = state.flags;

  if (f.mem_star) {
    return {
      name: 'Maru, the Moon-Keeper',
      text: f.befriended_maru
        ? 'You came back. The moon noticed. So did I.'
        : 'You took a piece of star. Be careful — they prefer to be given, not kept.',
      choices: [],
    };
  }

  // Maru reacts most warmly if the player brings a lantern in the dark
  const lit = f.mem_lantern && (p.time === 'midnight' || p.time === 'twilight' || p.time === 'rain');
  const opener = lit
    ? 'You brought light. I haven’t had a visitor with light in a long time.'
    : (p.bravery === 'gentle')
      ? 'Oh. You’re very small. So am I, mostly.'
      : 'You’re close. Closer than people usually come.';

  const giveStar = () => {
    setFlag('mem_star'); setFlag('befriended_maru');
    if (memoryCount() >= 2 && f.mem_lantern) setFlag('door_revealed');
    sfx('memory');
    return {
      name: 'Maru, the Moon-Keeper',
      text: 'Then take this — a piece of a star that was too shy to be hung. Keep it where it can hear your heart.',
      choices: [],
    };
  };

  const choices = [
    { label: 'Hello, Maru.', then: {
      name: 'Maru, the Moon-Keeper',
      text: 'Hello, Nounours. I knew your name without being told.',
      choices: [
        { label: 'Why are you here?', then: {
          name: 'Maru, the Moon-Keeper',
          text: 'Someone has to be near the water when the stars come down. Otherwise they get lost.',
          choices: [
            { label: 'I have time. I’ll keep you company.', then: () => {
              setFlag('befriended_maru');
              return { name: 'Maru, the Moon-Keeper', text: 'You can stay as long as you like.', choices: [] };
            }},
            { label: 'May I take one home?', then: giveStar },
          ],
        }},
        { label: 'I brought a lantern.', then: lit ? {
          name: 'Maru, the Moon-Keeper',
          text: 'It’s warm. The water remembered something just now.',
          choices: [
            { label: 'Here — and may I have a star?', then: giveStar },
          ],
        } : {
          name: 'Maru, the Moon-Keeper',
          text: 'Lanterns are kindest in the dark. Come when the sky is sleeping.',
          choices: [],
        }},
      ],
    }},
    { label: 'Are you alright?', then: {
      name: 'Maru, the Moon-Keeper',
      text: 'I think so. I’m the kind of okay that is mostly quiet.',
      choices: [
        { label: 'May I have a star?', then: giveStar },
      ],
    }},
  ];

  return { name: 'Maru, the Moon-Keeper', text: opener, choices };
}

// ---------- Helpers ----------

function seekingPhrase(p) {
  const map = {
    friend:  'a friend',
    song:    'a lost song',
    door:    'a hidden door',
    memory:  'a memory he can’t name',
    star:    'a star that fell too soon',
  };
  return map[p.seeks] || 'something only he will recognize';
}
function worldNoun(w) {
  const map = {
    forest:  'a forest with patient trees',
    village: 'a village with too many lanterns',
    moonlit: 'a moonlit dream that won’t end',
    theatre: 'a theatre that has not finished applauding',
    seaside: 'a quiet shoreline that breathes',
  };
  return map[w] || 'a half-painted world';
}
