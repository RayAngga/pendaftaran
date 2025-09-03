// /api/appscript.js — Vercel Serverless Function (Node.js)
// ENV on Vercel:
// - ADMIN_PASSCODE="your-secret"
// - APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfyc.../exec"

const fetch = globalThis.fetch; // Node 18+ on Vercel

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
  const attrs = [
    'Path=/',
    on ? 'Max-Age=259200' : 'Max-Age=0', // 3 hari / hapus
    'HttpOnly',
    'SameSite=Lax',
    isHttps ? 'Secure' : ''              // jangan Secure saat localhost (http)
  ].filter(Boolean).join('; ');
  const val = on ? '1' : '';
  res.setHeader('Set-Cookie', `adm=${encodeURIComponent(val)}; ${attrs}`);
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }

    // pastikan Vercel parse JSON body
    const { action, payload } = req.body || {};
    if (!action) return res.status(400).json({ ok: false, error: 'Missing action' });

    // ===== LOGIN =====
    if (action === 'adminLogin') {
      const pass = String(payload?.pass || '');
      const secret = process.env.ADMIN_PASSCODE || '';
      if (!secret) return res.status(500).json({ ok: false, error: 'ADMIN_PASSCODE not set' });
      if (pass !== secret) return res.status(401).json({ ok: false, error: 'Invalid passcode' });
      setAuthCookie(req, res, true);
      return res.status(200).json({ ok: true });
    }

    // ===== LOGOUT (opsional, tapi bagus ada) =====
    if (action === 'adminLogout') {
      setAuthCookie(req, res, false);
      return res.status(200).json({ ok: true });
    }

    // ===== PROXY KE APPS SCRIPT =====
    const url = process.env.APPS_SCRIPT_URL;
    if (!url) return res.status(500).json({ ok: false, error: 'APPS_SCRIPT_URL not set' });

    // wajib login untuk aksi tertentu
    const needsAuth = ['list', 'delete', 'togglePaid', 'toggleAttend'];
    const hasAdm = parseCookies(req.headers.cookie || '')['adm'] === '1';
    if (needsAuth.includes(action) && !hasAdm) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    let fr;
    try {
      fr = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
    } catch (netErr) {
      // jaringan/URL salah → balas JSON, bukan meledak
      return res.status(502).json({ ok: false, error: `Fetch to Apps Script failed: ${netErr.message}` });
    }

    const text = await fr.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Apps Script balas HTML/error → kirim balik sebagai error JSON
      return res.status(fr.status || 500).json({ ok: false, error: text || 'Apps Script returned non-JSON' });
    }

    if (!fr.ok || data?.ok === false) {
      return res.status(fr.status || 500).json({ ok: false, error: data?.error || 'Proxy error' });
    }
    return res.status(200).json(data);

  } catch (e) {
    // jangan biarkan throw bocor ke Vercel HTML
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};
