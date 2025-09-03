// assets/js/ticket.js
import { $, el } from "./utils.js";
import { api } from "./api.js";

/* ===================== Helpers ===================== */

// Tampilkan WA dengan awalan 0 terjaga
function waDisplay(v) {
  let s = String(v || "").replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("62")) s = "0" + s.slice(2); // 62xxxx -> 0xxxx
  if (s[0] === "8") s = "0" + s;                // 813... -> 0813...
  if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
  return s;
}
const isPaid = (rec) => Number(rec?.paid) === 1;

// Buat QR pada offscreen canvas (prioritas: qrcode -> qrious -> fallback)
async function makeQRCanvas(text, size = 240, light = "#ffffff", dark = "#000000") {
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

  // Fallback sangat sederhana
  const ctx = c.getContext("2d");
  ctx.fillStyle = light; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = dark;  ctx.fillRect(size * 0.4, size * 0.4, size * 0.2, size * 0.2);
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y,   x + w, y + h, rr);
  ctx.arcTo(x + w, y+h, x,     y + h, rr);
  ctx.arcTo(x,     y+h, x,     y,     rr);
  ctx.arcTo(x,     y,   x + w, y,     rr);
  ctx.closePath();
}

// label : value
function drawLine(ctx, lab, val, x, y) {
  ctx.font = "600 20px 'Inter', system-ui";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(lab, x, y);

  ctx.font = "400 22px 'Inter', system-ui";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(val || "-"), x + 120, y);
}

// Badge dengan label di kiri
function drawBadgeRow(ctx, label, text, x, y, { bg = "#10b981", fg = "#0b1220" } = {}) {
  ctx.font = "600 20px 'Inter', system-ui";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(label, x, y);

  const padX = 16, padY = 10, h = 36;
  ctx.font = "700 20px 'Inter', system-ui";
  const w = ctx.measureText(text).width + padX * 2;
  const rx = x + 120, ry = y - h + padY;

  roundRect(ctx, rx, ry, w, h, 999);
  ctx.fillStyle = bg; ctx.fill();

  ctx.fillStyle = fg;
  ctx.fillText(text, rx + padX, y - 6);
}

/* ================ Skeleton (tanpa hapus tombol) ================ */

function showSkeleton() {
  const wrap = el("ticket-wrap");
  if (!wrap) return;
  let skel = el("ticket-skeleton");
  if (!skel) {
    skel = document.createElement("div");
    skel.id = "ticket-skeleton";
    skel.className = "skeleton h-64 rounded-2xl mb-4";
    wrap.insertBefore(skel, wrap.firstChild);
  }
  skel.style.display = "block";
  // sembunyikan canvas saat loading
  const cv = el("ticket-canvas");
  if (cv) cv.style.visibility = "hidden";
}

function hideSkeleton() {
  const skel = el("ticket-skeleton");
  if (skel) skel.style.display = "none";
  const cv = el("ticket-canvas");
  if (cv) cv.style.visibility = "visible";
}

/* ================ Render Ticket (Canvas) ================ */

