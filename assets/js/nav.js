// assets/js/nav.js
import { el, $all } from "./utils.js";

export function bindNav() {
  const sectionsMap = {
    "btn-register": "section-register",
    "btn-pay":      "section-pay",
    "btn-ticket":   "section-ticket",
    "btn-admin":    "section-admin",
  };
  const reverseMap = Object.fromEntries(
    Object.entries(sectionsMap).map(([btn, sec]) => [sec, btn])
  );

  const getHero = () =>
    document.getElementById("section-hero") || document.getElementById("hero");

  function show(secId) {
    // 1) toggle sections
    Object.values(sectionsMap).forEach(id => el(id)?.classList.add("hidden"));
    el(secId)?.classList.remove("hidden");

    // 2) HERO hanya di Register
    const hero = getHero();
    if (hero) hero.classList.toggle("hidden", secId !== "section-register");

    // 3) highlight tombol aktif
    const activeBtnId = reverseMap[secId];
    $all("header button").forEach(b => {
      b.classList.remove("bg-white/10");
      b.removeAttribute("aria-current");
    });
    const activeBtn = el(activeBtnId);
    activeBtn?.classList.add("bg-white/10");
    activeBtn?.setAttribute("aria-current", "page");

    // 4) fokus input (ID sesuai index.html kamu)
    if (secId === "section-register") document.querySelector("#name")?.focus();
    if (secId === "section-pay")      document.querySelector("#pay-wa")?.focus();
    if (secId === "section-ticket") {
      document.querySelector("#t-search")?.focus();
      window.dispatchEvent(new Event("ticket:show"));
    }

    window.scrollTo(0, 0);
  }

  // klik nav → set hash; render via hashchange
  Object.entries(sectionsMap).forEach(([btnId, secId]) => {
    el(btnId)?.addEventListener("click", (e) => {
      e.preventDefault?.();
      const targetHash = "#" + secId;
      if (location.hash !== targetHash) location.hash = targetHash;
      else show(secId);
    });
  });

  function handleHash() {
    const hash = (location.hash || "#section-register").slice(1);
    const secId = Object.values(sectionsMap).includes(hash) ? hash : "section-register";
    show(secId);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleHash, { once: true });
  } else {
    handleHash();
  }
  window.addEventListener("hashchange", handleHash);
}
