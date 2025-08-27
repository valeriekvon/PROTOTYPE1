function mouseMoved(){ pointer.x = mouseX; pointer.y = mouseY; }

function mousePressed() {
  pointer.isTouch = false; pointer.x = mouseX; pointer.y = mouseY; pointer.down = true;

  if (mode === "select") {
    // pick a tag (world hit)
    for (let i = tagNodes.length - 1; i >= 0; i--) {
      const t = tagNodes[i];
      if (t.isInside(pointer.worldX, pointer.worldY)) {
        draggingTag = t; t.dragging = true;
        t.dx = pointer.worldX - t.x; t.dy = pointer.worldY - t.y;
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
        n.offsetX = pointer.worldX - n.x; n.offsetY = pointer.worldY - n.y;
        activeNode = n; return;
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
  pointer.x = mouseX; pointer.y = mouseY; pointer.down = false; pointer.justReleased = true;

  if (mode === "select") {
    if (draggingTag) {
      draggingTag.dragging = false;
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
      // tap to set active (world)
      for (let node of nodes) {
        if (node.isPointInside(pointer.worldX, pointer.worldY)) { activeNode = node; break; }
      }
    } else {
      draggingNode.fixed = false; draggingNode = null;
    }
  }
}

// touch → delegate to mouse handlers
function touchStarted(){ pointer.isTouch = true; if (touches.length){ pointer.x=touches[0].x; pointer.y=touches[0].y; mousePressed(); } return false; }
function touchMoved(){ if (touches.length){ pointer.x=touches[0].x; pointer.y=touches[0].y; mouseDragged(); } return false; }
function touchEnded(){ pointer.down=false; pointer.justReleased=true; mouseReleased(); return false; }
