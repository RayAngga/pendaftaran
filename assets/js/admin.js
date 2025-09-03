import { el } from "./utils.js";
import { api } from "./api.js";

export function bindAdmin(){
  const btn = el("admin-enter");
  const msg = el("admin-msg");
  btn?.addEventListener("click", async ()=>{
    msg.className = "text-sm text-slate-300";
    msg.textContent = "Mencoba login…";
    try{
      const pass = (el("admin-pass").value || "").trim();
      await api.adminLogin(pass);                 // set cookie 'adm'
      msg.className = "text-sm text-emerald-300";
      msg.textContent = "Login sukses.";
      el("admin-login").classList.add("hidden");
      el("admin-area").classList.remove("hidden");
      // di sini kamu bisa memanggil api.list() lalu render tabel, jika diinginkan
    }catch(e){
      msg.className = "text-sm text-red-400";
      msg.textContent = "Login gagal: " + (e?.message || "Unknown");
    }
  });
}
