
const API_URL = "/api/appscript";
async function call(action, payload){
  const r = await fetch(API_URL, {
    method:"POST",
    cache:"no-store",
    headers:{ "Content-Type":"application/json", "Cache-Control":"no-store" },
    body: JSON.stringify({ action, payload })
  });
  const data = await r.json();
  if(!r.ok || data?.ok===false){
    const err = new Error(data?.error || r.statusText);
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
