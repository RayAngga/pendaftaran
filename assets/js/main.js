// assets/js/main.js
import { bindNav }      from "./nav.js";
import { bindRegister } from "./register.js";
import { bindPayment }  from "./payment.js";
import { bindAdmin }    from "./admin.js";
import { startScan, stopScan } from "./scanner.js";
import { bindTicket }   from "./ticket.js";  // ← tiket versi baru menggambar ke canvas & handle unduh PNG

// helper aman
const on = (id, evt, fn) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener(evt, fn);
  return el;
};

// footer tahun & hard refresh lewat logo
const y = document.getElementById("year");
if (y) y.textContent = String(new Date().getFullYear());
on("logo-btn", "click", () => location.reload());

// === Init modul (dibungkus try supaya error satu modul tidak mematikan yang lain)
try { bindNav?.();      } catch (e) { console.error("bindNav error:", e); }
try { bindRegister?.(); } catch (e) { console.error("bindRegister error:", e); }
try { bindPayment?.();  } catch (e) { console.error("bindPayment error:", e); }
try { bindTicket?.();   } catch (e) { console.error("bindTicket error:", e); } // ← handle t-find & t-download
try { bindAdmin?.();    } catch (e) { console.error("bindAdmin error:", e); }

// === Scanner controls (jika ada di halaman)
on("scan-start","click", startScan);
on("scan-stop","click",  stopScan);

// ENTER pada input tiket = klik tombol cari
const tSearch = document.getElementById("t-search");
if (tSearch) {
  tSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); document.getElementById("t-find")?.click(); }
  });
}
