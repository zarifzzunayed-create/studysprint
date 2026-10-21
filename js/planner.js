/* Study planner, shown to students as the "review plan". It follows a practice test: the test results page opens it
   for the same course and unit with the missed concepts already selected (env.seed). It can also be opened directly.
   A session combines timed work with that unit's real resources: a guide section, a randomized set of
   questions, explanations for misses, different questions on missed concepts, and a results summary.
   The steps and the practice threshold come from data/planner.json, so the step count shown here, in the saved
   session history, and in CONTENT_STATUS.md is always the same number.
   Ticking a step "done" is the student's own checklist (plan completion). It is never counted as evidence of learning:
   the results step reports question results separately and says plainly when the practice threshold was not met. */
(function () {
  "use strict";
  const SS = window.SS, h = SS.h;
  const CONF = ["1 — I need a lot of help", "2 — I am unsure", "3 — I am getting there", "4 — I am mostly confident", "5 — I can explain it"];

  SS.timer = function (minutes) {
    const box = h("div", "timerbox");
    const read = h("p", "timer-readout", SS.fmtTime(minutes * 60)), msg = h("p", "timer-message");
    read.setAttribute("role", "timer"); msg.setAttribute("aria-live", "polite");
    let left = minutes * 60, endAt = 0, tick = null;
    const go = SS.btn("Start timer", "button-primary"), reset = SS.btn("Reset timer", "button-secondary");
    const stop = () => { if (tick !== null) { clearInterval(tick); tick = null; } };
    go.onclick = () => {
      if (tick !== null) { stop(); go.textContent = "Resume timer"; msg.textContent = "Timer paused."; return; }
      if (left <= 0) return;
      endAt = Date.now() + left * 1000; go.textContent = "Pause timer"; msg.textContent = "Timer running.";
      tick = setInterval(() => {
        left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000)); read.textContent = SS.fmtTime(left);
        if (left === 0) { stop(); go.disabled = true; go.textContent = "Time is up"; msg.textContent = "Time is up for this step. Finish what you are working on, then move on."; }
      }, 250);
    };
    reset.onclick = () => { stop(); left = minutes * 60; read.textContent = SS.fmtTime(left); go.disabled = false; go.textContent = "Start timer"; msg.textContent = "Timer reset."; };
    box.append(h("p", "eyebrow", "Step timer: " + minutes + " minutes"), read, msg, h("div", "button-row", go, reset));
    box.querySelector(".button-row").style.justifyContent = "center";
    return { el: box, stop };
  };

  SS.planner = {
    // env: { unit, courseName, go(view), sectionEl(section), startFocused(topicId), saveCtx(obj), openLearn(reason),
    //        announce(text), persist(state), clearRun(), seed? }
    // seed (from a practice test's results): { topics: ids to select or null for all, minutes, conf (1-5 or null), note }
    // cfg: the contents of data/planner.json
    // saved: a session saved by persist(), to continue after a page refresh (optional)
    mount(host, env, cfg, saved) {
      const unit = env.unit, A = SS.adaptive, TH = cfg.threshold;
      const PL = { steps: [], idx: 0, done: {}, answers: [], panels: [], built: {}, timers: [], plan: null, id: 0, r: {}, retryOpts: null, finished: false };

      const topicName = (id) => (unit.topics.find((t) => t.id === id) || {}).name || id;
      const qOf = (id) => unit.questions.find((q) => q.id === id);
      const stopTimers = () => PL.timers.forEach((t) => t.stop());
      const sid = (id) => PL.steps.findIndex((s) => s.id === id);
      const total = () => PL.steps.length;

      /* ---------- saving an unfinished session (timers are not saved: they restart from the full step time) ---------- */
      function persist() {
        if (!PL.plan || PL.finished || !env.persist) return;
        env.persist({ plan: PL.plan, idx: PL.idx, done: PL.done, answers: PL.answers, id: PL.id, r: PL.r, retryOpts: PL.retryOpts });
      }
      function restore(s) {
        const qOk = (id) => unit.questions.some((q) => q.id === id), tOk = (id) => unit.topics.some((t) => t.id === id);
        const p = s && s.plan;
        if (!p || !Array.isArray(p.mins) || p.mins.length !== cfg.steps.length || !Array.isArray(p.topicIds) || !p.topicIds.length || !p.topicIds.every(tOk) ||
          !Array.isArray(p.focus) || !p.focus.every(tOk) || !Number.isInteger(p.n2) || !Number.isInteger(s.idx) || s.idx < 0 || s.idx >= cfg.steps.length) return false;
        PL.plan = p;
        PL.steps = cfg.steps.map((st, i) => Object.assign({}, st, { minutes: p.mins[i] }));
        PL.done = s.done && typeof s.done === "object" ? s.done : {};
        PL.answers = Array.isArray(s.answers) ? s.answers.filter((a) => a && qOk(a.qid)) : [];
        PL.id = typeof s.id === "number" ? s.id : Date.now();
        PL.r = s.r && typeof s.r === "object" ? s.r : {};
        PL.retryOpts = s.retryOpts && typeof s.retryOpts === "object" ? s.retryOpts : null;
        renderSession(s.idx);
        if (env.announce) env.announce("Study session restored at step " + (s.idx + 1) + " of " + total() + ".");
        return true;
      }

      /* ---------- setup ---------- */
      function setup() {
        stopTimers(); PL.t3 = null; PL.steps = []; PL.idx = 0; PL.done = {}; PL.answers = []; PL.panels = []; PL.built = {}; PL.timers = []; PL.plan = null;
        PL.r = {}; PL.retryOpts = null; PL.finished = false;
        if (env.clearRun) env.clearRun();
        const ts = A.topicStats(unit), saved = Object.assign({}, SS.store.P.ctx), seed = env.seed || null;
        if (seed) { saved.topics = seed.topics; if (seed.minutes) saved.minutes = seed.minutes; }
        if (!(saved.topics && saved.topics.some((id) => unit.topics.some((t) => t.id === id)))) saved.topics = null;
        // Default confidence for each concept: the student's own rating for this unit, when there is one.
        const uc = SS.store.unit(unit.key).conf, defConf = seed && seed.conf ? seed.conf : uc ? uc.value : 3;
        const usable = unit.topics.filter((t) => ts[t.id].total > 0 && unit.guide.sections.some((s) => s.topicId === t.id));
        const minutes = h("select"); minutes.id = "pl-min";
        [15, 20, 30, 45, 60].forEach((m) => { const o = h("option", null, m + " minutes"); o.value = m; o.selected = m === (saved.minutes || 30); minutes.append(o); });
        const rows = usable.map((t) => {
          const cb = h("input"); cb.type = "checkbox"; cb.checked = !saved.topics || saved.topics.includes(t.id); cb.id = "pl-t-" + t.id;
          const st = ts[t.id];
          const ev = st.n ? st.ok + " of " + st.n + " first attempts correct" + (st.rev ? ", " + st.rev + " to review" : "") : "No attempts yet";
          const lab = h("label", null, t.name, h("br"), h("span", "why", ev)); lab.htmlFor = cb.id;
          const conf = h("select"); conf.setAttribute("aria-label", "How confident are you in " + t.name + "?");
          CONF.forEach((c, i) => { const o = h("option", null, c); o.value = i + 1; o.selected = i === defConf - 1; conf.append(o); });
          return { t, cb, conf, el: h("div", "topic-pick", cb, lab, h("div", "conf", conf)) };
        });
        const err = h("p", "form-message"); err.setAttribute("role", "alert");
        const form = h("form", null,
          h("div", "form-field time-field", h("label", null, "How much time do you have?"), minutes),
          h("fieldset", null, h("legend", null, "Concepts to include"),
            h("p", "field-help", "Your confidence rating helps choose what to review first. Once you have answered at least two questions on a concept, your results are used instead."),
            rows.map((r) => r.el)),
          h("button", "button button-primary", "Build my study session"), err);
        form.querySelector("label").htmlFor = "pl-min";
        form.noValidate = true;
        form.onsubmit = (e) => {
          e.preventDefault();
          const picked = rows.filter((r) => r.cb.checked).map((r) => ({ id: r.t.id, conf: +r.conf.value }));
          if (!picked.length) { err.textContent = "Choose at least one concept to include."; return; }
          err.textContent = ""; build(+minutes.value, picked);
        };
        host.replaceChildren(
          h("h2", null, "Review plan"),
          seed ? h("p", "notice", seed.note) : h("p", null, "A review plan works best right after a practice test: the test's results choose what to review. You can also build one now from your progress so far."),
          h("p", "note", "Planning for ", h("b", null, env.courseName + " · " + unit.title), ". The session uses this unit's study guide and question bank, so there is nothing to retype. To plan for a different unit, change the unit above."),
          form,
          h("p", "privacy-note", "A session has " + cfg.steps.length + " steps. Ticking a step done is your own checklist. Only submitted answers count as evidence of how you performed."));
      }

      /* ---------- build ---------- */
      function build(minutes, picked) {
        const ts = A.topicStats(unit);
        const priority = (p) => { const t = ts[p.id]; return t.n >= 2 ? 1 + 4 * (t.ok / t.n) - (t.rev ? 0.5 : 0) : p.conf; };
        picked.sort((a, b) => priority(a) - priority(b));
        const topicIds = picked.map((p) => p.id);
        const focus = picked.slice(0, minutes >= 45 ? 2 : 1).map((p) => p.id);
        const mins = SS.allocate(minutes, cfg.steps.map((s) => s.share));
        PL.steps = cfg.steps.map((s, i) => Object.assign({}, s, { minutes: mins[i] }));
        const pool = unit.questions.filter((q) => topicIds.includes(q.topicId));
        const n2 = Math.min(pool.length, Math.max(3, Math.min(10, Math.round(PL.steps[sid("practice")].minutes / 2.5))));
        PL.plan = { minutes, topicIds, focus, mins, n2 };
        PL.id = Date.now();
        env.saveCtx({ minutes, topics: topicIds });
        renderSession();
      }

      /* ---------- session shell ---------- */
      let stepList, panelBox, markBtn, backBtn, nextBtn;
      function renderSession(startAt) {
        const P = PL.plan;
        stepList = h("ol", "pl-steps"); panelBox = h("div");
        PL.steps.forEach((s, i) => { const p = h("div"); p.hidden = true; PL.panels[i] = p; panelBox.append(p); });
        markBtn = SS.btn("", "button-secondary", () => {
          PL.done[PL.idx] = !PL.done[PL.idx]; updateNav();
          if (PL.steps[PL.idx].id === "results") fillResults(PL.panels[PL.idx]);
          persist();
        });
        let armed = false;
        const over = SS.btn("Start over", "button-secondary", () => {
          if (!armed) { armed = true; over.textContent = "Click again to discard this session"; over.setAttribute("aria-describedby", "pl-over-note"); overNote.hidden = false; return; }
          setup();
        });
        const overNote = h("p", "why", "Starting over discards this session's checklist. Answers you already submitted stay in your results.");
        overNote.id = "pl-over-note"; overNote.hidden = true;
        backBtn = SS.btn("← Previous step", "button-secondary", () => show(PL.idx - 1));
        nextBtn = SS.btn("Next step →", "button-primary", () => show(PL.idx + 1));
        host.replaceChildren(
          h("h2", null, "Study session: " + P.minutes + " minutes"),
          h("p", null, env.courseName + " · " + unit.title + " · Concepts: " + P.topicIds.map(topicName).join("; ")),
          h("p", "privacy-note", "The " + total() + "-step checklist below is your own schedule (plan completion). Question results, not ticks, show how you did."),
          stepList, panelBox,
          h("div", "pl-nav", backBtn, markBtn, nextBtn, over), overNote);
        show(startAt || 0);
      }

      function updateNav() {
        stepList.replaceChildren(...PL.steps.map((s, i) => {
          const li = h("li", null, h("span", null, (i + 1) + ". " + s.title + " (" + s.minutes + " min)"),
            h("span", "why", (i === PL.idx ? "Current step · " : "") + (PL.done[i] ? "Marked done (your own checklist)" : "Not marked done")));
          if (i === PL.idx) li.setAttribute("aria-current", "step");
          return li;
        }));
        backBtn.disabled = PL.idx === 0; nextBtn.disabled = PL.idx === total() - 1;
        markBtn.textContent = PL.done[PL.idx] ? "Marked done (undo)" : "Mark this step done (your own checklist)";
        markBtn.setAttribute("aria-pressed", String(!!PL.done[PL.idx]));
      }

      function show(i) {
        if (i < 0 || i >= PL.steps.length) return;
        PL.idx = i;
        PL.panels.forEach((p, k) => (p.hidden = k !== i));
        const id = PL.steps[i].id;
        if (id === "explain") fillExplain(PL.panels[i]);
        else if (id === "results") fillResults(PL.panels[i]);
        else if (!PL.built[id]) { PL.built[id] = true; ({ guide: fillGuide, practice: fillPractice, retry: fillRetry })[id](PL.panels[i]); }
        updateNav();
        persist();
        const hd = PL.panels[i].querySelector("h3"); if (hd) { hd.tabIndex = -1; hd.focus({ preventScroll: true }); }
        if (env.announce) env.announce("Step " + (i + 1) + " of " + total() + ": " + PL.steps[i].title);
      }

      const stepHead = (id) => h("h3", null, "Step " + (sid(id) + 1) + " of " + total() + ": " + PL.steps[sid(id)].title);
      const timer = (id) => { const t = SS.timer(PL.steps[sid(id)].minutes); PL.timers.push(t); return t.el; };
      const goTo = (id, label) => SS.btn(label || "Go to step " + (sid(id) + 1), "button-primary", () => show(sid(id)));

      /* ---------- step 1: guide section ---------- */
      function fillGuide(panel) {
        const secs = PL.plan.focus.map((t) => unit.guide.sections.find((s) => s.topicId === t)).filter(Boolean);
        panel.append(stepHead("guide"),
          h("p", null, "Read about " + PL.steps[sid("guide")].minutes + " minutes, then close the guide and write three things you can remember. This step is not scored."),
          h("p", "why", "Chosen because " + secs.map((s) => s.title).join(" and ") + " came out as your highest-priority concept" + (secs.length > 1 ? "s" : "") + " (from your practice results where you have them, otherwise your confidence rating)."),
          ...secs.map((s) => env.sectionEl(s, false)),
          h("p", null, SS.btn("Open the full guide", "button-secondary", () => env.go("guide"))),
          timer("guide"));
      }

      /* ---------- step 2: randomized practice ---------- */
      function fillPractice(panel) {
        const box = h("div");
        panel.append(stepHead("practice"),
          h("p", null, "You will answer up to " + PL.plan.n2 + " questions from the concepts you chose. Questions are randomized, and the difficulty adapts to your first attempts."),
          timer("practice"), box);
        const r = SS.runner(box, unit, {
          limit: PL.plan.n2, topicIds: PL.plan.topicIds, followUps: false,
          onAnswer: (e) => PL.answers.push(Object.assign({ step: "practice" }, e)),
          onStruggle: env.openLearn,
          onChange: (st) => { PL.r.practice = st; persist(); },
          onEnd: (s) => {
            box.replaceChildren(h("div", "notice", "Practice finished: " + SS.plural(s.distinct, "question") + " answered. First attempts: " + s.firstOk + " of " + s.first + " correct."),
              h("p", null, "Next, review the explanations for anything you missed."), goTo("explain"));
          },
        });
        if (PL.r.practice) r.resume(PL.r.practice); else r.start();
      }

      /* ---------- step 3: explanations for misses ---------- */
      function missedFirst() {
        const seen = new Set();
        return PL.answers.filter((a) => a.step === "practice" && a.first && !a.ok && !seen.has(a.qid) && seen.add(a.qid));
      }
      function fillExplain(panel) {
        const miss = missedFirst();
        panel.replaceChildren(stepHead("explain"));
        if (!miss.length) {
          panel.append(h("p", null, PL.answers.some((a) => a.step === "practice")
            ? "You had no missed first attempts in the practice step. Use this time to re-read a guide explanation you found hard."
            : "Answer questions in the practice step first. Explanations for any misses will appear here."));
        }
        miss.forEach((a) => {
          const q = qOf(a.qid); if (!q) return;
          const ans = q.type === "multiple-choice" ? "ABCD"[q.correctAnswer] + ". " + q.choices[q.correctAnswer] : q.correctAnswer + " " + q.answerUnit;
          panel.append(h("div", "guide-sec", h("h4", null, q.prompt), h("p", null, h("b", null, "Correct answer: "), ans), h("p", null, q.explanation),
            q.type === "multiple-choice" ? h("ul", null, q.choices.map((c, i) => (i === q.correctAnswer ? null : h("li", null, "ABCD"[i] + ". " + q.choiceExplanations[i])))) : null));
        });
        PL.t3 = PL.t3 || timer("explain"); panel.append(PL.t3);
      }

      /* ---------- step 4: different questions on missed concepts ---------- */
      function fillRetry(panel) {
        const miss = missedFirst(), seenTopic = new Set(), targets = [];
        miss.forEach((a) => { if (!seenTopic.has(a.topicId)) { seenTopic.add(a.topicId); targets.push({ topicId: a.topicId, level: a.level, qid: a.qid }); } });
        const t4 = targets.slice(0, 4), box = h("div");
        let opts, intro;
        if (PL.retryOpts && PL.retryOpts.intro) { intro = PL.retryOpts.intro; opts = Object.assign({}, PL.retryOpts.opts); }
        else if (t4.length) {
          intro = "You missed " + SS.plural(miss.length, "question") + " in the practice step. Here is a different question on each missed concept (same or next-lower level when one is available).";
          opts = { targets: t4, limit: t4.length, followUps: false };
        } else {
          const w = A.weakest(unit, PL.plan.topicIds);
          const pool = unit.questions.filter((q) => q.topicId === (w ? w.topic.id : ""));
          intro = "No missed first attempts to revisit, so this is extra practice on your " + (w && w.kind === "most missed" ? "most-missed" : "least-practiced") + " chosen concept" + (w ? ": " + w.topic.name : "") + ".";
          opts = { topicIds: w ? [w.topic.id] : PL.plan.topicIds, limit: Math.max(1, Math.min(2, pool.length || 2)), followUps: false };
        }
        PL.retryOpts = { intro, opts: JSON.parse(JSON.stringify(opts)) };
        panel.append(stepHead("retry"), h("p", null, intro), timer("retry"), box);
        const r = SS.runner(box, unit, Object.assign(opts, {
          onAnswer: (e) => PL.answers.push(Object.assign({ step: "retry" }, e)),
          onStruggle: env.openLearn,
          onChange: (st) => { PL.r.retry = st; persist(); },
          onEnd: (s) => box.replaceChildren(h("div", "notice", "Step finished: " + SS.plural(s.distinct, "question") + " answered. First attempts: " + s.firstOk + " of " + s.first + " correct. Retries: " + s.retryOk + " of " + s.retries + " correct."),
            goTo("results", "Go to step " + (sid("results") + 1) + ": results")),
        }));
        if (PL.r.retry) r.resume(PL.r.retry); else r.start();
      }

      /* ---------- step 5: results ---------- */
      function fillResults(panel) {
        const A_ = PL.answers, firsts = A_.filter((a) => a.first), rets = A_.filter((a) => !a.first);
        const distinct = new Set(A_.map((a) => a.qid)).size, firstOk = firsts.filter((a) => a.ok).length, retryOk = rets.filter((a) => a.ok).length;
        const n = total(), doneCount = PL.steps.filter((s, i) => PL.done[i]).length;
        const pct = SS.pct(firstOk, firsts.length);
        const met = distinct >= TH.questions && firsts.length >= TH.questions && pct >= TH.percent;
        const misses = {};
        firsts.filter((a) => !a.ok).forEach((a) => (misses[a.topicId] = (misses[a.topicId] || 0) + 1));
        const top = Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 2);
        const ev = A.evidence(unit), w = A.weakest(unit);

        let verdict;
        if (!A_.length) verdict = "No questions were answered in this session, so there is no practice evidence yet.";
        else if (met) verdict = "Practice threshold met: you answered " + distinct + " different questions with " + pct + "% correct on first attempts.";
        else verdict = (doneCount === n ? "You marked every step done, but the practice threshold was not met: " : "The practice threshold was not met: ") +
          (distinct < TH.questions ? "you answered " + distinct + " different question" + (distinct === 1 ? "" : "s") + " (at least " + TH.questions + " are needed)"
            : "your first-attempt accuracy was " + pct + "% (" + TH.percent + "% or more is needed)") + ".";

        PL.id = PL.id || Date.now();
        PL.finished = true; if (env.clearRun) env.clearRun(); // the session is saved in the history below, so nothing is left to resume
        SS.store.upsertSession(PL.id, { t: Date.now(), unitKey: unit.key, unitTitle: unit.title, minutes: PL.plan.minutes, stepsDone: doneCount, stepsTotal: n, distinct, first: firsts.length, firstOk, retries: rets.length, retryOk, met });

        panel.replaceChildren(stepHead("results"),
          h("h4", null, "Plan completion (your own checklist)"),
          h("p", null, doneCount + " of " + n + " steps marked done. This is self-reported, so it is not counted as evidence of learning."),
          h("h4", null, "Practice evidence (submitted answers)"),
          h("div", "stats", SS.statBox(String(distinct), "different questions answered"), SS.statBox(firstOk + " of " + firsts.length, "first attempts correct" + (firsts.length ? " (" + pct + "%)" : "")),
            SS.statBox(retryOk + " of " + rets.length, "retries correct"), SS.statBox(A.levelName(unit), "current adaptive level")),
          h("p", null, top.length ? "Concepts with the most missed first attempts: " + top.map(([id, n]) => topicName(id) + " (" + n + ")").join(", ") + "." : "No missed first attempts in this session."),
          h("p", "notice", verdict),
          h("p", "why", "Session practice threshold: at least " + TH.questions + " different questions answered, with " + TH.percent + "% or more correct on first attempts."),
          h("p", null, h("b", null, "Unit practice evidence: " + ev.label + ". "), ev.detail),
          h("details", "def", h("summary", null, "How the evidence label is defined"), h("p", null, A.EVIDENCE_DEF)),
          h("h4", null, "Suggested next step"),
          w ? h("p", null, (w.kind === "most missed" ? "Practice " : "Try ") + w.topic.name + " next" + (w.kind === "most missed" ? ": it has the most missed first attempts and review questions in this unit." : ": it is the concept you have practiced least.")) : h("p", null, "Answer some questions to get a suggestion."),
          h("div", "fb-actions",
            w ? SS.btn("Continue practicing: " + w.topic.name, "button-primary", () => env.startFocused(w.topic.id)) : null,
            SS.btn("Plan another session", "button-secondary", setup),
            SS.btn("See unit results", "button-secondary", () => env.go("results"))));
      }

      if (!(saved && restore(saved))) setup();
      else if (env.seed) host.prepend(h("p", "notice", "You have an unfinished review plan for this unit. Finish it, or choose Start over to build a new one from your test results."));
    },
  };
})();
