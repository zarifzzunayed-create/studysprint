#!/usr/bin/env python3
"""Check every public-domain stimulus against the source it cites (needs internet).

    python3 tools/checks/check_quotes.py

Each public-domain passage names, in "licenseOrRights", the OpenStax page whose printed excerpt it follows
(openstax.org/books/<book>/pages/<slug>). This script fetches that page and checks that every quoted segment of the
passage appears there word for word (segments are split at ellipses, line breaks written " / ", and bracketed notes).
A passage that cites no fetchable page is listed as UNCHECKED. Exit code 1 if any segment is missing.
"""
import glob, html, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = {}


def norm(s):
    s = html.unescape(s).replace("\xa0", " ").replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("—", "-").replace("–", "-")
    s = re.sub(r"\s+", " ", s)
    return re.sub(r"\s+([,.;:!?])", r"\1", s).strip()


def page_text(url):
    if url not in CACHE:
        req = urllib.request.Request(url, headers={"User-Agent": "StudySprint source check"})
        with urllib.request.urlopen(req, timeout=45) as r:
            t = r.read().decode("utf-8", "replace")
        t = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", t)
        t = re.sub(r"(?i)</?(em|i|b|strong|span|sup|sub|a)\b[^>]*>", "", t)     # inline markup never splits a word
        CACHE[url] = norm(re.sub(r"<[^>]+>", " ", t))
    return CACHE[url]


def segments(p):
    out = []
    for t in p["text"]:
        spans = re.findall(r"“(.*)”", t, flags=re.S) or [t]            # the quoted part of a paragraph, or all of it
        for sp in spans:
            for seg in re.split(r"\s*(?:\.{3,4}|…| / |\[[^\]]*\])\s*", norm(sp)):   # norm() has already closed up ". . ." to "..."
                seg = seg.strip(' "\'.,;:-/')
                if len(seg) >= 12: out.append(seg)
    return out


def main():
    bad, n, npass, unchecked = [], 0, 0, []
    for f in sorted(glob.glob(os.path.join(ROOT, "data", "courses", "*", "u*.json"))):
        d = json.load(open(f, encoding="utf-8")); where = "%s/%s" % (f.split(os.sep)[-2], os.path.basename(f)[:-5])
        for p in d.get("passages", []):
            if p.get("sourceType") != "public-domain": continue
            urls = ["https://" + u for u in re.findall(r"openstax\.org/books/[0-9a-z-]+/pages/[0-9a-z-]+", p.get("licenseOrRights", ""))]
            if not urls: unchecked.append("%s %s" % (where, p["id"])); continue
            try: corpus = " ".join(page_text(u) for u in urls)
            except Exception as e:
                bad.append((where, p["id"], "could not fetch %s: %s" % (urls[0], str(e)[:60]))); continue
            npass += 1
            for seg in segments(p):
                n += 1
                if seg.lower() not in corpus.lower(): bad.append((where, p["id"], "not found word for word: " + seg[:80]))
    print("public-domain stimuli checked: %d | quoted segments checked: %d | problems: %d" % (npass, n, len(bad)))
    for b in bad: print("  ", " | ".join(b))
    if unchecked: print("UNCHECKED (no source page cited):", ", ".join(unchecked))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
