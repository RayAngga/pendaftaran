export async function drawQR(text){
  const c = document.getElementById("qr-canvas");
  const img = document.getElementById("qr-img");

  if (!text) { 
    if (c) c.style.display="none";
    if (img) img.style.display="none";
    return;
  }

  // 1) Coba QRCode.toCanvas (lib qrcode)
  try{
    if (window.QRCode?.toCanvas && c) {
      await window.QRCode.toCanvas(c, text, { width:180, margin:1 });
      c.style.display = "block";
      if (img) img.style.display = "none";
      return;
    }
  }catch{}

  // 2) Fallback ke QRious (bisa render ke canvas langsung)
  try{
    if (window.QRious && c) {
      // QRious butuh element <canvas> atau <img>
      new window.QRious({
        element: c,
        value: text,
        size: 180,
        background: 'transparent',
        level: 'H'
      });
      c.style.display = "block";
      if (img) img.style.display = "none";
      return;
    }
  }catch{}

  // 3) Fallback terakhir: dataURL via QRCode lalu pakai <img>
  try{
    if (window.QRCode?.toDataURL && img) {
      const dataUrl = await window.QRCode.toDataURL(text, { width:180, margin:1 });
      img.src = dataUrl;
      img.style.display = "block";
      if (c) c.style.display = "none";
      return;
    }
  }catch{}

  // 4) Jika semua gagal, sembunyikan keduanya
  if (c) c.style.display="none";
  if (img) img.style.display="none";
}
