#!/usr/bin/env python3
"""Compare each course outline with College Board's live AP Students course page (needs internet).

    python3 tools/checks/check_outline.py            # every course that has a studentUrl or an AP Students source
    python3 tools/checks/check_outline.py ap-biology # one course

For each course it fetches the AP Students page, reads the unit names, the "Topics may include" lists, and the exam
weightings, and reports any difference from data/courses/<id>/course.json (unit names, officialTopics, examWeight).
A difference means College Board changed the page or the outline was recorded differently; a person should look at it.
Exit code 1 if any course differs or cannot be fetched.
"""
import glob, json, os, re, sys, urllib.request
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class _Text(HTMLParser):
    """Page text as lines, one per block element. A nested list item is prefixed with its parent item's own text
    (College Board writes "States in:" with sub-bullets), and inline markup such as <sup> never splits a line."""
    BLOCK = {"p", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "div", "section", "td", "tr", "br", "article", "header"}
    SKIP = {"script", "style", "noscript", "svg"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lines, self.buf, self.skip, self.items = [], [], 0, []   # items: stack of [own text, has nested list]

    def flush(self):
        t = re.sub(r"\s+", " ", "".join(self.buf)).strip(); self.buf = []
        if not t: return
        if self.items and not self.items[-1][0]: self.items[-1][0] = t
        prefix = self.items[-2][0] if len(self.items) > 1 and self.items[-1][0] == t else ""
        self.lines.append((prefix + " " + t).strip())

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP: self.skip += 1
        if tag in self.BLOCK: self.flush()
        if tag == "li": self.items.append(["", False])
        if tag in ("ul", "ol") and self.items: self.items[-1][1] = True

    def handle_endtag(self, tag):
        if tag in self.SKIP: self.skip = max(0, self.skip - 1)
        if tag in self.BLOCK: self.flush()
        if tag == "li" and self.items:
            own, nested = self.items.pop()
            if nested and own in self.lines: self.lines.remove(own)   # a parent item is only a prefix for its sub-items

    def handle_data(self, data):
        if not self.skip: self.buf.append(data)


def page_lines(url):
    req = urllib.request.Request(url, headers={"User-Agent": "StudySprint outline check"})
    with urllib.request.urlopen(req, timeout=40) as r:
        t = r.read().decode("utf-8", "replace")
    p = _Text(); p.feed(t); p.flush()
    return p.lines


def parse(lines):
    units, cur, mode = [], None, None
    for l in lines:
        l = re.sub(r"^Uint (\d)", r"Unit \1", l)   # the Physics C: E&M page misspells one heading (seen 2026-11-14)
        if re.match(r"^(Unit|Period) \d+(:|$)", l):
            if cur and cur["name"] == l: continue
            cur = {"name": l, "topics": [], "weight": None}; units.append(cur); mode = None
        elif cur is None: continue
        elif re.match(r"^(Topics|Skills you will practice) may include:?$", l.replace("\xa0", " ").strip()): mode = "t"
        elif l == "On The Exam": mode = "w"
        elif mode == "w": cur["weight"] = l; mode = None
        elif mode == "t":
            if re.match(r"^(Credit and Placement|Course Resources|About the Exam|Exam$)", l): mode = None
            else: cur["topics"].append(l)
    return [u for u in units if u["topics"] or u["weight"]]


def same_name(a, b):
    """College Board gives some courses bare unit numbers ("Unit 1"); the outline may add its own descriptive title."""
    a, b = squash(a), squash(b)
    return a == b or a.startswith(b) or b.startswith(a)


def squash(s):
    return re.sub(r"[^a-z0-9%]+", "", s.lower().replace("–", "-").replace("²", "2"))


def main():
    want = sys.argv[1:]
    bad = 0
    for f in sorted(glob.glob(os.path.join(ROOT, "data", "courses", "*", "course.json"))):
        c = json.load(open(f, encoding="utf-8"))
        if want and c["id"] not in want: continue
        url = c.get("studentUrl") or (c.get("source", {}).get("url") if "apstudents" in c.get("source", {}).get("url", "") else None)
        if not url:
            print("SKIP %-42s no AP Students URL recorded" % c["id"]); continue
        try:
            live = parse(page_lines(url))
        except Exception as e:  # network or page error
            bad += 1; print("ERR  %-42s %s" % (c["id"], e)); continue
        diffs = []
        ours = c["units"]
        if len(live) != len(ours): diffs.append("unit count: page %d, outline %d" % (len(live), len(ours)))
        for o, l in zip(ours, live):
            if not same_name(o["name"], l["name"]): diffs.append("%s name: page '%s' / outline '%s'" % (o["id"], l["name"], o["name"]))
            po, pl = [squash(x) for x in o.get("officialTopics") or []], [squash(x) for x in l["topics"]]
            if po and "".join(po) != "".join(pl):
                gone = [x for x, s in zip(o["officialTopics"], po) if s not in pl][:3]; new = [x for x, s in zip(l["topics"], pl) if s not in po][:3]
                diffs.append("%s topics differ (outline %d, page %d)%s%s" % (o["id"], len(po), len(pl), "; only in outline: %s" % gone if gone else "", "; only on page: %s" % new if new else ""))
            lw = re.search(r"\d+\s*%?\s*[–-]\s*\d+\s*%", l["weight"] or ""); ow = re.search(r"\d+\s*%?\s*[–-]\s*\d+\s*%", o.get("examWeight") or "")
            if lw and ow and squash(lw.group(0)).replace("%", "") != squash(ow.group(0)).replace("%", ""):
                diffs.append("%s weight: page '%s' / outline '%s'" % (o["id"], l["weight"], o.get("examWeight")))
        bad += bool(diffs)
        print("%s %-42s %d units on page%s" % ("DIFF" if diffs else "OK  ", c["id"], len(live), "" if not diffs else ""))
        for d in diffs: print("       -", d)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
