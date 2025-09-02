export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).end();
  res.setHeader("Set-Cookie", "adm=; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=0");
  res.status(200).json({ ok:true });
}