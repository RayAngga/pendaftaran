export const el=id=>document.getElementById(id);
export const $=(s,r=document)=>r.querySelector(s);
export const $all=(s,r=document)=>Array.from(r.querySelectorAll(s));
export function showMsg(node, html, cls){ node.className=`md:col-span-2 text-sm ${cls}`; node.innerHTML=html; }
export function safeDownload(dataUrl, filename){
  const a=document.createElement("a"); a.href=dataUrl; a.download=filename;
  document.body.appendChild(a);
  if("download" in a) a.click(); else window.open(dataUrl,"_blank"); a.remove();
}