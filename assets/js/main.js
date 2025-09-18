// assets/js/main.js
import { bindNav }      from "./nav.js";
import { bindRegister } from "./register.js";
import { bindPayment }  from "./payment.js";
import { bindAdmin }    from "./admin.js";
import { startScan, stopScan } from "./scanner.js";
import { bindTicket }   from "./ticket.js"; // tiket → canvas & unduh PNG
import { bindAnimations } from "./anim.js";

// helper aman
const on = (id, evt, fn) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evt, fn);
  return el;
};

function ensureRegisterWorks() {
  const form = document.getElementById("reg-form");
  if (!form) { console.warn("[register] #reg-form tidak ditemukan"); return; }

  // pastikan tombol submit benar
  let submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) {
    submitBtn = Array.from(form.querySelectorAll("button")).find(b =>
      (b.textContent || "").toLowerCase().includes("daftar")
    ) || null;
  }
  if (submitBtn && (submitBtn.type || "").toLowerCase() !== "submit") {
    submitBtn.type = "submit";
  }

  // fallback kalau UA tertentu tidak memicu submit
  submitBtn?.addEventListener("click", (e) => {
    if (typeof form.requestSubmit !== "function") {
      e.preventDefault();
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  });

  form.addEventListener("submit", () => {
    console.log("[register] submit tertangkap");
  }, { capture: true });

  console.log("[main] ensureRegisterWorks aktif");
}
// --- Mini router: tampilkan satu section dan highlight nav ---
function showSection(name){
  // tampilkan section target, sembunyikan yang lain
  document.querySelectorAll('.section').forEach(sec => {
    const isTarget = sec.id === `section-${name}`;
    sec.classList.toggle('hidden', !isTarget);
    sec.classList.remove('route-enter','route-leave');
    if (isTarget) sec.classList.add('route-enter');
  });

  // tandai tombol nav aktif
  const navMap = { register:'btn-register', pay:'btn-pay', ticket:'btn-ticket', admin:'btn-admin' };
  Object.entries(navMap).forEach(([key, btnId]) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.setAttribute('aria-current', key === name ? 'page' : 'false');
  });

  // opsional: perbarui hash
  try { history.replaceState(null, '', `#${name}`); } catch {}
}

function goToRegister(){
  showSection('register');
  document.getElementById('section-register')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// (opsional) jika ingin dipanggil dari Console
window.showSection = showSection;
window.goToRegister = goToRegister;

// --- Soft refresh: bersihkan state tanpa reload halaman
function softRefresh(){
  // 1) reset form pendaftaran
  const f = document.getElementById('reg-form');
  f?.reset();

  // 2) bersihkan pesan / overlay / popup
  const pop = document.getElementById('popup');
  pop?.classList.add('hidden');
  const ov = document.getElementById('overlay');
  ov?.classList.add('hidden');
  clearTimeout(window.__popTimer);
  clearTimeout(window.__ovCancelTimer);

  // 3) matikan scanner bila aktif
  try { stopScan?.(); } catch {}

  // 4) kosongkan hasil pencarian/ticket/payment (opsional)
  const idsToClear = ['pay-msg','pay-data','t-search'];
  idsToClear.forEach(id => {
    const n = document.getElementById(id);
    if (!n) return;
    if ('value' in n) n.value = '';
    if ('innerHTML' in n) n.innerHTML = '';
    n.classList.add('hidden');
  });

  // 5) re-bind perilaku ringan jika perlu (aman kalau modul tak ada)
  try { bindRegister?.(); } catch {}
  try { bindPayment?.();  } catch {}
  try { bindTicket?.();   } catch {}
  try { bindAdmin?.();    } catch {}

  // 6) jaga hash di #register
  try { history.replaceState(null, '', '#register'); } catch {}
}



function safeInit() {
  // footer tahun & hard refresh via logo
  const y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
// di main.js
on("logo-btn", "click", (e) => {
  e.preventDefault();
  const cur = document.querySelector(".section:not(.hidden)");
  const name = cur?.id?.replace("section-", "") || "register";
  // simpan di URL agar terbawa saat reload
  location.hash = name;
  window.location.reload();
});


  // init modul — error satu modul tidak menjatuhkan lainnya
  try { bindNav?.();      } catch (e) { console.error("bindNav error:", e); }
  try { bindRegister?.(); } catch (e) { console.error("bindRegister error:", e); }
  try { bindPayment?.();  } catch (e) { console.error("bindPayment error:", e); }
  try { bindTicket?.();   } catch (e) { console.error("bindTicket error:", e); }
  try { bindAdmin?.();    } catch (e) { console.error("bindAdmin error:", e); }

  // scanner controls (jika ada di halaman)
  on("scan-start", "click", startScan);
  on("scan-stop",  "click", stopScan);

  // ENTER pada input tiket = klik tombol cari
  const tSearch = document.getElementById("t-search");
  if (tSearch) {
    tSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); document.getElementById("t-find")?.click(); }
    });
  }

  // pastikan tombol Daftar benar-benar bekerja
  ensureRegisterWorks();

  try { bindAnimations?.(); } catch (e) { console.warn("[anim] skip", e); }

  console.log("[main] init selesai");
}

// Pastikan DOM siap sebelum init
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", safeInit, { once: true });
} else {
  safeInit();
}

function switchSection(target){ // target: 'register' | 'pay' | 'ticket' | 'admin'
  const next = document.getElementById(`section-${target}`);
  if (!next) return;

  // section aktif saat ini = yang tidak hidden
  const current = Array.from(document.querySelectorAll('.section'))
    .find(sec => !sec.classList.contains('hidden') && sec !== next);

  // Siapkan next: unhide dulu supaya bisa animasi masuk
  next.classList.remove('hidden', 'route-leave');
  // Trigger reflow agar animasi dapat start baru
  // eslint-disable-next-line no-unused-expressions
  next.offsetHeight; 
  next.classList.add('route-enter');

  // Keluarin current pakai route-leave, baru di-hide saat animationend
  if (current) {
    current.classList.remove('route-enter');
    current.classList.add('route-leave');
    current.addEventListener('animationend', function onLeave(){
      current.classList.add('hidden');
      current.classList.remove('route-leave');
      current.removeEventListener('animationend', onLeave);
    }, { once:true });
  }

  // Bersihkan flag route-enter pada next setelah animasi selesai
  next.addEventListener('animationend', () => {
    next.classList.remove('route-enter');
  }, { once:true });

  // (opsional) set aria-current pada nav
  const map = { register:'btn-register', pay:'btn-pay', ticket:'btn-ticket', admin:'btn-admin' };
  Object.entries(map).forEach(([name, id])=>{
    const b = document.getElementById(id);
    if (b) b.setAttribute('aria-current', name === target ? 'page' : 'false');
  });
}
