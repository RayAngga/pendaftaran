// assets/js/ticket.js
import { $, el } from "./utils.js";
import { api } from "./api.js";

/* ---------------- Helpers ---------------- */

// tampilkan WA dengan 0 depan
function waDisplay(v) {
  let s = String(v || "").replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("62")) s = "0" + s.slice(2);
  if (s[0] === "8") s = "0" + s;
  if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
  return s;
}
const isPaid = (r) => Number(r?.paid) === 1;

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y,   x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x,   y+h, rr);
  ctx.arcTo(x,   y+h, x,   y,   rr);
  ctx.arcTo(x,   y,   x+w, y,   rr);
  ctx.closePath();
  ctx.fill();
}

function drawLine(ctx, lab, val, x, y) {
  ctx.font = "600 20px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(lab, x, y);
  ctx.font = "400 22px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(val || "-"), x + 120, y);
}
function drawBadgeRow(ctx, label, text, x, y, { bg = "#10b981", fg = "#0b1220" } = {}) {
  ctx.font = "600 20px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(label, x, y);
  const padX = 16, padY = 10, h = 36;
  ctx.font = "700 20px system-ui, -apple-system, Segoe UI, Roboto";
  const w = ctx.measureText(text).width + padX * 2;
  const rx = x + 120, ry = y - h + padY;
  const rr = 999;
  const p = new Path2D();
  p.moveTo(rx+rr, ry);
  p.arcTo(rx+w, ry,   rx+w, ry+h, rr);
  p.arcTo(rx+w, ry+h, rx,   ry+h, rr);
  p.arcTo(rx,   ry+h, rx,   ry,   rr);
  p.arcTo(rx,   ry,   rx+w, ry,   rr);
  p.closePath();
  ctx.fillStyle = bg; ctx.fill(p);
  ctx.fillStyle = fg; ctx.fillText(text, rx + padX, y - 6);
}

/* -------------- UI helpers -------------- */

function ensureImgUI(){
  const wrap = el("ticket-wrap");
  if (!wrap) return null;

  // siapkan <img> untuk hasil renderer
  let img = el("ticket-img");
  if (!img) {
    img = document.createElement("img");
    img.id = "ticket-img";
    img.alt = "E-Ticket";
    img.className = "block mx-auto rounded-2xl shadow-2xl ring-1 ring-white/10 max-w-[900px] w-full";
    wrap.innerHTML = "";
    wrap.appendChild(img);
  }

  // buat tombol unduh jika belum ada
  if (!document.getElementById("t-download")) {
    const bar = document.createElement("div");
    bar.className = "mt-4 flex justify-center";
    bar.innerHTML = `
      <button id="t-download"
        class="px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10">
        Unduh Tiket (PNG)
      </button>`;
    wrap.after(bar);
    bindDownload();
  }
  return { wrap, img };
}

function saveDownloadMeta(code, dataUrl){
  el("__lastTicketCode")?.remove();
  const i1 = document.createElement("input");
  i1.type = "hidden"; i1.id = "__lastTicketCode"; i1.value = String(code || "ticket");
  el("ticket-wrap")?.appendChild(i1);

  el("__lastTicketData")?.remove();
  const i2 = document.createElement("input");
  i2.type = "hidden"; i2.id = "__lastTicketData"; i2.value = dataUrl || "";
  el("ticket-wrap")?.appendChild(i2);
}

