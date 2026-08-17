// expose for debugging
window.openGraphTip  = openGraphTip;
window.closeGraphTip = closeGraphTip;
// FULL saved world states
window.GRAPH_STATE = null;
window.TAGS_STATE = null;


function openGraphTip() {
  const m = document.getElementById('graphTip');
  if (!m) { console.warn('[graphTip] element not found'); return; }
  m.classList.add('is-open');
  document.body.classList.add('mode-graph');

  // wire close once
  const btn = m.querySelector('#graphTipClose');
  const bg  = m.querySelector('.tip-backdrop');

  if (btn && !btn.__bound) { btn.__bound = true; btn.addEventListener('click', () => closeGraphTip(true)); }
  if (bg  && !bg.__bound)  { bg.__bound  = true;  bg.addEventListener('click', () => closeGraphTip(true)); }

  // ESC to close
  function onEsc(e){ if (e.key === 'Escape') { closeGraphTip(false); document.removeEventListener('keydown', onEsc); } }
  document.addEventListener('keydown', onEsc);
}

function closeGraphTip(markSeen) {
  const m = document.getElementById('graphTip');
  if (m) m.classList.remove('is-open');
  document.body.classList.add('graphTip-dismissed');
  if (markSeen) {
    try { localStorage.setItem('graphTipSeen', '1'); } catch {}
  }
}

const LIMITS = {
  focusChildren:     UI?.maxChildrenFocus     ?? 20, // center's explicit children (no small cap — show all)
  focusRelated:      UI?.maxRelatedFocus      ?? 6,  // related projects around a focus
  tagParents:        UI?.maxParents           ?? 1,  // parents shown in tag-refocus
  tagChildren:       UI?.maxChildrenByTags    ?? 8   // children in tag-based fallback only
};



// current camera offset in world space
worldOffsetX = 0;
worldOffsetY = 0;

// camera target we ease toward
let cam = {
  tx: worldOffsetX,
  ty: worldOffsetY,
  easing: 0.18 // 0..1 (higher = faster)
};


// Build once after PROJECTS is loaded.
// Each entry carries the correct `parent` field so lookupDirectChildren() works
// for any node — whether it's a top-level project, a leaf child, or a node
// that is both a child of one node AND a parent of others.
function buildTagRegistry() {
  // Use a Map keyed by title so each node appears exactly once.
  // If a title is encountered both as a PROJECTS entry and as a child entry,
  // the PROJECTS entry (richer data, correct _parentTitle) wins.
  const map = new Map();

  function add(entry) {
    if (!entry.title) return;
    if (!map.has(entry.title)) {
      map.set(entry.title, entry);
    } else {
      // Merge: keep existing but upgrade parent if we now know it
      const cur = map.get(entry.title);
      if (!cur.parent && entry.parent) cur.parent = entry.parent;
    }
  }

  for (const p of PROJECTS) {
    // Determine whether this node is itself a child of another node.
    const parentTitle = (p.info && p.info._parentTitle) ? p.info._parentTitle : null;
    add({
      kind: parentTitle ? "child" : "project",
      title: p.title,
      tags: Array.isArray(p.tags) ? p.tags.slice() : [],
      info: p.info || { category: "Project" },
      parent: parentTitle
    });

    if (Array.isArray(p.children)) {
      for (const c of p.children) {
        add({
          kind: "child",
          title: c.title,
          tags: Array.isArray(c.tags) ? c.tags.slice() : [],
          info: (c.info || { category: "Subnode" }),
          parent: p.title
        });
      }
    }
  }
  return Array.from(map.values());
}

// const TAG_REGISTRY = buildTagRegistry();
let TAG_REGISTRY = [];

function tagsIntersect(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const set = new Set(a.map(t => String(t).toLowerCase()));
  for (const t of b) if (set.has(String(t).toLowerCase())) return true;
  return false;
}

// Count how many tags are shared between two full tag lists (case-insensitive).
// Iterates every entry in both arrays — no truncation at any point.
// Used wherever a node must share at least 2 tags to qualify as "related".
function tagsSharedCount(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  const setA = new Set(a.map(t => String(t).toLowerCase()));
  let count = 0;
  for (const t of b) if (setA.has(String(t).toLowerCase())) count++;
  return count;
}

// Build seeds from selected tags across BOTH projects and children.
// Prefer children over projects when overlap is tied.
function buildSeedsFromSelectedTags(selectedTags) {
  const sel = new Set((selectedTags || []).map(s => String(s).toLowerCase()));

  function overlap(tags) {
    let k = 0;
    for (const t of (tags || [])) if (sel.has(String(t).toLowerCase())) k++;
    return k;
  }

  // Ensure registries are ready
  if (!TAG_REGISTRY || TAG_REGISTRY.length === 0) rebuildRegistries();

  // Score every node (projects + children)
  const scored = TAG_REGISTRY
    .map(n => ({ n, ov: overlap(n.tags) }))
    .filter(x => x.ov > 0);

  // Sort: more overlap first, and among equals, CHILD before PROJECT
  scored.sort((A, B) => {
    if (B.ov !== A.ov) return B.ov - A.ov;
    const aChild = (A.n.kind === 'child'), bChild = (B.n.kind === 'child');
    return (aChild === bChild) ? 0 : (aChild ? -1 : 1);
  });

  // Limit if you want (optional)
  const MAX_SEEDS = 30;
  return scored.slice(0, MAX_SEEDS).map(x => x.n);
}

