
const COLORS = {
  blue: "#0E50C8",
  blueMid: "#1E56D9",
  white: "#FFFFFF",
  bg: "#FFFFFF",
  tagFill: "#225DDC",
};

const TAGS = [
  { label: "New York",   tags: ["People"]  },
  { label: "Design",     tags: ["Process"] },
  { label: "Exhibition", tags: ["Purpose"] },
  { label: "Finance",    tags: ["Research"]},
  { label: "Climate",    tags: ["Context"] },
];

const PROJECTS = [
  { title: "Climate change", tags: ["People","Purpose","brand repositioning","campaign","social"], children:[
    { title: "Campaign A", tags:["campaign"] },
    { title: "New York",   tags:["branding"] }
  ], info: { desc: "A multi-year initiative connecting people to action on climate.", category: "Project", tools:"Workshops, Social, Campaign"} },
  { title: "Social housing", tags: ["Research","Context","campaign","social"], children:[
    { title:"Social Drops", tags:["social"] }
  ], info: { desc: "Research-led proposals for accessible housing models.", category: "Project", tools:"Research, Policy, Mapping"} },
  { title: "Social cause", tags: ["Purpose","Process"], children:[
    { title:"Retail Pilot", tags:["retail"] }
  ], info: { desc: "Brand platform to activate a social mission at scale.", category: "Project", tools:"Brand, Content"} },
  { title: "Specific time", tags: ["Process","People"], children:[
    { title:"Prototype 1", tags:["innovation"] },
    { title:"Prototype 2", tags:["innovation"] }
  ], info: { desc: "Rapid prototyping to validate ideas with real users.", category: "Project", tools:"Prototyping, Testing"} },
  { title: "Context", tags: ["Research","Context"], children:[
    { title:"Market Scan", tags:["research"] }
  ], info: { desc: "Context analysis and market scan for opportunities.", category: "Project", tools:"Research, Analysis"} },
  { title: "Stay Home", tags: ["Process","Research"], children:[
    { title:"Exhibit", tags:["exhibition"] }
  ], info: { desc: "Cultural exhibition exploring life at home.", category: "Project", tools:"Exhibition, Curation"} },
];

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

/* ====== RESPONSIVE UI CONFIG ====== */
let UI = null;

function isMobileViewport() {
  const shortSide = Math.min(windowWidth, windowHeight);
  return shortSide <= 640;
}

function getUIConfig() {
  const mobile = isMobileViewport();
  return {
    // world size (design coords)
    baseWidth:  mobile ? 360 : 1200,
    baseHeight: mobile ? 640 : 680,

    // top bar
    topBarRatio: mobile ? 0.24 : 0.18,
    topBarMin:   110,
    topBarMax:   240,

    // selection zone (world)
    zonePadX:    mobile ? 12 : 40,
    zonePadY:    mobile ? 90 : 120,
    zoneBottom:  mobile ? 140 : 160,

    // play button (screen)
    playRadius:  mobile ? 28 : 36,
    playY:       (h) => Math.min(h - (mobile ? 60 : 80), h * 0.86),

    // node sizes (world)
    rCenter:     mobile ? 14 : 16,
    rNode:       mobile ? 16 : 18,
    rChild:      mobile ? 12 : 12,
    rTag:        mobile ? 16 : 18,

    // physics
    repulseGraph: mobile ? 52000 : 60000,
    repulseTag:   mobile ? 32000 : 38000,
    damping:      mobile ? 0.88   : 0.86,
    linkRest:     mobile ? 130    : 150,
    childRest:    mobile ? 100    : 120,
    kick:         mobile ? 1.8    : 2.2,

    // fonts
    fontTitle:   mobile ? 16 : 18,
    fontBody:    mobile ? 12 : 13,
    fontNode:    mobile ? 12 : 12,
    fontCenter:  mobile ? 13 : 14,

    // behavior
    maxSelected: mobile ? 3 : 3, // keep 3 on both; tweak if needed
  };
}

/* ====== STATE ====== */
let mode = "select"; // "select" or "graph"

// pointer (screen & world)
const pointer = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, justReleased: false, isTouch: false };

// responsive world transform
let baseWidth = 393;
let baseHeight = 852;
let scaleFactor = 1;
let worldOffsetX = 0;
let worldOffsetY = 0;

// top bar
let topBarH = 0;