async function renderTicketCard(rec) {
  const wrap = el("ticket-wrap");
  if (!wrap) return null;

  // Siapkan canvas TANPA menghapus isi #ticket-wrap
  let cv = el("ticket-canvas");
  if (!cv) {
    cv = document.createElement("canvas");
    cv.id = "ticket-canvas";
    // taruh di paling atas, sebelum tombol unduh
    wrap.insertBefore(cv, wrap.firstChild);
  }

  // Ukuran gambar akhir (tajam saat download)
  const W = 1200, H = 680;
  cv.width = W; cv.height = H;

  // Responsif di halaman
  cv.style.width = "100%";
  cv.style.maxWidth = "900px";
  cv.style.height = "auto";

  const ctx = cv.getContext("2d");

  // Latar luar kartu
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, W, H);

  // Kartu gradient warna kaya
  const pad = 28;
  const cardX = pad, cardY = pad, cardW = W - pad * 2, cardH = H - pad * 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;

  const g = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  g.addColorStop(0.00, "#06b6d4"); // cyan
  g.addColorStop(0.20, "#14b8a6"); // teal
  g.addColorStop(0.45, "#2563eb"); // blue
  g.addColorStop(0.70, "#4f46e5"); // indigo
  g.addColorStop(0.85, "#7c3aed"); // violet
  g.addColorStop(1.00, "#a21caf"); // fuchsia

  roundRect(ctx, cardX, cardY, cardW, cardH, 34);
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();

  // ===== Teks judul: digambar dulu supaya tidak ketabrak panel QR =====
  const leftX = cardX + 48;
  let y = cardY + 88;

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 44px 'Inter', system-ui";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", leftX, y);

  const titleBottom = y + 20; // batas bawah judul, untuk menempatkan panel QR
  y += 56;

  ctx.font = "700 34px 'Inter', system-ui";
  ctx.fillText(String(rec.nama || "-"), leftX, y);

  // ===== Panel QR putih (compact) — posisikan di bawah judul jika perlu =====
  const qrBoxSize = 320;  // panel putih
  const qrInner   = 240;  // ukuran QR di dalam panel
  const qrBoxX = cardX + cardW - qrBoxSize - 40;
  let   qrBoxY = cardY + 72;
  if (qrBoxY < titleBottom + 24) qrBoxY = titleBottom + 24; // cegah overlap judul

  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
  ctx.fillStyle = "#ffffff"; ctx.fill();

  const qrCanvas = await makeQRCanvas(rec.code || rec.id || "NO-CODE", qrInner, "#ffffff", "#000000");
  const qx = qrBoxX + (qrBoxSize - qrInner) / 2;
  const qy = qrBoxY + (qrBoxSize - qrInner) / 2;
  ctx.drawImage(qrCanvas, qx, qy, qrInner, qrInner);

  // ===== Kolom data kiri =====
  y += 40; drawLine(ctx, "Fakultas:", rec.fakultas, leftX, y);
  y += 40; drawLine(ctx, "Prodi:",    rec.prodi,    leftX, y);
  y += 40; drawLine(ctx, "WA:",       waDisplay(rec.wa), leftX, y);
  y += 40; drawLine(ctx, "Makanan:",  rec.makanan,  leftX, y);
  y += 40; drawLine(ctx, "Domisili:", rec.domisili, leftX, y);
  y += 40; drawLine(ctx, "Kode:",     rec.code || "-", leftX, y);

  // Status & Bayar sebagai badge
  y += 40;
  drawBadgeRow(ctx, "Status:", "Terdaftar", leftX, y, { bg: "#f59e0b", fg: "#111827" });
  y += 48;
  const paid = isPaid(rec);
  drawBadgeRow(
    ctx,
    "Bayar:",
    paid ? "Sudah" : "Belum",
    leftX,
    y,
    paid ? { bg: "#10b981", fg: "#0b1220" } : { bg: "#ef4444", fg: "#0b1220" }
  );

  // Simpan kode untuk nama file download
  el("__lastTicketCode")?.remove();
  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.id   = "__lastTicketCode";
  hidden.value = String(rec.code || rec.id || "ticket");
  wrap.appendChild(hidden);

  // Pastikan wrapper & tombol unduh terlihat dan aktif
  wrap.classList.remove("hidden");
  const dl = el("t-download");
  if (dl) { dl.disabled = false; dl.classList.remove("hidden"); }

  return cv;
}

/* ================= Cari & Binding ================= */

export async function findTicket() {
  const wrap = el("ticket-wrap");
  const msg  = el("ticket-msg");
  if (msg) { msg.className = "text-sm mt-2 text-red-400"; msg.textContent = ""; }

  const raw = $("#t-search")?.value?.trim();
  if (!raw) { if (msg) msg.textContent = "Masukkan kode atau nomor WA."; return; }

  // Tampilkan wrapper + skeleton, tanpa menghapus tombol
  if (wrap) {
    wrap.classList.remove("hidden");
    showSkeleton();
  }

  try {
    const { rec } = await api.getTicket(raw);
    if (!rec) {
      if (msg) msg.textContent = "Data tidak ditemukan.";
      hideSkeleton();
      wrap?.classList.add("hidden");
      return;
    }
    await renderTicketCard(rec);
    hideSkeleton();
  } catch (e) {
    if (msg) msg.textContent = "Gagal mengambil tiket: " + (e?.message || e);
    hideSkeleton();
    wrap?.classList.add("hidden");
  }
}

export function bindTicket() {
  el("t-find")?.addEventListener("click", findTicket);

  // Klik tombol Unduh (binding langsung)
  el("t-download")?.addEventListener("click", () => {
    const cv = el("ticket-canvas"); if (!cv) return;
    const code = el("__lastTicketCode")?.value || "ticket";
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = `${code}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // Fallback delegation (kalau tombol baru muncul/diganti di DOM)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("#t-download");
    if (!btn) return;
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
