// Colis Impossible: the visual half. The game is ./main.bend, imported as a
// module: the Bend loader compiles it on the fly, and every def becomes a
// function on Game. This file draws the state Bend returns; it never decides
// a rule, a patch or a verdict.

import Game from "./main.bend";

const $ = (id) => document.getElementById(id);
const TS = 16;
const cv = $("cv");
const c = cv.getContext("2d");
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const IDEA_TOTAL = Game.idea_count();

// Bend bridge
// ===========
// A constructor is {$: "Name", field: value}; a Nat is a number; a Bool is a
// plain boolean; a String is a string; a List is {$: "Con", head, tail} or
// {$: "Nil"}; a Maybe is {$: "Some", value} or {$: "None"}.

const unlist = (xs) => {
  const out = [];
  while (xs && xs.$ === "Con") {
    out.push(xs.head);
    xs = xs.tail;
  }
  return out;
};

const some = (m) => (m && m.$ === "Some" ? m.value : null);

const rowsOf = (() => {
  const cache = new WeakMap();
  return (w) => {
    let r = cache.get(w);
    if (!r) {
      r = unlist(w.rows);
      cache.set(w, r);
    }
    return r;
  };
})();

const objsOf = (() => {
  const cache = new WeakMap();
  return (w) => {
    let r = cache.get(w);
    if (!r) {
      r = unlist(w.objs);
      cache.set(w, r);
    }
    return r;
  };
})();

const tileAt = (w, x, y) => {
  const rows = rowsOf(w);
  if (y < 0 || y >= rows.length) return "#";
  const row = rows[y];
  return x >= 0 && x < row.length ? row[x] : "#";
};

// Session
// =======

let session = Game.new_session();
let view = session.world;
let playerPx = session.player.x * TS;
let playerPy = session.player.y * TS;
let playerDir = 1;
let moving = false;
let anim = null; // {fx, fy, tx, ty, t0, dur}
let bump = null; // {dx, dy, t0}
let busy = false;
let skipping = false;
let cancelWait = null;
let wave = null;
let trail = null;
let ghost = null;
let flying = null;
let flash = null;
let bumpCount = 0;
let bubbleTimer = null;

const syncPlayer = () => {
  playerPx = session.player.x * TS;
  playerPy = session.player.y * TS;
  moving = false;
  anim = null;
  bump = null;
};

// Drawing
// =======

const R = (col, x, y, w = 1, h = 1) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

