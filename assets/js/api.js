
const API_URL = "/api/appscript";
async function call(action, payload){
  const r = await fetch(API_URL, {
    method:"POST",
    cache:"no-store",
    headers:{ "Content-Type":"application/json", "Cache-Control":"no-store" },
    body: JSON.stringify({ action, payload })
  });
  const text = await r.text();
  let data = null;
  try{
    data = text ? JSON.parse(text) : null;
  }catch(e){
    const hint = (text || "").slice(0,200);
    const err = new Error(`Server returned non-JSON (${r.status} ${r.statusText}): ${hint}`);
    err.responseRaw = text; throw err;
  }
  if(!r.ok || data?.ok===false){
    const err = new Error(data?.error || r.statusText || "Request failed");
    err.response = data; throw err;
  }
  return data;
}
export const api = {
  adminLogin:(pass)=>call("adminLogin",{pass}),
  adminLogout:()=>call("adminLogout",{}),
  register:(p)=>call("register",p),
  findByWA:(wa)=>call("findByWA",{wa}),
  getTicket:(q)=>call("getTicket",{q}),
  submitProof:(id,dataUrl)=>call("submitProof",{id,dataUrl}),
  list:()=>call("list",{}),
  remove:(id)=>call("delete",{id}),
  togglePaid:(id)=>call("togglePaid",{id}),
  toggleAttend:(id)=>call("toggleAttend",{id}),
};
