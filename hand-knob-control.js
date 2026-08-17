// hand-knob-control-window.js (pinch must intersect knob; twist pinch to rotate)
// No video preview. Draws fingertip dots in a transparent overlay that sits over your p5 canvas.

(() => {
    // ===== Config =====
    const PINCH_MIN = 20;    // px; below this = 0% pinch
    const PINCH_MAX = 140;   // px; above this = 100% pinch
    const GRAB_THR  = 0.25;  // grab when pinch% >= 25%
    const REL_THR   = 0.15;  // release when pinch% <= 15%
    const SMOOTH    = 0.25;  // angle lerp per frame (0..1)
    const DOT_R     = 5;     // fingertip dot radius
    const HIT_PAD   = 1.05;  // knob hit radius multiplier (slight forgiveness)
  
    // ===== State =====
    let video = null;            // hidden <video>
    let detector = null;
    let isActive = false;
    let rafId = 0;
  
    // Fingertip overlay drawn over your p5 canvas
    let overlay = null, octx = null;
  
    // Per-hand grab state: handId -> { knob, baseKnobAngle, basePinchAngle }
    const handGrabs = new Map();
  
    // ===== Utilities =====
    function loadScriptOnce(src){
      return new Promise((resolve, reject) => {
        if ([...document.scripts].some(s => s.src.includes(src))) return resolve();
        const el = document.createElement('script');
        el.src = src; el.onload = resolve; el.onerror = reject;
        document.head.appendChild(el);
      });
    }
  
    function pinchPct(d){
      const adj = Math.max(0, Math.min(d - PINCH_MIN, PINCH_MAX - PINCH_MIN));
      return adj / (PINCH_MAX - PINCH_MIN);
    }
  
    function canvasRect(){
      const cnv = window.cnv?.elt;
      if (cnv) return cnv.getBoundingClientRect();
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
  
    function createOrSyncOverlay(){
        if (!overlay){
          overlay = document.createElement('canvas');
          overlay.id = 'hand-overlay';
          Object.assign(overlay.style, {
            position: 'absolute',
            left: '0px',
            top:  '0px',
            pointerEvents: 'none',  // ← critical
            zIndex: 1               // ← below your UI
          });
          document.body.appendChild(overlay);
          octx = overlay.getContext('2d');
        }
        const r = canvasRect();
        overlay.width  = Math.max(1, Math.floor(r.width));
        overlay.height = Math.max(1, Math.floor(r.height));
        overlay.style.left   = (r.left + window.scrollX) + 'px';
        overlay.style.top    = (r.top  + window.scrollY) + 'px';
        overlay.style.width  = r.width + 'px';
        overlay.style.height = r.height + 'px';
      }
      
  
    function camToCanvas(px, py){
      // estimateHands coords are in video pixels; with flipHorizontal:true they’re mirrored.
      const r  = canvasRect();
      const ux = px / video.videoWidth;
      const uy = py / video.videoHeight;
      return { x: ux * r.width, y: uy * r.height };
    }
  
    function pinchMidpointCanvas(ix, iy, tx, ty){
      const p = camToCanvas(ix, iy);
      const t = camToCanvas(tx, ty);
      return { x: (p.x + t.x) * 0.5, y: (p.y + t.y) * 0.5 };
    }
  
    function pinchAngle(ix, iy, tx, ty){
      // angle (radians) of the line from index tip → thumb tip, in canvas space.
      const p = camToCanvas(ix, iy);
      const t = camToCanvas(tx, ty);
      return Math.atan2(t.y - p.y, t.x - p.x);
    }
  
    // wrap to [-π, π] so twists across the seam don’t explode
    function wrapPi(a){
      while (a >  Math.PI) a -= Math.PI*2;
      while (a < -Math.PI) a += Math.PI*2;
      return a;
    }
  
    function pointIntersectsKnob(x, y, knob){
      const r = (knob.r || 40) * HIT_PAD;
      return Math.hypot(x - knob.x, y - knob.y) <= r;
    }
  
    function tryGrab(handId, pinchCenter, basePinchAng){
      if (!window.knobs) return null;
      if (handGrabs.has(handId)) return handGrabs.get(handId);
  
      // You *must* be pinching ON the knob to select it.
      let hit = null;
      for (const k of window.knobs){
        if (k._state?.grabbed) continue;
        if (pointIntersectsKnob(pinchCenter.x, pinchCenter.y, k)){
          hit = k; break;
        }
      }
      if (hit){
        hit._state = hit._state || {};
        hit._state.grabbed   = true;
        hit._state.hover     = false;
        hit._state.handId    = handId;
        hit._state.fingerPos = pinchCenter;
  
        // ✅ ensure baseKnobAngle is a number
        const baseKnobAngle = Number.isFinite(hit.angle) ? hit.angle : 0;
  
        handGrabs.set(handId, {
          knob: hit,
          baseKnobAngle,
          basePinchAngle: basePinchAng
        });
      }
      return handGrabs.get(handId) || null;
    }
  
    function release(handId){
      const g = handGrabs.get(handId);
      if (g){
        const k = g.knob;
        if (k && k._state){
          k._state.grabbed   = false;
          k._state.handId    = null;
          k._state.fingerPos = null;
        }
      }
      handGrabs.delete(handId);
    }
  
    function rotateFromPinch(g, currentPinchAng, currentCenter){
      const k = g.knob;
      if (!k) return;
  
      // shortest angular difference from the *grabbed* orientation
      const delta = wrapPi(currentPinchAng - g.basePinchAngle);
      const target = g.baseKnobAngle + delta;
  
      // smooth toward target (use p5 lerp if available)
      const L = (typeof window.lerp === 'function') ? window.lerp : (a,b,t)=>a+(b-a)*t;
      k.angle = L(Number.isFinite(k.angle) ? k.angle : target, target, SMOOTH);
  
      k._state = k._state || {};
      k._state.fingerPos = currentCenter; // for leash rendering
    }
  
    function drawDots(hands){
      if (!octx) return;
      octx.clearRect(0, 0, overlay.width, overlay.height);
  
      hands.forEach(h => {
        const I = h.keypoints[8]; // index tip
        const T = h.keypoints[4]; // thumb tip
        const pi = camToCanvas(I.x, I.y);
        const pt = camToCanvas(T.x, T.y);
  
        // index tip
        octx.beginPath();
        octx.arc(pi.x, pi.y, DOT_R, 0, Math.PI*2);
        octx.fillStyle = 'rgba(14,80,200)';
        octx.fill();
  
        // thumb tip
        octx.beginPath();
        octx.arc(pt.x, pt.y, DOT_R*0.9, 0, Math.PI*2);
        octx.fillStyle = 'rgba(14,80,200)';
        octx.fill();
  
        // leash + grab ring if holding
        const id = h.handedness || 'Unknown';
        const g  = handGrabs.get(id);
        if (g && g.knob){
          const c = pinchMidpointCanvas(I.x, I.y, T.x, T.y);
          octx.setLineDash([6,6]);
          octx.lineWidth = 1;
          octx.strokeStyle = 'rgba(5,5,5)';
          octx.beginPath();
          octx.moveTo(g.knob.x, g.knob.y);
          octx.lineTo(c.x, c.y);
          octx.stroke();
          octx.setLineDash([]);
  
          // subtle grab highlight ring
          octx.beginPath();
          octx.arc(g.knob.x, g.knob.y, (g.knob.r||40)+12, 0, Math.PI*2);
          octx.lineWidth = 3;
          octx.strokeStyle = 'rgba(255,255,255,0.75)';
          octx.stroke();
        }
      });
    }
  
    // ===== Camera + Detector =====
    async function setupCamera(){
      if (video) return;
      video = document.createElement('video');
      video.playsInline = true; video.muted = true; video.autoplay = true;
      Object.assign(video.style, { position:'fixed', left:'-9999px', top:'-9999px', width:'1px', height:'1px' });
      document.body.appendChild(video);
  
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      await new Promise(res => (video.onloadedmetadata = res));
      await video.play();
  
      // wait until videoWidth is non-zero to avoid NaN mapping on first frames
      const t0 = performance.now();
      while ((video.videoWidth === 0 || video.videoHeight === 0) && performance.now() - t0 < 1500) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
  
    async function setupDetector(){
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js');
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection');
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/hands');
      const { handPoseDetection } = window;
      detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        {
          runtime: 'mediapipe',
          modelType: 'full',
          maxHands: 2,
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'
        }
      );
    }
  
    // ===== Main loop =====
    async function loop(){
      if (!isActive) return;
      try{
        const preds = await detector.estimateHands(video, { flipHorizontal: true }) || [];
  
        // draw fingertip dots each frame
        drawDots(preds);
  
        const seen = new Set();
  
        preds.forEach(h => {
          const id = h.handedness || 'Unknown';
          seen.add(id);
  
          const I = h.keypoints[8];
          const T = h.keypoints[4];
  
          const d   = Math.hypot(T.x - I.x, T.y - I.y);
          const pct = pinchPct(d);
  
          const center = pinchMidpointCanvas(I.x, I.y, T.x, T.y);
          const pang   = pinchAngle(I.x, I.y, T.x, T.y);
  
          if (pct >= GRAB_THR){
            // Ensure we have a grab; only allowed if pinch center is *inside* a knob.
            let g = handGrabs.get(id);
            if (!g){
              g = tryGrab(id, center, pang);
            }
            if (g){
              rotateFromPinch(g, pang, center);
            }
          } else if (pct <= REL_THR){
            // drop if you open your pinch
            release(id);
          }
        });
  
        // release hands that vanished
        for (const id of [...handGrabs.keys()]){
          if (!seen.has(id)) release(id);
        }
      } catch(e){
        // console.warn(e);
      }
      rafId = requestAnimationFrame(loop);
    }
  
    // ===== Public API =====
    async function enable(){
      if (isActive) return;
      isActive = true;
  
      // ✅ Wait for the p5 canvas so overlay & mapping match knob space
      await new Promise(res => {
        const tick = () => (window.cnv?.elt ? res() : requestAnimationFrame(tick));
        tick();
      });
  
      createOrSyncOverlay();
      await setupCamera();
      if (!detector) await setupDetector();
      loop();
  
      document.getElementById('handControl')?.classList.add('active');
      document.getElementById('mouseControl')?.classList.remove('active');
    }
  
    function disable(){
      if (!isActive) return;
      isActive = false;
      cancelAnimationFrame(rafId);
      handGrabs.clear();
      if (octx) octx.clearRect(0,0,overlay.width,overlay.height);
  
      document.getElementById('handControl')?.classList.remove('active');
      document.getElementById('mouseControl')?.classList.add('active');
    }
  
    // Keep overlay aligned with your p5 canvas
    window.addEventListener('resize',  createOrSyncOverlay);
    window.addEventListener('scroll',  createOrSyncOverlay);
    document.addEventListener('DOMContentLoaded', createOrSyncOverlay);
  
    // Expose globally
    window.enableHandKnobControl  = enable;
    window.disableHandKnobControl = disable;
  
    // Auto-wire to buttons if present
    window.addEventListener('DOMContentLoaded', () => {
      const handBtn  = document.getElementById('handControl');
      const mouseBtn = document.getElementById('mouseControl');
      handBtn  && handBtn.addEventListener('click', enable);
      mouseBtn && mouseBtn.addEventListener('click', disable);
    });
  })();
//   function createOrSyncOverlay(){
//     if (!overlay){
//       overlay = document.createElement('canvas');
//       overlay.id = 'hand-overlay';
//       Object.assign(overlay.style, {
//         position: 'absolute',
//         left: 0, top: 0,
//         pointerEvents: 'none',       // critical
//         zIndex: 9998                 // keep it *below* the buttons
//       });
//       document.body.appendChild(overlay);
//       octx = overlay.getContext('2d');
//     }
//     const r = canvasRect();
//     overlay.width  = Math.max(1, Math.floor(r.width));
//     overlay.height = Math.max(1, Math.floor(r.height));
//     overlay.style.left   = (r.left + window.scrollX) + 'px';
//     overlay.style.top    = (r.top  + window.scrollY) + 'px';
//     overlay.style.width  = r.width + 'px';
//     overlay.style.height = r.height + 'px';
//   }
  
  document.addEventListener('DOMContentLoaded', () => {
    const ms = document.querySelector('.mode-switcher');
    if (ms) {
      ms.style.zIndex = '100000';
      ms.style.pointerEvents = 'auto';
      // If it’s inside a container with overflow/transform that creates a new stacking context,
      // move it to <body> as a last resort:
      if (ms.parentElement !== document.body) {
        document.body.appendChild(ms);
      }
    }
  });
  


  // --- image_cache.js ---
const IMAGE_CACHE = new Map(); // url -> {img, status:'loading'|'ready'|'error'}

function normalizeImgSrc(src) {
  if (!src) return "";
  let s = String(src).trim();

  // If they put just "foo.jpg" in the sheet, assume it lives in /images/
  if (!/^https?:\/\//i.test(s) && !s.startsWith("/")) s = `images/${s}`;

  // Fix common typos like "/.images/foo.png" -> "images/foo.png"
  s = s.replace(/^\/\./, "/").replace(/^\/?images\//, "images/");

  // Convert Google Drive "file/d/<ID>/view" to a direct view link
  if (/drive\.google\.com\/file\/d\//.test(s)) {
    const m = s.match(/\/file\/d\/([^/]+)/);
    if (m) s = `https://drive.google.com/uc?export=view&id=${m[1]}`;
  }
  return s;
}

function requestImage(src) {
  const url = normalizeImgSrc(src);
  if (!url) return null;

  // Already requested?
  const existing = IMAGE_CACHE.get(url);
  if (existing) return existing;

  const entry = { img: null, status: "loading" };
  IMAGE_CACHE.set(url, entry);

  // p5 async load
  loadImage(
    url,
    (p5img) => { entry.img = p5img; entry.status = "ready"; },
    (err)    => { console.warn("[image] failed:", url, err); entry.status = "error"; }
  );
  return entry;
}

// Optional: warm cache for all images in PROJECTS after you load the sheet
function warmImageCacheFromProjects(projects) {
  const urls = new Set();
  for (const p of projects) {
    if (p.info?.image) urls.add(p.info.image);
    for (const c of (p.children || [])) if (c.info?.image) urls.add(c.info.image);
  }
  urls.forEach(requestImage);
}
