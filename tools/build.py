#!/usr/bin/env python3
"""Validate StudySprint data, update catalog summaries, regenerate CONTENT_STATUS.md,
and build a single-file preview at dist/studysprint.html.

Run from the project root:   python3 tools/build.py
It exits with an error (and writes nothing) if any unit's declared status does not match its content,
so the status file can never claim more than the data contain.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEVELS = ["introductory", "standard", "challenging"]
MIN_MC = 8
errors = []

def load(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return json.load(f)

def err(msg):
    errors.append(msg)

def https(u):
    return isinstance(u, str) and u.startswith("https://")

def source_ok(where, o, need_url):
    for k in ("sourceType", "licenseOrRights", "verified"):
        if not o.get(k):
            err("%s: missing %s" % (where, k))
    if need_url and not https(o.get("sourceUrl")):
        err("%s: sourceUrl must be an https URL" % where)

def check_unit(course_id, meta, d):
    """Validate one unit file and return its computed status."""
    uid = meta["id"]; where = "%s/%s" % (course_id, uid)
    if d["courseId"] != course_id or d["unitId"] != uid:
        err("%s: courseId/unitId do not match the course file" % where)
    tids = [t["id"] for t in d["topics"]]
    if len(set(tids)) != len(tids):
        err("%s: duplicate topic ids" % where)
    g = d.get("guide")
    if not g:
        err("%s: no guide" % where)
    else:
        source_ok(where + " guide", g, True)
        for s in g["sections"]:
            if s["topicId"] not in tids:
                err("%s: guide section %s has unknown topicId" % (where, s["id"]))
    seen_prompts = set()
    for q in d["questions"]:
        qw = "%s %s" % (where, q["id"])
        if not q["id"].startswith("ph1u") and course_id == "ap-physics-1":
            err(qw + ": unexpected id pattern")
        if q["courseId"] != course_id or q["unitId"] != uid:
            err(qw + ": courseId/unitId mismatch")
        if q["topicId"] not in tids:
            err(qw + ": unknown topicId")
        if q["difficulty"] not in LEVELS:
            err(qw + ": bad difficulty")
        if q["prompt"] in seen_prompts:
            err(qw + ": duplicate prompt")
        seen_prompts.add(q["prompt"])
        if not q.get("explanation"):
            err(qw + ": missing explanation")
        source_ok(qw, q, True)
        if q.get("isOriginal") is not True and q.get("sourceType") == "original":
            err(qw + ": sourceType original but isOriginal is not true")
        if q["type"] == "multiple-choice":
            c = q["choices"]
            if len(c) != 4 or len(set(c)) != 4:
                err(qw + ": needs 4 distinct choices")
            ca = q["correctAnswer"]
            if not (isinstance(ca, int) and 0 <= ca < len(c)):
                err(qw + ": correctAnswer out of range")
            ce = q.get("choiceExplanations", [])
            if len(ce) != len(c):
                err(qw + ": choiceExplanations length")
            else:
                for i, t in enumerate(ce):
                    if (i == ca) != (t == ""):
                        err(qw + ": every wrong choice needs an explanation and the correct one none (choice %d)" % i)
        elif q["type"] == "numeric":
            if not isinstance(q["correctAnswer"], (int, float)) or not q.get("tolerance") or not q.get("answerUnit"):
                err(qw + ": numeric question needs correctAnswer, tolerance, answerUnit")
        else:
            err(qw + ": unknown type")
    for v in d.get("videos", []):
        vw = "%s %s" % (where, v["id"])
        if not https(v["url"]):
            err(vw + ": url must be https")
        source_ok(vw, v, True)
        check_scope(vw, v)
    for r in d.get("learnResources", []):
        check_resource("%s %s" % (where, r.get("id")), r, "unit")
    for f in d.get("frqs", []):
        if not https(f.get("url")):
            err("%s FRQ: url must be https" % where)
        if f.get("match") not in ("approximate", "spans-units", "exact-topic-tag"):
            err("%s FRQ: match must be labelled" % where)
    mc = [q for q in d["questions"] if q["type"] == "multiple-choice"]
    levels_ok = all(any(q["difficulty"] == l for q in mc) for l in LEVELS)
    ready = bool(g) and len(g["sections"]) >= 3 and bool(g.get("example")) and bool(g.get("misconceptions")) and len(mc) >= MIN_MC and levels_ok
    return "practice-ready" if ready else "in-progress"

KINDS = ("video", "lesson page", "practice", "reading", "collection page", "textbook", "course page")

def check_scope(where, r):
    """Every outside link says whether it is unit-specific or general, so a general page is never shown as a unit video."""
    if r.get("scope") not in ("unit", "general"):
        err(where + ": scope must be 'unit' or 'general'")
    if r.get("kind") not in KINDS:
        err(where + ": kind must be one of %s" % (KINDS,))
    if r.get("kind") in ("collection page", "textbook", "course page") and r.get("scope") != "general":
        err(where + ": a %s is general, not unit-specific" % r.get("kind"))

def check_resource(where, r, expect):
    for k in ("id", "title", "url", "note", "licenseOrRights", "verified"):
        if not r.get(k):
            err(where + ": missing " + k)
    if not https(r.get("url")):
        err(where + ": url must be https")
    check_scope(where, r)
    if expect == "general" and r.get("scope") != "general":
        err(where + ": course-level resources must be scope 'general'")

PLANNER_STEPS = ["guide", "practice", "explain", "retry", "results"]

def check_planner():
    p = load("data/planner.json")
    ids = [x.get("id") for x in p["steps"]]
    if sorted(ids) != sorted(PLANNER_STEPS):
        err("planner.json: steps must be exactly %s (found %s)" % (PLANNER_STEPS, ids))
    if abs(sum(x["share"] for x in p["steps"]) - 1) > 0.001:
        err("planner.json: step shares must add up to 1")
    for x in p["steps"]:
        if not x.get("title") or x.get("evidence") not in ("none", "question results") or not x.get("uses"):
            err("planner.json: step %s needs title, uses, and evidence of 'none' or 'question results'" % x.get("id"))
    th = p.get("threshold", {})
    if not (isinstance(th.get("questions"), int) and th["questions"] >= 1 and isinstance(th.get("percent"), int) and 1 <= th["percent"] <= 100):
        err("planner.json: threshold needs integer questions and percent")
    return p

def main():
    planner = check_planner()
    cat = load("data/catalog.json")
    ids = [c["id"] for c in cat["courses"]]
    if len(set(ids)) != len(ids):
        err("catalog: duplicate course ids")
    all_q = set()
    detail = {}
    for c in cat["courses"]:
        cdir = "data/courses/%s/course.json" % c["id"]
        has = os.path.exists(os.path.join(ROOT, cdir))
        if c["outline"] != has:
            err("catalog: %s outline flag does not match the presence of course.json" % c["id"])
        if not has:
            c.pop("summary", None)
            continue
        cd = load(cdir)
        for r in cd.get("generalResources", []):
            check_resource("%s general %s" % (c["id"], r.get("id")), r, "general")
        for x in cd.get("frq", {}).get("releasedSets", []):
            if not https(x.get("url")) or not x.get("year"):
                err("%s: released FRQ set needs a year and an https url" % c["id"])
        units, ready, prog = [], 0, 0
        uids = [u["id"] for u in cd["units"]]
        if len(set(uids)) != len(uids):
            err("%s: duplicate unit ids" % c["id"])
        for u in cd["units"]:
            d = None
            if u.get("file"):
                if not os.path.exists(os.path.join(ROOT, u["file"])):
                    err("%s/%s: file missing: %s" % (c["id"], u["id"], u["file"]))
                else:
                    d = load(u["file"])
            status = "outline" if d is None else check_unit(c["id"], u, d)
            if status != u["status"]:
                err("%s/%s: declared status '%s' but content computes to '%s'" % (c["id"], u["id"], u["status"], status))
            if d:
                for q in d["questions"]:
                    if q["id"] in all_q:
                        err("duplicate question id %s" % q["id"])
                    all_q.add(q["id"])
            ready += status == "practice-ready"; prog += status == "in-progress"
            units.append((u, d, status))
        c["summary"] = {"units": len(cd["units"]), "ready": ready, "inProgress": prog}
        detail[c["id"]] = (cd, units)
    if errors:
        print("BUILD FAILED:")
        for e in errors[:25]:
            print(" -", e)
        if len(errors) > 25:
            print(" ... and %d more" % (len(errors) - 25))
        sys.exit(1)

    with open(os.path.join(ROOT, "data/catalog.json"), "w", encoding="utf-8") as f:
        json.dump(cat, f, ensure_ascii=False, indent=1); f.write("\n")
    write_status(cat, detail, planner)
    stamp_version()
    build_dist()

def write_status(cat, detail, planner):
    checked = cat["checked"]
    names = {c["id"]: c["name"] for c in cat["courses"]}
    L = []
    L.append("# StudySprint content status\n")
    L.append("Generated by `python3 tools/build.py` on %s from the files in `data/`. Do not edit by hand: change the data and run the build again. The build fails if a unit's declared status does not match what its files contain.\n" % checked)
    L.append("StudySprint is a review site, not a complete course or textbook. Guides are short review notes, and practice questions are original.\n")
    L.append("## What the statuses mean\n")
    L.append("- **practice-ready**: an original review guide (at least 3 concept sections, a worked example, common mistakes) and at least %d original multiple-choice questions that include introductory, standard, and challenging levels. Each question has an explanation for the correct answer and for every wrong choice, plus source and rights fields." % MIN_MC)
    L.append("- **in progress**: some content exists but not enough to meet that bar.")
    L.append("- **outline only**: official unit titles (and official topic names where they were verified) are listed. No guide or questions have been written, so the site does not offer them.\n")
    L.append("## Release order and progress\n")
    for i, cid in enumerate(cat["priorityOrder"], 1):
        if cid in detail:
            s = [c for c in cat["courses"] if c["id"] == cid][0]["summary"]
            L.append("%d. %s: %d of %d units practice-ready, %d in progress, %d outline only" % (i, names[cid], s["ready"], s["units"], s["inProgress"], s["units"] - s["ready"] - s["inProgress"]))
        else:
            L.append("%d. %s: catalog entry only (no verified unit outline yet)" % (i, names.get(cid, cid)))
    L.append("")
    n = len(planner["steps"]); th = planner["threshold"]
    L.append("## Study planner\n")
    L.append("A planner session has **%d steps**, defined in `data/planner.json`. The planner interface, the saved session history, and this report all read that file. The planner opens from the selected course and unit and draws its guide section and questions from that unit.\n" % n)
    L.append("| # | Step | Share of the time | Uses | Produces question evidence? |")
    L.append("|---|---|---|---|---|")
    for i, x in enumerate(planner["steps"], 1):
        L.append("| %d | %s | %d%% | %s | %s |" % (i, x["title"], round(x["share"] * 100), x["uses"], "yes" if x["evidence"] != "none" else "no"))
    L.append("")
    L.append("- **Plan completion** is the student's own checklist: the results step shows \"x of %d steps marked done\". It is self-reported and never counted as evidence of learning." % n)
    L.append("- **Evidence** comes only from submitted answers. A session meets the practice threshold with at least %d different questions answered and %d%% or more correct on first attempts. A student can tick all %d steps and still not meet it, and the results say so." % (th["questions"], th["percent"], n))
    L.append("- Sessions saved before this change counted only the first 4 steps; the session history still shows those as \"of 4\".\n")
    L.append("## Learn first (optional beginner path)\n")
    L.append("Each practice-ready unit has an optional Learn first page: a 1 to 5 confidence rating (self-reported, never counted as evidence), a 3-question warm-up drawn from the unit's introductory questions, and a panel of learning resources. Resources are recommended when the rating is 1 or 2 and no more than 1 of the 3 warm-up questions is correct. They are also offered after two wrong first attempts in a row anywhere in practice or in the planner. From there the student can return to the same unit for easier practice (introductory and standard questions only, starting at the introductory level, without changing their saved range). Warm-up answers count as ordinary practice answers.\n")
    L.append("Every outside link records whether it is **unit-specific** or **general**, and the build rejects a course page, textbook, or collection page labelled unit-specific.\n")
    L.append("## Saving, backup, and hosting\n")
    L.append("These describe how the site behaves. They do not change any course content.\n")
    L.append("- **Progress stays in the browser.** No accounts, no server, no paid or outside services. Progress saved by earlier versions of the site is still read.")
    L.append("- **Backup and restore (My data page).** A student can download progress as a JSON file or copy it as text. A backup includes answer results (first try and each retry), unit settings (adaptive level, difficulty range, questions seen in the current round, confidence rating, last warm-up result), and completed study-session history. It does not include unfinished practice sets or planner sessions, which stay on the device where they were started; answers already submitted in them are included. A restore checks every field, drops anything it does not recognise, rejects files over 2 MB or in an unknown format, and shows what the backup contains and what the device will have afterwards before anything changes. Merge and replace are both offered. The previous progress is kept so the last restore, unit reset, or \"clear all\" can be undone.")
    L.append("- **How merge treats overlaps.** A question on both sides keeps one whole record, not a combination: the one with more attempts, or the more recent one if the counts are equal. A unit on both sides keeps the device's adaptive level, difficulty range, and seen-question list; only a newer confidence rating or warm-up result comes from the backup. A study session in both is listed once, and the 50 most recent are kept. The restore preview states these rules and how many shared questions and units each rule affects.")
    L.append("- **Unfinished work survives a refresh.** An open practice set (including review sets) or a planner session is saved as the student goes. Refreshing the page returns to the same question; after an answered question it moves on to the next one. The home page lists unfinished sets with Resume and Discard. Step timers restart from the full step time, and the 3-question Learn first warm-up is not saved mid-way.")
    L.append("- **Load errors.** If the course list, a course's unit list, a unit's content, or the planner settings fail to load, the request is retried once automatically; if it still fails, the page says what could not be loaded and offers Try again. A unit that fails to load is never shown as if it had no content.")
    L.append("- **Hosting.** All asset and data paths are relative, so the site works from a GitHub Pages project subpath (for example `/studysprint/`). The build writes a version stamp onto the CSS, script, and data requests so a new release is not hidden by cached files, and adds a `.nojekyll` file.")
    L.append("- **Accessibility and phones.** Each view has its own page title and level-1 heading, Back and Forward move between views, answer errors are linked to the question and announced, focus moves to each new question and each result, the course search announces how many courses match, buttons and answer choices are at least 44 px tall, and tables stack into labelled rows on narrow screens so pages do not scroll sideways at 320 px.\n")
    for cid in [c for c in cat["priorityOrder"] if c in detail]:
        cd, units = detail[cid]
        L.append("## %s\n" % cd["name"])
        L.append("Unit outline source: [%s](%s), verified %s." % (cd["source"]["title"], cd["source"]["url"], cd["source"]["verified"]) + ((" " + cd["source"]["note"]) if cd["source"].get("note") else ""))
        fr = cd["frq"]
        line = "Official released free-response questions: [course page](%s)" % fr["hubUrl"]
        if fr.get("releasedSets"):
            line += ", plus whole released sets for %s (linked as whole exams, not matched to units)" % ", ".join(str(x["year"]) for x in fr["releasedSets"])
        L.append(line + "." + ((" " + fr["note"]) if fr.get("note") else ""))
        gen = cd.get("generalResources", [])
        if gen:
            L.append("General resources (shown on every unit's Learn first page, labelled general): " + "; ".join("[%s](%s)" % (r["title"], r["url"]) for r in gen) + ".")
        L.append("")
        L.append("| Unit | Status | Review guide | Multiple-choice questions (intro / standard / challenging) | Numeric questions | Unit-specific links | General links | Official FRQ links | Official topics not yet covered |")
        L.append("|---|---|---|---|---|---|---|---|---|")
        for u, d, status in units:
            if d is None:
                L.append("| %s | %s | no | 0 | 0 | 0 | 0 | course page only | all |" % (u["name"], status))
                continue
            mc = [q for q in d["questions"] if q["type"] == "multiple-choice"]
            nu = [q for q in d["questions"] if q["type"] == "numeric"]
            lv = " / ".join(str(sum(q["difficulty"] == l for q in mc)) for l in LEVELS)
            links = d.get("videos", []) + d.get("learnResources", [])
            spec = [x for x in links if x.get("scope") == "unit"]
            genl = [x for x in links if x.get("scope") == "general"]
            spec_txt = "%d (%s)" % (len(spec), ", ".join(sorted(set(x["kind"] for x in spec)))) if spec else "0"
            gen_txt = "%d (%s)" % (len(genl), ", ".join(sorted(set(x["kind"] for x in genl)))) if genl else "0"
            frq = ("%d linked" % len(d["frqs"])) if d["frqs"] else ("course page and %d whole released sets (no per-question matches)" % len(fr["releasedSets"]) if fr.get("releasedSets") else "course page only (no per-question matches)")
            nc = "; ".join(d["officialTopicsNotYetCovered"]) or "none"
            L.append("| %s | %s | yes (%d sections) | %d (%s) | %d | %s | %s | %s | %s |" % (u["name"], status, len(d["guide"]["sections"]), len(mc), lv, len(nu), spec_txt, gen_txt, frq, nc))
        L.append("")
    out = [c["name"] for c in cat["courses"] if not c["outline"]]
    L.append("## Catalog entries without a unit outline\n")
    L.append("These courses appear in search with a link to College Board's released free-response page and are labelled \"Catalog only\". Nothing is invented for them. (%d entries; the number is not assumed anywhere in the site.)\n" % len(out))
    L.append(", ".join(out) + ".\n")
    # gaps computed from the data
    no_links, listing = [], []
    for cid, (cd, units) in detail.items():
        for u, d, status in units:
            if d is None:
                continue
            links = d.get("videos", []) + d.get("learnResources", [])
            if not [x for x in links if x.get("scope") == "unit"]:
                no_links.append("%s %s" % (cd["name"], u["name"].split(":")[0]))
            listing += ["%s %s" % (cd["name"], u["name"].split(":")[0]) for x in links if x.get("kind") == "collection page"]
    L.append("## Known gaps\n")
    L.append("- No individual College Board free-response question is matched to a unit. Doing so would require reading College Board exam content, which this project does not do, and most free-response questions span several units. Each unit links to the course's official past-exam-questions page instead. Any future `frqs` entry must be labelled approximate or spans-units unless the match is exact.")
    if no_links:
        L.append("- Units with no verified unit-specific outside resource (the interface says so and points to the review guide): " + ", ".join(no_links) + ".")
    if listing:
        L.append("- %d video links point to a general collection page that lists the video, not to the video itself, because a direct address could not be verified: %s. They are labelled general." % (len(listing), ", ".join(listing)))
    L.append("- Question review: every question is original. Numeric answers, the values behind wrong choices that come from a specific mistake, and every worked example were checked by computation; conceptual questions were checked by reading only. No question has been reviewed by a subject teacher, so a teacher review is recommended before classroom use.")
    L.append("- Learn first links: Khan Academy pages are rendered by JavaScript, so they were verified by confirming the address loads with a matching canonical URL and by the page title in a search index, not by watching each video.")
    L.append("- Courses beyond the outlined ones (AP Computer Science A and the rest) have no verified unit outline yet.")
    L.append("- Not yet checked on real devices or with screen readers: layout, touch targets, and keyboard behaviour were checked in an automated desktop browser at phone widths (320, 375, 390 px). Still needed: VoiceOver on an iPhone (Safari), TalkBack on an Android phone (Chrome), NVDA or JAWS on Windows, and a check that downloading and choosing a backup file works on iOS and Android.")
    L.append("")
    with open(os.path.join(ROOT, "CONTENT_STATUS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))

def stamp_version():
    """Write a content hash into index.html (meta tag and ?v= on the CSS and script tags) so a new release on
    GitHub Pages is not hidden by files cached from the last one. data.js adds the same stamp to data requests.
    Paths stay relative, so the site works from a domain root or a project subpath. Also makes sure .nojekyll exists."""
    import hashlib
    h = hashlib.sha256()
    files = []
    for d in ("css", "js", "data"):
        for base, _, fns in os.walk(os.path.join(ROOT, d)):
            files += [os.path.join(base, fn) for fn in fns]
    for p in sorted(files):
        h.update(os.path.relpath(p, ROOT).replace(os.sep, "/").encode())
        h.update(open(p, "rb").read())
    v = h.hexdigest()[:10]
    path = os.path.join(ROOT, "index.html")
    html = open(path, encoding="utf-8").read()
    html = re.sub(r'<meta name="studysprint-build" content="[^"]*">', '<meta name="studysprint-build" content="%s">' % v, html)
    html = re.sub(r'href="css/style\.css(\?v=[^"]*)?"', 'href="css/style.css?v=%s"' % v, html)
    html = re.sub(r'src="(js/[a-z]+\.js)(\?v=[^"]*)?"', lambda m: 'src="%s?v=%s"' % (m.group(1), v), html)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    open(os.path.join(ROOT, ".nojekyll"), "w").close()
    for bad in re.findall(r'(?:src|href)="(/[^"/][^"]*)"', html):
        raise SystemExit("ERROR: index.html uses a root-relative path (%s); it would break on a GitHub Pages project subpath" % bad)
    print("build stamp %s written to index.html" % v)

def build_dist():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    css = open(os.path.join(ROOT, "css/style.css"), encoding="utf-8").read()
    html = re.sub(r'<link rel="stylesheet" href="css/style\.css(\?v=[^"]*)?">', lambda m: "<style>\n" + css + "\n</style>", html)
    bundle = {}
    for base, _, files in os.walk(os.path.join(ROOT, "data")):
        for fn in files:
            if fn.endswith(".json"):
                p = os.path.join(base, fn)
                bundle[os.path.relpath(p, ROOT).replace(os.sep, "/")] = json.load(open(p, encoding="utf-8"))
    blob = json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    first = True
    def inline(m):
        nonlocal first
        code = open(os.path.join(ROOT, m.group(1)), encoding="utf-8").read()
        if "</script" in code.lower():
            raise SystemExit("ERROR: " + m.group(1) + " contains a closing script tag and cannot be inlined")
        pre = "<script>window.SS_BUNDLE=" + blob + ";</script>\n" if first else ""
        first = False
        return pre + "<script>\n" + code + "\n</script>"
    html = re.sub(r'<script src="(js/[^"?]+)(\?v=[^"]*)?"></script>', inline, html)
    if 'src="js/' in html or 'href="css/' in html:
        raise SystemExit("ERROR: dist build left an external script or stylesheet reference")
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    with open(os.path.join(ROOT, "dist/studysprint.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("built dist/studysprint.html (%d KB), %d data files embedded" % (len(html.encode("utf-8")) // 1024, len(bundle)))

if __name__ == "__main__":
    main()
