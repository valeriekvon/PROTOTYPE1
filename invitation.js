// invitation.js
const PI = Math.PI, TWO_PI = Math.PI * 2;
let cnv;

const TARGET = -PI / 2;  // straight up
const EPS = 0.25;        // lock tolerance (~14°)

let myFont;
function preload() {
  myFont = loadFont('./fonts/PPNeueMachina-InktrapLight.otf');
}



// Wave settings
// Wave settings
const WAVE_SPEED   = 0.18;    // a bit faster drift
const WAVE_DETAIL  = 0.0016;  // more curvature across the width
const WAVE_OCTAVES = 4;       // richer detail
const WAVE_PAD     = 10;      // keep off the band edges


function fbm(n) {
  // fractal Brownian motion: layered noise for richer shape
  let total = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < WAVE_OCTAVES; i++) {
    total += amp * noise(n * freq);
    norm  += amp;
    amp  *= 0.5;
    freq *= 2.0;
  }
  return total / norm; // 0..1
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


// Screen frame + waveform band
// Screen frame + waveform band
const wx = 0, wy = 80, ww = width, wh = 260;

noFill();
noStroke();
strokeWeight(2);
rect(wx, wy, ww, wh, 12);

// knob “energy” 0..3 (unaltered)
let energy = 0;
for (const k of knobs) energy += Math.abs(normalizeAngle(k.angle - TARGET)) / PI;
const t = millis() * 0.001;

// style for the wave line
noFill();
stroke(COL_KNOB);
strokeWeight(2);
strokeJoin(ROUND);
strokeCap(ROUND);

beginShape();
curveVertex(wx - 20, wy + wh * 0.5);

for (let x = 0; x <= ww; x += 2) {
  
  const nx = (x * WAVE_DETAIL) + (t * WAVE_SPEED);

  const n = (fbm(nx) - 0.5) * 2.0;

  
  const env = map(fbm(nx * 0.25 + 100.0), 0, 1, 0.85, 1.0);


  const amp = (wh * 0.9 - WAVE_PAD) * env * map(energy, 0, 3, 0.8, 1.9);

  const y = wy + wh * 0.7 + n * amp;
  curveVertex(wx + x, y);
}

curveVertex(wx + ww + 20, wy + wh * 0.5);
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
    stroke('white');
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
    const rect = cnv.elt.getBoundingClientRect(); 
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








const cursor = document.querySelector('.cursor');

// move the custom cursor
window.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
  cursor.style.opacity = '1';
});

// (optional) hide when leaving the window
window.addEventListener('mouseleave', () => {
  cursor.style.opacity = '0';
});

