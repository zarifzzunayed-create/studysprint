/* Loads catalog and unit content. In the repository the data are JSON files fetched on demand
   (serve the folder with any static web server). In the single-file preview build, tools/build.py
   embeds the same files as window.SS_BUNDLE and nothing is fetched.

   Paths are relative ("data/..."), so the site works from a domain root or from a GitHub Pages project
   subpath such as https://name.github.io/studysprint/. tools/build.py writes a build stamp into
   <meta name="studysprint-build">; it is added to each request so a new release is not hidden by a cached file.
   A failed request is retried once and is never cached, so "Try again" really tries again. */
(function () {
  "use strict";
  const SS = window.SS;
  const cache = {};
  const meta = document.querySelector('meta[name="studysprint-build"]');
  const stamp = meta && meta.content && meta.content !== "dev" ? meta.content : "";
  const withStamp = (p) => (stamp ? p + "?v=" + encodeURIComponent(stamp) : p);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function fetchOnce(path) {
    const r = await fetch(withStamp(path));
    if (!r.ok) throw new Error("the server answered " + r.status);
    try { return await r.json(); } catch (e) { throw new Error("the file is not valid JSON"); }
  }
  async function getJSON(path) {
    if (window.SS_BUNDLE) return window.SS_BUNDLE[path] || null;
    if (cache[path]) return cache[path];
    for (let i = 0; i < 2; i++) {
      try { const d = await fetchOnce(path); cache[path] = d; api.lastError = null; return d; }
      catch (e) { api.lastError = (e && e.message) || "network error"; if (i === 0) await wait(500); }
    }
    return null;
  }

  const api = (SS.data = {
    lastError: null,
    catalog: () => getJSON("data/catalog.json"),
    planner: () => getJSON("data/planner.json"),
    course: (id) => getJSON("data/courses/" + id + "/course.json"),
    unit: (courseId, unitId) => getJSON("data/courses/" + courseId + "/" + unitId + ".json"),
  });
})();
