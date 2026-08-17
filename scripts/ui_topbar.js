

// --- image cache so sheet URLs become p5.Image objects ---
const IMAGE_CACHE = new Map(); // url -> {img, status:'loading'|'ready'|'error'}

// 'horizontal' -> ~3:2, 'vertical' -> ~4:5 (portrait-ish)
const IMAGE_FRAME_MODE  = (window.UI?.imageFrameMode || 'horizontal'); // 'horizontal' | 'vertical'
const IMAGE_RATIO_H     = 2 / 3;  // h/w for ~3:2 (your current)
const IMAGE_RATIO_V     = 5 / 4;  // h/w for ~4:5 (taller)

function pickImageH(w) {
  const r = (IMAGE_FRAME_MODE === 'vertical') ? IMAGE_RATIO_V : IMAGE_RATIO_H;
  return Math.round(w * r);
}

function normalizeImgSrc(src) {
  if (!src) return "";
  let s = String(src).trim();

  // If it's an absolute URL, just return it.
  if (/^https?:\/\//i.test(s)) return s;

  // Keep rooted and dot-relative paths as-is (/, ./, ../)
  if (s.startsWith("/") || s.startsWith("./") || s.startsWith("../")) {
    // Clean up a leading "/." (rare typo)
    s = s.replace(/^\/\./, "/");
    return s;
  }

  // If it's a bare filename or "images/..." add our images/ prefix once
  // e.g. "foo.png" -> "images/foo.png"
  //      "images/foo.png" -> "images/foo.png" (idempotent)
  s = s.replace(/^\.?\/*/, "");            // strip any accidental leading ./ or /
  if (!/^images\//i.test(s)) s = `images/${s}`;

  // final tidy: collapse any accidental double slashes (except protocol)
  s = s.replace(/([^:]\/)\/+/g, "$1");

  return s;
}


// Kick off requestImage() for every image URL in the project list so images
// are in-flight before the user navigates to a node.  Safe to call multiple
// times — IMAGE_CACHE deduplicates by URL.
function preloadAllImages(projects) {
  if (!Array.isArray(projects)) return;
  for (const p of projects) {
    const src = p?.info?.image || p?.image || "";
    if (src) requestImage(src);
    for (const c of (p.children || [])) {
      const csrc = c?.info?.image || c?.image || "";
      if (csrc) requestImage(csrc);
    }
  }
}
window.preloadAllImages = preloadAllImages;

function requestImage(src) {
  const url = normalizeImgSrc(src);
  if (!url) return null;

  const existing = IMAGE_CACHE.get(url);
  if (existing) return existing;

  const entry = { img: null, status: "loading" };
  IMAGE_CACHE.set(url, entry);

  // p5 async loader
  loadImage(
    url,
    (p5img) => { entry.img = p5img; entry.status = "ready"; },
    (err)    => { console.warn("[image] failed:", url, err); entry.status = "error"; }
  );
  return entry;
}


   (function () {

// --- SHARE NODE BUTTON DOM ---
let shareNodeButton = null;

function ensureShareNodeButton() {
  if (shareNodeButton) return;

  shareNodeButton = document.createElement("button");
  shareNodeButton.className = "share-node-button";
  shareNodeButton.type = "button";
  shareNodeButton.textContent = "Share the node";
  shareNodeButton.style.position = "absolute";
  shareNodeButton.style.zIndex   = "10050";    
  shareNodeButton.style.display  = "none";  // hidden until we know where to put it

  document.body.appendChild(shareNodeButton);

  shareNodeButton.addEventListener("click", function () {
    if (typeof window.currentNode === "function") {
      const n = window.currentNode();
      if (n) openShareNodeModal(n);
    } else if (typeof currentNode === "function") {
      const n = currentNode();
      if (n) openShareNodeModal(n);
    }
  });
}

// helper: update position + visibility each frame
function positionShareNodeButton(screenX, screenY, visible) {
  if (!shareNodeButton) return;
  if (!visible) {
    shareNodeButton.style.display = "none";
    return;
  }
  shareNodeButton.style.display = "block";
  shareNodeButton.style.left    = `${screenX}px`;
  shareNodeButton.style.top     = `${screenY}px`;
}




    // ----- SAFE LOCAL SETTINGS (do not depend on global UI/COLORS) -----
    const G = (typeof window !== "undefined") ? window : {};
    const inputUI  = (G && G.UI      && typeof G.UI      === "object") ? G.UI      : null;
    const inputCOL = (G && G.COLORS  && typeof G.COLORS  === "object") ? G.COLORS  : null;
  
    // Copy values to locals; NEVER access UI.* or COLORS.* later
    const THEME = {
      blue:  Array.isArray(inputCOL?.blue) ? inputCOL.blue : [18, 79, 199],
      white: Array.isArray(inputCOL?.white)? inputCOL.white: [255],
      lime:  Array.isArray(inputCOL?.lime) ? inputCOL.lime : [206, 224, 0],
      line:  Array.isArray(inputCOL?.line) ? inputCOL.line : [255, 180],
    };
    const TYPE = {
      title: Number.isFinite(inputUI?.fontTitle) ? inputUI.fontTitle : 34,
      body:  Number.isFinite(inputUI?.fontBody)  ? inputUI.fontBody  : 16,
    };
  
    // Helpers
    const clamp    = (n, a, b) => Math.max(a, Math.min(b, n));
    const isBottom = () => (typeof LAYOUT !== "undefined" && LAYOUT === "bottom");
    const isLeft   = () => (typeof LAYOUT !== "undefined" && LAYOUT === "left");
    const setFill   = (rgb) => fill(...rgb);
    const setStroke = (rgb) => stroke(...rgb);
    const rrect = (x, y, w, h, r) => rect(x, y, w, h, r, r, r, r);
  
    function drawPill(x, y, label, h, padX) {
      textSize(h * 0.45);
      const tw = textWidth(label);
      const w  = tw + padX * 2;
      noStroke(); setFill(THEME.lime);
      rrect(x, y, w, h, h / 2);
      setFill(THEME.blue);
      textAlign(CENTER, CENTER);
      text(label, x + w / 2, y + h / 2 - 2);
      return w;
    }

    function drawRule(x, y, w) { setStroke(THEME.line); strokeWeight(1); line(x, y, x + w, y); noStroke(); }
    function drawKVRow(x, y, w, key, value, rowH) {
      textSize(14);
      textAlign(LEFT,  CENTER); setFill(THEME.white); text(key,  x,      y + rowH / 2 - 1);
      textAlign(RIGHT, CENTER);                       text(value || "—", x + w, y + rowH / 2 - 1);
    }
  
    const currentNode = () =>
      (typeof hoveredNode !== "undefined" && hoveredNode) ||
      (typeof activeNode   !== "undefined" && activeNode) || null;
      
  
    // Returns "" for values that should be hidden: null, undefined, "", "-", "—"
    function cleanMeta(v) {
      if (v == null) return "";
      const s = String(v).trim();
      if (s === "" || s === "-" || s === "—") return "";
      return s;
    }

    function nodeText(n) {
      // in ui_topbar.js, inside nodeText(n)
let info = n?.info || {};
if ( (!info.year || !info.type) && window.NODE_REGISTRY ) {
  const reg = window.NODE_REGISTRY.get(n.title);
  if (reg && reg.info) info = { ...info, ...reg.info };
}
const year = cleanMeta(info.year);
const type = cleanMeta(info.type);

      const title = n?.title || n?.label || "PROJECT NAME";
      const desc  = n?.info?.desc || "Although fluid, we focus much energy on product, innovation, and growth with our ecosystem of clients, investors, founders.";
      const cat   = cleanMeta(n?.info?.category || n?.category);
      const linkRaw = info.link || info.url || "";
      const linkURL = normalizeLink(linkRaw);
      const linkText = linkLabel(linkRaw);   

  
      const tags  = (n?.tags && n.tags.length) ? n.tags : ["TAG 1", "TAG 2", "TAG 3"];
      return { title, desc, year, cat, type, tags, linkURL, linkText };


      function normalizeLink(url) {
        if (!url) return "";
        let s = String(url).trim();
        if (!s) return "";
        if (!/^https?:\/\//i.test(s)) s = "https://" + s;
        return s;
      }
      
      function linkLabel(url) {
        const norm = normalizeLink(url);
        if (!norm) return "";
        try {
          const u = new URL(norm);
          return u.hostname.replace(/^www\./i, "");
        } catch (e) {
          return "Open link";
        }
      }

    }










    function nodeImage(n) {
      const src =
        n?.image || n?.img || n?.info?.image || "";
      const entry = requestImage(src);
      return (entry && entry.status === "ready") ? entry.img : null; // return p5.Image when ready
    }
    
  
    function metrics(usableW) {
      // desktop metrics()
const imageW = clamp(Math.round(usableW * 0.55), 240, 460);
const imageH = pickImageH(imageW);

let metaLinkHitbox = null;
let metaLinkURL    = null;

      const outerPad  = clamp(Math.round(usableW * 0.035), 16, 28);
      const titleY    = outerPad + 10;
      const tagGap    = clamp(Math.round(usableW * 0.018), 8, 16);
      const tagH      = clamp(Math.round(usableW * 0.072), 18, 40);
      // const imageW    = clamp(Math.round(usableW * 0.55), 240, 460);
      // const imageH    = Math.round(imageW * 0.66); // ~3:2
      const bodyGap   = clamp(Math.round(usableW * 0.04), 18, 32);
      const ruleGap   = clamp(Math.round(usableW * 0.045), 18, 28);
      const rowH      = clamp(Math.round(usableW * 0.055), 16, 24);
      const titleSize = clamp(Math.round(usableW * 0.065), 24, 40);
      const bodySize  = clamp(Math.round(usableW * 0.045), 14, 20);
      return { outerPad, titleY, tagGap, tagH, imageW, imageH, bodyGap, ruleGap, rowH, titleSize, bodySize };
    }
 
    function useRegularFont() { if (typeof acuminRegular !== 'undefined' && acuminRegular) textFont(acuminRegular); }
    function useLightFont()  { if (typeof acuminLight   !== 'undefined' && acuminLight)   textFont(acuminLight); }
    
// ~48% of the screen height for the mobile bottom panel (can be tuned via UI.mobilePanelRatio)
// Mobile panel height target (fraction of screen height)
const MOBILE_RATIO_DEFAULT = 0.62; // was 0.48

// Mobile metrics (smaller paddings; image sized to a right column)
function metricsMobile(usableW, usableH) {
  const imageW = Math.round(usableW * 0.44);  // ~44% of panel width for the image column
  const imageH = pickImageH(imageW);
  const outerPad  = 12;
  const titleY    = outerPad + 6;
  const tagGap    = Math.max(6, Math.round(usableW * 0.01));
  const tagH      = Math.max(16, Math.round(usableW * 0.05));
  const bodyGap   = 40;
  const ruleGap   = 80;
  const rowH      = Math.max(14, Math.round(usableW * 0.04));
  const titleSize = Math.max(20, Math.round(usableW * 0.056));
  const bodySize  = Math.max(16, Math.round(usableW * 0.042));
  const colGap    = 10;
  const gapAfterTags = 5;
  return { outerPad, titleY, tagGap, tagH, imageW, imageH, bodyGap, ruleGap, rowH, titleSize, bodySize, colGap, gapAfterTags };
}


function layoutTagPillsWrapped(tags, startX, startY, maxW, tagH, gapX, gapY, padX) {
  let x = startX, y = startY, rows = 0;
  const wrapRight = startX + maxW;

  // measure with the SAME size drawPill() uses
  const MEASURE_SIZE = tagH * 0.45;

  for (let i = 0; i < (tags?.length || 0); i++) {
    const label = String(tags[i]).toUpperCase();

    // pre-measure width at draw size
    textSize(MEASURE_SIZE);
    const measured = textWidth(label);
    const pillW = Math.ceil(measured + padX * 2);

    if (rows === 0) rows = 1;

    // wrap to next row if this pill would cross the right edge
    if (x + pillW > wrapRight) {
      rows++;
      x = startX;
      y += tagH + gapY;
    }

    // draw at the final position; drawPill returns actual width
    const used = drawPill(x, y, label, tagH, padX);

    x += used + gapX;
  }

  // nextY is the baseline just below the last row of pills
  return { rows, nextY: rows ? (y + tagH) : startY };
}

// Measure wrapped text using current textFont/textSize settings.
// function measureWrappedHeight(txt, maxW, fontSize, leadingMul = 1.15) {
//   if (!txt) return { lines: 0, lineH: Math.round(fontSize * leadingMul), height: 0 };
//   textSize(fontSize);
//   const words = String(txt).split(/\s+/);
//   const lines = [];
//   let cur = "";
//   for (const w of words) {
//     const test = cur ? cur + " " + w : w;
//     if (textWidth(test) <= maxW) {
//       cur = test;
//     } else {
//       if (cur) lines.push(cur);
//       if (textWidth(w) > maxW) { // hard-wrap very long words
//         let chunk = "";
//         for (const ch of w) {
//           const t2 = chunk + ch;
//           if (textWidth(t2) <= maxW) chunk = t2;
//           else { lines.push(chunk); chunk = ch; }
//         }
//         cur = chunk;
//       } else {
//         cur = w;
//       }
//     }
//   }
//   if (cur) lines.push(cur);
//   const lineH = Math.round(fontSize * leadingMul);
//   return { lines: lines.length, lineH, height: lines.length * lineH };
// }


    // -------- MAIN DRAW (always defined) --------
    window.drawTopBar = function drawTopBar() {
      // Original  supplied by world.js

// ----- PANEL BOUNDS -----
const isMobileBottom = (LAYOUT === 'bottom');
const isMobileLike   = (LAYOUT === 'bottom' || LAYOUT === 'top'); // compact mobile metrics
const atTop          = (LAYOUT === 'top');

// ----- PANEL BOUNDS -----
// layout flags already defined above

// --- Measure DOM header height (use world.js helper if present) ---
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
  } catch (e) { return 0; }
}
const domHeaderH = (typeof window.getHeaderHeight === 'function')
  ? window.getHeaderHeight()
  : (typeof __measureHeaderHeight === 'function' ? __measureHeaderHeight() : __measureHeader());

// Panel size
let panelW, panelH, margin;
if (LAYOUT === 'left') {
  // DESKTOP: panel to the left, fill canvas height below header
  panelW = (typeof sideBarW === 'number') ? sideBarW : width;
  panelH = Math.max(0, height - domHeaderH);
  document.documentElement.style.setProperty('--panelW', panelW + 'px');
  margin = 24;
} else if (atTop) {
  // MOBILE/TOP: panel at the top
  panelW = width;
  const ratio = (G.UI?.mobilePanelRatio ?? MOBILE_RATIO_DEFAULT);
  document.documentElement.style.setProperty('--panelW', panelW + 'px');
  panelH = (typeof topBarH === 'number' ? topBarH : Math.round(height * ratio));
  margin = 0;
  document.documentElement.style.setProperty('--graphTopPanelH', panelH + 'px');
} else {
  // fallback (rare)
  panelW = width;
  document.documentElement.style.setProperty('--panelW', panelW + 'px');
  panelH = Math.round(height * 0.48);
  margin = 0;
}

// Screen origin:
// left  -> start below header
// top   -> start below header
// bottom-> (not used now)
const originX = 0;
const originY = (LAYOUT === 'left' || atTop) ? domHeaderH : 0;
const innerW = isMobileLike ? panelW : Math.max(0, panelW - margin * 2);
const innerH = isMobileLike ? panelH : Math.max(0, panelH - margin * 2);
ensureShareNodeButton();

push();
translate(originX, originY);

// Blue background flush to edges on mobile; with margins on desktop
noStroke();
setFill(THEME.blue);
rect(isMobileLike ? 0 : margin, (isMobileLike ? 0 : margin), innerW, innerH);
translate(isMobileLike ? 0 : margin, (isMobileLike ? 0 : margin));


     // Metrics (desktop vs mobile)
const M = isMobileLike ? metricsMobile(innerW, innerH) : metrics(innerW);
const {
  outerPad, titleY, tagGap, tagH, imageW, imageH, bodyGap, ruleGap, rowH, titleSize, bodySize
} = M;

const gapAfterTags = M.gapAfterTags ?? Math.max(12, Math.round((titleSize || TYPE.title) * 0.30));

const node = currentNode();
let title = "PROJECT NAME";
let desc  = "Although fluid, we focus much energy on product, innovation, and growth with our ecosystem of clients, investors, founders.";
let year  = "2025", cat = "PROJECT", type = "ONE";
let tags  = ["TAG 1", "TAG 2", "TAG 3"];
let img   = null;
let linkURL  = "";    
let linkText = "";

if (node) {
  const t = nodeText(node);
  title    = t.title;
  desc     = t.desc;
  year     = t.year;
  cat      = t.cat;
  type     = t.type;
  tags     = t.tags;
  linkURL  = t.linkURL || "";
  linkText = t.linkText || "";
  img      = nodeImage(node);
}

// Content frame
const contentX = outerPad;
const contentW = innerW - outerPad * 2;



// Title (wrap-aware)
useLightFont();
textAlign(LEFT, TOP);
setFill(THEME.white);
const _titleSize = (titleSize || TYPE.title);
const titleStr   = title.toUpperCase();

textSize(_titleSize);
const titleM = measureWrappedHeight(titleStr, contentW, _titleSize, 1.15);
textLeading(titleM.lineH);
text(titleStr, contentX, titleY, contentW, titleM.height + 2);

// Tags (wrap to rows)
useLightFont();
const tagStartY = titleY + titleM.height + gapAfterTags;
const padX = Math.max(14, Math.round(tagH * 0.6));
const gapX = tagGap;
const gapY = Math.round(tagH * 0.40);
const tagLayout = layoutTagPillsWrapped(tags, contentX, tagStartY, contentW, tagH, gapX, gapY, padX);

const contentTopY = tagLayout.nextY + Math.max(8, bodyGap);

// ---------- IMAGE + BODY (mobile: two columns; desktop: stack as before) ----------
// let imageX, imageY, bodyX, bodyW;

// // MOBILE BOTTOM: two-column when feasible; else stack
// if (isMobileBottom) {
//   const rightImgW = imageW;
//   const leftBodyW = contentW - rightImgW - colGap;

//   if (leftBodyW >= 220) {
//     // two columns
//     bodyX = contentX;
//     bodyY = contentTopY;
//     bodyW = leftBodyW;

//     imageX = contentX + leftBodyW + colGap;
//     imageY = contentTopY;
//   } else {
//     // fallback: stack image then body
//     imageX = contentX;
//     imageY = contentTopY;

//     bodyX = contentX;
//     bodyY = imageY + imageH + Math.max(8, bodyGap);
//     bodyW = contentW;
//   }
// } else {
//   // DESKTOP/LEFT: keep your previous stacked flow (image first, then body)
//   imageX = contentX;
//   imageY = contentTopY+400;

//   bodyX  = contentX;
//   bodyY  = imageY + 50+imageH + Math.max(12, bodyGap);
//   bodyW  = contentW;
// }


// ===== LAYOUT: tags → scrollable content → share button → meta rows =====
const tagsBottomY = tagLayout.nextY;

// --- Bottom area: work up from the bottom ---
const metaRowCount = [year, cat, type].filter(v => v && v !== "").length + (linkURL ? 1 : 0);
const metaBlockH   = metaRowCount * (rowH + 6) + 8;  // rows + rule gaps
const metaY        = innerH - metaBlockH - outerPad;

const BTN_H           = (shareNodeButton && shareNodeButton.offsetHeight > 0)
                        ? shareNodeButton.offsetHeight : 36;
const BTN_GAP_META    = 12;  // gap between button bottom and first rule
const BTN_GAP_CONTENT = 14;  // gap between content and button top
const btnTopY         = metaY - BTN_GAP_META - BTN_H;
const contentY        = tagsBottomY + 16;
const contentBottom   = btnTopY - BTN_GAP_CONTENT;
const availForContent = Math.max(0, contentBottom - contentY);

// scroll bar track width
const TRACK_W   = 3;
const TRACK_GAP = 6;

// Two-column on mobile: image fixed on right, text scrolls on left
const imgReady = img && img.width > 0 && img.height > 0;
const twoCol   = isMobileLike && imgReady;
const colGap   = M.colGap ?? 10;

// Column widths
const imgColW   = twoCol ? imageW : 0;
const leftZoneW = contentW - (twoCol ? imgColW + colGap : 0);
const textW     = leftZoneW - TRACK_W - TRACK_GAP;

// Reset scroll when focused node changes
if (_panelScrollNode !== node) { panelScrollY = 0; _panelScrollNode = node; }

useLightFont();
const _bodySize = (bodySize / 1.2 || TYPE.body);

// Measure body text height
textSize(_bodySize);
const bm = measureWrappedHeight(desc, textW, _bodySize, 1.25);

// Heights depend on layout mode
let totalContentH = bm.height + 32;
let imgBlockH = 0;
let drawImgW = 0, drawImgH = 0;

if (twoCol) {
  // Two-col: image fills full available height on the right, text independent
  drawImgW = imgColW;
  drawImgH = availForContent;
} else if (imgReady) {
  // Single-col: image stacked above body text
  drawImgW = Math.min(imageW, textW);
  drawImgH = Math.min(frameHeightForImage(img, drawImgW), Math.round(availForContent * 0.45));
  const ar = img.height / img.width;
  drawImgW = Math.min(textW, Math.max(80, Math.round(drawImgH / ar)));
  imgBlockH = drawImgH + 16;
  totalContentH = imgBlockH + bm.height + 32;
}
panelScrollMax = Math.max(0, totalContentH - availForContent);

// --- Fixed image column (two-col only, not scrolled) ---
if (twoCol && drawImgH > 0) {
  const imgX = contentX + leftZoneW + colGap;
  drawImageCover(img, imgX, contentY, drawImgW, drawImgH, biasForImage(img));
}

// --- Scrollable text column ---
{
  const _ctx = drawingContext;
  _ctx.save();
  _ctx.beginPath();
  _ctx.rect(contentX, contentY, leftZoneW, availForContent);
  _ctx.clip();
  _ctx.translate(0, -panelScrollY);

  // Image above text (single-col only)
  if (!twoCol && imgReady && drawImgH > 0) {
    drawImageCover(img, contentX, contentY, drawImgW, drawImgH, biasForImage(img));
  }

  const bodyY = contentY + imgBlockH;
  textAlign(LEFT, TOP);
  textLeading(bm.lineH);
  setFill(THEME.white);
  if (typeof textWrap === 'function' && typeof WORD !== 'undefined') textWrap(WORD);
  text(desc, contentX, bodyY, textW, 9999);

  panelScrollY = Math.min(panelScrollY, panelScrollMax);
  _ctx.restore();
}

// --- Scroll indicator ---
if (panelScrollMax > 0) {
  const trackX    = contentX + textW + TRACK_GAP;
  const trackH    = availForContent;
  const thumbH    = Math.max(20, Math.round(trackH * (availForContent / totalContentH)));
  const thumbMaxY = trackH - thumbH;
  const thumbY    = contentY + Math.round(thumbMaxY * (panelScrollY / panelScrollMax));

  noStroke();
  fill(255, 255, 255, 40);
  rect(trackX, contentY, TRACK_W, trackH, 2);
  fill(255, 255, 255, 180);
  rect(trackX, thumbY, TRACK_W, thumbH, 2);
}


 



// ----- META rows pinned at the bottom -----
// ----- META rows pinned at the bottom -----
useRegularFont();

// clear hitbox each frame
metaLinkHitbox = null;
metaLinkURL    = null;

// figure out where this panel is on screen
const panelBaseX = originX + (isMobileLike ? 0 : margin);
const panelBaseY = originY + (isMobileLike ? 0 : margin);

if (shareNodeButton) {
  const btnOffsetY = 40;                 // distance above the YEAR row
  const btnScreenX = panelBaseX + contentX;
  const btnScreenY = panelBaseY + (metaY - btnOffsetY);

  positionShareNodeButton(btnScreenX, btnScreenY, !!node);
}

// Build the list of visible meta rows — skip any field that is blank or "-"
const metaRows = [
  { key: "YEAR",     value: year },
  { key: "CATEGORY", value: cat },
  { key: "TYPE",     value: type },
];
if (linkURL) {
  metaRows.push({ key: "LINK", value: linkText, isLink: true });
}
const visibleRows = metaRows.filter(r => r.value !== "");

// Render only visible rows with dynamic y positions so no gaps appear
if (visibleRows.length > 0) {
  const rowStep = rowH + 6;
  let curY = metaY;

  drawRule(contentX, curY, contentW);
  curY += 4;

  for (let i = 0; i < visibleRows.length; i++) {
    const r = visibleRows[i];

    drawKVRow(contentX, curY, contentW, r.key, r.value, rowH);

    if (r.isLink) {
      metaLinkHitbox = {
        x: panelBaseX + contentX,
        y: panelBaseY + curY,
        w: contentW,
        h: rowH
      };
      metaLinkURL = linkURL;
    }

    curY += rowStep;
    drawRule(contentX, curY - 2, contentW);
  }
}


pop();

    };
  })();
  

  // --- word-wrap measurer (uses current textFont/textSize) ---
// function measureWrappedHeight(txt, maxW, fontSize, leadingMul = 1.25) {
//   if (!txt) return { lines: 0, lineH: Math.round(fontSize * leadingMul), height: 0 };
//   textSize(fontSize);
//   const words = String(txt).split(/\s+/);
//   const lines = [];
//   let cur = "";
//   for (const w of words) {
//     const test = cur ? cur + " " + w : w;
//     if (textWidth(test) <= maxW) {
//       cur = test;
//     } else {
//       if (cur) lines.push(cur);
//       // if a single word is wider than maxW, hard-wrap by characters
//       if (textWidth(w) > maxW) {
//         let chunk = "";
//         for (const ch of w) {
//           const t2 = chunk + ch;
//           if (textWidth(t2) <= maxW) chunk = t2;
//           else { lines.push(chunk); chunk = ch; }
//         }
//         cur = chunk;
//       } else {
//         cur = w;
//       }
//     }
//   }
//   if (cur) lines.push(cur);
//   const lineH = Math.round(fontSize * leadingMul);
//   return { lines: lines.length, lineH, height: lines.length * lineH };
// }



// Draw img cropped to fill dest box (like CSS object-fit: cover)
// bias: 'horizontal' (crop more vertically), 'vertical' (crop more horizontally), or 'auto'
function drawImageCover(img, dx, dy, dW, dH, bias = 'auto', alignX = 0.5, alignY = 0.5) {
  if (!img || !img.width || !img.height) return;

  const sW = img.width, sH = img.height;
  // scale so the destination box is fully covered
  const scale = Math.max(dW / sW, dH / sH);
  const tW = Math.round(dW / scale); // source width to sample
  const tH = Math.round(dH / scale); // source height to sample

  // bias just affects where we crop from (centers by default)
  // alignX/alignY are 0..1 (0 = left/top, 1 = right/bottom)
  // For 'horizontal', we keep more width (crop top/bottom), so Y-alignment matters more.
  // For 'vertical', we keep more height (crop left/right), so X-alignment matters more.
  let ax = alignX, ay = alignY;
  if (bias === 'horizontal') { ax = 0.5; /* center horizontally */ }
  if (bias === 'vertical')   { ay = 0.5; /* center vertically   */ }

  const sx = Math.max(0, Math.min(sW - tW, Math.round((sW - tW) * ax)));
  const sy = Math.max(0, Math.min(sH - tH, Math.round((sH - tH) * ay)));

  // draw cropped
  imageMode(CORNER);
  image(img, dx, dy, dW, dH, sx, sy, tW, tH);
}



/* ===================== UI TOPBAR — HELPERS (drop-in) ===================== */

/* ---------- drawing convenience ---------- */

// setFill / setStroke accept arrays [r,g,b,(a)] or numeric gray/a
function setFill(c, a) {
  if (Array.isArray(c)) {
    if (c.length === 4) fill(c[0], c[1], c[2], c[3]);
    else if (c.length === 3) fill(c[0], c[1], c[2], a ?? 255);
    else if (c.length === 1) fill(c[0], a ?? 255);
  } else if (typeof c === 'number') {
    fill(c, a ?? 255);
  } else {
    noFill();
  }
}
function setStroke(c, a) {
  if (Array.isArray(c)) {
    if (c.length === 4) stroke(c[0], c[1], c[2], c[3]);
    else if (c.length === 3) stroke(c[0], c[1], c[2], a ?? 255);
    else if (c.length === 1) stroke(c[0], a ?? 255);
  } else if (typeof c === 'number') {
    stroke(c, a ?? 255);
  } else {
    noStroke();
  }
}

// rounded-rect with auto radius clamp
function rrect(x, y, w, h, r = 6) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  rect(x, y, w, h, rr);
}

