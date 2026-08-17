// Layout controls
let LAYOUT = 'top'; // 'top' | 'left' | 'bottom'
let sideBarW = 0; // width of the left panel when LAYOUT==='left'




function computeTopBar() {
  if (isMobileViewport()) {
    // MOBILE: keep panel on TOP and make it taller
    LAYOUT = 'top';
    sideBarW = 0;
  
    // Prefer explicit UI.topBarRatio, then UI.mobilePanelRatio, then our default
    const ratio = (UI?.topBarRatio ?? UI?.mobilePanelRatio ?? 0.62); // was 0.32
    const minH  = (UI?.topBarMin  ?? 260);                           // was 200
    const maxH  = (UI?.topBarMax  ?? Math.round(windowHeight * 0.80)); // was 0.6
  
    topBarH = constrain(Math.round(windowHeight * ratio), minH, maxH);
  } else {
    // --- DESKTOP: panel on the LEFT (same as before) ---
    LAYOUT = 'left';
    sideBarW = constrain(round(windowWidth * 0.28), 260, 420);
    topBarH = 0;
  }
}

function __measureHeaderHeight() {
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
  } catch (e) { return 0; }
}

  function computeTransform() {
    let availW, availH;
    if (LAYOUT === 'top') {
    availW = windowWidth;
    availH = Math.max(100, windowHeight - topBarH);
    } else {
    availW = Math.max(100, windowWidth - sideBarW);
    availH = windowHeight;
    }
    
    const sx = availW / baseWidth;
    const sy = availH / baseHeight;
    scaleFactor = Math.min(sx, sy);
    
    const worldW = baseWidth * scaleFactor;
    const worldH = baseHeight * scaleFactor;
    
    worldOffsetX = (LAYOUT === 'left' ? sideBarW : 0) + (availW - worldW) * 0.5;
    worldOffsetY = (LAYOUT === 'top' ? topBarH : 0) + (availH - worldH) * 0.5;
    }

    function screenToWorld(sx, sy) {
      const sc = (typeof scaleFactor === "number" ? scaleFactor : 1);
      const ox = (typeof worldOffsetX === "number" ? worldOffsetX : 0);
      const oy = (typeof worldOffsetY === "number" ? worldOffsetY : 0);
      return { x: (sx - ox) / sc, y: (sy - oy) / sc };
    }


    /* ====== PANEL/HEADER AWARE BOUNDS (SCREEN & WORLD) ====== */

// Optional knobs
const NODE_EDGE_PAD_SCR = (UI?.nodeEdgePad ?? 12);        // screen px padding from edges
const MOBILE_PANEL_RATIO = (UI?.mobilePanelRatio ?? 0.48); // must match ui_topbar.js

// Read the DOM header height (same selectors as ui_topbar)
function __measureHeaderHeight() {
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
  } catch (e) { return 0; }
}

