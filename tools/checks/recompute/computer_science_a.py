#!/usr/bin/env python3
"""Compiles and runs the Java code behind AP Computer Science A answers (offline; needs a JDK 11 or later on PATH).
Run: python3 tools/checks/recompute/computer_science_a.py

For each listed question the script takes the code a student sees (the question's code listing, or the statements
quoted in its stem), runs it with `java`, and checks the keyed choice against what actually happens: the exact output,
a compile error, an exception, or a loop that never ends. For "which expression/loop/call is correct" questions it
tries every choice and requires that only the keyed one behaves as required. Conceptual questions are not covered;
the script prints how many questions it executed. Exit code 1 on any failure.
"""
import glob, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
QS, PS = {}, {}
for f in glob.glob(os.path.join(ROOT, "data", "courses", "ap-computer-science-a", "u*.json")):
    d = json.load(open(f, encoding="utf-8"))
    for p in d.get("passages", []): PS[p["id"]] = p
    for q in d["questions"]: QS[q["id"]] = q

ENV = dict(os.environ); ENV.pop("JAVA_TOOL_OPTIONS", None)
TMP = tempfile.mkdtemp(prefix="csa-check-")
fails, done = [], 0
key = lambda i: QS[i]["choices"][QS[i]["correctAnswer"]]
listing = lambda i: "\n".join(PS[QS[i]["passageId"]]["text"])
squash = lambda s: re.sub(r"\s+", " ", s).strip()


def run(body, pre="", classes="", timeout=20):
    """Returns (status, stdout, stderr); status is 'ok', 'nocompile', 'exception', or 'timeout'."""
    src = "import java.util.*;\nimport java.io.*;\npublic class Main {\n%s\npublic static void main(String[] args) throws Exception {\n%s\n}\n}\n%s\n" % (pre, body, classes)
    path = os.path.join(TMP, "Main.java"); open(path, "w", encoding="utf-8").write(src)
    try:
        r = subprocess.run(["java", path], capture_output=True, text=True, timeout=timeout, env=ENV, cwd=TMP)
    except subprocess.TimeoutExpired:
        return "timeout", "", ""
    if r.returncode != 0 and ("error: compilation failed" in r.stderr or re.search(r"Main\.java:\d+: error", r.stderr)): return "nocompile", r.stdout, r.stderr
    return ("ok" if r.returncode == 0 else "exception"), r.stdout, r.stderr


def shown(i, stmts):
    """The statements must be quoted in the stem, so the check runs what the student sees."""
    assert squash(stmts) in squash(QS[i]["prompt"]), (i, "statements are not in the stem")
    return stmts


def note(i, ok, what):
    global done
    done += 1
    if not ok: fails.append("%s: %s (keyed: %s)" % (i, what, key(i)))


def prints(i, body=None, pre="", classes="", append="", setup="", out=None, says=None):
    """Output must equal the keyed choice (or `out`, with the key containing `says`)."""
    st, o, e = run(setup + "\n" + (body if body is not None else listing(i)) + "\n" + append, pre, classes)
    want = key(i) if out is None else out
    note(i, st == "ok" and o.strip() == want and (says is None or says in key(i)), "ran with status %s and printed %r" % (st, o.strip()[:60]))


def fails_to_compile(i, body=None, pre="", classes="", err=""):
    """Must fail to compile, and the compiler's message must contain `err` (so it fails for the reason the key gives)."""
    st, o, e = run(body if body is not None else listing(i), pre, classes)
    note(i, st == "nocompile" and err in e, "expected a compile error mentioning %r, got %s" % (err, st))


def throws(i, name, body=None, pre="", classes="", setup="", out=None):
    """Must throw the named exception (after printing `out`, if given), and the key must name it."""
    st, o, e = run(setup + "\n" + (body if body is not None else listing(i)), pre, classes)
    note(i, st == "exception" and name in e and name in key(i) and (out is None or (o.strip() == out and out in key(i))), "expected %s, got %s after printing %r" % (name, st, o.strip()[:40]))


def never_ends(i, body=None):
    st, o, e = run(body if body is not None else listing(i), timeout=4)
    note(i, st == "timeout", "expected the loop not to end, got %s" % st)


def parts(i):
    """Splits a listing into (class declarations, static methods 'in another class', code segment) at its comment markers."""
    t = listing(i)
    cls, _, seg = t.partition("// Code segment:")
    cls, _, pre = cls.partition("// In another class:")
    return dict(classes=cls, pre=pre, body=seg)


def only_key(i, template, good, pre="", classes=""):
    """Run the template once per choice; `good(status, stdout)` must be true for the keyed choice and false for the others."""
    res = []
    for c in QS[i]["choices"]:
        st, o, e = run(template.replace("@@", c), pre, classes)
        res.append(bool(good(st, o.strip())))
    k = QS[i]["correctAnswer"]
    note(i, res[k] and sum(res) == 1, "choices that passed: %s" % [QS[i]["choices"][j] for j in range(4) if res[j]])


