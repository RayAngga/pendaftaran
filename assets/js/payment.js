import { el, $, showOverlay, hideOverlay, showPopup } from "./utils.js";
import { state } from "./state.js";
import { api } from "./api.js";
import { findTicket } from "./ticket.js";

/** Buat kunci pencarian setara backend: digit-only, buang prefix 62/0.
 *  Contoh: "0813...", "62813...", "+62 813...", "813..." => "813..."
 */
function waSearchKey(v) {
  let s = String(v || "").replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("62")) s = s.slice(2);
  if (s.startsWith("0"))  s = s.slice(1);
  return s;
}

export async function findUnpaidByWA(){
  const raw = $("#pay-wa").value.trim().replace(/\s/g,'');
  const key = waSearchKey(raw); // kirim kunci kebal format
  const msg = el("pay-msg"); msg.textContent = "";
  try{
    const box = el("pay-data");
    box.classList.remove("hidden");
    box.innerHTML = '<div class="skeleton h-6 mb-2"></div><div class="skeleton h-6 mb-2"></div><div class="skeleton h-6"></div>';

    const { rec } = await api.findByWA(key);
    if (!rec) {
      box.classList.add("hidden");
      msg.className="text-sm text-red-400";
      msg.textContent="Data tidak ditemukan.";
      return;
    }

    state.current = rec;
    box.classList.remove("hidden");
    box.innerHTML = `
      <div><b>Nama:</b> ${rec.nama}</div>
      <div><b>Fakultas:</b> ${rec.fakultas || "-"}</div>
      <div><b>Prodi:</b> ${rec.prodi || "-"}</div>
      <div><b>No. WA:</b> ${rec.wa}</div>
      <div><b>Pesanan:</b> ${rec.makanan || "-"}</div>
      <div><b>Domisili:</b> ${rec.domisili || "-"}</div>
      <div><b>Status Bayar:</b> ${Number(rec.paid)
        ? '<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Sudah</span>'
        : '<span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">Belum</span>'}
      </div>
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
  }catch(e){
    msg.className="text-sm text-red-400";
    msg.textContent="Gagal mencari: " + e.message;
  }
}

export function submitProof(){
  const msg = el("pay-msg");
  if(!state.current){
    msg.className="text-sm text-red-400";
    msg.textContent="Cari pendaftar dulu (berdasarkan WA).";
    return;
  }
  const file = $("#pay-proof").files?.[0];
  if(!file){
    msg.className="text-sm text-red-400";
    msg.textContent="Pilih file bukti transfer dulu.";
    return;
  }
  const reader = new FileReader();
  reader.onload = async ()=>{
    try{
      const dataUrl = reader.result;
      showOverlay("Mengunggah bukti…","Memproses & membuat QR",8000);

      // Backend submitProof sudah fleksibel (id / code / wa / key)
      const res = await api.submitProof(state.current.id || state.current.code || state.current.wa, dataUrl);
      const newCode = res?.code || state.current.code || "";

      state.current.paid = 1;
      if (newCode) state.current.code = newCode;

      el("pay-data").classList.add("hidden");
      hideOverlay();
      msg.className="text-sm text-emerald-300";
      msg.textContent="Bukti diterima. Kode & QR dibuat.";
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
      hideOverlay();
      msg.className="text-sm text-red-400";
      msg.textContent="Upload gagal: " + e.message;
    }
  };
  reader.readAsDataURL(file);
}

export function bindPayment(){
  el("bank-name").textContent = "DANA";
  el("bank-rek").textContent = "083851116698";
  el("bank-owner").textContent = "Ranzani Rizky Fadilah";
  el("bank-amount").textContent = "Rp 80.000";

  el("pay-find").addEventListener("click", findUnpaidByWA);
  el("pay-submit").addEventListener("click", submitProof);
  el("copy-rek").addEventListener("click", ()=>{
    const t = el("bank-rek").textContent || "";
    navigator.clipboard.writeText(t);
  });
}