function buildNodeRegistry() {
  const reg = new Map();
  function upsert(def) {
    if (!def || !def.title) return;
    if (!reg.has(def.title)) {
      reg.set(def.title, {
        title: def.title,
        tags: Array.isArray(def.tags) ? def.tags.slice() : [],
        info: def.info || {},
        children: Array.isArray(def.children) ? def.children.slice() : []
      });
    } else {
      const cur = reg.get(def.title);
      const tagSet = new Set(cur.tags);
      for (const t of (def.tags || [])) tagSet.add(t);
      cur.tags = Array.from(tagSet);
      if (Array.isArray(def.children)) {
        const byTitle = new Map(cur.children.map(c => [c.title, c]));
        for (const c of def.children) if (!byTitle.has(c.title)) cur.children.push(c);
      }
      if (def.info) cur.info = { ...cur.info, ...def.info };
    }
  }
  for (const p of PROJECTS) {
    upsert(p);
    if (Array.isArray(p.children)) for (const c of p.children) upsert(c);
  }
  return reg;
}
// const NODE_REGISTRY = buildNodeRegistry();
let NODE_REGISTRY = [];

function rebuildRegistries() {
  TAG_REGISTRY  = buildTagRegistry();
  NODE_REGISTRY = buildNodeRegistry();
}


function getDirectRelatives(centerTitle) {
  // Use TAG_REGISTRY direct-children lookup so any node — whether stored as
  // a project or as a child row — can surface its own children correctly.
  if (!TAG_REGISTRY || !TAG_REGISTRY.length) rebuildRegistries();

  const selfEntry = TAG_REGISTRY.find(n => n.title === centerTitle);
  const center = selfEntry
    ? { title: selfEntry.title, tags: selfEntry.tags || [], info: selfEntry.info || { category: "Node" } }
    : { title: centerTitle, tags: [], info: { category: "Node" } };

  // Children strictly by parent_title match
  const children = lookupDirectChildren(centerTitle).map(c => ({
    title: c.title, tags: c.tags || [], info: c.info || { category: "Subnode" }
  }));

  // Fallback to NODE_REGISTRY if TAG_REGISTRY yielded nothing
  if (!children.length) {
    const def = (NODE_REGISTRY && NODE_REGISTRY.get) ? NODE_REGISTRY.get(centerTitle) : null;
    if (def && Array.isArray(def.children)) {
      children.push(...def.children.map(c => ({
        title: c.title, tags: c.tags || [], info: c.info || { category: "Subnode" }
      })));
    }
  }

  return { center, children };
}


// Spawn a graph centered on nodeDef.  Called by restoreNodeFromUrl and the
// sheet-reload path.  Assumes graph state has already been cleared by the caller.
window.focusNodeGraph = function focusNodeGraph(nodeDef) {
  if (!nodeDef) return;
  const title = (nodeDef.title || nodeDef.label || "").trim();
  if (!title) return;

  if (!TAG_REGISTRY || !TAG_REGISTRY.length) rebuildRegistries();

  // Resolve data from registry (caller may pass a GraphNode with stale info)
  const regEntry = TAG_REGISTRY.find(n => n.title === title);
  const tags = (regEntry ? regEntry.tags : null) || nodeDef.tags || [];
  const info = (regEntry ? regEntry.info : null) || nodeDef.info || { category: "Node" };

  const { cx, cy } = graphScreenCenter();
  const s = scaleFactor || 1;

  centerNode = new GraphNode(title, cx / s, cy / s, tags, true, false, info);
  centerNode.fixed = true;
  nodes.push(centerNode);
  activeNode = centerNode;

  // Direct children by parent_title
  const kids = lookupDirectChildren(title);
  const N = kids.length;
  if (N > 0) {
    const R   = UI.spawnRadius || 180;
    const off = random(TWO_PI);
    for (let i = 0; i < N; i++) {
      const a = off + (TWO_PI * i) / Math.max(1, N);
      const c = kids[i];
      const child = new GraphNode(
        c.title,
        centerNode.x + Math.cos(a) * R,
        centerNode.y + Math.sin(a) * R,
        c.tags || [], false, true, c.info || { category: "Subnode" }, 0.65
      );
      child.spawned = true; child.spawnT = 0;
      nodes.push(child);
      const L = new GraphLink(centerNode, child);
      L.restLength = UI.childRest || 140;
      L.strength   = 0.06;
      links.push(L);
    }
  }

  if (typeof centerCameraOnNode === "function") centerCameraOnNode(centerNode, true);
};


// Return all TAG_REGISTRY entries whose parent field matches parentTitle.
// This is the authoritative lookup for direct children — based strictly on
// the parent_title column from the sheet, not on tag overlap.
function lookupDirectChildren(parentTitle) {
  if (!TAG_REGISTRY || !TAG_REGISTRY.length) return [];
  return TAG_REGISTRY.filter(n => n.parent === parentTitle);
}

