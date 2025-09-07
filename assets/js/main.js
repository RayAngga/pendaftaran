// assets/js/main.js
import { bindNav }      from "./nav.js";
import { bindRegister } from "./register.js";
import { bindPayment }  from "./payment.js";
import { bindAdmin }    from "./admin.js";
import { startScan, stopScan } from "./scanner.js";
import { bindTicket }   from "./ticket.js";  // tiket → canvas & unduh PNG

// helper aman
const on = (id, evt, fn) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evt, fn);
  return el;
};

function ensureRegisterWorks() {
  // pastikan form & tombol submit benar
  const form = document.getElementById("form-register");
  if (!form) { console.warn("[register] #form-register tidak ditemukan"); return; }

  // cari tombol submit (by type atau text)
  let submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) {
    submitBtn = Array.from(form.querySelectorAll("button")).find(b =>
      (b.textContent || "").toLowerCase().includes("daftar")
    ) || null;
  }
  if (submitBtn && (submitBtn.type || "").toLowerCase() !== "submit") {
    submitBtn.type = "submit"; // paksa jadi submit
  }

  // jika klik tombol tidak memicu submit (UA/bug tertentu), fallback manual
  submitBtn?.addEventListener("click", (e) => {
    // jika browser tidak punya requestSubmit, kita manual dispatch
    if (typeof form.requestSubmit !== "function") {
      e.preventDefault();
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  });

  // logging ringan agar kelihatan di Console saat submit tertangkap
  form.addEventListener("submit", () => {
    console.log("[register] submit tertangkap");
  }, { capture: true, once: false });

  console.log("[register] ensureRegisterWorks aktif");
}

function safeInit() {
  // footer tahun & hard-refresh via logo
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
  on("logo-btn", "click", () => location.reload());

  // init modul (tanpa saling menjatuhkan)
  try { bindNav?.();      } catch (e) { console.error("bindNav error:", e); }
  try { bindRegister?.(); } catch (e) { console.error("bindRegister error:", e); }
  try { bindPayment?.();  } catch (e) { console.error("bindPayment error:", e); }
  try { bindTicket?.();   } catch (e) { console.error("bindTicket error:", e); }
  try { bindAdmin?.();    } catch (e) { console.error("bindAdmin error:", e); }

  // scanner controls (jika ada di halaman)
  on("scan-start","click", startScan);
  on("scan-stop","click",  stopScan);

  // ENTER pada input tiket = klik tombol cari
  const tSearch = document.getElementById("t-search");
  if (tSearch) {
    tSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); document.getElementById("t-find")?.click(); }
    });
  }

  // pastikan tombol Daftar benar2 bekerja
  ensureRegisterWorks();

  console.log("[main] init selesai");
}

// Pastikan DOM siap sebelum init (lebih aman lintas browser/penempatan script)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", safeInit, { once: true });
} else {
  safeInit();
}
