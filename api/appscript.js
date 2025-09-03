// /api/appscript.js — Vercel Serverless Function (Node.js, ESM)
// Fitur:
// - adminLogin/adminLogout (set/del cookie adm=1; HttpOnly; SameSite=Lax; Secure hanya di HTTPS)
// - Proteksi aksi admin (list/delete/togglePaid/toggleAttend) via cookie
// - Proxy ke Google Apps Script (APPS_SCRIPT_URL) dan SELALU balas JSON
// - Penanganan non-JSON dari Apps Script → dibungkus jadi error JSON
// - Action "diag" untuk cek env & status login (membantu debugging)
// - Response header no-cache untuk API

const fetchFn = globalThis.fetch;

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  // no-cache agar respons login/data tidak ter-cache
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
    isHttps ? 'Secure' : ''              // di localhost (http) jangan Secure
  ].filter(Boolean);
  res.setHeader('Set-Cookie', `adm=${on ? '1' : ''}; ${parts.join('; ')}`);
}

function readJson(req) {
  return new Promise((resolve) => {
    // @vercel/node sering sudah parse req.body; bila ada, gunakan langsung
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
    if (req.method !== 'POST') {
      // Sediakan diag GET ringan kalau perlu (opsional)
      if (req.method === 'GET' && req.url && req.url.includes('/api/appscript')) {
        return send(res, 200, { ok: true, msg: 'Use POST with JSON body {action, payload}' });
      }
      return send(res, 405, { ok:false, error:'Method Not Allowed' });
    }

    const body = await readJson(req);
    const action  = body?.action;
    const payload = body?.payload;
    if (!action) return send(res, 400, { ok:false, error:'Missing action' });

    // ===== DIAGNOSTIK (untuk cek env & status login) =====
    if (action === 'diag') {
      const cookies = parseCookies(req.headers.cookie || '');
      return send(res, 200, {
        ok: true,
        env: process.env.VERCEL_ENV || 'unknown',      // production | preview | development
        hasAdminPass: Boolean(process.env.ADMIN_PASSCODE),
        hasAppsUrl: Boolean(process.env.APPS_SCRIPT_URL),
        isAdmin: cookies['adm'] === '1'
      });
    }

    // ===== LOGIN =====
    if (action === 'adminLogin') {
      const pass = String(payload?.pass || '');
      const secret = process.env.ADMIN_PASSCODE || '';
      if (!secret) return send(res, 500, { ok:false, error:'ADMIN_PASSCODE not set' });
      if (pass !== secret) return send(res, 401, { ok:false, error:'Invalid passcode' });
      setAuthCookie(req, res, true);
      return send(res, 200, { ok:true });
    }

    // ===== LOGOUT =====
    if (action === 'adminLogout') {
      setAuthCookie(req, res, false);
      return send(res, 200, { ok:true });
    }

    // ===== PROXY KE APPS SCRIPT =====
    const url = process.env.APPS_SCRIPT_URL;
    if (!url) return send(res, 500, { ok:false, error:'APPS_SCRIPT_URL not set' });

    // Aksi yang butuh login admin
    const needsAuth = ['list', 'delete', 'togglePaid', 'toggleAttend'];
    const hasAdm = parseCookies(req.headers.cookie || '')['adm'] === '1';
    if (needsAuth.includes(action) && !hasAdm) {
      return send(res, 401, { ok:false, error:'Unauthorized' });
    }

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
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Jika GAS balas HTML/error bukan JSON
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
