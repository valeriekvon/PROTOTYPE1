// Helper (placement)
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
  
  // /* === Select-mode Tag bubble === */
  // class TagNode {
  //   constructor(label, x, y, tags) {
  //     this.label = label;
  //     this.x = x; this.y = y;
  //     this.r = UI.rTag;
  //     this.tags = tags;
  //     this.vx = 0; this.vy = 0; this.fx = 0; this.fy = 0;
  //     this.dragging = false; this.dx = 0; this.dy = 0;
  //   }
  //   isInside(wx, wy){ return dist(wx, wy, this.x, this.y) < this.r + 12; }
  //   resetForces(){ this.fx = 0; this.fy = 0; }
  //   applyRepulsion(others){
  //     for (const o of others) {
  //       if (o === this) continue;
  //       const dx = this.x - o.x, dy = this.y - o.y;
  //       const d2 = dx*dx + dy*dy + 0.1;
  //       const inv = 1 / Math.sqrt(d2);
  //       const f = UI.repulseTag / d2;
  //       this.fx += dx * inv * f; this.fy += dy * inv * f;
  //     }
  //   }
  //   update(){
  //     if (this.dragging) return;
  //     this.vx += this.fx * 0.01; this.vy += this.fy * 0.01;
  //     this.vx *= 0.92; this.vy *= 0.92;
  //     this.x += this.vx; this.y += this.vy;
  //     this.x = constrain(this.x, this.r, baseWidth - this.r);
  //     this.y = constrain(this.y, this.r, baseHeight - this.r);
  //   }
  //   display(){
  //     noStroke(); fill(COLORS.tagFill); ellipse(this.x, this.y, this.r * 2);
  //     fill(COLORS.tagFill); textSize(UI.fontNode); textAlign(CENTER, TOP);
  //     text(this.label, this.x, this.y + this.r + 6);
  //   }
  // }
  
  /* === Graph Node with birth animation === */
  class GraphNode {
    constructor(title, x, y, tags = [], isCenter = false, isChild = false, info = {}, nodeOpacity = 1.0) {
      this.title = title; this.x = x; this.y = y;
      this.tags = tags; this.isCenter = isCenter; this.isChild = isChild;
      // 1.0 = focused center, 0.65 = direct child, 0.30 = related (2 shared tags)
      this.nodeOpacity = nodeOpacity;

      // All non-center nodes share the same base radius — size is not used for hierarchy
      this.baseR = isCenter ? UI.rCenter : UI.rNode;
      this.r = isCenter ? this.baseR : 0;
  
      this.vx = 0; this.vy = 0; this.fx = 0; this.fy = 0; this.fixed = false;
      this.spawned = false;
      const defaultDesc = isCenter ? "Pick projects by tags and explore relations." : "—";
      this.info = { ...info }; 
      if (!this.info.desc)      this.info.desc      = defaultDesc;
      if (!this.info.category)  this.info.category  = isCenter ? "Center" : "Node";
      if (!this.info.tools)     this.info.tools     = "";
      
  
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
      
  // Bounce against the VISIBLE graph bounds (exclude the blue panel)
const panelLeft = (typeof LAYOUT !== "undefined" && LAYOUT === "left") ? (sideBarW || 0) : 0;
const panelTop  = (typeof LAYOUT !== "undefined" && LAYOUT === "top")  ? (topBarH  || 0) : 0;

// Size of the usable area on screen
const availW = (typeof windowWidth  !== "undefined" ? windowWidth  : width)  - panelLeft;
const availH = (typeof windowHeight !== "undefined" ? windowHeight : height) - panelTop;

// Convert the visible rect from screen → world coordinates using current camera
const s = (typeof scaleFactor !== "undefined" && scaleFactor) ? scaleFactor : 1;
const minX = (((panelLeft+10) - worldOffsetX) / s) + this.baseR;
const maxX = ((((panelLeft-10) + availW) - worldOffsetX) / s) - this.baseR;
const minY = ((panelTop  - worldOffsetY) / s) + this.baseR;
const maxY = (((panelTop  + availH) - worldOffsetY) / s) - this.baseR;

// Clamp with a soft bounce
if (this.x < minX) { this.x = minX; this.vx *= -0.7; }
if (this.x > maxX) { this.x = maxX; this.vx *= -0.7; }
if (this.y < minY) { this.y = minY; this.vy *= -0.7; }
if (this.y > maxY) { this.y = maxY; this.vy *= -0.7; }
    }
  
    display() {
      // Base blue — #0E50C8
      const BR = 14, BG = 80, BB = 200;

      // All nodes share the same base radius — focus is shown via 3 concentric circles, not size
      const targetR = UI?.rNode ?? 20;

      // Smoothly animate toward target radius
      this.r = lerp(this.r || targetR, targetR, 0.2);

      noStroke();

      if (this === centerNode) {
        // Three concentric circles all fitting within rNode diameter:
        // Scale the inner radius so the outermost ring equals rNode exactly.
        const cr = this.r / 1.7; // core radius: outer halo (cr*1.7) = rNode

        // Outer halo  30% opacity  — same diameter as other nodes
        fill(BR, BG, BB, Math.round(255 * 0.30));
        circle(this.x, this.y, cr * 2 * 1.7);

        // Inner halo  65% opacity
        fill(BR, BG, BB, Math.round(255 * 0.65));
        circle(this.x, this.y, cr * 2 * 1.35);

        // Front circle  100% opacity
        fill(BR, BG, BB, 255);
        circle(this.x, this.y, cr * 2);
      } else {
        // Non-center nodes: same size, opacity encodes relationship
        //   0.65 → direct child of focused node
        //   0.30 → related node (2 shared tags)
        fill(BR, BG, BB, Math.round(255 * (this.nodeOpacity ?? 0.65)));
        circle(this.x, this.y, this.r * 2);
      }

      // Label
      fill(40);
      textAlign(CENTER, TOP);
      const fontCenter = (typeof UI !== "undefined" && UI.fontCenter) ? UI.fontCenter : 20;
      const fontNode   = (typeof UI !== "undefined" && UI.fontNode)   ? UI.fontNode   : 14;
      textSize((this === centerNode) ? fontCenter : fontNode);
      text(this.title, this.x, this.y + this.r + 6);
    }
    
    
    
    
    isPointInside(wx, wy) {
      // Hit test matches visual size
      return dist(wx, wy, this.x, this.y) < Math.max(8, this.r || (UI.rNode || 14));
    }
    
    sharesTagWith(other) {
      if (!other || !other.tags) return false;
      for (const t of this.tags) if (other.tags.includes(t)) return true;
      return false;
    }
    
  }

  // Ensure every GraphNode can be hit-tested in WORLD coords
