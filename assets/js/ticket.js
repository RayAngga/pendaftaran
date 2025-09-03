// assets/js/ticket.js
import { $, el } from "./utils.js";
import { api } from "./api.js";

/* ========================== Helpers ========================== */

// Tampilkan WA ke format manusia (jaga 0 depan)
function waDisplay(v) {
  let s = String(v || "").replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("62")) s = "0" + s.slice(2);
  if (s[0] === "8") s = "0" + s;
  if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
  return s;
}

function isPaid(rec) { return Number(rec?.paid) === 1; }

// QR generator → offscreen canvas (prioritas qrcode, lalu qrious)
async function makeQRCanvas(text, size = 260, light = "#ffffff", dark = "#000000") {
  const c = document.createElement("canvas");
  c.width = c.height = size;

  try {
    if (window.QRCode?.toCanvas) {
      await window.QRCode.toCanvas(c, text, {
        width: size,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { light, dark },
      });
      return c;
    }
  } catch {}

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

  // fallback sederhana
  const ctx = c.getContext("2d");
  ctx.fillStyle = light; ctx.fillRect(0,0,size,size);
  ctx.fillStyle = dark; ctx.fillRect(size*0.4, size*0.4, size*0.2, size*0.2);
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y,   x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x,   y+h, rr);
  ctx.arcTo(x,   y+h, x,   y,   rr);
  ctx.arcTo(x,   y,   x+w, y,   rr);
  ctx.closePath();
}

// gambar label:value di kiri
function drawLine(ctx, lab, val, x, y) {
  ctx.font = "600 20px 'Inter', system-ui";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(lab, x, y);
  ctx.font = "400 22px 'Inter', system-ui";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(val || "-"), x + 120, y);
}

// draw badge (+label opsional)
function drawBadgeRow(ctx, label, text, x, y, {bg="#10b981", fg="#0b1220"} = {}) {
  // label
  ctx.font = "600 20px 'Inter', system-ui";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(label, x, y);

  // badge
  const padX = 16, padY = 10, h = 36;
  ctx.font = "700 20px 'Inter', system-ui";
  const w = ctx.measureText(text).width + padX*2;
  const rx = x + 120, ry = y - h + padY;
  roundRect(ctx, rx, ry, w, h, 999);
  ctx.fillStyle = bg; ctx.fill();
  ctx.fillStyle = fg; ctx.fillText(text, rx + padX, y - 6);
}

/* ===================== Render Ticket Card ===================== */