function getRelativesByTags(centerNode) {
  const centerTitle = centerNode.title;
  const centerTags  = Array.isArray(centerNode.tags) ? centerNode.tags : [];

  // ── PRIORITY PATH: explicit parent_title children ──────────────────────
  // If this node has sheet-defined children (matched by parent_title), show
  // those directly.  Tag overlap is NOT used here — hierarchy is purely
  // relationship-based, not row-type-based.
  const directKids = lookupDirectChildren(centerTitle);
  if (directKids.length > 0) {
    // Surface this node's own parent as context (if it has one)
    const parents = [];
    const selfEntry = TAG_REGISTRY.find(n => n.title === centerTitle);
    if (selfEntry && selfEntry.parent) {
      const parentEntry = TAG_REGISTRY.find(n => n.title === selfEntry.parent);
      if (parentEntry) parents.push({ ...parentEntry });
    }
    // directMode=true tells refocusToByTags not to cap the children list
    return { parents, children: directKids.map(n => ({ ...n })), directMode: true };
  }

  // ── FALLBACK: tag-based relatives (original behaviour) ──────────────────
  const parents  = [];
  const children = [];

  // Require at least 2 shared tags for a project to appear in the parents ring.
  // tagsSharedCount compares the FULL tag list of each node — no truncation.
  for (const p of PROJECTS) {
    const projectHits = tagsSharedCount(centerTags, p.tags || []);
    const bestChildHit = Array.isArray(p.children)
      ? p.children.reduce((best, c) => Math.max(best, tagsSharedCount(centerTags, c.tags || [])), 0)
      : 0;
    if (Math.max(projectHits, bestChildHit) >= 2 && centerTitle !== p.title) {
      parents.push({
        kind: "project",
        title: p.title,
        tags: p.tags || [],
        info: p.info || { category: "Project" },
        parent: null
      });
    }
  }

  // Only exclude nodes that will actually be shown in the parents ring.
  // Nodes that share enough tags but don't make the parents cap must still
  // be allowed to appear in the children ring — otherwise they vanish entirely.
  const shownParentTitles = new Set(parents.slice(0, LIMITS.tagParents).map(p => p.title));

  // Require at least 2 shared tags for a node to appear in the children ring.
  for (const n of TAG_REGISTRY) {
    if (n.title === centerTitle) continue;
    if (shownParentTitles.has(n.title)) continue;
    if (tagsSharedCount(centerTags, n.tags || []) >= 2) {
      children.push({ ...n });
    }
  }

  return { parents, children: children.slice(0, LIMITS.tagChildren), directMode: false };
}



// Choose best project (prefer AND; fallback to best OR)
function pickBestProject(selectedTags) {
    const sel = new Set(selectedTags);
    if (sel.size === 0) return null;
  
    let candidates = PROJECTS.filter(p => [...sel].every(t => p.tags.includes(t)));
    if (candidates.length === 0) {
      candidates = PROJECTS
        .map(p => ({ p, overlap: p.tags.filter(t => sel.has(t)).length }))
        .filter(x => x.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap)
        .map(x => x.p);
    }
    return candidates[0] || null;
  }

  // Build an expanded subgraph for a focus node:
// - center node
// - its explicit .children (from PROJECTS dataset)
// - plus "related" nodes that share at least one tag with the focus or its children.

