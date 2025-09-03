// assets/js/renderer.js
export async function buildTicketImage(rec, opt = {}) {
  const {
    width = 2200,
    height = 1100,
    bleed = 48,
    qrSize = 520,              // ukuran QR
    title = "RIUNGMUNGPULUNG MABA — E-Ticket",
  } = opt;

  // helper
  const waDisp = (v) => {
    let s = String(v || "").replace(/[^\d]/g, "");
    if (!s) return "";
    if (s.startsWith("62")) s = "0" + s.slice(2);
    if (s[0] === "8") s = "0" + s;
    if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
    return s;
  };
  const insets = { x: bleed, y: bleed, w: width - bleed * 2, h: height - bleed * 2 };

  const cvs = document.createElement("canvas");
  cvs.width = width; cvs.height = height;
  const ctx = cvs.getContext("2d");

  // bg halus
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "rgba(34,211,238,.12)");
  bg.addColorStop(1, "rgba(167,139,250,.12)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // kartu
  const cardR = 36;
  roundRectFill(ctx, insets.x, insets.y, insets.w, insets.h, cardR, "rgba(11,18,32,1)");

  // strip bawah
  const stripeH = 10;
  const grad = ctx.createLinearGradient(insets.x, insets.y + insets.h - stripeH, insets.x + insets.w, insets.y + insets.h);
  grad.addColorStop(0, "#22d3ee");
  grad.addColorStop(1, "#a78bfa");
  ctx.fillStyle = grad;
  ctx.fillRect(insets.x, insets.y + insets.h - stripeH, insets.w, stripeH);

  // judul + nama
  ctx.fillStyle = "#fff";
  ctx.font = "800 72px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  ctx.fillText(title, insets.x + 48, insets.y + 120);

  ctx.font = "700 56px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  ctx.fillText(String(rec.nama || "-"), insets.x + 48, insets.y + 200);

  // panel QR putih (diperkecil dibanding kartu)
  const qrPad = 28;
  const panel = {
    w: qrSize + qrPad * 2,
    h: qrSize + qrPad * 2,
    x: insets.x + insets.w - (qrSize + qrPad * 2) - 72,
    y: insets.y + 160,
    r: 22,
  };
  roundRectFill(ctx, panel.x, panel.y, panel.w, panel.h, panel.r, "#ffffff");

  // gambar QR (qrcode → qrious → fallback)
  const qr = await makeQR(rec.code || "NA", qrSize);
  ctx.drawImage(qr, panel.x + qrPad, panel.y + qrPad, qrSize, qrSize);

  // kolom kiri (label : nilai)
  ctx.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  let y = insets.y + 270;
  const L = (label, val) => {
    ctx.fillStyle = "rgba(203,213,225,1)";
    ctx.fillText(label + ":", insets.x + 48, y);
    ctx.fillStyle = "#fff";
    ctx.font = "400 38px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
    ctx.fillText(String(val || "-"), insets.x + 260, y);
    ctx.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
    y += 56;
  };

  L("Fakultas", rec.fakultas);
  L("Prodi", rec.prodi);
  L("WA", waDisp(rec.wa));
  L("Makanan", typeof rec.makanan === "object" ? (rec.makanan.label || rec.makanan.value) : rec.makanan);
  L("Domisili", rec.domisili);
  L("Kode", rec.code);
  L("Status", Number(rec.attended) ? "Hadir" : "Terdaftar");
  L("Bayar", Number(rec.paid) ? "Sudah" : "Belum");

  return cvs.toDataURL("image/png");

  // util
  function roundRectFill(ctx, x, y, w, h, r, fill) {
    ctx.save();
    ctx.beginPath();
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  async function makeQR(text, size) {
    // 1) qrcode
    try {
      if (window.QRCode?.toCanvas) {
        const c = document.createElement("canvas");
        await window.QRCode.toCanvas(c, text, { width: size, margin: 1, errorCorrectionLevel: "H" });
        return c;
      }
    } catch {}
    // 2) qrious
    try {
      if (window.QRious) {
        const c = document.createElement("canvas");
        new window.QRious({ element: c, value: text, size, level: "H", background: "transparent" });
        return c;
      }
    } catch {}
    // 3) fallback
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, size, size);
    g.fillStyle = "#000"; g.fillRect(size * 0.38, size * 0.38, size * 0.24, size * 0.24);
    return c;
  }
}
