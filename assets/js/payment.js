// assets/js/payment.js
import { el, $ } from "./utils.js";
import { state } from "./state.js";
import { findTicket } from "./ticket.js";
import { api } from "./api.js";

/** Cari pendaftar dari input (WA atau Kode). Mengisi state.current dan merender box info. */
async function ensureCurrentFromInput(renderBox = true) {
  const qRaw = $("#pay-wa").value.trim();
  if (!qRaw) throw new Error("Isi nomor WA atau kode pendaftaran dulu.");
  const q = qRaw.replace(/\s/g, "");
  let rec = null;

  if (/^RMPMABA-/i.test(q)) {
    // Input adalah KODE
    ({ rec } = await api.getTicket(q));
  } else {
    // Input dianggap WA → coba findByWA, kalau null coba getTicket juga
    ({ rec } = await api.findByWA(q));
    if (!rec) ({ rec } = await api.getTicket(q));
  }

  if (!rec) throw new Error("Data pendaftar tidak ditemukan. Pastikan sudah daftar.");

  state.current = rec;

  if (renderBox) {
    const box = el("pay-data");
    box.classList.remove("hidden");
    box.innerHTML = `
      <div><b>Nama:</b> ${rec.nama}</div>
      <div><b>Fakultas:</b> ${rec.fakultas || "-"}</div>
      <div><b>Prodi:</b> ${rec.prodi || "-"}</div>
      <div><b>No. WA:</b> ${rec.wa}</div>
      <div><b>Pesanan:</b> ${rec.makanan || "-"}</div>
      <div><b>Domisili:</b> ${rec.domisili || "-"}</div>
      <div><b>Status Bayar:</b> ${
        Number(rec.paid)
          ? '<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Sudah</span>'
          : '<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">Belum</span>'
      }</div>
      ${Number(rec.paid) && rec.code ? `<div><b>Kode:</b> ${rec.code}</div>` : ""}
    `;
  }
  return rec;
}

export async function findUnpaidByWA() {
  const msg = el("pay-msg");
  msg.textContent = "";
  try {
    await ensureCurrentFromInput(true);
    msg.className = "text-sm text-slate-300";
  } catch (e) {
    el("pay-data").classList.add("hidden");
    msg.className = "text-sm text-red-400";
    msg.textContent = e.message;
  }
}

export function genCode() {
  const p = Math.random().toString(36).slice(2, 6).toUpperCase();
  const t = Date.now().toString().slice(-5);
  return `RMPMABA-${p}${t}`;
}

export async function submitProof() {
  const msg = el("pay-msg");
  msg.textContent = "";

  // Pastikan state.current terisi (otomatis cari dari input kalau belum)
  try {
    await ensureCurrentFromInput(true);
  } catch (e) {
    msg.className = "text-sm text-red-400";
    msg.textContent = e.message;
    return;
  }

  const file = $("#pay-proof").files?.[0];
  if (!file) {
    msg.className = "text-sm text-red-400";
    msg.textContent = "Pilih file bukti transfer dulu.";
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const dataUrl = reader.result;
      const id = state.current.id || state.current.code || state.current.wa;
      await api.submitProof(id, dataUrl);

      msg.className = "text-sm text-emerald-300";
      msg.textContent = "Bukti diterima. Kode & QR dibuat.";

      // Ambil record terbaru (tanpa butuh akses admin)
      const { rec } = await api.getTicket(state.current.wa || state.current.code);
      document.getElementById("btn-ticket").click();
      document.getElementById("t-search").value = (rec && rec.code) || "";
      await findTicket();
    } catch (e) {
      msg.className = "text-sm text-red-400";
      msg.textContent = "Upload gagal: " + e.message;
    }
  };
  reader.readAsDataURL(file);
}
