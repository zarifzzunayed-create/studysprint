/* Rule-based question selection. No AI generation: every question comes from the unit's own bank.

   Rules (also shown to students in the interface):
   1. Start at "standard". While a student has fewer than 3 first attempts in a unit, about half of the
      questions are "introductory".
   2. Two correct FIRST attempts in a row move the adaptive level up one step. Two wrong first attempts in a row
      move it down one step. Retries never change the level.
   3. After a wrong first attempt the next question is a DIFFERENT question on the same concept, at the same or the
      next-lower level. The missed question goes to the review queue and returns later, after other questions.
   4. Questions are not repeated until the unit's pool (within the chosen topics) has been used.
   5. Topics with lower first-attempt accuracy or questions to review are chosen more often, but other topics are
      still mixed in.
   6. The student can set a preferred difficulty range. The adaptive level stays inside it, and the interface says so.
      A single set can use its own range (o.range) without changing the saved preference, as "easier practice" does.
   7. If no unused question exists at the wanted level, the nearest level is used and labelled as such. */
(function () {
  "use strict";
  const SS = window.SS;
  const MIN_DISTINCT = 8;
  const EVIDENCE_DEF =
    "Practice evidence is an estimate, not a measure of mastery. It uses only first attempts on different questions. " +
    "With fewer than " + MIN_DISTINCT + " such answers it says \"Not enough practice data yet\". With " + MIN_DISTINCT +
    " or more: 80% or higher first-attempt accuracy is \"Strong results so far\", 60% to 79% is \"Mixed results\", and below 60% is \"Needs more practice\". " +
    "Retries and repeated passes through the questions never raise the number.";

  const lv = (q) => SS.LV.indexOf(q.difficulty);
  const P = () => SS.store.P;

  function topicStats(unit) {
    const m = {};
    unit.topics.forEach((t) => (m[t.id] = { id: t.id, name: t.name, total: 0, n: 0, ok: 0, rev: 0, rt: 0, rc: 0 }));
    unit.questions.forEach((q) => {
      const t = m[q.topicId]; if (!t) return;
      t.total++;
      const r = P().q[q.id]; if (!r) return;
      t.n++; t.ok += r.f; t.rt += r.rt.length; t.rc += r.rt.reduce((a, b) => a + b, 0);
      if (SS.store.needs(q)) t.rev++;
    });
    return m;
  }
  function unitStats(unit) {
    const o = { total: unit.questions.length, n: 0, ok: 0, rt: 0, rc: 0, rev: 0 };
    Object.values(topicStats(unit)).forEach((t) => { o.n += t.n; o.ok += t.ok; o.rt += t.rt; o.rc += t.rc; o.rev += t.rev; });
    return o;
  }

  function evidence(unit) {
    const s = unitStats(unit);
    if (s.total < MIN_DISTINCT)
      return { code: "bank", label: "Not enough practice data yet", s,
        detail: "This unit has only " + s.total + " questions, fewer than the " + MIN_DISTINCT + " needed for a readiness estimate." };
    if (s.n < MIN_DISTINCT) {
      const need = MIN_DISTINCT - s.n;
      return { code: "few", label: "Not enough practice data yet", s,
        detail: "Answer " + SS.plural(need, "more different question") + " on a first attempt (" + s.n + " of " + MIN_DISTINCT + " so far)." };
    }
    const acc = s.ok / s.n;
    return { code: "est", s, label: acc >= 0.8 ? "Strong results so far" : acc >= 0.6 ? "Mixed results" : "Needs more practice",
      detail: "Based on " + s.n + " different questions: " + s.ok + " answered correctly on the first try (" + Math.round(acc * 100) + "%)." };
  }

  // Concept that most needs practice: most first-attempt misses and review items, else the least practiced.
  function weakest(unit, within) {
    const ts = Object.values(topicStats(unit)).filter((t) => t.total > 0 && (!within || within.includes(t.id)));
    if (!ts.length) return null;
    const score = (t) => (t.n ? t.n - t.ok + 1.5 * t.rev + (1 - t.ok / t.n) : 0);
    ts.sort((a, b) => score(b) - score(a) || a.n - b.n);
    return { topic: ts[0], kind: score(ts[0]) > 0 ? "most missed" : "least practiced" };
  }

  function rangeText(U, range) {
    const r = range || U.pref, a = SS.cap(SS.LV[r[0]]), b = SS.cap(SS.LV[r[1]]);
    return a === b ? a + " only" : a + " to " + b;
  }
  const levelName = (unit) => SS.cap(SS.LV[SS.store.unit(unit.key).level]);
  const levelLine = (unit, range) => "Adaptive level: " + levelName(unit) + ". " + (range ? "This easier set uses " + rangeText(null, range) + " questions; your saved range is unchanged." : "Your preferred range: " + rangeText(SS.store.unit(unit.key)) + ".");

  function target(U, unit, pref) {
    let L = U.level, early = false;
    if (unitStats(unit).n < 3) { early = true; L = SS.rand() < 0.5 ? 0 : 1; }
    const eff = Math.min(Math.max(L, pref[0]), pref[1]);
    return { level: eff, early, limited: !early && eff !== U.level };
  }

  // Pick candidates at the wanted level; otherwise the nearest level (inside the range first), and say so.
  function byLevel(cands, level, pref) {
    const order = [0, -1, 1, -2, 2];
    for (const inRange of [true, false]) {
      for (const d of order) {
        const L = level + d;
        if (L < 0 || L > 2) continue;
        if (inRange && (L < pref[0] || L > pref[1])) continue;
        const pool = cands.filter((q) => lv(q) === L);
        if (pool.length) return { pool, level: L, nearby: L !== level, outside: !inRange };
      }
    }
    return null;
  }

  function weightFor(q, ts, R) {
    const t = ts[q.topicId]; let w = 1;
    if (t) { w += t.n ? 2 * (1 - t.ok / t.n) : 0.5; w += 1.5 * t.rev; }
    if (q.topicId === R.lastTopic) w *= 0.35; else if (q.topicId === R.prevTopic) w *= 0.7;
    return w;
  }

  // A different question on the concept just missed, at the same or next-lower level.
  function followUp(unit, f) {
    const U = SS.store.unit(unit.key);
    const pool = unit.questions.filter((q) => q.topicId === f.topicId && q.id !== f.qid);
    if (!pool.length) return null;
    let c = pool.filter((q) => !P().q[q.id]);
    if (!c.length) c = pool.filter((q) => !U.cycle.includes(q.id));
    if (!c.length) c = pool;
    let chosen = null, L2 = null;
    for (const L of [f.level, f.level - 1, f.level + 1, f.level - 2, f.level + 2]) {
      const m = c.filter((q) => lv(q) === L);
      if (m.length) { chosen = m; L2 = L; break; }
    }
    if (!chosen) return null;
    const q = chosen[Math.floor(SS.rand() * chosen.length)];
    if (!U.cycle.includes(q.id)) U.cycle.push(q.id);
    SS.store.save();
    const tname = (unit.topics.find((t) => t.id === f.topicId) || {}).name || "this concept";
    const how = L2 === f.level ? "at the same level" : L2 === f.level - 1 ? "at the next-lower level" : "at a nearby level, because no unused question exists at the same or next-lower level";
    return { q, kind: "followup", level: L2, target: f.level,
      why: ["A different question on the concept you just missed (" + tname + "), " + how + "."] };
  }

  function dueRetry(all, R) {
    const recent = R.recent.slice(-3);
    const c = all.filter((q) => SS.store.needs(q) && !recent.includes(q.id));
    if (!c.length) return null;
    c.sort((a, b) => (P().q[a.id].t || 0) - (P().q[b.id].t || 0));
    return c[0];
  }

  // R is the runner's state. o: { topicIds, noRetry, range }.
  function pick(unit, R, o) {
    o = o || {};
    const U = SS.store.unit(unit.key);
    const all = o.topicIds ? unit.questions.filter((q) => o.topicIds.includes(q.topicId)) : unit.questions;
    if (!all.length) return null;

    if (R.followUp) { const f = R.followUp; R.followUp = null; const r = followUp(unit, f); if (r) return r; }

    if (!o.noRetry && R.sinceRetry >= 3) {
      const due = dueRetry(all, R);
      if (due) return { q: due, kind: "retry", level: lv(due), why: ["A question you missed earlier, brought back now that you have answered other questions."] };
    }

    let cyc = new Set(U.cycle), wrapped = false;
    let cand = all.filter((q) => !cyc.has(q.id) && q.id !== R.lastId);
    if (!cand.length) {
      const ids = new Set(all.map((q) => q.id));
      U.cycle = U.cycle.filter((id) => !ids.has(id)); cyc = new Set(U.cycle); wrapped = true;
      cand = all.filter((q) => q.id !== R.lastId);
      if (!cand.length) cand = all.slice();
    }
    const pref = o.range || U.pref;
    const tg = target(U, unit, pref);
    const sel = byLevel(cand, tg.level, pref) || { pool: cand, level: lv(cand[0]), nearby: true, outside: true };
    const ts = topicStats(unit);
    const q = SS.pickWeighted(sel.pool, (x) => weightFor(x, ts, R));
    U.cycle.push(q.id); SS.store.save();

    const why = [], t = ts[q.topicId];
    if (wrapped) why.push("You have seen every question available here, so this starts a new pass. Repeats are recorded as retries.");
    if (t) {
      if (t.rev > 0) why.push("Topic with a question to review: " + t.name + ".");
      else if (t.n >= 2 && t.ok / t.n < 0.6) why.push("Weaker topic so far: " + t.name + " (" + t.ok + " of " + t.n + " first attempts correct).");
      else if (t.n === 0) why.push("A topic you have not tried yet: " + t.name + ".");
      else why.push("Mixing in another topic: " + t.name + ".");
    }
    if (tg.early) why.push("Early in this unit, so practice mixes introductory and standard questions.");
    if (sel.nearby) why.push("No unused " + SS.LV[tg.level] + " questions remain" + (sel.outside ? " in your range" : "") + ", so this one is at a nearby level (" + SS.LV[sel.level] + ").");
    if (tg.limited) why.push((o.range ? "This easier set" : "Your preferred range") + " keeps the adaptive level (" + SS.LV[U.level] + ") at " + SS.LV[tg.level] + ".");
    return { q, kind: P().q[q.id] ? "repeat" : "new", level: lv(q), target: tg.level, why };
  }

  // Called after a FIRST attempt only. Returns a message when the adaptive level changed.
  function afterFirst(unit, q, ok) {
    const U = SS.store.unit(unit.key);
    let msg = null;
    if (ok) {
      U.streak++; U.wrong = 0;
      if (U.streak >= 2) {
        if (U.level < 2) { const from = U.level; U.level++; msg = "Adaptive level up: " + SS.LV[from] + " to " + SS.LV[U.level] + ", after two correct first attempts in a row."; }
        U.streak = 0;
      }
    } else {
      U.streak = 0; U.wrong++;
      if (U.wrong >= 2) {
        if (U.level > 0) { const from = U.level; U.level--; msg = "Adaptive level down: " + SS.LV[from] + " to " + SS.LV[U.level] + ", after two wrong first attempts in a row."; }
        U.wrong = 0;
      }
    }
    SS.store.save();
    return msg;
  }

  SS.adaptive = { MIN_DISTINCT, EVIDENCE_DEF, lv, topicStats, unitStats, evidence, weakest, rangeText, levelName, levelLine, pick, followUp, afterFirst };
})();
