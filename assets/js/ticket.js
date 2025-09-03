// assets/js/ticket.js
import { $, el } from "./utils.js";
import { api } from "./api.js";
import { buildTicketImage } from "./renderer.js"; // ← pakai renderer

/* ========== Helpers ========== */

// Tampilkan WA dengan 0 depan
function waDisplay(v) {
  let s = String(v || "").replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("62")) s = "0" + s.slice(2);
  if (s[0] === "8") s = "0" + s;
  if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
  return s;
}
const isPaid = (rec) => Number(rec?.paid) === 1;

// Pastikan elemen gambar & tombol unduh tersedia
function ensureTicketUI() {
  const wrap = el("ticket-wrap");
  if (!wrap) return null;

  // img untuk hasil renderer
  let img = el("ticket-img");
  if (!img) {
    img = document.createElement("img");
    img.id = "ticket-img";
    img.alt = "E-Ticket";
    img.className = "block mx-auto rounded-2xl shadow-2xl ring-1 ring-white/10 max-w-[900px] w-full";
    wrap.innerHTML = "";
    wrap.appendChild(img);
  }

  // tombol Unduh (kalau belum ada, buat)
  if (!el("t-download")) {
    const bar = document.createElement("div");
    bar.className = "mt-4 flex justify-center";
    bar.innerHTML = `
      <button id="t-download"
        class="px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10">
        Unduh Tiket (PNG)
      </button>`;
    wrap.after(bar);
    bindDownload(); // rebind
  }
  return { wrap, img };
}

/* ========== Render dengan renderer.js (prioritas) ========== */
async function renderWithRenderer(rec) {
  const ui = ensureTicketUI();
  if (!ui) return;

  // siapkan data agar rapi (WA dengan nol depan)
  const prepared = {
    ...rec,
    wa: waDisplay(rec.wa),
  };

  // bangun PNG lewat renderer.js
  const dataUrl = await buildTicketImage(prepared, {
    // boleh kamu ubah ukurannya kalau mau lebih besar/lebih kecil
    width: 2200,
    height: 1100,
    qrSize: 520,
  });

  ui.img.src = dataUrl;
  ui.wrap.classList.remove("hidden");

  // simpan untuk unduh
  saveDownloadMeta(prepared.code || prepared.id || "ticket", dataUrl);
}

/* ========== Fallback (kanvas sederhana) ========== */
// — dipakai hanya jika renderer gagal agar tetap tampil
async function renderFallback(rec) {
  const wrap = el("ticket-wrap");
  let cv = el("ticket-canvas");
  if (!cv) {
    cv = document.createElement("canvas");
    cv.id = "ticket-canvas";
    wrap.innerHTML = "";
    wrap.appendChild(cv);
  }
  const W = 1200, H = 680;
  cv.width = W; cv.height = H;
  cv.style.width = "100%"; cv.style.maxWidth = "900px"; cv.style.height = "auto";
  const ctx = cv.getContext("2d");

  // latar
  ctx.fillStyle = "#0b1220"; ctx.fillRect(0,0,W,H);
  const pad = 28;
  const cardX = pad, cardY = pad, cardW = W - pad*2, cardH = H - pad*2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
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

  // panel QR
  const qrBoxSize = 300, qrInner = 220;
  const qrBoxX = cardX + cardW - qrBoxSize - 40;
  let   qrBoxY = cardY + 72;
  if (qrBoxY < titleBottom + 24) qrBoxY = titleBottom + 24;

  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18); ctx.fillStyle = "#fff"; ctx.fill();

  // pakai qrcode/qrious yang sudah di-load di <head>
  const qrCanvas = await (async ()=>{
    // prefer qrcode
    if (window.QRCode?.toCanvas) {
      const c = document.createElement("canvas");
      await window.QRCode.toCanvas(c, rec.code || rec.id || "NO-CODE", { width: qrInner, margin: 1 });
      return c;
    }
    // fallback qrious
    if (window.QRious) {
      const c = document.createElement("canvas");
      new window.QRious({ element: c, value: rec.code || rec.id || "NO-CODE", size: qrInner, level: "H" });
      return c;
    }
    // ultimate fallback: kotak
    const c = document.createElement("canvas"); c.width = c.height = qrInner;
    const cc = c.getContext("2d"); cc.fillStyle = "#fff"; cc.fillRect(0,0,qrInner,qrInner);
    cc.fillStyle = "#000"; cc.fillRect(qrInner*0.4, qrInner*0.4, qrInner*0.2, qrInner*0.2);
    return c;
  })();
  const qx = qrBoxX + (qrBoxSize - qrInner) / 2;
  const qy = qrBoxY + (qrBoxSize - qrInner) / 2;
  ctx.drawImage(qrCanvas, qx, qy, qrInner, qrInner);

  // data kiri
  const disp = (v)=>String(v||"-");
  y += 40; drawLine(ctx, "Fakultas:", disp(rec.fakultas), leftX, y);
  y += 40; drawLine(ctx, "Prodi:",    disp(rec.prodi),    leftX, y);
  y += 40; drawLine(ctx, "WA:",       waDisplay(rec.wa),  leftX, y);
  y += 40; drawLine(ctx, "Makanan:",  disp(rec.makanan),  leftX, y);
  y += 40; drawLine(ctx, "Domisili:", disp(rec.domisili), leftX, y);
  y += 40; drawLine(ctx, "Kode:",     disp(rec.code),     leftX, y);
  y += 40; drawBadgeRow(ctx, "Status:", "Terdaftar", leftX, y, { bg:"#f59e0b", fg:"#111827" });
  y += 48; drawBadgeRow(ctx, "Bayar:", isPaid(rec) ? "Sudah" : "Belum",
                        leftX, y, isPaid(rec) ? { bg:"#10b981", fg:"#0b1220" } : { bg:"#ef4444", fg:"#0b1220" });

  // simpan untuk unduh
  saveDownloadMeta(rec.code || rec.id || "ticket", cv.toDataURL("image/png"));

  el("ticket-wrap").classList.remove("hidden");
}

