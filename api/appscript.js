
import crypto from "node:crypto";
function b64url(buf){ return Buffer.from(buf).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function verify(token, secret){
  try{
    const [data, sig] = String(token||"").split(".");
    const expSig = b64url(crypto.createHmac("sha256", secret).update(data).digest());
    if (sig !== expSig) return null;
    const payload = JSON.parse(Buffer.from(data.replace(/-/g,"+").replace(/_/g,"/"),"base64").toString("utf8"));
    if (Date.now() > Number(payload.exp)) return null;
    return payload;
  }catch{ return null; }
}
function getCookie(req, name){
  const raw = req.headers.cookie || "";
  const found = raw.split(";").map(s=>s.trim().split("=")).find(([k])=>k===name);
  return found ? decodeURIComponent(found[1] || "") : "";
}
async function parseBody(req){
  if (req.body) return req.body;
  const chunks=[]; for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try{ return JSON.parse(raw); }catch{ return {}; }
}
export default async function handler(req, res){
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.status(405).json({ ok:false, error:"Method Not Allowed" });
  }
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma","no-cache"); res.setHeader("Expires","0");
  const body = await parseBody(req);
  try{
    const { action } = body || {};
    const PUBLIC_ACTIONS = ['register','findByWA','getTicket','submitProof'];
    const needsAdmin = !PUBLIC_ACTIONS.includes(action);
    if (needsAdmin) {
      const token = getCookie(req, 'adm');
      const payload = verify(token, process.env.TOKEN_SECRET || 'dev');
      if (!payload) { res.setHeader("Access-Control-Allow-Origin", allowedOrigin); return res.status(401).json({ ok:false, error:'Admin auth required' }); }
    }
    const url = process.env.APPSSCRIPT_URL;
    const secret = process.env.APPSSCRIPT_SECRET;
    if(!url || !secret) { res.setHeader("Access-Control-Allow-Origin", allowedOrigin); return res.status(500).json({ ok:false, error:"APPSSCRIPT_URL/SECRET not set" }); }
    const r = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ ...(body||{}), secret })
    });
    const raw = await r.text();
    let data; try { data = JSON.parse(raw); } catch {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      return res.status(r.status || 500).json({ ok:false, error: `Apps Script returned non-JSON (${r.status}): ${raw.slice(0,200)}` });
    }
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.status(200).json(data);
  }catch(e){
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.status(500).json({ ok:false, error:String(e) });
  }
}
