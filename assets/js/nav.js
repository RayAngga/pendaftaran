import { el, $all } from "./utils.js";
export function bindNav(){
  const sections = { "btn-register":"section-register","btn-pay":"section-pay","btn-ticket":"section-ticket","btn-admin":"section-admin" };
  Object.entries(sections).forEach(([btn,sec])=>{
    el(btn).addEventListener("click", ()=>{
      Object.values(sections).forEach(id=>el(id).classList.add("hidden"));
      el(sec).classList.remove("hidden");
      $all("header button").forEach(b=>b.classList.remove("bg-white/10"));
      el(btn).classList.add("bg-white/10");
      if(sec==="section-register") document.querySelector("#f-nama").focus();
      if(sec==="section-pay") document.querySelector("#pay-wa").focus();
      if(sec==="section-ticket") document.querySelector("#t-search").focus();
    });
  });
  el("btn-register").click();
}