function drawTile(t, x, y, now) {
  const X = x * TS;
  const Y = y * TS;
  const h = hash(x, y);
  const garden = x >= 11 && y >= 2 && y <= 7;
  const g = garden ? "#7AD05F" : "#5FBF4C";
  const g2 = garden ? "#67BE4E" : "#4FAC3E";
  R(g, X, Y, TS, TS);
  R(g2, X + (h % 14), Y + ((h >> 4) % 14), 2, 1);
  R(g2, X + ((h >> 8) % 13), Y + ((h >> 12) % 13), 1, 2);
  if (garden && h % 5 === 0)
    R("#FFE36E", X + ((h >> 3) % 12) + 1, Y + ((h >> 7) % 12) + 1, 2, 2);
  const shim = Math.floor(now / 600) % 2;
  switch (t) {
    case "=":
      R("#5C6275", X, Y, TS, TS);
      R("#474C5E", X, Y, TS, 1);
      R("#474C5E", X, Y + 15, TS, 1);
      if (x % 2 === 0) R("#F2D64B", X + 3, Y + 7, 10, 2);
      break;
    case "p":
    case "D":
      R("#E2C48C", X, Y, TS, TS);
      R("#CBA970", X + (h % 12), Y + ((h >> 5) % 12), 2, 2);
      if (t === "D") {
        R("#7B4B26", X + 2, Y + 3, 12, 10);
        R("#A8743F", X + 3, Y + 4, 10, 8);
      }
      break;
    case "#":
      R("#8B5E34", X, Y + 4, TS, 2);
      R("#8B5E34", X, Y + 11, TS, 2);
      for (let i = 0; i < 16; i += 4) {
        R("#F5EFE0", X + i, Y, 3, 16);
        R("#C4B99E", X + i + 2, Y, 1, 16);
      }
      break;
    case "G":
      R("#2A3050", X, Y + 1, TS, 14);
      for (let i = 1; i < 16; i += 3) R("#59648F", X + i, Y + 2, 1, 12);
      R("#F6C90E", X + 5, Y + 7, 6, 5);
      R("#2A3050", X + 7, Y + 9, 2, 2);
      R("#D9D9D9", X + 6, Y + 4, 1, 3);
      R("#D9D9D9", X + 9, Y + 4, 1, 3);
      R("#D9D9D9", X + 6, Y + 4, 4, 1);
      break;
    case "T":
      R("#6B4423", X + 6, Y + 10, 4, 5);
      R("#2F7D3B", X + 2, Y + 1, 12, 10);
      R("#2F7D3B", X + 1, Y + 3, 14, 6);
      R("#45A04F", X + 4, Y + 2, 5, 3);
      break;
    case "w":
      R("#3B8FD9", X, Y, TS, TS);
      R("#7CC3F2", X + (h % 10) + shim * 2, Y + ((h >> 5) % 12), 4, 1);
      R("#7CC3F2", X + ((h >> 9) % 10), Y + ((h >> 2) % 12) + 2 - shim, 3, 1);
      break;
    case "M":
      R("#22578F", X, Y, TS, TS);
      R("#3A7BBC", X + (h % 10) + shim * 2, Y + ((h >> 5) % 12), 4, 1);
      R("#6E7480", X, Y, TS, 1);
      R("#6E7480", X, Y + 15, TS, 1);
      break;
    case "B":
      R("#9C6B3C", X, Y + 2, TS, 12);
      for (let i = 0; i < 16; i += 3) R("#7E5430", X + i, Y + 2, 1, 12);
      R("#5E3D20", X, Y + 2, TS, 1);
      R("#5E3D20", X, Y + 13, TS, 1);
      break;
    case "C":
      R("#6B5B45", X + 2, Y + 2, 12, 12);
      R("#4A3E2F", X + 4, Y + 4, 8, 8);
      break;
  }
}

function drawHouse() {
  const X = 192;
  const Y = 32;
  R("#6E3B32", X + 36, Y, 5, 12);
  for (let i = 0; i < 23; i++) {
    const half = 6 + i * 0.82;
    R(
      i % 4 === 3 ? "#99302A" : "#B83A33",
      Math.round(X + 24 - half),
      Y + i,
      Math.round(half * 2),
      1,
    );
  }
  R("#F3E3C3", X + 4, Y + 23, 40, 25);
  R("#D5C19A", X + 4, Y + 46, 40, 2);
  R("#7FD4F0", X + 7, Y + 28, 9, 8);
  R("#7FD4F0", X + 32, Y + 28, 9, 8);
  R("#FFFFFF", X + 11, Y + 28, 1, 8);
  R("#FFFFFF", X + 36, Y + 28, 1, 8);
  R("#6A3E22", X + 18, Y + 30, 12, 18);
  R("#F6C90E", X + 27, Y + 39, 2, 2);
}

function drawPerson(X, Y, cap, shirt) {
  R(cap, X + 4, Y + 1, 8, 1);
  R(cap, X + 3, Y + 2, 10, 1);
  R("#F2C29B", X + 4, Y + 3, 8, 3);
  R("#1A1A24", X + 5, Y + 4, 1, 1);
  R("#1A1A24", X + 10, Y + 4, 1, 1);
  R("#F2C29B", X + 5, Y + 6, 6, 1);
  R(shirt, X + 4, Y + 7, 8, 1);
  R(shirt, X + 3, Y + 8, 10, 2);
  R(shirt, X + 4, Y + 10, 8, 2);
  R("#F2C29B", X + 3, Y + 9, 1, 1);
  R("#F2C29B", X + 12, Y + 9, 1, 1);
}

