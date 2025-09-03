// assets/js/renderer.js
// Replikasi desain seperti contoh foto (aurora bg, kartu, panel QR putih, pill status)

export async function buildTicketImage(rec, opt = {}) {
  // --- ukuran final PNG (sebelum skala DPR)
  const W = opt.width  || 1920;
  const H = opt.height || 1080;
  const BLEED = opt.bleed || 40;        // margin luar
  const QR_SIZE = opt.qrSize || 520;    // ukuran QR (di dalam panel)
  const DPR = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;

  // Canvas hi-DPI
  const cv = document.createElement("canvas");
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + "px";
  cv.style.height = H + "px";
  const ctx = cv.getContext("2d");
  ctx.scale(DPR, DPR);

  /* =========== BACKGROUND (aurora + vignette) =========== */
  // Lapisan 1: gradien aurora (teal → violet)
  let g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0.00, "#0ea5a3");
  g.addColorStop(0.45, "#1f2d4e");
  g.addColorStop(1.00, "#6d28d9");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Lapisan 2: vignette halus
  const rad = ctx.createRadialGradient(W*0.3, H*0.25, 80, W*0.5, H*0.5, Math.max(W,H)*0.7);
  rad.addColorStop(0, "rgba(0,0,0,0)");
  rad.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = rad; ctx.fillRect(0, 0, W, H);

  /* ================== KARTU ================== */
  const cardX = BLEED, cardY = BLEED;
  const cardW = W - BLEED*2, cardH = H - BLEED*2;
  const CARD_R = 36;

  // Bayangan kartu
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 22;
  roundRect(ctx, cardX, cardY, cardW, cardH, CARD_R);
  // Isi kartu: gradasi navy gelap
  const gCard = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  gCard.addColorStop(0, "#0f1e2c");
  gCard.addColorStop(1, "#122434");
  ctx.fillStyle = gCard; ctx.fill();
  ctx.restore();

  // Stripe gradasi di bawah kartu
  const stripeH = 14;
  const gStripe = ctx.createLinearGradient(cardX, cardY + cardH - stripeH, cardX + cardW, cardY + cardH);
  gStripe.addColorStop(0, "#22d3ee");
  gStripe.addColorStop(1, "#a78bfa");
  ctx.fillStyle = gStripe;
  ctx.fillRect(cardX, cardY + cardH - stripeH, cardW, stripeH);

  /* ================== HEADER ================== */
  const LEFT = cardX + 60;
  let y = cardY + 120;

  ctx.fillStyle = "#e7eef7";
  ctx.font = "800 56px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", LEFT, y);

  // Nama besar
  y += 88;
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 96px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  ctx.fillText(String(rec?.nama || "-"), LEFT, y);

  /* ================== PANEL QR PUTIH ================== */
  // Panel rounded putih dengan efek glossy halus
  const PANEL = QR_SIZE + 140;
  const qxPanel = cardX + cardW - PANEL - 88;
  // jaga supaya tidak menimpa judul
  const qyPanel0 = cardY + 140;
  const qyPanel = Math.max(qyPanel0, y - 96);

  // Bayangan panel
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 16;

  roundRect(ctx, qxPanel, qyPanel, PANEL, PANEL, 34);
  ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.restore();

  // Glossy lembut (linear gradient tipis)
  let gGloss = ctx.createLinearGradient(qxPanel, qyPanel, qxPanel, qyPanel + PANEL);
  gGloss.addColorStop(0, "rgba(255,255,255,0.65)");
  gGloss.addColorStop(0.12, "rgba(255,255,255,0.0)");
  gGloss.addColorStop(1, "rgba(0,0,0,0.0)");
  roundRect(ctx, qxPanel, qyPanel, PANEL, PANEL, 34);
  ctx.fillStyle = gGloss; ctx.fill();

  // QR
  const qrCanvas = await makeQR(String(rec?.code || rec?.id || "NO-CODE"), QR_SIZE);
  const qx = qxPanel + (PANEL - QR_SIZE)/2;
  const qy = qyPanel + (PANEL - QR_SIZE)/2;
  ctx.drawImage(qrCanvas, qx, qy, QR_SIZE, QR_SIZE);

  /* ================== KOLOM KIRI ================== */
  y += 70;
  const LBL_W = 210;

  const line = (label, value) => {
    ctx.font = "700 44px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "rgba(203,213,225,1)"; // slate-300
    ctx.fillText(label, LEFT, y);
    ctx.font = "400 44px system-ui, -apple-system, Segoe UI";
    ctx.fillStyle = "#eaf1f9";
    ctx.fillText(String(value ?? "-"), LEFT + LBL_W, y);
    y += 64;
  };

  line("Fakultas", rec?.fakultas || "-");
  line("Prodi",    rec?.prodi    || "-");
  line("WA",       waPretty(rec?.wa));
  line("Makanan",  toFood(rec?.makanan));
  line("Kode",     rec?.code || "-");

  // Dua pill: "Status:" (kuning) + "Sudah/Belum" (hijau/merah)
  y += 6;
  const paid = Number(rec?.paid) === 1;
  const pillL = drawPill(ctx, "Status:", LEFT, y - 44, {
    bg: "#f3c969", fg: "#20232b", lh: 56, padX: 28, radius: 16, bold: true
  });
  drawPill(ctx, paid ? "Sudah" : "Belum", pillL.x + pillL.w + 18, y - 44, {
    bg: paid ? "#34d399" : "#ef4444",
    fg: "#0b1220",
    lh: 56, padX: 28, radius: 16, bold: true
  });

  /* ================== DONE ================== */
  return cv.toDataURL("image/png");

  /* ---------------- helpers ---------------- */

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

  function drawPill(ctx, text, x, y, opt){
    const { bg="#10b981", fg="#0b1220", lh=52, padX=20, radius=999, bold=false } = opt || {};
    ctx.font = `${bold ? "800" : "600"} 34px system-ui, -apple-system, Segoe UI`;
    const w = Math.ceil(ctx.measureText(text).width) + padX*2;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, w, lh, radius);
    ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = fg; ctx.fillText(text, x + padX, y + lh - 16);
    ctx.restore();
    return { x, y, w, h: lh };
  }

  // QR generator: qrcode -> qrious -> fallback
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
        new window.QRious({ element: c, value: text, size, level: "H", background:"#fff", foreground:"#000" });
        return c;
      }
    }catch{}
    const cx = c.getContext("2d");
    cx.fillStyle = "#fff"; cx.fillRect(0,0,size,size);
    cx.fillStyle = "#000"; cx.fillRect(size*0.4,size*0.4,size*0.2,size*0.2);
    return c;
  }

  // Tampilkan 0 depan + strip seperti 0812-3456-7890
  function waPretty(v){
    let s = String(v||"").replace(/[^\d]/g,"");
    if (!s) return "-";
    if (s.startsWith("62")) s = "0"+s.slice(2);
    if (s[0] === "8") s = "0"+s;
    if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0"+s;

    // format strip dinamis 4-4-4 / 4-4-3 / 4-4-5 dst
    const parts = [];
    let i = 0;
    const pattern = [4,4,4,4]; // cukup untuk 16 digit
    for (const n of pattern){
      if (i >= s.length) break;
      parts.push(s.slice(i, i+n));
      i += n;
    }
    return parts.join("-"); // gunakan U+2011 (non-breaking hyphen) agar rapi
  }

  function toFood(m){
    if (!m) return "-";
    if (typeof m === "object") return m.label || m.value || "-";
    return String(m);
  }
}
