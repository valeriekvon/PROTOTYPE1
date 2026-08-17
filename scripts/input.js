/***** INPUT.JS — consolidated interactions *****/

/* ---- world/screen mapping (must invert your draw() translate/scale) ---- */
function screenToWorld(sx, sy) {
  const sc = (typeof scaleFactor === "number" ? scaleFactor : 1);
  const ox = (typeof worldOffsetX === "number" ? worldOffsetX : 0);
  const oy = (typeof worldOffsetY === "number" ? worldOffsetY : 0);
  return { x: (sx - ox) / sc, y: (sy - oy) / sc };
}

/* ---- touch debug ---- */
const DEBUG_TOUCH = true;                    // flip to false to silence logs
function dbgTouch(...args) { if (DEBUG_TOUCH) console.log("[TOUCH]", ...args); }


/* ---- UI passthrough helpers ---- */
function uiWantsThisTouch(ev) {
  const t = ev && (ev.target || ev.srcElement);
  if (!t) return false;
  return !!t.closest('#mobileOverlay, #mobileTrigger, .mobile-close, .button-header, .header, a, button');
}
function overlayIsOpen() {
  const ov = document.getElementById('mobileOverlay');
  return ov && ov.classList.contains('open');
}

/* ---- panel hit (screen coords) ---- */
function isInPanelScreen(px, py) {
  if (mode !== "graph" || !showBluePanel) return false;
  const layout = (typeof LAYOUT === "string" ? LAYOUT : "side");
  if (layout === "top") {
    const headerH = (typeof window.getHeaderHeight === "function")
         ? window.getHeaderHeight()
         : 0;
       const h = headerH + (typeof topBarH === "number" ? topBarH : 0);
       return py <= h;  
  } else {
    const w = (typeof sideBarW === "number" ? sideBarW : 0);
    return px <= w;
  }
}

/* ---- select-mode circle helpers ---- */
function effectivePlayRadius() { // pulse-aware radius (matches what you see)
  const r = (playCircle && typeof playCircle.r === "number") ? playCircle.r : (UI?.playRadius ?? 120);
  const bump = (playCircle && typeof playCircle.bump === "number") ? playCircle.bump : 0;
  return r * (1 + 0.08 * bump);
}
function inDrop(wx, wy) {
  const R = effectivePlayRadius();
  return dist(wx, wy, playCircle.x, playCircle.y) <= R;
}
function isOnPlayButton(sx, sy) { // circle OR "PRESS PLAY" text
  const w = screenToWorld(sx, sy);
  const inCircle = dist(w.x, w.y, playCircle.x, playCircle.y) <= effectivePlayRadius();
  let inText = false;
  if (playTextBox) {
    inText = (w.x >= playTextBox.x && w.x <= playTextBox.x + playTextBox.w &&
              w.y >= playTextBox.y && w.y <= playTextBox.y + playTextBox.h);
  }
  return inCircle || inText;
}

/* ---- touch hit helpers ---- */
// Tunables (can also come from UI if you want)
const TOUCH_MIN_HIT = (UI?.touchMinHit ?? 44); // screen px (Apple HIG target)
const TOUCH_HIT_MUL = (UI?.touchHitMul ?? 1.8); // scales node radius -> touch target

// Returns a *screen-pixel* radius (caller converts to world when needed)
function touchHitRadius(n) {
  const sc = (typeof scaleFactor === "number" ? scaleFactor : 1);
  const baseWorld  = (n?.baseR ?? n?.r ?? UI?.rNode ?? 16);
  const baseScreen = baseWorld * sc * TOUCH_HIT_MUL;
  return Math.max(TOUCH_MIN_HIT, baseScreen);
}


/* ---- picking ---- */
function pickTagNodeAt(xw, yw) {
  if (!Array.isArray(tagNodes)) return null;
  let best = null, bestD = Infinity;
  for (const n of tagNodes) {
    const d = dist(xw, yw, n.x, n.y);
    const r = pointer.isTouch ? touchHitRadius(n) / (scaleFactor || 1) : (n.r || 16);
    if (d <= r && d < bestD) { best = n; bestD = d; }
  }
  return best;


}

