export const API_URL = '/api/appscript';
async function call(action, payload={}){
  const res = await fetch(API_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ action, payload })
  });
  const data = await res.json();
  if(!data.ok) throw new Error(data.error || 'API error');
  return data;
}
export const api = {
  register:(rec)=>call('register',rec),
  findByWA:(wa)=>call('findByWA',{wa}),
  getTicket:(q)=>call('getTicket',{q}),
  submitProof:(id,dataUrl)=>call('submitProof',{id,dataUrl}),
  list:()=>call('list'),
  togglePaid:(id)=>call('togglePaid',{id}),
  toggleAttend:(id)=>call('toggleAttend',{id}),
  remove:(id)=>call('delete',{id})
};