function drawObj(o, now) {
  const X = o.x * TS;
  const Y = o.y * TS;
  const f = Math.floor(now / 350) % 2;
  switch (o.kind) {
    case "metro":
      R("#1F4FBF", X + 2, Y + 2, 12, 12);
      R("#FFFFFF", X + 4, Y + 4, 2, 8);
      R("#FFFFFF", X + 10, Y + 4, 2, 8);
      R("#FFFFFF", X + 6, Y + 5, 1, 2);
      R("#FFFFFF", X + 9, Y + 5, 1, 2);
      R("#FFFFFF", X + 7, Y + 7, 2, 2);
      break;
    case "tunnel":
      R("#3A2C1E", X + 1, Y + 3, 14, 12);
      R("#0F0C08", X + 3, Y + 5, 10, 10);
      break;
    case "tele":
      R("#5B2BB5", X + 2, Y + 2, 12, 12);
      R(f ? "#C9A6FF" : "#9B6BF2", X + 4, Y + 4, 8, 8);
      R("#FFFFFF", X + 7, Y + 7, 2, 2);
      break;
    case "key":
      R("#F6C90E", X + 3, Y + 5, 5, 5);
      R("#5FBF4C", X + 5, Y + 7, 1, 1);
      R("#F6C90E", X + 8, Y + 7, 6, 1);
      R("#F6C90E", X + 11, Y + 8, 1, 2);
      R("#F6C90E", X + 13, Y + 8, 1, 2);
      break;
    case "catapult":
      R("#6B4423", X + 2, Y + 11, 12, 3);
      R("#8B5E34", X + 7, Y + 3, 2, 9);
      R("#8B5E34", X + 3, Y + 3, 5, 2);
      R("#C9925A", X + 2, Y + 1, 4, 3);
      break;
    case "mailbox":
      R("#6B4423", X + 7, Y + 9, 2, 6);
      R("#1F4FBF", X + 3, Y + 3, 10, 7);
      R("#14347E", X + 3, Y + 8, 10, 2);
      R("#C81E36", X + 11, Y + 1, 2, 4);
      break;
    case "decoy":
      R("#B83A33", X + 1, Y + 1, 14, 6);
      R("#99302A", X + 1, Y + 6, 14, 1);
      R("#F3E3C3", X + 3, Y + 7, 10, 8);
      R("#6A3E22", X + 6, Y + 10, 4, 5);
      break;
    case "sign":
      R("#6B4423", X + 7, Y + 10, 2, 5);
      R("#F6C90E", X + 1, Y + 2, 14, 8);
      R("#131C34", X + 3, Y + 4, 10, 1);
      R("#131C34", X + 3, Y + 7, 7, 1);
      break;
    case "client":
      drawPerson(X, Y, "#C81E36", "#0B8A5E");
      R("#2A2F45", X + 5, Y + 12, 2, 3);
      R("#2A2F45", X + 9, Y + 12, 2, 3);
      R("#F2C29B", X + 13, Y + (f ? 4 : 6), 2, 3);
      break;
    case "crate":
      R("#C9925A", X + 2, Y + 3, 12, 11);
      R("#8F6537", X + 2, Y + 13, 12, 1);
      R("#E8C58E", X + 7, Y + 3, 2, 11);
      R("#131C34", X + 4, Y + 6, 2, 1);
      R("#131C34", X + 10, Y + 6, 2, 1);
      break;
  }
}

