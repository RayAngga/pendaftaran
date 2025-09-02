import { el } from "./utils.js";
import { state, saveRegs } from "./state.js";
import { EVENT_CAPACITY } from "./config.js";
import { showMsg } from "./utils.js";
import { api } from "./api.js";
import { findUnpaidByWA } from "./payment.js";

export function refreshQuotaInfo(){
  const left = Math.max(0, EVENT_CAPACITY - (state.regs?.length || 0));
  el("kuota-info").textContent = `Sisa kuota acara: ${left}/${EVENT_CAPACITY}`;
}
export async function onRegister(e){
  e.preventDefault();
  const nama = el("f-nama").value.trim();
  const fakultas = (el("f-fakultas").value || "").trim();
  const prodi = (el("f-prodi").value || "").trim();
  const wa = el("f-wa").value.trim().replace(/\s/g,'');
  const makananText = el("f-makanan").selectedOptions[0]?.textContent || "";
  const domisili = (el("f-domisili").value || "").trim();
  const msg = el("register-msg");
  if(!/^\+?\d{8,15}$/.test(wa) && !/^\d{8,15}$/.test(wa)) return showMsg(msg,"No. WA tidak valid (8–15 digit).","text-red-400");
  if(EVENT_CAPACITY - (state.regs?.length || 0) <= 0) return showMsg(msg,"Kuota acara sudah penuh.","text-red-400");
  try{
    const payload = { nama, fakultas, prodi, wa, makanan: makananText, domisili };
    await api.register(payload);
    const { rows } = await api.list(); state.regs = rows; saveRegs();
    refreshQuotaInfo();
    showMsg(msg,"Pendaftaran berhasil! Lanjut ke tab <b>Pembayaran</b> untuk upload bukti.","text-emerald-300");
    document.getElementById("btn-pay").click();
    document.getElementById("pay-wa").value = wa;
    await findUnpaidByWA();
  }catch(e){ showMsg(msg, 'Gagal daftar: ' + e.message, 'text-red-400'); }
}