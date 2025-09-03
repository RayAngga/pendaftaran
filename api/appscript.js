// /api/appscript.js — Vercel Serverless Function (Node.js)
// Handles adminLogin (sets cookie) and proxies other actions to Google Apps Script.
//
// ENV needed on Vercel:
// - ADMIN_PASSCODE="your-secret"
// - APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx.../exec"  (POST JSON: {action, payload})
//
// This function expects POST with JSON: { action, payload }

const fetch = global.fetch || (await import('node-fetch')).default;

function parseCookies(cookieHeader=''){
  const out = {};
  cookieHeader.split(';').forEach(p=>{
    const i = p.indexOf('=');
    if(i>0){
      const k = p.slice(0,i).trim();
      const v = decodeURIComponent(p.slice(i+1).trim());
      out[k]=v;
    }
  });
  return out;
}

function setCookie(res, name, value, maxAgeSec=86400*7){
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=Lax`;
  res.setHeader('Set-Cookie', cookie);
}

module.exports = async (req, res) => {
  try{
    if (req.method !== 'POST'){
      res.status(405).json({ ok:false, error:'Method Not Allowed' });
      return;
    }
    const { action, payload } = req.body || {};
    if(!action){
      res.status(400).json({ ok:false, error:'Missing action' });
      return;
    }

    // Admin login: check passcode, set cookie
    if(action === 'adminLogin'){
      const pass = String(payload?.pass || '');
      if(!process.env.ADMIN_PASSCODE){
        res.status(500).json({ ok:false, error:'ADMIN_PASSCODE not set' });
        return;
      }
      if(pass !== process.env.ADMIN_PASSCODE){
        res.status(401).json({ ok:false, error:'Invalid passcode' });
        return;
      }
      setCookie(res, 'adm', '1', 86400*3);
      res.status(200).json({ ok:true });
      return;
    }

    // For other actions, require cookie adm=1
    const hasAdm = parseCookies(req.headers.cookie || '')['adm'] === '1';
    if(!hasAdm && ['list','delete','togglePaid','toggleAttend'].includes(action)){
      res.status(401).json({ ok:false, error:'Unauthorized' });
      return;
    }

    // Proxy to Apps Script (if provided)
    const url = process.env.APPS_SCRIPT_URL;
    if(!url){
      res.status(500).json({ ok:false, error:'APPS_SCRIPT_URL not set' });
      return;
    }

    const fr = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ action, payload })
    });
    const ct = fr.headers.get('content-type') || '';
    const text = await fr.text();
    // Try JSON first
    let data;
    try{ data = JSON.parse(text); }
    catch{ data = { ok: fr.ok, raw: text }; }

    if(!fr.ok || data?.ok===false){
      res.status(fr.status || 500).json({ ok:false, error: data?.error || text || 'Proxy error' });
      return;
    }
    res.status(200).json(data);
  }catch(e){
    res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
};