if (typeof GraphNode !== "undefined" && typeof GraphNode.prototype.isPointInside !== "function") {
  GraphNode.prototype.isPointInside = function (wx, wy) {
    const r =
      (typeof this.pickRadius === "function" && this.pickRadius()) ||
      this.baseR || this.r || (UI && UI.rNode) || 16;
    const dx = wx - this.x, dy = wy - this.y;
    return (dx * dx + dy * dy) <= (r * r);
  };
}

  /* === Spring link === */
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
  

 /* === Select-mode Tag bubble (floating + hit-test) === */
/* === Select-mode Tag bubble (smooth floating + hit-test) === */
/* === Select-mode Tag bubble (your original float) === */
/* === Select-mode Tag bubble (original float) === */
class TagNode {
  constructor(label, x, y, tags) {
    this.label = label;
    this.x = x; this.y = y;
    this.r = UI.rTag;
    // Always store an array so downstream code is safe:
    this.tags =
      Array.isArray(tags) ? tags.slice()
      : (typeof tags === "string" && tags.length ? [tags]
      : [label]);

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
    // Bounds are enforced by clampTagToRect() in drawSelectScreen, which uses
    // the actual screen rect — no hard-clamp to baseWidth/baseHeight here.
  }
  display(){
    noStroke(); fill(COLORS.tagFill); ellipse(this.x, this.y, this.r * 2);
    fill(COLORS.tagFill); textSize(UI.fontNode); textAlign(CENTER, TOP);
    text(this.label, this.x, this.y + this.r + 6);
  }
}
// Back-compat if something still references TagBubble
const TagBubble = TagNode;
