// assets/js/nav.js
import { el, $all } from "./utils.js";

export function bindNav() {
  const sectionsMap = {
    "btn-register": "section-register",
    "btn-pay":      "section-pay",
    "btn-ticket":   "section-ticket",
    "btn-admin":    "section-admin",
  };

  // reverse map: section -> button
  const reverseMap = Object.fromEntries(
    Object.entries(sectionsMap).map(([btn, sec]) => [sec, btn])
  );

  const hero = document.getElementById("section-hero"); // HERO container

  // style kelas untuk nav
  const ACTIVE   = ["bg-white/20","text-white","ring-1","ring-cyan-300/30","shadow"];
  const INACTIVE = ["bg-white/5","text-slate-200","ring-1","ring-white/10","shadow-none"];

  function restyleAllToInactive() {
    // hanya tombol nav (id mulai "btn-"), jangan logo
    $all("header button").forEach(b => {
      if (!b.id?.startsWith("btn-")) return;
      b.classList.remove(...ACTIVE, ...INACTIVE, "bg-white/10"); // buang gaya lama
      b.classList.add(...INACTIVE);
      b.setAttribute("data-nav", "");          // penanda opsional
      b.removeAttribute("aria-current");
    });
  }

  function show(secId) {
    // Sembunyikan semua section
    Object.values(sectionsMap).forEach(id => el(id)?.classList.add("hidden"));
    // Tampilkan section yang dipilih (jika ada)
    el(secId)?.classList.remove("hidden");

    // HERO hanya di register
    if (hero) hero.classList.toggle("hidden", secId !== "section-register");

    // Highlight tombol aktif
    restyleAllToInactive();
    const activeBtnId = reverseMap[secId];
    const activeBtn = el(activeBtnId);
    if (activeBtn) {
      activeBtn.classList.remove(...INACTIVE);
      activeBtn.classList.add(...ACTIVE);
      activeBtn.setAttribute("aria-current", "page");
    }

    // Fokus field yang relevan
    if (secId === "section-register") document.querySelector("#f-nama")?.focus();
    if (secId === "section-pay")      document.querySelector("#pay-wa")?.focus();
    if (secId === "section-ticket") {
      document.querySelector("#t-search")?.focus();
      window.dispatchEvent(new Event("ticket:show"));
    }

    // Scroll ke atas
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
        show(secId);
      }
    });
  });

  // Inisialisasi: pastikan tombol nav sudah bergaya chip
  restyleAllToInactive();

  // Render berdasarkan hash
  function handleHash() {
    const hash = (location.hash || "#section-register").slice(1);
    const secId = Object.values(sectionsMap).includes(hash) ? hash : "section-register";
    show(secId);
  }

  window.addEventListener("hashchange", handleHash);
  handleHash(); // initial paint
}
