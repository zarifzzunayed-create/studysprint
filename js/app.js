/* App shell: course search, unit selection, and the unit views. The main path is practice tests: choose a course, a unit,
   and one of that unit's tests (the "overview" view is the unit's test library), take it in the focused test view, then
   see results with explanations, retry missed questions, and build a review plan (the planner) for the same unit.
   Learn first, the guide, adaptive practice, videos and FRQs stay available from the unit. The selected course and unit
   form one shared context that every view uses. */
(function () {
  "use strict";
  const SS = window.SS, h = SS.h, $ = SS.$;
  const ST = (SS.ST = { cat: null, pcfg: null, course: null, cdata: null, unitMeta: null, unit: null, practice: null, view: "home", token: null, learnKey: null, learnFrom: null });
  const VIEWS = ["home", "overview", "test", "learn", "guide", "practice", "videos", "frqs", "planner", "results", "about", "data"];
  const UNIT_VIEWS = ["overview", "test", "learn", "guide", "practice", "videos", "frqs", "planner", "results"];
  const LABEL = { home: "Choose a course", overview: "Practice tests", test: "Practice test", learn: "Learn first", guide: "Study guide", practice: "Adaptive practice", videos: "Videos",
    frqs: "Official FRQs", planner: "Review plan", results: "Results", about: "About", data: "My data" };
  const HOME_TITLE = document.title;
  let fromHistory = false, booted = false;
  const STATUS = {
    "practice-ready": "Practice-ready",
    "in-progress": "Study content in progress",
    outline: "Course outline available; practice questions in progress",
  };
  const A = () => SS.adaptive, S = () => SS.store;
  function announce(text) { const a = $("announce"); if (!a) return; a.textContent = ""; setTimeout(() => { a.textContent = text; }, 40); }
  const topicName = (id) => { const t = ST.unit && ST.unit.topics.find((x) => x.id === id); return t ? t.name : id; };

  /* ---------- routing and the always-visible course/unit bar ----------
     Each view change adds a browser history entry, so the Back button returns to the previous view. */
  function go(name, focus) {
    const changed = ST.view !== name;
    ST.view = name;
    VIEWS.forEach((v) => ($("v-" + v).hidden = v !== name));
    SS.testing.visible(name === "test"); // a timed test's clock runs only while the test is on screen
    updateCtx(); updateTitle();
    if (changed) {
      showError(null);
      if (!fromHistory) { try { history.pushState({ ss: name }, ""); } catch (e) { /* history not available */ } }
      if (ST.course) S().setCtx({ view: UNIT_VIEWS.includes(name) ? name : null });
    }
    if (focus !== false) {
      const t = $("v-" + name).querySelector("h1,h2");
      if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); }
      window.scrollTo(0, 0);
    }
  }

  function where() { return ST.course ? ST.course.name + (ST.unitMeta ? " · " + ST.unitMeta.name : "") : ""; }
  function updateTitle() {
    const v = ST.view, w = UNIT_VIEWS.includes(v) ? where() : "", t = $("sr-title");
    document.title = v === "home" ? HOME_TITLE : LABEL[v] + (w ? " — " + w : "") + " · StudySprint";
    if (t) { t.hidden = v === "home"; t.textContent = (w ? w + ": " : "") + LABEL[v]; }
  }
  window.addEventListener("popstate", (e) => {
    const v = e.state && e.state.ss;
    if (!v || !VIEWS.includes(v) || v === ST.view) return;
    fromHistory = true;
    try {
      if (v === "home" || v === "about") go(v);
      else if (v === "data") renderData();
      else if (!ST.course) go("home");
      else if (v === "overview") showOverview();
      else if (v === "frqs") renderFrqs();
      else if (!ST.unit) showOverview();
      else if (v === "test") { if ($("v-test").childNodes.length) go("test"); else showOverview(); }
      else open(v);
    } finally { fromHistory = false; }
  });

  /* ---------- loading messages and errors (never a blank screen) ---------- */
  function busy(text) { const b = $("load-status"); b.textContent = text || ""; b.hidden = !text; }
  function showError(text, retry) {
    const box = $("load-error");
    if (!text) { box.hidden = true; box.replaceChildren(); return; }
    const why = SS.data.lastError ? " (Technical detail: " + SS.data.lastError + ".)" : "";
    box.replaceChildren(h("h2", null, "Something did not load"), h("p", null, text + why),
      retry ? SS.btn("Try again", "button-primary", () => { showError(null); retry(); }) : null);
    box.hidden = false;
    if (ST.view !== "home") { fromHistory = true; go("home", false); fromHistory = false; }
    const b = box.querySelector("button") || box.querySelector("h2");
    b.tabIndex = b.tabIndex < 0 ? -1 : b.tabIndex; b.focus({ preventScroll: true }); box.scrollIntoView({ block: "nearest" });
  }

  function updateCtx() {
    const bar = $("ctx");
    const show = !!ST.course && UNIT_VIEWS.includes(ST.view);
    bar.hidden = !show;
    if (!show) return;
    $("ctx-title").textContent = ST.course.name + (ST.unitMeta ? " · " + ST.unitMeta.name : "");
    // While a test is open the unit tabs are hidden, so the test has the student's full attention ("Save and exit" leaves it).
    const testing = ST.view === "test" && SS.testing.active();
    $("ctx-nav").hidden = testing; $("ctx-change").hidden = testing;
    // Practice tests come first; the review plan follows the results it is built from.
    const tabs = [["overview", "Tests"], ["results", "Results"], ["planner", "Review plan"], ["practice", "Adaptive practice"], ["learn", "Learn first"], ["guide", "Study guide"], ["videos", "Videos"], ["frqs", "Official FRQs"]];
    $("ctx-nav").replaceChildren(...tabs.map(([v, label]) => {
      const needs = ["learn", "guide", "practice", "videos", "planner", "results"].includes(v);
      const b = h("button", null, label); b.type = "button";
      if (needs && !ST.unit) { b.disabled = true; b.title = "Not available yet for this unit"; }
      if (v === ST.view) b.setAttribute("aria-current", "page");
      b.onclick = () => open(v);
      return b;
    }));
  }
  function open(v) {
    if (v === "overview") showOverview();
    else if (v === "learn") renderLearn();
    else if (v === "guide") renderGuide();
    else if (v === "practice") renderPractice();
    else if (v === "videos") renderVideos();
    else if (v === "frqs") renderFrqs();
    else if (v === "planner") renderPlanner();
    else if (v === "results") renderResults();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]"); if (!b) return;
    e.preventDefault();
    if (b.dataset.go === "data") renderData(); else go(b.dataset.go);
  });
  $("ctx-change").onclick = () => go("home");

  /* ---------- home: searchable course list backed by the catalog ---------- */
  const inp = $("c-search"), list = $("c-list"), msg = $("c-msg"), unitSel = $("c-unit"), goBtn = $("c-go");
  let matches = [], act = -1;
  const hay = (c) => SS.norm([c.name].concat(c.aliases).join(" "));
  const nTests = (c) => (c.summary && c.summary.tests) || 0;
  const courseBadge = (c) => {
    if (c.summary && c.summary.ready > 0) return c.summary.ready + " of " + c.summary.units + " units practice-ready" + (nTests(c) ? " · " + SS.plural(nTests(c), "unit practice test") : "");
    return c.outline ? "Course outline available" : "Catalog only";
  };
  // Unit list label: its readiness status, plus how many practice tests it really has.
  function unitLabel(c, u) {
    const t = (c.summary && c.summary.unitTests && c.summary.unitTests[u.id]) || 0;
    return u.name + " — " + STATUS[u.status] + (t ? " · " + SS.plural(t, "practice test") : u.status === "practice-ready" ? " · no practice test yet" : "");
  }

  function find(q) {
    const w = SS.norm(q).split(" ").filter(Boolean);
    const rank = (c) => (c.summary && c.summary.ready > 0 ? 0 : c.outline ? 1 : 2);
    return ST.cat.courses.map((c, i) => [c, i]).filter(([c]) => w.every((x) => hay(c).includes(x)))
      .sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]);
  }
  function suggest(q) {
    const w = SS.norm(q).split(" ").filter((x) => x.length > 2);
    let s = ST.cat.courses.filter((c) => w.some((x) => hay(c).includes(x)));
    if (!s.length) s = ST.cat.courses.filter((c) => c.summary && c.summary.ready > 0);
    msg.replaceChildren("“" + q + "” is not available yet. StudySprint only lists AP courses it can verify, and it does not guess units or content for anything else. " + (s.length ? "You could try: " : ""),
      ...s.slice(0, 4).map((c) => { const b = h("button", "navbtn", c.name); b.type = "button"; b.onclick = () => chooseCourse(c); return b; }));
  }
  function renderList() {
    if (!ST.cat) return;
    matches = find(inp.value); act = matches.length ? 0 : -1;
    list.replaceChildren(...matches.map((c, i) => {
      const li = h("li", "opt", h("span", null, c.name), h("span", "badge" + (c.summary && c.summary.ready > 0 ? " full" : ""), courseBadge(c)));
      li.id = "opt" + i; li.setAttribute("role", "option"); li.setAttribute("aria-selected", String(i === act));
      li.onmousedown = (e) => e.preventDefault(); // keep focus in the search box
      li.onclick = () => chooseCourse(c);
      return li;
    }));
    list.hidden = !matches.length;
    inp.setAttribute("aria-expanded", String(!list.hidden));
    inp.setAttribute("aria-activedescendant", act >= 0 ? "opt" + act : "");
    const q = inp.value.trim();
    msg.hidden = !(q && !matches.length);
    if (!msg.hidden) suggest(q);
    clearTimeout(renderList.t);
    renderList.t = setTimeout(() => { $("c-status").textContent = !q ? "" : matches.length ? SS.plural(matches.length, "course") + " found. Use the up and down arrow keys to move through them and Enter to choose." : "No courses found."; }, 400);
  }
  function resetUnits(text) {
    unitSel.replaceChildren(h("option", null, text)); unitSel.firstChild.value = "";
    unitSel.disabled = true; goBtn.disabled = true; goBtn.textContent = "See practice tests";
  }
  // then(): called once the unit list has loaded (used when resuming).
  async function chooseCourse(c, then) {
    ST.course = c; ST.cdata = null; ST.unitMeta = null; ST.unit = null;
    inp.value = c.name; list.hidden = true; msg.hidden = true; inp.setAttribute("aria-expanded", "false");
    const token = (ST.token = {});
    if (!c.outline) { resetUnits("Units not added yet for this course"); goBtn.textContent = "See official resources"; goBtn.disabled = false; return; }
    resetUnits("Loading units…"); busy("Loading the units for " + c.name + "…");
    const cd = await SS.data.course(c.id);
    if (ST.token !== token) return;
    busy("");
    if (!cd || !Array.isArray(cd.units)) {
      resetUnits("Units could not be loaded"); goBtn.textContent = "See official resources"; goBtn.disabled = false;
      showError("The unit list for " + c.name + " could not be loaded. Your progress is safe. Check your connection, then try again.", () => chooseCourse(c, then));
      return;
    }
    showError(null);
    ST.cdata = cd;
    resetUnits("Choose a unit"); unitSel.disabled = false;
    cd.units.forEach((u) => { const o = h("option", null, unitLabel(c, u)); o.value = u.id; unitSel.append(o); });
    if (then) then();
  }
  inp.addEventListener("input", () => {
    if (ST.course && inp.value !== ST.course.name) { ST.course = null; ST.cdata = null; ST.token = {}; resetUnits("Choose a course first"); }
    renderList();
  });
  inp.addEventListener("focus", renderList);
  inp.addEventListener("blur", () => { list.hidden = true; inp.setAttribute("aria-expanded", "false"); });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (list.hidden) { renderList(); return; }
      if (!matches.length) return;
      act = (act + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      [...list.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === act)));
      inp.setAttribute("aria-activedescendant", "opt" + act); list.children[act].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && !list.hidden && act >= 0) { e.preventDefault(); chooseCourse(matches[act]); }
    else if (e.key === "Escape") { list.hidden = true; inp.setAttribute("aria-expanded", "false"); }
  });
  unitSel.addEventListener("change", () => { goBtn.disabled = !unitSel.value; });
  goBtn.addEventListener("click", () => {
    if (!ST.course) return;
    if (!ST.cdata) { setUnit(null, null); return; }
    if (unitSel.value) openUnit(ST.course, ST.cdata, unitSel.value);
  });

  /* ---------- picking up where the student left off ---------- */
  const when = (t) => { const d = new Date(t); return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };
  function runWhat(r) { return r.kind === "planner" ? "Review plan" : r.kind === "test" ? (r.title || "Practice test") + (r.test && r.test.timed ? " (timed)" : "") : (r.opts && r.opts.title) || "Practice set"; }
  function runProgress(r) {
    if (r.kind === "test") {
      const t = r.test || {}, n = Array.isArray(t.order) ? t.order.length : 0, a = SS.testing.answeredCount(t);
      return a + " of " + n + " questions answered" + (t.timed ? ", " + SS.fmtTime(t.left || 0) + " left on the timer" : "") + ".";
    }
    if (r.kind === "planner") {
      const p = r.planner || {}, n = p.plan && p.plan.mins ? p.plan.mins.length : 0;
      return "At step " + ((p.idx || 0) + 1) + (n ? " of " + n : "") + ", " + SS.plural((p.answers || []).length, "answer") + " so far.";
    }
    const R = (r.state && r.state.R) || {}, a = (R.answered || []).length, lim = r.opts && r.opts.limit;
    return SS.plural(a, "question") + " answered" + (lim ? " of " + lim : "") + ".";
  }
  function runCard(r) {
    const course = ST.cat.courses.find((x) => x.id === r.courseId), what = runWhat(r), name = what + ", " + course.name + " · " + r.unitName;
    let armed = false;
    const resume = SS.btn("Resume", "button-primary", () => resumeRun(r));
    const del = SS.btn("Discard", "button-secondary", () => {
      if (!armed) { armed = true; del.textContent = "Click again to discard"; return; }
      S().clearRun(r.key); renderResume(); announce("Discarded: " + name + ". Answers you submitted are still in your results.");
      const f = $("c-resume").querySelector("button") || inp; f.focus();
    });
    resume.setAttribute("aria-label", "Resume " + name); del.setAttribute("aria-label", "Discard " + name);
    return h("li", "card", h("p", null, h("b", null, what), " · " + course.name + " · " + r.unitName),
      h("p", "why", runProgress(r) + " Saved " + when(r.updated) + "."), h("div", "button-row", resume, del));
  }
  // Courses that have practice tests, as one-click starting points (the search still lists every course).
  function renderQuick() {
    const box = $("c-quick"); if (!box || !ST.cat) return;
    const order = ST.cat.priorityOrder || [], rank = (c) => (order.includes(c.id) ? order.indexOf(c.id) : order.length);
    const cs = ST.cat.courses.filter((c) => nTests(c) > 0).sort((a, b) => rank(a) - rank(b));
    box.replaceChildren(...(cs.length ? [h("h3", null, "Courses with practice tests"),
      h("ul", "quick-list", cs.map((c) => {
        const b = SS.btn(c.name, "button-secondary", () => chooseCourse(c, () => unitSel.focus()));
        b.setAttribute("aria-label", c.name + ": " + SS.plural(nTests(c), "unit practice test"));
        return h("li", null, b, h("span", "why", SS.plural(nTests(c), "unit practice test") + " in " + SS.plural(c.summary.units, "unit")));
      }))] : []));
  }
  function renderResume() {
    const c = S().P.ctx, box = $("c-resume"); box.replaceChildren();
    if (!ST.cat) return;
    renderQuick();
    if (!S().available) box.append(h("p", "notice", "This browser is not letting StudySprint save progress (for example, some private windows block it). Your answers count while this page is open, but they will be lost when you close it. Use My data to download a backup before you leave."));
    const runs = S().runs().filter((r) => ST.cat.courses.some((x) => x.id === r.courseId) && r.unitName);
    if (runs.length) box.append(h("h3", null, "Unfinished practice"), h("ul", "res-list", runs.map(runCard)));
    if (!c || !c.courseId || !c.unitId) return;
    const course = ST.cat.courses.find((x) => x.id === c.courseId); if (!course) return;
    box.append(SS.btn("Continue where you left off: " + course.name + " · " + c.unitName, "button-secondary",
      () => chooseCourse(course, () => { if (ST.cdata.units.some((u) => u.id === c.unitId)) { unitSel.value = c.unitId; openUnit(course, ST.cdata, c.unitId); } })));
  }
  function resumeRun(r) {
    const course = ST.cat.courses.find((x) => x.id === r.courseId); if (!course) return;
    chooseCourse(course, () => {
      if (!ST.cdata.units.some((u) => u.id === r.unitId)) { S().clearRun(r.key); renderResume(); return; }
      unitSel.value = r.unitId;
      openUnit(course, ST.cdata, r.unitId, () => continueRun(r.key));
    });
  }
  function continueRun(key) {
    const run = S().getRun(key); if (!run || !ST.unit || run.unitKey !== ST.unit.key) return;
    if (run.kind === "planner") { $("v-planner").replaceChildren(); renderPlanner(); return; }
    if (run.kind === "test") {
      const t = (ST.unit.tests || []).find((x) => run.test && x.id === run.test.testId);
      if (!t) { S().clearRun(key); showOverview(); return; }
      startTest(t, { saved: run.test }); announce(t.title + " restored where you left off."); return;
    }
    const o = run.opts || {};
    ST.practice = { key: ST.unit.key };
    startPractice({ limit: o.limit, topicIds: o.topicIds, range: o.range, title: o.title, queue: o.review ? [] : null, saved: run.state });
    go("practice", true);
    announce("Practice set restored.");
  }
  // After a page refresh, reopen the same unit and view, and continue an unfinished set there.
  function isReload() {
    try { const n = performance.getEntriesByType("navigation")[0]; return n ? n.type === "reload" : !!(performance.navigation && performance.navigation.type === 1); }
    catch (e) { return false; }
  }
  function autoResume() {
    const c = S().P.ctx;
    if (!isReload() || !c || !c.courseId || !c.unitId || !UNIT_VIEWS.includes(c.view)) return;
    const course = ST.cat.courses.find((x) => x.id === c.courseId); if (!course) return;
    const view = c.view;
    chooseCourse(course, () => {
      if (!ST.cdata.units.some((u) => u.id === c.unitId)) return;
      unitSel.value = c.unitId;
      openUnit(course, ST.cdata, c.unitId, () => {
        if (!ST.unit) return;
        const run = view === "practice" || view === "test" ? S().getRun(view + "|" + ST.unit.key) : null;
        if (run) continueRun(run.key);
        else if (view === "test") { if (!showSavedResult(c.testId)) showOverview(); }
        else if (view !== "overview") open(view);
      });
    });
  }

  /* ---------- opening a unit ---------- */
  // then(): called after the unit opens (used when resuming). If the unit's file cannot be loaded, an error with
  // "Try again" is shown and nothing pretends the unit has no content.
  async function openUnit(course, cd, uid, then) {
    const meta = cd.units.find((u) => u.id === uid);
    if (!meta) return;
    let data = null;
    if (meta.file) {
      busy("Loading " + meta.name + "…"); goBtn.disabled = true;
      const token = (ST.token = {});
      data = await SS.data.unit(course.id, uid);
      if (ST.token !== token) return;
      busy(""); goBtn.disabled = !unitSel.value;
      if (!data || !Array.isArray(data.questions) || !Array.isArray(data.topics) || !data.guide) {
        showError("The study content for " + course.name + " · " + meta.name + " could not be loaded. Your progress is safe. Check your connection, then try again.",
          () => openUnit(course, cd, uid, then));
        return;
      }
      data.key = course.id + "/" + uid;
    }
    showError(null);
    setUnit(meta, data);
    if (then) then();
  }
  function setUnit(meta, data) {
    SS.testing.close(true); // an open test is saved, so it can be resumed from its unit or the home page
    ST.unitMeta = meta; ST.unit = data; ST.practice = null; ST.learnKey = null; ST.learnFrom = null; ST.testBack = null;
    ["practice", "planner", "learn", "test"].forEach((v) => $("v-" + v).replaceChildren());
    S().setCtx({ courseId: ST.course.id, unitId: meta ? meta.id : null, unitName: meta ? meta.name : null, topics: null });
    showOverview();
  }

  /* ---------- helpers shared by views ---------- */
  function isReady(u) {
    const mc = u.questions.filter((q) => q.type === "multiple-choice");
    return !!u.guide && u.guide.sections.length >= 3 && mc.length >= 8 && SS.LV.every((l) => mc.some((q) => q.difficulty === l));
  }
  function srcLine(s) {
    return h("p", "note", "Source: ", s.sourceUrl ? SS.link(s.sourceUrl, s.sourceTitle || s.sourceUrl) : "n/a", ". Rights: " + s.licenseOrRights + " Type: " + s.sourceType + (s.isOriginal ? " (original)" : "") + ". Verified " + s.verified + ".");
  }
  function sectionEl(sec, withPractice) {
    return h("div", "guide-sec", h("h3", null, sec.title),
      sec.body.map((p) => h("p", null, p)),
      sec.points ? h("ul", null, sec.points.map((p) => h("li", null, p))) : null,
      sec.equations ? h("ul", null, sec.equations.map(([e, d]) => h("li", null, h("span", "eq", e), " — " + d))) : null,
      withPractice !== false ? SS.btn("Practice this concept", "button-secondary", () => startFocused(sec.topicId)) : null);
  }
  function statsGrid(st) {
    return h("div", "stats", SS.statBox(st.n + " of " + st.total, "questions attempted"),
      SS.statBox(st.ok + " of " + st.n, "first attempts correct" + (st.n ? " (" + SS.pct(st.ok, st.n) + "%)" : "")),
      SS.statBox(st.rc + " of " + st.rt, "retries correct"), SS.statBox(String(st.rev), "questions to review"));
  }
  // Tables keep their header labels on each cell, so on a phone they stack into cards instead of scrolling sideways.
  // Explicit roles keep them readable as tables when the stacked layout changes their display type.
  function table(caption, heads, rows) {
    const role = (el, r) => { el.setAttribute("role", r); return el; };
    return h("div", "tbl", role(h("table", null, caption ? h("caption", "why", caption) : null,
      role(h("thead", null, role(h("tr", null, heads.map((x) => { const th = role(h("th", null, x), "columnheader"); th.scope = "col"; return th; })), "row")), "rowgroup"),
      role(h("tbody", null, rows.map((r) => role(h("tr", null, r.map((c, i) => { const td = role(h("td", null, c), "cell"); td.setAttribute("data-label", heads[i]); return td; })), "row"))), "rowgroup")), "table"));
  }
  function conceptTable(unit) {
    const ts = Object.values(A().topicStats(unit));
    return table("Results for each concept in this unit, from answers submitted on this device.", ["Concept", "First attempts correct", "Retries correct", "To review", "Note"],
      ts.map((t) => [t.name, t.ok + " of " + t.n + " (of " + t.total + " questions)", t.rc + " of " + t.rt, String(t.rev),
        t.rev > 0 || (t.n >= 2 && t.ok / t.n < 0.6) ? "Needs more practice" : t.n === 0 ? "Not attempted yet" : "—"]));
  }
  function evidenceBlock(unit) {
    const ev = A().evidence(unit);
    return h("div", null, h("p", null, h("b", null, "Practice evidence: " + ev.label + ". "), ev.detail),
      h("details", "def", h("summary", null, "How the evidence label is defined"), h("p", null, A().EVIDENCE_DEF)));
  }
  function summaryBlock(unit, sum) {
    const st = A().unitStats(unit), box = h("div");
    if (sum) {
      const top = Object.entries(sum.misses).sort((a, b) => b[1] - a[1]).slice(0, 2);
      box.append(h("h3", null, "This set"),
        h("div", "stats", SS.statBox(String(sum.distinct), "different questions answered"),
          SS.statBox(sum.firstOk + " of " + sum.first, "first attempts correct" + (sum.first ? " (" + SS.pct(sum.firstOk, sum.first) + "%)" : "")),
          SS.statBox(sum.retryOk + " of " + sum.retries, "retries correct"), SS.statBox(A().levelName(unit), "current adaptive level")),
        h("p", null, top.length ? "Concepts with the most missed first attempts in this set: " + top.map(([id, n]) => topicName(id) + " (" + n + ")").join(", ") + "." : "No missed first attempts in this set."));
    }
    box.append(h("h3", null, "Unit totals on this device"), statsGrid(st), evidenceBlock(unit), h("h3", null, "By concept"), conceptTable(unit));
    return box;
  }

  /* ---------- overview ---------- */
  function showOverview() {
    const host = $("v-overview"), c = ST.course, u = ST.unit, meta = ST.unitMeta;
    const kids = [h("p", "eyebrow", c.name), h("h2", null, meta ? meta.name : "Course overview")];
    const links = h("p", "note", "Official College Board pages: ", SS.link(c.frqHubUrl, "released free-response questions for this course"), ", ",
      ST.cdata && ST.cdata.officialUrl ? [SS.link(ST.cdata.officialUrl, "course page"), ", "] : null,
      ST.cdata && ST.cdata.frameworkUrl ? [SS.link(ST.cdata.frameworkUrl, "course framework or description"), ", "] : null,
      SS.link("https://apcentral.collegeboard.org/courses", "AP course list"), ".");
    if (!u) {
      kids.push(h("p", "notice", meta ? STATUS.outline + ". StudySprint has not written a study guide or verified questions for this unit yet, so it does not offer them." : "This course is in the catalog, but StudySprint has no verified unit outline or study content for it yet."));
      if (meta && meta.officialTopics.length) kids.push(h("h3", null, "Official topics for this unit"), h("ul", null, meta.officialTopics.map((t) => h("li", null, t))), h("p", "why", "Topic names come from College Board's course page, checked " + ST.cdata.source.verified + "."));
      kids.push(links);
      host.replaceChildren(h("div", "panel", kids));
      go("overview"); return;
    }
    const ready = isReady(u), st = A().unitStats(u);
    kids.push(h("p", null, h("span", "chip" + (ready ? " ok" : ""), ready ? "Practice-ready" : "Study content in progress"),
      h("span", "chip", u.guide.sections.length + " guide sections"),
      h("span", "chip", SS.plural(u.questions.length, "scored question")),
      h("span", "chip", SS.plural(u.videos.length, "video link"))));
    kids.push(testLibrary(u));
    const mk = (t, s, fn) => { const b = h("button", "button button-secondary", h("b", null, t), h("small", null, s)); b.type = "button"; b.onclick = () => fn(); return b; };
    kids.push(h("h3", null, "More ways to study this unit"),
      h("p", "why", "Use these before a test if the unit is new to you, or after one to work on what you missed."),
      h("div", "cards",
        mk("Learn first (optional)", "Confidence check, 3-question warm-up, resources", renderLearn),
        mk("Study guide", "Original notes for each concept", renderGuide),
        mk("Adaptive practice", "One question at a time, with feedback after each", renderPractice),
        mk("Review plan", "A timed session built from your results", renderPlanner),
        mk("Videos", SS.plural(u.videos.length, "curated link"), renderVideos),
        mk("Official FRQs", "College Board links", renderFrqs)));
    kids.push(h("h3", null, "Your progress on this unit"), statsGrid(st), evidenceBlock(u),
      SS.btn("See results and review queue", "button-secondary", renderResults));
    if (u.officialTopicsNotYetCovered.length) kids.push(h("p", "note", "Official topics not covered yet in StudySprint: " + u.officialTopicsNotYetCovered.join("; ") + "."));
    kids.push(links);
    host.replaceChildren(h("div", "panel", kids));
    go("overview");
  }

  /* ---------- practice tests ----------
     A unit's tests come from its file ("tests"). The build guarantees each one has enough questions, covers every topic
     and level, and shares no question with another test, so the page can say plainly how much practice is available. */
  const testRules = () => (ST.cat && ST.cat.practiceTests) || { minQuestions: 8, minutesPerQuestion: 2 };
  function testLibrary(u) {
    const tests = u.tests || [], box = h("section", "test-lib", h("h3", null, "Practice tests"));
    box.id = "test-lib";
    if (!tests.length) {
      box.append(h("p", "notice", "No practice test is available for this unit yet, because a test needs at least " + testRules().minQuestions + " original questions covering every topic and difficulty level. Adaptive practice uses this unit's " + SS.plural(u.questions.length, "question") + " now."),
        SS.btn("Start adaptive practice", "button-primary", renderPractice));
      return box;
    }
    const run = S().getRun("test|" + u.key), inTests = new Set([].concat(...tests.map((t) => t.questionIds)));
    const left = u.questions.length - inTests.size;
    box.append(h("p", null, "Each test is a short unit test of StudySprint's own original questions, not a full AP exam. Take it untimed, or timed at " +
        testRules().minutesPerQuestion + " minutes per question (StudySprint's own pacing, not an official AP time limit). You see your score, explanations, and what to review after you submit."),
      h("ul", "res-list test-cards", tests.map((t) => testCard(u, t, run))),
      h("p", "why", tests.length === 1
        ? "This unit has one practice test so far. Its question bank has " + SS.plural(u.questions.length, "question") + (left ? "; the " + SS.plural(left, "question") + " not in the test " + (left === 1 ? "appears" : "appear") + " in adaptive practice" : ", and all of them are in this test") +
          ". A second test needs different questions, so one will be added only when more original questions are written. Retaking this test shows the same questions in a new order."
        : "These " + tests.length + " tests share no questions, so each one is a different set." + (left ? " " + SS.plural(left, "question") + " not in any test " + (left === 1 ? "appears" : "appear") + " in adaptive practice." : "")));
    return box;
  }
  function testCard(u, t, run) {
    const qs = t.questionIds.map((id) => u.questions.find((q) => q.id === id)).filter(Boolean);
    const rec = (S().unit(u.key).tests || {})[t.id], mine = run && run.test && run.test.testId === t.id ? run : null;
    const lvs = SS.LV.map((l) => qs.filter((q) => q.difficulty === l).length + " " + l).join(" · ");
    const num = qs.filter((q) => q.type === "numeric").length, nTop = new Set(qs.map((q) => q.topicId)).size;
    const mins = qs.length * testRules().minutesPerQuestion;
    const kids = [h("h4", null, t.title),
      h("p", null, h("span", "chip", SS.plural(qs.length, "question")), h("span", "chip", "All " + nTop + " concepts in this unit"),
        num ? h("span", "chip", num + " numeric-answer") : null),
      h("p", "why", "Difficulty mix: " + lvs + "."),
      h("p", null, rec ? "Last submitted " + new Date(rec.t).toLocaleDateString() + ": " + rec.score + " of " + rec.total + " correct (" + SS.pct(rec.score, rec.total) + "%). Submitted " + SS.plural(rec.n, "time") + "." : "Not taken yet.")];
    const row = h("div", "button-row");
    if (mine) {
      let armed = false;
      const del = SS.btn("Discard", "button-secondary", () => {
        if (!armed) { armed = true; del.textContent = "Click again to discard"; return; }
        S().clearRun(mine.key); showOverview(); announce("Unfinished test discarded. Nothing from it was scored.");
      });
      del.setAttribute("aria-label", "Discard unfinished " + t.title);
      kids.push(h("p", "notice", "In progress: " + runProgress(mine) + " Nothing is scored until you submit."));
      row.append(SS.btn("Resume " + t.title, "button-primary", () => continueRun(mine.key)), del);
    } else {
      const a = SS.btn("Start untimed", "button-primary", () => startTest(t, { timed: false }));
      const b = SS.btn("Start timed (" + mins + " min)", "button-secondary", () => startTest(t, { timed: true }));
      a.setAttribute("aria-label", "Start " + t.title + " untimed"); b.setAttribute("aria-label", "Start " + t.title + " timed, " + mins + " minutes");
      row.append(a, b);
      if (run) kids.push(h("p", "why", "Starting this test replaces your unfinished " + (run.title || "test") + "."));
    }
    if (rec && Array.isArray(rec.items)) { const r = SS.btn("Review last attempt", "button-secondary", () => showSavedResult(t.id)); r.setAttribute("aria-label", "Review your last attempt at " + t.title); row.append(r); }
    kids.push(row);
    return h("li", "card", kids);
  }
  function startTest(t, o) {
    const u = ST.unit, key = "test|" + u.key;
    ST.testBack = null;
    S().setCtx({ testId: t.id });
    $("v-test").replaceChildren();
    go("test", false); // show the view first, so the first question can take focus
    SS.testing.start($("v-test"), { unit: u, courseName: ST.course.name, unitName: ST.unitMeta.name, rules: testRules(), announce,
      persist: (state) => S().setRun(key, runInfo("test", { title: t.title, test: state })), clearRun: () => S().clearRun(key),
      exit: () => { SS.testing.close(true); $("v-test").replaceChildren(); showOverview(); announce(t.title + " is saved. Resume it from this unit's tests or the home page."); },
      submitted: (test, rec) => { showTestResult(test, rec); announce(test.title + " submitted: " + rec.score + " of " + rec.total + " correct."); } }, t, o);
    updateCtx(); window.scrollTo(0, 0);
  }
  function showTestResult(test, rec) {
    const u = ST.unit;
    ST.testBack = test.id;
    S().setCtx({ testId: test.id });
    SS.testing.results($("v-test"), { unit: u, courseName: ST.course.name, unitName: ST.unitMeta.name, table, topicName, tests: (u.tests || []).length, announce,
      back: showOverview, retake: () => startTest(test, { timed: rec.timed }), unitResults: renderResults,
      retry: (qs) => { renderPractice(); startPractice({ queue: SS.shuffle(qs.slice()), title: "Retry missed questions: " + test.title }); },
      plan: (seed) => renderPlanner(seed), learn: () => renderLearn(), focused: startFocused }, test, rec);
    go("test");
  }
  // The last submission of a test is kept, so its results and explanations can be opened again (and survive a refresh).
  function showSavedResult(testId) {
    const t = ST.unit && (ST.unit.tests || []).find((x) => x.id === testId);
    const rec = t && (S().unit(ST.unit.key).tests || {})[testId];
    if (!rec || !Array.isArray(rec.items)) return false;
    showTestResult(t, rec); return true;
  }

  /* ---------- guide ---------- */
  function renderGuide() {
    const g = ST.unit.guide, host = $("v-guide");
    host.replaceChildren(h("div", "panel prose", h("h2", null, g.title), h("p", null, g.intro),
      h("p", "why", "Jump to: ", g.sections.map((s) => [h("a", null, s.title), " "]).map((x, i) => { x[0].href = "#guide-" + g.sections[i].id; x[0].onclick = (e) => { e.preventDefault(); const t = $("guide-" + g.sections[i].id); t.tabIndex = -1; t.focus(); t.scrollIntoView(); }; return x; })),
      g.sections.map((s) => { const el = sectionEl(s); el.querySelector("h3").id = "guide-" + s.id; return el; }),
      g.equationNote ? h("p", "note", g.equationNote) : null,
      h("h3", null, "Worked example"), h("p", null, g.example.prompt), h("p", null, g.example.solution),
      h("h3", null, "Common misconceptions"), h("ul", null, g.misconceptions.map(([m, x]) => h("li", null, h("b", null, m), " " + x))),
      h("h3", null, "Sources"), h("ul", null, g.links.map((l) => h("li", null, SS.link(l.url, l.title)))), srcLine(g),
      SS.btn("Practice this unit", "button-primary", renderPractice)));
    go("guide");
  }

  /* ---------- videos and official FRQs ---------- */
  function renderVideos() {
    const u = ST.unit, host = $("v-videos");
    host.replaceChildren(h("div", "panel", h("h2", null, "Videos: " + u.title),
      h("p", null, "Links open the creator's site in a new tab. StudySprint does not embed or copy them."),
      u.videos.length ? u.videos.map((v) => h("div", "card", h("h3", null, v.title), h("p", null, h("span", "chip" + (v.scope === "unit" ? " ok" : ""), scopeLabel(v)), "By " + v.creator), h("p", null, SS.link(v.url, "Open link (new tab)")), v.note ? h("p", null, v.note) : null,
        h("p", "note", "Source: ", SS.link(v.sourceUrl, v.sourceTitle), ". Rights: " + v.licenseOrRights + " Verified " + v.verified + ".")))
        : h("p", "notice", "No verified video links for this unit yet. StudySprint only lists videos it has confirmed exist.")));
    go("videos");
  }
  function renderFrqs() {
    const host = $("v-frqs"), u = ST.unit, fr = (ST.cdata && ST.cdata.frq) || { hubUrl: ST.course.frqHubUrl };
    const kids = [h("h2", null, "Official free-response questions"),
      h("p", null, "These are College Board's own released questions. StudySprint links to them and never copies, rehosts, or sends them to an AI service. It is not affiliated with College Board.")];
    kids.push(h("div", "card", h("h3", null, ST.course.name + ": past exam questions"), h("p", null, SS.link(fr.hubUrl, "Open College Board's released questions and scoring information")),
      fr.note ? h("p", null, fr.note) : null,
      fr.releasedSets && fr.releasedSets.length ? [h("h4", null, "Released free-response sets (whole exams)"),
        h("ul", null, fr.releasedSets.map((x) => h("li", null, SS.link(x.url, x.title + " (PDF, College Board)")))),
        fr.setsNote ? h("p", "why", fr.setsNote) : null] : null));
    if (u && u.frqs.length) {
      kids.push(h("h3", null, "Related to " + u.title), u.frqs.map((f) => h("div", "card", h("h4", null, f.year + " · " + f.title), h("p", null, "Topic tag: " + f.topicTag + ". Match: " + f.match + "."), h("p", null, SS.link(f.url, "Question (College Board)"), f.scoringUrl ? [" · ", SS.link(f.scoringUrl, "Scoring information (College Board)")] : null))));
    } else if (u) {
      kids.push(h("h3", null, "Related to " + u.title), h("p", "notice", u.frqNote));
    }
    host.replaceChildren(h("div", "panel", kids));
    go("frqs");
  }

  /* ---------- practice ---------- */
  function renderPractice() {
    if (!ST.practice) { ST.practice = { key: ST.unit.key }; practiceSetup(); }
    go("practice", true);
  }
  const runInfo = (kind, extra) => Object.assign({ kind, unitKey: ST.unit.key, courseId: ST.course.id, unitId: ST.unitMeta.id, unitName: ST.unitMeta.name }, extra);
  function practiceSetup() {
    const unit = ST.unit, host = $("v-practice"), U = S().unit(unit.key), st = A().unitStats(unit);
    const sel = (id, opts, val) => { const s = h("select"); s.id = id; opts.forEach(([v, t]) => { const o = h("option", null, t); o.value = v; o.selected = String(v) === String(val); s.append(o); }); return s; };
    const size = sel("p-size", [[5, "5 questions"], [8, "8 questions"], [10, "10 questions"]], 8);
    const lvOpts = SS.LV.map((l, i) => [i, SS.cap(l)]);
    const from = sel("p-from", lvOpts, U.pref[0]), to = sel("p-to", lvOpts, U.pref[1]);
    const focus = sel("p-focus", [["", "All concepts (weaker ones come up more often)"]].concat(unit.topics.map((t) => [t.id, t.name])), "");
    const msgEl = h("p", "form-message"); msgEl.setAttribute("role", "status");
    const lab = (el, text) => { const l = h("label", null, text); l.htmlFor = el.id; return h("div", "form-field", l, el); };
    const startBtn = SS.btn("Start practice", "button-primary", () => {
      let a = +from.value, b = +to.value; if (a > b) { b = a; to.value = String(b); }
      U.pref = [a, b]; S().save();
      startPractice({ limit: +size.value, topicIds: focus.value ? [focus.value] : null });
    });
    const rev = unit.questions.filter(S().needs);
    const saved = S().getRun("practice|" + unit.key);
    let unfinished = null;
    if (saved) {
      let armed = false;
      const del = SS.btn("Discard it", "button-secondary", () => {
        if (!armed) { armed = true; del.textContent = "Click again to discard"; return; }
        S().clearRun(saved.key); unfinished.remove(); announce("Unfinished set discarded. Answers you submitted are still in your results."); startBtn.focus();
      });
      unfinished = h("div", "notice", h("p", null, "You have an unfinished set: " + runWhat(saved) + ". " + runProgress(saved) + " Starting a new set replaces it."),
        h("div", "button-row", SS.btn("Resume the unfinished set", "button-primary", () => continueRun(saved.key)), del));
    }
    const lf = U.warmup ? "Last warm-up: " + U.warmup.correct + " of " + U.warmup.total + " correct." : "Rate your confidence and take a 3-question easy warm-up before adaptive practice.";
    host.replaceChildren(h("div", "panel", h("h2", null, "Practice: " + unit.title), unfinished,
      h("div", "learn-offer", h("p", null, h("b", null, "New to this unit or unsure? "), "Learn first is optional. " + lf),
        SS.btn("Open Learn first", "button-secondary", () => renderLearn())),
      h("p", null, SS.plural(st.total, "question") + " in this unit. " + st.n + " attempted so far, " + st.rev + " to review. Answers and explanations appear only after you submit."),
      h("p", "why", A().levelLine(unit)),
      h("div", "range-row", lab(size, "Set size"), lab(from, "Easiest level to include"), lab(to, "Hardest level to include")),
      lab(focus, "Concept focus"),
      h("div", "button-row", startBtn,
        rev.length ? SS.btn("Review missed questions (" + rev.length + ")", "button-secondary", () => startPractice({ queue: SS.shuffle(rev.slice()), title: "Review missed questions" })) : null),
      msgEl,
      h("details", "def", h("summary", null, "How questions are chosen"),
        h("ul", null,
          h("li", null, "Questions are randomized and are not repeated until the questions available to you have been used."),
          h("li", null, "Practice starts at the standard level. Two correct first attempts in a row move you up a level. Two wrong first attempts in a row move you down a level. Retries never change your level."),
          h("li", null, "After a wrong first attempt you get a different question on the same concept at the same or next-lower level, as long as one is still unused in this round; questions are never repeated early just to do this. The missed question goes to your review queue and comes back later, after other questions."),
          h("li", null, "Concepts where you have missed more come up more often, but other concepts are still mixed in."),
          h("li", null, "Your preferred range limits the level. If no unused question exists at the level wanted, the nearest level is used and the page says so."))),
      (unit.sets || []).length ? null : h("p", "note", "Questions: ", SS.link(unit.questions[0].sourceUrl, "scope source"), ". " + unit.questions[0].licenseOrRights)));
  }
  // o.saved: a set saved earlier (after a page refresh) to continue instead of starting a new one.
  function startPractice(o) {
    const unit = ST.unit, host = $("v-practice"), box = h("div"), key = "practice|" + unit.key;
    const opts = { limit: o.limit || null, topicIds: o.topicIds || null, range: o.range || null, title: o.title || null, review: !!o.queue };
    host.replaceChildren(h("div", "panel", h("h2", null, o.title || "Practice: " + unit.title),
      S().available ? h("p", "why", "Your place in this set is saved on this device, so refreshing the page will not lose it.") : null, box));
    const r = SS.runner(box, unit, { limit: o.limit, topicIds: o.topicIds, queue: o.queue, followUps: !o.queue, allowEnd: !o.queue, range: o.range,
      onStruggle: () => renderLearn({ reason: "struggle", from: "practice" }),
      onChange: (st) => { if (st.stage === "ended") S().clearRun(key); else S().setRun(key, runInfo("practice", { opts, state: st })); },
      onEnd: (sum) => practiceEnd(sum) });
    if (!ST.practice) ST.practice = { key: unit.key };
    ST.practice.runner = r;
    if (o.saved) r.resume(o.saved); else r.start();
    go("practice", false);
  }
  function practiceEnd(sum) {
    const unit = ST.unit, host = $("v-practice"), w = A().weakest(unit);
    const rev = unit.questions.filter(S().needs);
    host.replaceChildren(h("div", "panel", h("h2", null, "Set results"), summaryBlock(unit, sum),
      h("div", "fb-actions",
        w ? SS.btn("Continue practicing: " + w.topic.name, "button-primary", () => startFocused(w.topic.id)) : null,
        rev.length ? SS.btn("Review missed questions (" + rev.length + ")", "button-secondary", () => startPractice({ queue: SS.shuffle(rev.slice()), title: "Review missed questions" })) : null,
        SS.btn("Practice options", "button-secondary", practiceSetup),
        SS.btn("Unit results", "button-secondary", renderResults),
        ST.testBack && $("v-test").childNodes.length ? SS.btn("Back to test results", "button-secondary", () => go("test")) : null)));
    const hd = host.querySelector("h2"); hd.tabIndex = -1; hd.focus();
  }
  // Easier practice: introductory and standard questions only for this set, starting at the introductory level.
  function startEasier() {
    if (!ST.practice) ST.practice = { key: ST.unit.key };
    const U = S().unit(ST.unit.key), moved = U.level > 0;
    U.level = 0; U.streak = 0; U.wrong = 0; S().save();
    startPractice({ limit: 5, range: [0, 1], title: "Easier practice: " + ST.unit.title });
    if (moved) announce("Adaptive level set to introductory for easier practice. It rises again after two correct first attempts in a row.");
    go("practice", true);
  }
  function startFocused(topicId) {
    if (!ST.practice) ST.practice = { key: ST.unit.key };
    startPractice({ limit: 5, topicIds: [topicId], title: "Practice: " + topicName(topicId) });
    go("practice", true);
  }

  /* ---------- planner ---------- */
  // seed: from a practice test's results (missed concepts, suggested length, confidence); rebuilds the planner with it.
  async function renderPlanner(seed) {
    const host = $("v-planner");
    seed = seed && seed.note ? seed : null;
    if (seed) host.replaceChildren();
    if (!host.childNodes.length) {
      if (!ST.pcfg) { busy("Loading the study planner…"); ST.pcfg = await SS.data.planner(); busy(""); }
      if (!ST.pcfg) {
        host.replaceChildren(h("div", "panel", h("h2", null, "Study planner"), h("p", "notice", "The planner settings could not be loaded. Your progress is safe. Check your connection and try again." + (SS.data.lastError ? " (Technical detail: " + SS.data.lastError + ".)" : "")),
          SS.btn("Try again", "button-primary", () => { host.replaceChildren(); renderPlanner(); })));
        go("planner"); return;
      }
      const key = "planner|" + ST.unit.key, saved = S().getRun(key);
      SS.planner.mount(host, { unit: ST.unit, courseName: ST.course.name, go: (v) => open(v), sectionEl, startFocused, announce, seed,
        saveCtx: (o) => S().setCtx(o), openLearn: () => renderLearn({ reason: "struggle", from: "planner" }),
        persist: (state) => S().setRun(key, runInfo("planner", { planner: state })), clearRun: () => S().clearRun(key) }, ST.pcfg, saved && saved.planner);
    }
    go("planner");
  }

  /* ---------- Learn first (optional) ----------
     Confidence rating (1 to 5, self-reported, never counted as evidence), a 3-question easy warm-up, and a panel of
     verified learning resources. Resources are recommended when the rating is 1 or 2 and no more than 1 of the 3
     warm-up questions is correct. They are also offered after two wrong first attempts in a row anywhere in practice.
     Warm-up answers are ordinary submitted answers: first attempts count toward first-attempt results as usual. */
  const KIND = { video: "Video", "lesson page": "Lesson page", practice: "Practice exercise", reading: "Textbook section", "collection page": "Collection page", textbook: "Textbook", "course page": "Course overview" };
  function scopeLabel(r) { return (r.scope === "unit" ? "Unit-specific " : "General ") + (KIND[r.kind] || "link").toLowerCase(); }
  function learnItems(unit) {
    const seen = new Set(), all = [];
    [].concat(unit.learnResources || [], unit.videos || [], (ST.cdata && ST.cdata.generalResources) || []).forEach((r) => {
      if (!r || !r.url || seen.has(r.url)) return; seen.add(r.url); all.push(r);
    });
    return { unit: all.filter((r) => r.scope === "unit"), general: all.filter((r) => r.scope !== "unit") };
  }
  function resourceCard(r) {
    return h("li", "card", h("p", null, h("span", "chip" + (r.scope === "unit" ? " ok" : ""), scopeLabel(r)), h("b", null, r.title)),
      h("p", null, SS.link(r.url, "Open " + (KIND[r.kind] || "link").toLowerCase() + " (new tab)"), " · " + (r.provider || r.creator || "")),
      r.note ? h("p", null, r.note) : null,
      h("p", "why", "Rights: " + r.licenseOrRights + " Checked " + r.verified + "."));
  }
  function pickWarmup(unit) {
    const byLv = (L) => SS.shuffle(unit.questions.filter((q) => SS.LV.indexOf(q.difficulty) === L));
    const fresh = (q) => !S().P.q[q.id];
    let pool = byLv(0); pool = pool.filter(fresh).concat(pool.filter((q) => !fresh(q)));
    if (pool.length < 3) pool = pool.concat(byLv(1).filter(fresh), byLv(1).filter((q) => !fresh(q)));
    const out = [], topics = new Set();
    pool.forEach((q) => { if (out.length < 3 && !topics.has(q.topicId)) { out.push(q); topics.add(q.topicId); } });
    pool.forEach((q) => { if (out.length < 3 && !out.includes(q)) out.push(q); });
    return out;
  }
  // o: { reason: "struggle" | "warmup", from: "practice" | "planner" }
  function renderLearn(o) {
    o = o || {};
    const unit = ST.unit, host = $("v-learn"), U = S().unit(unit.key);
    if (o.from) ST.learnFrom = o.from;
    if (ST.learnKey === unit.key && host.childNodes.length && !o.rebuild) { updateLearnBanner(o); go("learn"); return; }
    ST.learnKey = unit.key;
    const items = learnItems(unit);

    const conf = h("fieldset", "conf-scale", h("legend", null, "How confident do you feel about " + unit.title + "?"));
    const CONF = ["1 — Not at all", "2 — A little", "3 — Somewhat", "4 — Fairly", "5 — Very"];
    CONF.forEach((t, i) => {
      const r = h("input"); r.type = "radio"; r.name = "lf-conf"; r.value = String(i + 1); r.id = "lf-conf-" + (i + 1);
      if (U.conf && U.conf.value === i + 1) r.checked = true;
      r.onchange = () => { U.conf = { value: i + 1, t: Date.now() }; S().save(); confNote.textContent = "Saved: " + t + ". This rating is self-reported and is never counted as evidence."; };
      const l = h("label", "choice", r, h("span", null, t)); conf.append(l);
    });
    const confNote = h("p", "why", U.conf ? "Saved earlier: " + CONF[U.conf.value - 1] + ". You can change it." : "Your rating only decides what StudySprint suggests. It is never counted as evidence.");
    confNote.setAttribute("aria-live", "polite");

    const wBox = h("div"), wErr = h("p", "form-message"); wErr.setAttribute("role", "alert");
    const wStart = SS.btn("Start the 3-question warm-up", "button-primary", () => {
      if (!U.conf) { wErr.textContent = "Choose a confidence rating first. It helps decide what to suggest."; const f = conf.querySelector("input"); if (f) f.focus(); return; }
      wErr.textContent = ""; wStart.hidden = true; startWarmup(wBox, wStart);
    });
    const banner = h("div"); banner.id = "learn-banner"; banner.setAttribute("aria-live", "polite");
    const res = h("section", null, h("h3", null, "Learning resources for this unit"),
      h("p", null, "Start with StudySprint's own review guide, then use an outside resource if you want a fuller explanation. Links open in a new tab, and none of them are copied here."),
      h("p", null, SS.btn("Read the review guide for this unit", "button-secondary", renderGuide)),
      h("h4", null, "Made for this unit"),
      items.unit.length ? h("ul", "res-list", items.unit.map(resourceCard)) : h("p", "notice", "No verified unit-specific outside resources yet. The review guide above covers this unit."),
      h("h4", null, "General resources (not specific to this unit)"),
      items.general.length ? h("ul", "res-list", items.general.map(resourceCard)) : h("p", null, "None listed."));
    res.id = "learn-resources";
    const after = h("div", "fb-actions", SS.btn("Try easier practice in this unit", "button-primary", startEasier),
      SS.btn("Go to regular practice", "button-secondary", () => renderPractice()));
    const backBox = h("div"); backBox.id = "learn-back";

    host.replaceChildren(h("div", "panel",
      h("h2", null, "Learn first: " + unit.title),
      h("p", null, "This path is optional. It helps when a unit is new to you: rate your confidence, try three easy questions, and get pointed to learning resources if you need them. Then come back here for easier practice."),
      banner, backBox,
      h("h3", null, "1. Rate your confidence"), conf, confNote,
      h("h3", null, "2. Warm-up: three easy questions"),
      h("p", null, U.warmup ? "Last warm-up: " + U.warmup.correct + " of " + U.warmup.total + " correct (" + new Date(U.warmup.t).toLocaleDateString() + "). You can take it again; repeated questions count as retries." : "Three introductory questions from this unit. Your answers count like any other practice answers."),
      wErr, wStart, wBox,
      h("h3", null, "3. Review and practice"), res,
      h("p", "why", "Easier practice uses introductory and standard questions only and starts at the introductory level. Your saved difficulty range is not changed."),
      after));
    updateLearnBanner(o);
    go("learn");
  }
  function updateLearnBanner(o) {
    const banner = $("learn-banner"), back = $("learn-back"); if (!banner) return;
    banner.replaceChildren();
    if (o.reason === "struggle") banner.append(h("p", "notice", "You missed two first attempts in a row, so here are learning resources for this unit. Take a look, then return to where you were or try easier practice."));
    if (o.reason === "recommend") banner.append(h("p", "notice", o.text));
    if (o.reason === "warmup") banner.append(h("p", "note", o.text));
    back.replaceChildren();
    if (ST.learnFrom === "practice" && $("v-practice").querySelector("form,.fb")) back.append(SS.btn("Return to your practice set", "button-secondary", () => { ST.learnFrom = null; go("practice"); }));
    if (ST.learnFrom === "planner" && $("v-planner").childNodes.length) back.append(SS.btn("Return to your study session", "button-secondary", () => { ST.learnFrom = null; go("planner"); }));
    if (o.reason) { const t = banner.firstChild; if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } }
  }
  function startWarmup(box, startBtn) {
    const unit = ST.unit, U = S().unit(unit.key), qs = pickWarmup(unit);
    if (!qs.length) { box.replaceChildren(h("p", "notice", "This unit has no easy questions to use for a warm-up yet.")); return; }
    const r = SS.runner(box, unit, { queue: qs, queueWhy: "Warm-up question (easy). It counts like any other practice answer.", followUps: false,
      onEnd: (sum) => {
        const ans = sum.answered.slice(0, 3), correct = ans.filter((a) => a.ok).length, c = U.conf ? U.conf.value : null;
        let twoWrong = false;
        const firsts = ans.filter((a) => a.first);
        for (let i = 1; i < firsts.length; i++) if (!firsts[i].ok && !firsts[i - 1].ok) twoWrong = true;
        U.warmup = { correct, total: ans.length, conf: c, t: Date.now() }; S().save();
        if (startBtn) { startBtn.hidden = false; startBtn.textContent = "Take the warm-up again"; }
        let o;
        if (c !== null && c <= 2 && correct <= 1) o = { reason: "recommend", text: "You rated your confidence " + c + " and answered " + correct + " of " + ans.length + " warm-up questions correctly. We recommend reviewing the guide or a resource below first, then trying easier practice." };
        else if (twoWrong) o = { reason: "recommend", text: "You missed two first attempts in a row in the warm-up. The resources below may help before you continue." };
        else o = { reason: "warmup", text: "Warm-up done: " + correct + " of " + ans.length + " correct. You can go on to regular practice, or use the resources below if you want." };
        box.replaceChildren(h("p", o.reason === "recommend" ? "notice" : "note", o.text),
          h("div", "fb-actions", o.reason === "recommend"
            ? SS.btn("See the learning resources", "button-primary", () => { const t = $("learn-resources"); t.tabIndex = -1; t.focus(); t.scrollIntoView(); })
            : SS.btn("Go to regular practice", "button-primary", () => renderPractice()),
            SS.btn("Try easier practice", "button-secondary", startEasier)));
        updateLearnBanner(o);
      } });
    r.start();
  }

  /* ---------- results ---------- */
  function renderResults() {
    const unit = ST.unit, host = $("v-results"), w = A().weakest(unit), rev = unit.questions.filter(S().needs);
    let armed = false;
    const reset = SS.btn("Reset progress for this unit", "button-secondary", () => {
      if (!armed) { armed = true; reset.textContent = "Click again to confirm reset"; return; }
      S().resetUnit(unit); resetViews(); renderResults();
      const n = h("div", "notice", h("p", null, "Progress for this unit was reset. A copy was kept, so you can undo this."), SS.btn("Undo reset", "button-secondary", () => { S().undo(); resetViews(); renderResults(); announce("Reset undone. Your progress for this unit is back."); }));
      $("v-results").querySelector(".panel").prepend(n); n.tabIndex = -1; n.focus();
    });
    const sessions = S().P.sess.filter((s) => s.unitKey === unit.key);
    host.replaceChildren(h("div", "panel", h("h2", null, "Results and review: " + unit.title),
      h("p", "why", "Everything here comes from answers you submitted on this device. Retries are shown separately and never raise the first-attempt numbers."),
      summaryBlock(unit, null),
      h("h3", null, "Review queue"),
      rev.length ? h("ul", null, rev.map((q) => h("li", null, (q.prompt.length > 110 ? q.prompt.slice(0, 110) + "…" : q.prompt) + " (" + topicName(q.topicId) + ")"))) : h("p", null, "No questions to review right now."),
      h("div", "fb-actions",
        w ? SS.btn("Continue practicing: " + w.topic.name, "button-primary", () => startFocused(w.topic.id)) : null,
        rev.length ? SS.btn("Review missed questions (" + rev.length + ")", "button-secondary", () => { renderPractice(); startPractice({ queue: SS.shuffle(rev.slice()), title: "Review missed questions" }); }) : null),
      sessions.length ? [h("h3", null, "Study sessions"), table("“Steps marked done” is the student's own checklist (plan completion). It is shown next to question results and never counted as evidence. Sessions saved before the 5-step checklist show “of 4”.",
        ["Date", "Minutes", "Steps marked done (self-reported)", "Questions answered", "First attempts correct", "Practice threshold"],
        sessions.map((s) => [new Date(s.t).toLocaleDateString(), String(s.minutes), s.stepsDone + " of " + (s.stepsTotal || 4), String(s.distinct), s.firstOk + " of " + s.first, s.met ? "Met" : "Not met"]))] : null,
      h("p", null, reset)));
    go("results");
  }

  /* ---------- My data: back up, restore, undo ----------
     Everything stays on this device. A backup is a JSON file the student downloads (or copies as text).
     A restore is checked first and shown as a summary; nothing changes until the student confirms,
     and the previous progress is kept so the restore can be undone. */
  function resetViews() {
    SS.testing.close(false); // progress was reset or replaced, so an open test is not saved again
    ST.practice = null; ST.learnKey = null; ST.learnFrom = null; ST.testBack = null;
    ["practice", "planner", "learn", "test"].forEach((v) => $("v-" + v).replaceChildren());
    renderResume();
  }
  const courseName = (id) => { const c = ST.cat && ST.cat.courses.find((x) => x.id === id); return c ? c.name : "Course not on this site (" + id + ")"; };
  function field(el, text, help) {
    const l = h("label", null, text); l.htmlFor = el.id;
    let hp = null;
    if (help) { hp = h("p", "field-help", help); hp.id = el.id + "-help"; el.setAttribute("aria-describedby", hp.id); }
    return h("div", "form-field", l, hp, el);
  }
  function renderData(flash) {
    const B = SS.backup, host = $("v-data"), c = B.localCounts(), snap = S().lastSnapshot();
    const kids = [h("h2", null, "My data: back up and restore"),
      h("p", null, "Your progress is saved only in this browser, on this device. StudySprint has no accounts and sends nothing anywhere. To move your progress to another browser or device, or to keep a safe copy, download a backup file and restore it later.")];
    if (!S().available) kids.push(h("p", "notice", "This browser is blocking storage, so progress will be lost when this page closes. Download a backup now to keep it."));
    else if (S().saveFailed) kids.push(h("p", "notice", "The latest change could not be saved in this browser (storage may be full). Download a backup to keep it."));
    if (flash) kids.push(flash);
    kids.push(h("h3", null, "On this device"),
      h("div", "stats", SS.statBox(String(c.questions), "Questions answered"), SS.statBox(String(c.units), "Units with progress"),
        SS.statBox(String(c.sessions), "Study sessions"), SS.statBox(String(c.runs), "Unfinished sets")));

    /* back up */
    const out = h("textarea"); out.id = "d-out"; out.readOnly = true; out.rows = 6; out.spellcheck = false;
    const outWrap = field(out, "Backup text", "Copy all of this text and keep it somewhere safe, for example in a note or an email to yourself."); outWrap.hidden = true;
    const bmsg = h("p", "why"); bmsg.setAttribute("role", "status");
    const copy = SS.btn("Copy backup text", "button-secondary", async () => {
      out.value = B.exportText();
      try { await navigator.clipboard.writeText(out.value); bmsg.textContent = "Backup text copied."; }
      catch (e) { out.focus(); out.select(); bmsg.textContent = "Copying is blocked here. The text is selected: copy it with your device's copy command."; }
    });
    copy.hidden = true;
    const dl = SS.btn("Download backup file", "button-primary", async () => {
      // Inside the claude.ai preview, files are saved through the viewer's download prompt; on a normal website, a plain download.
      if (hostDl) {
        try { await hostDl.save({ filename: B.fileName(), data: B.exportText() }); bmsg.textContent = "Backup file saved: " + B.fileName() + "."; }
        catch (e) { bmsg.textContent = e && e.code === "declined" ? "The download was cancelled. Nothing was saved." : "The file could not be saved here. Use “Show backup text” and copy it instead."; }
        return;
      }
      try {
        const url = URL.createObjectURL(new Blob([B.exportText()], { type: "application/json" })), a = h("a");
        a.href = url; a.download = B.fileName(); document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        bmsg.textContent = "Backup file prepared: " + B.fileName() + ". If no download starts, use “Show backup text” instead.";
      } catch (e) { bmsg.textContent = "Downloads are not available here. Use “Show backup text” instead."; }
    });
    const showTxt = SS.btn("Show backup text", "button-secondary", () => { out.value = B.exportText(); outWrap.hidden = false; copy.hidden = false; out.focus(); out.select(); });
    kids.push(h("h3", null, "Back up"),
      h("p", null, h("b", null, "A backup includes:")),
      h("ul", null,
        h("li", null, "Answer results: for each question you answered, whether your first try was right, and the result of each retry."),
        h("li", null, "Unit settings: your adaptive level, preferred difficulty range, the questions you have seen in the current round, your confidence rating, and your last warm-up result."),
        h("li", null, "Completed study-session history: planner sessions that reached the results step."),
        h("li", null, "Practice test history: for each practice test, how many times you submitted it and your last submission (score and answers), so you can review it again.")),
      h("p", null, h("b", null, "A backup does not include:")),
      h("ul", null,
        h("li", null, "Unfinished practice sets or planner sessions. They stay in this browser on this device and will not transfer with a backup. Answers you already submitted in them are included as answer results; only your place in the set is left behind. To keep that place, finish the set here before you move."),
        h("li", null, "Practice tests you have started but not submitted. Like unfinished sets, they stay on this device."),
        h("li", null, "The unit you last had open, or anything about you (no name or email).")),
      h("div", "button-row", dl, showTxt, copy), bmsg, outWrap);

    /* restore */
    const file = h("input"); file.type = "file"; file.id = "d-file"; file.accept = ".json,application/json,text/plain";
    const paste = h("textarea"); paste.id = "d-paste"; paste.rows = 4; paste.spellcheck = false;
    const result = h("div"); result.id = "d-review";
    const review = (text, from, early) => showReview(result, early ? { ok: false, errors: [early] } : B.parse(text), from);
    file.onchange = async () => {
      const f = file.files && file.files[0]; if (!f) return;
      if (f.size > B.MAX_BYTES) return review(null, f.name, "The file is larger than 2 MB, so it is not a StudySprint backup.");
      let text; try { text = await f.text(); } catch (e) { return review(null, f.name, "The file could not be read."); }
      review(text, "the file " + f.name);
    };
    kids.push(h("h3", null, "Restore from a backup"),
      h("p", null, "Choose a backup file, or paste backup text. You will see what it contains, and what restoring would change, before anything changes."),
      field(file, "Backup file (.json)"),
      field(paste, "Or paste backup text"),
      h("div", "button-row", SS.btn("Check pasted text", "button-secondary", () => review(paste.value, "pasted text"))),
      result);

    /* undo */
    if (snap) kids.push(h("h3", null, "Undo"),
      h("p", null, "Your progress from just before the last change (" + snap.label + ", " + when(snap.t) + ") is kept on this device."),
      h("div", "button-row", SS.btn("Undo: go back to before “" + snap.label + "”", "button-secondary", () => {
        if (!S().undo()) { renderData(h("p", "notice", "There is nothing to undo.")); return; }
        resetViews(); renderData(h("div", "notice", h("p", null, "Undone. Your progress is back to how it was before: " + snap.label + ".")));
      })));

    /* clear all */
    let armed = false;
    const clear = SS.btn("Clear all progress on this device", "button-secondary", () => {
      if (!armed) { armed = true; clear.textContent = "Click again to clear all progress"; clearNote.hidden = false; return; }
      B.clearAll(); resetViews(); renderData(h("div", "notice", h("p", null, "All progress on this device was cleared. You can undo this below.")));
    });
    const clearNote = h("p", "why", "This removes every answer, level, and session on this device. A copy is kept so you can undo it here."); clearNote.hidden = true;
    kids.push(h("h3", null, "Start fresh"), h("div", "button-row", clear), clearNote);

    host.replaceChildren(h("div", "panel", kids));
    go("data");
    if (flash) { flash.tabIndex = -1; flash.focus(); }
  }
  function showReview(box, r, from) {
    const B = SS.backup;
    if (!r.ok) {
      const err = h("div", "notice bad-note", h("p", null, h("b", null, "This backup cannot be restored. "), "Nothing on this device was changed."), h("ul", null, r.errors.map((e) => h("li", null, e))));
      err.setAttribute("role", "alert"); box.replaceChildren(err); return;
    }
    const inc = B.counts(r.clean), here = B.localCounts();
    const ov = B.overlap(r.clean);
    const mode = h("fieldset", "conf-scale modes", h("legend", null, "How to restore"));
    [["merge", "Merge (recommended): add the backup to the progress on this device. Where both have the same question or unit, the rules below decide what is kept."],
      ["replace", "Replace: use only the backup. All progress on this device is removed, including unfinished sets. Undo on this page can bring it back until your next restore, reset, or clear."]].forEach(([v, t], i) => {
      const rd = h("input"); rd.type = "radio"; rd.name = "d-mode"; rd.value = v; rd.checked = i === 0; rd.id = "d-mode-" + v; rd.onchange = upd;
      mode.append(h("label", "choice", rd, h("span", null, t)));
    });
    const after = h("p", "why"); after.setAttribute("aria-live", "polite");
    const pick = () => mode.querySelector("input:checked").value;
    const qLine = ov.qBoth
      ? " This backup and this device share " + SS.plural(ov.qBoth, "question") + ": " + ov.qFromBackup + " would use the backup's record and " + (ov.qBoth - ov.qFromBackup) + " would keep this device's."
      : " This backup shares no questions with this device.";
    const uLine = ov.uBoth
      ? " This backup and this device share " + SS.plural(ov.uBoth, "unit") + "; " + (ov.uConfOrWarmup ? ov.uConfOrWarmup + " would take a newer confidence rating or warm-up result from the backup." : "none has a newer confidence rating or warm-up result in the backup, so their settings stay as they are.")
      : " This backup shares no units with this device.";
    const rules = h("div", "merge-rules", h("p", null, h("b", null, "When the backup and this device both have…")),
      h("ul", null,
        h("li", null, h("b", null, "the same question: "), "one record is kept, not combined. It is the one with more attempts (first try plus retries). If both have the same number, the one answered more recently is kept." + qLine),
        h("li", null, h("b", null, "the same unit: "), "this device keeps its adaptive level, difficulty range, and the questions seen in the current round. Only the confidence rating and the last warm-up result can come from the backup, and only if the backup's is newer." + uLine),
        h("li", null, h("b", null, "the same practice test: "), "one history is kept for each test: the one with more submissions, or the more recent one if both have the same number."),
        h("li", null, h("b", null, "the same study session: "), "it is listed once." + (ov.sessBoth ? " " + SS.plural(ov.sessBoth, "session") + " in this backup " + (ov.sessBoth === 1 ? "is" : "are") + " already here." : "") + " History keeps the 50 most recent sessions.")),
      h("p", null, "Anything only in the backup is added. Unfinished sets on this device stay as they are."));
    rules.id = "d-merge-rules";
    function upd() {
      const m = pick(), pc = B.preview(r.clean, m);
      rules.hidden = m !== "merge";
      after.textContent = "After this " + (m === "merge" ? "merge" : "replacement") + ", this device will have " + SS.plural(pc.questions, "answered question") + ", " + SS.plural(pc.units, "unit") + " with progress, and " + SS.plural(pc.sessions, "study session") + " (now: " + here.questions + ", " + here.units + ", " + here.sessions + ")." +
        (m === "replace" && here.runs ? " " + SS.plural(here.runs, "unfinished set") + " will be discarded." : "");
    }
    upd();
    const courses = Object.entries(inc.courses).map(([id, n]) => courseName(id) + ": " + SS.plural(n, "unit"));
    const card = h("div", "card", h("h4", null, "Check before restoring"),
      h("p", null, "From " + from + (r.exportedAt ? ", made " + when(Date.parse(r.exportedAt)) : "") + ". It contains:"),
      h("ul", null, h("li", null, SS.plural(inc.questions, "answered question")), h("li", null, SS.plural(inc.units, "unit") + " with progress" + (courses.length ? " (" + courses.join("; ") + ")" : "")), h("li", null, SS.plural(inc.sessions, "completed study session"))),
      h("p", "why", "Not included: unfinished practice sets or planner sessions. Backups never carry them, so any unfinished set stays on the device where it was started."),
      r.skipped ? h("p", "notice", SS.plural(r.skipped, "entry", "entries") + " in the file could not be used and will be left out: " + r.reasons.slice(0, 4).join("; ") + ".") : null,
      mode, rules, after,
      h("div", "button-row",
        SS.btn("Restore this backup", "button-primary", () => {
          const m = pick(); B.apply(r.clean, m); resetViews();
          renderData(h("div", "notice", h("p", null, "Backup restored (" + (m === "merge" ? "merged with" : "replacing") + " the progress that was here). If this was a mistake, use Undo below.")));
          announce("Backup restored.");
        }),
        SS.btn("Cancel", "button-secondary", () => { box.replaceChildren(); $("d-file").value = ""; $("d-file").focus(); })));
    box.replaceChildren(card);
    const hd = card.querySelector("h4"); hd.tabIndex = -1; hd.focus();
  }

  // When the page runs inside the claude.ai preview, downloads go through its "downloads" capability (null elsewhere).
  let hostDl = null;
  try { if (window.claude && typeof window.claude.use === "function") window.claude.use("downloads").then((d) => { hostDl = d; }, () => {}); } catch (e) { /* not in the preview */ }

  /* ---------- boot ---------- */
  async function boot() {
    if (!booted) { try { history.replaceState({ ss: "home" }, ""); } catch (e) { /* ignore */ } updateTitle(); }
    busy("Loading the course list…"); inp.disabled = true;
    ST.cat = await SS.data.catalog();
    busy("");
    if (!ST.cat || !Array.isArray(ST.cat.courses)) {
      ST.cat = null;
      showError(location.protocol === "file:"
        ? "The course list could not be loaded. Browsers block data files when index.html is opened straight from a folder, so serve the folder with a local web server (see README.md), or use the single-file version."
        : "The course list could not be loaded. Your progress is safe. Check your connection, then try again.", boot);
      return;
    }
    inp.disabled = false;
    renderResume();
    if (!booted) { booted = true; autoResume(); }
  }
  SS.ui = { go, open, sectionEl };
  boot();
})();
