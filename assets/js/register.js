// assets/js/register.js
import { $, el, showMsg, showOverlay, hideOverlay, btnLoading } from "./utils.js";
import { api } from "./api.js";
import { findUnpaidByWA } from "./payment.js";

// fallback util bila elemen pesan tidak ada
const q = (s) => document.querySelector(s);
function showMsgSafe(text, cls = "text-slate-200") {
  const msgEl = document.getElementById("register-msg"); // kalau kamu punya elemen ini
  if (msgEl) { try { showMsg?.(msgEl, text, cls); } catch { msgEl.className = cls; msgEl.innerHTML = text; } }
  else { try { // pakai overlay/popup kalau ada
      showOverlay?.("Info", text, 1600);
      setTimeout(() => hideOverlay?.(), 1700);
    } catch { alert(text); }
  }
}
const setBtnLoading = (btn, on) => { try { btnLoading?.(btn, on); } catch { if (btn) btn.disabled = !!on; } };

/* Normalisasi WA => selalu awalan '0' */
function formatWaClient(input) {
  let s = String(input || "").replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("62")) s = "0" + s.slice(2);
  if (s[0] === "8") s = "0" + s;
  if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
  return s;
}

export function bindRegister() {
  const form = document.getElementById("reg-form");
  if (!form) { console.warn("[register] #reg-form tidak ditemukan"); return; }

  // format WA realtime
  const waInput = document.getElementById("wa");
  if (waInput) {
    const apply = () => {
      const fixed = formatWaClient(waInput.value);
      if (waInput.value !== fixed) waInput.value = fixed;
    };
    waInput.addEventListener("input", apply);
    waInput.addEventListener("blur", apply);
  }

  // reset form → kosongkan pesan jika ada
  form.querySelector('button[type="reset"]')?.addEventListener("click", () => {
    const msgEl = document.getElementById("register-msg");
    if (msgEl) msgEl.textContent = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = e.submitter || form.querySelector('button[type="submit"]');

    const nama     = q("#name")?.value.trim() || "";
    const fakultas = q("#faculty")?.value.trim() || "";
    const prodi    = q("#major")?.value.trim() || "";
    const domisili = q("#city")?.value.trim() || "";
    const consent  = q("#agree")?.checked ?? false;

    const wa = formatWaClient(q("#wa")?.value.trim() || "");
    if (q("#wa")) q("#wa").value = wa;

    if (!nama || !wa) {
      showMsgSafe("Nama & WA wajib diisi.", "text-red-400");
      return;
    }
    if (!consent) {
      showMsgSafe("Silakan centang persetujuan terlebih dahulu.", "text-yellow-300");
      return;
    }

    try {
      setBtnLoading(btn, true);
      try { showOverlay?.("Mendaftarkan…", "Mengirim data ke server", 8000); } catch {}

      if (!api?.register) throw new Error("API belum dikonfigurasi.");

      // payload mengikuti backend lama (nama/fakultas/prodi/wa/domisili)
      const payload = { nama, fakultas, prodi, wa, domisili };
      await api.register(payload);

      hideOverlay?.(); setBtnLoading(btn, false);
      showMsgSafe('Pendaftaran berhasil! Lanjut ke tab <b>Pembayaran</b> untuk upload bukti.', 'text-emerald-300');

      // pindah ke Pembayaran + isi WA
      document.getElementById("btn-pay")?.click();
      const payWa = document.getElementById("pay-wa");
      if (payWa) payWa.value = wa;
      try { await findUnpaidByWA?.(); } catch {}
    } catch (err) {
      hideOverlay?.(); setBtnLoading(btn, false);
      const msg = String(err?.message || err || "Gagal mendaftar.");
      if (/duplicate-wa/i.test(msg)) {
        showMsgSafe('Nomor WA sudah terdaftar. Silakan lanjut ke tab <b>Pembayaran</b> untuk upload bukti.', 'text-yellow-300');
        document.getElementById("btn-pay")?.click();
        const payWa = document.getElementById("pay-wa"); if (payWa) payWa.value = wa;
        try { await findUnpaidByWA?.(); } catch {}
      } else {
        showMsgSafe("Gagal daftar: " + msg, "text-red-400");
        console.error("Register error:", err);
      }
    }
  });

  console.log("[register] ready untuk #reg-form");
}