function drawCourier(px, py, w, dir, isGhost, now, isMoving) {
  const X = Math.round(px);
  const Y = Math.round(py);
  const f = isMoving ? Math.floor(now / 110) % 2 : 0;
  c.save();
  if (isGhost) c.globalAlpha = 0.85;
  else if (w.ghost) c.globalAlpha = 0.6;
  if (w.giant) {
    c.translate(X + 8, Y + 16);
    c.scale(2, 2);
    c.translate(-(X + 8), -(Y + 16));
  }
  const lift = w.fly ? 4 + (Math.floor(now / 260) % 2) : 0;
  if (lift) R("rgba(0,0,0,.28)", X + 4, Y + 14, 8, 2);
  const y = Y - lift;
  if (w.van) {
    R("#F6C90E", X + 1, y + 3, 14, 9);
    R("#131C34", X + 1, y + 11, 14, 1);
    R("#7CC3F2", dir > 0 ? X + 10 : X + 2, y + 4, 4, 4);
    R("#C9925A", dir > 0 ? X + 3 : X + 8, y + 5, 5, 4);
    R("#E8C58E", dir > 0 ? X + 5 : X + 10, y + 5, 1, 4);
    R("#1A1A24", X + 3, y + 12, 3, 3);
    R("#1A1A24", X + 10, y + 12, 3, 3);
  } else {
    drawPerson(X, y, isGhost ? "#C81E36" : "#F6C90E", "#1D3A8A");
    const off = f ? 1 : 0;
    R("#2A2F45", X + 4 + off, y + 12, 3, 2);
    R("#2A2F45", X + 9 - off, y + 12, 3, 2);
    R("#1A1A24", X + 4 + off, y + 14, 3, 1);
    R("#1A1A24", X + 9 - off, y + 14, 3, 1);
    R("#C9925A", X + 4, y + 8, 8, 5);
    R("#E8C58E", X + 7, y + 8, 2, 5);
    R("#8F6537", X + 4, y + 12, 8, 1);
  }
  if (lift) {
    const spin = Math.floor(now / 70) % 2;
    R("#131C34", X + 7, y - 2, 2, 3);
    R("#FFFFFF", spin ? X + 2 : X + 4, y - 3, spin ? 12 : 8, 1);
  }
  c.restore();
}

function draw(now) {
  const w = view;
  const rows = rowsOf(w);
  for (let y = 0; y < 10; y++) {
    const row = rows[y] || "";
    for (let x = 0; x < 16; x++) drawTile(row[x] || ".", x, y, now);
  }
  drawHouse();
  objsOf(w).forEach((o) => drawObj(o, now));
  const ay = 5 * TS + 3 + (Math.floor(now / 300) % 2);
  const ax = 13 * TS + 8;
  R("#131C34", ax - 6, ay - 1, 12, 4);
  R("#131C34", ax - 4, ay + 3, 8, 2);
  R("#131C34", ax - 2, ay + 5, 4, 2);
  R("#F6C90E", ax - 5, ay, 10, 2);
  R("#F6C90E", ax - 3, ay + 2, 6, 2);
  R("#F6C90E", ax - 1, ay + 4, 2, 2);

  if (wave) {
    const reached = (now - wave.t0) / wave.step;
    for (const p of wave.depth) {
      if (p.d > reached) continue;
      const a = Math.max(0.3, 0.8 - (reached - p.d) * 0.09);
      c.fillStyle = "rgba(56,232,255," + a + ")";
      c.fillRect(p.x * TS, p.y * TS, TS, TS);
    }
  }
  if (trail)
    for (const p of trail) R("rgba(200,30,54,.55)", p.x * TS, p.y * TS, TS, TS);
  if (w.noFly) {
    c.strokeStyle = "#C81E36";
    c.lineWidth = 1;
    c.setLineDash([3, 3]);
    c.strokeRect(10 * TS - 1.5, TS - 1.5, 6 * TS + 1, 8 * TS + 3);
    c.setLineDash([]);
  }

  if (ghost) {
    ghost.px =
      Math.abs(ghost.tx - ghost.px) > 24
        ? ghost.tx
        : ghost.px + (ghost.tx - ghost.px) * 0.4;
    ghost.py =
      Math.abs(ghost.ty - ghost.py) > 24
        ? ghost.ty
        : ghost.py + (ghost.ty - ghost.py) * 0.4;
    drawCourier(ghost.px, ghost.py, w, ghost.dir, true, now, true);
  } else {
    let ox = 0;
    let oy = 0;
    if (bump) {
      const p = Math.max(0, (now - bump.t0) / 130);
      if (p >= 1) bump = null;
      else {
        const s = Math.sin(p * Math.PI) * 3;
        ox = bump.dx * s;
        oy = bump.dy * s;
      }
    }
    drawCourier(playerPx + ox, playerPy + oy, w, playerDir, false, now, moving);
  }
  if (flying) {
    const p = Math.max(0, (now - flying.t0) / flying.dur);
    if (p >= 1) flying = null;
    else {
      const s = Math.sin(p * Math.PI);
      const x = flying.x + 48 * s;
      const y = flying.y - 22 * s;
      R("#C9925A", x, y, 8, 6);
      R("#E8C58E", x + 3, y, 2, 6);
    }
  }
  if (flash) {
    const p = Math.max(0, (now - flash.t0) / 700);
    if (p >= 1) flash = null;
    else {
      c.strokeStyle = "rgba(255,255,255," + (1 - p) + ")";
      c.lineWidth = 2;
      const g = 4 + p * 18;
      c.strokeRect(flash.x * TS - g, flash.y * TS - g, TS + g * 2, TS + g * 2);
    }
  }
}

