#!/usr/bin/env python3
"""Whole-bank content audit (offline, deterministic). Run from anywhere:  python3 tools/checks/bank_audit.py [--list]

It reads every unit file under data/courses and reports things a reviewer should look at. It does NOT judge whether an
answer is correct; it looks for mechanical problems and answer cues:

  hard problems (exit code 1)
    - a quoted phrase in a stimulus question that is not in its stimulus
    - a question that points to "Source B" (or a table, study, data set...) but has no stimulus, or names a different source
    - an explanation that refers to a choice by letter (letters change if choices are ever reordered)
    - "all/none of the above" style choices, placeholder text, unbalanced curly quotes
    - an interpretation written for StudySprint that is wrapped in quotation marks (it is not a quotation)
  review list (exit code 0; printed with --list)
    - a keyed answer containing a number that its explanation never mentions
    - a/an mismatch between a stem and its keyed answer
  per-course statistics
    - how often the keyed answer is the uniquely longest / uniquely shortest choice, key positions, runs in tests,
      absolute words ("always", "never", ...) in keys versus distractors
"""
import collections, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ABS = re.compile(r"\b(only|all|always|never|entirely|every|no one|none|completely|solely)\b", re.I)
LETTER = re.compile(r"\b(?:choice|option|answer)s? \(?[A-D]\)?(?![a-z’'])")
ALLNONE = re.compile(r"\b(all|none) of the above\b|\bboth [A-D] and [A-D]\b", re.I)
PLACEHOLDER = re.compile(r"\b(TODO|TBD|FIXME|lorem ipsum)\b|\?\?\?|XXX")
REFERS = re.compile(r"\b(Source [A-D]\b|Sources [A-D]\b|(?:[Ii]n|[Ff]rom|[Bb]ased on|[Aa]ccording to) the (?:passage|table|data set|excerpt|poem|draft)\b|Study \d\b)")
EDITING = re.compile(r"\b(placed|add(?:ed|ing|s)?|insert|revis|replac|combin|rewrit|delet)", re.I)
NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def norm(s):
    return re.sub(r"\s+", " ", s.replace("’", "'").replace("‘", "'")).strip()


