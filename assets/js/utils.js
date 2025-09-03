export const el=id=>document.getElementById(id);
export const $=(s,r=document)=>r.querySelector(s);
export const $all=(s,r=document)=>Array.from(r.querySelectorAll(s));
export function showMsg(node, html, cls){ node.className=`md:col-span-2 text-sm ${cls}`; node.innerHTML=html; }
export function safeDownload(dataUrl, filename){
  const a=document.createElement("a"); a.href=dataUrl; a.download=filename;
  document.body.appendChild(a);
  if("download" in a) a.click(); else window.open(dataUrl,"_blank"); a.remove();
}

export function showOverlay(title="Memproses…", sub="Mohon tunggu", withCancelAfterMs=8000){
  const ov = el("overlay"); if(!ov) return;
  el("overlay-title").textContent = title;
  el("overlay-sub").textContent = sub||"";
  const cancel = el("overlay-cancel");
  cancel.classList.add("hidden");
  ov.classList.remove("hidden");
  // tampilkan tombol Batal setelah delay
  if(withCancelAfterMs>0){
    clearTimeout(window.__ovCancelTimer);
    window.__ovCancelTimer = setTimeout(()=>{
      cancel.classList.remove("hidden");
      cancel.onclick = ()=> location.reload();
    }, withCancelAfterMs);
  }
}
export function hideOverlay(){
  const ov = el("overlay"); if(!ov) return;
  ov.classList.add("hidden");
  clearTimeout(window.__ovCancelTimer);
}
export function showPopup(kind="ok", title="Selesai", sub=""){
  const p = el("popup"); if(!p) return;
  const icon = el("popup-icon"); icon.className = "popup-icon " + kind;
  el("popup-title").textContent = title;
  el("popup-sub").textContent = sub||"";
  p.classList.remove("hidden");
  clearTimeout(window.__popTimer);
  window.__popTimer = setTimeout(()=> p.classList.add("hidden"), 1800);
}
export function btnLoading(btn, on=true){
  if(!btn) return;
  btn.classList.toggle("loading", !!on);
  btn.disabled = !!on;
}
