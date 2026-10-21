/* Practice tests: a fixed set of a unit's own original questions, taken in a focused testing view.
   The test definitions live in each unit file ("tests"); tools/build.py checks that a test has enough questions, covers
   every topic and level, and shares no question with another test in the unit, so a second test is genuinely different.

   During a test: one question at a time, a progress bar, back/next, a question navigator, "mark for review", an optional
   countdown (practiceTests.minutesPerQuestion in data/catalog.json), and a review screen before a confirmed submit.
   Nothing is scored until the test is submitted: no answers, explanations, follow-ups or retries appear while it is open.

   On submit every answered question is recorded through the store exactly like practice: a question answered for the first
   time is a first attempt (and moves the adaptive level by the usual rule); one answered before is a retry. Unanswered
   questions are scored as incorrect in the test but are not recorded, so they can still get a real first attempt later.
   The last submission of each test is kept in the unit record (u[unit].tests[testId]) so its review can be reopened. */
(function () {
  "use strict";
  const SS = window.SS, h = SS.h;
  let seq = 0, ctl = null;

  const letter = (i) => "ABCD"[i];
  const parseNum = (raw) => { const t = String(raw == null ? "" : raw).replace(/−/g, "-").trim(); const v = t === "" ? NaN : Number(t); return Number.isFinite(v) ? v : null; };
  function answerText(q, a) {
    if (a === null || a === undefined) return "Not answered";
    return q.type === "multiple-choice" ? letter(a) + ". " + q.choices[a] : a + " " + q.answerUnit;
  }
  const correctText = (q) => (q.type === "multiple-choice" ? letter(q.correctAnswer) + ". " + q.choices[q.correctAnswer]
    : q.correctAnswer + " " + q.answerUnit + " (answers within " + Math.round(q.tolerance * 100) + "% are accepted)");
  const listText = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);

  // A saved unfinished test is used only if it still matches the test's questions.
  function fromSaved(s, test) {
    if (!s || s.v !== 1 || s.testId !== test.id || !Array.isArray(s.order)) return null;
    const ids = test.questionIds;
    if (s.order.length !== ids.length || !ids.every((id) => s.order.includes(id))) return null;
    const ans = {};
    if (s.ans && typeof s.ans === "object") ids.forEach((id) => { const a = s.ans[id]; if (Number.isInteger(a) || typeof a === "string") ans[id] = a; });
    const int = (x, lo, hi, d) => (Number.isInteger(x) && x >= lo && x <= hi ? x : d);
    const limit = int(s.limit, 0, 36000, 0);
    return { v: 1, testId: test.id, order: s.order.slice(), ans, marked: Array.isArray(s.marked) ? s.marked.filter((id) => ids.includes(id)) : [],
      idx: int(s.idx, 0, ids.length - 1, 0), screen: s.screen === "review" ? "review" : "q", timed: !!s.timed && limit > 0, limit,
      left: int(s.left, 0, limit, limit), hideClock: !!s.hideClock };
  }

  /* env: { unit, courseName, unitName, rules, announce(text), persist(state), clearRun(), exit(), submitted(test, record) }
     o:   { timed, saved } */
  function start(host, env, test, o) {
    if (ctl && !ctl.done) ctl.stop(true); // only one test is open at a time; an earlier one stays saved
    const unit = env.unit, S = SS.store, A = SS.adaptive;
    const byId = (id) => unit.questions.find((q) => q.id === id);
    const n = test.questionIds.length;
    let T = o.saved ? fromSaved(o.saved, test) : null;
    if (!T) {
      const limit = o.timed ? n * env.rules.minutesPerQuestion * 60 : 0;
      T = { v: 1, testId: test.id, order: SS.shuffle(test.questionIds.slice()), ans: {}, marked: [], idx: 0, screen: "q", timed: !!o.timed, limit, left: limit, hideClock: false };
    }
    let done = false, tick = null, endAt = 0, lastSave = 0, warned = T.left <= 300;

    const answered = (q) => (q.type === "multiple-choice" ? Number.isInteger(T.ans[q.id]) : parseNum(T.ans[q.id]) !== null);
    const isMarked = (id) => T.marked.includes(id);
    const save = () => { if (!done) env.persist(JSON.parse(JSON.stringify(T))); };

    /* ---------- clock (timed mode only). It pauses while the student is away from the test. ---------- */
    const clockRead = h("span", "test-clock-read"); clockRead.setAttribute("role", "timer");
    const clockBtn = SS.btn("", "button-secondary", () => { T.hideClock = !T.hideClock; drawClock(); save(); });
    function drawClock() {
      clockRead.textContent = T.hideClock ? "Timer hidden" : SS.fmtTime(T.left);
      clockBtn.textContent = T.hideClock ? "Show timer" : "Hide timer";
      clockBtn.setAttribute("aria-pressed", String(T.hideClock));
    }
    function step() {
      T.left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000)); drawClock();
      if (!warned && T.left <= 300 && T.limit > 300) { warned = true; env.announce("5 minutes left in this test."); }
      if (T.left === 0) { pause(); submit(true); return; }
      if (Date.now() - lastSave > 5000) { lastSave = Date.now(); save(); }
    }
    function run() { if (!T.timed || tick !== null || done) return; endAt = Date.now() + T.left * 1000; tick = setInterval(step, 250); }
    function pause() { if (tick !== null) { clearInterval(tick); tick = null; save(); } }

    /* ---------- the testing frame ---------- */
    const meterFill = h("span"), meter = h("div", "test-meter", meterFill);
    meter.setAttribute("role", "progressbar"); meter.setAttribute("aria-label", "Questions answered"); meter.setAttribute("aria-valuemin", "0"); meter.setAttribute("aria-valuemax", String(n));
    const status = h("p", "test-status"), body = h("div", "test-body");
    const back = SS.btn("← Back", "button-secondary", () => drawQuestion(T.idx - 1));
    const mark = SS.btn("", "button-secondary", () => {
      const id = T.order[T.idx];
      T.marked = isMarked(id) ? T.marked.filter((x) => x !== id) : T.marked.concat(id);
      update(); save(); env.announce(isMarked(id) ? "Marked for review." : "Review mark removed.");
    });
    const next = SS.btn("", "button-primary", () => (T.idx === n - 1 ? drawReview() : drawQuestion(T.idx + 1)));
    const navRow = h("div", "test-nav", back, mark, next);
    const grid = h("div", "test-grid");
    const gridNav = h("nav", "test-grid-nav", h("h3", null, "Questions"), h("p", "why", "Filled: answered. Flag: marked for review."), grid);
    gridNav.setAttribute("aria-label", "Questions in this test");
    const toReview = SS.btn("Review and submit", "button-primary", () => drawReview());
    const exit = SS.btn("Save and exit", "button-secondary", () => { pause(); save(); env.exit(); });
    host.replaceChildren(h("div", "panel test-shell",
      h("div", "test-bar",
        h("div", null, h("p", "eyebrow", env.courseName + " · " + env.unitName), h("h2", null, test.title + (T.timed ? " (timed)" : ""))),
        T.timed ? h("div", "test-clock", h("span", "why", "Time left"), clockRead, clockBtn) : h("p", "test-clock why", "Untimed")),
      meter, status, body, navRow, gridNav,
      h("div", "button-row", toReview, exit),
      h("p", "why", "Your answers are saved on this device as you go. The score, explanations, and missed-question retries appear after you submit." +
        (T.timed ? " The timer pauses if you leave this test or close the page." : ""))));
    if (T.timed) drawClock();

    function update() {
      const a = T.order.filter((id) => answered(byId(id))).length;
      meterFill.style.width = Math.round((100 * a) / n) + "%";
      meter.setAttribute("aria-valuenow", String(a)); meter.setAttribute("aria-valuetext", a + " of " + n + " answered");
      status.textContent = (T.screen === "review" ? "Review" : "Question " + (T.idx + 1) + " of " + n) + " · " + a + " of " + n + " answered" + (T.marked.length ? " · " + T.marked.length + " marked for review" : "");
      grid.replaceChildren(...T.order.map((id, i) => {
        const q = byId(id), st = (answered(q) ? "answered" : "not answered") + (isMarked(id) ? ", marked for review" : "");
        const b = h("button", "test-qbtn" + (answered(q) ? " done" : "") + (isMarked(id) ? " flag" : ""), String(i + 1));
        b.type = "button"; b.setAttribute("aria-label", "Question " + (i + 1) + ", " + st);
        if (T.screen === "q" && i === T.idx) b.setAttribute("aria-current", "step");
        b.onclick = () => drawQuestion(i);
        return b;
      }));
      const inQ = T.screen === "q";
      navRow.hidden = !inQ; toReview.hidden = !inQ;
      back.disabled = T.idx === 0;
      next.textContent = T.idx === n - 1 ? "Review and submit" : "Next →";
      const m = isMarked(T.order[T.idx]);
      mark.textContent = m ? "⚑ Marked for review" : "Mark for review"; mark.setAttribute("aria-pressed", String(m));
    }

    function drawQuestion(i) {
      if (i < 0 || i >= n || done) return;
      T.screen = "q"; T.idx = i;
      const q = byId(T.order[i]), id = "tq" + ++seq;
      const form = h("form"), fs = h("fieldset", null, h("legend", null, q.prompt));
      form.noValidate = true; form.onsubmit = (e) => e.preventDefault();
      form.setAttribute("aria-label", "Question " + (i + 1) + " of " + n);
      if (q.type === "multiple-choice") {
        q.choices.forEach((c, k) => {
          const r = h("input"); r.type = "radio"; r.name = id + "-ans"; r.value = String(k); r.className = "ans"; r.checked = T.ans[q.id] === k;
          r.onchange = () => { T.ans[q.id] = k; update(); save(); };
          fs.append(h("label", "choice", r, h("span", null, letter(k) + ". " + c)));
        });
      } else {
        const lab = h("label", null, "Your answer (" + q.answerUnit + ")"), inp = h("input"), msg = h("p", "form-message");
        inp.id = id + "-num"; inp.className = "q-num"; inp.type = "text"; inp.inputMode = "decimal"; inp.autocomplete = "off"; lab.htmlFor = inp.id;
        msg.id = id + "-msg"; msg.setAttribute("role", "alert"); inp.setAttribute("aria-describedby", msg.id);
        inp.value = typeof T.ans[q.id] === "string" ? T.ans[q.id] : "";
        inp.oninput = () => { T.ans[q.id] = inp.value; if (parseNum(inp.value) !== null) { msg.textContent = ""; inp.removeAttribute("aria-invalid"); } update(); save(); };
        inp.onblur = () => { if (inp.value.trim() && parseNum(inp.value) === null) { msg.textContent = "Enter a number, for example 12.5. Until then this question counts as unanswered."; inp.setAttribute("aria-invalid", "true"); } };
        fs.append(lab, inp, msg);
      }
      form.append(fs);
      body.replaceChildren(form);
      update(); save();
      const lg = fs.firstChild; lg.tabIndex = -1; lg.focus({ preventScroll: true });
    }

    function drawReview() {
      if (done) return;
      T.screen = "review";
      const un = T.order.filter((id) => !answered(byId(id)));
      const confirmBox = h("div");
      const submitBtn = SS.btn("Submit test", "button-primary", () => {
        confirmBox.replaceChildren(h("div", "notice",
          h("p", null, h("b", null, "Submit now? "), "You cannot change your answers after submitting." +
            (un.length ? " " + SS.plural(un.length, "unanswered question") + " will be scored as incorrect." : "")),
          h("div", "button-row", SS.btn("Yes, submit my test", "button-primary", () => submit(false)),
            SS.btn("Keep working", "button-secondary", () => { confirmBox.replaceChildren(); submitBtn.focus(); }))));
        confirmBox.querySelector("button").focus();
      });
      body.replaceChildren(h("h3", null, "Check your answers before you submit"),
        h("p", null, (n - un.length) + " of " + n + " answered" + (T.marked.length ? ", " + T.marked.length + " marked for review" : "") + ". Choose a question to go back to it."),
        h("ul", "test-review-list", T.order.map((id, i) => {
          const q = byId(id), b = SS.btn("Question " + (i + 1) + ": " + (answered(q) ? "answered" : "not answered") + (isMarked(id) ? " · marked for review" : ""), "button-secondary", () => drawQuestion(i));
          return h("li", null, b);
        })),
        un.length ? h("p", "notice", "Unanswered questions are scored as incorrect. They are not saved as attempts, so you can still answer them for the first time later.") : null,
        h("div", "button-row", submitBtn, SS.btn("Back to questions", "button-secondary", () => drawQuestion(T.idx))),
        confirmBox);
      update(); save();
      const hd = body.querySelector("h3"); hd.tabIndex = -1; hd.focus({ preventScroll: true });
    }

    function submit(auto) {
      if (done) return;
      pause(); done = true; ctl = null;
      const items = T.order.map((qid) => {
        const q = byId(qid), raw = T.ans[qid];
        return { q: qid, a: q.type === "multiple-choice" ? (Number.isInteger(raw) ? raw : null) : parseNum(raw) };
      });
      let score = 0, nAns = 0, firsts = 0, firstOk = 0;
      items.forEach((it) => {
        if (it.a === null) return;
        const q = byId(it.q), ok = SS.grade(q, it.a);
        nAns++; if (ok) score++;
        if (S.record(q, ok)) { firsts++; if (ok) firstOk++; A.afterFirst(unit, q, ok); }
      });
      const U = S.unit(unit.key); U.tests = U.tests || {};
      const prev = U.tests[test.id];
      const rec = { n: (prev ? prev.n : 0) + 1, best: Math.max(prev ? prev.best : 0, score), t: Date.now(), score, total: n, answered: nAns, firsts, firstOk,
        timed: T.timed, limit: T.limit, secs: T.timed ? T.limit - T.left : 0, auto: !!auto, items };
      U.tests[test.id] = rec; S.save();
      env.clearRun();
      env.submitted(test, rec);
    }

    // stop(): leave without submitting. The clock stops; keep=true saves the test so it can be resumed.
    const stop = (keep) => { if (tick !== null) { clearInterval(tick); tick = null; } if (keep) save(); done = true; };
    ctl = { pause, run, save, stop, get done() { return done; } };
    if (T.screen === "review") drawReview(); else drawQuestion(T.idx);
    run();
    return ctl;
  }

  /* ---------- after submitting ---------- */
  // What to do next, from this test's results and the student's confidence rating (1 to 5, or null).
  function suggest(rows, conf, topicName, title) {
    const total = rows.length, ok = rows.filter((r) => r.ok).length, pct = total ? ok / total : 0, missN = total - ok;
    const miss = {};
    rows.filter((r) => !r.ok).forEach((r) => (miss[r.q.topicId] = (miss[r.q.topicId] || 0) + 1));
    const topics = Object.keys(miss).sort((a, b) => miss[b] - miss[a]), names = topics.map(topicName);
    const minutes = missN === 0 ? 15 : missN <= 2 ? 20 : missN <= 4 ? 30 : 45;
    const low = missN > 0 && (pct < 0.5 || (conf !== null && conf <= 2));
    let text = missN === 0
      ? "You answered every question correctly. A short " + minutes + "-minute review plan across this unit's concepts keeps them fresh, and adaptive practice can move you to harder questions."
      : (low ? "Start with the study guide or the Learn first resources for " + names[0] + ", then build a " : "Build a ") + minutes + "-minute review plan focused on what you missed: " + listText(names) + ".";
    if (conf === null) text += " Rating your confidence above also shapes this suggestion.";
    else if (conf >= 4 && pct < 0.6) text += " You rated your confidence " + conf + " of 5, which is higher than this result suggests, so read the explanations above before moving on.";
    else if (conf <= 2 && pct >= 0.8) text += " You rated your confidence " + conf + " of 5, but your answers were strong. Keep practicing to build on that.";
    const note = "Built from your " + title + " results (" + ok + " of " + total + " correct). " +
      (topics.length ? "The concept" + (topics.length > 1 ? "s" : "") + " you missed " + (topics.length > 1 ? "are" : "is") + " selected: " + listText(names) + "." : "You missed nothing, so every concept is selected.");
    return { text, learn: low, focus: topics[0] || null, seed: { topics: topics.length ? topics : null, minutes, conf, note } };
  }

  /* env: { unit, courseName, unitName, table(caption, heads, rows), topicName(id), tests (number in this unit),
            back(), retake(), unitResults(), retry(questions), plan(seed), learn(), focused(topicId), announce(text) } */
  function results(host, env, test, rec) {
    const unit = env.unit, U = SS.store.unit(unit.key);
    const byId = (id) => unit.questions.find((q) => q.id === id);
    const rows = rec.items.map((it) => { const q = byId(it.q); return q && { q, a: it.a, skip: it.a === null, ok: it.a !== null && SS.grade(q, it.a) }; }).filter(Boolean);
    const total = rows.length, ok = rows.filter((r) => r.ok).length, skipped = rows.filter((r) => r.skip).length, wrong = total - ok - skipped;
    const kids = [h("p", "eyebrow", env.courseName + " · " + env.unitName), h("h2", null, test.title + ": results"),
      h("p", "why", "Submitted " + new Date(rec.t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) + (rec.n > 1 ? " · submission " + rec.n + " of this test" : "") + ".")];
    if (rec.auto) kids.push(h("p", "notice", "Time ran out, so the test was submitted automatically with the answers you had chosen."));

    /* score */
    kids.push(h("h3", null, "Score"),
      h("div", "stats", SS.statBox(ok + " of " + total, "correct (" + SS.pct(ok, total) + "%)"), SS.statBox(String(skipped), "not answered"),
        SS.statBox(rec.firstOk + " of " + rec.firsts, "first attempts correct"),
        SS.statBox(rec.timed ? SS.fmtTime(rec.secs) + " of " + SS.fmtTime(rec.limit) : "Untimed", rec.timed ? "time used" : "no time limit")),
      h("p", "note", "This is a short unit practice test of " + SS.plural(total, "question") + " from StudySprint's original question bank, not a full AP exam, and it cannot predict an AP score." +
        (rec.answered > rec.firsts ? " " + SS.plural(rec.answered - rec.firsts, "answer was", "answers were") + " to questions you had answered before, so " + (rec.answered - rec.firsts === 1 ? "it was" : "they were") + " recorded as retries and did not change your first-attempt results." : "")));

    /* topic and level breakdown */
    const tRows = unit.topics.map((t) => { const rs = rows.filter((r) => r.q.topicId === t.id); return { t, rs }; }).filter((x) => x.rs.length);
    kids.push(h("h3", null, "Results by concept"),
      env.table("How you did on each concept in this test.", ["Concept", "Correct", "Missed", "Not answered", "What to do"],
        tRows.map(({ t, rs }) => {
          const c = rs.filter((r) => r.ok).length, s = rs.filter((r) => r.skip).length, m = rs.length - c - s;
          return [t.name, c + " of " + rs.length, String(m), String(s), c === rs.length ? "—" : "Review this concept"];
        })),
      env.table("How you did at each difficulty level in this test.", ["Level", "Correct"],
        SS.LV.map((l, i) => { const rs = rows.filter((r) => SS.adaptive.lv(r.q) === i); return rs.length ? [SS.cap(l), rs.filter((r) => r.ok).length + " of " + rs.length] : null; }).filter(Boolean)));

    /* answers and explanations */
    kids.push(h("h3", null, "Answers and explanations"),
      h("p", "why", wrong + skipped ? "Questions you missed or left unanswered are open below; the rest are collapsed." : "Every answer was correct. Open any question to read its explanation."),
      h("div", "ans-list", rows.map((r, i) => {
        const d = h("details", "ans-item" + (r.ok ? " ok" : " bad"),
          h("summary", null, "Question " + (i + 1) + " · " + (r.ok ? "Correct" : r.skip ? "Not answered" : "Incorrect") + " · " + env.topicName(r.q.topicId) + " · " + SS.cap(r.q.difficulty)),
          h("p", null, r.q.prompt),
          h("p", null, h("b", null, "Your answer: "), answerText(r.q, r.a)),
          h("p", null, h("b", null, "Correct answer: "), correctText(r.q)),
          h("p", null, r.q.explanation),
          r.q.type === "multiple-choice" ? [h("p", null, h("b", null, "Why each choice:")),
            h("ul", null, r.q.choices.map((c, k) => h("li", null, letter(k) + (k === r.a ? " (your answer)" : "") + ": " + (k === r.q.correctAnswer ? "Correct answer." : "Not correct. " + r.q.choiceExplanations[k]))))] : null);
        d.open = !r.ok;
        return d;
      })));

    /* retry missed questions: a separate section, never part of the test */
    const miss = rows.filter((r) => !r.ok);
    const retry = h("section", "retry-sec", h("h3", null, "Retry missed questions"));
    retry.id = "test-retry";
    if (miss.length) retry.append(
      h("p", null, "You missed " + wrong + (skipped ? " and left " + skipped + " unanswered" : "") + ". Retrying is separate from this test: your score above does not change. " +
        "A question you answered before is recorded as a retry, so your first-attempt results stay as they are; a question you left unanswered gets its first attempt now."),
      h("div", "button-row", SS.btn("Retry missed questions (" + miss.length + ")", "button-primary", () => env.retry(miss.map((r) => r.q)))));
    else retry.append(h("p", null, "You answered every question correctly, so there is nothing to retry."));
    kids.push(retry);

    /* next step: a review plan for this same course and unit, from these results and the confidence rating */
    const CONF = ["1 — Not at all", "2 — A little", "3 — Somewhat", "4 — Fairly", "5 — Very"];
    const conf = h("fieldset", "conf-scale", h("legend", null, "How confident do you feel about " + unit.title + " now?"));
    const name = "tc" + ++seq;
    CONF.forEach((t, i) => {
      const r = h("input"); r.type = "radio"; r.name = name; r.value = String(i + 1); r.checked = !!U.conf && U.conf.value === i + 1;
      r.onchange = () => { U.conf = { value: i + 1, t: Date.now() }; SS.store.save(); draw(); env.announce("Confidence saved. Suggestion updated."); };
      conf.append(h("label", "choice", r, h("span", null, t)));
    });
    const sug = h("div", "learn-offer"); sug.setAttribute("aria-live", "polite");
    function draw() {
      const s = suggest(rows, U.conf ? U.conf.value : null, env.topicName, test.title);
      sug.replaceChildren(h("p", null, h("b", null, "Suggested: "), s.text),
        h("div", "fb-actions",
          SS.btn("Build a review plan from these results", "button-primary", () => env.plan(s.seed)),
          s.learn ? SS.btn("Open Learn first", "button-secondary", env.learn) : null,
          s.focus ? SS.btn("Practice " + env.topicName(s.focus) + " (5 questions)", "button-secondary", () => env.focused(s.focus)) : null));
    }
    draw();
    kids.push(h("h3", null, "Your next step"),
      h("p", null, "A review plan is a timed session for this same unit that starts from these results. Your confidence rating is self-reported and is never counted as evidence; it only helps choose what to suggest."),
      conf, sug);

    kids.push(h("div", "fb-actions",
      SS.btn("Back to this unit's tests", "button-secondary", env.back),
      SS.btn("Take " + test.title + " again", "button-secondary", env.retake),
      SS.btn("Unit results", "button-secondary", env.unitResults)),
      h("p", "why", "Taking " + test.title + " again shows the same " + SS.plural(total, "question") + " in a new order, recorded as retries." +
        (env.tests < 2 ? " This unit has one practice test so far; adaptive practice draws on the whole question bank." : "")));
    host.replaceChildren(h("div", "panel", kids));
  }

  window.addEventListener("pagehide", () => { if (ctl && !ctl.done) ctl.save(); });
  SS.testing = {
    start, results, suggest,
    // The app calls this on every view change: the clock runs only while the test is on screen.
    visible(on) { if (!ctl || ctl.done) return; if (on) ctl.run(); else ctl.pause(); },
    active: () => !!ctl && !ctl.done,
    close(keep) { if (ctl && !ctl.done) ctl.stop(keep); ctl = null; },
    answeredCount: (state) => Object.values((state && state.ans) || {}).filter((a) => Number.isInteger(a) || parseNum(a) !== null).length,
  };
})();