// Select mode
let tagNodes = [];
let selected = []; // [{label, tags[]}]
let dropZone = null;
let draggingTag = null;

// Graph mode
let nodes = [];    // includes center project
let links = [];
let centerNode = null; // GraphNode at world center
let draggingNode = null;
let hoveredNode = null;
let activeNode = null;

// play button (screen)
let playBtn = null;

/* ====== SETUP / RESIZE ====== */
function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  textAlign(CENTER, CENTER);

  UI = getUIConfig();
  baseWidth = UI.baseWidth;
  baseHeight = UI.baseHeight;

  computeTopBar();
  computeTransform();

  // Center node (world center)
  centerNode = new GraphNode("•", baseWidth / 2, baseHeight / 2, [], true);
  centerNode.fixed = true;
  activeNode = centerNode;

  setupSelectUI();
  spawnFloatingTags();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  UI = getUIConfig();
  baseWidth = UI.baseWidth;
  baseHeight = UI.baseHeight;

  computeTopBar();
  computeTransform();
  setupSelectUI();
}

/* ====== DRAW ====== */
function draw() {
  background(COLORS.bg);

  drawTopBar();

  // update world pointer
  const wpt = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = wpt.x;
  pointer.worldY = wpt.y;

  if (mode === "select") {
    // tag physics in world
    for (const n of tagNodes) { n.resetForces(); n.applyRepulsion(tagNodes); }
    for (const n of tagNodes) n.update();

    // render world
    push();
    translate(worldOffsetX, worldOffsetY);
    scale(scaleFactor);
    drawDropZone();
    for (const n of tagNodes) n.display();
    pop();

    drawPlayButton();
  } else {
    runGraph();
  }

  // cursor
  if (!pointer.isTouch) {
    noCursor(); fill(COLORS.blue); noStroke(); circle(pointer.x, pointer.y, 20);
  } else cursor(ARROW);

  if (pointer.justReleased) pointer.justReleased = false;
}

/* ====== TOP BAR ====== */
function computeTopBar() {
  topBarH = constrain(round(windowHeight * UI.topBarRatio), UI.topBarMin, UI.topBarMax);
}

function drawTopBar() {
  noStroke(); fill(COLORS.blue); rect(0, 0, width, topBarH);

  const padX = 18, padY = 14, contentW = width - padX * 2;
  fill(255); textAlign(LEFT, TOP);

  if (mode === "select") {
    textSize(UI.fontTitle);
    text("Pick up to 3 tags", padX, padY, contentW);

    textSize(UI.fontBody);
    const bodyY = padY + (UI.fontTitle + 8);
    const bodyH = topBarH - bodyY - 16;
    const picked = selected.map(s => s.label).join(", ") || "—";
    text(
      `Drag floating tags into the zone below, then hit Play.\nSelected: ${picked}`,
      padX, bodyY, contentW, max(0, bodyH)
    );
  } else {
    const node = activeNode || centerNode;
    textSize(UI.fontTitle);
    text(node.title || node.label || "—", padX, padY, contentW);

    textSize(UI.fontBody);
    const desc = node.info?.desc || "Click a project to reveal details.";
    const bodyY = padY + (UI.fontTitle + 8);
    const bodyH = topBarH - bodyY - 50;
    text(desc, padX, bodyY, contentW, max(0, bodyH));

    const rowH = 18;
    const y0 = topBarH - rowH * 2 - 10;
    stroke(255, 180); strokeWeight(1);
    line(padX, y0 - 6, width - padX, y0 - 6);
    noStroke(); fill(255); textSize(12);
    textAlign(LEFT, CENTER); text("TAGS", padX, y0);
    textAlign(RIGHT, CENTER); text(node.tags?.join(", ") || "—", width - padX, y0);

    const y1 = y0 + rowH;
    stroke(255, 180); line(padX, y1 - 6, width - padX, y1 - 6);
    noStroke(); fill(255);
    textAlign(LEFT, CENTER); text("CATEGORY", padX, y1);
    textAlign(RIGHT, CENTER); text(node.info?.category || "—", width - padX, y1);
  }
}