# ---------------- Unit 1 ----------------
fails_to_compile("csa-u1-q04", shown("csa-u1-q04", "int count = 5; count = count + 2.5;"))
prints("csa-u1-q05", shown("csa-u1-q05", "System.out.println(7 / 2 + 7 % 2);"))
prints("csa-u1-q06", shown("csa-u1-q06", "double x = 9 / 2; System.out.println(x);"))
prints("csa-u1-q07")
prints("csa-u1-q08")
prints("csa-u1-q09", shown("csa-u1-q09", 'System.out.print("A"); System.out.println("B"); System.out.print("C");'), out="AB\nC", says="AB on the first line and C on the second line")
prints("csa-u1-q10", shown("csa-u1-q10", "System.out.println(Math.abs(-3) + Math.pow(2, 3));"))
only_key("csa-u1-q11", "TreeSet<Integer> seen = new TreeSet<>(); for (int i = 0; i < 300000; i++) { seen.add(@@); } System.out.println(seen);", lambda st, o: st == "ok" and o == "[1, 2, 3, 4, 5, 6]")
only_key("csa-u1-q12", "int r = @@;", lambda st, o: st == "ok", pre="public static int combine(int a, double b) { return a; }")
throws("csa-u1-q13", "NullPointerException")
prints("csa-u1-q14", shown("csa-u1-q14", 'String s = "computer"; System.out.println(s.substring(3, 6));'))
prints("csa-u1-q15", shown("csa-u1-q15", 'String s = "banana"; System.out.println(s.indexOf("an") + s.length());'))
prints("csa-u1-q16")
prints("csa-u1-q17", shown("csa-u1-q17", 'String s1 = "cat"; String s2 = "car"; System.out.println(s1.equals(s2) + " " + (s1.compareTo(s2) > 0));'))

# ---------------- Unit 2 ----------------
prints("csa-u2-q01")
prints("csa-u2-q02")
prints("csa-u2-q04")
prints("csa-u2-q05", shown("csa-u2-q05", 'System.out.println((x > 2 && x < 5) + " " + (x > 2 || x < 5));'), setup="int x = 6;")
only_key("csa-u2-q06", "boolean same = true; for (int i = 0; i < 4; i++) { boolean a = i / 2 == 1; boolean b = i % 2 == 1; if ((!(a && b)) != (@@)) { same = false; } } System.out.println(same);", lambda st, o: st == "ok" and o == "true")
prints("csa-u2-q07", out="no", says="prints no")
only_key("csa-u2-q08", "boolean same = true; for (int year = 1980; year <= 2045; year++) { if ((@@) != (Math.abs(2 * year - 4025) <= 25)) { same = false; } } System.out.println(same);", lambda st, o: st == "ok" and o == "true")
prints("csa-u2-q09")
prints("csa-u2-q10")
never_ends("csa-u2-q11")
ref = run(listing("csa-u2-q12"))[1].strip()
only_key("csa-u2-q12", '@@ { System.out.print(k + " "); }', lambda st, o: st == "ok" and o == ref and ref == "10 7 4 1")
prints("csa-u2-q13")
prints("csa-u2-q14")
prints("csa-u2-q15")
prints("csa-u2-q16", append="System.out.println(count);")
only_key("csa-u2-q17", "boolean same = true; for (int n = 1; n <= 200; n++) { if ((@@) != (n - 4 * (n / 4) == 0)) { same = false; } } System.out.println(same);", lambda st, o: st == "ok" and o == "true")

# ---------------- Unit 3 ----------------
only_key("csa-u3-q05", "@@ System.out.println(a.getBalance());", lambda st, o: st == "ok" and o == "50.0", classes=listing("csa-u3-q05"))
fails_to_compile("csa-u3-q06", 'Account a = new Account("Ana", 50.0); ' + shown("csa-u3-q06", "System.out.println(a.balance);"), classes=listing("csa-u3-q06"), err="balance has private access")
prints("csa-u3-q07", shown("csa-u3-q07", "System.out.println(new Point());"), classes=listing("csa-u3-q07"))
prints("csa-u3-q09", shown("csa-u3-q09", 'Account a = new Account("Ana", 50.0); a.deposit(25.0); a.deposit(10.0); System.out.println(a.getBalance());'), classes=listing("csa-u3-q09"))
prints("csa-u3-q11", **parts("csa-u3-q11"))
prints("csa-u3-q12", shown("csa-u3-q12", 'System.out.println(mystery(35) + " " + mystery(13));'), pre=listing("csa-u3-q12"))
prints("csa-u3-q13", **parts("csa-u3-q13"))
prints("csa-u3-q14", **parts("csa-u3-q14"))
fails_to_compile("csa-u3-q16", "", classes=listing("csa-u3-q16"), err="non-static variable on cannot be referenced from a static context")

# ---------------- Unit 4 ----------------
prints("csa-u4-q03", shown("csa-u4-q03", 'String s = "42"; int n = Integer.parseInt(s) + 8; Double d = 2.5; System.out.println(n + d);'))
# the data file is built from the lines the listing itself shows
open(os.path.join(TMP, "scores.txt"), "w").write("\n".join(m.group(1) for m in re.finditer(r"(?m)^// {3,}(\S+)\s*$", listing("csa-u4-q04"))) + "\n")
prints("csa-u4-q04")
only_key("csa-u4-q05", "@@ vals[9] = 1.5; System.out.println(vals.length);", lambda st, o: st == "ok" and o == "10")
prints("csa-u4-q06")
throws("csa-u4-q07", "ArrayIndexOutOfBoundsException", out="4 8 15")
prints("csa-u4-q08")
prints("csa-u4-q09")
prints("csa-u4-q10")
prints("csa-u4-q11")
only_key("csa-u4-q12", "ArrayList<Integer> list = new ArrayList<Integer>(Arrays.asList(-1, -2, 3, -4, -5, 6, -7)); @@ System.out.println(list);", lambda st, o: st == "ok" and o == "[3, 6]")
prints("csa-u4-q13", shown("csa-u4-q13", "int[][] grid = {{1, 2, 3}, {4, 5, 6}}; System.out.println(grid[1][0] + grid.length + grid[0].length);"))
prints("csa-u4-q14")
prints("csa-u4-q15")
prints("csa-u4-q16")
prints("csa-u4-q19", "System.out.println(mystery(7));", pre=listing("csa-u4-q19"))

print("questions checked by running Java: %d | failures: %d" % (done, len(fails)))
for f in fails: print("  ", f)
sys.exit(1 if fails else 0)
