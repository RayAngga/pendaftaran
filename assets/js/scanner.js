import { el } from "./utils.js";
import { state } from "./state.js";
import { renderStats, renderAdminTable } from "./admin.js";
import { api } from "./api.js";
export async function startScan(){
  stopScan(); el("scan-msg").textContent="Menginisialisasi kamera...";
  try{
    const constraints = { video: { facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:720} }, audio:false };
    const stream=await navigator.mediaDevices.getUserMedia(constraints);
    const v=el("scan-video"); v.srcObject=stream; await v.play(); el("scan-msg").textContent="Kamera aktif."; loopScan();
  }catch(e){ console.error(e); el("scan-msg").textContent="Gagal akses kamera. Pastikan via HTTPS dan beri izin kamera."; }
}
export function stopScan(){
  const v=el("scan-video"); if(v.srcObject){ v.srcObject.getTracks().forEach(t=>t.stop()); v.srcObject=null; } el("scan-msg").textContent="Scanner berhenti.";
}
function loopScan(){
  const v=el("scan-video"), c=el("scan-canvas"), ctx=c.getContext("2d");
  const tick=()=>{ if(v.readyState===v.HAVE_ENOUGH_DATA){ c.width=v.videoWidth; c.height=v.videoHeight; ctx.drawImage(v,0,0,c.width,c.height);
      const img=ctx.getImageData(0,0,c.width,c.height); const code=jsQR(img.data,img.width,img.height,{inversionAttempts:"dontInvert"});
      if(code?.data){ handleScanPayload(code.data); setTimeout(loopScan,800); return; } }
    requestAnimationFrame(tick); };
  tick();
}
async function handleScanPayload(data){
  try{
    let s=""; try{s=JSON.parse(data).code||"";}catch{ s=data; }
    const { rec } = await api.getTicket(s);
    if(!rec) return el("scan-result").innerHTML=`<span class="text-red-400">QR tidak dikenali.</span>`;
    if(!Number(rec.paid)) return el("scan-result").innerHTML=`<span class="text-yellow-300">Belum bayar.</span>`;
    if(!Number(rec.attended)){
      await api.toggleAttend(rec.id);
      const { rows } = await api.list(); state.regs = rows; renderStats(); renderAdminTable();
    }
    el("scan-result").innerHTML=`<div class="space-y-1">
      <div><b>Kode:</b> ${rec.code}</div><div><b>Nama:</b> ${rec.nama}</div><div><b>WA:</b> ${rec.wa}</div>
      <div><b>Status:</b> <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Hadir</span></div></div>`;
  }catch(e){ el("scan-result").textContent = "Error: " + e.message; }
}