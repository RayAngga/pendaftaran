// /api/appscript.js — Vercel Serverless Function (Node.js, ESM)
// - Semua request ke Apps Script akan disertai { secret: APPS_SCRIPT_SECRET }.
// - Aksi terproteksi (list, delete, togglePaid, toggleAttend) tetap butuh cookie adm=1.
// - adminLogin/adminLogout mengelola cookie adm=1 (HttpOnly, SameSite=Lax, Secure hanya di HTTPS).
// - Selalu balas JSON (termasuk saat error). Ada action "diag" untuk cek ENV & status login.

const fetchFn = globalThis.fetch;

const PROTECTED_ACTIONS = new Set(['list', 'delete', 'togglePaid', 'toggleAttend']);

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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
    on ? 'Max-Age=259200' : 'Max-Age=0', // 3 hari / hapus
    'HttpOnly',
    'SameSite=Lax',
    isHttps ? 'Secure' : ''              // di localhost http: jangan Secure
  ].filter(Boolean);
  res.setHeader('Set-Cookie', `adm=${on ? '1' : ''}; ${parts.join('; ')}`);
}

function readJson(req) {
  return new Promise((resolve) => {
    if (req.body != null) return resolve(req.body); // @vercel/node kadang sudah parse
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
    if (req.method !== 'POST') {
      if (req.method === 'GET' && req.url && req.url.includes('/api/appscript')) {
        return send(res, 200, { ok: true, msg: 'Use POST with JSON body {action, payload}' });
      }
      return send(res, 405, { ok:false, error:'Method Not Allowed' });
    }

    const body    = await readJson(req);
    const action  = body?.action;
    const payload = body?.payload;
    if (!action) return send(res, 400, { ok:false, error:'Missing action' });

    // ===== DIAG =====
    if (action === 'diag') {
      const cookies = parseCookies(req.headers.cookie || '');
      return send(res, 200, {
        ok: true,
        env: process.env.VERCEL_ENV || 'unknown',
        hasAdminPass: Boolean(process.env.ADMIN_PASSCODE),
        hasAppsUrl: Boolean(process.env.APPS_SCRIPT_URL),
        hasAppsSecret: Boolean(process.env.APPS_SCRIPT_SECRET),
        isAdmin: cookies['adm'] === '1'
      });
    }

    // ===== LOGIN / LOGOUT =====
    if (action === 'adminLogin') {
      const pass   = String(payload?.pass || '');
      const secret = process.env.ADMIN_PASSCODE || '';
      if (!secret)            return send(res, 500, { ok:false, error:'ADMIN_PASSCODE not set' });
      if (pass !== secret)    return send(res, 401, { ok:false, error:'Invalid passcode' });
      setAuthCookie(req, res, true);
      return send(res, 200, { ok:true });
    }
    if (action === 'adminLogout') {
      setAuthCookie(req, res, false);
      return send(res, 200, { ok:true });
    }

    // ===== PROXY KE APPS SCRIPT =====
    const url = process.env.APPS_SCRIPT_URL;
    if (!url) return send(res, 500, { ok:false, error:'APPS_SCRIPT_URL not set' });

    // Wajib cookie untuk aksi terproteksi
    const cookies = parseCookies(req.headers.cookie || '');
    if (PROTECTED_ACTIONS.has(action) && cookies['adm'] !== '1') {
      return send(res, 401, { ok:false, error:'Unauthorized' });
    }

    // Selalu sertakan secret untuk SEMUA action (karena Apps Script saat ini mengecek req.secret)
    const appsSecret = process.env.APPS_SCRIPT_SECRET;
    if (!appsSecret) return send(res, 500, { ok:false, error:'APPS_SCRIPT_SECRET not set' });

    const forward = { action, payload, secret: appsSecret };

    let fr;
    try {
      fr = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(forward)
      });
    } catch (e) {
      return send(res, 502, { ok:false, error:`Fetch to Apps Script failed: ${e?.message || e}` });
    }

    const text = await fr.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return send(res, fr.status || 500, { ok:false, error: text || 'Apps Script returned non-JSON' });
    }

    if (!fr.ok || data?.ok === false) {
      return send(res, fr.status || 500, { ok:false, error: data?.error || 'Proxy error' });
    }
    return send(res, 200, data);

  } catch (e) {
    return send(res, 500, { ok:false, error: e?.message || String(e) });
  }
}
