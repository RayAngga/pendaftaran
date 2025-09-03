import { el, $ } from "./utils.js";
import { state, saveRegs } from "./state.js";
import { renderStats } from "./admin.js";
import { findTicket } from "./ticket.js";
import { api } from "./api.js";

export async function findUnpaidByWA(){
  const wa = $("#pay-wa").value.trim().replace(/\s/g,'');
  const msg = el("pay-msg"); msg.textContent="";
  try{
    const box = el("pay-data"); box.classList.remove("hidden"); box.innerHTML = '<div class="skeleton h-6 mb-2"></div><div class="skeleton h-6 mb-2"></div><div class="skeleton h-6"></div>';
    const { rec } = await api.findByWA(wa);

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
export function submitProof(){
  const msg = el("pay-msg");
  if(!state.current){ msg.className="text-sm text-red-400"; msg.textContent="Cari pendaftar dulu (berdasarkan WA)."; return; }
  const file = $("#pay-proof").files?.[0];
  if(!file){ msg.className="text-sm text-red-400"; msg.textContent="Pilih file bukti transfer dulu."; return; }
  const reader = new FileReader();
  reader.onload = async ()=>{
    try{
      const dataUrl = reader.result;
      showOverlay("Mengunggah bukti…","Memproses & membuat QR",8000);
      await api.submitProof(state.current.id || state.current.code || state.current.wa, dataUrl);
      const { rows } = await api.list(); state.regs = rows; saveRegs();
      el("pay-data").classList.add("hidden");
      hideOverlay();
      msg.className="text-sm text-emerald-300"; msg.textContent="Bukti diterima. Kode & QR dibuat.";
      showPopup("ok","Bukti diterima","Kode & QR dibuat");
      document.getElementById("btn-ticket").click();
      const updated = rows.find(r => r.wa === state.current.wa);
      document.getElementById("t-search").value = updated?.code || "";
      await findTicket();
    }catch(e){
      msg.className="text-sm text-red-400"; msg.textContent="Upload gagal: " + e.message;
    }
  };
  reader.readAsDataURL(file);
}