// Build expanded subgraph for a focused project:
// - center (the focus project)
// - explicit children from the dataset
// - "related" projects sharing enough tags with the focus/children pool
function buildExpandedForFocus(focusTitle) {
  // Quick index of projects
  const byTitle = new Map(PROJECTS.map(p => [p.title, p]));
  const proj = byTitle.get(focusTitle);

  // ─────────────────────────────
  // CASE 1: focusing a PROJECT
  // ─────────────────────────────
  if (proj) {
    const focusTags = Array.isArray(proj.tags) ? proj.tags : [];
    const children = (proj.children || []).map(c => ({
      title: c.title,
      tags: Array.isArray(c.tags) ? c.tags.slice() : [],
      info: c.info || { category: "Subnode" }
    }));

    // Build the full tag pool (focus + all its children) for shared-count comparison.
    const tagPoolArr = focusTags.slice();
    for (const c of children) for (const t of (c.tags || [])) tagPoolArr.push(t);

    // Determine the structural parent title so it is excluded from the related list
    // (the parent is already linked hierarchically and would otherwise consume a slot).
    const parentTitle = (proj.info && proj.info._parentTitle) ? proj.info._parentTitle : null;

    const MIN_SHARED = 2;
    const relatedScored = [];
    for (const p of PROJECTS) {
      if (p.title === proj.title) continue;
      if (parentTitle && p.title === parentTitle) continue; // skip structural parent
      // Use tagsSharedCount (case-insensitive) — same function used in CASE 2.
      const shared = tagsSharedCount(p.tags || [], tagPoolArr);
      if (shared >= MIN_SHARED) {
        relatedScored.push({
          title: p.title,
          tags: (Array.isArray(p.tags) ? p.tags : []).slice(),
          info: p.info || { category: "Project" },
          shared
        });
      }
    }
    relatedScored.sort((a, b) => b.shared - a.shared);
    const related = relatedScored.slice(0, LIMITS.focusRelated).map(r => ({
      title: r.title, tags: r.tags, info: r.info
    }));

    const seen = new Set([proj.title]);
    const dedup = list => {
      const out = [];
      for (const n of list) { if (!seen.has(n.title)) { seen.add(n.title); out.push(n); } }
      return out;
    };

    let childrenList = dedup(children).slice(0, LIMITS.focusChildren);
    let relatedList  = dedup(related).slice(0, LIMITS.focusRelated);

    return {
      center: { title: proj.title, tags: (proj.tags || []).slice(), info: proj.info || { category: "Project" } },
      children: childrenList,
      related:  relatedList
    };
  }

  // ─────────────────────────────
  // CASE 2: focusing a CHILD
  // ─────────────────────────────
  let parent = null, child = null;
  outer: for (const p of PROJECTS) {
    for (const c of (p.children || [])) {
      if (c.title === focusTitle) { parent = p; child = c; break outer; }
    }
  }
  if (!child) {
    // Unknown title
    return { center: null, children: [], related: [] };
  }

  // Center = the child
  const center = {
    title: child.title,
    tags: Array.isArray(child.tags) ? child.tags.slice() : [],
    info: child.info || { category: "Subnode" }
  };

  // Siblings = other children of the parent
  const siblings = (parent.children || [])
    .filter(c => c.title !== child.title)
    .map(c => ({ title: c.title, tags: c.tags || [], info: c.info || { category: "Subnode" } }))
    .slice(0, LIMITS.focusChildren);

  // Related = parent project first, then other projects that share ≥2 tags with the child.
  // tagsSharedCount iterates the full tag list of both nodes — no truncation.
  const centerTagArr = center.tags || [];
  const relatedProjects = [];
  for (const p of PROJECTS) {
    if (p.title === parent.title) continue;
    if (tagsSharedCount(p.tags || [], centerTagArr) >= 2) {
      relatedProjects.push({ title: p.title, tags: (p.tags || []).slice(), info: p.info || { category: "Project" } });
    }
  }
  // Put parent first; then cap others
  const related = [{ title: parent.title, tags: parent.tags || [], info: parent.info || { category: "Project" } }]
    .concat(relatedProjects)
    .slice(0, LIMITS.focusRelated);

  return { center, children: siblings, related };
}



  
  // Build clear, predictable children for the chosen project
  // function buildChildrenForProject(project, selectedTags) {
  //   const kids = [];
  
  //   if (project.children && project.children.length) {
  //     for (const c of project.children) kids.push({ title: c.title, tags: c.tags || [], category: "Child" });
  //   }
  
  //   for (const t of project.tags) {
  //     if (!selectedTags.includes(t)) kids.push({ title: `Tag: ${t}`, tags: [t], category: "Tag" });
  //   }
  
  //   kids.push({ title: "Context",     tags: ["Context"], category: "Info", desc: "High-level context about this project." });
  //   kids.push({ title: "Description", tags: ["Purpose"], category: "Info", desc: project.info?.desc || "Project overview." });
  //   kids.push({ title: "Tools",       tags: ["Process"], category: "Info", desc: project.info?.tools || "Methods & tools used." });
  
  //   return kids;
  // }
  
  // Build graph from current selection
  function launchGraphFromSelection() {
    if (typeof applyMobileSpacing === "function") applyMobileSpacing();
    mode = "graph";
  
    

    const selectedTags = [];
for (const s of selected) s.tags.forEach(t => selectedTags.push(t));

// Build seeds across projects + children and prefer a child when overlap ties
if (!TAG_REGISTRY || TAG_REGISTRY.length === 0) rebuildRegistries();

// case-insensitive overlap
const sel = new Set(selectedTags.map(x => String(x).toLowerCase()));
const overlap = tags => (tags || []).reduce((k, t) => k + (sel.has(String(t).toLowerCase()) ? 1 : 0), 0);

// score every node (projects + children)
const scored = TAG_REGISTRY
  .map(n => ({ n, ov: overlap(n.tags) }))
  .filter(x => x.ov > 0)
  .sort((A, B) => {
    if (B.ov !== A.ov) return B.ov - A.ov;                 // more overlap first
    const aChild = A.n.kind === 'child', bChild = B.n.kind === 'child';
    return (aChild === bChild) ? 0 : (aChild ? -1 : 1);     // tie → child first
  });

// pick best seed (child if available), else fall back to your old picker
const chosen = scored.length ? scored[0].n : pickBestProject(selectedTags);




    nodes = []; links = [];centerNode = null;
    activeNode = null;
    if (!localStorage.getItem('graphTipSeen')) {
      openGraphTip();
    } else {
      // they've seen it before—still mark we're in graph mode for CSS if you want
      document.body.classList.add('mode-graph', 'graphTip-dismissed');
    }
    if (window.renderTagsRailRandom) window.renderTagsRailRandom();
    if (!chosen) {
      centerNode = new GraphNode("No match", baseWidth/2, baseHeight/2, [], true, false, {
        desc: "No project matches your selection. Try different tags.",
        category: "Center"
      });
      centerNode.fixed = true; nodes.push(centerNode); activeNode = centerNode;
      return;
    }
  
    const { cx, cy } = graphScreenCenter();
    centerNode = new GraphNode(
      chosen.title,
      cx / (scaleFactor || 1),
      cy / (scaleFactor || 1),
      chosen.tags,
      true, false,
      chosen.info || {}
    );
    centerNode.fixed = true; nodes.push(centerNode); activeNode = centerNode;
  
    // const children = buildChildrenForProject(chosen, selectedTags);
    // const N = children.length; const off = random(TWO_PI);
  
    // for (let i = 0; i < N; i++) {
    //   const a = off + (TWO_PI * i) / Math.max(1, N);
    //   const c = children[i];
    //   const child = new GraphNode(c.title, centerNode.x, centerNode.y, c.tags || [], false, true, {
    //     desc: c.desc || "—",
    //     category: c.category || "Child"
    //   });
    //   child.birth.parent = centerNode;
    //   child.birth.angle  = a;
    //   child.birth.kick   = UI.kick;
  
    //   nodes.push(child);
    //   const L = new GraphLink(centerNode, child);
    //   L.restLength = UI.childRest;
    //   links.push(L);
    // }
  
    // // Light cross-links among children that share a tag
    // for (let i = 1; i < nodes.length; i++) {
    //   for (let j = i + 1; j < nodes.length; j++) {
    //     if (nodes[i].sharesTagWith && nodes[i].sharesTagWith(nodes[j])) {
    //       links.push(new GraphLink(nodes[i], nodes[j]));
    //     }
    //   }
    // }

    // Auto-expand related nodes immediately so users see the matrix without needing to click
    if (typeof refocusToByTags === "function" && centerNode) {
      refocusToByTags(centerNode);
    }
  }
  


  
  function refocusToByTags(clicked) {
    if (!clicked) return;
  
    const center = {
      title: clicked.title || clicked.label,
      tags: Array.isArray(clicked.tags) ? clicked.tags : [],
      info: clicked.info || { category: "Node" }
    };
  
    const { parents, children, directMode } = getRelativesByTags(center);

    // When children come from an explicit parent_title match (directMode), show
    // ALL of them — do not cap.  The LIMITS cap only applies to the tag-based
    // fallback, where unbounded results would create visual noise.
    const parentsLim  = (parents  || []).slice(0, LIMITS.tagParents);
    const childrenLim = directMode ? (children || []) : (children || []).slice(0, LIMITS.tagChildren);
    
    // Keep set (use the limited lists!)
    const keep = new Set([center.title, ...parentsLim.map(p => p.title), ...childrenLim.map(c => c.title)]);
 
  
    // Prune nodes
    nodes = nodes.filter(n => keep.has(n.title || n.label));
  
    // Prune links (GraphLink uses a/b in your code)
    links = links.filter(L => {
      const s = (L.a && (L.a.title || L.a.label)) || L.a;
      const t = (L.b && (L.b.title || L.b.label)) || L.b;
      return keep.has(s) && keep.has(t);
    });
  
    // Reuse clicked object as center if present; else create one at its current position
    let centerExisting = nodes.find(n => (n.title || n.label) === center.title);
    if (!centerExisting) {
      centerExisting = new GraphNode(center.title, clicked.x, clicked.y, center.tags || [], true, false, center.info);
      nodes.push(centerExisting);
    }
    centerNode = centerExisting;
    activeNode = centerExisting;
  
    // Map for quick lookup
    const byTitle = new Map(nodes.map(n => [n.title || n.label, n]));
  
    // Spawn parents around the center (inner ring)
    const Rpar = UI.spawnRadiusParent || (UI.spawnRadius ? UI.spawnRadius * 0.65 : 120);
    const offP = random(TWO_PI);

    for (let i = 0; i < parentsLim.length; i++) {
      const p = parentsLim[i];

      let par = byTitle.get(p.title);
      if (!par) {
        const a = offP + (TWO_PI * i) / Math.max(1, parents.length);
        par = new GraphNode(
          p.title,
          centerNode.x + Math.cos(a) * Rpar,
          centerNode.y + Math.sin(a) * Rpar,
          p.tags || [],
          false, true,
          p.info || { category: "Project" },
          0.30
        );
        par.spawned = true; par.spawnT = 0;
        nodes.push(par);
        byTitle.set(p.title, par);
      } else {
        par.nodeOpacity = 0.30;
      }
      if (!links.some(L => (L.a === par && L.b === centerNode) || (L.a === centerNode && L.b === par))) {
        const Lnk = new GraphLink(par, centerNode);
        Lnk.restLength = (UI.childRest || 140) * 0.9;
        Lnk.strength   = 0.06;
        links.push(Lnk);
      }
    }
  
    // Spawn tag-related children (outer ring)
    const Rchild = UI.spawnRadius || 180;
    const offC   = random(TWO_PI);
    for (let i = 0; i < childrenLim.length; i++) {
      const c = childrenLim[i];
      const childOpacity = directMode ? 0.65 : 0.30;
      let child = byTitle.get(c.title);
      if (!child) {
        const a = offC + (TWO_PI * i) / Math.max(1, children.length);
        child = new GraphNode(
          c.title,
          centerNode.x + Math.cos(a) * Rchild,
          centerNode.y + Math.sin(a) * Rchild,
          c.tags || [],
          false, true,
          c.info || { category: c.kind === "project" ? "Project" : "Subnode" },
          childOpacity
        );
        child.spawned = true; child.spawnT = 0;
        nodes.push(child);
        byTitle.set(c.title, child);
      } else {
        child.nodeOpacity = childOpacity;
      }
      if (!links.some(L => (L.a === centerNode && L.b === child) || (L.a === child && L.b === centerNode))) {
        const L2 = new GraphLink(centerNode, child);
        L2.restLength = UI.childRest || 140;
        L2.strength   = 0.06;
        links.push(L2);
      }
    }
    
  
    // Optional cross-links among non-center nodes by tag overlap
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (a === centerNode || b === centerNode) continue;
        if (a.sharesTagWith && a.sharesTagWith(b)) {
          if (!links.some(L => (L.a === a && L.b === b) || (L.a === b && L.b === a))) {
            const Lx = new GraphLink(a, b);
            Lx.restLength = (UI.childRest || 140) * 0.9;
            Lx.strength   = 0.018;
            links.push(Lx);
          }
        }
      }
    }
  
    // Smoothly center camera on the clicked node (accounts for blue panel offset)
    centerCameraOnNode(centerNode, false);
    if (LAYOUT === "bottom") enforceMinOrbit(centerNode, nodes);
  }
  




