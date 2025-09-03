
export const el = (id)=> document.getElementById(id);
export const $  = (sel,root=document)=> root.querySelector(sel);
export const $all = (sel,root=document)=> Array.from(root.querySelectorAll(sel));

export function showMsg(node, html, cls=""){
  node.className = "text-sm " + cls;
  node.innerHTML = html;
}
export function safeDownload(dataUrl, filename){
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename || "download.png";
  document.body.appendChild(a); a.click(); a.remove();
}
export function btnLoading(btn, on=true){
  if(!btn) return; btn.disabled = !!on; btn.classList.toggle("opacity-60", !!on);
}
export function showOverlay(title="Memproses…", sub="Mohon tunggu", withCancelAfterMs=8000){
  const ov = el("overlay"); if(!ov) return;
  el("overlay-title").textContent = title;
  el("overlay-sub").textContent = sub||"";
  const cancel = el("overlay-cancel");
  cancel.classList.add("hidden");
  ov.classList.remove("hidden");
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
  ov.classList.add("hidden"); clearTimeout(window.__ovCancelTimer);
}
export function showPopup(kind="ok", title="Selesai", sub=""){
  const p = el("popup"); if(!p) return;
  const icon = document.getElementById("popup-icon");
  icon.className = "popup-icon " + kind;
  document.getElementById("popup-title").textContent = title;
  document.getElementById("popup-sub").textContent = sub || "";
  p.classList.remove("hidden");
  clearTimeout(window.__popTimer);
  window.__popTimer = setTimeout(()=> p.classList.add("hidden"), 1800);
}
