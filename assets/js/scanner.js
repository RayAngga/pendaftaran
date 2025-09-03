// assets/js/scanner.js
import { showOverlay, hideOverlay, showPopup, el } from "./utils.js";
import { api } from "./api.js";

let stream = null;
let rafId = null;
let scanning = false;
let off = null;   // offscreen canvas
let octx = null;

function msg(text, ok = false) {
  const m = document.getElementById("scan-msg");
  if (!m) return;
  m.className = "text-sm " + (ok ? "text-emerald-300" : "text-slate-400");
  m.textContent = text;
}
function setResult(html = "") {
  const r = document.getElementById("scan-result");
  if (r) r.innerHTML = html;
}

async function handleDecoded(text) {
  // hentikan sementara loop supaya tidak baca dobel
  await stopScan(true);

  showOverlay("Memeriksa QR…", "Membaca data & mencatat kehadiran");
  try {
    const q = String(text || "").trim();
    // cari tiket dari isi QR (boleh kode / WA)
    const { rec } = await api.getTicket(q);
    if (!rec) {
      hideOverlay();
      showPopup("warn", "QR tidak dikenali", "Data pendaftar tidak ditemukan");
      msg("QR tidak dikenali / data tidak ditemukan");
      return;
    }
    // toggle hadir → jika belum hadir akan menjadi hadir (1)
    const res = await api.toggleAttend(rec.id);
    hideOverlay();

    const hadir = Number(res?.attended) === 1;
    showPopup("ok", hadir ? "Hadir tercatat" : "Status diubah",
      `${rec.nama || "-"} • ${rec.code || ""}`);
    msg(hadir ? "Hadir tercatat." : "Hadir dibatalkan.", true);
    setResult(`
      <div class="mt-1 p-2 rounded bg-white/5 border border-white/10">
        <div><b>Nama:</b> ${rec.nama || "-"}</div>
        <div><b>Kode:</b> ${rec.code || "-"}</div>
        <div><b>WA:</b> ${rec.wa || "-"}</div>
        <div class="mt-1">
          <span class="px-2 py-0.5 rounded ${hadir?'bg-emerald-500/20 text-emerald-300':'bg-rose-500/20 text-rose-300'}">
            ${hadir ? "Hadir" : "Belum hadir"}
          </span>
        </div>
      </div>
    `);
  } catch (e) {
    hideOverlay();
    showPopup("error", "Gagal memproses", e?.message || String(e));
    msg("Terjadi kesalahan saat memproses QR");
  }
}

function getBestConstraints() {
  return {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };
}

function drawLoop(video) {
  if (!scanning) return;
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) { rafId = requestAnimationFrame(() => drawLoop(video)); return; }

  if (!off) {
    off = document.createElement("canvas");
    off.width = vw; off.height = vh;
    octx = off.getContext("2d", { willReadFrequently: true });
  }

  octx.drawImage(video, 0, 0, vw, vh);
  // proses tiap ~150ms biar ringan
  setTimeout(() => {
    try {
      const imageData = octx.getImageData(0, 0, vw, vh);
      const result = window.jsQR
        ? window.jsQR(imageData.data, vw, vh, { inversionAttempts: "dontInvert" })
        : null;
      if (result && result.data) {
        // garis kotak (opsional, tidak wajib karena pakai video langsung)
        handleDecoded(result.data);
        return;
      }
    } catch {}
  }, 0);

  rafId = requestAnimationFrame(() => drawLoop(video));
}

export async function startScan() {
  const video = document.getElementById("scan-video");
  if (!video) return;

  if (scanning) return; // sudah aktif
  setResult("");
  msg("Meminta akses kamera…");

  try {
    stream = await navigator.mediaDevices.getUserMedia(getBestConstraints());
    video.srcObject = stream;
    await video.play();

    scanning = true;
    msg("Memindai QR… Arahkan kamera ke kode.", true);
    drawLoop(video);
  } catch (e) {
    console.error(e);
    msg("Gagal mengakses kamera. Periksa izin browser.");
    showPopup("error", "Kamera tidak bisa dibuka", e?.message || String(e));
  }
}

export async function stopScan(keepVideo = false) {
  scanning = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

  const video = document.getElementById("scan-video");
  if (!keepVideo && video) {
    try { video.pause(); } catch {}
    if (video.srcObject) video.srcObject = null;
  }

  if (stream) {
    try { stream.getTracks().forEach(t => t.stop()); } catch {}
    stream = null;
  }
  off = null; octx = null;

  if (!keepVideo) msg("Pemindaian dihentikan.");
}
