let cnv;

const MAX_SELECTED = 3;
const MATCH_MODE = "OR";          // "OR" (any tag) or "AND" (all tags)
const PANEL_W = 320;

const COLORS = {
  blue: "#0E50C8",
  blueLight: "#1565C0",
  blueMid: "#1E56D9",
  blueSoft: "#2E7DFF",
  white: "#FFFFFF",
  grayText: "#5A6B7A",
  grayLine: "#D6DFEA",
  bg: "#FFFFFF",
  tagOutline: "rgba(255,255,255,0.35)",
  tagFill: "#225DDC"
};

// Left-side tag pills (label + tags they represent)
const TAGS = [
  { label: "New York",   tags: ["People"]  },
  { label: "Design",     tags: ["Process"] },
  { label: "Exhibition", tags: ["Purpose"] },
  { label: "Finance",    tags: ["Research"]},
  { label: "Climate",    tags: ["Context"] },
];

// Project data (title + tags + optional children)
const PROJECTS = [
  { title: "Climate change", tags: ["People","Purpose","brand repositioning","campaign","social"], children:[
    { title: "Campaign A", tags:["campaign"] },
    { title: "New York",   tags:["branding"] }
  ]},
  { title: "Social housing", tags: ["Research","Context","campaign","social"], children:[
    { title:"Social Drops", tags:["social"] }
  ]},
  { title: "Social cause", tags: ["Purpose","Process"], children:[
    { title:"Retail Pilot", tags:["retail"] }
  ]},
  { title: "Specific time", tags: ["Process","People"], children:[
    { title:"Prototype 1", tags:["innovation"] },
    { title:"Prototype 2", tags:["innovation"] }
  ]},
  { title: "Context", tags: ["Research","Context"], children:[
    { title:"Market Scan", tags:["research"] }
  ]},
  { title: "Stay Home", tags: ["Process","Research"], children:[
    { title:"Exhibit", tags:["exhibition"] }
  ]},
];

// Node color by tag
const TAG_COLORS = {
  People: "#7C4DFF",
  Process: "#00BCD4",
  Purpose: "#00C853",
  Research: "#FFAB00",
  Context: "#FF5252",
  campaign: "#E91E63",
  social: "#2196F3",
  branding: "#9C27B0",
  "brand repositioning": "#8BC34A",
  retail: "#795548",
  innovation: "#00ACC1",
  exhibition: "#6D4C41",
  research: "#5D4037",
};

// ===================== STATE =====================
let mode = "select"; // "select" or "graph"

let tagItems = [];   // left pills
let cell;            // drop zone
let selected = [];   // [{label, tags[]}]
let playBtn;         

// Graph
let nodes = [];
let links = [];
let centerNode = null;
let draggingNode = null;



function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('machine');
  window.__p5cleanup = () => { noLoop(); cnv?.remove(); };
  setupLeftPanel();
  setupDropZoneAndPlay();

  // Create the (fixed) center node for the graph now
  const cx = width * 0.62;
  const cy = height * 0.52;
  centerNode = new Node("•", cx, cy, [], true /*isCenter*/);
  centerNode.fixed = true; // stays put
}

function draw() {
  background(COLORS.bg);


  drawLeftPanel();

  if (mode === "select") {
    drawDropZone();
    playBtn.draw();
  } else {
    runGraph();
  }

  drawFooterDot();
}

/* ===================== UI LAYOUT ===================== */

function setupLeftPanel() {
  const leftX = 40;
  const topY  = 100;
  const gap   = 88;

  tagItems = TAGS.map((t, i) =>
    new TagItem(leftX, topY + i * gap, 240, 54, t.label, t.tags)
  );
}

function setupDropZoneAndPlay() {
  const zoneX = PANEL_W + 40;
  const zoneW = width - zoneX - 40;
  const zoneY = 120;
  const zoneH = height - zoneY - 140;

  cell = new Cell(zoneX, zoneY, zoneW, zoneH);

  playBtn = new PlayButton(
    width * 0.62,
    height * 0.64,
    68,
    () => {
      if (selected.length >= 1 && selected.length <= MAX_SELECTED) {
        launchGraph();
      }
    }
  );
}


function drawLeftPanel() {
  noStroke();
  fill(COLORS.blue);
  rect(32, 88, PANEL_W - 64, height - 160, 6);

  // tags
  for (let item of tagItems) item.draw();

  // little arrow at bottom
  stroke(255);
  strokeWeight(1.5);
  noFill();
  const cx = 260;
  const cy = height - 120;
  ellipse(cx, cy, 34);
  line(cx - 4, cy, cx + 6, cy);
  line(cx + 2, cy - 6, cx + 6, cy);
  line(cx + 2, cy + 6, cx + 6, cy);
}

