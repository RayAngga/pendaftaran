// assets/js/nav.js
export function bindNav() {
  const map = {
    "btn-register": "section-register",
    "btn-pay":      "section-pay",
    "btn-ticket":   "section-ticket",
    "btn-admin":    "section-admin",
  };

  const hero = document.getElementById("section-hero");
  const sections = Object.values(map)
    .map(id => document.getElementById(id))
    .filter(Boolean);

  function show(id) {
    // sembunyikan semua section utama
    sections.forEach(s => s.classList.add("hidden"));
    document.getElementById(id)?.classList.remove("hidden");

    // HERO hanya tampil di menu Daftar
    if (hero) {
      if (id === "section-register") hero.classList.remove("hidden");
      else hero.classList.add("hidden");
    }

    // highlight tombol aktif (opsional)
    Object.entries(map).forEach(([btnId, secId]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const active = (secId === id);
      btn.classList.toggle("bg-[var(--brand)]", active);
      btn.classList.toggle("text-white", active);
      btn.classList.toggle("bg-white/10", !active);
    });
  }

  // pasang handler
  Object.entries(map).forEach(([btnId, secId]) => {
    document.getElementById(btnId)?.addEventListener("click", () => show(secId));
  });

  // tampilan awal: Daftar
  show(map["btn-register"]);
}
