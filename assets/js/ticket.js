// assets/js/ticket.js
import { $, el } from "./utils.js";
import { api } from "./api.js";

/* ---------- util kecil ---------- */
const btnDownload = () => el("t-download");
const wrap        = () => el("ticket-wrap");
const msgBox      = () => el("ticket-msg");

function setMsg(text, cls = "text-sm mt-2 text-red-400") {
  const m = msgBox(); if (!m) return;
  m.className = cls; m.textContent = text || "";
}

// sisipkan node (canvas/img/hidden) sebelum area tombol unduh agar tombol tetap ada
function insertBeforeDownload(node) {
  const w = wrap(); if (!w) return;
  const downloadBox = btnDownload()?.closest("div");
  if (downloadBox && downloadBox.parentElement === w) {
    w.insertBefore(node, downloadBox);
  } else {
    w.appendChild(node);
  }
}

// set/replace hidden last code di posisi aman (sebelum tombol)
function setLastCodeInput(code) {
  const w = wrap(); if (!w) return;
  el("__lastTicketCode")?.remove();
  const h = document.createElement("input");
  h.type = "hidden"; h.id = "__lastTicketCode";
  h.value = String(code || "ticket");
  insertBeforeDownload(h);
}

function setLoading(on) {
  const w = wrap(); if (!w) return;
  const b = btnDownload();
  if (on) {
    w.classList.remove("hidden");
    // JANGAN clear innerHTML; tambahkan skeleton sementara
    let sk = el("__ticketSkel");
    if (!sk) {
      sk = document.createElement("div");
      sk.id = "__ticketSkel";
      sk.className = "skeleton h-64 rounded-2xl mb-4";
      w.prepend(sk);
    }
    if (b) b.disabled = true;
  } else {
    el("__ticketSkel")?.remove();
    if (b) b.disabled = false;
  }
}

function waDisplay(v) {
  let s = String(v || "").replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("62")) s = "0" + s.slice(2);
  if (s[0] === "8") s = "0" + s;
  if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
  return s;
}

/* ---------- fallback painter (canvas) ---------- */
async function makeQRCanvas(text, size = 240, light = "#ffffff", dark = "#000000") {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  try {
    if (window.QRCode?.toCanvas) {
      await window.QRCode.toCanvas(c, text, {
        width: size, margin: 1, errorCorrectionLevel: "H",
        color: { light, dark }
      });
      return c;
    }
  } catch {}
  try {
    if (window.QRious) {
      new window.QRious({ element: c, value: text, size, background: light, foreground: dark, level: "H" });
      return c;
    }
  } catch {}
  const ctx = c.getContext("2d");
  ctx.fillStyle = light; ctx.fillRect(0,0,size,size);
  ctx.fillStyle = dark;  ctx.fillRect(size*0.4,size*0.4,size*0.2,size*0.2);
  return c;
}
function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y,   x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x,   y+h, rr);
  ctx.arcTo(x,   y+h, x,   y,   rr);
  ctx.arcTo(x,   y,   x+w, y,   rr);
  ctx.closePath();
}
function drawLine(ctx, lab, val, x, y) {
  ctx.font = "600 20px system-ui, -apple-system, Segoe UI";
  ctx.fillStyle = "#e5e7eb"; ctx.fillText(lab, x, y);
  ctx.font = "400 22px system-ui, -apple-system, Segoe UI";
  ctx.fillStyle = "#ffffff"; ctx.fillText(String(val || "-"), x + 120, y);
}
function drawBadgeRow(ctx, label, text, x, y, { bg="#10b981", fg="#0b1220" } = {}) {
  ctx.font = "600 20px system-ui, -apple-system, Segoe UI";
  ctx.fillStyle = "#e5e7eb"; ctx.fillText(label, x, y);
  const padX = 16, padY = 10, h = 36;
  ctx.font = "700 20px system-ui, -apple-system, Segoe UI";
  const w = ctx.measureText(text).width + padX*2;
  const rx = x + 120, ry = y - h + padY;
  roundRect(ctx, rx, ry, w, h, 999);
  ctx.fillStyle = bg; ctx.fill();
  ctx.fillStyle = fg; ctx.fillText(text, rx + padX, y - 6);
}
async function paintFallbackCard(rec) {
  const w = wrap(); if (!w) return null;

  // buang img jika sebelumnya pakai renderer
  w.querySelector("img")?.remove();

  let cv = el("ticket-canvas");
  if (!cv) {
    cv = document.createElement("canvas");
    cv.id = "ticket-canvas";
    insertBeforeDownload(cv);
  } else {
    // pastikan posisinya sebelum tombol
    insertBeforeDownload(cv);
  }

  const W = 1200, H = 680;
  cv.width = W; cv.height = H;
  cv.style.width = "100%"; cv.style.maxWidth = "900px"; cv.style.height = "auto";
  const ctx = cv.getContext("2d");

  // bg
  ctx.fillStyle = "#0b1220"; ctx.fillRect(0,0,W,H);

  // kartu gradient
  const pad = 28;
  const cardX = pad, cardY = pad, cardW = W - pad*2, cardH = H - pad*2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
  const g = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  g.addColorStop(0.00, "#06b6d4");
  g.addColorStop(0.20, "#14b8a6");
  g.addColorStop(0.45, "#2563eb");
  g.addColorStop(0.70, "#4f46e5");
  g.addColorStop(0.85, "#7c3aed");
  g.addColorStop(1.00, "#a21caf");
  roundRect(ctx, cardX, cardY, cardW, cardH, 34);
  ctx.fillStyle = g; ctx.fill(); ctx.restore();

  // judul dan nama
  const leftX = cardX + 48; let y = cardY + 88;
  ctx.fillStyle = "#ffffff"; ctx.font = "800 44px system-ui, -apple-system, Segoe UI";
  ctx.fillText("GROW TOGETHER FLOW TOGETHER MABA — E-Ticket", leftX, y);
  const titleBottom = y + 20;
  y += 56; ctx.font = "700 34px system-ui, -apple-system, Segoe UI";
  ctx.fillText(String(rec.nama || "-"), leftX, y);

  // panel QR
  const qrBoxSize = 320, qrInner = 240;
  const qrBoxX = cardX + cardW - qrBoxSize - 40;
  let qrBoxY = cardY + 72;
  if (qrBoxY < titleBottom + 24) qrBoxY = titleBottom + 24;
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
  ctx.fillStyle = "#ffffff"; ctx.fill();
  const qr = await makeQRCanvas(rec.code || rec.id || "NO-CODE", qrInner, "#ffffff", "#000000");
  ctx.drawImage(qr, qrBoxX + (qrBoxSize-qrInner)/2, qrBoxY + (qrBoxSize-qrInner)/2, qrInner, qrInner);

  // kolom kiri
  y += 40; drawLine(ctx, "Fakultas:", rec.fakultas, leftX, y);
  y += 40; drawLine(ctx, "Prodi:",    rec.prodi,    leftX, y);
  y += 40; drawLine(ctx, "WA:",       waDisplay(rec.wa), leftX, y);
  y += 40; drawLine(ctx, "Domisili:", rec.domisili, leftX, y);
  y += 40; drawLine(ctx, "Kode:",     rec.code || "-", leftX, y);
  y += 40; drawBadgeRow(ctx, "Status:", "Terdaftar", leftX, y, { bg:"#f59e0b", fg:"#111827" });
  y += 48;
  const paid = Number(rec?.paid) === 1;
  drawBadgeRow(ctx, "Bayar:", paid ? "Sudah" : "Belum", leftX, y,
    paid ? { bg:"#10b981", fg:"#0b1220" } : { bg:"#ef4444", fg:"#0b1220" });

  setLastCodeInput(rec.code || rec.id || "ticket");
  return cv;
}