function pickGraphNodeAt(xw, yw) {
  if (!Array.isArray(nodes)) return null;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n) continue;

    if (typeof n.isPointInside === "function") {
      if (n.isPointInside(xw, yw)) return n;
    } else {
      const baseRWorld = (n.baseR || n.r || UI?.rNode || 16);
      const hitWorld = pointer.isTouch
        ? Math.max(baseRWorld, touchHitRadius(n) / (scaleFactor || 1)) // expand on touch
        : baseRWorld;
      const dx = xw - n.x, dy = yw - n.y;
      if (dx * dx + dy * dy <= hitWorld * hitWorld) return n;
    }
  }
  return null;
}


/* ---- select-mode add + gate ---- */
// Helper: resolve the data tags for a given UI label via TAGS[]
function tagsForLabel(label) {
  const t = TAGS.find(x => x.label === label);
  return Array.isArray(t?.tags) ? t.tags.slice() : [label]; // fallback is label if missing
}

function addSelectedTagByNode(n) {
  if (!n) return false;
  const label = n.label;

  // 🚀 Always map UI label to data tags via TAGS (don’t trust n.tags)
  const tagsArr = tagsForLabel(label);

  const maxSel = UI?.maxSelected ?? 3;
  if (selected.some(s => s.label === label)) return false;
  if (selected.length >= maxSel) return false;

  selected.push({ label, tags: tagsArr });

  // bump animation
  playCircle.bump = 1.0;
  return true;
}

function canPlay() { return (selected?.length ?? 0) === (UI?.maxSelected ?? 3); }

/* ---- shared state ---- */
const DRAG_SLOP = 8;
let draggingNode = null;


/* ================= Mouse ================= */
function mouseMoved() {
  pointer.x = mouseX; pointer.y = mouseY;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (mode === "graph" && !pointer.down && !isInPanelScreen(pointer.x, pointer.y)) {
    const hover = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    if (hover && hover !== activeNode) {
      activeNode = hover;
      if (typeof hoverNode !== "undefined") hoverNode = hover; // if your UI uses this
    }
  }
}

function mousePressed() {
  pointer.isTouch = false;
  pointer.x = mouseX; pointer.y = mouseY;
  pointer.down = true;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  pointer.startX = pointer.x; pointer.startY = pointer.y;
  pointer.dragging = false; pointer.tapCandidate = true;

  if (mode === "select") {
    draggingTag = pickTagNodeAt(pointer.worldX, pointer.worldY);
    if (draggingTag) {
      pointer.dragging = true;
      draggingTag.dragging = true;
      draggingTag.dx = pointer.worldX - draggingTag.x;
      draggingTag.dy = pointer.worldY - draggingTag.y;
    }
    return;
  }

  if (mode === "graph") {
    if (isInPanelScreen(pointer.x, pointer.y)) return;
    draggingNode = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    if (draggingNode) {
      // bring to front while dragging
      const idx = nodes.indexOf(draggingNode);
      if (idx >= 0) { nodes.splice(idx, 1); nodes.push(draggingNode); }
      draggingNode.fixed = true;
      draggingNode.offsetX = pointer.worldX - draggingNode.x;
      draggingNode.offsetY = pointer.worldY - draggingNode.y;
      activeNode = draggingNode;
      if (typeof hoverNode !== "undefined") hoverNode = draggingNode;
    }
  }
}

function mouseDragged() {
  pointer.x = mouseX; pointer.y = mouseY;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (!pointer.dragging) {
    const dx = pointer.x - pointer.startX, dy = pointer.y - pointer.startY;
    if (dx*dx + dy*dy > DRAG_SLOP*DRAG_SLOP) pointer.dragging = true;
  }

  if (mode === "select" && draggingTag) {
    draggingTag.x = pointer.worldX - draggingTag.dx;
    draggingTag.y = pointer.worldY - draggingTag.dy;
    draggingTag.vx = 0; draggingTag.vy = 0;
    clampTagToRect(draggingTag, selectPlayableWorldRect(12)); 
    return;
  }
  if (mode === "graph" && draggingNode && pointer.dragging) {
    let nx = pointer.worldX - draggingNode.offsetX;
    let ny = pointer.worldY - draggingNode.offsetY;
    const rWorld = (draggingNode.baseR || draggingNode.r || UI?.rNode || 16);
    const p = clampPointWorld(nx, ny, rWorld);     // ✅ keep inside viewport
    draggingNode.x = p.x; draggingNode.y = p.y;
    draggingNode.vx = 0; draggingNode.vy = 0;
    
  }
  
}

// --- delayed launch helpers ---
let launchTimeoutId = null;

