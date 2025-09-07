// assets/js/anim.js
// =============================
// Transitions & Micro Animations
// =============================

/**
 * Adds:
 * - Smooth section transitions when switching menu (#section-* hash)
 * - A gradient "veil" wipe during route changes
 * - Intersection-based reveal for elements with [data-reveal]
 * - Subtle tilt on cards with [data-tilt]
 * - Floating effect for any [data-float]
 */
export function bindAnimations() {
  const RAF = (fn) => requestAnimationFrame(fn);

  // ---------- Veil (route wipe) ----------
  let veil = document.getElementById("route-veil");
  if (!veil) {
    veil = document.createElement("div");
    veil.id = "route-veil";
    veil.setAttribute("aria-hidden", "true");
    document.body.appendChild(veil);
  }

  // Track current visible section
  const getVisibleSection = () => document.querySelector(".section:not(.hidden)");
  let prevVisible = getVisibleSection();


  // Also handle button-based nav (IDs used in nav.js)
  const buttonToSection = {
    "btn-register": "section-register",
    "btn-pay":      "section-pay",
    "btn-ticket":   "section-ticket",
    "btn-admin":    "section-admin",
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#btn-register, #btn-pay, #btn-ticket, #btn-admin");
    if (!btn) return;
    const targetId = buttonToSection[btn.id];
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (getTransMode() === 'curtain'){ ensureCurtain(); curtain?.classList.add('on'); }

    const fromEl = getVisibleSection();
    if (fromEl) {
      fromEl.classList.remove("route-enter");
      fromEl.classList.add("route-leave");
      fromEl.addEventListener("animationend", () => {
        fromEl.classList.remove("route-leave");
      }, { once: true });
    }

    veil.classList.remove("veil-out");
    veil.classList.add("veil-in");

    setTimeout(() => {
      // use hash to let existing logic run
      if (location.hash !== "#" + targetId) {
        location.hash = "#" + targetId;
      } else {
        onSectionVisible(targetEl);
      }
    }, 150);
  }, { capture: true });

  // Enhance clicks on nav anchors that target sections
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#section-']");
    if (!a) return;
    const hash = a.getAttribute("href");
    const targetId = hash.slice(1);
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    // Prevent default & halt other handlers to run our custom transition
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (getTransMode() === 'curtain'){ ensureCurtain(); curtain?.classList.add('on'); }
    if (getTransMode() === 'curtain'){ ensureCurtain(); curtain?.classList.add('on'); }
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    const fromEl = getVisibleSection();
    if (fromEl) {
      fromEl.classList.remove("route-enter");
      fromEl.classList.add("route-leave");
      fromEl.addEventListener("animationend", () => {
        fromEl.classList.remove("route-leave");
      }, { once: true });
    }

    // Veil in
    veil.classList.remove("veil-out");
    veil.classList.add("veil-in");

    // After a short delay, change the hash to let nav.js switch sections
    setTimeout(() => {
      // Change hash without reflow jumps if possible
      if (location.hash !== hash) {
        // Use pushState to avoid triggering browser jump; nav.js listens to hashchange, so set it explicitly
        location.hash = hash;
      } else {
        // If already same, manually trigger the enter on target
        onSectionVisible(targetEl);
      }
    }, 150);
  }, { capture: true });

  // When hash changes (nav.js will already toggle .hidden), animate entering section and veil out
  window.addEventListener("hashchange", () => {
    const now = getVisibleSection();
    onSectionVisible(now);
  });

  function onSectionVisible(el) {
    if (!el) return;
    // Next frame to ensure styles applied
    RAF(() => {
      el.classList.remove("route-leave");
      el.classList.add("route-enter");
      el.addEventListener("animationend", () => {
        el.classList.remove("route-enter");
      }, { once: true });

      // Veil out
      veil.classList.remove("veil-in");
      veil.classList.add("veil-out");
    });
  }

  // ---------- Reveal on scroll ----------
  const io = ("IntersectionObserver" in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.add("reveal-in");
            el.classList.remove("reveal");
            io.unobserve(el);
          }
        });
      }, { threshold: 0.12 })
    : null;

  document.querySelectorAll("[data-reveal]").forEach((el) => {
    el.classList.add("reveal");
    if (io) io.observe(el);
  });

  // ---------- Tilt on hover ----------
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    let rect = null;
    const max = parseFloat(card.getAttribute("data-tilt")) || 8;
    const damp = 14;

    function onMove(e) {
      rect = rect || card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      const rx = (dy * max);
      const ry = (-dx * max);
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    }
    function reset() {
      card.style.transform = "";
      rect = null;
    }
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", reset);
    card.addEventListener("blur", reset);
  });

  // ---------- Float any element ----------
  document.querySelectorAll("[data-float]").forEach((el) => {
    el.classList.add("floaty");
  });
}


// =============================
// Extra: Fancy Anim Modes & Effects
// =============================
/* AnimModes: 'cube' (default), 'parallax', 'curtain'
   Set via: <body data-trans="cube">, etc. */
function getTransMode(){
  const mode = document.body?.getAttribute("data-trans") || "cube";
  return /^(cube|parallax|curtain)$/.test(mode) ? mode : "cube";
}

// Curtain element (only when mode=curtain)
let curtain = null;
function ensureCurtain(){
  if (getTransMode() !== "curtain") return null;
  curtain = document.getElementById("route-curtain");
  if (!curtain){
    curtain = document.createElement("div");
    curtain.id = "route-curtain";
    document.body.appendChild(curtain);
  }
  return curtain;
}

// When section becomes visible, toggle curtain off
(function watchCurtain(){
  window.addEventListener("hashchange", () => {
    if (getTransMode() !== "curtain") return;
    ensureCurtain();
    curtain?.classList.remove("on");
    // remove after a tick to allow reflow
    requestAnimationFrame(() => curtain?.classList.remove("on"));
  });
})();

// Modify existing click handlers to react to mode
(function augmentNavVisual(){
  const mode = getTransMode();
  if (mode === "curtain"){
    ensureCurtain();
  }
})();

// Ripple on click (for .nav-btn and primary buttons)
function installRipple(){
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button, .nav-btn, [data-ripple]");
    if (!btn) return;
    let wrap = btn.querySelector(":scope > .rpl");
    if (!wrap){
      wrap = document.createElement("span");
      wrap.className = "rpl";
      const cs = getComputedStyle(btn);
      if (cs.position === "static") btn.style.position = "relative";
      btn.appendChild(wrap);
    }
    const rect = btn.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    const dot = document.createElement("span");
    dot.style.left = x + "px";
    dot.style.top  = y + "px";
    wrap.appendChild(dot);
    setTimeout(() => dot.remove(), 750);
  }, true);
}

// Magnetic hover: small follow effect for elements with [data-magnetic]
function installMagnetic(){
  const opts = { strength: 14 };
  document.querySelectorAll("[data-magnetic]").forEach(el => {
    let raf=null, tx=0, ty=0;
    function onMove(ev){
      const r = el.getBoundingClientRect();
      const dx = (ev.clientX - (r.left + r.width/2)) / (r.width/2);
      const dy = (ev.clientY - (r.top  + r.height/2)) / (r.height/2);
      tx = dx * opts.strength;
      ty = dy * opts.strength;
      if (!raf) raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${tx}px, ${ty}px)`;
        raf = null;
      });
    }
    function reset(){
      if (!raf) raf = requestAnimationFrame(() => {
        el.style.transform = `translate(0,0)`; raf = null;
      });
    }
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
    el.addEventListener("blur", reset);
  });
}

installRipple();
installMagnetic();