// switch fonts safely; falls back if fonts are missing
function useLightFont()   { try { if (window.acuminLight)   textFont(window.acuminLight);   } catch (e){} }
function useRegularFont() { try { if (window.acuminRegular) textFont(window.acuminRegular); } catch (e){} }

/* ---------- text measurement & layout ---------- */

// Measure wrapped height for a block of text (word-wrap, p5 textWidth)
function measureWrappedHeight(txt, maxW, fontSize, leadingMul = 1.25) {
  if (!txt) return { lines: 0, lineH: Math.round((textAscent() + textDescent()) * leadingMul), height: 0 };
  textSize(fontSize);

  const words = String(txt).split(/\s+/);
  const lines = [];
  let cur = "";

  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (textWidth(test) <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      if (textWidth(w) > maxW) { // hard-wrap very long words
        let chunk = "";
        for (const ch of w) {
          const t2 = chunk + ch;
          if (textWidth(t2) <= maxW) chunk = t2;
          else { lines.push(chunk); chunk = ch; }
        }
        cur = chunk;
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);

  const lineH = Math.ceil((textAscent() + textDescent()) * leadingMul);
  return { lines: lines.length, lineH, height: lines.length * lineH };
}

/* ---------- image sizing/cropping ---------- */

// Treats image like CSS object-fit: cover; crops from center by default.
// bias: 'horizontal' (crop top/bottom more), 'vertical' (crop left/right more), or 'auto'.
// alignX/alignY: 0..1 where 0=left/top and 1=right/bottom (rarely needed to change).
// function drawImageCover(img, dx, dy, dW, dH, bias = 'auto', alignX = 0.5, alignY = 0.5) {
//   if (!img || !img.width || !img.height || dW <= 0 || dH <= 0) return;
//   const sW = img.width, sH = img.height;
//   const dAR = dW / dH, sAR = sW / sH;

//   // Compute target crop size (tW x tH) in source pixels
//   let tW, tH;
//   if (sAR > dAR) { // source wider → crop left/right
//     tH = sH;
//     tW = Math.round(sH * dAR);
//   } else {         // source taller → crop top/bottom
//     tW = sW;
//     tH = Math.round(sW / dAR);
//   }

//   // Bias affects where we crop from (center by default)
//   let ax = alignX, ay = alignY;
//   if (bias === 'horizontal') ax = 0.5;
//   if (bias === 'vertical')   ay = 0.5;

//   const sx = Math.max(0, Math.min(sW - tW, Math.round((sW - tW) * ax)));
//   const sy = Math.max(0, Math.min(sH - tH, Math.round((sH - tH) * ay)));

//   imageMode(CORNER);
//   image(img, dx, dy, dW, dH, sx, sy, tW, tH);
// }

// Decide the display frame height based on real image orientation
// h/w ratio: ~3:2 for landscape, ~4:5 for portrait (tweak if you like)


function isPortraitImage(img, tolerance = 0.05) {
  return !!(img && img.width && img.height && (img.height / img.width) > (1 + tolerance));
}
function biasForImage(img) {
  return isPortraitImage(img) ? 'vertical' : 'horizontal';
}
function frameHeightForImage(img, destW) {
  const ratio = isPortraitImage(img) ? IMAGE_RATIO_V : IMAGE_RATIO_H;
  return Math.round(destW * ratio);
}

/* ---------- tags & meta rows ---------- */

// Draw a lime pill with blue text; returns pixel width used
function drawPill(x, y, label, h, padX, THEME) {
  const textSz = Math.max(12, Math.round(h * 0.45));
  textSize(textSz);
  const w = Math.ceil(textWidth(label) + padX * 2);
  noStroke();
  setFill(THEME.lime);
  rrect(x, y, w, h, h / 2);
  setFill(THEME.blue);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2 - 2);
  return w;
}

