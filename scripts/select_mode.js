

function setupSelectUI() {
  worldOffsetX = 0;
  worldOffsetY = 0;
  scaleFactor  = 1;


  // WORLD coords — center the 0/3 circle
  playCircle = {
    x: windowWidth * 0.5,
    y: windowHeight * 0.5,
    r: UI.playRadius || 120 
  };
  selected = [];

  // spawn floating tags (slight overlap so they start moving)
  tagNodes = [];
  // const cols = Math.ceil(Math.sqrt(TAGS.length));
  const margin = 80;
  let i = 0;
  for (const t of ([])) {
    const cx = margin + (i % cols) * ((baseWidth - margin*2) / (cols - 1 || 1));
    const cy = margin + Math.floor(i / cols) * 70;
    // jitter so some initial repulsion kicks in
    const x = constrain(cx + random(-28, 28), UI.rTag, baseWidth - UI.rTag);
    const y = constrain(cy + random(-28, 28), UI.rTag, baseHeight - UI.rTag);
    tagNodes.push(new TagNode(t.label, x, y, t.tags));
    i++;
  }
  selected = [];
}

function spawnFloatingTags() {
  selected = [];

  const wr = selectPlayableWorldRect(12);
  const bounds = { minX: wr.left, maxX: wr.right, minY: wr.top, maxY: wr.bottom };
  const newTags = window.TAGS || [];
  const existing = Array.isArray(tagNodes) && tagNodes.length > 0 ? tagNodes : null;

  if (existing) {
    // Nodes are already floating — relabel them in-place so there's no flash.
    // Reuse each live node for a new tag (keeping position & velocity).
    for (let i = 0; i < Math.min(existing.length, newTags.length); i++) {
      existing[i].label = newTags[i].label;
      existing[i].tags  = Array.isArray(newTags[i].tags) ? newTags[i].tags.slice() : [newTags[i].label];
    }
    // Add extra nodes if new set is larger
    for (let i = existing.length; i < newTags.length; i++) {
      const n = new TagBubble(newTags[i].label, newTags[i].tags);
      placeNodeNoOverlap(n, existing, bounds, 250, 6);
      clampTagToRect(n, wr);
      existing.push(n);
    }
    // Trim if new set is smaller
    tagNodes = existing.slice(0, newTags.length);
  } else {
    // First spawn — place nodes fresh with a small random drift
    tagNodes = [];
    for (const t of newTags) {
      const n = new TagBubble(t.label, t.tags);
      placeNodeNoOverlap(n, tagNodes, bounds, 250, 6);
      clampTagToRect(n, wr);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 0.6;
      n.vx = Math.cos(angle) * speed;
      n.vy = Math.sin(angle) * speed;
      tagNodes.push(n);
    }
  }
}

function __measureHeader() {
  try {
    const sels = ['header', '.header', '#header', '.site-header', '.topbar', '.navbar', '.app-header', '.nav'];
    let h = 0;
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) {
        const r = el.getBoundingClientRect();
        h = Math.max(h, (r && (r.height || (r.bottom - r.top))) || 0);
      }
    }
    return h;
  } catch { return 0; }
}


function selectScreenBoundsRect() {
  const sW = width;
  const sH = height;

  // Measure any header that exists and give us a clean 10px breathing room
  const headerH = __measureHeader();
  const padX    = (UI?.zonePadX ?? 10);                   // 10px left/right
  const padTop  = Math.max(headerH + 10, UI?.zonePadY ?? 10); // header + 10px (or at least 10px)
  const baseBot = (LAYOUT === 'bottom')
    ? (UI?.zoneBottomMobile  ?? 1)
    : (UI?.zoneBottomDesktop ?? 1);

  // Ensure we never go below 10px bottom margin
  const padBot  = Math.max(1, Math.min(baseBot, Math.round(sH * 0.1)));

  const x = padX;
  const y = padTop;
  const w = Math.max(0, sW - padX * 2);
  const h = Math.max(0, sH - padTop - padBot);
  return { x, y, w, h };
}



