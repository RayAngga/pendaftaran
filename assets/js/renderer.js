
export async function buildTicketImage(rec, opt={}){
  const { theme="aurora", width=2200, height=1100, bleed=48, qrSize=420 } = opt;
  const cvs = document.createElement("canvas"); cvs.width = width; cvs.height = height;
  const ctx = cvs.getContext("2d");
  const g = ctx.createLinearGradient(0,0,width,height);
  g.addColorStop(0,"rgba(34,211,238,.12)"); g.addColorStop(1,"rgba(167,139,250,.12)");
  ctx.fillStyle = g; ctx.fillRect(0,0,width,height);
  const cardR = 36; const cardX = bleed, cardY = bleed, cardW = width-bleed*2, cardH = height-bleed*2;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR, "rgba(11,18,32,1)");
  const stripeH = 10; const grad = ctx.createLinearGradient(cardX, cardY+cardH-stripeH, cardX+cardW, cardY+cardH);
  grad.addColorStop(0,"#22d3ee"); grad.addColorStop(1,"#a78bfa"); ctx.fillStyle = grad; ctx.fillRect(cardX, cardY+cardH-stripeH, cardW, stripeH);
  ctx.fillStyle = "#fff"; ctx.font = "bold 56px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", cardX+48, cardY+96);
  ctx.font = "28px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu";
  let y = cardY + 160;
  const L = (label, val) => { ctx.fillStyle = "rgba(203,213,225,1)"; ctx.fillText(label, cardX+48, y); ctx.fillStyle = "#fff"; ctx.fillText(val || "-", cardX+260, y); y += 48; };
  L("Nama", rec.nama||"-"); L("Fakultas", rec.fakultas||"-"); L("Prodi", rec.prodi||"-"); L("No. WA", rec.wa||"-");
  L("Pesanan", (typeof rec.makanan==='object'?(rec.makanan.label||rec.makanan.value):rec.makanan)||"-");
  L("Domisili", rec.domisili||"-"); L("Kode", rec.code||"-"); L("Status", Number(rec.attended)?"Hadir":"Terdaftar"); L("Bayar", Number(rec.paid)?"Sudah":"Belum");
  const qrX = cardX + cardW - qrSize - 72; const qrY = cardY + 160; const qc = document.createElement("canvas");
  await window.QRCode.toCanvas(qc, rec.code||"NA", { width: qrSize, margin:1 }); ctx.drawImage(qc, qrX, qrY);
  return cvs.toDataURL("image/png");
  function roundRect(ctx,x,y,w,h,r,fill){ ctx.save(); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,  x+w,y+h, r); ctx.arcTo(x+w,y+h, x,y+h, r); ctx.arcTo(x,y+h,   x,y, r); ctx.arcTo(x,y,     x+w,y, r); ctx.closePath(); if (fill){ ctx.fillStyle = fill; ctx.fill(); } ctx.restore(); }
}