/* ====== WORLD TRANSFORM ====== */
function computeTransform() {
  const availW = windowWidth;
  const availH = max(100, windowHeight - topBarH);
  const sx = availW / baseWidth;
  const sy = availH / baseHeight;
  scaleFactor = min(sx, sy);

  const worldW = baseWidth * scaleFactor;
  const worldH = baseHeight * scaleFactor;
  worldOffsetX = (availW - worldW) * 0.5;
  worldOffsetY = topBarH + (availH - worldH) * 0.5;
}
function screenToWorld(px, py) {
  return { x: (px - worldOffsetX) / scaleFactor, y: (py - worldOffsetY) / scaleFactor };
}

/* ====== SELECT MODE ====== */
function setupSelectUI() {
  const zx = UI.zonePadX;
  const zy = UI.zonePadY;
  const zw = baseWidth - UI.zonePadX * 2;
  const zh = baseHeight - zy - UI.zoneBottom;
  dropZone = { x: zx, y: zy, w: zw, h: zh };

  playBtn = { x: width * 0.5, y: UI.playY(height), r: UI.playRadius };
}

function spawnFloatingTags() {
  selected = [];
  tagNodes = [];

  const bounds = { minX: 24, maxX: baseWidth - 24, minY: 24, maxY: baseHeight - 24 };
  for (const t of TAGS) {
    const n = new TagNode(t.label, 0, 0, t.tags);
    const ok = placeNodeNoOverlap(n, tagNodes, bounds, 420, 10);
    if (!ok) {
      n.x = random(bounds.minX, bounds.maxX);
      n.y = random(bounds.minY, bounds.maxY);
    }
    n.vx = random(-1, 1);
    n.vy = random(-1, 1);
    tagNodes.push(n);
  }
}

function drawDropZone() {
  // title
  fill(COLORS.blue); noStroke(); textAlign(CENTER, CENTER);
  textSize(14);
  text(`DRAG UP TO ${UI.maxSelected} TAGS HERE`, dropZone.x + dropZone.w * 0.5, dropZone.y - 16);

  // zone box
  noStroke();
  noFill(); 
  rect(dropZone.x, dropZone.y, dropZone.w, dropZone.h, 10);

  // count bubble
  const cx = dropZone.x + dropZone.w * 0.5;
  const cy = dropZone.y + dropZone.h * 0.42;
  const r  = 28 + selected.length * 10;
  noStroke(); fill(COLORS.blueMid); ellipse(cx, cy, r * 2);
  fill(255); textSize(14); text(`${selected.length}/${UI.maxSelected}`, cx, cy);
}

function drawPlayButton() {
  fill(COLORS.blue); noStroke(); textAlign(CENTER, CENTER);
  textSize(12); text("PRESS PLAY WHEN YOU'RE DONE", playBtn.x, playBtn.y + 40);

  const enabled = selected.length > 0 && selected.length <= UI.maxSelected;
  noStroke(); fill(enabled ? COLORS.blueMid : "#B0C4FF");
  ellipse(playBtn.x, playBtn.y, playBtn.r * 2);

  // triangle
  fill(255);
  const r = playBtn.r * 0.65;
  push(); translate(playBtn.x, playBtn.y);
  beginShape(); vertex(-r * 0.3, -r); vertex(r, 0); vertex(-r * 0.3, r); endShape(CLOSE);
  pop();
}

function inDrop(mx, my) {
  return mx >= dropZone.x && mx <= dropZone.x + dropZone.w &&
         my >= dropZone.y && my <= dropZone.y + dropZone.h;
}

/* ====== GRAPH BUILDING (simple & clear) ====== */