function selectPlayableWorldRect(extraMargin = 5) {
  const r  = selectScreenBoundsRect();
  const tl = screenToWorld(r.x + extraMargin,       r.y + extraMargin);
  const br = screenToWorld(r.x + r.w - extraMargin, r.y + r.h - extraMargin);
  return { left: tl.x, top: tl.y, right: br.x, bottom: br.y };
}



function clampTagToRect(n, rect) {
  if (!n || !rect) return;
  const rr = (n.r || UI?.rTag || 1) + 4;
  n.x = Math.max(rect.left  + rr, Math.min(rect.right  - rr, n.x));
  n.y = Math.max(rect.top   + rr, Math.min(rect.bottom - rr, n.y));
}

function drawSelectScreen(){
  const msg = "Combine 3 tags and start exploring";

  // --- layout for mobile vs desktop
  const padX = 28;
  const isMobile = (typeof LAYOUT !== "undefined" && LAYOUT === "bottom");
  const headerH = (typeof getHeaderHeight === "function") ? getHeaderHeight() : 0;
  const startY  = isMobile ? (headerH + 90) : 98;      // push below HTML header on mobile
  const maxW    = width - padX * 2;                    // wrapping width

  // --- Headline (wrap-aware)
  push();
  textFont(acuminRegular);
  textAlign(LEFT, TOP);
  fill(COLORS.blue);

  const fs = isMobile ? Math.max(22, Math.round(width * 0.06)) : 28; // responsive-ish
  textSize(fs);
  textLeading(Math.round(fs * 1.15));
  if (typeof textWrap === "function") textWrap(WORD);

  // draw WITH a bounding width so it WRAPS
  text(msg, padX, startY, maxW);
  pop();

  // --- Measure to place pills just under the wrapped title
  const titleM = measureWrappedHeight(msg, maxW, fs, 1.15);

  // --- Selected tag pills under headline
  textFont(acuminLight);
  drawPickedTagPills(padX, startY + titleM.height + 12);
  const rect = selectPlayableWorldRect(12);

  for (const n of tagNodes) n.resetForces();
  for (const n of tagNodes) n.applyRepulsion(tagNodes);
  for (const n of tagNodes) {
    n.update();
    clampTagToRect(n, rect);
  }
  for (const n of tagNodes) n.display();

  // 0/3 circle (drop target)
  drawPlayCircle();

  // "PRESS PLAY" text (store bbox so clicks work)
  const label = " ";
  textSize(14);
  const tw = textWidth(label);
  const tx = playCircle.x - tw / 2;
  const ty = playCircle.y + playCircle.r + 32;
  playTextBox = { x: tx, y: ty, w: tw, h: 18 };

  push();
  fill(COLORS.blue);
  textAlign(LEFT, TOP);
  text(label, tx, ty);
  pop();
}

function drawPickedTagPills(x0, y0){
  let x = x0, y = y0;
  const padX = 10, h = 26, gap = 8;
  textSize(13); textAlign(LEFT, CENTER);
  for (const s of selected) {
    const label = s.label.toUpperCase();
    const w = textWidth(label) + padX * 2;
    noStroke(); fill(237, 245, 255);
    rect(x, y, w, h, 14);
    fill(COLORS.blue);
    textFont(acuminLight);
    text(label, x + padX, y + h / 2 - 1);
    x += w + gap;
    if (x > baseWidth - 200) { x = x0; y += h + 10; }
  }
}

// Add exactly one tag from a TagNode; returns true if it was added
function addSelectedTagByNode(n) {
  if (!n) return false;
  textFont(acuminLight);
  const label = n.label;
  const tagsArr = Array.isArray(n.tags) ? n.tags.slice()
                : (typeof n.tag === "string" && n.tag ? [n.tag] : [label]);

  const maxSel = UI?.maxSelected ?? 3;
  if (selected.some(s => s.label === label)) return false;
  if (selected.length >= maxSel) return false;

  selected.push({ label, tags: tagsArr });

  // trigger a little "bump" animation on the circle
  playCircle.bump = 1.0;
  return true;
}

function canPlay() { return (selected?.length ?? 0) === (UI?.maxSelected ?? 3); }

