/* Progress backup and restore. A backup is a small JSON file the student keeps; nothing is uploaded anywhere.
   Imported files are treated as untrusted: every field is checked, unknown fields are dropped, and the progress
   that is kept is rebuilt from scratch, so nothing in the file is ever run or inserted as HTML.
   Restoring always copies the current progress first, so the restore can be undone. */
(function () {
  "use strict";
  const SS = window.SS;
  const MAX_BYTES = 2 * 1024 * 1024, MAX_Q = 5000, MAX_RT = 1000, MAX_U = 500, MAX_CYCLE = 1000, MAX_SESS = 50;
  const QID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
  const UKEY = /^[a-z0-9][a-z0-9-]{0,59}\/[a-z0-9][a-z0-9-]{0,39}$/;
  const BAD = new Set(["__proto__", "constructor", "prototype", "toString", "valueOf", "hasOwnProperty"]);
  const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
  const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
  const time = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x < 1e14;
  const bit = (x) => x === 0 || x === 1;
  const okId = (k) => typeof k === "string" && QID.test(k) && !BAD.has(k);
  const okKey = (k) => typeof k === "string" && UKEY.test(k);
  const str = (x, max) => typeof x === "string" && x.length <= max;

  function exportObj() {
    const P = SS.store.P;
    return { app: "StudySprint", format: 1, exportedAt: new Date().toISOString(),
      note: "Progress backup from StudySprint. It holds your answers' results only. Restore it from the My data page.",
      progress: { q: P.q, u: P.u, sess: P.sess } };
  }
  const exportText = () => JSON.stringify(exportObj(), null, 1);
  const fileName = () => "studysprint-progress-" + new Date().toISOString().slice(0, 10) + ".json";

  function cleanQ(k, r) {
    if (!okId(k)) return "a question id is not valid";
    if (!isObj(r) || !bit(r.f)) return "a first-attempt result is not 0 or 1";
    if (!Array.isArray(r.rt) || r.rt.length > MAX_RT || !r.rt.every(bit)) return "a retry list is not valid";
    if (r.t !== undefined && !time(r.t)) return "a time stamp is not valid";
    return { f: r.f, rt: r.rt.slice(), t: r.t || 0 };
  }
  function cleanU(k, r) {
    if (!okKey(k)) return "a unit key is not valid";
    if (!isObj(r)) return "a unit record is not valid";
    if (!int(r.level, 0, 2) || !int(r.streak, 0, 1000) || !int(r.wrong, 0, 1000)) return "a unit level or streak is not valid";
    if (!Array.isArray(r.pref) || r.pref.length !== 2 || !int(r.pref[0], 0, 2) || !int(r.pref[1], 0, 2) || r.pref[0] > r.pref[1]) return "a difficulty range is not valid";
    if (!Array.isArray(r.cycle) || r.cycle.length > MAX_CYCLE || !r.cycle.every(okId)) return "a list of seen questions is not valid";
    const o = { level: r.level, streak: r.streak, wrong: r.wrong, pref: [r.pref[0], r.pref[1]], cycle: r.cycle.slice() };
    if (r.conf !== undefined) {
      if (!isObj(r.conf) || !int(r.conf.value, 1, 5) || !time(r.conf.t)) return "a confidence rating is not valid";
      o.conf = { value: r.conf.value, t: r.conf.t };
    }
    if (r.warmup !== undefined) {
      const w = r.warmup;
      if (!isObj(w) || !int(w.total, 0, 10) || !int(w.correct, 0, w.total) || !(w.conf === null || int(w.conf, 1, 5)) || !time(w.t)) return "a warm-up result is not valid";
      o.warmup = { correct: w.correct, total: w.total, conf: w.conf, t: w.t };
    }
    return o;
  }
  function cleanS(s) {
    if (!isObj(s)) return "a study session is not valid";
    if (!time(s.id) || !time(s.t) || !okKey(s.unitKey) || !str(s.unitTitle, 200)) return "a study session's date or unit is not valid";
    if (!int(s.minutes, 1, 600) || !int(s.stepsDone, 0, 20) || (s.stepsTotal !== undefined && !int(s.stepsTotal, 1, 20))) return "a study session's steps are not valid";
    if (!int(s.distinct, 0, 1000) || !int(s.first, 0, 1000) || !int(s.firstOk, 0, s.first) || !int(s.retries, 0, 1000) || !int(s.retryOk, 0, s.retries) || typeof s.met !== "boolean") return "a study session's results are not valid";
    const o = { id: s.id, t: s.t, unitKey: s.unitKey, unitTitle: s.unitTitle, minutes: s.minutes, stepsDone: s.stepsDone, distinct: s.distinct, first: s.first, firstOk: s.firstOk, retries: s.retries, retryOk: s.retryOk, met: s.met };
    if (s.stepsTotal !== undefined) o.stepsTotal = s.stepsTotal;
    return o;
  }

  /* Returns { ok:true, clean, skipped, reasons, exportedAt } or { ok:false, errors:[...] }. */
  function validate(obj) {
    if (!isObj(obj)) return { ok: false, errors: ["The file does not contain a StudySprint backup."] };
    let prog, exportedAt = null;
    if (obj.app === "StudySprint") {
      if (obj.format !== 1) return { ok: false, errors: ["This backup was made by a newer or unknown version of StudySprint (format " + String(obj.format).slice(0, 10) + ")."] };
      prog = obj.progress;
      if (typeof obj.exportedAt === "string" && !isNaN(Date.parse(obj.exportedAt))) exportedAt = obj.exportedAt;
    } else if (obj.v === 3 && isObj(obj.q)) prog = obj; // raw saved progress copied from browser storage
    else return { ok: false, errors: ["The file does not look like a StudySprint backup."] };
    if (!isObj(prog)) return { ok: false, errors: ["The backup has no progress section."] };
    const q = prog.q === undefined ? {} : prog.q, u = prog.u === undefined ? {} : prog.u, sess = prog.sess === undefined ? [] : prog.sess;
    if (!isObj(q) || !isObj(u) || !Array.isArray(sess)) return { ok: false, errors: ["The backup's progress section is not in the expected shape."] };
    const qk = Object.keys(q), uk = Object.keys(u);
    if (qk.length > MAX_Q || uk.length > MAX_U || sess.length > MAX_SESS) return { ok: false, errors: ["The backup is larger than StudySprint allows."] };

    const clean = { q: {}, u: {}, sess: [] }, reasons = {};
    let skipped = 0;
    const skip = (why) => { skipped++; reasons[why] = (reasons[why] || 0) + 1; };
    qk.forEach((k) => { const r = cleanQ(k, q[k]); if (typeof r === "string") skip(r); else clean.q[k] = r; });
    uk.forEach((k) => { const r = cleanU(k, u[k]); if (typeof r === "string") skip(r); else clean.u[k] = r; });
    const seen = new Set();
    sess.forEach((s) => { const r = cleanS(s); if (typeof r === "string") skip(r); else if (seen.has(r.id)) skip("a study session appears twice"); else { seen.add(r.id); clean.sess.push(r); } });
    clean.sess.sort((a, b) => b.t - a.t);
    const n = Object.keys(clean.q).length + Object.keys(clean.u).length + clean.sess.length;
    if (!n) return { ok: false, errors: skipped ? ["None of the progress in the file could be used: " + Object.keys(reasons).slice(0, 3).join("; ") + "."] : ["The backup contains no progress."] };
    return { ok: true, clean, skipped, reasons: Object.keys(reasons).map((r) => r + (reasons[r] > 1 ? " (" + reasons[r] + " times)" : "")), exportedAt };
  }

  function parse(text) {
    if (typeof text !== "string" || !text.trim()) return { ok: false, errors: ["Nothing to check. Choose a backup file or paste its text."] };
    if (text.length > MAX_BYTES) return { ok: false, errors: ["The file is larger than 2 MB, so it is not a StudySprint backup."] };
    let obj;
    try { obj = JSON.parse(text); } catch (e) { return { ok: false, errors: ["The file is not valid JSON, so it cannot be read as a backup."] }; }
    return validate(obj);
  }

  /* Merge rules (the My data page explains these to students in the same terms):
     - A question on both sides keeps ONE whole record, never a mix: the one with more attempts (first try plus
       retries); with equal attempts, the one answered more recently; otherwise this device's.
     - A unit on both sides keeps this device's adaptive level, streak, difficulty range and seen-question list;
       only the confidence rating and the warm-up result are taken from the backup, and only when they are newer.
     - Questions, units and study sessions found only in the backup are added. A study session in both (same id)
       keeps this device's copy. The 50 most recent sessions are kept.
     - Unfinished practice sets and study sessions are never in a backup; a merge leaves this device's in place. */
  const attempts = (r) => 1 + r.rt.length;
  const backupQWins = (a, b) => !a || attempts(b) > attempts(a) || (attempts(b) === attempts(a) && (b.t || 0) > (a.t || 0));
  const newer = (a, b) => !!b && (!a || b.t > a.t);
  function merged(clean) {
    const P = SS.store.P, q = Object.assign({}, P.q), u = Object.assign({}, P.u);
    Object.keys(clean.q).forEach((k) => { if (backupQWins(q[k], clean.q[k])) q[k] = clean.q[k]; });
    Object.keys(clean.u).forEach((k) => {
      const a = u[k], b = clean.u[k];
      if (!a) { u[k] = b; return; }
      const m = Object.assign({}, a);
      if (newer(a.conf, b.conf)) m.conf = b.conf;
      if (newer(a.warmup, b.warmup)) m.warmup = b.warmup;
      u[k] = m;
    });
    const byId = new Map();
    P.sess.concat(clean.sess).forEach((s) => { if (!byId.has(s.id)) byId.set(s.id, s); });
    const sess = [...byId.values()].sort((a, b) => b.t - a.t).slice(0, MAX_SESS);
    return { q, u, sess };
  }
  // What a merge would do with progress that exists on both sides (read-only; uses the same rules as merged()).
  function overlap(clean) {
    const P = SS.store.P, o = { qBoth: 0, qFromBackup: 0, uBoth: 0, uConfOrWarmup: 0, sessBoth: 0 };
    Object.keys(clean.q).forEach((k) => { if (P.q[k]) { o.qBoth++; if (backupQWins(P.q[k], clean.q[k])) o.qFromBackup++; } });
    Object.keys(clean.u).forEach((k) => {
      const a = P.u[k], b = clean.u[k]; if (!a) return;
      o.uBoth++; if (newer(a.conf, b.conf) || newer(a.warmup, b.warmup)) o.uConfOrWarmup++;
    });
    const ids = new Set(P.sess.map((s) => s.id));
    clean.sess.forEach((s) => { if (ids.has(s.id)) o.sessBoth++; });
    return o;
  }

  function counts(p) {
    const units = new Set(Object.keys(p.u));
    p.sess.forEach((s) => units.add(s.unitKey));
    const courses = {};
    units.forEach((k) => { const c = k.split("/")[0]; courses[c] = (courses[c] || 0) + 1; });
    return { questions: Object.keys(p.q).length, units: units.size, sessions: p.sess.length, courses };
  }
  const localCounts = () => Object.assign(counts(SS.store.P), { runs: SS.store.runs().length });

  // mode: "merge" keeps everything on this device and adds the backup; "replace" swaps it in.
  function apply(clean, mode) {
    const S = SS.store, P = S.P;
    S.snapshot(mode === "replace" ? "Restore (replace)" : "Restore (merge)");
    const next = mode === "replace" ? { q: clean.q, u: clean.u, sess: clean.sess } : merged(clean);
    // An unfinished set refers to the old answers, so a full replacement drops it. A merge keeps it.
    S.replaceAll({ v: 3, q: next.q, u: next.u, sess: next.sess, ctx: P.ctx, runs: mode === "replace" ? {} : P.runs });
  }
  function clearAll() { const S = SS.store; S.snapshot("Clear all progress"); S.replaceAll(S.blank()); }

  SS.backup = { exportText, fileName, parse, validate, preview: (clean, mode) => counts(mode === "replace" ? clean : merged(clean)), overlap, counts, localCounts, apply, clearAll, MAX_BYTES };
})();