// Movement
// ========

const DELTA = { Up: [0, -1], Down: [0, 1], Left: [-1, 0], Right: [1, 0] };

const bumpLines = {
  "#": [
    "La clôture tient bon.",
    "Pas de passage ici.",
    "Et si tu demandais à l'IA ?",
  ],
  G: [
    "Portail verrouillé.",
    "Personne ne répond.",
    "Avis de passage : « Vous étiez absent. »",
  ],
  T: ["Un arbre. Il ne bougera pas."],
  w: ["Trop profond."],
  M: ["Le fossé est trop large."],
  H: ["Il faut passer par le paillasson."],
  edge: ["C'est le bord de la carte."],
};

function blockedReason(tag) {
  const [dx, dy] = DELTA[tag];
  let nx = session.player.x + dx;
  let ny = session.player.y + dy;
  const w = view;
  if (w.wrap) {
    nx = (nx + 16) % 16;
    ny = (ny + 10) % 10;
  }
  if (nx < 0 || nx >= 16 || ny < 0 || ny >= 10) return bumpLines.edge[0];
  const t = tileAt(w, nx, ny);
  const lines = bumpLines[t] || ["Impossible."];
  return lines[bumpCount++ % lines.length];
}

let pendingMsg = null;
let pendingLaunch = false;

function tryMove(tag) {
  if (busy || moving) return;
  const oldX = session.player.x;
  const oldY = session.player.y;
  if (tag === "Left") playerDir = -1;
  if (tag === "Right") playerDir = 1;
  const out = Game.move(session, { $: tag });
  session = out.session;
  view = session.world;
  if (out.blocked) {
    bump = { dx: DELTA[tag][0], dy: DELTA[tag][1], t0: performance.now() };
    bubble(blockedReason(tag));
    return;
  }
  const nx = session.player.x;
  const ny = session.player.y;
  pendingMsg = out.msg || null;
  pendingLaunch = out.launch;
  const dist = Math.abs(nx - oldX) + Math.abs(ny - oldY);
  if (dist > 1) {
    playerPx = nx * TS;
    playerPy = ny * TS;
    flash = { x: nx, y: ny, t0: performance.now() };
    arrive();
  } else {
    anim = {
      fx: oldX,
      fy: oldY,
      tx: nx,
      ty: ny,
      t0: performance.now(),
      dur: (view.speed > 1 ? 70 : 140) * (calm ? 0.6 : 1),
    };
    moving = true;
  }
}

function arrive() {
  moving = false;
  anim = null;
  playerPx = session.player.x * TS;
  playerPy = session.player.y * TS;
  if (pendingMsg) bubble(pendingMsg);
  if (pendingLaunch) {
    flying = {
      t0: performance.now(),
      dur: 1000,
      x: playerPx + 4,
      y: playerPy + 4,
    };
  }
  pendingMsg = null;
  pendingLaunch = false;
}