// Draw the central play circle; grows with #selected and "bumps" when a tag is added
function drawPlayCircle() {
  const a      = entryCircleAlpha ?? 255;
  const baseR  = UI?.playRadius ?? 120;
  const grow   = UI?.playGrowth ?? 24;
  const maxSel = UI?.maxSelected ?? 3;

  if (typeof playCircle.r !== "number") playCircle.r = baseR;
  if (typeof playCircle.bump !== "number") playCircle.bump = 0;
  

  const targetR = baseR + grow * Math.min(selected.length, maxSel);
  playCircle.r += (targetR - playCircle.r) * 0.2;
  playCircle.bump *= 0.85; // decay pulse

  const pulse = 1 + 0.08 * playCircle.bump;
  const ready = canPlay();

  push();
  translate(playCircle.x, playCircle.y);
  scale(pulse);
  noStroke();
  fillWithAlpha(ready ? COLORS.blue : [200,210,224], a);
  circle(0, 0, playCircle.r * 2);

  fill(ready ? 255 : 80, ready ? 255 : 120);
  textAlign(CENTER, CENTER);
  textSize(32);
  text(`${selected.length}/${maxSel}`, 0, -3);
  pop();
}




// Effective (visual) radius of the play circle, including the pulse bump
function effectivePlayRadius() {
  const r = (playCircle && typeof playCircle.r === "number") ? playCircle.r : (UI?.playRadius ?? 120);
  const bump = (playCircle && typeof playCircle.bump === "number") ? playCircle.bump : 0;
  // same 8% pulse used in drawPlayCircle()
  return r * (1 + 0.08 * bump);
}

// Drop-hit for tags: use the same effective radius the user sees
function inDrop(wx, wy) {
  const R = effectivePlayRadius();
  return dist(wx, wy, playCircle.x, playCircle.y) <= R;
}


// ---- color helpers (p5-safe) ----
function _toRGB(col) {
  // returns [r,g,b]
  if (Array.isArray(col) && col.length >= 3) return [col[0], col[1], col[2]];
  try {
    const c = color(col); // p5 color()
    return [red(c), green(c), blue(c)];
  } catch (e) {
    return [26, 64, 156]; // fallback blue
  }
}
function fillWithAlpha(col, a) {
  const [r, g, b] = _toRGB(col);
  fill(r, g, b, a);
}
function strokeWithAlpha(col, a) {
  const [r, g, b] = _toRGB(col);
  stroke(r, g, b, a);
}

function canPlay() {
  return (Array.isArray(selected) ? selected.length : 0) === (UI.maxSelected || 3);
}


// CREATING RAIL TAGS LSI AT THE RIGHT SIDE
window.renderTagsRail = function renderTagsRail(limit = 20){
  const rail = document.getElementById('tagsRail');
  if (!rail) return;

  const tags = (window.ALL_TAGS || []);
  rail.innerHTML = '';

  // You can limit how many to show or keep them all
  const list = tags.slice(0, limit);
  for (const t of list) {
    const btn = document.createElement('button');
    btn.className = 'rail-tag';
    btn.textContent = t.label;
    btn.title = `${t.label} (${t.count})`;
    btn.addEventListener('click', () => launchTagCluster(t.key));
    rail.appendChild(btn);
  }
};

// Measure header height (handles common class/id names)
function measureHeaderHeight() {
  try {
    const sels = ['header', '.header', '#header', '.site-header', '.topbar', '.navbar', '.app-header', '.nav'];
    let h = 0;
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) {
        const r = el.getBoundingClientRect();
        h = Math.max(h, (r && (r.height || (r.bottom - r.top))) || 0);
      }
    }
    return h;
  } catch (_) { return 0; }
}

// Apply header height to CSS var so the rail sits below it
function applyHeaderOffset() {
  const h = (typeof window.getHeaderHeight === 'function') ? window.getHeaderHeight()
        : measureHeaderHeight();
  document.documentElement.style.setProperty('--headerH', `${Math.round(h)}px`);
}

// Call on load & resize
applyHeaderOffset();
window.addEventListener('resize', applyHeaderOffset);

// If your layout mode changes (top/left/bottom), call applyHeaderOffset() again.