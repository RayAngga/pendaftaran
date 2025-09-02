// assets/js/payment.js
import { el, $ } from "./utils.js";
import { state } from "./state.js";
import { findTicket } from "./ticket.js";
import { api } from "./api.js";

export async function findUnpaidByWA(){
  const wa = $("#pay-wa").value.trim().replace(/\s/g,'');
  const msg = el("pay-msg"); msg.textContent="";
  try{
    const { rec } = await api.findByWA(wa);
    const box = el("pay-data");
    if(!rec){ box.classList.add("hidden"); msg.className="text-sm text-red-400"; msg.textContent="Data tidak ditemukan."; return; }
    state.current = rec; box.classList.remove("hidden");
    box.innerHTML = `
      <div><b>Nama:</b> ${rec.nama}</div>
      <div><b>Fakultas:</b> ${rec.fakultas || "-"}</div>
      <div><b>Prodi:</b> ${rec.prodi || "-"}</div>
      <div><b>No. WA:</b> ${rec.wa}</div>
      <div><b>Pesanan:</b> ${rec.makanan || "-"}</div>
      <div><b>Domisili:</b> ${rec.domisili || "-"}</div>
      <div><b>Status Bayar:</b> ${Number(rec.paid)?'<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Sudah</span>':'<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">Belum</span>'}</div>
      ${Number(rec.paid)&&rec.code?`<div><b>Kode:</b> ${rec.code}</div>`:""}
    `;
    if(Number(rec.paid) && rec.code){
      document.getElementById("btn-ticket").click();
      document.getElementById("t-search").value = rec.code;
      await findTicket();
    }
  }catch(e){
    msg.className="text-sm text-red-400"; msg.textContent="Gagal mencari: " + e.message;
  }
}

export function genCode(){
  const p=Math.random().toString(36).slice(2,6).toUpperCase();
  const t=Date.now().toString().slice(-5);
  return `RMPMABA-${p}${t}`;
}

export function submitProof(){
  const msg = el("pay-msg");
  if(!state.current){ msg.className="text-sm text-red-400"; msg.textContent="Cari pendaftar dulu (berdasarkan WA)."; return; }
  const file = $("#pay-proof").files?.[0];
  if(!file){ msg.className="text-sm text-red-400"; msg.textContent="Pilih file bukti transfer dulu."; return; }
  const reader = new FileReader();
  reader.onload = async ()=>{
    try{
      const dataUrl = reader.result;
      await api.submitProof(state.current.id || state.current.code || state.current.wa, dataUrl);
      msg.className="text-sm text-emerald-300"; msg.textContent="Bukti diterima. Kode & QR dibuat.";
      // Ambil ulang record via endpoint publik
      const { rec } = await api.getTicket(state.current.wa);
      document.getElementById("btn-ticket").click();
      document.getElementById("t-search").value = (rec && rec.code) || "";
      await findTicket();
    }catch(e){
      msg.className="text-sm text-red-400"; msg.textContent="Upload gagal: " + e.message;
    }
  };
  reader.readAsDataURL(file);
}
