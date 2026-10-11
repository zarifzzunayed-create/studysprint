/* Shows one question at a time and scores it. Used by the Practice view and by the planner's question steps.
   The answer and explanation appear only after the student submits.

   options:
     limit      stop after this many questions
     topicIds   only use questions from these concepts
     queue      explicit list of questions (used for "review missed questions")
     targets    list of {topicId, level, qid}: serve a DIFFERENT question per target (planner step 4)
     followUps  false to skip the follow-up rule after a wrong first attempt
     allowEnd   show an "End and see results" button
     range      [lowest, highest] difficulty for this set only (easier practice); the saved preference is unchanged
     queueWhy   text explaining why each queued question is shown (default: review of a missed question)
     onAnswer   called with {qid, topicId, level, first, ok}
     onStruggle called when the student opens learning resources after two wrong FIRST attempts in a row
     onEnd      called with a summary when the run is over
     onChange   called with serialize() after a question is shown, after it is answered, and at the end, so the
                caller can save an unfinished set; resume(saved) continues it after a page refresh */
(function () {
  "use strict";
  const SS = window.SS, h = SS.h;
  let seq = 0;

  SS.runner = function (host, unit, o) {
    o = o || {};
    const A = SS.adaptive, S = SS.store;
    const R = {
      answered: [], count: 0, lastId: null, lastTopic: null, prevTopic: null, sinceRetry: 0, followUp: null, recent: [],
      queue: o.queue ? o.queue.slice() : null, targets: (o.targets || []).slice(), done: false, wrongRun: 0,
    };
    const topicName = (q) => (unit.topics.find((t) => t.id === q.topicId) || {}).name || "";
    let cur = null, stage = "new";
    const answerText = (q) => (q.type === "multiple-choice" ? "ABCD"[q.correctAnswer] + ". " + q.choices[q.correctAnswer] : q.correctAnswer + " " + q.answerUnit);

    function summary() {
      const firsts = R.answered.filter((a) => a.first), rets = R.answered.filter((a) => !a.first), misses = {};
      firsts.filter((a) => !a.ok).forEach((a) => (misses[a.topicId] = (misses[a.topicId] || 0) + 1));
      return { distinct: new Set(R.answered.map((a) => a.qid)).size, first: firsts.length, firstOk: firsts.filter((a) => a.ok).length,
        retries: rets.length, retryOk: rets.filter((a) => a.ok).length, misses, answered: R.answered.slice() };
    }
    function end() { if (R.done) return; R.done = true; stage = "ended"; changed(); if (o.onEnd) o.onEnd(summary()); }

    // Plain data only (question ids, never question objects), so it can be saved as JSON.
    function serialize() {
      return { v: 1, stage, cur: stage === "asking" && cur ? cur : null,
        R: { answered: R.answered.slice(), count: R.count, lastId: R.lastId, lastTopic: R.lastTopic, prevTopic: R.prevTopic,
          sinceRetry: R.sinceRetry, followUp: R.followUp, recent: R.recent.slice(-10), queue: R.queue ? R.queue.map((q) => q.id) : null,
          targets: R.targets.slice(), wrongRun: R.wrongRun } };
    }
    function changed() { if (o.onChange) o.onChange(serialize()); }
    const byId = (id) => unit.questions.find((q) => q.id === id);
    // Continue a saved set: the same unanswered question is shown again; after an answered one, the next question comes.
    function resume(s) {
      const x = s && s.R;
      if (!x || !Array.isArray(x.answered)) return next();
      const n = (v, d) => (Number.isInteger(v) && v >= 0 ? v : d);
      R.answered = x.answered.filter((a) => a && byId(a.qid));
      R.count = n(x.count, R.answered.length); R.sinceRetry = n(x.sinceRetry, 0); R.wrongRun = n(x.wrongRun, 0);
      R.lastId = x.lastId || null; R.lastTopic = x.lastTopic || null; R.prevTopic = x.prevTopic || null;
      R.followUp = x.followUp && byId(x.followUp.qid) ? x.followUp : null;
      R.recent = Array.isArray(x.recent) ? x.recent.filter(byId) : [];
      if (R.queue || Array.isArray(x.queue)) R.queue = (x.queue || []).map(byId).filter(Boolean);
      R.targets = Array.isArray(x.targets) ? x.targets.filter((t) => t && byId(t.qid)) : [];
      if (s.stage === "ended") return end();
      const c = s.stage === "asking" && s.cur && byId(s.cur.qid);
      if (c) { R.count = Math.max(0, R.count - 1); return draw({ q: c, kind: s.cur.kind, level: s.cur.level, why: Array.isArray(s.cur.why) ? s.cur.why : [] }); }
      next();
    }

    function next() {
      if (R.done) return;
      if (o.limit && R.count >= o.limit) return end();
      let p = null;
      if (R.targets.length) {
        const t = R.targets.shift();
        p = A.followUp(unit, t);
        if (!p) {
          const q = unit.questions.find((x) => x.id === t.qid);
          if (q) p = { q, kind: "retry", level: A.lv(q), why: ["No other unused question covers this concept, so you are retrying the one you missed."] };
        }
        if (p) R.sinceRetry = 0;
      } else if (R.queue) {
        const q = R.queue.shift();
        if (q) { p = { q, kind: o.queueWhy ? "queued" : "retry", level: A.lv(q), why: [o.queueWhy || "A question you missed earlier, brought back for review."] }; R.sinceRetry = 0; }
      } else p = A.pick(unit, R, o);
      if (!p) return end();
      draw(p);
    }

    function draw(p) {
      const q = p.q, first = !S.P.q[q.id], id = "q" + ++seq;
      R.count++;
      cur = { qid: q.id, kind: p.kind, level: p.level, why: p.why.slice() }; stage = "asking";
      const head = h("p", "eyebrow", "Question " + R.count + (o.limit ? " of " + o.limit : "") + " · " + topicName(q));
      const chips = h("p", null,
        h("span", "chip", SS.cap(SS.LV[A.lv(q)])),
        h("span", "chip" + (first ? " ok" : ""), first ? "First attempt" : "Retry (you have answered this before)"),
        q.type === "numeric" ? h("span", "chip", "Numeric answer") : null);
      const form = h("form"), fs = h("fieldset", null, h("legend", null, q.prompt)), err = h("p", "form-message");
      form.noValidate = true; err.id = id + "-err"; err.setAttribute("role", "alert");
      form.setAttribute("aria-label", "Question " + R.count);
      if (q.type === "multiple-choice") {
        q.choices.forEach((c, i) => {
          const lab = h("label", "choice"), r = h("input");
          r.type = "radio"; r.name = id + "-ans"; r.value = String(i); r.className = "ans";
          lab.append(r, h("span", null, "ABCD"[i] + ". " + c)); fs.append(lab);
        });
        fs.setAttribute("aria-describedby", err.id);
      } else {
        const lab = h("label", null, "Your answer (" + q.answerUnit + ")"), inp = h("input");
        inp.id = id + "-num"; inp.className = "q-num"; inp.type = "text"; inp.inputMode = "decimal"; inp.autocomplete = "off"; lab.htmlFor = inp.id;
        inp.setAttribute("aria-describedby", err.id); fs.append(lab, inp);
      }
      const sub = h("button", "button button-primary", "Submit answer"); sub.type = "submit";
      const row = h("div", "fb-actions", sub);
      if (o.allowEnd) row.append(SS.btn("End and see results", "button-secondary", end));
      form.append(fs, err, row);
      host.replaceChildren(head, chips, h("p", "why", p.why.join(" ")), h("p", "why", A.levelLine(unit, o.range)), form);
      form.onsubmit = (e) => { e.preventDefault(); submit(q, p, form, err, sub, row); };
      const lg = fs.firstChild; lg.tabIndex = -1; lg.focus({ preventScroll: true });
      changed();
    }

    function submit(q, p, form, err, sub, row) {
      let ok, given, val;
      const fs = form.querySelector("fieldset");
      const invalid = (text, el, target) => { err.textContent = text; el.setAttribute("aria-invalid", "true"); target.focus(); };
      if (q.type === "multiple-choice") {
        const c = form.querySelector("input.ans:checked");
        if (!c) return invalid("Choose an answer before submitting.", fs, form.querySelector("input.ans"));
        given = +c.value; ok = given === q.correctAnswer;
      } else {
        const box = form.querySelector(".q-num");
        const raw = box.value.replace(/\u2212/g, "-").trim();
        val = raw === "" ? NaN : Number(raw);
        if (!Number.isFinite(val)) return invalid("Enter a number, for example 12.5.", box, box);
        ok = Math.abs(val - q.correctAnswer) <= q.tolerance * Math.abs(q.correctAnswer);
      }
      err.textContent = ""; form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
      const first = S.record(q, ok);
      let levelMsg = null;
      let struggle = false;
      if (first) {
        // Two wrong FIRST attempts in a row (whatever the confidence rating) offers learning resources.
        R.wrongRun = ok ? 0 : R.wrongRun + 1;
        if (R.wrongRun >= 2 && o.onStruggle) { struggle = true; R.wrongRun = 0; }
        levelMsg = A.afterFirst(unit, q, ok);
        if (!ok && o.followUps !== false && !R.queue && !o.targets) R.followUp = { topicId: q.topicId, level: A.lv(q), qid: q.id };
      }
      R.prevTopic = R.lastTopic; R.lastTopic = q.topicId; R.lastId = q.id; R.recent.push(q.id);
      if (p.kind === "retry") R.sinceRetry = 0; else R.sinceRetry++;
      const entry = { qid: q.id, topicId: q.topicId, level: A.lv(q), first, ok };
      R.answered.push(entry);
      if (o.onAnswer) o.onAnswer(entry);

      form.querySelectorAll("input").forEach((x) => (x.disabled = true));
      sub.hidden = true;
      form.querySelectorAll(".choice").forEach((l, i) => { if (i === given) l.classList.add("mine"); });

      stage = "answered";
      const fb = h("div", "fb" + (ok ? "" : " bad"), h("h3", null, h("span", null, ok ? "✓ " : "✗ "), ok ? "Correct" : "Not quite"),
        h("p", null, first ? "First attempt: this counts toward your first-attempt score." : "Retry: recorded separately, so your first-attempt score does not change."));
      if (q.type === "numeric") fb.append(h("p", null, "Correct answer: " + answerText(q) + " (answers within " + Math.round(q.tolerance * 100) + "% are accepted). You entered " + val + "."));
      else if (!ok) fb.append(h("p", null, "The correct answer is " + answerText(q) + "."));
      fb.append(h("p", null, q.explanation));
      if (q.type === "multiple-choice") {
        fb.append(h("p", null, h("b", null, "Why each choice:")),
          h("ul", null, q.choices.map((c, i) => h("li", null, "ABCD"[i] + (i === given ? " (your answer)" : "") + ": " + (i === q.correctAnswer ? "Correct answer." : "Not correct. " + q.choiceExplanations[i])))));
      }
      if (levelMsg) fb.append(h("p", "notice", levelMsg));
      if (struggle) {
        fb.append(h("div", "learn-offer", h("p", null, h("b", null, "Two first attempts in a row were missed. "),
          "That is normal when a topic is new. Learning resources for this unit can help before you continue. Your place here is kept."),
          SS.btn("Open learning resources", "button-secondary", () => o.onStruggle({ reason: "struggle" }))));
      }
      if (!ok) {
        if (R.followUp) fb.append(h("p", null, "Because this was a wrong first attempt, the next question will be a different one on the same concept, at the same or next-lower level. This question is saved in your review queue and comes back later."));
        else fb.append(h("p", null, "This question is saved in your review queue so you can retry it later."));
      }
      const last = (o.limit && R.count >= o.limit) || (R.queue && !R.queue.length) || (R.targets.length === 0 && o.targets);
      const actions = h("div", "fb-actions", SS.btn(last ? "Finish and see results" : "Next question", "button-primary", next));
      if (o.allowEnd && !last) actions.append(SS.btn("End and see results", "button-secondary", end));
      fb.append(actions);
      row.replaceChildren();
      form.append(fb);
      fb.firstChild.firstChild.setAttribute("aria-hidden", "true");
      fb.firstChild.tabIndex = -1; fb.firstChild.focus();
      changed();
    }

    return { start: next, end, summary, serialize, resume, state: R };
  };
})();