function bindDownload(){
  const btn = el("t-download");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const data = el("__lastTicketData")?.value;
    const code = el("__lastTicketCode")?.value || "ticket";
    let href = data;
    if (!href) {
      const cv = el("ticket-canvas");
      if (cv) href = cv.toDataURL("image/png");
    }
    if (!href) return;
    const a = document.createElement("a");
    a.href = href; a.download = `${code}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }, { once:false });
}

/* -------------- Render pakai renderer.js -------------- */

async function renderWithRenderer(rec){
  const ui = ensureImgUI();
  if (!ui) return;

  // muat renderer.js secara DINAMIS (supaya kalau file tidak ada, tidak mematikan modul)
  let buildTicketImage = null;
  try {
    const mod = await import("./renderer.js");
    buildTicketImage = mod?.buildTicketImage;
  } catch (e) {
    // abaikan — nanti fallback canvas
  }
  if (!buildTicketImage) throw new Error("renderer-missing");

  const prepared = { ...rec, wa: waDisplay(rec.wa) };
  const dataUrl = await buildTicketImage(prepared, {
    width: 2200, height: 1100, qrSize: 520
  });

  ui.img.src = dataUrl;
  ui.wrap.classList.remove("hidden");
  saveDownloadMeta(prepared.code || prepared.id || "ticket", dataUrl);
}

/* -------------- Render fallback canvas -------------- */

async function renderFallback(rec){
  const wrap = el("ticket-wrap");
  if (!wrap) return;

  let cv = el("ticket-canvas");
  if (!cv) {
    cv = document.createElement("canvas");
    cv.id = "ticket-canvas";
    wrap.innerHTML = "";
    wrap.appendChild(cv);
  }
  const W = 1200, H = 680;
  cv.width = W; cv.height = H;
  cv.style.width = "100%";
  cv.style.maxWidth = "900px";
  cv.style.height = "auto";

  const ctx = cv.getContext("2d");

  // latar luar
  ctx.fillStyle = "#0b1220"; ctx.fillRect(0,0,W,H);

  // kartu gradient
  const pad = 28;
  const cardX = pad, cardY = pad, cardW = W - pad*2, cardH = H - pad*2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  const g = ctx.createLinearGradient(cardX, cardY, cardX+cardW, cardY+cardH);
  g.addColorStop(0.00, "#06b6d4");
  g.addColorStop(0.20, "#14b8a6");
  g.addColorStop(0.45, "#2563eb");
  g.addColorStop(0.70, "#4f46e5");
  g.addColorStop(0.85, "#7c3aed");
  g.addColorStop(1.00, "#a21caf");
  roundRect(ctx, cardX, cardY, cardW, cardH, 34); ctx.fillStyle = g; ctx.fill();
  ctx.restore();

  const leftX = cardX + 48;
  let y = cardY + 88;

  ctx.fillStyle = "#fff";
  ctx.font = "800 44px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", leftX, y);
  const titleBottom = y + 20;
  y += 56;
  ctx.font = "700 34px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(String(rec.nama || "-"), leftX, y);

  // panel QR putih
  const qrBoxSize = 300, qrInner = 220;
  const qrBoxX = cardX + cardW - qrBoxSize - 40;
  let   qrBoxY = cardY + 72;
  if (qrBoxY < titleBottom + 24) qrBoxY = titleBottom + 24;
  const p = new Path2D();
  p.moveTo(qrBoxX+18, qrBoxY);
  p.arcTo(qrBoxX+qrBoxSize, qrBoxY, qrBoxX+qrBoxSize, qrBoxY+qrBoxSize, 18);
  p.arcTo(qrBoxX+qrBoxSize, qrBoxY+qrBoxSize, qrBoxX, qrBoxY+qrBoxSize, 18);
  p.arcTo(qrBoxX, qrBoxY+qrBoxSize, qrBoxX, qrBoxY, 18);
  p.arcTo(qrBoxX, qrBoxY, qrBoxX+qrBoxSize, qrBoxY, 18);
  p.closePath();
  ctx.fillStyle = "#fff"; ctx.fill(p);

  // QR (qrcode / qrious / fallback)
  const qrCanvas = await (async ()=>{
    if (window.QRCode?.toCanvas) {
      const c = document.createElement("canvas");
      await window.QRCode.toCanvas(c, rec.code || rec.id || "NO-CODE", { width: qrInner, margin: 1 });
      return c;
    }
    if (window.QRious) {
      const c = document.createElement("canvas");
      new window.QRious({ element: c, value: rec.code || rec.id || "NO-CODE", size: qrInner, level:"H" });
      return c;
    }
    const c = document.createElement("canvas"); c.width = c.height = qrInner;
    const cc = c.getContext("2d");
    cc.fillStyle="#fff"; cc.fillRect(0,0,qrInner,qrInner);
    cc.fillStyle="#000"; cc.fillRect(qrInner*.4, qrInner*.4, qrInner*.2, qrInner*.2);
    return c;
  })();
  const qx = qrBoxX + (qrBoxSize - qrInner)/2;
  const qy = qrBoxY + (qrBoxSize - qrInner)/2;
  ctx.drawImage(qrCanvas, qx, qy, qrInner, qrInner);

  // kolom kiri
  y += 40; drawLine(ctx, "Fakultas:", rec.fakultas, leftX, y);
  y += 40; drawLine(ctx, "Prodi:",    rec.prodi,    leftX, y);
  y += 40; drawLine(ctx, "WA:",       waDisplay(rec.wa), leftX, y);
  y += 40; drawLine(ctx, "Makanan:",  rec.makanan,  leftX, y);
  y += 40; drawLine(ctx, "Domisili:", rec.domisili, leftX, y);
  y += 40; drawLine(ctx, "Kode:",     rec.code,     leftX, y);
  y += 40; drawBadgeRow(ctx, "Status:", "Terdaftar", leftX, y, { bg:"#f59e0b", fg:"#111827" });
  y += 48; drawBadgeRow(ctx, "Bayar:", isPaid(rec) ? "Sudah" : "Belum",
                        leftX, y, isPaid(rec) ? { bg:"#10b981", fg:"#0b1220" } : { bg:"#ef4444", fg:"#0b1220" });

  wrap.classList.remove("hidden");
  saveDownloadMeta(rec.code || rec.id || "ticket", cv.toDataURL("image/png"));
}

/* -------------- Cari & bind -------------- */

export async function findTicket(){
  const wrap = el("ticket-wrap");
  const msg  = el("ticket-msg");
  if (msg) { msg.className = "text-sm mt-2 text-red-400"; msg.textContent = ""; }

  const q = $("#t-search")?.value?.trim();
  if (!q) { if (msg) msg.textContent = "Masukkan kode atau nomor WA."; return; }

  // skeleton
  if (wrap) {
    wrap.classList.remove("hidden");
    wrap.innerHTML = '<div class="skeleton h-64 rounded-2xl"></div>';
  }

  try {
    let { rec } = await api.getTicket(q);
    if (!rec && /^\+?\d[\d\s-]{6,}$/.test(q)) {
      const f = await api.findByWA(q); rec = f?.rec;
    }
    if (!rec) { if (msg) msg.textContent = "Data tidak ditemukan."; wrap?.classList.add("hidden"); return; }

    // coba renderer; gagal → fallback
    try { await renderWithRenderer(rec); }
    catch(e){ console.warn("renderer failed:", e); await renderFallback(rec); }

  } catch (e) {
    console.error(e);
    if (msg) msg.textContent = "Gagal mengambil tiket: " + (e?.message || e);
    wrap?.classList.add("hidden");
  }
}

export function bindTicket(){
  el("t-find")?.addEventListener("click", findTicket);
  bindDownload(); // aktifkan tombol jika sudah ada di HTML
}
