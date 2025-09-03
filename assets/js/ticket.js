
import { el } from "./utils.js";
import { state } from "./state.js";
import { drawQR } from "./qr.js";
import { buildTicketImage } from "./renderer.js";
import { safeDownload } from "./utils.js";
import { TICKET_THEME } from "./config.js";
import { api } from "./api.js";

function triggerSearchWith(q){ const inp = el("t-search"); if (inp) inp.value = q || inp.value || ""; findTicket(); }
function autoFromStorageOrURL(){
  let q = sessionStorage.getItem("lastTicketQuery") || "";
  if (!q) { try { const u = new URL(location.href); q = u.searchParams.get("q") || ""; if (!q && location.hash.startsWith("#ticket=")) { q = decodeURIComponent(location.hash.split("=",2)[1]||""); } } catch {} }
  if (q) { triggerSearchWith(q); sessionStorage.removeItem("lastTicketQuery"); }
}
window.addEventListener("ticket:show", autoFromStorageOrURL);
document.addEventListener("DOMContentLoaded", () => { const sec = document.getElementById("section-ticket"); if (sec && !sec.classList.contains("hidden")) autoFromStorageOrURL(); });

export async function findTicket(){
  const q=el("t-search").value.trim(); if(!q) return setTicketMsg("Masukkan kode pendaftaran atau nomor WA.","text-slate-300");
  setTicketMsg("Mencari tiket…","text-slate-300");
  try{
    const { rec } = await api.getTicket(q);
    if(!rec) return setTicketMsg("Tiket tidak ditemukan.","text-red-400");
    if(!Number(rec.paid) || !rec.code) return setTicketMsg("Belum upload bukti transfer.","text-yellow-300");
    sessionStorage.setItem("lastTicketQuery", rec.code || q);
    renderTicket(rec); setTicketMsg("","");
  }catch(e){ setTicketMsg("Gagal mencari tiket: " + e.message, "text-red-400"); }
}
export function renderTicket(rec){
  const card=el("ticket-card"); const msg=el("ticket-msg"); card.classList.remove("hidden"); msg.textContent="";
  el("t-name").textContent=rec.nama||"-"; el("t-code").textContent=rec.code||"(belum ada)"; el("t-wa").textContent=rec.wa||"-";
  const makananText = typeof rec.makanan === "object" && rec.makanan !== null ? (rec.makanan.label || rec.makanan.value || "-") : (rec.makanan || "-");
  el("t-makanan").textContent = makananText;
  el("t-fakultas").textContent=rec.fakultas||"-"; el("t-prodi").textContent=rec.prodi||"-"; el("t-domisili").textContent=rec.domisili||"-";
  const st=el("t-status"); st.textContent=Number(rec.attended)?"Hadir":"Terdaftar"; st.className=`badge ${Number(rec.attended)?'ok':'warn'}`;
  const pd=el("t-paid"); pd.textContent=Number(rec.paid)?"Sudah":"Belum"; pd.className=`badge ${Number(rec.paid)?'ok':'warn'}`;
  drawQR(rec.code).catch(()=>{});
}
export function setTicketMsg(t,c){ const m=el("ticket-msg"); m.className=`text-sm ${c}`; m.textContent=t; }
export async function downloadTicketPNG(){
  const paidText=(el('t-paid').textContent||'').toLowerCase();
  if(!/sudah/.test(paidText)){ alert('Unduh hanya untuk peserta yang sudah bayar.'); return; }
  const codeText = (el("t-code").textContent || "").trim(); if(!codeText){ alert("Tiket belum siap."); return; }
  const rec = state.regs?.find?.(r=> r.code===codeText) || {
    code: codeText, nama: el("t-name").textContent||"", fakultas: el("t-fakultas").textContent||"", prodi: el("t-prodi").textContent||"",
    wa: el("t-wa").textContent||"", makanan:{ label: el("t-makanan").textContent || "-" }, domisili: el("t-domisili").textContent||"",
    paid:/sudah/i.test(el("t-paid").textContent||""), attended:/hadir/i.test(el("t-status").textContent||"")
  };
  const dataUrl = await buildTicketImage(rec, { theme:TICKET_THEME, width:2200, height:1100, bleed:48, qrSize:420 });
  safeDownload(dataUrl, `${rec.code}_ticket.png`);
}
