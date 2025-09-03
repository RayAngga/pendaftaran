/** ====== KONFIG ====== */
const SECRET = '56a257152fcd9fa3b56ebe928a24fc79d76d98e3f552560ee7a800dbfd42fc71';
const SHEET_NAME = 'pendaftaran maba';
const PROOF_FOLDER = 'bukti';

/** ====== HTTP HANDLER ====== */
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    if (req.secret !== SECRET) return jsonOut({ ok: false, error: 'unauthorized' });

    const action = req.action || '';
    const p = req.payload || {};
    const map = {
      register:     () => actionRegister(p),
      findByWA:     () => actionFindByWA(p),
      getTicket:    () => actionGetTicket(p),
      submitProof:  () => actionSubmitProof(p),
      list:         () => actionList(),
      togglePaid:   () => actionToggle(p, 'paid'),
      toggleAttend: () => actionToggle(p, 'attended'),
      delete:       () => actionDelete(p),
      info:         () => actionInfo(),
    };
    if (!map[action]) return jsonOut({ ok: false, error: 'unknown action' });
    return jsonOut(map[action]());
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}
function jsonOut(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/** ====== SHEET HELPERS ====== */
const HEADERS = ['id','createdAt','nama','fakultas','prodi','wa','makanan','domisili','paid','attended','code','proofUrl'];

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  const firstRow = sh.getRange(1,1,1,HEADERS.length).getValues()[0];
  const need = HEADERS.some((h,i)=> firstRow[i] !== h);
  if (need) { sh.clear(); sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]); sh.setFrozenRows(1); }
  return sh;
}
function nowStr() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function toObj(row) { const o={}; HEADERS.forEach((h,i)=> o[h]=row[i]); o.paid=Number(o.paid||0); o.attended=Number(o.attended||0); return o; }
function toRow(o) { return [ o.id||'', o.createdAt||nowStr(), o.nama||'', o.fakultas||'', o.prodi||'', o.wa||'', o.makanan||'', o.domisili||'', Number(o.paid||0), Number(o.attended||0), o.code||'', o.proofUrl||'' ]; }
function readAll() { const sh=getSheet(); const last=sh.getLastRow(); if(last<2) return []; const rows=sh.getRange(2,1,last-1,HEADERS.length).getValues().map(toObj); return rows.map((r,i)=>({...r,_row:i+2})); }
function writeRow(rowIndex, obj) { const sh=getSheet(); sh.getRange(rowIndex,1,1,HEADERS.length).setValues([toRow(obj)]); }

/** ====== NORMALISASI ====== */
function normWa(s) { s=String(s||'').trim().replace(/[^\d]/g,''); if(!s) return ''; if(s.startsWith('62')) s='0'+s.slice(2); return s; }

/** ====== ACTIONS ====== */
function actionList() { return { ok:true, rows: readAll() }; }
function actionRegister(p) {
  if (!p || !p.nama || !p.wa) return { ok:false, error:'nama & wa wajib' };
  const lock = LockService.getScriptLock(); lock.waitLock(5000);
  try {
    const rows = readAll(); const waNorm = normWa(p.wa);
    const exists = rows.find(r => normWa(r.wa) === waNorm);
    if (exists) return { ok:false, error:'duplicate-wa', rec: exists };
    const sh = getSheet();
    const id = 'id-' + Utilities.getUuid();
    const rec = { id, createdAt: nowStr(), nama:String(p.nama||'').trim(), fakultas:String(p.fakultas||'').trim(), prodi:String(p.prodi||'').trim(), wa: waNorm, makanan:String(p.makanan||'').trim(), domisili:String(p.domisili||'').trim(), paid:0, attended:0, code:'', proofUrl:'' };
    sh.appendRow(toRow(rec)); return { ok:true, id, rec };
  } finally { try{ lock.releaseLock(); }catch(e){} }
}
function actionFindByWA(p) { const wa=normWa((p&&p.wa)||''); const rows=readAll(); const rec=rows.find(r=> normWa(r.wa)===wa); return { ok:true, rec: rec||null }; }
function actionGetTicket(p) {
  const q=String((p&&p.q)||'').trim(); const rows=readAll(); let rec=null;
  if (/^RMPMABA-/i.test(q)) { const qc=q.toUpperCase(); rec = rows.find(r => String(r.code||'').toUpperCase()===qc); }
  else { const wa=normWa(q); rec = rows.find(r => normWa(r.wa)===wa) || rows.find(r => String(r.code||'').toUpperCase()===q.toUpperCase()); }
  return { ok:true, rec: rec||null };
}
function actionSubmitProof(p) {
  if (!p || !p.dataUrl) return { ok:false, error:'missing proof' };
  const rows=readAll(); const pid=String(p.id||''); const pidNorm=normWa(pid); const pidCode=pid.toUpperCase();
  let rec = rows.find(r => r.id===pid || String(r.code||'').toUpperCase()===pidCode || normWa(r.wa)===pidNorm);
  if (!rec) return { ok:false, error:'record not found' };
  const fileNameBase=(rec.nama||'bukti')+'_'+Date.now(); const proofUrl=saveDataUrlToDrive(p.dataUrl, fileNameBase);
  if (!rec.code) rec.code = genCode(); rec.paid=1; rec.proofUrl=proofUrl; writeRow(rec._row, rec);
  return { ok:true, id: rec.id, code: rec.code, proofUrl };
}
function actionToggle(p, field){ if(!p||!p.id) return { ok:false, error:'missing id' }; const rows=readAll(); const rec=rows.find(r=>r.id===p.id); if(!rec) return { ok:false, error:'not found' }; rec[field]=Number(rec[field])?0:1; writeRow(rec._row, rec); return { ok:true, id: rec.id, [field]: rec[field] }; }
function actionDelete(p){ if(!p||!p.id) return { ok:false, error:'missing id' }; const sh=getSheet(); const rows=readAll(); const rec=rows.find(r=>r.id===p.id); if(!rec) return { ok:false, error:'not found' }; sh.deleteRow(rec._row); return { ok:true }; }
function actionInfo(){ const ss=SpreadsheetApp.getActiveSpreadsheet(); const sh=getSheet(); const rows=readAll(); return { ok:true, spreadsheetUrl:ss.getUrl(), sheetName:sh.getName(), rowCount:rows.length, sample:rows.slice(0,5) }; }

/** ====== UTIL ====== */
function genCode(){ const rows=readAll(); let code; do { const p=Math.random().toString(36).slice(2,6).toUpperCase(); const t=Date.now().toString().slice(-5); code=`RMPMABA-${p}${t}`; } while (rows.some(r => String(r.code||'')===code)); return code; }
function saveDataUrlToDrive(dataUrl, fileNameBase){ const m=String(dataUrl).match(/^data:([^;]+);base64,(.+)$/); if(!m) throw new Error('invalid dataUrl'); const mime=m[1]; const bytes=Utilities.base64Decode(m[2]); const ext=extFromMime(mime); const fileName=fileNameBase+ext; const blob=Utilities.newBlob(bytes, mime, fileName); const folder=getOrCreateFolder(PROOF_FOLDER); const file=folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); return file.getUrl(); }
function extFromMime(mime){ if(/png/i.test(mime)) return '.png'; if(/jpe?g/i.test(mime)) return '.jpg'; if(/pdf/i.test(mime)) return '.pdf'; return ''; }
function getOrCreateFolder(name){ const it=DriveApp.getFoldersByName(name); return it.hasNext()?it.next():DriveApp.createFolder(name); }
