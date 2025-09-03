import crypto from "node:crypto";

function b64url(buf){ return Buffer.from(buf).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function sign(payload, secret){
  const data = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}
async function parseBody(req){
  if (req.body) return req.body;
  const chunks=[]; for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try{ return JSON.parse(raw); }catch{ return {}; }
}

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method Not Allowed" });
  const body = await parseBody(req);
  const pass = (body && body.passcode) || "";
  if (!process.env.ADMIN_PASSCODE) return res.status(500).json({ ok:false, error:"ADMIN_PASSCODE not set" });
  if (pass !== process.env.ADMIN_PASSCODE) return res.status(401).json({ ok:false, error:"Unauthorized" });

  const token = sign({ sub:"admin", iat:Date.now(), exp:Date.now()+60*60*1000 }, process.env.TOKEN_SECRET || "dev");
  res.setHeader("Set-Cookie", `adm=${token}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=3600`);
  return res.status(200).json({ ok:true });
}