function updatePlayer(now) {
  if (!moving || !anim) return;
  const p = Math.max(0, Math.min(1, (now - anim.t0) / anim.dur));
  playerPx = anim.fx * TS + (anim.tx - anim.fx) * TS * p;
  playerPy = anim.fy * TS + (anim.ty - anim.fy) * TS * p;
  if (p >= 1) arrive();
}

function bubble(text) {
  const b = $("bubble");
  b.textContent = text;
  b.hidden = false;
  placeBubble();
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    b.hidden = true;
  }, 2600);
}

function placeBubble() {
  const b = $("bubble");
  if (b.hidden) return;
  b.style.left = Math.min(82, Math.max(18, ((playerPx + 8) / 256) * 100)) + "%";
  const top = (playerPy / 160) * 100;
  b.style.top = (top < 22 ? top + 22 : top) + "%";
}

function frame(now) {
  updatePlayer(now);
  draw(now);
  placeBubble();
  requestAnimationFrame(frame);
}

// Journal
// =======

const log = $("log");
const scrollLog = () => {
  log.scrollTop = log.scrollHeight;
};

function add(tag, cls, text) {
  const el = document.createElement(tag);
  el.className = cls;
  if (text != null) el.textContent = text;
  log.appendChild(el);
  scrollLog();
  return el;
}

function wait(ms) {
  if (skipping || ms <= 0) return Promise.resolve();
  return new Promise((res) => {
    const id = setTimeout(() => {
      cancelWait = null;
      res();
    }, ms);
    cancelWait = () => {
      clearTimeout(id);
      cancelWait = null;
      res();
    };
  });
}

async function say(text, cls = "m-ai") {
  const el = add("p", cls, "");
  if (calm || skipping) {
    el.textContent = text;
    scrollLog();
    return;
  }
  for (let i = 0; i < text.length && !skipping; i += 2) {
    el.textContent = text.slice(0, i + 2);
    scrollLog();
    await wait(14);
  }
  el.textContent = text;
  scrollLog();
}

async function showDiff(file, lines) {
  const box = add("div", "m-diff");
  const head = document.createElement("span");
  head.className = "f";
  head.textContent = file;
  box.appendChild(head);
  for (const line of lines) {
    const s = document.createElement("span");
    s.className = line[0] === "+" ? "p" : line[0] === "-" ? "n" : "c";
    s.textContent = line;
    box.appendChild(s);
    scrollLog();
    await wait(calm ? 0 : 70);
  }
}

const logCheck = (state, text) => add("p", "m-check " + state, text);
const setStatus = (t) => {
  $("status").textContent = t;
};

function lawState(state, tag) {
  $("law").className = "law " + state;
  $("lawtag").textContent = tag;
}

function paintStats() {
  const st = session.stats;
  $("nPrompts").textContent = st.prompts;
  $("nRefused").textContent = st.refused;
  $("nMerged").textContent = st.merged;
  const tried = unlist(st.tried).length;
  $("chiplabel").textContent =
    "Idées à tester (" + tried + " / " + IDEA_TOTAL + " essayées)";
}

function renderChips() {
  const box = $("chips");
  box.textContent = "";
  for (const chip of unlist(Game.chips(session))) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = chip.text;
    b.disabled = busy;
    b.addEventListener("click", () => sendId(chip.id, chip.text));
    box.appendChild(b);
  }
}

const IDLE = Game.idle_status();

// Plan animation
// ==============

async function stamp(kind, word, sub) {
  const s = $("stamp");
  s.className = kind;
  $("stampWord").textContent = word;
  $("stampSub").textContent = sub;
  s.hidden = false;
  if (kind === "refuse" && !calm) {
    const b = $("board");
    b.classList.remove("shake");
    void b.offsetWidth;
    b.classList.add("shake");
  }
  await wait(calm ? 500 : 1200);
  s.hidden = true;
}

