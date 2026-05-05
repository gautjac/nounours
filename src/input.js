// Input manager: keyboard + mouse. Exposes a normalized
// vector for movement plus a few pulse events (interact, hop, escape).
// Other systems read the latest snapshot via getInput() / consumeEvent().

const keys = new Set();
const eventQueue = [];

const map = {
  // movement
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
  // actions
  KeyE: 'interact', Enter: 'interact',
  Space: 'hop',
  Escape: 'escape',
  Digit1: 'choice1', Digit2: 'choice2', Digit3: 'choice3', Digit4: 'choice4',
};

let mouseClicked = null; // {x, y} normalized device coords on next consume
let mouseHover = { x: 0, y: 0 };

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const action = map[e.code];
    if (!action) return;
    e.preventDefault();
    if (['interact','hop','escape','choice1','choice2','choice3','choice4'].includes(action)) {
      eventQueue.push(action);
    } else {
      keys.add(action);
    }
  });
  window.addEventListener('keyup', (e) => {
    const action = map[e.code];
    if (!action) return;
    keys.delete(action);
  });

  window.addEventListener('blur', () => keys.clear());

  window.addEventListener('mousemove', (e) => {
    mouseHover.x = (e.clientX / innerWidth) * 2 - 1;
    mouseHover.y = -((e.clientY / innerHeight) * 2 - 1);
  });

  window.addEventListener('mousedown', (e) => {
    // ignore clicks on UI overlays (they have their own handlers)
    if (e.target.closest('.overlay, .dialogue, #hud, .end-inner, .btn, button, kbd')) return;
    mouseClicked = {
      x: (e.clientX / innerWidth) * 2 - 1,
      y: -((e.clientY / innerHeight) * 2 - 1),
    };
    eventQueue.push('mouseclick');
  });
}

export function getInput() {
  let x = 0, z = 0;
  if (keys.has('left'))  x -= 1;
  if (keys.has('right')) x += 1;
  if (keys.has('up'))    z -= 1; // up = into the screen
  if (keys.has('down'))  z += 1;
  // normalize diagonal
  if (x !== 0 && z !== 0) { x *= 0.7071; z *= 0.7071; }
  return { x, z, hover: { ...mouseHover } };
}

export function consumeEvent(name) {
  const i = eventQueue.indexOf(name);
  if (i === -1) return false;
  eventQueue.splice(i, 1);
  return true;
}

export function consumeMouseClick() {
  if (!mouseClicked) return null;
  const c = mouseClicked;
  mouseClicked = null;
  // also remove the 'mouseclick' marker if any
  const i = eventQueue.indexOf('mouseclick');
  if (i !== -1) eventQueue.splice(i, 1);
  return c;
}

export function clearEvents() {
  eventQueue.length = 0;
  mouseClicked = null;
}
