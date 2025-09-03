
import { $, el } from "./utils.js";
import { api } from "./api.js";
import { buildTicketImage } from "./renderer.js";


function waDisplay(v){
  let s = String(v || "").replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("62")) s = "0" + s.slice(2);
  if (s[0] === "8") s = "0" + s;
  if (s[0] !== "0" && s.length >= 9 && s.length <= 13) s = "0" + s;
  return s;
}


async function renderTicketImage(rec){
  const wrap = el("ticket-wrap");
  if (!wrap) return null;

 
  const recView = { ...rec, wa: waDisplay(rec.wa) };

  
  const dataUrl = await buildTicketImage(recView, {
    width: 1200,
    height: 680,
    qrSize: 260
  });

  
  let img = el("ticket-img");
  if (!img) {
    img = document.createElement("img");
    img.id = "ticket-img";
    img.className = "rounded-2xl shadow-2xl ring-1 ring-white/10 block mx-auto";
  }
  img.src = dataUrl;

  wrap.innerHTML = "";        
  wrap.appendChild(img);
  wrap.classList.remove("hidden");

 
  el("__lastTicketCode")?.remove();
  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.id = "__lastTicketCode";
  hidden.value = String(rec.code || rec.id || "ticket");
  wrap.appendChild(hidden);

  
  const btn = el("t-download");
  if (btn) {
    btn.onclick = () => {
      const code = hidden.value || "ticket";
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
  }

  return img;
}


export async function findTicket(){
  const wrap = el("ticket-wrap");
  const msg  = el("ticket-msg");
  if (msg) { msg.className = "text-sm mt-2 text-red-400"; msg.textContent = ""; }

  const raw = $("#t-search")?.value?.trim();
  if (!raw) { if (msg) msg.textContent = "Masukkan kode atau nomor WA."; return; }

 
  if (wrap) {
    wrap.classList.remove("hidden");
    wrap.innerHTML = '<div class="skeleton h-64 rounded-2xl"></div><div class="mt-3 skeleton h-10 rounded-lg max-w-[260px] mx-auto"></div>';
  }

  try {
    const { rec } = await api.getTicket(raw);
    if (!rec) {
      if (msg) msg.textContent = "Data tidak ditemukan.";
      wrap?.classList.add("hidden");
      return;
    }
    await renderTicketImage(rec);
  } catch (e) {
    if (msg) msg.textContent = "Gagal mengambil tiket: " + (e?.message || e);
    wrap?.classList.add("hidden");
  }
}

export function bindTicket(){
  el("t-find")?.addEventListener("click", findTicket);

  
  const inp = el("t-search");
  if (inp) inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); findTicket(); }
  });

  
}
