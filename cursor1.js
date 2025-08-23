
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('swap-overlay');
  const root    = document.documentElement;
  let themed = null;

  /* -------- helpers -------- */
  const sync = () => {
    if (!themed) return;
    // align overlay clone with current scroll
    themed.style.transform =
      `translate(${-window.scrollX}px, ${-window.scrollY}px)`;
    // ensure full doc coverage
    const w = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
      document.documentElement.clientWidth
    );
    const h = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.clientHeight
    );
    themed.style.width  = w + 'px';
    themed.style.height = h + 'px';
  };

  const buildClone = () => {
    // rebuild the overlay clone from the live DOM
    overlay.innerHTML = '';
    const cloneRoot = document.body.cloneNode(true);
    // remove things we must not duplicate
    cloneRoot.querySelectorAll('#swap-overlay, script, .cursor-circle')
             .forEach(n => n.remove());
    // mount inside themed container
    themed = document.createElement('div');
    themed.className = 'alt';
    while (cloneRoot.firstChild) {
      themed.appendChild(cloneRoot.firstChild);
    }
    overlay.appendChild(themed);
    sync();
  };

  // debounce rebuilds into a single rAF tick
  let scheduled = false;
  const scheduleRebuild = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      buildClone();
    });
  };

  /* -------- initial build -------- */
  buildClone();

  /* -------- keep the clone aligned -------- */
  window.addEventListener('scroll',  sync,   { passive: true });
  window.addEventListener('resize',  sync);

  /* -------- move the circular mask with the mouse -------- */
  document.addEventListener('mousemove', (e) => {
    root.style.setProperty('--x', e.clientX + 'px');
    root.style.setProperty('--y', e.clientY + 'px');
  });

//   /* (optional) change radius when hovering the header */
//   const header = document.querySelector('.header');
//   if (header) {
//     header.addEventListener('mouseenter', () => root.style.setProperty('--r', '60px'));
//     header.addEventListener('mouseleave', () => root.style.setProperty('--r', '32px'));
//   }

  /* -------- live updates: rebuild when the page changes -------- */
  // 1) Observe DOM changes (class toggles, content added/removed, etc.)
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      // ignore mutations inside the overlay itself
      if (overlay.contains(m.target)) continue;
      scheduleRebuild();
      break;
    }
  });
  mo.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true
  });

  // 2) Also rebuild after common interaction events (debounced)
  ['click','input','change','submit','keydown','keyup','toggle',
   'transitionend','animationend']
    .forEach(type => document.addEventListener(type, scheduleRebuild, true));
});