/* ---------- renderer (gambar PNG) ---------- */
async function tryRenderWithRenderer(rec) {
  const tryPaths = [
    "./renderer.js",
    "/assets/js/renderer.js",
    "./assets/js/renderer.js",
  ];
  let mod = null; let lastErr = null;
  for (const p of tryPaths) {
    try {
      mod = await import(/* @vite-ignore */ p);
      if (mod?.buildTicketImage) { console.log("[ticket] renderer loaded:", p); break; }
      mod = null;
    } catch (e) { lastErr = e; }
  }
  if (!mod?.buildTicketImage) { if (lastErr) console.warn("[ticket] renderer not found:", lastErr); return null; }

  const dataUrl = await mod.buildTicketImage(rec, { width: 2200, height: 1100 });

  const w = wrap(); if (!w) return null;
  // bersihkan canvas lama tapi jangan menghapus tombol
  w.querySelector("#ticket-canvas")?.remove();

  const img = new Image();
  img.alt = "E-Ticket";
  img.className = "rounded-2xl shadow-2xl ring-1 ring-white/10 block mx-auto";
  img.src = dataUrl;

  insertBeforeDownload(img);
  setLastCodeInput(rec.code || rec.id || "ticket");
  return img;
}

/* ---------- public: cari & bind ---------- */
export async function findTicket() {
  setMsg("");
  const q = $("#t-search")?.value?.trim();
  if (!q) { setMsg("Masukkan kode atau nomor WA."); return; }

  setLoading(true);
  try {
    const { rec } = await api.getTicket(q);
    if (!rec) {
      setLoading(false);
      setMsg("Data tidak ditemukan.");
      wrap()?.classList.add("hidden");
      return;
    }

    // coba renderer dulu → fallback canvas kalau gagal
    const img = await tryRenderWithRenderer(rec);
    if (!img) { await paintFallbackCard(rec); }

    setLoading(false);
    const btn = btnDownload(); if (btn) btn.disabled = false;

  } catch (e) {
    console.error("[ticket] find error:", e);
    setLoading(false);
    setMsg("Gagal mengambil tiket: " + (e?.message || e));
    wrap()?.classList.add("hidden");
  }
}

export function bindTicket() {
  el("t-find")?.addEventListener("click", findTicket);

  const btn = btnDownload();
  if (btn) {
    btn.disabled = true;
    btn.addEventListener("click", () => {
      const cv  = el("ticket-canvas");
      const img = wrap()?.querySelector("img");
      const code = el("__lastTicketCode")?.value || "ticket";
      let href = "";
      if (img?.src) href = img.src;
      else if (cv)  href = cv.toDataURL("image/png");
      if (!href) return;
      const a = document.createElement("a");
      a.href = href; a.download = `${code}.png`; document.body.appendChild(a);
      a.click(); a.remove();
    });
  }
}
