import { bindNav } from "./nav.js";
import { bindRegister } from "./register.js";
import { bindPayment } from "./payment.js";
import { bindAdmin } from "./admin.js";             // ← penting
import { findTicket, downloadTicketPNG } from "./ticket.js";

// helper kecil biar aman pas addEventListener
const on = (id, evt, fn) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evt, fn);
  return el;
};

// footer year & hard refresh lewat logo
const y = document.getElementById("year");
if (y) y.textContent = String(new Date().getFullYear());
on("logo-btn", "click", () => location.reload());

// aktifkan seluruh binding
bindNav();
bindRegister();
bindPayment();
bindAdmin();                                        // ← aktifkan login admin

// tiket: cari, unduh png, unduh QR, print
on("t-find", "click", findTicket);
on("btn-save-png", "click", downloadTicketPNG);
on("btn-download-qr", "click", () => {
  const c = document.getElementById("qr-canvas");
  if (!c) return;
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = "qr.png";
  a.click();
});
on("btn-print", "click", () => window.print());

// tekan ENTER pada input tiket langsung cari
const tSearch = document.getElementById("t-search");
if (tSearch) {
  tSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); findTicket(); }
  });
}