function scheduleGraphLaunch(delayMs = 4000) {
  if (launchTimeoutId) clearTimeout(launchTimeoutId);
  entryCircleFading = true;
  showBluePanel = true;
  launchTimeoutId = setTimeout(() => {
    launchTimeoutId = null;
    launchGraphFromSelection();
  }, delayMs);
}

function cancelScheduledLaunch() {
  if (launchTimeoutId) {
    clearTimeout(launchTimeoutId);
    launchTimeoutId = null;
  }
}





function mouseReleased() {
  pointer.x = mouseX; pointer.y = mouseY;
  pointer.down = false; pointer.justReleased = true;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  // ----- SELECT mode -----
  if (mode === "select") {
    let added = false;
  
    if (draggingTag) {
      const t = draggingTag; draggingTag = null; t.dragging = false;
      if (inDrop(pointer.worldX, pointer.worldY)) {
        added = addSelectedTagByNode(t);
     
        if (added) {
          const idx = tagNodes.indexOf(t);
          if (idx !== -1) tagNodes.splice(idx, 1);
        }
      }
    }
  
    if (added && canPlay()) { // auto-launch on 3rd drop
      scheduleGraphLaunch(3000); 
      return;
    }

    if (isOnPlayButton(pointer.x, pointer.y) && canPlay()) {
      entryCircleFading = true; showBluePanel = true; launchGraphFromSelection();
    }
    return;
  }

  // ----- GRAPH mode -----
  if (mode === "graph") {
    if (draggingNode) {
      if (!pointer.dragging) {
        if (typeof refocusToByTags === "function") refocusToByTags(draggingNode);
        else if (typeof refocusTo === "function")  refocusTo(draggingNode);
        if (typeof centerCameraOnNode === "function") centerCameraOnNode(centerNode);
      }
      draggingNode.fixed = false;
      draggingNode = null;
      return;
    }
// click on blue panel → maybe the LINK row?
if (typeof isInPanelScreen === "function" &&
  isInPanelScreen(pointer.x, pointer.y) &&
  typeof openMetaLinkIfHit === "function") {
if (openMetaLinkIfHit(pointer.x, pointer.y)) {
  return; // handled (open link), don't treat as graph click
}
}
    if (!isInPanelScreen(pointer.x, pointer.y)) {
      const tapped = pickGraphNodeAt(pointer.worldX, pointer.worldY);
      if (tapped) {
        // 1) Refocus (prefer the tags-aware version, fallback to plain refocus)
        if (typeof refocusToByTags === "function") {
          refocusToByTags(tapped);
        } else if (typeof refocusTo === "function") {
          refocusTo(tapped);
        }
    
        // 2) Make the focused node active (prefer the newly computed centerNode)
        activeNode = (typeof centerNode !== "undefined" && centerNode) ? centerNode : tapped;
    
        // 3) Center camera on whatever we marked active
        if (typeof centerCameraOnNode === "function") {
          centerCameraOnNode(activeNode);
        }
      }
    }
  }
}

/* ================= Touch ================= */
function touchStarted(ev) {
  if (overlayIsOpen() || uiWantsThisTouch(ev)) return true;

  pointer.isTouch = true;
  if (!touches || touches.length === 0 || pointer.id !== null) return true;

  const t = touches[0];
  pointer.id = t.id;
  pointer.x = t.x; pointer.y = t.y;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  if (isInPanelScreen(pointer.x, pointer.y)) {
    draggingTag = null; draggingNode = null;
  } else if (mode === "select") {
    draggingTag = pickTagNodeAt(pointer.worldX, pointer.worldY);
    if (draggingTag) {
      pointer.dragging = true;
      draggingTag.dragging = true;
      draggingTag.dx = pointer.worldX - draggingTag.x;
      draggingTag.dy = pointer.worldY - draggingTag.y;
    }
  } else {
    draggingNode = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    if (draggingNode) {
      draggingNode.fixed = true;
      draggingNode.offsetX = pointer.worldX - draggingNode.x;
      draggingNode.offsetY = pointer.worldY - draggingNode.y;
      activeNode = draggingNode;
      if (typeof hoverNode !== "undefined") hoverNode = draggingNode;
    }
    dbgTouch("started", {
      x: pointer.x, y: pointer.y,
      worldX: pointer.worldX, worldY: pointer.worldY,
      inPanel: (typeof isInPanelScreen === "function" ? isInPanelScreen(pointer.x, pointer.y) : false),
      mode
    });
  }

  pointer.down = true;
  pointer.startX = pointer.x; pointer.startY = pointer.y;
  pointer.tapCandidate = true;
  pointer.dragging = false;   
  return false; // prevent scroll on canvas


  
}

