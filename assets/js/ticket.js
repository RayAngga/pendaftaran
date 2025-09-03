async function renderTicketCard(rec) {
  const wrap = el("ticket-wrap");
  if (!wrap) return null;

  // siapkan canvas
  let cv = el("ticket-canvas");
  if (!cv) {
    cv = document.createElement("canvas");
    cv.id = "ticket-canvas";
    wrap.innerHTML = "";
    wrap.appendChild(cv);
  }

  const W = 1200, H = 680;
  cv.width = W; cv.height = H;
  cv.style.width = "100%";
  cv.style.maxWidth = "900px";
  cv.style.height = (H / W * 100) + "%";

  const ctx = cv.getContext("2d");

  // latar halaman
  ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, W, H);

  // kartu + gradient kaya warna
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

  // === TEKS: judul & nama dulu ===
  const leftX = cardX + 48;
  let y = cardY + 88;

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 44px 'Inter', system-ui";
  const title = "RIUNGMUNGPULUNG MABA — E-Ticket";
  ctx.fillText(title, leftX, y);

  // batas bawah judul (untuk memastikan QR tidak menimpa)
  const titleBottom = y + 20;

  y += 56;
  ctx.font = "700 34px 'Inter', system-ui";
  ctx.fillText(String(rec.nama || "-"), leftX, y);

  // === PANEL QR digambar SETELAH judul, dan diletakkan di bawah judul ===
  const qrBoxSize = 340;   // panel putih
  const qrInner   = 260;   // QR-nya
  const qrBoxX = cardX + cardW - qrBoxSize - 40;
  let qrBoxY = cardY + 72;
  // kalau posisi default menabrak judul, turunkan di bawah judul + margin
  if (qrBoxY < titleBottom + 24) qrBoxY = titleBottom + 24;

  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18);
  ctx.fillStyle = "#ffffff"; ctx.fill();

  const qr = await makeQRCanvas(rec.code || rec.id || "NO-CODE", qrInner, "#ffffff", "#000000");
  const qx = qrBoxX + (qrBoxSize - qrInner) / 2;
  const qy = qrBoxY + (qrBoxSize - qrInner) / 2;
  ctx.drawImage(qr, qx, qy, qrInner, qrInner);

  // === field di sisi kiri ===
  y += 40; drawLine(ctx, "Fakultas:", rec.fakultas, leftX, y);
  y += 40; drawLine(ctx, "Prodi:",    rec.prodi,    leftX, y);
  y += 40; drawLine(ctx, "WA:",       waDisplay(rec.wa), leftX, y);
  y += 40; drawLine(ctx, "Makanan:",  rec.makanan,  leftX, y);
  y += 40; drawLine(ctx, "Domisili:", rec.domisili, leftX, y);
  y += 40; drawLine(ctx, "Kode:",     rec.code || "-", leftX, y);

  y += 40;
  drawBadgeRow(ctx, "Status:", "Terdaftar", leftX, y, { bg:"#f59e0b", fg:"#111827" }); // amber
  y += 48;
  const paid = Number(rec?.paid) === 1;
  drawBadgeRow(ctx, "Bayar:", paid ? "Sudah" : "Belum", leftX, y,
    paid ? { bg:"#10b981", fg:"#0b1220" } : { bg:"#ef4444", fg:"#0b1220" });

  // untuk nama file unduh
  el("__lastTicketCode")?.remove();
  const hidden = document.createElement("input");
  hidden.type = "hidden"; hidden.id = "__lastTicketCode";
  hidden.value = String(rec.code || rec.id || "ticket");
  wrap.appendChild(hidden);

  wrap.classList.remove("hidden");
  return cv;
}
