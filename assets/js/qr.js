export async function drawQR(text, opts = {}) {
  const {
    size   = 180,               // ukuran CSS (px)
    margin = 1,                 // quiet zone
    level  = 'H',               // L/M/Q/H
    dark   = '#000000',         // warna modul
    light  = '#ffffff',         // background default PUTIH
    canvasId = 'qr-canvas',
    imgId    = 'qr-img',
  } = opts;

  const c   = document.getElementById(canvasId);
  const img = document.getElementById(imgId);
  const hideAll = () => { if (c) c.style.display='none'; if (img) img.style.display='none'; };

  if (!text) { hideAll(); return null; }

  // Siapkan canvas untuk HiDPI (retina) + prefill background
  const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  if (c) {
    c.width  = size * ratio;
    c.height = size * ratio;
    c.style.width  = size + 'px';
    c.style.height = size + 'px';
    const ctx = c.getContext?.('2d');
    if (ctx) {
      ctx.clearRect(0, 0, c.width, c.height);
      if (light !== 'transparent') {
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, c.width, c.height);  // prefill putih
      }
    }
  }

  // 1) Prioritas: qrcode (QRCode.toCanvas)
  try {
    if (window.QRCode?.toCanvas && c) {
      await window.QRCode.toCanvas(c, text, {
        width: size * ratio,
        margin,
        errorCorrectionLevel: level,
        color: { dark, light },
      });
      c.style.display = 'block';
      if (img) img.style.display = 'none';
      return c;
    }
  } catch (_) {}

  // 2) Fallback: QRious (render langsung ke canvas)
  try {
    if (window.QRious && c) {
      new window.QRious({
        element: c,
        value: text,
        size: size * ratio,
        background: light === 'transparent' ? 'transparent' : light,
        foreground: dark,
        level,
      });
      c.style.width = size + 'px';
      c.style.height = size + 'px';
      c.style.display = 'block';
      if (img) img.style.display = 'none';
      return c;
    }
  } catch (_) {}

  // 3) Fallback terakhir: dataURL via qrcode (IMG)
  try {
    if (window.QRCode?.toDataURL && img) {
      const dataUrl = await window.QRCode.toDataURL(text, {
        width: size,
        margin,
        errorCorrectionLevel: level,
        color: { dark, light },
      });
      img.src = dataUrl;
      img.width  = size;
      img.height = size;
      img.style.display = 'block';
      if (c) c.style.display = 'none';
      return img;
    }
  } catch (_) {}

  // 4) Semua gagal
  hideAll();
  return null;
}
