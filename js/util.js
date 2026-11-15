/* Small shared helpers. Everything lives on the SS namespace so the site works as plain <script> files. */
(function () {
  "use strict";
  const SS = (window.SS = window.SS || {});

  SS.$ = (id) => document.getElementById(id);

  function append(el, x) {
    if (x == null || x === false) return;
    if (Array.isArray(x)) { x.forEach((y) => append(el, y)); return; }
    el.append(x); // strings become text nodes, so content is never parsed as HTML
  }
  SS.h = function (tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  SS.link = (url, text) => { const a = SS.h("a", null, text); a.href = url; a.target = "_blank"; a.rel = "noopener"; return a; };
  SS.btn = (text, cls, fn) => { const b = SS.h("button", "button " + (cls || "button-secondary"), text); b.type = "button"; if (fn) b.onclick = fn; return b; };
  SS.statBox = (big, label) => SS.h("div", "stat", SS.h("b", null, big), SS.h("span", null, label));

  // Randomness goes through one function so tests can supply a seeded generator (window.__SS_RAND).
  SS.rand = () => (window.__SS_RAND ? window.__SS_RAND() : Math.random());
  SS.shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(SS.rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  SS.pickWeighted = (items, weight) => {
    const w = items.map((x) => Math.max(0.0001, weight(x)));
    let r = SS.rand() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };

  /* Shared stimulus: a unit may list "passages" (a reading passage, or a set of historical sources), and a question may
     point to one with "passageId". Every view that shows a question shows its passage the same way. */
  /* Optional chart on a passage ("figure"): a bar chart or a line graph drawn as inline SVG. It is one image to assistive
     technology, named by the figure's required "alt" text; the same numbers must also be in the passage text. Series are
     told apart by line pattern and a label at the line's end, never by color alone.
       { kind: "bars", alt, caption?, unit?, max, bars: [{ label, value }] }
       { kind: "lines", alt, caption?, xLabel, yLabel, xMax, yMax, series: [{ label, points: [[x, y], ...] }], guides?: [{ x?, y?, label? }] } */
  SS.figure = (f) => {
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k])); if (text != null) e.textContent = text; return e; };
    const W = 360, fmt = (v) => String(Math.round(v * 100) / 100);
    let H, kids = [];
    if (f.kind === "bars") {
      const row = 30, left = 132, right = 46, top = 8;
      H = top * 2 + row * f.bars.length;
      f.bars.forEach((b, i) => {
        const y = top + i * row, w = Math.max(1, (W - left - right) * b.value / f.max);
        kids.push(el("text", { x: left - 8, y: y + 19, "text-anchor": "end", class: "fig-text" }, b.label),
          el("rect", { x: left, y: y + 5, width: w, height: row - 10, class: "fig-bar" }),
          el("text", { x: left + w + 6, y: y + 19, class: "fig-text" }, fmt(b.value) + (f.unit || "")));
      });
      kids.push(el("line", { x1: left, y1: top, x2: left, y2: H - top, class: "fig-axis" }));
    } else {
      const left = 46, right = 64, top = 24, bottom = 40; H = 250;
      const pw = W - left - right, ph = H - top - bottom, X = (x) => left + pw * x / f.xMax, Y = (y) => top + ph * (1 - y / f.yMax);
      const dash = ["", "7 4", "2 4", "9 3 2 3"];
      kids.push(el("line", { x1: left, y1: top, x2: left, y2: top + ph, class: "fig-axis" }), el("line", { x1: left, y1: top + ph, x2: left + pw, y2: top + ph, class: "fig-axis" }),
        el("text", { x: 4, y: 14, class: "fig-text" }, f.yLabel), el("text", { x: left + pw, y: H - 6, "text-anchor": "end", class: "fig-text" }, f.xLabel));
      // A guide marks a point with dashed lines to both axes and prints its values there; with only x (or only y) it is an axis value.
      (f.guides || []).forEach((g) => {
        const hasX = typeof g.x === "number", hasY = typeof g.y === "number";
        if (hasX) kids.push(el("text", { x: X(g.x), y: top + ph + 15, "text-anchor": "middle", class: "fig-text" }, fmt(g.x)));
        if (hasY) kids.push(el("text", { x: left - 5, y: Y(g.y) + 4, "text-anchor": "end", class: "fig-text" }, fmt(g.y)));
        if (!hasX || !hasY) return;
        kids.push(el("line", { x1: X(g.x), y1: Y(g.y), x2: X(g.x), y2: top + ph, class: "fig-guide" }), el("line", { x1: left, y1: Y(g.y), x2: X(g.x), y2: Y(g.y), class: "fig-guide" }),
          el("circle", { cx: X(g.x), cy: Y(g.y), r: 3, class: "fig-dot" }));
        if (g.label) kids.push(el("text", { x: X(g.x) + 9, y: Y(g.y) + 4, class: "fig-text fig-strong" }, g.label));
      });
      f.series.forEach((s, i) => {
        const pts = s.points.map((p) => X(p[0]) + "," + Y(p[1])).join(" "), last = s.points[s.points.length - 1];
        kids.push(el("polyline", Object.assign({ points: pts, class: "fig-line" }, dash[i % 4] ? { "stroke-dasharray": dash[i % 4] } : {})),
          el("text", { x: Math.min(X(last[0]) + 5, W - 2), y: Math.min(Y(last[1]) + 4, top + ph - 7), class: "fig-text fig-strong" }, s.label));
      });
    }
    const svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": f.alt, class: "fig", focusable: "false" });
    kids.forEach((k) => svg.appendChild(k));
    return SS.h("div", "fig-wrap", svg, f.caption ? SS.h("p", "passage-src", f.caption) : null);
  };

  SS.passageOf = (unit, q) => (q && q.passageId && unit && unit.passages ? unit.passages.find((p) => p.id === q.passageId) || null : null);
  SS.passageBlock = (unit, q, collapsed) => {
    const p = SS.passageOf(unit, q);
    if (!p) return null;
    const body = [p.intro ? SS.h("p", "why", p.intro) : null, p.figure ? SS.figure(p.figure) : null, p.text.map((t) => SS.h("p", null, t)), SS.h("p", "passage-src", p.attribution)];
    if (collapsed) return SS.h("details", "passage", SS.h("summary", null, "Show " + p.title), body);
    const head = SS.h("h3", "passage-title", p.title);
    head.tabIndex = -1;
    const sec = SS.h("section", "passage", head, body);
    sec.setAttribute("aria-label", p.title);
    return sec;
  };
  // Keep questions that share a passage next to each other (in the order the first of them appears), so a test reads
  // like the exam: one passage, then its questions.
  SS.groupByPassage = (ids, byId) => {
    const out = [], done = new Set();
    ids.forEach((id) => {
      if (done.has(id)) return;
      const p = (byId(id) || {}).passageId;
      (p ? ids.filter((x) => (byId(x) || {}).passageId === p) : [id]).forEach((x) => { done.add(x); out.push(x); });
    });
    return out;
  };

  SS.norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  SS.LV = ["introductory", "standard", "challenging"];
  SS.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  SS.plural = (n, one, many) => n + " " + (n === 1 ? one : many || one + "s");
  SS.pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  SS.fmtTime = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

  // Split a total number of minutes by weights using largest remainders, so the parts always add up.
  SS.allocate = (total, weights) => {
    const exact = weights.map((w) => total * w), parts = exact.map(Math.floor);
    let rest = total - parts.reduce((a, b) => a + b, 0);
    const order = exact.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
    for (let k = 0; rest > 0; k++, rest--) parts[order[k % order.length].i]++;
    return parts;
  };
})();
