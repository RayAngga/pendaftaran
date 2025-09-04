// assets/js/renderer.js
// Gambar e-ticket ke sebuah canvas lalu kembalikan dataURL PNG
// Dependensi global: window.QRCode (dari qrcode.min.js)

export async function buildTicketImage(rec, opt = {}) {
  const {
    width = 2200,
    height = 1100,
    bleed = 48,
    qrSize = 560,       // ukuran QR di dalam panel putih
  } = opt;

  // ==== Helpers lokal =========================================
  const cvs = document.createElement("canvas");
  cvs.width = width;
  cvs.height = height;
  const ctx = cvs.getContext("2d");

  function roundRectPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function fillRoundRect(x, y, w, h, r, fillStyle) {
    roundRectPath(x, y, w, h, r);
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  function waDisplay(v) {
    let s = String(v || "").replace(/[^\d]/g, "");
    if (!s) return "";
    if (s.startsWith("62")) s = "0" + s.slice(2);
    if (s[0] === "8") s = "0" + s;
    if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
    // opsional: format 4-4-xxx bila panjang 12–13
    if (s.length >= 12 && s.length <= 13) {
      const a = s.slice(0, 4), b = s.slice(4, 8), c = s.slice(8);
      s = `${a}-${b}-${c}`;
    }
    return s;
  }

  function drawLabelValue(label, value, x, y, labelWidth = 220) {
    ctx.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
    ctx.fillStyle = "#b8c2cf"; // abu label
    ctx.fillText(label, x, y);

    ctx.font = "400 44px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(value ?? "-"), x + labelWidth, y);
  }

  function drawChip(text, x, y, { bg = "#0ea5e9", fg = "#0b1220" } = {}) {
    const padX = 22, h = 52, r = 18;
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
    const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
    const top = y - h + 40; // sejajarkan dengan baseline label
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.25)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    fillRoundRect(x, top, w, h, r, bg);
    ctx.restore();
    ctx.fillStyle = fg;
    ctx.fillText(text, x + padX, y - 8);
    return w;
  }

  async function makeQRCanvas(text, size = 560) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    try {
      if (window.QRCode?.toCanvas) {
        await window.QRCode.toCanvas(c, text || "NA", {
          width: size,
          margin: 1,
          errorCorrectionLevel: "H",
          color: { light: "#ffffff", dark: "#000000" },
        });
        return c;
      }
    } catch {}
    // fallback sederhana
    const k = c.getContext("2d");
    k.fillStyle = "#fff"; k.fillRect(0, 0, size, size);
    k.fillStyle = "#000"; k.fillRect(size * 0.4, size * 0.4, size * 0.2, size * 0.2);
    return c;
  }

  // ==== Background ============================================
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0.00, "#0ea5b6");  // teal
  bg.addColorStop(0.40, "#0f172a");  // deep
  bg.addColorStop(1.00, "#5b21b6");  // violet
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // ==== Kartu utama ===========================================
  const cardX = bleed, cardY = bleed;
  const cardW = width - bleed * 2;
  const cardH = height - bleed * 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;
  fillRoundRect(cardX, cardY, cardW, cardH, 44, "#0f1a26");
  ctx.restore();

  // border tipis dalam
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  roundRectPath(cardX + 2, cardY + 2, cardW - 4, cardH - 4, 42);
  ctx.stroke();

  // garis aksen bawah
  const stripe = ctx.createLinearGradient(cardX, cardY + cardH, cardX + cardW, cardY + cardH);
  stripe.addColorStop(0, "#22d3ee");
  stripe.addColorStop(1, "#a78bfa");
  ctx.fillStyle = stripe;
  ctx.fillRect(cardX + 16, cardY + cardH - 14, cardW - 32, 12);

  // ==== Layout kolom ==========================================
  const LEFT = cardX + 64;
  const RIGHT_PAD = 70;
  const panelSize = qrSize + 140;     // panel putih (padding QR 70px)
  const panelX = cardX + cardW - panelSize - RIGHT_PAD;
  const panelY = cardY + 120;

  // ==== Judul ==================================================
  const TITLE_Y = cardY + 120;
  const titleText = "RIUNGMUNGPULUNG MABA — E-Ticket";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 64px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  ctx.fillText(titleText, LEFT, TITLE_Y);

  // hitung tinggi judul + jarak minimum agar nama tak menumpuk
  const mt = ctx.measureText(titleText);
  const titleHeight =
    (mt.actualBoundingBoxAscent || 64 * 0.82) +
    (mt.actualBoundingBoxDescent || 10);

  const NAME_GAP_MIN = 150; // << kunci anti-numpuk
  let nameY = TITLE_Y + Math.max(titleHeight + 32, NAME_GAP_MIN);

  // ==== Nama (autoscale agar muat di kolom kiri) ===============
  let fontPx = 110;
  const name = String(rec?.nama || "-");
  const leftMaxW = (panelX - 40) - LEFT; // lebar efektif kolom kiri

  ctx.font = `900 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu`;
  let nameW = ctx.measureText(name).width;
  if (nameW > leftMaxW) {
    const scale = Math.max(0.6, leftMaxW / nameW);
    fontPx = Math.round(110 * scale);
    ctx.font = `900 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu`;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, LEFT, nameY);

  // Jarak setelah nama sebelum baris data
  let y = nameY + Math.max(64, Math.round(fontPx * 0.60));
  const LBL_W = 220;
  const GAP = 62;

  // ==== Data baris kiri =======================================
  drawLabelValue("Fakultas:", rec?.fakultas || "-", LEFT, y, LBL_W); y += GAP;
  drawLabelValue("Prodi:",    rec?.prodi || "-",     LEFT, y, LBL_W); y += GAP;
  drawLabelValue("WA:",       waDisplay(rec?.wa),    LEFT, y, LBL_W); y += GAP;
  drawLabelValue("Makanan:",  rec?.makanan || "-",   LEFT, y, LBL_W); y += GAP;
  drawLabelValue("Domisili:", rec?.domisili || "-",  LEFT, y, LBL_W); y += GAP;
  drawLabelValue("Kode:",     rec?.code || "-",      LEFT, y, LBL_W); y += GAP;

  // ==== Status & Bayar (label biasa, chip berwarna) ===========
  // Status = Hadir bila attended=1, jika tidak Terdaftar
  const isAttend = Number(rec?.attended) === 1;
  const isPaid   = Number(rec?.paid) === 1;

  // Label "Status:"
  ctx.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  ctx.fillStyle = "#b8c2cf";
  ctx.fillText("Status:", LEFT, y);
  // Chip status (biru)
  ctx.font = "800 34px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  drawChip(isAttend ? "Hadir" : "Terdaftar", LEFT + LBL_W, y, {
    bg: "#1d4ed8", fg: "#e8f0ff"
  });
  y += GAP;

  // Label "Bayar:"
  ctx.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  ctx.fillStyle = "#b8c2cf";
  ctx.fillText("Bayar:", LEFT, y);
  // Chip bayar (hijau/merah)
  drawChip(isPaid ? "Sudah" : "Belum", LEFT + LBL_W, y, isPaid
    ? { bg: "#10b981", fg: "#0b1220" }
    : { bg: "#ef4444", fg: "#0b1220" }
  );

  // ==== Panel QR putih ========================================
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  fillRoundRect(panelX, panelY, panelSize, panelSize, 28, "#ffffff");
  ctx.restore();

  // QR di tengah panel
  const qr = await makeQRCanvas(rec?.code || rec?.id || "NA", qrSize);
  const qx = panelX + (panelSize - qrSize) / 2;
  const qy = panelY + (panelSize - qrSize) / 2;
  ctx.drawImage(qr, qx, qy, qrSize, qrSize);

  // ==== Selesai: kembalikan dataURL ============================
  return cvs.toDataURL("image/png");
}