// Compute the blue panel rectangle in SCREEN pixels
function getPanelRectScreen() {
  const W = width, H = height;
  const layout = (typeof LAYOUT === "string" ? LAYOUT : "left");
  if (layout === "left") {
    const w = (typeof sideBarW === "number" ? sideBarW : 0);
    return { x: 0, y: 0, w, h: H };
  }
  if (layout === "top") {
    const h = (typeof topBarH === "number" ? topBarH : 0);
    return { x: 0, y: 0, w: W, h };
  }
  if (layout === "bottom") {
    const h = Math.round(H * MOBILE_PANEL_RATIO);
    return { x: 0, y: H - h, w: W, h };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

// Compute the playable SCREEN rect (where nodes are allowed)
function getPlayableScreenRect() {
  const W = width, H = height;
  const layout = (typeof LAYOUT === "string" ? LAYOUT : "left");
  const panel = getPanelRectScreen();

  // Header height (top overlay). In your ui_topbar, header offset applies for left/top; we can apply it globally.
  const headerH = (typeof window.getHeaderHeight === "function")
    ? window.getHeaderHeight()
    : __measureHeaderHeight();

  if (layout === "left") {
    return { x: panel.w, y: headerH, w: W - panel.w, h: H - headerH };
  }
  if (layout === "top") {
     const topClear = headerH + panel.h;     // header + blue panel
    return { x: 0, y: topClear, w: W, h: H - topClear };
   }
  if (layout === "bottom") {
    const bottomH = panel.h;
    return { x: 0, y: headerH, w: W, h: H - headerH - bottomH };
  }
  // fallback: whole canvas minus header
  return { x: 0, y: headerH, w: W, h: H - headerH };
}

// Convert a SCREEN rect to a WORLD rect with current camera/scale
function screenRectToWorldRect(scr) {
  const sc = (typeof scaleFactor === "number" ? scaleFactor : 1);
  const ox = (typeof worldOffsetX === "number" ? worldOffsetX : 0);
  const oy = (typeof worldOffsetY === "number" ? worldOffsetY : 0);
  return {
    x: (scr.x - ox) / sc,
    y: (scr.y - oy) / sc,
    w: scr.w / sc,
    h: scr.h / sc
  };
}

// Get playable WORLD rect (for clamping node positions)
function getPlayableWorldRect() {
  const pad = NODE_EDGE_PAD_SCR;
  const playScr = getPlayableScreenRect();
  const padded = { x: playScr.x + pad, y: playScr.y + pad, w: Math.max(0, playScr.w - 2*pad), h: Math.max(0, playScr.h - 2*pad) };
  return screenRectToWorldRect(padded);
}

// Clamp a node to the playable rect (WORLD coords)
function clampNodeToPlayableRect(n) {
  if (!n) return;
  const R = getPlayableWorldRect();
  // If your nodes have a radius in *world*, keep them inside by radius:
  const r = (n.baseR || n.r || UI?.rNode || 16);
  const minX = R.x + r, maxX = R.x + R.w - r;
  const minY = R.y + r+10, maxY = R.y + R.h - r-10;

  const nx = Math.max(minX, Math.min(maxX, n.x));
  const ny = Math.max(minY, Math.min(maxY, n.y));

  if (nx !== n.x) { n.x = nx; n.vx = 0; }
  if (ny !== n.y) { n.y = ny; n.vy = 0; }
}

// Clamp an arbitrary WORLD point to the playable rect (useful in drag)
function clampPointWorld(xw, yw, rWorld = 0) {
  const R = getPlayableWorldRect();
  const minX = R.x + rWorld, maxX = R.x + R.w - rWorld;
  const minY = R.y + rWorld, maxY = R.y + R.h - rWorld;
  return { x: Math.max(minX, Math.min(maxX, xw)), y: Math.max(minY, Math.min(maxY, yw)) };
}


// --- deep link helpers ---

// --- deep link helpers ---

// Build a URL that opens the app focused on a specific node title
function buildNodeUrl(nodeTitle) {
  if (!nodeTitle) return window.location.href;

  const url = new URL(window.location.href);

  // Make sure we're pointing at nodes.html
  // (optional, but keeps links clean if you use Swup/navigation)
  url.pathname = url.pathname.replace(/[^/]+$/, 'nodes.html');

  // Let URLSearchParams do the encoding
  url.searchParams.set('node', nodeTitle);

  // Clear any hash fragment; everything we need is in ?node=
  url.hash = '';

  return url.toString();
}

// Copy link for the currently relevant node
function copyLinkForNode(node) {
  if (!node || !node.title) return;

  const url = buildNodeUrl(node.title);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => {
        console.log('Copied node link:', url);
      })
      .catch(err => {
        console.warn('Clipboard API failed, falling back:', err);
        fallbackCopyText(url);
      });
  } else {
    fallbackCopyText(url);
  }
}

// Fallback for older browsers
function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    console.log('Copied node link (fallback):', text);
  } catch (e) {
    console.error('Failed to copy link:', e);
  }
  document.body.removeChild(ta);
}