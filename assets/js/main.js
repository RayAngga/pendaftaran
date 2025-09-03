import { el } from "./utils.js";
import { bindNav } from "./nav.js";
import { onRegister, refreshQuotaInfo } from "./register.js";
import { findUnpaidByWA, submitProof } from "./payment.js";
import { findTicket, downloadTicketPNG } from "./ticket.js";
import { adminLogin, exportCSV, resetAll, renderStats } from "./admin.js";
import { startScan, stopScan } from "./scanner.js";
import { BANK_INFO, FOOD_OPTIONS, TICKET_THEME } from "./config.js";
import { api } from "./api.js";
import { state, saveRegs } from "./state.js";

document.addEventListener("DOMContentLoaded", async ()=>{
  bindNav(); el("year").textContent = new Date().getFullYear();
  const pa = document.getElementById("print-area"); if (pa) pa.className = `ticket theme-${TICKET_THEME}`;
  const sel = el("f-makanan"); FOOD_OPTIONS.forEach(o=>{ const opt=document.createElement("option"); opt.value=o.value; opt.textContent=o.label; sel.appendChild(opt); });
  el("form-register").addEventListener("submit", onRegister);
  el("btn-reset-form").addEventListener("click", ()=> el("form-register").reset());
  refreshQuotaInfo();
  el("bank-name").textContent = BANK_INFO.bankName; el("bank-rek").textContent = BANK_INFO.rek; el("bank-owner").textContent = BANK_INFO.owner; el("bank-amount").textContent = BANK_INFO.amount;
  el("copy-rek").addEventListener("click", ()=> navigator.clipboard.writeText(BANK_INFO.rek).then(()=>alert("Nomor disalin.")));
  el("pay-find").addEventListener("click", findUnpaidByWA);
  el("pay-submit").addEventListener("click", submitProof);
  el("t-find").addEventListener("click", findTicket);
  el("btn-print").addEventListener("click", ()=>window.print());
  el("btn-download-qr").addEventListener("click", ()=>{
    const img=document.getElementById("qr-img"); const url=(img&&img.style.display!=="none"&&img.src)?img.src:document.getElementById("qr-canvas").toDataURL("image/png");
    const code=(document.getElementById("t-code").textContent||"QR").trim();
    const a=document.createElement("a"); a.href=url; a.download=`${code}_QR.png`; ("download" in a)?a.click():window.open(url,"_blank");
  });
  el("btn-save-png").addEventListener("click", downloadTicketPNG);
  el("admin-enter").addEventListener("click", adminLogin);
  el("admin-export").addEventListener("click", exportCSV);
  el("admin-reset").addEventListener("click", resetAll);
  el("admin-search").addEventListener("input", ()=>import("./admin.js").then(m=>m.renderAdminTable()));
  renderStats();
  el("scan-start").addEventListener("click", startScan); el("scan-stop").addEventListener("click", stopScan);
  // initial admin sync removed; will sync after admin login
});