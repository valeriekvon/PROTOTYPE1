function setup() {
    createCanvas(windowWidth, windowHeight- windowHeight/5.5);
    textFont('monospace');
    textAlign(CENTER, CENTER);
  
    UI = getUIConfig();
    baseWidth = UI.baseWidth;
    baseHeight = UI.baseHeight;
  
    computeTopBar();
    computeTransform();
  
    // initial fixed center node (dot)
    centerNode = new GraphNode("•", baseWidth / 2, baseHeight / 2, [], true);
    centerNode.fixed = true;
    activeNode = centerNode;
  
    setupSelectUI();
    spawnFloatingTags();
  }
  
  function windowResized() {
    resizeCanvas(windowWidth, windowHeight - 100);
  
    UI = getUIConfig();
    baseWidth = UI.baseWidth;
    baseHeight = UI.baseHeight;
  
    computeTopBar();
    computeTransform();
    setupSelectUI();
  }
  
  function draw() {
    background(COLORS.bg);
  
    drawTopBar();
  
    // update world pointer
    const wpt = screenToWorld(pointer.x, pointer.y);
    pointer.worldX = wpt.x; pointer.worldY = wpt.y;
  
    if (mode === "select") {
      // tag physics
      for (const n of tagNodes) { n.resetForces(); n.applyRepulsion(tagNodes); }
      for (const n of tagNodes) n.update();
  
      // world render
      push(); translate(worldOffsetX, worldOffsetY); scale(scaleFactor);
      drawDropZone();
      for (const n of tagNodes) n.display();
      pop();
  
      drawPlayButton();
    } else {
      runGraph();
    }
  
    if (!pointer.isTouch) { noCursor(); fill(COLORS.blue); noStroke(); circle(pointer.x, pointer.y, 20); }
    else cursor(ARROW);
  
    if (pointer.justReleased) pointer.justReleased = false;
  }
  