// High-level mode
let mode = "select"; 

// Pointer 
const pointer = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, justReleased: false, isTouch: false };

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
let selected = []; // [{label, tags[]}]
let  = null;
let draggingTag = null;
let playBtn = null;

// Graph-mode
let nodes = [];
let links = [];
let centerNode = null;
let draggingNode = null;
let hoveredNode = null;
let activeNode = null;