// Lay out multiple pills with wrapping; draws them and returns {nextY, rows}
function layoutTagPillsWrapped(tags, startX, startY, maxW, tagH, gapX, gapY, padX, THEME) {
  let x = startX, y = startY, rows = 0;
  const wrapRight = startX + maxW;
  const MEASURE_SIZE = Math.max(12, Math.round(tagH * 0.45));

  for (let i = 0; i < (tags?.length || 0); i++) {
    const label = String(tags[i]).toUpperCase();
    textSize(MEASURE_SIZE);
    const pillW = Math.ceil(textWidth(label) + padX * 2);

    if (rows === 0) rows = 1;
    if (x + pillW > wrapRight) {
      rows++;
      x = startX;
      y += tagH + gapY;
    }
    const used = drawPill(x, y, label, tagH, padX, THEME);
    x += used + gapX;
  }
  return { nextY: y + tagH, rows };
}

// Thin rule and key/value rows (for YEAR / CATEGORY / TYPE)
function drawRule(x, y, w, THEME) {
  setStroke(THEME.line); strokeWeight(1); line(x, y, x + w, y); noStroke();
}
function drawKVRow(x, y, w, key, value, rowH, THEME) {
  textSize(14);
  textAlign(LEFT,  CENTER); setFill(THEME.white); text(key,  x,      y + rowH / 2 - 1);
  textAlign(RIGHT, CENTER);                         text(value || "—", x + w, y + rowH / 2 - 1);
}

// choose the target frame height for a given dest width, per-image
function frameHeightForImage(img, destW) {
  const portrait = isPortraitImage(img);
  const ratio = portrait ? IMAGE_RATIO_V : IMAGE_RATIO_H; // h/w
  return Math.round(destW * ratio);
}

// convert portrait/landscape into a drawImageCover bias
function biasForImage(img) {
  return isPortraitImage(img) ? 'vertical' : 'horizontal';
}

// function isPortraitImage(img, tolerance = 0.05) {
//   return !!(img && img.width && img.height && (img.height / img.width) > (1 + tolerance));
// }
// called from input.js when user taps/clicks on the panel
window.openMetaLinkIfHit = function (sx, sy) {
  if (!metaLinkHitbox || !metaLinkURL) return false;

  const r = metaLinkHitbox;
  const inside =
    sx >= r.x && sx <= r.x + r.w &&
    sy >= r.y && sy <= r.y + r.h;

  if (!inside) return false;

  try {
    window.open(metaLinkURL, "_blank", "noopener");
  } catch (e) {
    console.warn("[meta link] failed to open", metaLinkURL, e);
  }
  return true;
};