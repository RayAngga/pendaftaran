
import { el, $, showOverlay, hideOverlay, showPopup } from "./utils.js";
import { state } from "./state.js";
import { api } from "./api.js";
import { findTicket } from "./ticket.js";

export async function findUnpaidByWA(){
  const wa = $("#pay-wa").value.trim().replace(/\s/g,'');
  const msg = el("pay-msg"); msg.textContent = "";
  try{
    const box = el("pay-data");
    box.classList.remove("hidden");
    box.innerHTML = '<div class="skeleton h-6 mb-2"></div><div class="skeleton h-6 mb-2"></div><div class="skeleton h-6"></div>';
    const { rec } = await api.findByWA(wa);
    if (!rec) { box.classList.add("hidden"); msg.className="text-sm text-red-400"; msg.textContent="Data tidak ditemukan."; return; }
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
      sessionStorage.setItem("lastTicketQuery", rec.code);
      document.getElementById("btn-ticket")?.click();
      setTimeout(async () => {
        const inp = document.getElementById("t-search");
        if (inp) inp.value = rec.code;
        await findTicket();
      }, 120);
    }
  }catch(e){ msg.className="text-sm text-red-400"; msg.textContent="Gagal mencari: " + e.message; }
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
      const res = await api.submitProof(state.current.id || state.current.code || state.current.wa, dataUrl);
      const newCode = res?.code || state.current.code || "";
      state.current.paid = 1; if (newCode) state.current.code = newCode;
      el("pay-data").classList.add("hidden");
      hideOverlay();
      msg.className="text-sm text-emerald-300"; msg.textContent="Bukti diterima. Kode & QR dibuat.";
      showPopup("ok","Bukti diterima","Kode & QR dibuat");
      const lastQ = newCode || state.current.wa || "";
      if (lastQ) sessionStorage.setItem("lastTicketQuery", lastQ);
      document.getElementById("btn-ticket")?.click();
      setTimeout(async () => {
        const inp = document.getElementById("t-search");
        if (inp) inp.value = lastQ;
        await findTicket();
      }, 120);
    }catch(e){
      hideOverlay(); msg.className="text-sm text-red-400"; msg.textContent="Upload gagal: " + e.message;
    }
  };
  reader.readAsDataURL(file);
}

export function bindPayment(){
  el("bank-name").textContent = "BCA";
  el("bank-rek").textContent = "1234567890";
  el("bank-owner").textContent = "Panitia RMP MABA";
  el("bank-amount").textContent = "Rp 25.000";
  el("pay-find").addEventListener("click", findUnpaidByWA);
  el("pay-submit").addEventListener("click", submitProof);
  el("copy-rek").addEventListener("click", ()=>{ const t = el("bank-rek").textContent || ""; navigator.clipboard.writeText(t); });
}