// util menggambar rounded rect
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

/* ========== Cari & Bind ========== */

export async function findTicket() {
  const wrap = el("ticket-wrap");
  const msg  = el("ticket-msg");
  if (msg) { msg.className = "text-sm mt-2 text-red-400"; msg.textContent = ""; }

  const q = $("#t-search")?.value?.trim();
  if (!q) { if (msg) msg.textContent = "Masukkan kode atau nomor WA."; return; }

  // skeleton
  if (wrap) { wrap.classList.remove("hidden"); wrap.innerHTML = '<div class="skeleton h-64 rounded-2xl"></div>'; }

  try {
    // 1) getTicket (bisa kode / WA)
    let { rec } = await api.getTicket(q);
    // 2) fallback: kalau kosong dan kelihatan nomor, coba findByWA
    if (!rec && /^\+?\d[\d\s-]{6,}$/.test(q)) {
      const f = await api.findByWA(q);
      rec = f?.rec;
    }
    if (!rec) {
      if (msg) msg.textContent = "Data tidak ditemukan.";
      wrap?.classList.add("hidden"); return;
    }

    // coba renderer dulu, kalau gagal pakai fallback canvas
    try { await renderWithRenderer(rec); }
    catch (e) { console.warn("renderer failed, fallback to canvas:", e); await renderFallback(rec); }

  } catch (e) {
    console.error("findTicket error:", e);
    if (msg) msg.textContent = "Gagal mengambil tiket: " + (e?.message || e);
    wrap?.classList.add("hidden");
  }
}

function saveDownloadMeta(code, dataUrl){
  el("__lastTicketCode")?.remove();
  const i1 = document.createElement("input");
  i1.type = "hidden"; i1.id = "__lastTicketCode"; i1.value = String(code || "ticket");
  el("ticket-wrap").appendChild(i1);

  el("__lastTicketData")?.remove();
  const i2 = document.createElement("input");
  i2.type = "hidden"; i2.id = "__lastTicketData"; i2.value = dataUrl;
  el("ticket-wrap").appendChild(i2);
}

function bindDownload(){
  el("t-download")?.addEventListener("click", () => {
    const data = el("__lastTicketData")?.value;
    const code = el("__lastTicketCode")?.value || "ticket";
    let href = data;
    if (!href) {
      // fallback dari canvas jika tidak ada dataUrl tersimpan
      const cv = el("ticket-canvas");
      if (cv) href = cv.toDataURL("image/png");
    }
    if (!href) return;
    const a = document.createElement("a");
    a.href = href; a.download = `${code}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  });
}

export function bindTicket(){
  el("t-find")?.addEventListener("click", findTicket);
  bindDownload(); // kalau tombol sudah ada di HTML, langsung aktif
}
