import { el } from "./utils.js";
import { state, saveRegs, clearRegs } from "./state.js";
import { EVENT_CAPACITY } from "./config.js";
import { renderTicket } from "./ticket.js";
import { api } from "./api.js";

export async function adminLogin(){
  const pass=el("admin-pass").value;
  try{
    const res = await fetch("/api/admin-login", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ passcode: pass }) });
    const data = await res.json(); if(!data.ok) throw new Error(data.error || "Login gagal");
    state.admin=true; el("admin-login").classList.add("hidden"); el("admin-area").classList.remove("hidden"); await refreshFromServer();
  } catch(e){ alert(e.message); }
}
async function refreshFromServer(){
  try{ const { rows } = await api.list(); state.regs = rows; saveRegs(); renderStats(); renderAdminTable(); }
  catch(e){ console.warn("Gagal ambil data server:", e); }
}
export function renderStats(){
  const total=state.regs.length, hadir=state.regs.filter(r=>Number(r.attended)).length, sisa=Math.max(0,EVENT_CAPACITY-total);
  document.getElementById("stat-total").textContent=total;
  document.getElementById("stat-hadir").textContent=hadir;
  document.getElementById("stat-kuota").textContent=sisa;
}
export function renderAdminTable(){
  const tb=document.getElementById("admin-tbody"); if(!tb) return; tb.innerHTML="";
  const q=document.getElementById("admin-search").value.trim().toLowerCase();
  state.regs.filter(r=>!q||[r.nama,r.fakultas,r.prodi,r.wa,(r.makanan?.label||r.makanan),r.domisili,r.code].some(v=>String(v??"").toLowerCase().includes(q)))
    .forEach(r=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td class="px-3 py-2 font-mono">${r.code||"-"}</td>
        <td class="px-3 py-2">${r.nama}</td>
        <td class="px-3 py-2">${r.fakultas || "-"}</td>
        <td class="px-3 py-2">${r.prodi || "-"}</td>
        <td class="px-3 py-2">${r.wa}</td>
        <td class="px-3 py-2">${(r.makanan?.label || r.makanan) || "-"}</td>
        <td class="px-3 py-2">${r.domisili || "-"}</td>
        <td class="px-3 py-2"><span class="px-2 py-0.5 rounded text-xs ${Number(r.paid)?'bg-emerald-500/20 text-emerald-300':'bg-rose-500/20 text-rose-300'}">${Number(r.paid)?'Sudah':'Belum'}</span></td>
        <td class="px-3 py-2"><span class="px-2 py-0.5 rounded text-xs ${Number(r.attended)?'bg-emerald-500/20 text-emerald-300':'bg-yellow-500/20 text-yellow-300'}">${Number(r.attended)?'Hadir':'Belum'}</span></td>
        <td class="px-3 py-2">${r.proofUrl?'<a class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs" target="_blank" href="'+r.proofUrl+'">Lihat</a>':'-'}</td>
        <td class="px-3 py-2">
          <button class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs" data-act="togglePaid">Toggle Bayar</button>
          <button class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs" data-act="toggleAttend">Toggle Hadir</button>
          <button class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs" data-act="ticket">Tiket</button>
          <button class="px-2 py-1 rounded bg-red-600/80 hover:bg-red-600 text-xs" data-act="delete">Hapus</button>
        </td>`;
      tr.querySelector('[data-act="togglePaid"]').addEventListener("click",async()=>{ await api.togglePaid(r.id); await refreshFromServer(); });
      tr.querySelector('[data-act="toggleAttend"]').addEventListener("click",async()=>{ await api.toggleAttend(r.id); await refreshFromServer(); });
      tr.querySelector('[data-act="ticket"]').addEventListener("click",()=>{ if(Number(r.paid)&&r.code){ document.getElementById("btn-ticket").click(); renderTicket(r);} else alert("Belum bayar / belum ada kode."); });
      tr.querySelector('[data-act="delete"]').addEventListener("click",async()=>{ if(confirm("Hapus peserta ini?")){ await api.remove(r.id); await refreshFromServer(); }});
      tb.appendChild(tr);
    });
}
export function resetAll(){
  if(!state.admin) return alert("Masuk Admin dulu.");
  if(!confirm("Hapus cache lokal di browser ini? Data di server tetap ada.")) return;
  clearRegs(); renderAdminTable(); renderStats(); document.getElementById("form-register").reset();
  document.getElementById("pay-data").classList.add("hidden"); document.getElementById("ticket-card").classList.add("hidden");
  alert("Cache lokal terhapus. Data server tidak terpengaruh.");
}
export function exportCSV(){
  const rows = state.regs || []; if(!rows.length){ alert("Belum ada data."); return; }
  const header = ["nama","fakultas","prodi","wa","makanan","domisili","kode","paid","attended","createdAt","id"];
  const csv = [ header.join(","), ...rows.map(r => [ r.nama, r.fakultas||"", r.prodi||"", r.wa, (r.makanan?.label||r.makanan||""), r.domisili||"", r.code||"", Number(r.paid)?"1":"0", Number(r.attended)?"1":"0", r.createdAt||"", r.id||"" ].map(s=>`"${String(s).replace(/"/g,'""')}"`).join(",")) ].join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="riungmaba_peserta.csv";
  ("download" in a) ? a.click() : window.open(url, "_blank"); setTimeout(()=>URL.revokeObjectURL(url), 2000);
}