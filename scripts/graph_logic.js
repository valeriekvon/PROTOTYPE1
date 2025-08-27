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
  
  // Build clear, predictable children for the chosen project
  function buildChildrenForProject(project, selectedTags) {
    const kids = [];
  
    if (project.children && project.children.length) {
      for (const c of project.children) kids.push({ title: c.title, tags: c.tags || [], category: "Child" });
    }
  
    for (const t of project.tags) {
      if (!selectedTags.includes(t)) kids.push({ title: `Tag: ${t}`, tags: [t], category: "Tag" });
    }
  
    kids.push({ title: "Context",     tags: ["Context"], category: "Info", desc: "High-level context about this project." });
    kids.push({ title: "Description", tags: ["Purpose"], category: "Info", desc: project.info?.desc || "Project overview." });
    kids.push({ title: "Tools",       tags: ["Process"], category: "Info", desc: project.info?.tools || "Methods & tools used." });
  
    return kids;
  }
  
  // Build graph from current selection
  function launchGraphFromSelection() {
    mode = "graph";
  
    const selectedTags = [];
    for (const s of selected) s.tags.forEach(t => selectedTags.push(t));
  
    const chosen = pickBestProject(selectedTags);
    nodes = []; links = [];
  
    if (!chosen) {
      centerNode = new GraphNode("No match", baseWidth/2, baseHeight/2, [], true, false, {
        desc: "No project matches your selection. Try different tags.",
        category: "Center"
      });
      centerNode.fixed = true; nodes.push(centerNode); activeNode = centerNode;
      return;
    }
  
    centerNode = new GraphNode(chosen.title, baseWidth/2, baseHeight/2, chosen.tags, true, false, chosen.info || {
      desc: "Selected project.",
      category: "Project"
    });
    centerNode.fixed = true; nodes.push(centerNode); activeNode = centerNode;
  
    const children = buildChildrenForProject(chosen, selectedTags);
    const N = children.length; const off = random(TWO_PI);
  
    for (let i = 0; i < N; i++) {
      const a = off + (TWO_PI * i) / Math.max(1, N);
      const c = children[i];
      const child = new GraphNode(c.title, centerNode.x, centerNode.y, c.tags || [], false, true, {
        desc: c.desc || "—",
        category: c.category || "Child"
      });
      child.birth.parent = centerNode;
      child.birth.angle  = a;
      child.birth.kick   = UI.kick;
  
      nodes.push(child);
      const L = new GraphLink(centerNode, child);
      L.restLength = UI.childRest;
      links.push(L);
    }
  
    // Light cross-links among children that share a tag
    for (let i = 1; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].sharesTagWith && nodes[i].sharesTagWith(nodes[j])) {
          links.push(new GraphLink(nodes[i], nodes[j]));
        }
      }
    }
  }
  
  function runGraph() {
    hoveredNode = null;
    for (const n of nodes) { if (n.isPointInside(pointer.worldX, pointer.worldY)) { hoveredNode = n; break; } }
    if (hoveredNode) activeNode = hoveredNode;
  
    for (const n of nodes) n.resetForces();
    for (const n of nodes) n.applyRepulsion(nodes);
    for (const l of links) l.applyAttraction();
    for (const n of nodes) n.updateInGraph();
  
    push();
    translate(worldOffsetX, worldOffsetY);
    scale(scaleFactor);
    for (const l of links) l.display();
    for (const n of nodes) n.display();
    pop();
  }
  