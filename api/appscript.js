// /api/appscript.js — Vercel Serverless Function (Node.js, ESM)
const fetchFn = globalThis.fetch;

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

function parseCookies(cookieHeader = '') {
  const out = {};
  cookieHeader.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) {
      const k = p.slice(0, i).trim();
      const v = decodeURIComponent(p.slice(i + 1).trim());
      out[k] = v;
    }
  });
  return out;
}

function setAuthCookie(req, res, on = true) {
  const isHttps = (req.headers['x-forwarded-proto'] || '').includes('https');
  const parts = [
    'Path=/',
    on ? 'Max-Age=259200' : 'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
    isHttps ? 'Secure' : ''
  ].filter(Boolean);
  res.setHeader('Set-Cookie', `adm=${on ? '1' : ''}; ${parts.join('; ')}`);
}

function readJson(req) {
  return new Promise((resolve) => {
    if (req.body != null) return resolve(req.body);
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { ok:false, error:'Method Not Allowed' });

    const body = await readJson(req);
    const action  = body?.action;
    const payload = body?.payload;
    if (!action) return send(res, 400, { ok:false, error:'Missing action' });

    if (action === 'adminLogin') {
      const pass = String(payload?.pass || '');
      const secret = process.env.ADMIN_PASSCODE || '';
      if (!secret) return send(res, 500, { ok:false, error:'ADMIN_PASSCODE not set' });
      if (pass !== secret) return send(res, 401, { ok:false, error:'Invalid passcode' });
      setAuthCookie(req, res, true);
      return send(res, 200, { ok:true });
    }

    if (action === 'adminLogout') {
      setAuthCookie(req, res, false);
      return send(res, 200, { ok:true });
    }

    const url = process.env.APPS_SCRIPT_URL;
    if (!url) return send(res, 500, { ok:false, error:'APPS_SCRIPT_URL not set' });

    const needsAuth = ['list','delete','togglePaid','toggleAttend'];
    const hasAdm = parseCookies(req.headers.cookie || '')['adm'] === '1';
    if (needsAuth.includes(action) && !hasAdm) return send(res, 401, { ok:false, error:'Unauthorized' });

    let fr;
    try {
      fr = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ action, payload })
      });
    } catch (e) {
      return send(res, 502, { ok:false, error:`Fetch to Apps Script failed: ${e?.message || e}` });
    }

    const text = await fr.text();
    let data;
    try { data = text ? JSON.parse(text) : null; }
    catch { return send(res, fr.status || 500, { ok:false, error:text || 'Apps Script returned non-JSON' }); }

    if (!fr.ok || data?.ok === false) {
      return send(res, fr.status || 500, { ok:false, error: data?.error || 'Proxy error' });
    }
    return send(res, 200, data);

  } catch (e) {
    return send(res, 500, { ok:false, error: e?.message || String(e) });
  }
}
