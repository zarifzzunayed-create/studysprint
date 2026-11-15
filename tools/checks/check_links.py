#!/usr/bin/env python3
"""Check every outside link in the data files (needs internet).

    python3 tools/checks/check_links.py            # all courses
    python3 tools/checks/check_links.py ap-biology # one course

Checked: unit "learnResources", "videos", guide links and question source pages, course "generalResources", each course's official pages, its framework PDF,
its past-exam-questions page, and every released free-response set. A link passes when it loads (HTTP 200) without
being redirected somewhere else. For an OpenStax section ("..., 3.2 Title") the page title must also contain that
section title. Sites that refuse automated requests (Khan Academy answers with a bot challenge) are listed as
UNVERIFIED rather than failed; open those by hand. Exit code 1 if any link fails.
"""
import concurrent.futures, glob, html, json, os, re, sys, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UA = {"User-Agent": "Mozilla/5.0 (StudySprint link check)"}
BOT_WALLED = ("khanacademy.org", "youtube.com", "youtu.be")
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower().replace("’", "'"))


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=45) as r:
        body = r.read(400000) if "pdf" not in (r.headers.get("Content-Type") or "") else b""
        return r.status, r.geturl(), r.headers.get("Content-Type") or "", body.decode("utf-8", "replace")


def check(item):
    where, url, title = item
    if any(h in url for h in BOT_WALLED): return ("UNVERIFIED", where, url, "site blocks automated checks")
    try:
        code, final, ctype, body = fetch(url)
    except urllib.error.HTTPError as e: return ("FAIL", where, url, "HTTP %d" % e.code)
    except Exception as e:
        if "Tunnel connection failed" in str(e): return ("UNVERIFIED", where, url, "this machine's network policy blocks the host")
        return ("FAIL", where, url, str(e)[:80])
    if code != 200: return ("FAIL", where, url, "HTTP %d" % code)
    if final.rstrip("/") != url.rstrip("/"): return ("FAIL", where, url, "redirected to " + final)
    if url.endswith(".pdf") and "pdf" not in ctype: return ("FAIL", where, url, "not a PDF: " + ctype)
    m = re.search(r", \d+\.\d+ (.*)$", title or "")
    if m and "openstax.org/books/" in url:
        t = html.unescape((re.search(r"<title>([^<]*)", body) or [None, ""])[1])
        if norm(m.group(1)) not in norm(t): return ("FAIL", where, url, "page title '%s' does not contain '%s'" % (t[:60], m.group(1)))
    return ("OK", where, url, "")


def main():
    want = sys.argv[1:]; items = []
    for cdir in sorted(glob.glob(os.path.join(ROOT, "data", "courses", "*"))):
        cid = os.path.basename(cdir)
        if want and cid not in want: continue
        c = json.load(open(os.path.join(cdir, "course.json"), encoding="utf-8"))
        for k in ("officialUrl", "studentUrl", "frameworkUrl"):
            if c.get(k): items.append((cid + " " + k, c[k], None))
        if c.get("source", {}).get("url"): items.append((cid + " source", c["source"]["url"], None))
        frq = c.get("frq") or {}
        if frq.get("hubUrl"): items.append((cid + " frq hub", frq["hubUrl"], None))
        for s in frq.get("releasedSets", []): items.append((cid + " frq " + str(s.get("year")), s["url"], None))
        for r in c.get("generalResources", []): items.append((cid + " general", r["url"], r.get("title")))
        for f in sorted(glob.glob(os.path.join(cdir, "u*.json"))):
            d = json.load(open(f, encoding="utf-8")); u = os.path.basename(f)[:-5]
            for r in d.get("learnResources", []) + d.get("videos", []): items.append((cid + " " + u, r["url"], r.get("title")))
            for r in d.get("frqs", []): items.append((cid + " " + u + " frq", r["url"], None))
            for r in (d.get("guide") or {}).get("links", []): items.append((cid + " " + u + " guide link", r["url"], None))
            for q in d["questions"]:
                if q.get("sourceUrl"): items.append((cid + " " + u + " question source", q["sourceUrl"], None))
    seen = {}; unique = []
    for it in items:
        if it[1] not in seen: seen[it[1]] = it; unique.append(it)
    with concurrent.futures.ThreadPoolExecutor(8) as ex: res = list(ex.map(check, unique))
    tally = {}
    for r in res: tally[r[0]] = tally.get(r[0], 0) + 1
    for r in res:
        if r[0] != "OK": print("%-10s %s | %s | %s" % r)
    print("links: %d unique (%d references) | %s" % (len(unique), len(items), ", ".join("%s %d" % kv for kv in sorted(tally.items()))))
    return 1 if tally.get("FAIL") else 0


if __name__ == "__main__":
    sys.exit(main())
