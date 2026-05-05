# Nounours — An Interactive Puppet Dream

A browser-based interactive animated story centered on **Nounours**, the patchwork bear puppet from your reference photo. Answer five questions, then walk Nounours through a small theatre of stages — meet the bird who keeps forgotten songs, the lantern-maker who lights the unsure, and the moon-keeper who watches the water for fallen stars. Three endings.

## Run it

It's a static web app — no backend, no build step. Any static server will do:

```bash
cd nounours
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` through a local server. (Module imports won't work over `file://`.)

## Tech stack

- **Three.js (0.160, ESM via importmap)** for a 2.5D side-scrolling stage — sprites on quads in a perspective scene, with parallax backdrops and a gentle follow camera.
- **Vanilla JS modules** — no build, no bundler, no framework.
- **HTML/CSS overlays** for intro, questionnaire, HUD, dialogue, ending, and the velvet-curtain transition.
- **WebAudio API** for ambient pads and SFX — synthesized at runtime, no asset downloads.
- **Procedural canvas textures** for Nounours, NPCs, props, and backdrops — drawn at boot, used as Three.js textures.

### Why 2.5D over full 3D

The puppet-theatre fantasy *is* a side-scrolling stage. Procedural canvas sprites give a tactile, handcrafted look without an asset pipeline. Each entity is already a `THREE.Group` of textured planes — to upgrade a character (e.g. swap Nounours for a glTF rig) you replace one mesh inside its group; the rest of the architecture stays put.

## Architecture

```
index.html              # entry, importmap, UI overlays
style.css               # theatrical UI styling

src/main.js             # FSM, render loop, phase transitions
src/state.js            # central store — profile, flags, phase
src/audio.js            # WebAudio synth music + SFX
src/textures.js         # procedural canvas → Three.js textures
src/puppet.js           # Nounours rig (idle, walk, hop, react)
src/input.js            # keyboard + mouse, normalized snapshots + events
src/camera.js           # eased follow + breathing dolly
src/zones.js            # zone defs, palette, backdrop + props builders
src/npcs.js             # NPC builders + dialogue trees
src/world.js            # zone lifecycle, NPC animation, exits
src/dialogue.js         # dialogue UI + tree traversal
src/interaction.js      # proximity + raycast click → dialogue/door
src/questionnaire.js    # 5 questions → profile
src/story.js            # ending triggers + flavor text
src/ui.js               # overlays, HUD, prompts, curtain transitions
```

The flow is a small finite state machine in `main.js`:

```
intro → questionnaire → world ↔ (dialogue) → ending
                          ↘ zone-to-zone via curtain transition
```

## How questionnaire answers shape the story

| Answer       | Effect                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| `time`       | Sky/ground palette, fog color, sun-or-moon body, star count.           |
| `journey`    | Music scale (mood), opening line of Embre.                             |
| `seeks`      | What the narrator says Nounours is looking for.                        |
| `bravery`    | Maru's opener if you haven't earned the lantern path.                  |
| `world`      | Narrator phrasing in the intro voice.                                  |

Story flags (`state.flags`) gate the rest:

- `mem_song`, `mem_lantern`, `mem_star` — collected from each NPC.
- `befriended_*` — relational warmth, separate from the memory tokens.
- `door_revealed` — set when you have the lantern *and* a star *and* visit Maru.
- `ending` — locks once the player reaches one.

## Endings

- **The Found Friend** — befriend all three (auto-pull when the third bond locks in with at least two memories).
- **The Lost Song Returned** — narratively-flavored ending text variation when you've returned the song among the others.
- **The Door Beyond** — lantern + star + visiting Maru reveals a hidden door at the right edge of the shore. Walk to it and press <kbd>E</kbd>.
- **A Curtain Call** — a graceful fallback if you simply leave; reserved hook (not auto-triggered in the prototype).

## Controls

- <kbd>WASD</kbd> / <kbd>arrows</kbd> — move (left/right walks, up/down dollies into/out of the stage)
- <kbd>E</kbd> / <kbd>Enter</kbd> — speak / continue / advance dialogue
- <kbd>Space</kbd> — a little hop (squash + bounce + sound)
- <kbd>1</kbd>–<kbd>4</kbd> — pick a dialogue choice
- <kbd>Esc</kbd> — close a dead-end dialogue
- **Mouse** — click an NPC to walk over and start talking; click the dialogue box to fast-forward typewriter.

Top-right HUD: zone label, three memory pips, mute, **restart story**.

## How to add content

**A new zone** — in `src/zones.js`, add to `zoneDefs` (bounds, exits, npcs list) and add a branch in `buildProps()` describing the props for that stage. Backdrop will work automatically from the palette.

**A new NPC** — in `src/npcs.js`:
1. Write a `build()` function that returns `{ group, sprite }` (a `THREE.Group` containing your textured mesh + glow disc).
2. Write a `dialogue()` function returning `{ name, text, choices: [...] }`. Each `choice.then` may be a node or a `() => node` (so it can flip flags as a side effect).
3. Register it in `npcDefs` with `{ zone, position, radius, build, dialogue }`.

**A new ending** — add a key to `endings` in `src/story.js` with `title` and `body(profile)`. Trigger it via `triggerEnding('your_key')` from `interaction.js`, `npcs.js`, or `checkEndings()`.

**A new question** — append to `questions` in `src/questionnaire.js`. The answer lands on `state.profile[key]` and is available everywhere.

## Where to swap in real Nounours art later

Nounours is currently a single procedurally-drawn composite sprite in `src/textures.js → makeNounoursTexture`. To upgrade:

- **Same approach, hand-drawn:** replace the canvas with `THREE.TextureLoader().load('assets/nounours.png')` in `src/puppet.js` and remove the procedural call. Keep the planar mesh.
- **Segmented rig:** split into head/body/arms PNGs, give each its own plane and parent them under `Puppet.group`. The existing breathing/sway/hop/react state code already drives transforms — just animate per-part.
- **Full glTF rig:** drop a `GLTFLoader` import in `puppet.js`, swap `bodyMesh` for the loaded scene, drive an `AnimationMixer` on idle/walk/interact clips. The rest of the code (input, camera, interactions) does not change.

NPCs work the same way — replace `make*Texture()` calls with image loads or rigs.

## Phase 2

### Shipped — Phase 2A: segmented puppet rig
- `puppet.js` now parents head / torso / two arms / two legs as separate textured planes under a body Group.
- Walk cycle: alternating leg swings, cross-coordinated arm swings.
- New animation states: `puppet.wave()` (right arm up-and-out, with hand wiggle), `puppet.reach()` (both arms forward), `puppet.lookAt(worldX)` (head tilt).
- Interaction system fires the wave once per NPC proximity, the reach when at the revealed door, and the head-tilt continuously toward whoever's nearest.
- Arm Z stacked above head Z so a raised hand renders in front of the face during a wave.

### Up next
- Per-zone ambient SFX (wind in forest, hearth in village, surf at shore) layered onto the existing music.
- A second pass of zones: an attic, a paper-boat journey, a backstage corridor.
- Inventory drawer surfacing collected memories with little sketches (press <kbd>I</kbd>).
- Reading aloud via Web Speech API, voiced softly per character.
- Save-your-story flow — dump `state` to a shareable URL fragment.
- Touch controls (drag-to-walk + tap-to-talk) for mobile.
- Replace the procedural Nounours with a hand-drawn / glTF rig — the segmented architecture in `puppet.js` already maps 1:1 to a real rig (each part is its own pivot group; swap the `_mat(tex)` mesh for a glTF scene per part).
