// assets/js/renderer.js
export async function buildTicketImage(rec, opt = {}) {
  const W = opt.width ?? 2200;
  const H = opt.height ?? 1100;
  const bleed = opt.bleed ?? 48;
  const cardR = 40;

  // Canvas
  const cvs = document.createElement("canvas");
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext("2d");

  /* ===== Background ===== */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#19b6c7");
  bg.addColorStop(0.5, "#264b86");
  bg.addColorStop(1, "#5a2aa6");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  /* ===== Card ===== */
  const cardX = bleed, cardY = bleed;
  const cardW = W - bleed * 2, cardH = H - bleed * 2;

  // soft outer glow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR, "#0f1b27");
  ctx.restore();

  // bottom stripe
  const stripe = ctx.createLinearGradient(cardX, cardY + cardH, cardX + cardW, cardY + cardH);
  stripe.addColorStop(0, "#22d3ee");
  stripe.addColorStop(1, "#a78bfa");
  ctx.fillStyle = stripe;
  ctx.fillRect(cardX + 16, cardY + cardH - 14, cardW - 32, 10);

  /* ===== Title & Name ===== */
  const left = cardX + 52;
  let y = cardY + 120;

  ctx.fillStyle = "#fff";
  ctx.font = "800 78px Inter, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", left, y);

  y += 66;
  ctx.font = "800 98px Inter, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(String(rec.nama || "-"), left, y);

  /* ===== Right: QR Panel ===== */
  const qrBox = Math.min(860, cardH - 220);
  const qrPadding = 66;
  const qrSize = qrBox - qrPadding * 2;
  const rightX = cardX + cardW - qrBox - 70;
  const rightY = cardY + 120;

  roundRect(ctx, rightX, rightY, qrBox, qrBox, 28, "#ffffff");

  // generate real QR when lib available (qrcode -> qrious -> fallback)
  const qrCanvas = await genQR(String(rec.code || rec.id || "NA"), qrSize);
  const qx = rightX + (qrBox - qrSize) / 2;
  const qy = rightY + (qrBox - qrSize) / 2;
  ctx.drawImage(qrCanvas, qx, qy, qrSize, qrSize);

  /* ===== Left column data ===== */
  y += 64; // gap before table
  const labelX = left;
  const valueX = left + 220;
  const lh = 68;

  const rows = [
    ["Fakultas:", rec.fakultas],
    ["Prodi:", rec.prodi],
    ["WA:", formatWA(rec.wa)],
    ["Makanan:", prettyFood(rec.makanan)],
    ["Domisili:", rec.domisili],
    ["Kode:", rec.code]
  ];

  rows.forEach(([lab, val]) => {
    drawRow(ctx, lab, val || "-", labelX, valueX, y);
    y += lh;
  });

  // Badges: label tetap teks biasa, chip rata baseline
  drawLabel(ctx, "Status:", labelX, y);
  drawChip(ctx, Number(rec.attended) ? "Hadir" : "Terdaftar", valueX, y, {
    bg: "#1d4ed8", fg: "#e0e7ff"
  });
  y += lh;

  drawLabel(ctx, "Bayar:", labelX, y);
  drawChip(
    ctx,
    Number(rec.paid) ? "Sudah" : "Belum",
    valueX,
    y,
    Number(rec.paid)
      ? { bg: "#10b981", fg: "#052e24" }
      : { bg: "#ef4444", fg: "#3b0d0d" }
  );

  return cvs.toDataURL("image/png");

  /* ===== helpers ===== */

  function roundRect(ctx, x, y, w, h, r, fill) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }

  function drawRow(ctx, lab, val, lx, vx, yy) {
    drawLabel(ctx, lab, lx, yy);
    ctx.font = "400 46px Inter, system-ui";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(val), vx, yy);
  }

  function drawLabel(ctx, lab, lx, yy) {
    ctx.font = "700 46px Inter, system-ui";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(lab, lx, yy);
  }

  function drawChip(ctx, text, x, baselineY, opt = {}) {
    const padX = 22, padY = 14, radius = 18;
    ctx.font = "800 40px Inter, system-ui";
    const w = ctx.measureText(text).width + padX * 2;
    const h = 48 + padY; // visual height
    const top = baselineY - h + 8; // align to same baseline as label
    ctx.save();
    roundRect(ctx, x, top, w, h, radius, opt.bg || "#0ea5e9");
    ctx.fillStyle = opt.fg || "#06223a";
    // center text vertically
    const ty = top + h / 2 + 14; // tuned for this font size
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padX, ty);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
  }

  function formatWA(v) {
    let s = String(v || "").replace(/[^\d]/g, "");
    if (!s) return "";
    if (s.startsWith("62")) s = "0" + s.slice(2);
    if (s[0] === "8") s = "0" + s;
    if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
    // spasi tiap 4 digit agar mirip desain
    return s.replace(/(\d{4})(?=\d)/g, "$1-");
  }

  function prettyFood(m) {
    if (!m) return "-";
    if (typeof m === "object") return m.label || m.value || "-";
    return String(m);
  }

  async function genQR(text, size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;

    // 1) qrcode
    try {
      if (window.QRCode?.toCanvas) {
        await window.QRCode.toCanvas(c, text, {
          width: size,
          margin: 0,
          errorCorrectionLevel: "H",
          color: { light: "#ffffff", dark: "#000000" }
        });
        return c;
      }
    } catch {}

    // 2) qrious
    try {
      if (window.QRious) {
        new window.QRious({ element: c, value: text, size, level: "H", background: "white", foreground: "black" });
        return c;
      }
    } catch {}

    // 3) fallback sederhana (tetap center & kontras)
    const k = c.getContext("2d");
    k.fillStyle = "#fff"; k.fillRect(0, 0, size, size);
    k.fillStyle = "#000";
    const u = Math.floor(size / 6);
    // tiga finder pattern minimalis
    k.fillRect(u * 0.6, u * 0.6, u, u);
    k.fillRect(size - u * 1.6, u * 0.6, u, u);
    k.fillRect(u * 0.6, size - u * 1.6, u, u);
    // blok tengah
    k.fillRect(size / 2 - u / 4, size / 2 - u / 4, u / 2, u / 2);
    return c;
  }
}