// Helper: score projects by selected tags (prefer AND, fallback to OR)
function pickBestProject(selectedTags) {
  const sel = new Set(selectedTags);
  if (sel.size === 0) return null;

  // 1) strict AND candidates
  let candidates = PROJECTS.filter(p => [...sel].every(t => p.tags.includes(t)));

  // 2) if none, fallback to OR (at least one overlap), highest overlap wins
  if (candidates.length === 0) {
    candidates = PROJECTS
      .map(p => ({ p, overlap: p.tags.filter(t => sel.has(t)).length }))
      .filter(x => x.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .map(x => x.p);
  }

  return candidates[0] || null;
}

// Build clean children around a project (easy to understand)
function buildChildrenForProject(project, selectedTags) {
  const kids = [];

  // 1) built-in children (from data)
  if (project.children && project.children.length) {
    for (const c of project.children) {
      kids.push({ title: c.title, tags: c.tags || [], category: "Child" });
    }
  }

  // 2) extra tags of the project (not in selected) → as “Tag: …”
  for (const t of project.tags) {
    if (!selectedTags.includes(t)) {
      kids.push({ title: `Tag: ${t}`, tags: [t], category: "Tag" });
    }
  }

  // 3) simple info nodes (always present for clarity)
  kids.push({ title: "Context",     tags: ["Context"],   category: "Info", desc: "High-level context about this project." });
  kids.push({ title: "Description", tags: ["Purpose"],   category: "Info", desc: project.info?.desc || "Project overview." });
  kids.push({ title: "Tools",       tags: ["Process"],   category: "Info", desc: project.info?.tools || "Methods & tools used." });

  return kids;
}


function launchGraphFromSelection() {
  mode = "graph";

  // gather selected tag names (data tags)
  const selectedTags = [];
  for (const s of selected) s.tags.forEach(t => selectedTags.push(t));

  // choose a project (simple & clear)
  const chosen = pickBestProject(selectedTags);
  nodes = [];
  links = [];

  if (!chosen) {
    // no match → center stays dot with hint
    centerNode = new GraphNode("No match", baseWidth/2, baseHeight/2, [], true, false, {
      desc: "No project matches your selection. Try different tags.",
      category: "Center"
    });
    centerNode.fixed = true;
    nodes.push(centerNode);
    activeNode = centerNode;
    return;
  }

  // center becomes the project
  centerNode = new GraphNode(chosen.title, baseWidth/2, baseHeight/2, chosen.tags, true, false, chosen.info || {
    desc: "Selected project.",
    category: "Project"
  });
  centerNode.fixed = true;
  nodes.push(centerNode);
  activeNode = centerNode;

  // spawn children (clear & predictable)
  const children = buildChildrenForProject(chosen, selectedTags);
  const N = children.length;
  const off = random(TWO_PI);

  for (let i = 0; i < N; i++) {
    const a = off + (TWO_PI * i) / Math.max(1, N);
    const child = new GraphNode(children[i].title, centerNode.x, centerNode.y, children[i].tags || [], false, true, {
      desc: children[i].desc || "—",
      category: children[i].category || "Child"
    });
    child.birth.parent = centerNode;
    child.birth.angle  = a;
    child.birth.kick   = UI.kick;

    nodes.push(child);
    const L = new GraphLink(centerNode, child);
    L.restLength = UI.childRest;
    links.push(L);
  }

  // Optional: cross-link children that share a tag (light)
  for (let i = 1; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].sharesTagWith && nodes[i].sharesTagWith(nodes[j])) {
        links.push(new GraphLink(nodes[i], nodes[j]));
      }
    }
  }
}

/* ====== GRAPH RENDER ====== */
function runGraph() {
  // hover (world)
  hoveredNode = null;
  for (const n of nodes) {
    if (n.isPointInside(pointer.worldX, pointer.worldY)) { hoveredNode = n; break; }
  }
  if (hoveredNode) activeNode = hoveredNode;

  // physics (world)
  for (const n of nodes) n.resetForces();
  for (const n of nodes) n.applyRepulsion(nodes);
  for (const l of links) l.applyAttraction();
  for (const n of nodes) n.updateInGraph();

  // draw world
  push();
  translate(worldOffsetX, worldOffsetY);
  scale(scaleFactor);
  for (const l of links) l.display();
  for (const n of nodes) n.display();
  pop();
}

/* ====== INPUT ====== */
function mouseMoved(){ pointer.x = mouseX; pointer.y = mouseY; }

function mousePressed() {
  pointer.isTouch = false;
  pointer.x = mouseX; pointer.y = mouseY; pointer.down = true;

  if (mode === "select") {
    // pick tag (world hit)
    for (let i = tagNodes.length - 1; i >= 0; i--) {
      const t = tagNodes[i];
      if (t.isInside(pointer.worldX, pointer.worldY)) {
        draggingTag = t;
        t.dragging = true;
        t.dx = pointer.worldX - t.x;
        t.dy = pointer.worldY - t.y;
        return;
      }
    }
    // play (screen)
    const d = dist(mouseX, mouseY, playBtn.x, playBtn.y);
    if (d <= playBtn.r && selected.length > 0 && selected.length <= UI.maxSelected) {
      launchGraphFromSelection();
      return;
    }
  } else {
    // graph drag (world)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.isPointInside(pointer.worldX, pointer.worldY)) {
        draggingNode = n; n.fixed = true;
        n.offsetX = pointer.worldX - n.x;
        n.offsetY = pointer.worldY - n.y;
        activeNode = n;
        return;
      }
    }
  }
}

