
export async function drawQR(text){
  const c = document.getElementById("qr-canvas");
  const img = document.getElementById("qr-img");
  if (!text) { c.style.display="none"; img.style.display="none"; return; }
  try{
    await window.QRCode.toCanvas(c, text, { width:180, margin:1 });
    c.style.display="block"; img.style.display="none";
  }catch{ c.style.display="none"; img.style.display="none"; }
}