function touchMoved(ev) {
  if (overlayIsOpen() || uiWantsThisTouch(ev)) return true;
  if (pointer.id === null) return true;
  if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();

  let t = null;
  for (const tt of touches) if (tt.id === pointer.id) { t = tt; break; }
  if (!t) return true;

  pointer.x = t.x; pointer.y = t.y;
  const w = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = w.x; pointer.worldY = w.y;

  //  promote to "dragging" only after moving past slop
  if (!pointer.dragging) {
    const dx = pointer.x - pointer.startX, dy = pointer.y - pointer.startY;
    if (dx*dx + dy*dy > DRAG_SLOP*DRAG_SLOP) pointer.dragging = true;
  }

  if (mode === "select" && draggingTag) {
    draggingTag.x = pointer.worldX - draggingTag.dx;
    draggingTag.y = pointer.worldY - draggingTag.dy;
    draggingTag.vx = 0; draggingTag.vy = 0;
    clampTagToRect(draggingTag, selectPlayableWorldRect(12)); 
  } else if (mode === "graph" && draggingNode) {
    if (pointer.dragging) {
      let nx = pointer.worldX - draggingNode.offsetX;
      let ny = pointer.worldY - draggingNode.offsetY;
      const rWorld = (draggingNode.baseR || draggingNode.r || UI?.rNode || 16);
      const p = clampPointWorld(nx, ny, rWorld);  
      draggingNode.x = p.x; draggingNode.y = p.y;
      draggingNode.vx = 0; draggingNode.vy = 0;
    }
  }
  

  dbgTouch?.("moved", { draggingNode: !!draggingNode, draggingTag: !!draggingTag, x: pointer.x, y: pointer.y }); // optional
  return false;
}



/* ---- touch double-tap on the SAME node (mobile only) ---- */
/* ---- double-tap on the SAME node (mobile only) ---- */
const TOUCH_DOUBLE_MS   = UI?.doubleTapWindow ?? 360; // ms
const TOUCH_DOUBLE_SLOP = UI?.doubleTapSlop  ?? 22;   // px

let __lastTap = { title: null, t: 0, x: 0, y: 0 };

function isDoubleTapOnSameNode(tappedNode) {
  const now  = Date.now(); // use Date.now() everywhere for consistency
  const name = tappedNode ? (tappedNode.title || tappedNode.label) : null;

  const dt   = now - __lastTap.t;
  const dx   = (pointer.x ?? 0) - __lastTap.x;
  const dy   = (pointer.y ?? 0) - __lastTap.y;
  const dist2 = dx*dx + dy*dy;

  const sameTitle = (__lastTap.title === name);
  const timeOk    = (dt <= TOUCH_DOUBLE_MS);
  const distOk    = (dist2 <= TOUCH_DOUBLE_SLOP * TOUCH_DOUBLE_SLOP);
  const dbl       = !!(sameTitle && timeOk && distOk);

  dbgTouch("tap", {
    node: name,
    dt,
    dpx: Math.round(dx), dpy: Math.round(dy),
    timeOk, distOk, sameTitle, dbl
  });

  // update memory for NEXT tap
  __lastTap.t     = now;
  __lastTap.x     = (pointer.x ?? 0);
  __lastTap.y     = (pointer.y ?? 0);
  __lastTap.title = name;

  return dbl;
}




