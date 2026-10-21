/* Progress storage. Everything stays in this browser (localStorage); nothing is sent anywhere.
   Per question we keep: f = result of the FIRST attempt (1/0) and rt = results of later attempts (retries).
   Retries never change f, so they cannot inflate first-attempt accuracy.

   Saved shape (key "studysprint:v3"):
     { v: 3, q: { id: {f, rt[], t} }, u: { "course/unit": {level, streak, wrong, pref, cycle, conf?, warmup?, tests?} },
       ctx: {...last course, unit and view}, sess: [study sessions], runs: { "kind|course/unit": unfinished set } }
   tests (optional) holds the last submission of each practice test: { testId: {n, best, t, score, total, answered,
   firsts, firstOk, timed, limit, secs, auto, items: [{q, a}]} }. An unfinished test is a run ("test|course/unit").
   Progress saved by earlier versions ("studysprint:v2", or v3 without "runs" or "tests") is still read.
   Before a restore, a reset, or "clear all", the current progress is copied to "studysprint:v3:backup" so it can be undone. */
(function () {
  "use strict";
  const SS = window.SS;
  const KEY = "studysprint:v3", OLD = "studysprint:v2", SNAP = "studysprint:v3:backup";
  const MAX_SESS = 50, MAX_RUNS = 8;
  let P = null, memSnap = null;
  const st = { available: true, saveFailed: false };

  const blank = () => ({ v: 3, q: {}, u: {}, ctx: null, sess: [], runs: {} });
  const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);

  function probe() {
    try { const k = KEY + ":probe"; localStorage.setItem(k, "1"); localStorage.removeItem(k); st.available = true; }
    catch (e) { st.available = false; }
  }
  function fix(o) {
    o.q = isObj(o.q) ? o.q : {}; o.u = isObj(o.u) ? o.u : {};
    o.sess = Array.isArray(o.sess) ? o.sess : []; o.runs = isObj(o.runs) ? o.runs : {};
    if (!isObj(o.ctx)) o.ctx = null;
    return o;
  }
  function load() {
    P = null;
    try { P = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { P = null; }
    if (!P || P.v !== 3 || !isObj(P.q)) {
      P = blank();
      try { // carry over answers saved by the earlier version of the site
        const old = JSON.parse(localStorage.getItem(OLD) || "null");
        if (isObj(old)) for (const k in old) {
          const r = old[k];
          if (r && typeof r.f === "number" && Array.isArray(r.rt)) P.q[k] = { f: r.f, rt: r.rt.slice(), t: 0 };
        }
      } catch (e) { /* ignore */ }
    }
    fix(P);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(P)); st.saveFailed = false; }
    catch (e) { st.saveFailed = true; } // storage blocked or full: progress lives only in this tab until it can be saved
  }

  function snapshot(label) {
    const snap = { t: Date.now(), label: label || "", data: JSON.parse(JSON.stringify(P)) };
    memSnap = snap;
    try { localStorage.setItem(SNAP, JSON.stringify(snap)); } catch (e) { /* kept in memory for this tab */ }
  }
  function readSnap() {
    try { const s = JSON.parse(localStorage.getItem(SNAP) || "null"); if (s && isObj(s.data) && s.data.v === 3) return s; } catch (e) { /* ignore */ }
    return memSnap && isObj(memSnap.data) ? memSnap : null;
  }

  SS.store = {
    load, save, probe, blank,
    get P() { return P; },
    get available() { return st.available; },
    get saveFailed() { return st.saveFailed; },
    needs(q) { const r = P.q[q.id]; return !!r && r.f === 0 && r.rt[r.rt.length - 1] !== 1; },
    // Returns true when this was the question's first attempt.
    record(q, ok) {
      const r = P.q[q.id];
      let first = false;
      if (!r) { P.q[q.id] = { f: ok ? 1 : 0, rt: [], t: Date.now() }; first = true; }
      else { r.rt.push(ok ? 1 : 0); r.t = Date.now(); }
      save();
      return first;
    },
    unit(key) {
      if (!P.u[key]) P.u[key] = { level: 1, streak: 0, wrong: 0, pref: [0, 2], cycle: [] };
      return P.u[key];
    },
    setCtx(c) { P.ctx = Object.assign({}, P.ctx, c); save(); },
    upsertSession(id, s) {
      s.id = id;
      const i = P.sess.findIndex((x) => x.id === id);
      if (i >= 0) P.sess[i] = s; else P.sess.unshift(s);
      P.sess = P.sess.slice(0, MAX_SESS); save();
    },
    resetUnit(unit) {
      snapshot("Reset of " + unit.title);
      unit.questions.forEach((q) => delete P.q[q.id]); delete P.u[unit.key];
      P.sess = P.sess.filter((s) => s.unitKey !== unit.key);
      Object.keys(P.runs).forEach((k) => { if (P.runs[k].unitKey === unit.key) delete P.runs[k]; });
      save();
    },

    /* Unfinished practice sets and planner sessions, so they survive a page refresh. */
    setRun(key, r) {
      P.runs[key] = Object.assign({}, r, { key, updated: Date.now() });
      const keys = Object.keys(P.runs).sort((a, b) => P.runs[b].updated - P.runs[a].updated);
      keys.slice(MAX_RUNS).forEach((k) => delete P.runs[k]);
      save();
    },
    getRun(key) { const r = P.runs[key]; return r && isObj(r) ? r : null; },
    clearRun(key) { if (P.runs[key]) { delete P.runs[key]; save(); } },
    runs() { return Object.values(P.runs).filter(isObj).sort((a, b) => (b.updated || 0) - (a.updated || 0)); },

    /* Undo support for restore, reset and clear-all. */
    snapshot,
    lastSnapshot() { const s = readSnap(); return s ? { t: s.t, label: s.label } : null; },
    undo() {
      const s = readSnap(); if (!s) return false;
      P = fix(JSON.parse(JSON.stringify(s.data))); save();
      memSnap = null; try { localStorage.removeItem(SNAP); } catch (e) { /* ignore */ }
      return true;
    },
    replaceAll(o) { P = fix(o); P.v = 3; save(); },
  };
  probe();
  load();
})();