function drawDropZone() {
  fill(COLORS.blue);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(24);
  text("DRAG YOUR TAGS HERE", cell.cx, cell.y + 24);

  cell.update();
  cell.draw();

  textSize(12);
  text("PRESS PLAY WHEN YOU'RE DONE", playBtn.x, playBtn.y + 56);
}

function drawFooterDot() {
  noFill();
  stroke(COLORS.blue);
  ellipse(52, height - 20, 10);
}

/* ===================== TAG PILL ===================== */

class TagItem {
  constructor(x, y, w, h, label, tags) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.label = label;
    this.tags = tags;
    this.dragging = false;
    this.dx = 0; this.dy = 0;
    this.home = createVector(x, y);
  }

  contains(mx, my) {
    return mx >= this.x && mx <= this.x + this.w &&
           my >= this.y && my <= this.y + this.h;
  }

  draw() {
    // follow mouse while dragging
    if (this.dragging) {
      this.x = mouseX - this.dx;
      this.y = mouseY - this.dy;
    }

    // pill
    stroke(COLORS.tagOutline);
    strokeWeight(1.5);
    fill(COLORS.tagFill);
    rect(this.x, this.y, this.w, this.h, 26);

    // label
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(22);
    text(this.label, this.x + this.w/2, this.y + this.h/2);
  }

  resetHome() {
    this.x = this.home.x;
    this.y = this.home.y;
  }
}

/* ===================== DROP ZONE ===================== */

class Cell {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.cx = x + w * 0.45;
    this.cy = y + h * 0.4;

    this.baseR = 40;
    this.r = this.baseR;
    this.targetR = this.baseR;

    this.ease = 0.12;
    this.breath = true;
    this.breathAmp = 1.5;
  }

  inBounds(mx, my) {
    return mx >= this.x && mx <= this.x + this.w &&
           my >= this.y && my <= this.y + this.h;
  }

  setTargetFromSelection(n) {
    if (n <= 0)       this.targetR = this.baseR;
    else if (n === 1) this.targetR = this.baseR * 1.2;
    else if (n === 2) this.targetR = this.baseR * 1.6;
    else              this.targetR = this.baseR * 2.0;
  }

  update() {
    this.r = lerp(this.r, this.targetR, this.ease);
    if (this.breath && abs(this.r - this.targetR) < 0.5) {
      this.r += sin(frameCount * 0.06) * this.breathAmp * 0.1;
    }
  }

  draw() {
    // subtle area
    noFill();
    stroke(240);
    rect(this.x, this.y, this.w, this.h, 8);

    // main bubble
    const R = this.r;
    noStroke();
    fill(COLORS.blueMid);
    ellipse(this.cx, this.cy, R * 2.2);

    // ring
    noFill();
    stroke(255, 140);
    ellipse(this.cx, this.cy, R * 2.2);

    // count
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(`${selected.length}/${MAX_SELECTED}`, this.cx, this.cy);
  }
}

/* ===================== PLAY BUTTON ===================== */

class PlayButton {
  constructor(x, y, size, onClick) {
    this.x = x; this.y = y; this.size = size;
    this.onClick = onClick;
  }
  enabled() {
    return selected.length > 0 && selected.length <= MAX_SELECTED;
  }
  contains(mx, my) {
    const s = this.size;
    return dist(mx, my, this.x, this.y) <= s * 0.8;
  }
  draw() {
    push();
    noStroke();
    fill(this.enabled() ? COLORS.blueMid : "#B0C4FF");
    ellipse(this.x, this.y, this.size * 1.6);

    // triangle
    fill(255);
    const r = this.size * 0.52;
    beginShape();
    vertex(this.x - r * 0.3, this.y - r);
    vertex(this.x + r,        this.y);
    vertex(this.x - r * 0.3, this.y + r);
    endShape(CLOSE);
    pop();
  }
}

/* ===================== INPUT (SELECT MODE) ===================== */

function mousePressed() {
  if (mode === "select") {
    // start dragging any pill we clicked
    for (let item of tagItems) {
      if (item.contains(mouseX, mouseY)) {
        item.dragging = true;
        item.dx = mouseX - item.x;
        item.dy = mouseY - item.y;
        return;
      }
    }
    // play click
    if (playBtn.contains(mouseX, mouseY) && playBtn.enabled()) {
      playBtn.onClick();
      return;
    }
  } else {
    // GRAPH MODE: start dragging a node
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.isOver(mouseX, mouseY)) {
        draggingNode = n;
        n.fixed = true; // freeze physics while dragging
        return;
      }
    }
  }
}

