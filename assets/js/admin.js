// assets/js/admin.js
import { el } from "./utils.js";
import { api } from "./api.js";

let ROWS_RAW = [];
let lastFilter = "";

// ====== UTIL ======
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}
function text(v){
  if (v == null) return "";
  if (typeof v === "object") return escapeHtml(v.label || v.value || JSON.stringify(v));
  return escapeHtml(String(v));
}
function renderStats(rows){
  const total = rows.length;
  const hadir = rows.filter(r => Number(r.attended) === 1).length;
  const kuotaTotal = Number(window.KUOTA_TOTAL || 0) || null; // opsional
  const sisa = kuotaTotal ? Math.max(kuotaTotal - total, 0) : "—";
  const set = (id, val) => { const n = el(id); if (n) n.textContent = String(val); };
  set("stat-total", total);
  set("stat-hadir", hadir);
  set("stat-kuota", sisa);
}

// ====== RENDER TABEL ======
function rowHtml(r){
  const paid = Number(r.paid) === 1;
  const att  = Number(r.attended) === 1;
  return `
    <tr class="odd:bg-white/0 even:bg-white/[0.025]">
      <td class="px-3 py-2 font-mono">${text(r.code || "-")}</td>
      <td class="px-3 py-2">${text(r.nama)}</td>
      <td class="px-3 py-2">${text(r.fakultas || "-")}</td>
      <td class="px-3 py-2">${text(r.prodi || "-")}</td>
      <td class="px-3 py-2 font-mono">${text(r.wa || "-")}</td>
      <td class="px-3 py-2">${text(r.makanan || "-")}</td>
      <td class="px-3 py-2">${text(r.domisili || "-")}</td>
      <td class="px-3 py-2">
        <button class="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 btn-paid" data-id="${escapeHtml(r.id)}">
          ${paid ? "Sudah" : "Belum"}
        </button>
      </td>
      <td class="px-3 py-2">
        <button class="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 btn-attend" data-id="${escapeHtml(r.id)}">
          ${att ? "Hadir" : "Belum"}
        </button>
      </td>
      <td class="px-3 py-2">
        ${r.proofUrl ? `<a href="${escapeHtml(r.proofUrl)}" target="_blank" class="underline">Lihat</a>` : "-"}
      </td>
      <td class="px-3 py-2">
        <button class="px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 btn-del" data-id="${escapeHtml(r.id)}">Hapus</button>
      </td>
    </tr>
  `;
}
function applyFilter(rows, q){
  if (!q) return rows;
  const s = q.toLowerCase();
  return rows.filter(r=>{
    return [
      r.code, r.nama, r.fakultas, r.prodi, r.wa, r.makanan, r.domisili
    ].some(v => (v??"").toString().toLowerCase().includes(s));
  });
}
function renderTable(){
  const TB = el("admin-tbody");
  if (!TB) return;
  const rows = applyFilter(ROWS_RAW, lastFilter);
  if (!rows.length){
    TB.innerHTML = `<tr><td colspan="11" class="px-3 py-4 text-center text-slate-400">Belum ada data.</td></tr>`;
  } else {
    TB.innerHTML = rows.map(rowHtml).join("");
  }
  renderStats(rows);
}

// ====== LOAD LIST ======
async function loadList(){
  const TB = el("admin-tbody");
  if (TB) TB.innerHTML = `<tr><td colspan="11" class="px-3 py-4 text-center text-slate-400">Memuat data…</td></tr>`;
  try{
    const { rows } = await api.list(); // butuh cookie admin
    ROWS_RAW = Array.isArray(rows) ? rows : [];
    renderTable();
  }catch(e){
    if (TB) TB.innerHTML = `<tr><td colspan="11" class="px-3 py-4 text-center text-rose-300">Gagal memuat data: ${escapeHtml(e?.message || e)}</td></tr>`;
  }
}

