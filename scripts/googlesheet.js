// === Google Sheet → PROJECTS 
const GOOGLE_SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcpgkwOXHAC5yY6wr1t9OHSXhui1R96VI2P3raxS0gEFBgG0VyVN9rSW3bk5aJfHTOXCplLbvpjdVR/pub?gid=0&single=true&output=csv'; 


window.PROJECTS = window.PROJECTS || [];

// --- add once, near your loader ---
function val(v) { return v == null ? "" : String(v).trim(); }

// Case-insensitive getter with alias list
function getAny(row, keys) {
  // build a lowercase index once per row
  if (!row.__lc) {
    const lc = {};
    for (const [k, v] of Object.entries(row)) lc[k.toLowerCase().trim()] = v;
    row.__lc = lc;
  }
  for (const k of keys) {
    const v = row.__lc[k.toLowerCase().trim()];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

// Accept comma/semicolon/pipe or JSON array
function parseTagsFlexible(x) {
  const s = val(x);
  if (!s) return [];
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(t => String(t).trim()).filter(Boolean);
    } catch(_) {}
  }
  return s.split(/[,\|;]+/).map(t => t.trim()).filter(Boolean);
}

// --- REPLACE your rowsToProjects with this version ---
function rowsToProjects(rows) {
  const map = new Map(); // title -> project

  function ensureProject(title) {
    if (!map.has(title)) {
      map.set(title, {
        title,
        tags: [],
        info: { category: "Project" },
        children: []
      });
    }
    return map.get(title);
  }

  for (const r of rows) {
    const title = getAny(r, ["title", "node_title", "project_title"]);
    if (!title) continue;

    // explicit kind OR infer from presence of parent
    const kindRaw = getAny(r, ["kind", "node_kind", "row_kind"]).toLowerCase();
    const parent  = getAny(r, ["parent_title", "parent", "project_parent"]);
    const kind    = kindRaw || (parent ? "child" : "project");

    // tags + info (accept many header variants)
    const tags = parseTagsFlexible(getAny(r, ["tags", "node_tags", "project_tags", "child_tags"]));

    const info = {
      category: getAny(r, ["category", "node_category", "project_category"]) || (kind === "child" ? "Subnode" : "Project"),
      desc:  getAny(r, ["desc", "node_desc", "project_desc"]),
      year:  getAny(r, ["year", "project_year"]),
      type:  getAny(r, ["type", "project_type", "node_type"]),
      image: getAny(r, ["image", "project_image", "node_image"]),
      link:  getAny(r, ["link", "url", "website", "project_link"])
    };

    if (kind === "project") {
      const p = ensureProject(title);

      // union tags
      const set = new Set(p.tags);
      for (const t of tags) set.add(t);
      p.tags = Array.from(set);

      // merge non-empty info fields (sheet wins)
      for (const [k, v] of Object.entries(info)) if (v !== "") p.info[k] = v;

    } else { // child
      if (!parent) continue;
      const p = ensureProject(parent);

      // Also register this node so it can itself be a parent (bidirectional hierarchy).
      // A node must be allowed to be both a child of another node and a parent of its own children.
      const self = ensureProject(title);
      const tagSet = new Set(self.tags);
      for (const t of tags) tagSet.add(t);
      self.tags = Array.from(tagSet);
      for (const [k, v] of Object.entries(info)) if (v !== "") self.info[k] = v;
      // Store the parent reference so buildTagRegistry can set the correct parent field
      if (!self.info._parentTitle) self.info._parentTitle = parent;

      if (!p.children.some(c => c.title === title)) {
        // Push the registered project entry (not a plain copy) so multi-level
        // hierarchy is preserved: self.children can be populated by later rows.
        p.children.push(self);
      }
    }
  }

  const projects = Array.from(map.values());

  // Debug: verify a couple of rows actually have year/type
  const dbg = projects.slice(0, 3).map(p => ({ title: p.title, year: p.info.year, type: p.info.type }));
  console.log("[rowsToProjects] sample:", dbg);

  return projects;
}



// ---- Build randomized (deduped) TAG buttons from PROJECTS ----
function randomizedTagButtonsFromProjects(projects, limit = 11) {
  limit = Math.max(1, Math.min(limit, 20)); // sane guard

  // Count tags case-insensitively, keep a nice display label
  const counts = new Map(); // key(lower) -> {key, display, raw, count}
  function addTag(t) {
    if (!t) return;
    const raw     = String(t).trim();
    if (!raw) return;
    const key     = raw.toLowerCase();
    const display = raw.charAt(0).toUpperCase() + raw.slice(1);
    const obj     = counts.get(key) || { key, display, raw, count: 0 };
    obj.count++;
    counts.set(key, obj);
  }

  for (const p of (projects || [])) {
    (p.tags || []).forEach(addTag);
    for (const c of (p.children || [])) (c.tags || []).forEach(addTag);
  }

  const items = Array.from(counts.values());
  if (items.length === 0) {
    // fallback (no tags in sheet)
    return [
      { label: "Design",   tags: ["design"] },
      { label: "People",   tags: ["people"] },
      { label: "Process",  tags: ["process"] },
      { label: "Context",  tags: ["context"] },
      { label: "Purpose",  tags: ["purpose"] },
    ];
  }

  // Shuffle ALL tags randomly (Fisher–Yates), then cut to limit.
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const pick = items.slice(0, Math.min(limit, items.length));

  // Map to the format used by select_mode.js
  // Each button filters by its single tag value, same as your hard-coded list.
  return pick.map(t => ({ label: t.display, tags: [t.raw] }));
}