// Public helper: build a graph focused on a specific node title
// and center the camera on it. This is used by deep links (?node=...)
// and can also be called manually.
window.launchGraphFromNodeTitle = function launchGraphFromNodeTitle(focusTitle) {
  const title = (focusTitle || "").trim();
  if (!title) return;

  if (!Array.isArray(PROJECTS) || PROJECTS.length === 0) return;

  if (!TAG_REGISTRY || !NODE_REGISTRY || (NODE_REGISTRY.size === 0)) {
    if (typeof rebuildRegistries === "function") rebuildRegistries();
  }

  const { center, children } = getDirectRelatives(title);
  if (!center || !center.title) return;

  // 🔵 make deep-link look like a “normal” graph session
  if (typeof applyMobileSpacing === "function") applyMobileSpacing();
  mode = "graph";
  showBluePanel    = true;   // <- draw the blue UI panel
  entryCircleAlpha = 0;      // <- never draw the big circle
  entryCircleFading = false; // <- no fade animation

  // Enter graph mode
  if (typeof applyMobileSpacing === "function") applyMobileSpacing();
  mode = "graph";

  if (!localStorage.getItem("graphTipSeen")) {
    openGraphTip();
  } else {
    document.body.classList.add("mode-graph", "graphTip-dismissed");
  }
  if (window.renderTagsRailRandom) window.renderTagsRailRandom();

  // Reset graph state
  nodes = [];
  links = [];
  centerNode = null;
  activeNode = null;

  const { cx, cy } = graphScreenCenter();
  const s = scaleFactor || 1;

  // Create center node at the visible graph center
  centerNode = new GraphNode(
    center.title,
    cx / s,
    cy / s,
    center.tags || [],
    true,
    false,
    center.info || { category: "Node" }
  );
  centerNode.fixed = true;
  nodes.push(centerNode);
  activeNode = centerNode;

  // Spawn children in a ring around the center
  const kids = Array.isArray(children) ? children : [];
  const N = kids.length;
  if (N > 0) {
    const R = UI.spawnRadius || 180;
    const off = random(TWO_PI);

    for (let i = 0; i < N; i++) {
      const a = off + (TWO_PI * i) / Math.max(1, N);
      const c = kids[i];
      const child = new GraphNode(
        c.title,
        centerNode.x + Math.cos(a) * R,
        centerNode.y + Math.sin(a) * R,
        c.tags || [],
        false,
        true,
        c.info || { category: "Subnode" },
        0.65
      );
      child.spawned = true;
      child.spawnT  = 0;
      nodes.push(child);

      const L = new GraphLink(centerNode, child);
      L.restLength = UI.childRest || 140;
      L.strength   = 0.06;
      links.push(L);
    }

    // Optional: cross-links among non-center nodes by tag overlap
    for (let i = 1; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (a === centerNode || b === centerNode) continue;
        if (a.sharesTagWith && a.sharesTagWith(b)) {
          const Lx = new GraphLink(a, b);
          Lx.restLength = (UI.childRest || 140) * 0.9;
          Lx.strength   = 0.02;
          links.push(Lx);
        }
      }
    }
  }

  // Make sure the camera is on the new center node
  if (typeof centerCameraOnNode === "function") {
    centerCameraOnNode(centerNode, true);  // instant center
  }
};




