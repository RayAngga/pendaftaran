import { ensureQRDataUrl } from "./qr.js";
export async function buildTicketImage(rec, opts){
  const { theme="aurora", width=2000, height=1000, bleed=40, qrSize=380 } = opts||{};
  const pal = getTheme(theme);
  const c = document.createElement("canvas"); c.width=width; c.height=height;
  const ctx = c.getContext("2d");
  drawBackground(ctx, width, height, pal);
  const r = 32, x = bleed, y = bleed, w = width-bleed*2, h = height-bleed*2;
  ctx.save(); roundRect(ctx,x,y,w,h,r); ctx.clip();
  const g = ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,pal.cardA); g.addColorStop(1,pal.cardB); ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
  const stripeH = 10; const gs = ctx.createLinearGradient(x,y+h-stripeH,x+w,y+h);
  gs.addColorStop(0,pal.stripe[0]); gs.addColorStop(.33,pal.stripe[1]); gs.addColorStop(.66,pal.stripe[2]); gs.addColorStop(1,pal.stripe[0]);
  ctx.fillStyle=gs; ctx.fillRect(x,y+h-stripeH,w,stripeH);
  const pad=48; const leftW=w*0.62; const rightW=w-leftW;
  ctx.fillStyle=pal.title; ctx.font=`700 ${Math.round(h*0.05)}px ui-sans-serif,system-ui,Segoe UI,Roboto`; ctx.textBaseline="top";
  ctx.fillText("RIUNGMUNGPULUNG MABA — E-Ticket", x+pad, y+pad);
  ctx.fillStyle=pal.textStrong; ctx.font=`700 ${Math.round(h*0.045)}px ui-sans-serif,system-ui`; ctx.fillText(rec.nama||"-", x+pad, y+pad + Math.round(h*0.07));
  const metaY = y+pad + Math.round(h*0.14); const lh = Math.round(h*0.045);
  ctx.font=`600 ${Math.round(h*0.032)}px ui-sans-serif,system-ui`;
  drawMetaLine(ctx,"Fakultas", rec.fakultas || "-",        x+pad, metaY + lh*0, pal.metaKey, pal.metaVal);
  drawMetaLine(ctx,"Prodi",    rec.prodi    || "-",        x+pad, metaY + lh*1, pal.metaKey, pal.metaVal);
  drawMetaLine(ctx,"No. WA",   rec.wa       || "-",        x+pad, metaY + lh*2, pal.metaKey, pal.metaVal);
  drawMetaLine(ctx,"Pesanan",  rec.makanan?.label || rec.makanan || "-",  x+pad, metaY + lh*3, pal.metaKey, pal.metaVal);
  drawMetaLine(ctx,"Domisili", rec.domisili || "-",        x+pad, metaY + lh*4, pal.metaKey, pal.metaVal);
  drawMetaLine(ctx,"Kode",     rec.code     || "-",        x+pad, metaY + lh*5, pal.metaKey, pal.metaVal);
  drawBadge(ctx, rec.attended ? "Hadir" : "Terdaftar", x+pad, metaY + lh*6 + 8, rec.attended ? pal.badgeOkBG : pal.badgeWarnBG, rec.attended ? pal.badgeOkFG : pal.badgeWarnFG, 14, 12);
  drawBadge(ctx, rec.paid ? "Sudah" : "Belum", x+pad + 190, metaY + lh*6 + 8, rec.paid ? pal.badgeOkBG : pal.badgeWarnBG, rec.paid ? pal.badgeOkFG : pal.badgeWarnFG, 14, 12);
  const qrPad=22, qrPanelW=Math.max(qrSize+qrPad*2, rightW*0.7), qrPanelH=qrSize+qrPad*2;
  const qrX = x+leftW + (rightW-qrPanelW)/2, qrY = y+(h-qrPanelH)/2;
  ctx.save(); ctx.shadowColor=pal.qrShadow; ctx.shadowBlur=24; ctx.shadowOffsetY=8;
  ctx.fillStyle="#ffffff"; roundRect(ctx,qrX,qrY,qrPanelW,qrPanelH,18); ctx.fill(); ctx.restore();
  const qrUrl = await ensureQRDataUrl(rec.code, qrSize*2); const qrImg = await loadImage(qrUrl);
  ctx.drawImage(qrImg, qrX+(qrPanelW-qrSize)/2, qrY+(qrPanelH-qrSize)/2, qrSize, qrSize);
  ctx.fillStyle=pal.muted; ctx.font=`500 ${Math.round(h*0.022)}px ui-sans-serif,system-ui`; ctx.textAlign="right";
  ctx.fillText("Tunjukkan tiket ini saat check-in", x+w-pad, y+h-pad-6); ctx.textAlign="left";
  ctx.restore(); return c.toDataURL("image/png");
}
export function getTheme(name){
  if(name==="sunset") return { bgA:"#fff7ed", bgB:"#ffe4e6", cardA:"#ffffffcc", cardB:"#fff1f2cc",
    title:"#111827", textStrong:"#0f172a", metaKey:"#334155", metaVal:"#0f172a",
    badgeOkBG:"#dcfce7", badgeOkFG:"#166534", badgeWarnBG:"#fef3c7", badgeWarnFG:"#92400e",
    stripe:["#fb923c","#f472b6","#fb7185"], muted:"#334155", qrShadow:"rgba(15,23,42,.35)" };
  if(name==="mint") return { bgA:"#ecfeff", bgB:"#e6fffb", cardA:"#ffffffcc", cardB:"#eafffbcc",
    title:"#022c22", textStrong:"#064e3b", metaKey:"#065f46", metaVal:"#022c22",
    badgeOkBG:"#d1fae5", badgeOkFG:"#065f46", badgeWarnBG:"#fee2e2", badgeWarnFG:"#b91c1c",
    stripe:["#22d3ee","#34d399","#38bdf8"], muted:"#065f46", qrShadow:"rgba(6,95,70,.35)" };
  return { bgA:"#0b1220", bgB:"#111827", cardA:"rgba(17,24,39,.85)", cardB:"rgba(15,23,42,.85)",
    title:"#f8fafc", textStrong:"#e5e7eb", metaKey:"#a5b4fc", metaVal:"#e5e7eb",
    badgeOkBG:"rgba(16,185,129,.18)", badgeOkFG:"#86efac", badgeWarnBG:"rgba(234,179,8,.20)", badgeWarnFG:"#fde68a",
    stripe:["#22d3ee","#a78bfa","#f472b6"], muted:"#94a3b8", qrShadow:"rgba(0,0,0,.35)" };
}
function roundRect(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2);
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function drawBackground(ctx,w,h,pal){
  const g=ctx.createLinearGradient(0,0,w,h); g.addColorStop(0,pal.bgA); g.addColorStop(1,pal.bgB);
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  const rg1=ctx.createRadialGradient(w*.8,h*.15,0,w*.8,h*.15,w*.6);
  rg1.addColorStop(0,"rgba(124,58,237,.35)"); rg1.addColorStop(1,"rgba(124,58,237,0)"); ctx.fillStyle=rg1; ctx.fillRect(0,0,w,h);
  const rg2=ctx.createRadialGradient(w*.2,h*.9,0,w*.2,h*.9,w*.6);
  rg2.addColorStop(0,"rgba(34,211,238,.35)"); rg2.addColorStop(1,"rgba(34,211,238,0)"); ctx.fillStyle=rg2; ctx.fillRect(0,0,w,h);
}
function drawMetaLine(ctx,key,val,x,y,keyColor,valColor){ ctx.fillStyle=keyColor; ctx.fillText(`${key}:`,x,y);
  const w=ctx.measureText(`${key}:`).width+8; ctx.fillStyle=valColor; ctx.fillText(val,x+w,y); }
function drawBadge(ctx,text,x,y,bg,fg,r=12,padX=10){
  ctx.save(); ctx.font=ctx.font.replace(/\d+px/,"28px");
  const w=ctx.measureText(text).width + padX*2, h=36;
  ctx.fillStyle=bg; roundRect(ctx,x,y,w,h,r); ctx.fill();
  ctx.fillStyle=fg; ctx.textBaseline="middle"; ctx.fillText(text,x+padX,y+h/2); ctx.restore();
}
function loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }
