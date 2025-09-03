
import { bindNav } from "./nav.js";
import { bindRegister } from "./register.js";
import { bindPayment } from "./payment.js";
import { findTicket, downloadTicketPNG } from "./ticket.js";

document.getElementById("year").textContent = String(new Date().getFullYear());
document.getElementById("logo-btn")?.addEventListener("click", ()=>{ location.reload(); });

bindNav(); bindRegister(); bindPayment();
document.getElementById("t-find").addEventListener("click", findTicket);
document.getElementById("btn-save-png").addEventListener("click", downloadTicketPNG);
document.getElementById("btn-download-qr").addEventListener("click", ()=>{
  const c = document.getElementById("qr-canvas"); if (!c) return;
  const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "qr.png"; a.click();
});
document.getElementById("btn-print").addEventListener("click", ()=>{ window.print(); });
