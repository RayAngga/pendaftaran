// assets/js/renderer.js
// Gambar e-ticket ke canvas offscreen, lalu mengembalikan dataURL PNG.
// Pakai: const png = await buildTicketImage(rec);  // rec dari server
//       // atau: const png = await buildTicketImage(rec, { width: 2200, height: 1100 });

export async function buildTicketImage(rec, opt = {}) {
  const {
    width  = 2200,
    height = 1100,
    bleed  = 48,     // margin luar untuk frame
    qrSize = 540,    // ukuran QR di dalam panel putih
    nameSize = 112,  // ukuran teks nama
  } = opt;

  // --- Canvas dasar
  const cvs = document.createElement("canvas");
  cvs.width = width;
  cvs.height = height;
  const ctx = cvs.getContext("2d");

  // --- Latar belakang (teal → purple)
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0.00, "#0ea5b3");
  bg.addColorStop(0.25, "#0ea5b3");
  bg.addColorStop(0.70, "#4f46e5");
  bg.addColorStop(1.00, "#6d28d9");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // --- Kartu utama
  const CARD_R = 44;
  const cardX = bleed, cardY = bleed;
  const cardW = width - bleed * 2;
  const cardH = height - bleed * 2;

  // bayangan lembut
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.35)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  roundRect(ctx, cardX, cardY, cardW, cardH, CARD_R);
  ctx.fillStyle = "#0f1b29"; // navy very dark
  ctx.fill();
  ctx.restore();

  // garis aksen bawah
  const stripeH = 12;
  const stripe = ctx.createLinearGradient(cardX, cardY + cardH - stripeH, cardX + cardW, cardY + cardH);
  stripe.addColorStop(0, "#22d3ee");
  stripe.addColorStop(1, "#a78bfa");
  ctx.fillStyle = stripe;
  ctx.fillRect(cardX + 18, cardY + cardH - stripeH - 18, cardW - 36, stripeH);

  // --- Tipografi
  const TITLE_Y = cardY + 120;
  const LEFT = cardX + 64;
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 64px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", LEFT, TITLE_Y);

  // Nama
  ctx.font = `900 ${nameSize}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu`;
  ctx.fillText(String(rec?.nama || "-"), LEFT, TITLE_Y + 72);

  // --- Panel QR
  const panelSize = Math.min(880, Math.min(cardW, cardH) * 0.62);
  const panelW = Math.max(qrSize + 120, panelSize);
  const panelH = panelW;
  const panelX = cardX + cardW - panelW - 76;
  const panelY = cardY + 160;

  roundRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // gambar QR
  const qrCanvas = await generateQR(String(rec?.code || rec?.id || "NA"), qrSize);
  const qx = panelX + (panelW - qrSize) / 2;
  const qy = panelY + (panelH - qrSize) / 2;
  ctx.drawImage(qrCanvas, qx, qy, qrSize, qrSize);

  // --- Kolom kiri (label : nilai)
  let y = cardY + 220;
  const ROW_GAP = 72;

  y = drawRow(ctx, "Fakultas",   clean(rec?.fakultas), LEFT, y);
  y = drawRow(ctx, "Prodi",      clean(rec?.prodi),    LEFT, y);
  y = drawRow(ctx, "WA",         waDisplay(rec?.wa),   LEFT, y);
  y = drawRow(ctx, "Makanan",    foodText(rec?.makanan), LEFT, y);
  y = drawRow(ctx, "Domisili",   clean(rec?.domisili), LEFT, y);
  y = drawRow(ctx, "Kode",       String(rec?.code || "-"), LEFT, y);

  // --- Dua baris terakhir: label BIASA + pill nilai (label tidak berwarna)
  // Status
  y += 8;
  const labelW1 = drawLabel(ctx, "Status:", LEFT, y);
  drawPillValue(ctx, Number(rec?.attended) ? "Hadir" : "Terdaftar",
                LEFT + labelW1 + 18, y - 50,
                Number(rec?.attended) ? "#60a5fa" : "#f59e0b");
  y += ROW_GAP;

  // Bayar
  const labelW2 = drawLabel(ctx, "Bayar:", LEFT, y);
  const paid = Number(rec?.paid) === 1;
  drawPillValue(ctx, paid ? "Sudah" : "Belum",
                LEFT + labelW2 + 18, y - 50,
                paid ? "#34d399" : "#ef4444");

  // Selesai → kembalikan dataURL
  return cvs.toDataURL("image/png");

  /* ---------------- helpers ---------------- */

  function clean(v) {
    return (v === null || v === undefined || v === "") ? "-" : String(v);
  }

  function waDisplay(v) {
    let s = String(v || "").replace(/[^\d]/g, "");
    if (!s) return "-";
    if (s.startsWith("62")) s = "0" + s.slice(2);
    if (s[0] === "8") s = "0" + s;
    if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
    // sedikit format agar enak dibaca: 4-4-4
    if (s.length >= 10) s = s.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
    return s;
  }

  function foodText(makanan) {
    if (!makanan && makanan !== 0) return "-";
    if (typeof makanan === "object") return makanan.label || makanan.value || "-";
    return String(makanan);
  }

  // label + value biasa (seperti tabel)
  function drawRow(ctx, label, value, x, y) {
    ctx.font = "700 44px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "rgba(203,213,225,1)";
    ctx.fillText(label + ":", x, y);

    ctx.font = "400 48px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(value || "-"), x + 230, y);
    return y + ROW_GAP;
  }

  // label tanpa background, mengembalikan lebar teks label
  function drawLabel(ctx, text, x, y) {
    ctx.font = "700 44px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "rgba(203,213,225,1)";
    ctx.fillText(text, x, y);
    return Math.ceil(ctx.measureText(text).width);
  }

  // pill untuk NILAI (contoh: Hadir / Sudah)
  function drawPillValue(ctx, text, x, y, bg = "#10b981") {
    const padX = 22, padY = 14, h = 56;
    ctx.font = "800 40px system-ui, -apple-system, Segoe UI";
    const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
    roundRect(ctx, x, y, w, h, 999);
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.fillStyle = "#0b1220";
    ctx.fillText(text, x + padX, y + h - padY);
  }

  async function generateQR(text, size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    try {
      if (window.QRCode?.toCanvas) {
        await window.QRCode.toCanvas(c, text, {
          width: size, margin: 1, errorCorrectionLevel: "H",
          color: { light: "#ffffff", dark: "#000000" }
        });
        return c;
      }
    } catch {}
    try {
      if (window.QRious) {
        new window.QRious({ element: c, value: text, size, level: "H", background: "#ffffff", foreground: "#000000" });
        return c;
      }
    } catch {}
    // fallback kotak hitam 🤷
    const ctx2 = c.getContext("2d");
    ctx2.fillStyle = "#fff"; ctx2.fillRect(0, 0, size, size);
    ctx2.fillStyle = "#000"; ctx2.fillRect(size * .3, size * .3, size * .4, size * .4);
    return c;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
