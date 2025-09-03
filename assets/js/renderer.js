// assets/js/renderer.js
// Desain aurora + badge + panel QR putih kecil (seperti foto)

export async function buildTicketImage(rec, opt = {}) {
  const {
    width = 2200,
    height = 1100,
    bleed = 48,         // margin luar (vignette)
    qrSize = 460,       // ukuran QR di dalam panel putih
  } = opt;

  // --- Canvas & ctx
  const cvs = document.createElement("canvas");
  cvs.width = width; cvs.height = height;
  const ctx = cvs.getContext("2d");

  // === BACKGROUND (aurora + vignette) ===
  // layer 1: dasar gelap
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, width, height);

  // layer 2: kabut gradien (aurora)
  const gAur = ctx.createLinearGradient(0, 0, width, height);
  gAur.addColorStop(0.00, "rgba(6,182,212,0.16)");  // cyan
  gAur.addColorStop(0.30, "rgba(20,184,166,0.16)"); // teal
  gAur.addColorStop(0.55, "rgba(37,99,235,0.16)");  // blue
  gAur.addColorStop(0.78, "rgba(79,70,229,0.16)");  // indigo
  gAur.addColorStop(1.00, "rgba(124,58,237,0.16)"); // violet
  ctx.fillStyle = gAur;
  ctx.fillRect(0, 0, width, height);

  // layer 3: vignette lembut
  const rad = ctx.createRadialGradient(width/2, height/2, Math.min(width,height)/6, width/2, height/2, Math.max(width,height)/1.2);
  rad.addColorStop(0, "rgba(0,0,0,0)");
  rad.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, width, height);

  // === CARD ===
  const cardR = 40;
  const cardX = bleed;
  const cardY = bleed;
  const cardW = width  - bleed*2;
  const cardH = height - bleed*2;

  // bayangan card
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 16;

  // gradient isi card
  const gCard = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  gCard.addColorStop(0.00, "#06b6d4"); // cyan
  gCard.addColorStop(0.22, "#14b8a6"); // teal
  gCard.addColorStop(0.48, "#2563eb"); // blue
  gCard.addColorStop(0.72, "#4f46e5"); // indigo
  gCard.addColorStop(0.88, "#7c3aed"); // violet
  gCard.addColorStop(1.00, "#a21caf"); // fuchsia

  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fillStyle = gCard; ctx.fill();
  ctx.restore();

  // === HEADER ===
  const leftX = cardX + 64;
  let y = cardY + 120;

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 76px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", leftX, y);

  y += 70;
  ctx.font = "700 58px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(String(rec?.nama || "-"), leftX, y);

  // === QR PANEL PUTIH (kecil) ===
  const qrPanelSize = qrSize + 120;               // panel lebih besar dari QR
  const qrPanelX = cardX + cardW - qrPanelSize - 72;
  let   qrPanelY = cardY + 120;

  // jaga agar tidak menimpa judul
  const titleBottom = y + 20;
  if (qrPanelY < titleBottom + 24) qrPanelY = titleBottom + 24;

  // panel putih + bayangan
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, qrPanelX, qrPanelY, qrPanelSize, qrPanelSize, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  // QR
  const qrC = await makeQR(String(rec?.code || rec?.id || "NO-CODE"), qrSize);
  const qx = qrPanelX + (qrPanelSize - qrSize)/2;
  const qy = qrPanelY + (qrPanelSize - qrSize)/2;
  ctx.drawImage(qrC, qx, qy, qrSize, qrSize);

  // === KOLOM KIRI (label : nilai) ===
  y += 48;

  const L = (label, val) => {
    ctx.font = "600 36px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "rgba(229,231,235,1)"; // slate-200
    ctx.fillText(label, leftX, y);
    ctx.font = "400 40px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(val ?? "-"), leftX + 220, y);
    y += 54;
  };

  L("Fakultas:", rec?.fakultas || "-");
  L("Prodi:",    rec?.prodi    || "-");
  L("WA:",       waDisplay(rec?.wa));
  L("Makanan:",  toFood(rec?.makanan));
  L("Domisili:", rec?.domisili || "-");
  L("Kode:",     rec?.code     || "-");

  // === BADGES ===
  y += 6;
  drawBadgeRow(ctx, "Status:", Number(rec?.attended) ? "Hadir" : "Terdaftar", leftX, y,
    Number(rec?.attended) ? {bg:"#34d399", fg:"#0b1220"} : {bg:"#f59e0b", fg:"#111827"});
  y += 64;
  drawBadgeRow(ctx, "Bayar:",  Number(rec?.paid) ? "Sudah" : "Belum", leftX, y,
    Number(rec?.paid) ? {bg:"#10b981", fg:"#0b1220"} : {bg:"#ef4444", fg:"#0b1220"});

  // === STRIPE BAWAH (gradasi brand) ===
  const stripeH = 14;
  const gradStripe = ctx.createLinearGradient(cardX, cardY+cardH-stripeH, cardX+cardW, cardY+cardH);
  gradStripe.addColorStop(0, "#22d3ee");
  gradStripe.addColorStop(1, "#a78bfa");
  ctx.fillStyle = gradStripe;
  ctx.fillRect(cardX, cardY + cardH - stripeH, cardW, stripeH);

  // hasil PNG
  return cvs.toDataURL("image/png");

  /* ===== helpers ===== */
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
  function drawBadgeRow(ctx, label, text, x, y, {bg="#10b981", fg="#0b1220"} = {}){
    ctx.font = "600 36px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "rgba(229,231,235,1)";
    ctx.fillText(label, x, y);

    const padX = 26, h = 54;
    ctx.font = "800 34px system-ui, -apple-system, Segoe UI";
    const w = ctx.measureText(text).width + padX*2;
    const rx = x + 220, ry = y - h + 14;

    ctx.beginPath();
    roundRect(ctx, rx, ry, w, h, 999);
    ctx.fillStyle = bg; ctx.fill();

    ctx.fillStyle = fg;
    ctx.fillText(text, rx + padX, y - 10);
  }
  function waDisplay(v){
    let s = String(v || "").replace(/[^\d]/g, "");
    if (!s) return "-";
    if (s.startsWith("62")) s = "0" + s.slice(2);
    if (s[0] === "8") s = "0" + s;
    if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
    return s;
  }
  function toFood(m){
    if (!m) return "-";
    if (typeof m === "object") return m.label || m.value || "-";
    return String(m);
  }
  async function makeQR(text, size){
    const c = document.createElement("canvas");
    c.width = c.height = size;
    try{
      if (window.QRCode?.toCanvas){
        await window.QRCode.toCanvas(c, text, {
          width: size, margin: 1, errorCorrectionLevel: "H",
          color: { light: "#ffffff", dark: "#000000" }
        });
        return c;
      }
    }catch{}
    try{
      if (window.QRious){
        new window.QRious({ element: c, value: text, size, background:"#fff", foreground:"#000", level:"H" });
        return c;
      }
    }catch{}
    // fallback super sederhana
    const cx = c.getContext("2d");
    cx.fillStyle = "#fff"; cx.fillRect(0,0,size,size);
    cx.fillStyle = "#000"; cx.fillRect(size*0.4,size*0.4,size*0.2,size*0.2);
    return c;
  }
}
