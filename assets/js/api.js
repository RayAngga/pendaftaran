// assets/js/api.js
// Client API untuk berkomunikasi dengan Serverless Function /api/appscript
// - Selalu mengirim cookie (credentials:"include") agar adm=1 terkirim setelah login
// - Parsing aman: ambil text -> coba JSON; jika non-JSON beri pesan jelas
// - Timeout bawaan 15s (bisa diubah via argumen call(..., { timeout }))

const API_URL = "/api/appscript";
const DEFAULT_TIMEOUT = 15000; // 15s

function fail(msg, extra) {
  const err = new Error(msg);
  if (extra) Object.assign(err, extra);
  return err;
}

async function call(action, payload, opts = {}) {
  const { timeout = DEFAULT_TIMEOUT, signal } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);

  // Gabungkan signal eksternal (jika ada)
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  let r, text;
  try {
    r = await fetch(API_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Accept": "application/json"
      },
      credentials: "include",               // penting: kirim cookie adm=1 setelah login
      body: JSON.stringify({ action, payload }),
      signal: ctrl.signal
    });
    text = await r.text();
  } catch (e) {
    clearTimeout(timer);
    if (e?.name === "AbortError") {
      throw fail("Request timeout. Coba lagi.", { code: "TIMEOUT" });
    }
    throw fail(`Jaringan bermasalah: ${e?.message || e}`, { cause: e });
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    const hint = (text || "").slice(0, 200);
    throw fail(`Server returned non-JSON (${r.status} ${r.statusText}): ${hint}`, {
      responseRaw: text,
      status: r.status
    });
  }

  if (!r.ok || data?.ok === false) {
    const msg = data?.error || r.statusText || "Request failed";
    const err = fail(msg, { response: data, status: r.status });
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  adminLogin: (pass) => call("adminLogin", { pass }),
  adminLogout: () => call("adminLogout", {}),

  // Public/General
  register: (p) => call("register", p),
  findByWA: (wa) => call("findByWA", { wa }),
  getTicket: (q) => call("getTicket", { q }),
  submitProof: (id, dataUrl) => call("submitProof", { id, dataUrl }),

  // Admin-only (butuh cookie adm=1)
  list: () => call("list", {}),
  remove: (id) => call("delete", { id }),
  togglePaid: (id) => call("togglePaid", { id }),
  toggleAttend: (id) => call("toggleAttend", { id }),

  // Diagnostik (opsional): cek ENV & status login di serverless
  diag: () => call("diag", {})
};