function runGraph() {
  // --- HOVER PICK (for the blue panel) ---
  hoveredNode = null;
  const hitR = Math.max(24, (UI.rNode || 19) * (scaleFactor || 1) * 1.25);
  let best = null, bestD = Infinity;
  for (const n of nodes) {
    const d = dist(pointer.worldX, pointer.worldY, n.x, n.y);
    if (d <= hitR && d < bestD) { best = n; bestD = d; }
  }
  hoveredNode = best;    // don't set active here

// --- PHYSICS ---
for (const n of nodes) n.resetForces();
for (const n of nodes) n.applyRepulsion(nodes);
for (const l of links) l.applyAttraction();
for (const n of nodes) n.updateInGraph();

for (const n of nodes) clampNodeToPlayableRect(n);

// --- CAMERA EASING (do this every frame) ---
worldOffsetX = lerp(worldOffsetX, cam.tx, cam.easing);
worldOffsetY = lerp(worldOffsetY, cam.ty, cam.easing);

// --- DRAW ---
push();
translate(worldOffsetX, worldOffsetY);
scale(scaleFactor);
for (const l of links) l.display();
for (const n of nodes) n.display();
pop();

}





// Where is the *visible* graph center on screen, excluding the blue panel?
function graphScreenCenter() {
  const sW = (typeof baseWidth  !== "undefined") ? baseWidth  : width;
  const sH = (typeof baseHeight !== "undefined") ? baseHeight : height;
 

  // Blue panel sizes you already use in ui_topbar.js
   const headerH = (typeof window.getHeaderHeight === "function")
     ? window.getHeaderHeight()
     : (typeof __measureHeaderHeight === "function" ? __measureHeaderHeight() : 0);
   const panelLeft = (LAYOUT === "left") ? (sideBarW || 0) : 0;
   const panelTop  = (LAYOUT === "top")  ? (headerH + (topBarH || 0)) : headerH;

  const availW = sW - panelLeft;
  const availH = sH - panelTop;

  const cx = panelLeft + availW / 2;  // middle of the usable width
  const cy = panelTop  + availH / 2;  // middle of the usable height
  return { cx, cy };
}
// console.log removed
// Smooth camera to put a world point under the screen’s graph center
function centerCameraOnNode(n, instant = false) {
  const s = (scaleFactor || 1);
  const { cx, cy } = graphScreenCenter();
  const tx = (cx / s) - n.x;
  const ty = (cy / s) - n.y;

  if (instant) {
    worldOffsetX = tx; worldOffsetY = ty;
    cam.tx = tx; cam.ty = ty;
  } else {
    cam.tx = tx; cam.ty = ty; // eased in runGraph()
  }
}


