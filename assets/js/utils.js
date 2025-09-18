export const el   = (id) => document.getElementById(id);
export const $    = (sel, root = document) => root.querySelector(sel);
export const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Tampilkan pesan di elemen (boleh HTML)
export function showMsg(node, html, cls = "") {
  if (!node) return;
  node.className = "text-sm " + cls;
  node.innerHTML = String(html ?? "");
}

export function safeDownload(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename || "download.png";
  document.body.appendChild(a); a.click(); a.remove();
}

export function btnLoading(btn, on = true) {
  if (!btn) return;
  btn.disabled = !!on;
  btn.classList.toggle("opacity-60", !!on);
}

// Overlay: sub mendukung HTML
export function showOverlay(title = "Memproses…", sub = "Mohon tunggu", withCancelAfterMs = 8000) {
  const ov = el("overlay"); if (!ov) return;

  const t = el("overlay-title");
  if (t) t.textContent = String(title ?? "");

  const s = el("overlay-sub");
  if (s) {
    const txt = String(sub ?? "");
    if (/<[a-z][\s\S]*>/i.test(txt)) s.innerHTML = txt;   // render HTML jika ada tag
    else s.textContent = txt;
  }

  const cancel = el("overlay-cancel");
  cancel?.classList.add("hidden");
  ov.classList.remove("hidden");

  if (withCancelAfterMs > 0) {
    clearTimeout(window.__ovCancelTimer);
    window.__ovCancelTimer = setTimeout(() => {
      cancel?.classList.remove("hidden");
      if (cancel) cancel.onclick = () => location.reload();
    }, withCancelAfterMs);
  }
}

export function hideOverlay() {
  const ov = el("overlay"); if (!ov) return;
  ov.classList.add("hidden");
  clearTimeout(window.__ovCancelTimer);
}

// ==== GANTI fungsi showPopup-mu dengan ini ====
export function showPopup(kind = "ok", title = "Selesai", sub = "", duration = 1800) {
  const p = el("popup"); if (!p) return;

  // ikon iOS badge (SVG disuntik)
  const icon = el("popup-icon");
  if (icon) {
    icon.className = "popup-icon " + kind;
    icon.innerHTML = buildBadge(kind);
  }

  const tt = el("popup-title");
  if (tt) tt.textContent = String(title ?? "");

  const ss = el("popup-sub");
  if (ss) {
    const txt = String(sub ?? "");
    if (/<[a-z][\s\S]*>/i.test(txt)) ss.innerHTML = txt; else ss.textContent = txt;
  }

  // tampil + retrigger animasi
  p.classList.remove("hidden","badge-in");
  void p.offsetWidth;               // force reflow agar animasi bisa diputar ulang
  p.classList.add("badge-in");

  clearTimeout(window.__popTimer);
  window.__popTimer = setTimeout(() => {
    p.classList.add("hidden");
    p.classList.remove("badge-in");
  }, duration);
}

// (opsional) expose ke global supaya bisa dipanggil dari console
window.showPopup = showPopup;

// ==== Tambahkan helper ini (sekali saja) ====
const BADGE_ICONS = {
  ok:   { g1:'#34d399', g2:'#059669', tick:'#fff' }, // emerald
  warn: { g1:'#f59e0b', g2:'#d97706', tick:'#fff' }, // amber
  err:  { g1:'#f43f5e', g2:'#e11d48', tick:'#fff' }, // rose
  info: { g1:'#22d3ee', g2:'#0ea5e9', tick:'#fff' }, // cyan
};

function buildBadge(kind='ok'){
  const c = BADGE_ICONS[kind] || BADGE_ICONS.ok;
  return `
  <svg viewBox="0 0 48 48" aria-hidden="true" class="icon-glow" fill="none">
    <defs>
      <linearGradient id="succGrad" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
        <stop stop-color="${c.g1}"/><stop offset="1" stop-color="${c.g2}"/>
      </linearGradient>
    </defs>
    <circle cx="24" cy="24" r="20" fill="url(#succGrad)"/>
    <path class="tick-mark" d="M16 24.5 L22 30.5 L33.5 18.5"
          stroke="${c.tick}" stroke-width="4" stroke-linecap="round"
          stroke-linejoin="round" fill="none"/>
  </svg>`;
}

let __lastPopupTs = 0;
const POPUP_MIN_INTERVAL = 2000; // 2 detik

function showPopupThrottled(kind='ok', title='Selesai', sub='', duration=1800){
  const now = Date.now();
  if (now - __lastPopupTs < POPUP_MIN_INTERVAL) return; // skip jika terlalu cepat
  __lastPopupTs = now;
  showPopup(kind, title, sub, duration);
}
