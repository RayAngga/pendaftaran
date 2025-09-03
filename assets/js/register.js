import { $, el, showMsg, showOverlay, hideOverlay, btnLoading } from "./utils.js";
import { api } from "./api.js";
import { FOOD_OPTIONS } from "./config.js";
import { findUnpaidByWA } from "./payment.js";

/* Normalisasi WA agar selalu berawalan '0' (tahan input 62/+62/813 dst) */
function formatWaClient(input) {
  let s = String(input || "").replace(/[^\d]/g, ""); // sisakan digit saja
  if (!s) return "";
  if (s.startsWith("62")) s = "0" + s.slice(2);     // 62xxxx -> 0xxxx
  if (s[0] === "8") s = "0" + s;                    // 813... -> 0813...
  if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
  return s;
}

function fillFoodOptions(){
  const sel = el("f-makanan");
  sel.innerHTML = "";
  FOOD_OPTIONS.forEach(opt=>{
    const o = document.createElement("option");
    o.value = opt.value; o.textContent = opt.label; sel.appendChild(o);
  });
}

export function bindRegister(){
  fillFoodOptions();

  // Opsional: rapikan input WA saat blur (menghindari kursor lompat saat mengetik)
  const waInput = $("#f-wa");
  if (waInput) {
    waInput.addEventListener("blur", () => {
      const fixed = formatWaClient(waInput.value);
      if (fixed) waInput.value = fixed;
    });
  }

  $("#btn-reset-form").addEventListener("click", ()=>{
    el("form-register").reset();
    el("register-msg").textContent="";
  });

  el("form-register").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const btn = e.submitter || el("form-register").querySelector('button[type="submit"]');
    const msg = el("register-msg");

    const nama     = $("#f-nama").value.trim();
    const fakultas = $("#f-fakultas").value.trim();
    const prodi    = $("#f-prodi").value.trim();

    // Normalisasi WA ⇢ pastikan awalan '0'
    const waRaw = $("#f-wa").value.trim();
    const wa    = formatWaClient(waRaw);
    if (wa) $("#f-wa").value = wa; // tampilkan yang sudah diformat ke user

    const makanan = $("#f-makanan").selectedOptions[0]?.textContent || $("#f-makanan").value;
    const domisili= $("#f-domisili").value.trim();

    if(!nama || !wa){
      showMsg(msg,"Nama & WA wajib diisi.","text-red-400");
      return;
    }

    try{
      btnLoading(btn,true);
      showOverlay("Mendaftarkan…","Mengirim data ke server",8000);

      await api.register({ nama, fakultas, prodi, wa, makanan, domisili });

      hideOverlay();
      btnLoading(btn,false);

      showMsg(msg,'Pendaftaran berhasil! Lanjut ke tab <b>Pembayaran</b> untuk upload bukti.','text-emerald-300');
      document.getElementById("btn-pay")?.click();
      document.getElementById("pay-wa").value = wa;   // pakai WA yang sudah diformat
      await findUnpaidByWA();

    }catch(e){
      hideOverlay();
      btnLoading(btn,false);
      const err = e?.message || "";

      if (/duplicate-wa/i.test(err)) {
        showMsg(msg,'Nomor WA sudah terdaftar. Silakan lanjut ke tab <b>Pembayaran</b> untuk upload bukti.','text-yellow-300');
        document.getElementById("btn-pay")?.click();
        document.getElementById("pay-wa").value = wa; // tetap pakai WA yang sudah diformat
        await findUnpaidByWA();
      } else {
        showMsg(msg,'Gagal daftar: '+err,'text-red-400');
      }
    }
  });
}