function parseCsv(text) {
  if (window.Papa && typeof Papa.parse === 'function') {
    const out = Papa.parse(text, { header: true, skipEmptyLines: true });
    return out.data || [];
  }

  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map(h => h.trim());
  return lines.map(line => {
    const cells = line.split(','); // naive
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cells[i] || '').trim());
    return obj;
  });
}

// Build a list of all tags across projects + children (with counts)
function buildAllTagsRegistry(projects) {
  const counts = new Map(); // key -> { key, label, count }

  function add(t) {
    if (!t) return;
    const key = String(t).trim().toLowerCase();
    if (!key) return;
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const obj = counts.get(key) || { key, label, count: 0 };
    obj.count++;
    counts.set(key, obj);
  }

  for (const p of (projects || [])) {
    (p.tags || []).forEach(add);
    for (const c of (p.children || [])) (c.tags || []).forEach(add);
  }
  // most frequent first
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

const _yield = () => new Promise(r => setTimeout(r, 0));

async function loadProjectsFromSheet(url) {
  const res  = await fetch(url, { cache: 'no-store' });
  const csv  = await res.text();

  // Yield to the draw loop before heavy sync work so p5 doesn't freeze
  await _yield();
  const rows = parseCsv(csv);
  const projects = rowsToProjects(rows);
  window.PROJECTS = projects;

  await _yield();
  if (typeof rebuildRegistries === "function") rebuildRegistries();

  if (typeof preloadAllImages === "function") preloadAllImages(projects);

  // build right-rail data and render it RANDOMIZED
  try {
    window.ALL_TAGS = buildAllTagsRegistry(window.PROJECTS);
    if (window.renderTagsRailRandom) window.renderTagsRailRandom();
  } catch (e) {
    console.warn('[tags rail] failed to build:', e);
  }

  // selection bubbles from sheet (11 randomized) — set BEFORE first spawn
  try {
    const newTags = randomizedTagButtonsFromProjects(window.PROJECTS, 11);
    window.TAGS = newTags;
    console.log('[TAGS] randomized from sheet:', newTags.map(t => t.label));
    // First-time spawn: nodes haven't appeared yet, so this is not a relabel
    if (typeof spawnFloatingTags === 'function' &&
        typeof mode !== 'undefined' && mode === 'select' &&
        Array.isArray(tagNodes) && tagNodes.length === 0) {
      spawnFloatingTags();
    }
  } catch (e) {
    console.warn('[TAGS] randomized build failed:', e);
  }

  // if already in graph mode, keep the camera/center stable
  if (typeof mode !== "undefined" && mode === "graph" && typeof centerNode !== "undefined" && centerNode) {
    if (typeof focusNodeGraph === "function") {
      focusNodeGraph(centerNode);
    } else if (typeof centerCameraOnNode === "function") {
      centerCameraOnNode(centerNode, false);
    }
  }

  console.log("[Sheet] Loaded projects:", projects.length);
}
  




function ensureTagsRail(){
  let rail = document.getElementById('tagsRail');
  if (!rail) {
    rail = document.createElement('div');
    rail.id = 'tagsRail';
    rail.className = 'tags-rail';
    document.body.appendChild(rail);
    console.log('[rail] created #tagsRail');
  }
  return rail;
}

function rnd(){
  if (window.crypto && crypto.getRandomValues) {
    const u = new Uint32Array(1);
    crypto.getRandomValues(u);
    return u[0] / 0xFFFFFFFF;
  }
  return Math.random();
}

function shuffleCopy(arr){
  const a = arr.slice();
  for (let i=a.length-1; i>0; i--){
    const j = Math.floor(rnd() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

window.renderTagsRailRandom = function renderTagsRailRandom(){
  const rail = ensureTagsRail();
  const all  = (window.ALL_TAGS || []).filter(t => t && t.count > 0);

  if (!all.length) { console.warn('[rail] ALL_TAGS empty'); return; }

  const items = shuffleCopy(all);      // <- RANDOMIZE

  // 🔹 desktop vs mobile limit
  const isMobile =
    (typeof window.LAYOUT !== "undefined" && window.LAYOUT === "bottom") ||
    (window.matchMedia && window.matchMedia("(max-width: 900px)").matches);

  const MAX = isMobile ? 8 : 20;       // ← 8 tags on mobile, 20 on desktop

  const pick = items.slice(0, MAX);

  rail.innerHTML = '';
  for (const t of pick){
    const btn = document.createElement('button');
    btn.className   = 'rail-tag';
    btn.textContent = t.label;
    btn.title       = `${t.label} (${t.count})`;
    btn.addEventListener('click', () => launchTagCluster(t.key));
    rail.appendChild(btn);
  }

  console.log('[rail] randomized tags:', pick.map(t => t.label));
  rail.dataset.version = String(Date.now());
};

// **Force any old deterministic renderer to be our random one**
window.renderTagsRail = window.renderTagsRailRandom;