function mouseDragged() {
  pointer.x = mouseX; pointer.y = mouseY;

  if (mode === "select" && draggingTag) {
    draggingTag.x = pointer.worldX - draggingTag.dx;
    draggingTag.y = pointer.worldY - draggingTag.dy;
  } else if (mode === "graph" && draggingNode) {
    draggingNode.x = pointer.worldX - draggingNode.offsetX;
    draggingNode.y = pointer.worldY - draggingNode.offsetY;
  }
}

function mouseReleased() {
  pointer.x = mouseX; pointer.y = mouseY;
  pointer.down = false; pointer.justReleased = true;

  if (mode === "select") {
    if (draggingTag) {
      draggingTag.dragging = false;

      // drop into zone → add selection
      if (inDrop(pointer.worldX, pointer.worldY)) {
        const already = selected.some(s => s.label === draggingTag.label);
        if (!already && selected.length < UI.maxSelected) {
          selected.push({ label: draggingTag.label, tags: draggingTag.tags.slice() });
        }
      }
      draggingTag = null;
    }
  } else {
    if (!draggingNode) {
      // tap to focus
      for (let node of nodes) {
        if (node.isPointInside(pointer.worldX, pointer.worldY)) {
          activeNode = node;
          break;
        }
      }
    } else {
      draggingNode.fixed = false;
      draggingNode = null;
    }
  }
}

// touch
function touchStarted(){ pointer.isTouch = true; if (touches.length){ pointer.x=touches[0].x; pointer.y=touches[0].y; mousePressed(); } return false; }
function touchMoved(){ if (touches.length){ pointer.x=touches[0].x; pointer.y=touches[0].y; mouseDragged(); } return false; }
function touchEnded(){ pointer.down=false; pointer.justReleased=true; mouseReleased(); return false; }

