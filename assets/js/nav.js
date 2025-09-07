// assets/js/nav.js
import { el, $all } from "./utils.js";

export function bindNav() {
  const sectionsMap = {
    "btn-register": "section-register",
    "btn-pay":      "section-pay",
    "btn-ticket":   "section-ticket",
    "btn-admin":    "section-admin",
  };

  // Buat reverse map: section -> button
  const reverseMap = Object.fromEntries(
    Object.entries(sectionsMap).map(([btn, sec]) => [sec, btn])
  );

  const hero = document.getElementById("section-hero"); // HERO container

  function show(secId) {
    // Sembunyikan semua section
    Object.values(sectionsMap).forEach(id => el(id)?.classList.add("hidden"));
    // Tampilkan section yang dipilih (jika ada)
    el(secId)?.classList.remove("hidden");

    // Tampilkan HERO hanya di register
    if (hero) hero.classList.toggle("hidden", secId !== "section-register");

    // Highlight tombol aktif (hanya tombol yang ada)
    const activeBtnId = reverseMap[secId];
    Object.keys(sectionsMap).forEach(btnId => {
      const b = el(btnId);
      b?.classList.remove("bg-white/10");
      b?.removeAttribute("aria-current");
    });
    const activeBtn = el(activeBtnId);
    activeBtn?.classList.add("bg-white/10");
    activeBtn?.setAttribute("aria-current", "page");

    // Fokus field yang relevan (kalau ada)
    if (secId === "section-register") document.querySelector("#f-nama")?.focus();
    if (secId === "section-pay")      document.querySelector("#pay-wa")?.focus();
    if (secId === "section-ticket") {
      document.querySelector("#t-search")?.focus();
      window.dispatchEvent(new Event("ticket:show"));
    }

    // Scroll ke atas sederhana (tanpa opsi behavior aneh)
    window.scrollTo(0, 0);
  }

  // Pasang click handler: set hash; render via hashchange
  Object.entries(sectionsMap).forEach(([btnId, secId]) => {
    el(btnId)?.addEventListener("click", (e) => {
      e.preventDefault?.();
      const targetHash = "#" + secId;
      if (location.hash !== targetHash) {
        location.hash = targetHash;
      } else {
        // klik ulang tab aktif → render ulang saja
        show(secId);
      }
    });
  });

  // Render berdasarkan hash (back/forward & deep link aman)
  function handleHash() {
    const hash = (location.hash || "#section-register").slice(1);
    const secId = Object.values(sectionsMap).includes(hash) ? hash : "section-register";
    show(secId);
  }

  window.addEventListener("hashchange", handleHash);
  handleHash(); // initial paint
}
