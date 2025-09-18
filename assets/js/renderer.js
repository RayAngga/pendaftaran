// assets/js/renderer.js
export async function buildTicketImage(rec, opt = {}) {
  const W = opt.width  || 1920;
  const H = opt.height || 1080;
  const BLEED   = opt.bleed  || 40;
  const QR_SIZE = opt.qrSize || 520;
  const DPR = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;

  // Kontrol tampilan judul & nama
  const TITLE_SIZE   = opt.titleSize   || 72;   // besar font judul
  const TITLE_WEIGHT = opt.titleWeight || 800;  // ketebalan judul
  const TITLE_GAP    = opt.titleGap    || 28;   // jarak setelah judul
  const NAME_SIZE    = opt.nameSize    || 96;   // besar font nama

  // Kontrol baris pill (Status/Bayar)
  const PILL_H   = 56;  // tinggi pill
  const PILL_GAP = 14;  // jarak antar baris pill

  // === Canvas
  const cv = document.createElement("canvas");
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + "px";
  cv.style.height = H + "px";
  const ctx = cv.getContext("2d");
  ctx.scale(DPR, DPR);

  // ---- Background aurora + vignette
  let g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0.00, "#0ea5a3");
  g.addColorStop(0.45, "#1f2d4e");
  g.addColorStop(1.00, "#6d28d9");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const rad = ctx.createRadialGradient(W*0.3, H*0.25, 80, W*0.5, H*0.5, Math.max(W,H)*0.7);
  rad.addColorStop(0, "rgba(0,0,0,0)");
  rad.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = rad; ctx.fillRect(0,0,W,H);

  // ---- Card
  const cardX = BLEED, cardY = BLEED;
  const cardW = W - BLEED*2, cardH = H - BLEED*2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 22;
  roundRect(ctx, cardX, cardY, cardW, cardH, 36);
  const gCard = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  gCard.addColorStop(0, "#0f1e2c");
  gCard.addColorStop(1, "#122434");
  ctx.fillStyle = gCard; ctx.fill();
  ctx.restore();

  // stripe bawah
  const stripeH = 14;
  const gStripe = ctx.createLinearGradient(cardX, cardY+cardH-stripeH, cardX+cardW, cardY+cardH);
  gStripe.addColorStop(0, "#22d3ee"); gStripe.addColorStop(1, "#a78bfa");
  ctx.fillStyle = gStripe; ctx.fillRect(cardX, cardY+cardH-stripeH, cardW, stripeH);

  // ---- Header (judul + nama)
  const LEFT = cardX + 60;
  const titleTop = cardY + 120;
  let y = titleTop;

  ctx.textBaseline = "top";
  ctx.fillStyle = "#e7eef7";
  ctx.font = `${TITLE_WEIGHT} ${TITLE_SIZE}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu`;
  ctx.fillText("GROW TOGETHER FLOW TOGETHER MABA — E-Ticket", LEFT, y);

  const titleBottom = titleTop + TITLE_SIZE;
  y = titleBottom + TITLE_GAP;

  // Nama
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${NAME_SIZE}px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu`;
  ctx.fillText(String(rec?.nama || "-"), LEFT, y);

  const nameBottom = y + NAME_SIZE;

  // ---- QR panel putih (selalu di bawah judul)
  const PANEL = QR_SIZE + 140;
  const qxPanel = cardX + cardW - PANEL - 88;
  const qyPanel = Math.max(cardY + 140, titleBottom + TITLE_GAP);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, qxPanel, qyPanel, PANEL, PANEL, 34);
  ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.restore();

  let gGloss = ctx.createLinearGradient(qxPanel, qyPanel, qxPanel, qyPanel + PANEL);
  gGloss.addColorStop(0, "rgba(255,255,255,0.65)");
  gGloss.addColorStop(0.12, "rgba(255,255,255,0.0)");
  gGloss.addColorStop(1, "rgba(0,0,0,0.0)");
  roundRect(ctx, qxPanel, qyPanel, PANEL, PANEL, 34);
  ctx.fillStyle = gGloss; ctx.fill();

  const qrCanvas = await makeQR(String(rec?.code || rec?.id || "NO-CODE"), QR_SIZE);
  ctx.drawImage(qrCanvas, qxPanel + (PANEL-QR_SIZE)/2, qyPanel + (PANEL-QR_SIZE)/2, QR_SIZE, QR_SIZE);

  // ---- Kolom kiri
  y = nameBottom + 70;                 // mulai setelah nama
  const LBL_W = 210;
  const lineStep = 72;

  const line = (label, value) => {
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 44px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "rgba(203,213,225,1)";
    ctx.fillText(label, LEFT, y);
    ctx.font = "400 44px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "#eaf1f9";
    ctx.fillText(String(value ?? "-"), LEFT + LBL_W, y);
    y += lineStep;
  };

  line("Fakultas", rec?.fakultas || "-");
  line("Prodi",    rec?.prodi    || "-");
  line("WA",       waPretty(rec?.wa));
  line("Kode",     rec?.code || "-");

  // ---- Dua baris pill: Status & Bayar (SEJAJAR TENGAH)
  const attended = Number(rec?.attended) === 1;
  const paid = Number(rec?.paid) === 1;

  // Row 1: Status
  let rowTop = y + 8; // sedikit jarak dari baris sebelumnya
  const p1 = drawPillLabel(ctx, "Status:", LEFT, rowTop, PILL_H);
  drawPillValue(ctx, attended ? "Hadir" : "Terdaftar",
                p1.x + p1.w + 18, rowTop, PILL_H,
                attended ? "#60a5fa" : "#f59e0b");
  y = rowTop + PILL_H + PILL_GAP;

  // Row 2: Bayar
  rowTop = y;
  const p2 = drawPillLabel(ctx, "Bayar:", LEFT, rowTop, PILL_H);
  drawPillValue(ctx, paid ? "Sudah" : "Belum",
                p2.x + p2.w + 18, rowTop, PILL_H,
                paid ? "#34d399" : "#ef4444");

  return cv.toDataURL("image/png");

  // ===== Helpers
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

  // Label kiri (tanpa background), baseline middle → sejajar dengan pill
  function drawPillLabel(ctx, text, x, yTop, H){
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "rgba(203,213,225,1)";
    const cy = yTop + H/2;
    ctx.fillText(text, x, cy);
    const textW = Math.ceil(ctx.measureText(text).width);
    ctx.restore();
    const w = textW + 60; // padding kecil agar jarak ke value konsisten
    return { x, y: yTop, w, h: H };
  }

  // Nilai pill (dengan background), baseline middle
  function drawPillValue(ctx, text, x, yTop, H, bg){
    const PADX = 28;
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI";
    const w = Math.ceil(ctx.measureText(text).width) + PADX*2;
    roundRect(ctx, x, yTop, w, H, 16);
    ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = "#0b1220";
    ctx.fillText(text, x + PADX, yTop + H/2);
    ctx.restore();
  }

  async function makeQR(text, size){
    const c = document.createElement("canvas");
    c.width = c.height = size;
    try{
      if (window.QRCode?.toCanvas){
        await window.QRCode.toCanvas(c, text, { width: size, margin: 1, errorCorrectionLevel: "H",
          color: { light: "#ffffff", dark: "#000000" }});
        return c;
      }
    }catch{}
    try{
      if (window.QRious){
        new window.QRious({ element: c, value: text, size, level: "H", background:"#fff", foreground:"#000" });
        return c;
      }
    }catch{}
    const cx = c.getContext("2d");
    cx.fillStyle = "#fff"; cx.fillRect(0,0,size,size);
    cx.fillStyle = "#000"; cx.fillRect(size*0.4,size*0.4,size*0.2,size*0.2);
    return c;
  }

  function waPretty(v){
    let s = String(v||"").replace(/[^\d]/g,"");
    if (!s) return "-";
    if (s.startsWith("62")) s = "0"+s.slice(2);
    if (s[0] === "8") s = "0"+s;
    if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0"+s;

    const parts = [];
    let i = 0; const pattern = [4,4,4,4];
    for (const n of pattern){ if (i >= s.length) break; parts.push(s.slice(i, i+n)); i += n; }
    return parts.join("-");
  }
}
