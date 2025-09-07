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

// Popup: sub mendukung HTML
export function showPopup(kind = "ok", title = "Selesai", sub = "") {
  const p = el("popup"); if (!p) return;

  const icon = el("popup-icon");
  if (icon) icon.className = "popup-icon " + kind;

  const tt = el("popup-title");
  if (tt) tt.textContent = String(title ?? "");

  const ss = el("popup-sub");
  if (ss) {
    const txt = String(sub ?? "");
    if (/<[a-z][\s\S]*>/i.test(txt)) ss.innerHTML = txt; // render HTML
    else ss.textContent = txt;
  }

  p.classList.remove("hidden");
  clearTimeout(window.__popTimer);
  window.__popTimer = setTimeout(() => p.classList.add("hidden"), 1800);
}