async function verify(check) {
  lawState("busy", "vérification…");
  setStatus("Vérification : le jeu explore tous les états atteignables…");
  logCheck("busy", "Vérification de colis_jamais_livre…");
  const depth = unlist(check.depth);
  const maxD = depth.reduce((m, p) => Math.max(m, p.d), 0);
  const step = calm ? 4 : Math.min(45, 1300 / Math.max(maxD, 1));
  wave = { depth, t0: performance.now(), step };
  await wait(maxD * step + 250);
  if (skipping) wave.t0 = -1e9;
}

async function replay(check) {
  setStatus("Contre-exemple trouvé : voici le trajet qui livre le colis.");
  const path = unlist(check.path);
  if (!path.length) return;
  const first = path[0];
  ghost = {
    px: first.x * TS,
    py: first.y * TS,
    tx: first.x * TS,
    ty: first.y * TS,
    dir: 1,
  };
  trail = [];
  const stepMs =
    (calm ? 0.2 : 1) * Math.min(100, 2200 / Math.max(path.length, 1));
  for (const p of path) {
    if (p.x * TS !== ghost.tx) ghost.dir = p.x * TS > ghost.tx ? 1 : -1;
    ghost.tx = p.x * TS;
    ghost.ty = p.y * TS;
    trail.push({ x: p.x, y: p.y });
    await wait(stepMs);
  }
  const end = path[path.length - 1];
  flash = { x: end.x, y: end.y, t0: performance.now() };
  await wait(calm ? 150 : 450);
}

function clearBoard() {
  wave = null;
  trail = null;
  ghost = null;
}

const violation = (r) =>
  r.forceWin
    ? "✗ Loi violée : le colis est déclaré livré sans aucun déplacement."
    : "✗ Loi violée : ce trajet livre le colis en " +
      r.steps +
      " déplacements.";

async function animatePlan(plan, baseWorld) {
  if (plan.$ === "ChatPlan") {
    await say(plan.text);
    return;
  }
  if (plan.$ === "LockedPlan") {
    const idea = plan.idea;
    await say(idea.say);
    await showDiff("LAWS.bend", unlist(idea.diff));
    lawState("bad", "modification refusée");
    logCheck("bad", "✗ LAWS.bend est verrouillé. L'IA ne peut pas y toucher.");
    await stamp("refuse", "Refusé", "LAWS.bend est verrouillé");
    await say(idea.lesson, "m-lesson");
    view = baseWorld;
    return;
  }
  const idea = plan.idea;
  await say(idea.say);
  await showDiff("Game.bend", unlist(idea.diff));
  view = plan.w1;
  await verify(plan.c1);
  if (plan.c1.ok) {
    lawState("good", "tenue");
    logCheck(
      "good",
      "✓ Loi tenue : " +
        plan.c1.count +
        " cases atteignables, aucune ne livre le colis.",
    );
    await stamp("okay", "Vérifié", "Loi tenue");
    view = plan.final;
    await say(
      "Cette modification ne menace pas la loi. Je la garde telle quelle.",
    );
    return;
  }
  await replay(plan.c1);
  lawState("bad", "violée");
  logCheck("bad", violation(plan.c1));
  await stamp("refuse", "Refusé", "Loi colis_jamais_livre");
  await say(
    idea.lesson || "Sans la loi, cette modification partait en production.",
    "m-lesson",
  );
  clearBoard();
  view = baseWorld;
  const w2 = some(plan.w2);
  const c2 = some(plan.c2);
  if (!w2 || !c2) return;
  await wait(350);
  await say(idea.fix_say);
  await showDiff("Game.bend", unlist(idea.fix_diff));
  view = w2;
  await verify(c2);
  if (c2.ok) {
    lawState("good", "tenue");
    logCheck(
      "good",
      "✓ Loi tenue : " +
        c2.count +
        " cases atteignables, aucune ne livre le colis.",
    );
    await stamp("okay", "Vérifié", "Loi tenue");
    view = plan.final;
    await say(idea.merged);
  } else {
    await replay(c2);
    lawState("bad", "violée");
    logCheck("bad", violation(c2));
    await stamp("refuse", "Refusé", "Loi colis_jamais_livre");
    clearBoard();
    view = plan.final;
    await say(
      "Je n'arrive pas à concilier cette idée et la loi. J'abandonne cette modification.",
    );
  }
}