function mouseDragged() {
  // Make dragged node actually follow the mouse (beginner friendly!)
  if (mode === "graph" && draggingNode) {
    draggingNode.x = constrain(mouseX, PANEL_W + 40, width - 30);
    draggingNode.y = constrain(mouseY, 90, height - 70);
  }
}

function mouseReleased() {
  if (mode === "select") {
    for (let item of tagItems) {
      if (item.dragging) {
        item.dragging = false;

        // If dropped in zone and not over limit, add selection by label
        if (cell.inBounds(mouseX, mouseY)) {
          const duplicate = selected.some(s => s.label === item.label);
          if (!duplicate && selected.length < MAX_SELECTED) {
            selected.push({ label: item.label, tags: item.tags.slice() });
            cell.setTargetFromSelection(selected.length);
          }
        }
        // snap back to left panel
        item.resetHome();
      }
    }
  } else {
    if (draggingNode) {
      draggingNode.fixed = false; // re-enable physics
      draggingNode = null;
    }
  }
}

/* ===================== GRAPH ===================== */

class Node {
  constructor(title, x, y, tags = [], isCenter = false, isChild = false) {
    this.title = title;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.fx = 0; this.fy = 0;
    this.tags = tags;
    this.fixed = false;
    this.isCenter = isCenter;
    this.isChild = isChild;

    this.baseR = isCenter ? 20 : isChild ? 12 : 18;
    this.r = isCenter ? this.baseR : 0;   // newborns start at 0

    // birth animation state
    this.birth = {
      active: !isCenter,
      t: 0,
      duration: 42,    // frames (~0.7s at 60fps)
      angle: 0,        // set by spawner
      kick: 2.2,       // outward push that decays
      parent: null     // set by spawner for clamp
    };

    this.spawned = false;  // prevent double-spawn of children
  }

  // Smoothstep 0→1
  _smooth(u) { return u*u*(3 - 2*u); }
  birthU() {
    if (!this.birth.active) return 1;
    return constrain(this.birth.t / this.birth.duration, 0, 1);
  }
  // 0 at birth start → 1 when fully born. Used to scale forces.
  forceScale() {
    if (this.isCenter) return 1;
    return this._smooth(this.birthU());
  }

  isOver(mx, my) { return dist(mx, my, this.x, this.y) < this.r + 6; }
  resetForces()  { this.fx = 0; this.fy = 0; }
  applyForce(fx, fy) { this.fx += fx; this.fy += fy; }

  // Repel from other nodes (scaled while being born)
  applyRepulsion(others) {
    for (let o of others) {
      if (o === this) continue;
      const dx = this.x - o.x;
      const dy = this.y - o.y;
      const d2 = dx*dx + dy*dy + 0.1;
      let f  = 60000 / d2;

      // scale by "how born" the pair is → near 0 at first
      const s = min(this.forceScale(), o.forceScale());
      f *= s;

      const inv = 1 / Math.sqrt(d2);
      this.fx += dx * inv * f;
      this.fy += dy * inv * f;
    }
  }

  updateBirth() {
    if (!this.birth.active) return;

    this.birth.t++;
    const u = this.birthU();
    const easeOut = (x) => 1 - pow(1 - x, 3);

    // grow radius 0 → baseR
    this.r = lerp(0, this.baseR, easeOut(u));

    // gentle outward push that decays
    const k = this.birth.kick * (1 - u);
    this.vx += cos(this.birth.angle) * 0.05 * k;
    this.vy += sin(this.birth.angle) * 0.05 * k;

    if (u >= 1) {
      this.birth.active = false;
      this.r = this.baseR;
    }
  }

  update() {
    if (this.fixed) return;

    // animate birth first (affects r and adds a tiny push)
    this.updateBirth();

    // integrate physics
    this.vx += this.fx * 0.01;
    this.vy += this.fy * 0.01;
    this.vx *= 0.86;
    this.vy *= 0.86;
    this.x += this.vx;
    this.y += this.vy;

    // While being born, keep the node within a radius that grows
    // from 0 → (parent.r + 12). Feels like it's inside and then peels out.
    if (this.birth.active && this.birth.parent) {
      const u = this._smooth(this.birthU());
      const maxDist = lerp(0, this.birth.parent.r + 12, u);
      const dx = this.x - this.birth.parent.x;
      const dy = this.y - this.birth.parent.y;
      const d  = sqrt(dx*dx + dy*dy);
      if (d > maxDist && d > 0) {
        const s = maxDist / d;
        this.x = this.birth.parent.x + dx * s;
        this.y = this.birth.parent.y + dy * s;
        // also damp velocity when clamped to avoid popping
        this.vx *= 0.85;
        this.vy *= 0.85;
      }
    }

    // keep on screen (avoid left panel)
    this.x = constrain(this.x, PANEL_W + 40, width - 30);
    this.y = constrain(this.y, 90, height - 70);
  }

