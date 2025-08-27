function setupSelectUI() {
    const zx = UI.zonePadX+40;
    const zy = UI.zonePadY;
    const zw = baseWidth - UI.zonePadX * 2;
    const zh = baseHeight - zy - UI.zoneBottom+100;
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
    fill(COLORS.blue); noStroke(); textAlign(CENTER, CENTER);
    textSize(14);
    text(`DRAG UP TO ${UI.maxSelected} TAGS HERE`, dropZone.x + dropZone.w * 0.5, dropZone.y - 100);
  
    noFill(); noStroke();
    rect(dropZone.x, dropZone.y, dropZone.w, dropZone.h, 10);
  
    const cx = dropZone.x + dropZone.w * 0.5;
    const cy = dropZone.y + dropZone.h*0.1;
    const r  = 28 + selected.length * 10;
    noStroke(); fill(COLORS.blueMid); 
    ellipse(cx, cy, r * 2);
    fill(255); textSize(14); 
    text(`${selected.length}/${UI.maxSelected}`, cx, cy);
  }
  
  function drawPlayButton() {
    fill(COLORS.blue); noStroke(); textAlign(CENTER, CENTER);
    textSize(12); text("PRESS PLAY WHEN YOU'RE DONE", playBtn.x, playBtn.y);
  
    const enabled = selected.length > 0 && selected.length <= UI.maxSelected;
    noStroke(); fill(enabled ? COLORS.blueMid : "#B0C4FF");
    ellipse(playBtn.x, playBtn.y-50, playBtn.r * 2);
  
    fill(255);
    const r = playBtn.r * 0.65;
    push(); 
    translate(playBtn.x-3, playBtn.y-50);
    beginShape(); 
    vertex(-r * 0.3, -r); 
    vertex(r, 0); vertex(-r * 0.3, r); 
    endShape(CLOSE);
    pop();
  }
  
  function inDrop(mx, my) {
    return mx >= dropZone.x && mx <= dropZone.x + dropZone.w &&
           my >= dropZone.y && my <= dropZone.y + dropZone.h;
  }
  