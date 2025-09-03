// assets/js/ticket.js
import { $, el } from "./utils.js";
import { api } from "./api.js";

// ===== Util kecil =====
function waDisplay(v) {
  let s = String(v || "").replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("62")) s = "0" + s.slice(2);
  if (s[0] === "8") s = "0" + s;
  if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
  return s;
}
function isPaid(rec){ return Number(rec?.paid) === 1; }

// Buat QR ke offscreen canvas (gunakan qrcode atau qrious bila ada)
async function makeQRCanvas(text, size = 340, light = "#ffffff", dark = "#000000") {
  const c = document.createElement("canvas");
  c.width = c.height = size;

  // 1) qrcode
  try {
    if (window.QRCode?.toCanvas) {
      await window.QRCode.toCanvas(c, text, {
        width: size,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { light, dark }
      });
      return c;
    }
  } catch {}

  // 2) QRious
  try {
    if (window.QRious) {
      new window.QRious({
        element: c,
        value: text,
        size,
        background: light,
        foreground: dark,
        level: "H",
      });
      return c;
    }
  } catch {}

  // 3) fallback manual (kotak putih)
  const ctx = c.getContext("2d");
  ctx.fillStyle = light; ctx.fillRect(0,0,size,size);
  ctx.fillStyle = dark;
  ctx.fillRect(size*0.4, size*0.4, size*0.2, size*0.2);
  return c;
}

// Gambar rounded-rect gampang
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

// Core: render kartu tiket ke canvas
async function renderTicketCard(rec){
  const wrap = el("ticket-wrap");
  const cv   = el("ticket-canvas");
  if (!wrap || !cv) return;

  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const W = 1200, H = 680;             // resolusi kerja (tajam untuk unduh)
  cv.width = W; cv.height = H;
  cv.style.width  = "100%";            // responsive
  cv.style.maxWidth = "900px";
  cv.style.height = (H/W*100) + "%";

  const ctx = cv.getContext("2d");

  // Background gelap halaman
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0,0,W,H);

  // Kartu gradient + shadow
  const pad = 28;
  const cardX = pad, cardY = pad;
  const cardW = W - pad*2, cardH = H - pad*2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur  = 20;
  ctx.shadowOffsetY = 8;

  const grad = ctx.createLinearGradient(cardX, cardY, cardX+cardW, cardY+cardH);
  grad.addColorStop(0.00, "#0ea5e9");  // sky-500
  grad.addColorStop(0.55, "#0ea5e9");  // ke teal
  grad.addColorStop(0.70, "#2563eb");  // blue-600
  grad.addColorStop(1.00, "#a21caf");  // fuchsia-800

  roundRect(ctx, cardX, cardY, cardW, cardH, 34);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Panel QR putih
  const qrBoxW = 370, qrBoxH = 430;
  const qrBoxX = cardX + cardW - qrBoxW - 40;
  const qrBoxY = cardY + 80;

  roundRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const qrCanvas = await makeQRCanvas(rec.code || rec.id || "NO-CODE", 320, "#ffffff", "#000000");
  ctx.drawImage(qrCanvas, qrBoxX + (qrBoxW-320)/2, qrBoxY + (qrBoxH-320)/2 - 10, 320, 320);

  // Teks — kiri
  const leftX = cardX + 48;
  let y = cardY + 88;

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px 'Inter', system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", leftX, y);

  y += 56;
  ctx.font = "700 34px 'Inter', system-ui";
  ctx.fillText(String(rec.nama || "-"), leftX, y);

  const line = (label, value) => {
    y += 46;
    ctx.font = "600 20px 'Inter', system-ui";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(label, leftX, y);

    ctx.font = "400 22px 'Inter', system-ui";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(value || "-"), leftX + 110, y);
  };

  const waShown = waDisplay(rec.wa || "");
  line("Kode:", rec.code || "-");
  line("WA:", waShown || rec.wa || "-");
  line("Makanan:", rec.makanan || "-");

  // Badge status
  y += 42;
  const drawBadge = (text, bg, fg) => {
    const padX = 16, padY = 10;
    ctx.font = "700 20px 'Inter', system-ui";
    const w = ctx.measureText(text).width + padX*2;
    const h = 36;
    roundRect(ctx, leftX, y, w, h, 999);
    ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = fg; ctx.fillText(text, leftX + padX, y + h - padY);
    return w + 12; // return width for chaining
  };

  let dx = 0;
  dx += drawBadge("Terdaftar", "#f59e0b", "#111827"); // amber
  const paid = isPaid(rec);
  drawBadge(paid ? "Sudah" : "Belum", paid ? "#10b981" : "#ef4444", "#0b1220");

  // Simpan rec terakhir untuk nama file download
  el("__lastTicketCode")?.remove();
  const hidden = document.createElement("input");
  hidden.type = "hidden"; hidden.id = "__lastTicketCode";
  hidden.value = String(rec.code || rec.id || "ticket");
  wrap.appendChild(hidden);

  // Tampilkan area preview
  wrap.classList.remove("hidden");
  return cv;
}

// ====== Public API ======
export async function findTicket(){
  const box = el("ticket-wrap");
  const msg = el("ticket-msg");
  if (msg) { msg.className="text-sm text-red-400"; msg.textContent=""; }

  const raw = $("#t-search")?.value?.trim();
  if (!raw) { if(msg){ msg.textContent="Masukkan kode atau nomor WA."; } return; }

  try{
    // Backend sudah kebal format WA
    const { rec } = await api.getTicket(raw);
    if (!rec) { if(msg){ msg.textContent="Data tidak ditemukan."; } box?.classList.add("hidden"); return; }

    await renderTicketCard(rec);

  }catch(e){
    if (msg){ msg.textContent = "Gagal mengambil tiket: " + (e?.message || e); }
    box?.classList.add("hidden");
  }
}

export function bindTicket(){
  // Sembunyikan tombol lama jika masih ada di DOM
  el("btn-print")?.classList.add("hidden");
  el("btn-qr-download")?.classList.add("hidden");

  // Tombol unduh PNG
  const dl = el("t-download");
  if (dl) {
    dl.addEventListener("click", ()=>{
      const cv = el("ticket-canvas"); if (!cv) return;
      const code = el("__lastTicketCode")?.value || "ticket";
      const a = document.createElement("a");
      a.href = cv.toDataURL("image/png");
      a.download = `${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  // Tombol cari tiket
  const btnFind = el("t-find") || el("btn-ticket-find");
  btnFind?.addEventListener("click", findTicket);
}
