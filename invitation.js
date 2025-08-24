// invitation.js
const PI = Math.PI, TWO_PI = Math.PI * 2;
let cnv;

const TARGET = -PI / 2;  // straight up
const EPS = 0.25;        // lock tolerance (~14°)

let myFont;
function preload() {
  myFont = loadFont('fonts/PPNeueMachina-InktrapLight.otf');
}

// Ring geometry
const RING_DEG = 260;
const RING_SPAN = RING_DEG * PI/180;
const RING_START = TARGET - RING_SPAN/2;
const RING_END   = TARGET + RING_SPAN/2;

// Colors
const COL_RING_BG = 225;       // light gray
const COL_RING_ON = '#0e50c8'; // blue
const COL_KNOB    = '#0e50c8'; // blue
const COL_POINTER = 255;       // white

let knobs = [];
let selectedKnob = null;
let triggered = false;

function setup() {
  // Place canvas under header (if present)
  const headerEl = document.querySelector('.header');
  const headerH = headerEl ? headerEl.offsetHeight : 0;

  cnv = createCanvas(windowWidth, windowHeight - headerH);
  cnv.position(0, headerH);

//   textFont('system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif');
  textSize(16);

  // Initial knob layout based on canvas size
  const xs = [width/4, width/2, (3*width)/4];
  const labels = ['People', 'Process', 'Purpose'];

  knobs = [];
  for (let i = 0; i < 3; i++) {
    knobs.push(new Knob(xs[i], height * 0.85, 48, labels[i]));
  }
}

function draw() {
  clear();

  // Draw knobs
  for (const k of knobs) k.display();

  // Screen frame + waveform
  const wx = 0, wy = 80, ww = width, wh = 260;

  noFill();
  noStroke();
  strokeWeight(2);
  rect(wx, wy, ww, wh, 12);

  let total = 0;
  for (const k of knobs) total += Math.abs(normalizeAngle(k.angle - TARGET)) / PI;
  const cycles = map(total, 0, 3, 0, 6);

  noFill();
  stroke(COL_KNOB);
  strokeWeight(2);
  beginShape();
  for (let x = 0; x <= ww; x++) {
    const t = map(x, 0, ww, 0, cycles * TWO_PI);
    const y = wy + wh/2 + Math.sin(t) * (wh/2 - 10);
    vertex(wx + x, y);
  }
  endShape();

  if (!triggered && knobs.every(k => k.isAligned())) {
    triggered = true;
    setTimeout(() => window.location.replace("nodes.html"), 2000);
  }
}

function mousePressed() {
  selectedKnob = null;
  for (const k of knobs) {
    if (k.contains(mouseX, mouseY)) { selectedKnob = k; break; }
  }
}

function mouseDragged() {
  if (!selectedKnob) return;
  const dx = mouseX - selectedKnob.x, dy = mouseY - selectedKnob.y;
  selectedKnob.angle = Math.atan2(dy, dx) + PI/2; // keep "up" as target
}

function mouseReleased() { selectedKnob = null; }

// ---------- helpers ----------
function normalizeAngle(a){ let v=((a+PI)%TWO_PI+TWO_PI)%TWO_PI; return v-PI; }
function drawWrappedArc(x,y,d,a0,a1){ let s=a0,e=a1; if(e<s) e+=TWO_PI; arc(x,y,d,d,s,e,OPEN); }
function wrappedSpan(a0,a1){ let s=a1-a0; if(s<=0) s+=TWO_PI; return s; }

// ---------- Knob ----------
class Knob {
  constructor(x,y,r,label){
    this.x = x;
    this.y = y;
    this.r = r;
    this.label = label;
    this.angle = Math.random()*TWO_PI - PI;

    // Create a DOM label once; style so it doesn't interfere with dragging
    this.el = createP(label);
    this.el.style('margin', '0');
    this.el.style('color', '#0e50c8');
    this.el.style('position', 'absolute');
    this.el.style('pointer-events', 'none');
    this.el.style('font-family', 'PPNeueMachina, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif');
    this.el.style('font-weight', '300');
    
    this.el.style('transform', 'translateX(-50%)'); 
  }

  contains(px,py){ return dist(px,py,this.x,this.y) < this.r; }
  isAligned(){ return Math.abs(normalizeAngle(this.angle - TARGET)) < EPS; }

  progressToTarget(){
    const d = Math.min(Math.abs(normalizeAngle(this.angle - TARGET)), PI); // 0..π
    return 1 - (d / PI);  // 0..1
  }

  display(){
    push(); translate(this.x, this.y);

    // Outer ring
    // fill(white);
    strokeWeight(12);
    stroke('#white');
    drawWrappedArc(0, 0, (this.r + 16) * 2, RING_START, RING_END);

    // Progress arc
    const span = wrappedSpan(RING_START, RING_END);
    const prog = constrain(this.progressToTarget(), 0, 1);
    if (this.isAligned()) {
      stroke(60, 190, 120); //change color if needed
    } else {
      stroke(COL_RING_ON);
    }
    drawWrappedArc(0, 0, (this.r + 16) * 2, RING_START, RING_START + span * prog);

    // Knob body
    noStroke();
    fill(COL_KNOB);
    circle(0, 0, this.r * 2);

    // Pointer
    stroke(COL_POINTER);
    strokeWeight(3);
    strokeCap(ROUND);
    const len = this.r * 0.85;
    line(0, 0, len * Math.cos(this.angle), len * Math.sin(this.angle));

    pop();

    // --- DOM label aligned to canvas coordinates ---
    const rect = cnv.elt.getBoundingClientRect(); // canvas position in page
    const pageX = rect.left + window.scrollX;
    const pageY = rect.top  + window.scrollY;
    const labelX = pageX + this.x;
    const labelY = pageY + this.y + this.r + 16;
    this.el.position(labelX, labelY);
  }
}

function windowResized() {
  // Keep canvas under header on resize
  const headerEl = document.querySelector('.header');
  const headerH = headerEl ? headerEl.offsetHeight : 0;

  resizeCanvas(windowWidth, windowHeight - headerH);
  cnv.position(0, headerH);

  // Keep knobs laid out proportionally
  const xs = [width/4, width/2, (3*width)/4];
  knobs[0].x = xs[0];
  knobs[1].x = xs[1];
  knobs[2].x = xs[2];
  knobs.forEach(k => k.y = height * 0.85);
}
