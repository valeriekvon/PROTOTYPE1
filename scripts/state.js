// High-level mode
let mode = "select"; 

let topBarButtons = {
    copy: null
  };
  let deepLinkPending = false;
// Pointer 
const pointer = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, justReleased: false, isTouch: false, id: null };

// World transform
let baseWidth = 393;
let baseHeight = 852;
let scaleFactor = 1;
let worldOffsetX = 0;
let worldOffsetY = 0;

// Top bar
let topBarH = 0;

// Select-mode
let tagNodes = [];
let selected = []; 

let draggingTag = null;
let playBtn = null;

// Graph-mode
let nodes = [];
let links = [];
let centerNode = null;

let hoveredNode = null;
let activeNode = null;



// Panel scroll
let panelScrollY   = 0;
let panelScrollMax = 0;
let _panelScrollNode = null; // reset scroll when focused node changes

// NEW: entry/transition flags
let showBluePanel = false;      // false on entry; true after launch
let entryCircleAlpha = 255;     // fades out after launch
let entryCircleFading = false;  // start fading once we launch

// Where the 0/3 circle lives (WORLD coords)
let playCircle = { x: 0, y: 0, r: 120 };


