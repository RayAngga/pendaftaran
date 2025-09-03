// assets/js/nav.js
import { el, $all } from "./utils.js";

export function bindNav(){
  const sectionsMap = {
    "btn-register": "section-register",
    "btn-pay":      "section-pay",
    "btn-ticket":   "section-ticket",
    "btn-admin":    "section-admin",
  };

  const hero = document.getElementById("section-hero"); // ← HERO

  const show = (btnId, secId) => {
    // sembunyikan semua section utama, tampilkan yang dipilih
    Object.values(sectionsMap).forEach(id => el(id).classList.add("hidden"));
    el(secId).classList.remove("hidden");

    // HERO hanya muncul di menu Daftar
    if (hero) {
      if (secId === "section-register") hero.classList.remove("hidden");
      else hero.classList.add("hidden");
    }

    // highlight tombol aktif
    $all("header button").forEach(b => b.classList.remove("bg-white/10"));
    el(btnId).classList.add("bg-white/10");

    // fokuskan input sesuai section
    if (secId === "section-register") document.querySelector("#f-nama")?.focus();
    if (secId === "section-pay")      document.querySelector("#pay-wa")?.focus();
    if (secId === "section-ticket") {
      document.querySelector("#t-search")?.focus();
      window.dispatchEvent(new Event("ticket:show"));
    }
  };

  // pasang listener pada tombol nav
  Object.entries(sectionsMap).forEach(([btnId, secId]) => {
    el(btnId).addEventListener("click", (e) => {
      e.preventDefault?.();
      show(btnId, secId);
      location.hash = "#" + secId;
    });
  });

  // tentukan tampilan awal
  const hash = location.hash.replace("#", "");
  const initialSec = Object.values(sectionsMap).includes(hash) ? hash : "section-register";
  const initialBtn = Object.keys(sectionsMap).find(k => sectionsMap[k] === initialSec) || "btn-register";
  show(initialBtn, initialSec);
}