// Faster spread: push siblings beyond the minimum orbit and give them a small outward velocity.
// Call right after you spawn nodes/links.
function enforceMinOrbit(center, allNodes, opts = {}) {
  if (!center) return;

  // ---- tunables (override via opts or UI) ----
  const isMobile        = (typeof LAYOUT !== "undefined" && LAYOUT === "bottom");
  const baseOrbit       = (UI?.spawnRadius || 180);
  const orbitMul        = opts.orbitMul ?? (isMobile ? (UI?.orbitMulMobile ?? 1.35) : 1.10); // >1 = farther than spawnRadius
  const overshoot       = opts.overshoot ?? (isMobile ? (UI?.orbitOvershoot ?? 1.12) : 1.0); // >1 = push past target, settle back
  const velocityKick    = opts.kick ?? (isMobile ? (UI?.orbitKick ?? 5.0) : 0.0);             // outward vx/vy
  const zeroVelOnSnap   = opts.zeroVelOnSnap ?? false; // set true if you *don’t* want the kick when snapping

  // target radius (min) and overshoot target
  const minOrbit    = baseOrbit * orbitMul;
  const snapTarget  = minOrbit * overshoot;

  for (const n of allNodes) {
    if (n === center) continue;

    const dx = n.x - center.x;
    const dy = n.y - center.y;
    let d = Math.hypot(dx, dy) || 0.0001;

    if (d < snapTarget) {
      // place directly on the overshoot circle — fast visual spread
      const s = snapTarget / d;
      n.x = center.x + dx * s;
      n.y = center.y + dy * s;

      // velocity: either zero (hard snap) or a small outward kick
      if (zeroVelOnSnap) {
        n.vx = 0; n.vy = 0;
      } else if (velocityKick > 0) {
        const ux = dx / (d * s); // unit vector at the *new* position
        const uy = dy / (d * s);
        n.vx = (n.vx || 0) + ux * velocityKick;
        n.vy = (n.vy || 0) + uy * velocityKick;
      }
    }
  }
}