// ====== BIND ACTIONS ======
function bindActions(){
  const TB = el("admin-tbody");
  if (!TB) return;

  // Toggle Paid / Attended / Delete (delegation)
  TB.addEventListener("click", async (ev)=>{
    const paidBtn   = ev.target.closest?.(".btn-paid");
    const attendBtn = ev.target.closest?.(".btn-attend");
    const delBtn    = ev.target.closest?.(".btn-del");

    try{
      if (paidBtn){
        const id = paidBtn.dataset.id;
        await api.togglePaid(id);
        const rec = ROWS_RAW.find(r=> r.id === id);
        if (rec) rec.paid = Number(rec.paid) ? 0 : 1;
        renderTable();
        return;
      }
      if (attendBtn){
        const id = attendBtn.dataset.id;
        await api.toggleAttend(id);
        const rec = ROWS_RAW.find(r=> r.id === id);
        if (rec) rec.attended = Number(rec.attended) ? 0 : 1;
        renderTable();
        return;
      }
      if (delBtn){
        const id = delBtn.dataset.id;
        if (!confirm("Yakin hapus data ini?")) return;
        await api.remove(id);
        ROWS_RAW = ROWS_RAW.filter(r => r.id !== id);
        renderTable();
        return;
      }
    }catch(e){
      alert("Aksi gagal: " + (e?.message || e));
    }
  });

  // Search
  const q = el("admin-search");
  if (q){
    q.addEventListener("input", ()=>{
      lastFilter = q.value.trim();
      renderTable();
    });
  }

  // Export CSV
  const btnExport = el("admin-export");
  if (btnExport){
    btnExport.addEventListener("click", ()=>{
      const rows = applyFilter(ROWS_RAW, lastFilter);
      const header = ["id","createdAt","nama","fakultas","prodi","wa","makanan","domisili","paid","attended","code","proofUrl"];
      const csv = [header.join(",")].concat(
        rows.map(r => header.map(k => {
          const raw = r[k] ?? "";
          const val = typeof raw === "object" ? (raw.label || raw.value || JSON.stringify(raw)) : String(raw);
          const escaped = `"${val.replace(/"/g,'""')}"`;
          return escaped;
        }).join(","))
      ).join("\n");
      const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "registrants.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  // Reset lokal (kosongkan filter & hapus cache ringan)
  const btnReset = el("admin-reset");
  if (btnReset){
    btnReset.addEventListener("click", ()=>{
      try {
        sessionStorage.removeItem("lastTicketQuery");
      }catch{}
      lastFilter = "";
      const q = el("admin-search"); if (q) q.value = "";
      renderTable();
      alert("Data lokal dibersihkan (filter & cache kecil).");
    });
  }
}

// ====== LOGIN / INIT ======
export function bindAdmin(){
  const loginBox = el("admin-login");
  const areaBox  = el("admin-area");
  const btnEnter = el("admin-enter");
  const msgBox   = el("admin-msg");

  // login click
  if (btnEnter){
    btnEnter.addEventListener("click", async ()=>{
      try{
        msgBox.textContent = "Mencoba login…";
        msgBox.className = "text-sm text-slate-300";
        const pass = (el("admin-pass")?.value || "").trim();
        await api.adminLogin(pass);    // set cookie 'adm' via server
        if (loginBox) loginBox.classList.add("hidden");
        if (areaBox)  areaBox.classList.remove("hidden");
        msgBox.textContent = "";
        await loadList();
        bindActions();
      }catch(e){
        msgBox.textContent = "Login gagal: " + (e?.message || e);
        msgBox.className = "text-sm text-rose-300";
      }
    });
  }

  // Saat tab admin dibuka, coba loadList — jika 401, form login tetap terlihat
  // (server yang validasi cookie; klien cukup mencoba memuat)
  (async ()=>{
    try{
      // Sembunyikan area dulu; kalau berhasil load, tampilkan
      if (areaBox) areaBox.classList.add("hidden");
      if (loginBox) loginBox.classList.remove("hidden");
      await loadList();
      if (loginBox) loginBox.classList.add("hidden");
      if (areaBox)  areaBox.classList.remove("hidden");
      bindActions();
    }catch{
      // kemungkinan 401: biarkan user login
      if (loginBox) loginBox.classList.remove("hidden");
      if (areaBox)  areaBox.classList.add("hidden");
    }
  })();
}