def main():
    hard, review, stats = [], [], []
    total = 0
    for cdir in sorted(glob.glob(os.path.join(ROOT, "data", "courses", "*"))):
        cid = os.path.basename(cdir)
        n = lon = sho = absk = absd = nd = 0
        pos = collections.Counter(); runs = []; prompts = collections.Counter()
        for f in sorted(glob.glob(os.path.join(cdir, "u*.json"))):
            d = json.load(open(f, encoding="utf-8")); uid = os.path.basename(f)[:-5]
            P = {p["id"]: p for p in d.get("passages", [])}
            for p in P.values():
                blob = json.dumps(p, ensure_ascii=False)
                if blob.count("“") != blob.count("”"):
                    hard.append((cid, uid, p["id"], "unbalanced curly quotes in stimulus"))
                if p.get("attribution", "").startswith("Interpretation written for StudySprint") and p["text"][0].startswith("“") and p["text"][-1].endswith("”"):
                    hard.append((cid, uid, p["id"], "interpretation is wrapped in quotation marks"))
            Q = {q["id"]: q for q in d["questions"]}
            for q in d["questions"]:
                total += 1; n += 1; prompts[q["prompt"]] += 1
                blob = json.dumps(q, ensure_ascii=False)
                if PLACEHOLDER.search(blob): hard.append((cid, uid, q["id"], "placeholder text"))
                if q["type"] != "multiple-choice": continue
                ch, k = q["choices"], q["correctAnswer"]
                L = [len(c) for c in ch]; pos[k] += 1
                lon += L[k] == max(L) and L.count(max(L)) == 1
                sho += L[k] == min(L) and L.count(min(L)) == 1
                absk += bool(ABS.search(ch[k]))
                for i, c in enumerate(ch):
                    if i != k: nd += 1; absd += bool(ABS.search(c))
                    if ALLNONE.search(c): hard.append((cid, uid, q["id"], "all/none-of-the-above style choice"))
                for t in [q["explanation"]] + q.get("choiceExplanations", []):
                    if LETTER.search(t): hard.append((cid, uid, q["id"], "explanation refers to a choice by letter: " + LETTER.search(t).group(0)))
                # stimulus references
                pid = q.get("passageId")
                m = REFERS.search(q["prompt"])
                if m and not pid:
                    hard.append((cid, uid, q["id"], "stem refers to '%s' but the question has no stimulus" % m.group(1)))
                if pid:
                    body = norm(re.sub(r"\(\d+\) ", "", " ".join(P[pid].get("text", [])) + " " + P[pid].get("intro", "") + " " + P[pid].get("title", "")))
                    for src in re.findall(r"\bSource ([A-D])\b", q["prompt"]):
                        others = {x for p in P.values() for x in re.findall(r"^Source ([A-D])\b", p["title"])}
                        mine = re.findall(r"^Source ([A-D])\b", P[pid]["title"])
                        if mine and src not in mine and src in others and not re.search(r"Source [A-D] (and|or|than|with)|both", q["prompt"]):
                            hard.append((cid, uid, q["id"], "stem names Source %s but the question is attached to Source %s" % (src, mine[0])))
                    # quoted phrases in the stem must come from the stimulus (stems that ask where to add or how to revise text quote new text)
                    quotes = [] if EDITING.search(q["prompt"]) else re.findall(r"“([^”]{12,})”", q["prompt"])
                    for qt in quotes:
                        for part in re.split(r"\s*(?:\. \. \.|…| / )\s*", norm(qt)):
                            part = part.strip(" .,;:!?")
                            if len(part) > 11 and part.lower() not in body.lower():
                                hard.append((cid, uid, q["id"], "quoted phrase not found in its stimulus: " + part[:60]))
                # review heuristics
                knums = [x.replace(",", "") for x in NUM.findall(ch[k])]
                enums = {x.replace(",", "") for x in NUM.findall(q["explanation"])}
                if knums and len(ch[k]) < 40 and not any(x in enums or x.rstrip("0").rstrip(".") in enums for x in knums) and not re.fullmatch(r"\D*\d\D*", ch[k]):
                    review.append((cid, uid, q["id"], "keyed number %s is not mentioned in the explanation" % "/".join(knums)))
                stem = q["prompt"].strip()
                if re.search(r"\b(a|an)$", stem):
                    want_vowel = stem.endswith(" an")
                    first = re.sub(r"^[^A-Za-z]*", "", ch[k])[:1].lower()
                    if first and (first in "aeio") != want_vowel:
                        review.append((cid, uid, q["id"], "a/an mismatch between stem and keyed answer"))
            for t in d.get("tests", []):
                ks = [Q[i]["correctAnswer"] for i in t["questionIds"] if Q[i]["type"] == "multiple-choice"]
                run = best = 1
                for a, b in zip(ks, ks[1:]):
                    run = run + 1 if a == b else 1; best = max(best, run)
                if best >= 4: runs.append("%s/%s run of %d" % (uid, t["id"], best))
        for p, c in prompts.items():
            if c > 1: review.append((cid, "-", "-", "same stem used %d times in the course: %s" % (c, p[:70])))
        if n:
            mc = sum(pos.values())
            stats.append((cid, n, lon, sho, "/".join(str(pos[i]) for i in range(4)), "%d/%d" % (absk, mc), "%d/%d" % (absd, nd), "; ".join(runs) or "-"))
    print("Questions read: %d\n" % total)
    print("%-44s %5s %9s %9s %-15s %-9s %-9s %s" % ("course", "n", "key long", "key short", "key A/B/C/D", "abs key", "abs dist", "runs>=4 in a test"))
    for s in stats:
        mc = sum(int(x) for x in s[4].split("/")) or 1
        print("%-44s %5d %4d %3.0f%% %4d %3.0f%% %-15s %-9s %-9s %s" % (s[0], s[1], s[2], 100 * s[2] / mc, s[3], 100 * s[3] / mc, s[4], s[5], s[6], s[7]))
    print("\nHard problems: %d" % len(hard))
    for h in hard: print("  ", " | ".join(h))
    print("\nReview list: %d item(s)%s" % (len(review), "" if "--list" in sys.argv else " (run with --list to print them)"))
    if "--list" in sys.argv:
        for r in review: print("  ", " | ".join(r))
    return 1 if hard else 0


if __name__ == "__main__":
    sys.exit(main())