// Shuffle helper
function shuffleInPlace(a){
  for (let i=a.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// case-insensitive tag test
function hasTagCI(list, key){
  if (!Array.isArray(list)) return false;
  const k = String(key).toLowerCase();
  return list.some(t => String(t).toLowerCase() === k);
}

// Build + show a random tag cluster
window.launchTagCluster = function launchTagCluster(tagKey){
  if (!PROJECTS || !PROJECTS.length) return;

  if (!TAG_REGISTRY || TAG_REGISTRY.length === 0) rebuildRegistries();

  // Use TAG_REGISTRY — already deduplicated by title via Map in buildTagRegistry.
  // The old PROJECTS double-walk (top-level + .children) caused each child node to
  // appear twice, because rowsToProjects registers every child as a top-level PROJECTS
  // entry AND stores it in its parent's .children array.
  const matches = TAG_REGISTRY.filter(n => hasTagCI(n.tags, tagKey))
    .map(n => ({ title: n.title, tags: (n.tags || []), info: n.info || { category: n.kind === 'child' ? 'Subnode' : 'Project' } }));

  if (!matches.length){
    console.warn('[tag cluster] no matches for', tagKey);
    return;
  }

  // random subset
  const MAX = 12; // tune
  shuffleInPlace(matches);
  const payload = matches.slice(0, MAX);

  // enter graph mode
  if (typeof applyMobileSpacing === "function") applyMobileSpacing();
  mode = "graph";

  if (!localStorage.getItem('graphTipSeen')) {
    openGraphTip();
  } else {
    document.body.classList.add('mode-graph', 'graphTip-dismissed');
  }
  
 
  if (window.renderTagsRailRandom) window.renderTagsRailRandom();
  


  // reset graph arrays
  nodes = []; links = []; centerNode = null; activeNode = null;

  // center = tag hub
  const { cx, cy } = graphScreenCenter();
  const label = `#${(tagKey||'').toLowerCase()}`;
  centerNode = new GraphNode(
    label,
    cx / (scaleFactor || 1),
    cy / (scaleFactor || 1),
    [String(tagKey)],
    true, false,
 { category: 'Tag', desc: `Random selection for tag “${label}”` }
  );
  centerNode.fixed = true;
  nodes.push(centerNode);
  activeNode = centerNode;

  // place payload around in a circle
  const N = payload.length;
  const R = UI.spawnRadius || 180;
  const off = random(TWO_PI);

  for (let i=0; i<N; i++){
    const a = off + (TWO_PI * i)/Math.max(1, N);
    const d = payload[i];
    const n = new GraphNode(
      d.title,
      centerNode.x + Math.cos(a)*R,
      centerNode.y + Math.sin(a)*R,
      d.tags || [],
      false, true,
      d.info || { category:'Node' },
      0.30
    );
    n.spawned = true; n.spawnT = 0;
    nodes.push(n);

    const L = new GraphLink(centerNode, n);
    L.restLength = UI.childRest || 140;
    L.strength   = 0.06;
    links.push(L);
  }

  // light cross-links if nodes share any tag (not just the chosen tag)
  for (let i=1; i<nodes.length; i++){
    for (let j=i+1; j<nodes.length; j++){
      const a = nodes[i], b = nodes[j];
      if (a === centerNode || b === centerNode) continue;
      if (a.sharesTagWith && a.sharesTagWith(b)){
        const L = new GraphLink(a, b);
        L.restLength = (UI.childRest || 140) * 0.9;
        L.strength   = 0.02;
        links.push(L);
      }
    }
  }

  // nice spread
  enforceMinOrbit(centerNode, nodes, { orbitMul: 1.35, overshoot: 1.08, kick: 4 });

  // focus hub
  centerCameraOnNode(centerNode, false);
  if (LAYOUT === 'bottom') enforceMinOrbit(centerNode, nodes);
};





// Try to read ?node=<title> from the URL and focus that node.
// Returns true if a node was found and graph was launched.
function restoreNodeFromUrl() {
  const qs = new URLSearchParams(window.location.search);
  const raw = qs.get('node');
  if (!raw) return false;

  const title = decodeURIComponent(raw);

  const def = NODE_REGISTRY.get(title);
  if (!def) {
    console.warn('No node in registry for URL title:', title);
    return false;
  }

  // Switch to graph mode instead of the select screen
  mode = "graph";

  // Wipe any old graph state
  nodes = [];
  links = [];
  centerNode = null;
  activeNode = null;

  // Build subgraph around this node
  focusNodeGraph({
    title: def.title,
    tags: def.tags || [],
    info: def.info || {}
  });








// ====== BUILD + COPY A DEEP LINK FOR A NODE ======
function buildNodeUrl(nodeTitle) {
  if (!nodeTitle) return window.location.href;

  const url = new URL(window.location.href);

  // Point to nodes.html (this page)
  url.pathname = url.pathname.replace(/[^/]+$/, "nodes.html");

  // Let URLSearchParams encode the value
  url.searchParams.set("node", nodeTitle.trim());

  return url.toString();
}

function copyLinkForNode(node) {
  if (!node || !node.title) {
    console.warn("copyLinkForNode: no node to share");
    return;
  }

  const text = buildNodeUrl(node.title);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(err => {
      console.warn("Clipboard API failed, falling back:", err);
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    console.log("Copied node link (fallback):", text);
  } catch (e) {
    console.error("Failed to copy link:", e);
  }
  document.body.removeChild(ta);
}











  
  // Make sure camera is centered on the new centerNode
  if (centerNode) {
    centerCameraOnNode(centerNode, true);
    activeNode = centerNode;
  }

  return true;
}
function captureCurrentGraphState() {
  return {
    nodes: nodes.map(n => ({
      title: n.title,
      x: n.x,
      y: n.y,
      tags: Array.isArray(n.tags) ? n.tags.slice() : [],
      info: n.info ? {...n.info} : {},
      fixed: !!n.fixed,
      spawned: !!n.spawned,
      hidden: !!n.hidden,
      nodeOpacity: n.nodeOpacity ?? 1.0,
    })),

    links: links.map(L => ({
      a: L.a.title,
      b: L.b.title,
      restLength: L.restLength,
      strength: L.strength
    })),

    centerNode: centerNode ? centerNode.title : null,
    activeNode: activeNode ? activeNode.title : null,

    camera: {
      worldOffsetX,
      worldOffsetY,
      tx: cam.tx,
      ty: cam.ty,
      scaleFactor
    }
  };
}
function restoreGraphState(state) {
  if (!state) return;

  // rebuild nodes
  nodes = state.nodes.map(n => {
    const g = new GraphNode(n.title, n.x, n.y, n.tags, n.fixed, n.spawned, n.info, n.nodeOpacity ?? 1.0);
    g.hidden = n.hidden;
    return g;
  });

  // lookup table
  const byTitle = new Map(nodes.map(n => [n.title, n]));

  // rebuild links
  links = state.links.map(L => {
    const a = byTitle.get(L.a);
    const b = byTitle.get(L.b);
    if (!a || !b) return null;
    const G = new GraphLink(a, b);
    G.restLength = L.restLength;
    G.strength   = L.strength;
    return G;
  }).filter(Boolean);

  centerNode = byTitle.get(state.centerNode) || null;
  activeNode = byTitle.get(state.activeNode) || null;

  worldOffsetX = state.camera.worldOffsetX;
  worldOffsetY = state.camera.worldOffsetY;
  cam.tx       = state.camera.tx;
  cam.ty       = state.camera.ty;
  scaleFactor  = state.camera.scaleFactor;
}


// // ========== FOCUS NODE FROM URL PARAM ==========
// // Auto-launch graph from ?node=Some%20Title
// (function () {
//   const params = new URLSearchParams(window.location.search);
//   const raw = params.get("node");
//   if (!raw) return;

//   const focusTitle = decodeURIComponent(raw).trim();
//   if (!focusTitle) return;

//   // If we're already in graph mode, don't interfere
//   if (typeof window.mode !== "undefined" && window.mode === "graph") {
//     return;
//   }

//   // Wait until PROJECTS are loaded and helper exists
//   function ready() {
//     return Array.isArray(window.PROJECTS) &&
//            window.PROJECTS.length > 0 &&
//            typeof window.launchGraphFromNodeTitle === "function";
//   }

//   // Remove ?node= from the URL after we’ve consumed it
//   function consumeParam() {
//     const p = new URLSearchParams(window.location.search);
//     p.delete("node");
//     const qs = p.toString();
//     const newUrl =
//       window.location.pathname +
//       (qs ? "?" + qs : "") +
//       window.location.hash;
//     history.replaceState(null, "", newUrl);
//   }

//   function tryOnce() {
//     if (!ready()) return false;
//     window.launchGraphFromNodeTitle(focusTitle);
//     consumeParam();
//     return true;
//   }

//   if (tryOnce()) return;

//   let tries = 0;
//   const maxTries = 40;  // ~6s at 150ms
//   const timer = setInterval(() => {
//     tries++;
//     if (tryOnce() || tries >= maxTries) {
//       clearInterval(timer);
//     }
//   }, 150);
// })();