/* ====== HELPERS ====== */
function placeNodeNoOverlap(newNode, others, bounds, maxTries = 250, pad = 6) {
  for (let i = 0; i < maxTries; i++) {
    newNode.x = random(bounds.minX + newNode.r, bounds.maxX - newNode.r);
    newNode.y = random(bounds.minY + newNode.r, bounds.maxY - newNode.r);
    let ok = true;
    for (const o of others) {
      const dx = newNode.x - o.x, dy = newNode.y - o.y;
      if (Math.hypot(dx, dy) < (newNode.r + o.r + pad)) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

/* ====== CLASSES ====== */
// floating tag (world)
class TagNode {
  constructor(label, x, y, tags) {
    this.label = label;
    this.x = x; this.y = y;
    this.r = UI.rTag;
    this.tags = tags;
    this.vx = 0; this.vy = 0; this.fx = 0; this.fy = 0;
    this.dragging = false; this.dx = 0; this.dy = 0;
  }
  isInside(wx, wy){ return dist(wx, wy, this.x, this.y) < this.r + 12; }
  resetForces(){ this.fx = 0; this.fy = 0; }
  applyRepulsion(others){
    for (const o of others) {
      if (o === this) continue;
      const dx = this.x - o.x, dy = this.y - o.y;
      const d2 = dx*dx + dy*dy + 0.1;
      const inv = 1 / Math.sqrt(d2);
      const f = UI.repulseTag / d2;
      this.fx += dx * inv * f; this.fy += dy * inv * f;
    }
  }
  update(){
    if (this.dragging) return;
    this.vx += this.fx * 0.01; this.vy += this.fy * 0.01;
    this.vx *= 0.92; this.vy *= 0.92;
    this.x += this.vx; this.y += this.vy;
    this.x = constrain(this.x, this.r, baseWidth - this.r);
    this.y = constrain(this.y, this.r, baseHeight - this.r);
  }
  display(){
    noStroke(); fill(COLORS.tagFill); ellipse(this.x, this.y, this.r * 2);
    fill(255); textSize(UI.fontNode); textAlign(CENTER, TOP);
    text(this.label, this.x, this.y + this.r + 6);
  }
}

// graph node (world) with birth animation
class GraphNode {
  constructor(title, x, y, tags = [], isCenter = false, isChild = false, info = {}) {
    this.title = title; this.x = x; this.y = y;
    this.tags = tags; this.isCenter = isCenter; this.isChild = isChild;

    this.baseR = isCenter ? UI.rCenter : isChild ? UI.rChild : UI.rNode;
    this.r = isCenter ? this.baseR : 0;

    this.vx = 0; this.vy = 0; this.fx = 0; this.fy = 0; this.fixed = false;
    this.spawned = false;
    this.info = { desc: info.desc || (isCenter ? "Pick projects by tags and explore relations." : "—"),
                  category: info.category || (isCenter ? "Center" : "Node"),
                  tools: info.tools || "" };

    this.birth = { active: !isCenter, t: 0, duration: 42, angle: 0, kick: UI.kick, parent: null };
  }

  _smooth(u){ return u*u*(3-2*u); }
  birthU(){ return this.birth.active ? constrain(this.birth.t/this.birth.duration, 0, 1) : 1; }
  forceScale(){ return this._smooth(this.birthU()); }

  resetForces(){ this.fx=0; this.fy=0; }
  applyForce(fx,fy){ this.fx += fx; this.fy += fy; }

  applyRepulsion(others){
    for (const o of others) {
      if (o === this) continue;
      const dx = this.x - o.x, dy = this.y - o.y;
      const d2 = dx*dx + dy*dy + 0.1;
      let f = UI.repulseGraph / d2;
      const s = Math.min(this.forceScale(), o.forceScale ? o.forceScale() : 1);
      f *= s;
      const inv = 1 / Math.sqrt(d2);
      this.fx += dx * inv * f; this.fy += dy * inv * f;
    }
  }

  _updateBirth(){
    if (!this.birth.active) return;
    this.birth.t++;
    const u = this.birthU();
    const easeOut = (x)=>1 - pow(1 - x, 3);
    this.r = lerp(0, this.baseR, easeOut(u));
    const k = this.birth.kick * (1 - u);
    this.vx += cos(this.birth.angle) * 0.05 * k;
    this.vy += sin(this.birth.angle) * 0.05 * k;
    if (u >= 1) { this.birth.active = false; this.r = this.baseR; }
  }

  updateInGraph(){
    if (this.fixed) return;
    this._updateBirth();
    this.vx += this.fx * 0.01; this.vy += this.fy * 0.01;
    this.vx *= UI.damping; this.vy *= UI.damping;
    this.x += this.vx; this.y += this.vy;
    this.x = constrain(this.x, this.baseR, baseWidth - this.baseR);
    this.y = constrain(this.y, this.baseR, baseHeight - this.baseR);
  }

  display(){
    let fillCol = "#CBD5E1";
    for (const t of this.tags) { if (TAG_COLORS[t]) { fillCol = TAG_COLORS[t]; break; } }
    noStroke(); fill(fillCol); ellipse(this.x, this.y, max(1, this.r * 2));
    fill(40); textAlign(CENTER, TOP);
    textSize(this.isCenter ? UI.fontCenter : UI.fontNode);
    text(this.title, this.x, this.y + this.r + 6);
  }

  isPointInside(wx, wy){ return dist(wx, wy, this.x, this.y) < Math.max(8, this.r); }

  sharesTagWith(other){
    if (!other || !other.tags) return false;
    for (const t of this.tags) if (other.tags.includes(t)) return true;
    return false;
  }
}

// spring link (world)
class GraphLink {
  constructor(a,b){ this.a=a; this.b=b; this.restLength=UI.linkRest; this.strength=0.035; }
  applyAttraction(){
    const dx = this.b.x - this.a.x, dy = this.b.y - this.a.y;
    const d = sqrt(dx*dx + dy*dy) || 1;
    const s = Math.min(this.a.forceScale?.() ?? 1, this.b.forceScale?.() ?? 1);
    const force = (d - this.restLength) * (this.strength * s);
    const fx = (force * dx) / d, fy = (force * dy) / d;
    this.a.applyForce(fx, fy); this.b.applyForce(-fx, -fy);
  }
  display(){
    stroke(220); strokeWeight(1.5);
    if (hoveredNode && (this.a === hoveredNode || this.b === hoveredNode)) stroke(0);
    line(this.a.x, this.a.y, this.b.x, this.b.y);
  }
}