  draw() {
    let fillCol = "#CBD5E1";
    for (const t of this.tags) {
      if (TAG_COLORS[t]) { fillCol = TAG_COLORS[t]; break; }
    }
    noStroke();
    fill(fillCol);
    ellipse(this.x, this.y, max(1, this.r * 2)); // guard tiny sizes

    fill(40);
    textAlign(CENTER, TOP);
    textSize(this.isCenter ? 14 : 12);
    text(this.title, this.x, this.y + this.r + 6);
  }
}


class Link {
  constructor(a, b) {
    this.a = a; this.b = b;
    this.rest = 150;
    this.k = 0.035;
  }
  apply() {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const d = max(1, sqrt(dx*dx + dy*dy));

    // spring strength ramps in as nodes are born
    const s = min(this.a.forceScale(), this.b.forceScale());
    const kEff = this.k * s;

    const f = (d - this.rest) * kEff;
    const fx = (f * dx) / d;
    const fy = (f * dy) / d;
    this.a.applyForce(fx, fy);
    this.b.applyForce(-fx, -fy);
  }
  draw() {
    stroke(210);
    strokeWeight(1.5);
    line(this.a.x, this.a.y, this.b.x, this.b.y);
  }
}


/* ----------------- Build & Run Graph ----------------- */

function launchGraph() {
  mode = "graph";

  const active = new Set();
  for (const s of selected) s.tags.forEach(t => active.add(t));

  const result = PROJECTS.filter(p => {
    if (active.size === 0) return false;
    if (MATCH_MODE === "AND") return p.tags.every(t => active.has(t));
    return p.tags.some(t => active.has(t));
  });

  nodes = [centerNode];
  links = [];

  const cx = centerNode.x, cy = centerNode.y;
  const N  = max(1, result.length);

  for (let i = 0; i < result.length; i++) {
    const n = new Node(result[i].title, cx, cy, result[i].tags, false, false);
    n.data = result[i];

    // set parent + a clean peel direction (plus tiny jitter)
    n.birth.parent = centerNode;
    n.birth.angle  = (TWO_PI * i) / N + random(-0.12, 0.12);
    n.birth.kick   = 2.2;

    nodes.push(n);
    links.push(new Link(centerNode, n));
  }

  // connect projects with shared tags
  for (let i = 1; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (shareTag(nodes[i].tags, nodes[j].tags)) {
        links.push(new Link(nodes[i], nodes[j]));
      }
    }
  }
}



function runGraph() {
  // “background” pane on right
  noStroke();
  fill(255);
  rect(PANEL_W, 64, width - PANEL_W, height - 64);

  // Physics
  for (let n of nodes) n.resetForces();
  for (let n of nodes) n.applyRepulsion(nodes);
  for (let l of links) l.apply();

  // Update node positions
  for (let n of nodes) n.update();

  // Draw links behind nodes
  for (let l of links) l.draw();

  // Draw nodes
  for (let n of nodes) n.draw();

  // Sidebar blurb
  fill(COLORS.blue);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  text(
    "Short extremely interesting blurb about the important information specifically about this project and the coloured tags will show specific information of information used for this",
    PANEL_W + 10, 110, 400, 200
  );
}

/* ----------------- Graph Interactions ----------------- */

function mouseClicked() {
  if (mode !== "graph") return;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.isCenter && n.isOver(mouseX, mouseY)) {
      if (n.spawned) return;
      n.spawned = true;

      const kids = (n.data && n.data.children) ? n.data.children : [];
      if (!kids.length) return;

      const N = kids.length;
      const off = random(TWO_PI);

      for (let k = 0; k < N; k++) {
        const child = new Node(kids[k].title, n.x, n.y, kids[k].tags || [], false, true);
        child.birth.parent = n;
        child.birth.angle  = off + (TWO_PI * k) / N;
        child.birth.kick   = 2.0;

        nodes.push(child);
        links.push(new Link(n, child));
      }
      return;
    }
  }
}


function keyPressed() {
  if (mode === "graph" && (keyCode === BACKSPACE || keyCode === DELETE)) {
    mode = "select";
    selected = [];
    // keep centerNode around
  }
}

/* ===================== HELPERS ===================== */

function shareTag(a, b) {
  for (const t of a) if (b.includes(t)) return true;
  return false;
}