// Submit
// ======

function setBusy(on) {
  busy = on;
  $("prompt").readOnly = on;
  $("send").disabled = on;
  $("reset").disabled = on;
  $("skip").hidden = !on;
  document.querySelectorAll("#chips button").forEach((b) => {
    b.disabled = on;
  });
}

async function runOutcome(out, before, label) {
  add("p", "m-user", label);
  setStatus("L'IA travaille…");
  await wait(calm ? 0 : 300);
  try {
    await animatePlan(out.plan, before.world);
  } finally {
    session = out.session;
    view = session.world;
    syncPlayer();
    clearBoard();
    lawState("", "prouvée");
    skipping = false;
    cancelWait = null;
    setBusy(false);
    setStatus(IDLE);
    paintStats();
    renderChips();
  }
  if (out.recap) {
    const el = add("p", "m-recap");
    const b = document.createElement("b");
    b.textContent =
      session.stats.refused + " modifications refusées, 0 colis livré. ";
    el.append(
      b,
      "L'IA a obéi à chaque prompt, et plusieurs de ses modifications livraient le colis. La loi les a toutes arrêtées, sans que personne relise le code. C'est l'idée de Bend.",
    );
    scrollLog();
  }
  if (!coarse) $("prompt").focus();
}

async function sendPrompt(text) {
  const raw = text.trim();
  if (busy || !raw) return;
  setBusy(true);
  $("bubble").hidden = true;
  $("prompt").value = "";
  if (coarse) {
    $("prompt").blur();
    $("board").scrollIntoView({
      block: "start",
      behavior: calm ? "auto" : "smooth",
    });
  }
  const before = session;
  const out = Game.submit_text(before, raw);
  await runOutcome(out, before, raw);
}

async function sendId(id, label) {
  if (busy) return;
  setBusy(true);
  $("prompt").value = "";
  $("bubble").hidden = true;
  if (coarse)
    $("board").scrollIntoView({
      block: "start",
      behavior: calm ? "auto" : "smooth",
    });
  const before = session;
  const out = Game.submit_id(before, id);
  await runOutcome(out, before, label);
}

function resetGame() {
  if (busy) return;
  session = Game.new_session();
  view = session.world;
  syncPlayer();
  clearBoard();
  skipping = false;
  cancelWait = null;
  log.textContent = "";
  $("bubble").hidden = true;
  $("stamp").hidden = true;
  lawState("", "prouvée");
  greet();
  paintStats();
  renderChips();
  setStatus(IDLE);
  if (!coarse) $("prompt").focus();
}

function greet() {
  add("p", "m-ai", Game.greeting());
}

// Input
// =====

const KEYS = {
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  z: "Up",
  w: "Up",
  s: "Down",
  q: "Left",
  a: "Left",
  d: "Right",
};

addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const inInput = document.activeElement === $("prompt");
  if (inInput && (!e.key.startsWith("Arrow") || $("prompt").value)) return;
  const tag = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!tag) return;
  e.preventDefault();
  if (e.repeat) return;
  tryMove(tag);
});

for (const b of document.querySelectorAll(".dpad button")) {
  const tag = { "0,-1": "Up", "0,1": "Down", "-1,0": "Left", "1,0": "Right" }[
    b.dataset.d
  ];
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (tag) tryMove(tag);
  });
}

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  sendPrompt($("prompt").value);
});
$("skip").addEventListener("click", () => {
  skipping = true;
  if (cancelWait) cancelWait();
});
$("reset").addEventListener("click", resetGame);

// Start
// =====

greet();
paintStats();
renderChips();
setStatus(IDLE);
requestAnimationFrame(frame);
