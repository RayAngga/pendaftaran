import { el } from "./utils.js";
export async function drawQR(text){
  const img = el("qr-img"); const canvas = el("qr-canvas"); const msg = el("ticket-msg");
  try{
    if(window.QRCode?.toDataURL){
      const url = await window.QRCode.toDataURL(String(text),{width:360,margin:1,color:{light:"#FFFFFF",dark:"#000000"}});
      img.src=url; img.style.display="block"; canvas.style.display="none"; return;
    }
  }catch(e){ console.warn("QRCode.toDataURL gagal → QRious",e); }
  try{
    if(window.QRious){
      const qr=new window.QRious({value:String(text),size:180,level:'H',background:'white',foreground:'black'});
      img.src=qr.toDataURL("image/png"); img.style.display="block"; canvas.style.display="none"; return;
    }
  }catch(e){ console.warn("QRious gagal",e); }
  msg.className="text-sm text-red-400"; msg.textContent="Gagal membuat QR.";
}
export async function ensureQRDataUrl(code,size){
  try{
    if(window.QRCode?.toDataURL){
      return await window.QRCode.toDataURL(String(code),{width:size,margin:1,color:{light:"#FFFFFF",dark:"#000000"}});
    }
  }catch{}
  if(window.QRious){
    const qr=new window.QRious({value:String(code),size,level:'H',background:'white',foreground:'black'});
    return qr.toDataURL("image/png");
  }
  throw new Error("QR lib tidak tersedia");
}