let acuminRegular;   
let acuminLight;    



function preload() {
  acuminLight = loadFont('/fonts/static/RedHatDisplay-Regular.ttf');
 acuminRegular  = loadFont('/fonts/static/RedHatDisplay-Regular.ttf');
}

function setup() {
  loadProjectsFromSheet(GOOGLE_SHEET_CSV)
  .catch(err => console.warn('Sheet load failed, keeping embedded PROJECTS', err));
  createCanvas(windowWidth, windowHeight);
  sizeToViewport();                     
  textFont('monospace');
  textAlign(CENTER, CENTER);

  UI = getUIConfig();
  baseWidth = UI.baseWidth;
  baseHeight = UI.baseHeight;

  pointer.isTouch = isMobileViewport();

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', sizeToViewport);
    window.visualViewport.addEventListener('scroll', sizeToViewport); // ← add this too
  }

  computeTopBar();
  computeTransform();

  centerNode = new GraphNode("•", baseWidth / 2, baseHeight / 2, [], true);
  centerNode.fixed = true;
  activeNode = centerNode;

  setupSelectUI();
  textFont(acuminLight);
  UI.maxChildrenFocus  = 1;
UI.maxRelatedFocus   = 3;
UI.maxParents        = 2;
UI.maxChildrenByTags = 2;

}


function sizeToViewport() {
  const vv = window.visualViewport;
  const w = vv ? Math.round(vv.width)  : windowWidth;
  const h = vv ? Math.round(vv.height) : windowHeight;
  resizeCanvas(w, h);
}


function windowResized() {
  // resizeCanvas(windowWidth, windowHeight);  
  sizeToViewport();
  UI = getUIConfig();
  baseWidth = UI.baseWidth;
  baseHeight = UI.baseHeight;
  pointer.isTouch = isMobileViewport();

  computeTopBar();
  computeTransform();
  setupSelectUI();
}

function draw() {
  background(COLORS?.bg ?? 255);


  const wpt = screenToWorld(pointer.x, pointer.y);
  pointer.worldX = wpt.x; 
  pointer.worldY = wpt.y;

  if (entryCircleFading && entryCircleAlpha > 0) {
    entryCircleAlpha = Math.max(0, entryCircleAlpha - 18);
    if (entryCircleAlpha === 0) entryCircleFading = false;
  }

  if (mode === "select") {
    // When a deep-link is waiting to launch the graph,
    // don't show the 0/3 select UI at all.
    if (window.deepLinkPending) {
      return;   // blank/white background while data loads
    }

    push();
    translate(0, 0);
    scale(1);
    drawSelectScreen();
    pop();
  } else if (mode === "graph") {

    if (entryCircleAlpha > 0 && playCircle?.x != null) {
      // Draw the fading entry circle using world coordinates
      push();
      translate(worldOffsetX || 0, worldOffsetY || 0);
      scale(scaleFactor || 1);
      fillWithAlpha(COLORS.blue, entryCircleAlpha);
      noStroke();
      circle(playCircle.x, playCircle.y, (playCircle.r || 120) * 2);
      pop();
    }
    if (typeof runGraph === "function") runGraph();
  }

  if (mode === "graph" && showBluePanel && typeof drawTopBar === "function") {
    drawTopBar();
  }
}