function touchEnded(ev) {
  
    dbgTouch?.("touchEnded fired");
 
  
  
  if (overlayIsOpen() || uiWantsThisTouch(ev)) { finishPointerGesture(); return true; }

  if (pointer.x != null && pointer.y != null) {
    const w = screenToWorld(pointer.x, pointer.y);
    pointer.worldX = w.x; pointer.worldY = w.y;
  }

  if (mode === "select") {
    let added = false;
    if (draggingTag) {
      const t = draggingTag; draggingTag = null; t.dragging = false;
      if (inDrop(pointer.worldX, pointer.worldY)) {
        added = addSelectedTagByNode(t);

        if (added) {
          const idx = tagNodes.indexOf(t);
          if (idx !== -1) tagNodes.splice(idx, 1);
        }
      }
    }
  
    if (added && canPlay()) {
      scheduleGraphLaunch(3000); 
      finishPointerGesture(); return false;
    }

    if (pointer.tapCandidate && isOnPlayButton(pointer.x, pointer.y) && canPlay()) {
      entryCircleFading = true; showBluePanel = true; launchGraphFromSelection();
      finishPointerGesture(); return false;
    }

    finishPointerGesture(); return false;
  }

  if (mode === "graph") {
    // ignore taps that land on the blue panel
    if (typeof isInPanelScreen === "function" && isInPanelScreen(pointer.x, pointer.y)) {
      dbgTouch?.("ended → ignored (tap on panel)");
      finishPointerGesture();
      return false;
    }
  
    // Make sure world coords match the last finger position
    if (pointer.x != null && pointer.y != null) {
      const w = screenToWorld(pointer.x, pointer.y);
      pointer.worldX = w.x; pointer.worldY = w.y;
    }
  
    // Case A: we started on a node (draggingNode set in touchStarted)
    if (draggingNode) {
      if (!pointer.dragging) {
        // ✅ treat as a TAP on that node (not a drag)
        const tapped = draggingNode;
        dbgTouch?.("ended (tap on node)", tapped.title || tapped.label);
  
        if (isDoubleTapOnSameNode(tapped)) {
          dbgTouch?.("DOUBLE → refocus", tapped.title || tapped.label);
          if (typeof refocusToByTags === "function") refocusToByTags(tapped);
          else if (typeof refocusTo === "function")  refocusTo(tapped);
          activeNode = (typeof centerNode !== "undefined" && centerNode) ? centerNode : tapped;
          if (typeof centerCameraOnNode === "function") centerCameraOnNode(activeNode);
          __lastTap.title = null; // prevent triple chaining
        } else {
          dbgTouch?.("SINGLE → highlight only", tapped.title || tapped.label);
          activeNode = tapped;
          if (typeof hoverNode !== "undefined") hoverNode = tapped;
        }
      } else {
        // real drag finished
        dbgTouch?.("ended drag");
      }
  
      draggingNode.fixed = false;
      draggingNode = null;
      finishPointerGesture();
      return false;
    }
  
    // Case B: we didn’t start on a node (maybe tapped one later)
    const tapped = pickGraphNodeAt(pointer.worldX, pointer.worldY);
    dbgTouch?.("ended", { tapped: tapped ? (tapped.title || tapped.label) : null });
    if (tapped) {
      if (isDoubleTapOnSameNode(tapped)) {
        dbgTouch?.("DOUBLE → refocus", tapped.title || tapped.label);
        if (typeof refocusToByTags === "function") refocusToByTags(tapped);
        else if (typeof refocusTo === "function")  refocusTo(tapped);
        activeNode = (typeof centerNode !== "undefined" && centerNode) ? centerNode : tapped;
        if (typeof centerCameraOnNode === "function") centerCameraOnNode(activeNode);
        __lastTap.title = null;
      } else {
        dbgTouch?.("SINGLE → highlight only", tapped.title || tapped.label);
        activeNode = tapped;
        if (typeof hoverNode !== "undefined") hoverNode = tapped;
      }
    }
  
    finishPointerGesture();
    return false;
  }
  
 
  
}

/* ---- finish gesture ---- */
function finishPointerGesture() {
  pointer.down = false;
  pointer.dragging = false;
  pointer.id = null;
  pointer.dragNode = null;
}

/* ---- panel scroll (wheel + touch) ---- */
(function () {
  // Wheel scroll on desktop
  document.addEventListener('wheel', function (e) {
    if (typeof mode === 'undefined' || mode !== 'graph') return;
    if (!isInPanelScreen(e.clientX, e.clientY)) return;
    e.preventDefault();
    panelScrollY = Math.max(0, Math.min(panelScrollMax, panelScrollY + e.deltaY));
  }, { passive: false });

  // Touch scroll on mobile
  let _touchStartY = null;
  document.addEventListener('touchstart', function (e) {
    if (typeof mode === 'undefined' || mode !== 'graph') return;
    const t = e.touches[0];
    if (!isInPanelScreen(t.clientX, t.clientY)) return;
    _touchStartY = t.clientY;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (_touchStartY === null) return;
    const t = e.touches[0];
    if (!isInPanelScreen(t.clientX, t.clientY)) { _touchStartY = null; return; }
    const dy = _touchStartY - t.clientY;
    _touchStartY = t.clientY;
    panelScrollY = Math.max(0, Math.min(panelScrollMax, panelScrollY + dy));
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', function () { _touchStartY = null; }, { passive: true });
})();