async function renderTicketCard(rec) {
  const wrap = el("ticket-wrap");
  if (!wrap) return null;

  // siapkan canvas (buat kalau belum ada)
  let cv = el("ticket-canvas");
  if (!cv) {
    cv = document.createElement("canvas");
    cv.id = "ticket-canvas";
    wrap.innerHTML = "";
    wrap.appendChild(cv);
  }

  // ukuran kerja (tajam buat download)
  const W = 1200, H = 680;
  cv.width = W; cv.height = H;
  cv.style.width = "100%";
  cv.style.maxWidth = "900px";
  cv.style.height = (H / W * 100) + "%";

  const ctx = cv.getContext("2d");

  // latar halaman
  ctx.fillStyle = "#0b1220"; ctx.fillRect(0,0,W,H);

  // kartu + gradient kaya warna
  const pad = 28;
  const cardX = pad, cardY = pad, cardW = W - pad*2, cardH = H - pad*2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;

  const g = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  g.addColorStop(0.00, "#06b6d4"); // cyan-500
  g.addColorStop(0.20, "#14b8a6"); // teal-500
  g.addColorStop(0.45, "#2563eb"); // blue-600
  g.addColorStop(0.70, "#4f46e5"); // indigo-600
  g.addColorStop(0.85, "#7c3aed"); // violet-600
  g.addColorStop(1.00, "#a21caf"); // fuchsia-800

  roundRect(ctx, cardX, cardY, cardW, cardH, 34);
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();

  // panel QR (diperkecil)
  const qrBoxSize = 340;        // panel putih
  const qrInner   = 260;        // QR-nya
  const qrBoxX = cardX + cardW - qrBoxSize - 40;
  const qrBoxY = cardY + 72;

  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
  ctx.fillStyle = "#ffffff"; ctx.fill();

  const qr = await makeQRCanvas(rec.code || rec.id || "NO-CODE", qrInner, "#ffffff", "#000000");
  const qx = qrBoxX + (qrBoxSize - qrInner) / 2;
  const qy = qrBoxY + (qrBoxSize - qrInner) / 2;
  ctx.drawImage(qr, qx, qy, qrInner, qrInner);

  // judul dan teks kiri
  const leftX = cardX + 48;
  let y = cardY + 88;

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 44px 'Inter', system-ui";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", leftX, y);

  y += 56;
  ctx.font = "700 34px 'Inter', system-ui";
  ctx.fillText(String(rec.nama || "-"), leftX, y);

  // field-field
  y += 40; drawLine(ctx, "Fakultas:", rec.fakultas, leftX, y);
  y += 40; drawLine(ctx, "Prodi:",    rec.prodi,    leftX, y);
  y += 40; drawLine(ctx, "WA:",       waDisplay(rec.wa || rec.waDisplay), leftX, y);
  y += 40; drawLine(ctx, "Makanan:",  rec.makanan,  leftX, y);
  y += 40; drawLine(ctx, "Domisili:", rec.domisili, leftX, y);
  y += 40; drawLine(ctx, "Kode:",     rec.code || "-", leftX, y);

  // status & bayar → baris TERPISAH (tidak tumpang-tindih)
  y += 40;
  drawBadgeRow(ctx, "Status:", "Terdaftar", leftX, y,
    { bg:"#f59e0b", fg:"#111827" }); // amber

  y += 48;
  const paid = isPaid(rec);
  drawBadgeRow(ctx, "Bayar:", paid ? "Sudah" : "Belum", leftX, y,
    paid ? { bg:"#10b981", fg:"#0b1220" } : { bg:"#ef4444", fg:"#0b1220" });

  // simpan kode terakhir untuk nama file download
  el("__lastTicketCode")?.remove();
  const hidden = document.createElement("input");
  hidden.type = "hidden"; hidden.id = "__lastTicketCode";
  hidden.value = String(rec.code || rec.id || "ticket");
  wrap.appendChild(hidden);

  // tampilkan
  wrap.classList.remove("hidden");
  return cv;
}

/* ====================== Cari & Bind Ticket ====================== */

export async function findTicket() {
  const wrap = el("ticket-wrap");
  const msg = el("ticket-msg");
  if (msg) { msg.className = "text-sm mt-2 text-red-400"; msg.textContent = ""; }

  const raw = $("#t-search")?.value?.trim();
  if (!raw) { if (msg) msg.textContent = "Masukkan kode atau nomor WA."; return; }

  // loading skeleton animasi
  if (wrap) {
    wrap.classList.remove("hidden");
    wrap.innerHTML = '<div class="skeleton h-64 rounded-2xl"></div>';
  }

  try {
    const { rec } = await api.getTicket(raw);
    if (!rec) {
      if (msg) msg.textContent = "Data tidak ditemukan.";
      wrap?.classList.add("hidden");
      return;
    }

    // render card
    await renderTicketCard(rec);

  } catch (e) {
    if (msg) msg.textContent = "Gagal mengambil tiket: " + (e?.message || e);
    wrap?.classList.add("hidden");
  }
}

export function bindTicket() {
  // tombol cari
  const btnFind = el("t-find");
  btnFind?.addEventListener("click", findTicket);

  // tombol unduh PNG
  const dl = el("t-download");
  if (dl) {
    dl.addEventListener("click", () => {
      const cv = el("ticket-canvas"); if (!cv) return;
      const code = el("__lastTicketCode")?.value || "ticket";
      const a = document.createElement("a");
      a.href = cv.toDataURL("image/png");
      a.download = `${code}.png`;
      document.body.appendChild(a);
      a.click(); a.remove();
    });
  }
}
