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
