#!/usr/bin/env python3
"""Recomputes the data-based answers in AP Macroeconomics, AP Microeconomics, and AP Psychology (offline).
Run: python3 tools/checks/recompute/social_science.py

Each entry reads the numbers from the question's own stem, table, or graph in the data files, redoes the calculation,
and checks that the keyed choice states that result. Nothing here is copied from an authoring script. Conceptual
questions are not covered; the script prints how many questions it recomputed. Exit code 1 on any failure.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
QS, PS = {}, {}
for c in ("ap-macroeconomics", "ap-microeconomics", "ap-psychology"):
    for f in glob.glob(os.path.join(ROOT, "data", "courses", c, "u*.json")):
        d = json.load(open(f, encoding="utf-8"))
        for p in d.get("passages", []): PS[p["id"]] = p
        for q in d["questions"]: QS[q["id"]] = q

fails, done = [], 0
key = lambda i: QS[i]["choices"][QS[i]["correctAnswer"]]
stem = lambda i: QS[i]["prompt"]
table = lambda i: " | ".join(PS[QS[i]["passageId"]]["text"])
fig = lambda i: PS[QS[i]["passageId"]]["figure"]
intro = lambda i: PS[QS[i]["passageId"]].get("intro", "")
rows = lambda i: [nums(l) for l in PS[QS[i]["passageId"]]["text"]]
nums = lambda s: [float(x.replace(",", "")) for x in re.findall(r"-?(?:\d[\d,]*\.?\d*|\.\d+)", s.replace("−", "-"))]


def check(i, ok, what):
    global done
    done += 1
    if not ok: fails.append("%s: %s (keyed: %s)" % (i, what, key(i)))


def line_y(series, x):
    (x1, y1), (x2, y2) = series["points"][0], series["points"][-1]
    return y1 + (y2 - y1) * (x - x1) / (x2 - x1)


def line_x(series, y):
    (x1, y1), (x2, y2) = series["points"][0], series["points"][-1]
    return x1 + (x2 - x1) * (y - y1) / (y2 - y1)


def cross(a, b):
    (x1, y1), (x2, y2) = a["points"][0], a["points"][-1]; (x3, y3), (x4, y4) = b["points"][0], b["points"][-1]
    ma, mb = (y2 - y1) / (x2 - x1), (y4 - y3) / (x4 - x3)
    x = (y3 - y1 + ma * x1 - mb * x3) / (ma - mb)
    return x, y1 + ma * (x - x1)


S = lambda i, label: next(s for s in fig(i)["series"] if s["label"] == label)

# ---------------- AP Macroeconomics ----------------
a = nums(stem("mac-u1-q02")); check("mac-u1-q02", key("mac-u1-q02") == "$%d" % (a[1] + a[2]), "forgone wages plus ticket")
w = [nums(l)[1] for l in PS["mac1-t1"]["text"]]; costs = [x - y for x, y in zip(w, w[1:])]
check("mac-u1-q05", costs == sorted(costs) and len(set(costs)) > 1 and "bowed outward" in key("mac-u1-q05"), "rising opportunity cost of robots")
(a_s, a_p), (b_s, b_p) = [nums(l) for l in PS["mac1-t2"]["text"]]
check("mac-u1-q07", a_s / a_p > b_s / b_p and key("mac-u1-q07").startswith("Alpha has a comparative advantage in shirts"), "Beta gives up fewer shirts per phone")
lo, hi = sorted(nums(stem("mac-u1-q08"))[1:3]); check("mac-u1-q08", lo < nums(key("mac-u1-q08"))[1] < hi and all(not lo < nums(c)[1] < hi for c in QS["mac-u1-q08"]["choices"] if c != key("mac-u1-q08")), "terms of trade between the two opportunity costs")
row = next(nums(l) for l in PS["mac1-t3"]["text"] if l.startswith("Price $3")); check("mac-u1-q15", key("mac-u1-q15") == "a shortage of %d notebooks" % (row[1] - row[2]), "quantity demanded minus quantity supplied at $3")
t = {l.split(":")[0]: nums(l.split(":")[1])[0] for l in PS["mac2-t1"]["text"]}
check("mac-u2-q02", key("mac-u2-q02") == "$%d billion" % (t["Consumption spending"] + t["Gross private investment"] + t["Government purchases of goods and services"] + t["Exports"] - t["Imports"]), "C + I + G + (X − M)")
check("mac-u2-q05", key("mac-u2-q05") == "$%d" % nums(stem("mac-u2-q05"))[2], "price of the final good")
t = {l.split(":")[0]: nums(l.split(":")[1])[0] for l in PS["mac2-t2"]["text"]}; lf = t["Employed"] + t["Unemployed and actively seeking work"]
check("mac-u2-q07", key("mac-u2-q07") == "%d%% and %d%%" % (round(100 * t["Unemployed and actively seeking work"] / lf), round(100 * lf / t["Adult population"])), "unemployment and participation rates")
a = nums(stem("mac-u2-q10")); check("mac-u2-q10", key("mac-u2-q10") == "%d" % round(a[1] / a[0] * 100), "CPI")
a = nums(stem("mac-u2-q11")); check("mac-u2-q11", key("mac-u2-q11") == "It fell by about %d%%." % (a[1] - a[0]), "real wage change")
a = nums(stem("mac-u2-q14")); check("mac-u2-q14", key("mac-u2-q14") == "${:,.0f} billion".format(a[0] / a[1] * 100), "real GDP")
r = [nums(l) for l in PS["mac2-t3"]["text"]]; check("mac-u2-q16", round(r[0][1] / r[0][2], 6) == round(r[1][1] / r[1][2], 6) and "unchanged" in key("mac-u2-q16"), "real GDP in both years")
mpc = nums(stem("mac-u3-q03"))[0]; check("mac-u3-q03", key("mac-u3-q03") == "%d" % round(1 / (1 - mpc)), "spending multiplier")
a = nums(stem("mac-u3-q04")); check("mac-u3-q04", key("mac-u3-q04") == "An increase of $%d billion" % round(a[1] / (1 - a[0])), "multiplier times spending")
t = [nums(l)[0] for l in PS["mac3-t1"]["text"]]; check("mac-u3-q15", key("mac-u3-q15") == "$%d billion" % round((t[0] - t[1]) * (1 - t[2])), "gap divided by the multiplier")
x, y = cross(S("mac-u3-q18", "AD"), S("mac-u3-q18", "SRAS")); lras = S("mac-u3-q18", "LRAS")["points"][0][0]
check("mac-u3-q18", x < lras and "recessionary gap of $%d billion" % round(lras - x) in key("mac-u3-q18") and "$%d billion" % round(x) in table("mac-u3-q18"), "output gap read from the graph")
a = nums(stem("mac-u4-q03")); check("mac-u4-q03", key("mac-u4-q03") == "%d%%" % (a[0] - a[1]), "nominal minus inflation")
t = nums(table("mac-u4-q06")); check("mac-u4-q06", key("mac-u4-q06") == "$%d" % (t[0] - t[3] / 100 * t[2]), "reserves minus required reserves")
a = nums(stem("mac-u4-q07")); check("mac-u4-q07", key("mac-u4-q07") == "${:,.0f}".format(a[1] * (1 - a[0] / 100) / (a[0] / 100)), "excess reserves times the money multiplier")
a = nums(stem("mac-u4-q17")); check("mac-u4-q17", key("mac-u4-q17") == "$%d billion" % (a[0] - a[1]), "private plus public saving")
a = nums(stem("mac-u4-q18")); md = S("mac-u4-q18", "MD"); check("mac-u4-q18", key("mac-u4-q18") == "fall from %d%% to %d%%" % (round(line_y(md, a[0])), round(line_y(md, a[1]))), "money demand read at the old and new money supply")
a = nums(stem("mac-u5-q07")); check("mac-u5-q07", key("mac-u5-q07") == "$%d trillion" % (a[0] * a[1]), "M times V")
r = [nums(l) for l in PS["mac5-t1"]["text"]]; g = (r[1][1] / r[1][2]) / (r[0][1] / r[0][2]) * 100 - 100; check("mac-u5-q15", key("mac-u5-q15") == "About %d%%" % round(g), "growth of real GDP per capita")
nat = S("mac-u5-q18", "LRPC")["points"][0][0]; A = next(g for g in fig("mac-u5-q18")["guides"] if g.get("label") == "A")
check("mac-u5-q18", A["x"] > nat and round(line_y(S("mac-u5-q18", "SRPC"), A["x"]), 6) == A["y"] and "above the natural rate" in key("mac-u5-q18"), "point A lies on SRPC to the right of LRPC")
t = [nums(l)[0] for l in PS["mac6-t1"]["text"]]; check("mac-u6-q03", key("mac-u6-q03") == "−$%d billion" % -(t[0] - t[1] + t[2] + t[3]), "net exports plus income plus transfers")
a = nums(stem("mac-u6-q06")); check("mac-u6-q06", key("mac-u6-q06") == "$%d" % round(a[2] / a[1]), "euros divided by euros per dollar")
a = nums(stem("mac-u6-q17")); check("mac-u6-q17", key("mac-u6-q17") == "$%d billion" % (a[0] + a[1]), "national saving plus net capital inflow")
rate = nums(stem("mac-u6-q18"))[0]; qs, qd = line_x(S("mac-u6-q18", "S"), rate), line_x(S("mac-u6-q18", "D"), rate); eq = cross(S("mac-u6-q18", "D"), S("mac-u6-q18", "S"))
check("mac-u6-q18", qs > qd and rate > eq[1] and key("mac-u6-q18") == "a surplus of %d billion dollars, so the dollar will depreciate" % round(qs - qd), "quantity supplied minus quantity demanded at the stated rate")

# ---------------- AP Microeconomics ----------------
k = [r[1] for r in rows("mic-u1-q03")]; b = [r[0] for r in rows("mic-u1-q03")]; per = {(k[i] - k[i + 1]) / (b[i + 1] - b[i]) for i in range(4)}
check("mic-u1-q03", per == {1.5} and key("mic-u1-q03").startswith("1.5 kayaks at every point"), "kayaks given up per bike")
(ac, ap), (bc, bp) = rows("mic-u1-q06")
check("mic-u1-q06", ac > bc and ap > bp and key("mic-u1-q06").startswith("Ana has an absolute advantage in both"), "Ana makes more of both goods")
check("mic-u1-q07", ap / ac < bp / bc and key("mic-u1-q07").startswith("Ana, because a cake costs her %d pies while it costs Ben %d" % (ap / ac, bp / bc)), "pies given up per cake")
lo, hi = sorted(nums(stem("mic-u1-q08"))[:2]); check("mic-u1-q08", lo < nums(key("mic-u1-q08"))[0] < hi and all(not lo < nums(c)[0] < hi for c in QS["mic-u1-q08"]["choices"] if c != key("mic-u1-q08")), "price between the two opportunity costs")
a = nums(stem("mic-u1-q10")); check("mic-u1-q10", key("mic-u1-q10") == "${:,.0f}".format(a[1] - a[2] - a[0]), "revenue minus explicit and implicit costs")
a = nums(stem("mic-u1-q13")); check("mic-u1-q13", a[2] - a[3] > a[0] - a[1] and key("mic-u1-q13").startswith("The park") and "${:,.0f}".format(a[2] - a[3]) in key("mic-u1-q13"), "net benefit of each project")
r = rows("mic-u1-q15"); check("mic-u1-q15", key("mic-u1-q15") == "%d hours" % sum(1 for x in r if x[1] >= x[2]), "hours with marginal benefit at least marginal cost")
a = nums(stem("mic-u1-q16")); check("mic-u1-q16", a[3] / a[1] > a[2] / a[0] and key("mic-u1-q16").startswith("more juice and fewer tacos"), "marginal utility per dollar")
a = nums(stem("mic-u2-q04")); check("mic-u2-q04", key("mic-u2-q04") == "%d apps" % (a[1] + a[2]), "sum of individual quantities")
a = nums(stem("mic-u2-q05")); check("mic-u2-q05", key("mic-u2-q05") == "%d, so demand is elastic" % (a[1] / a[0]), "percentage change in quantity over percentage change in price")
a = nums(stem("mic-u2-q08")); check("mic-u2-q08", key("mic-u2-q08").startswith("−%s, so instant noodles are an inferior good" % (a[1] / a[0])), "negative income elasticity")
a = nums(stem("mic-u2-q09")); check("mic-u2-q09", key("mic-u2-q09") == "%d, so supply is elastic" % (a[1] / a[0]), "elasticity of supply")
x, y = cross(S("mic-u2-q11", "D"), S("mic-u2-q11", "S")); top = S("mic-u2-q11", "D")["points"][0][1]
check("mic-u2-q11", key("mic-u2-q11") == "$%d" % round(.5 * x * (top - y)), "triangle under demand and above the price")
(p0, q0), (pb, ps, q1) = rows("mic-u2-q15"); check("mic-u2-q15", key("mic-u2-q15") == "Tax revenue $%d; deadweight loss $%d" % ((pb - ps) * q1, .5 * (pb - ps) * (q0 - q1)), "tax times new quantity; half the tax times the fall in quantity")
tp = [r[1] for r in rows("mic-u3-q01")]; mp = [b - a for a, b in zip(tp, tp[1:])]
check("mic-u3-q01", key("mic-u3-q01") == "%d sandwiches" % mp[2], "marginal product of the third worker")
check("mic-u3-q02", next(i for i in range(1, 5) if mp[i] < mp[i - 1]) == 2 and key("mic-u3-q02").startswith("third worker"), "first worker whose marginal product falls")
a = nums(stem("mic-u3-q04")); check("mic-u3-q04", key("mic-u3-q04") == "$%d" % ((a[1] + a[2]) / a[0]), "total cost over quantity")
a = nums(stem("mic-u3-q09")); check("mic-u3-q09", a[0] - a[1] - a[2] == 0 and key("mic-u3-q09").startswith("zero economic profit"), "revenue minus all costs")
price = nums(intro("mic-u3-q11"))[0]; check("mic-u3-q11", key("mic-u3-q11") == "%d units" % sum(1 for r in rows("mic-u3-q11") if r[1] <= price), "units whose marginal cost is no more than the price")
a = nums(stem("mic-u3-q12")); check("mic-u3-q12", a[0] > a[1] and a[1] + a[2] - a[0] < a[2] and key("mic-u3-q12").startswith("keep producing: its $%d loss" % (a[1] + a[2] - a[0])), "loss from producing versus fixed cost")
A, B = [g for g in fig("mic-u3-q14")["guides"]][:2]
check("mic-u3-q14", round(line_y(S("mic-u3-q14", "MC"), A["x"]), 6) == A["y"] and key("mic-u3-q14") == "$%d" % ((A["y"] - B["y"]) * A["x"]), "(price − ATC) × quantity where MC = MR")
mc = S("mic-u4-q03", "MC = ATC")["points"][0][1]; q = line_x(S("mic-u4-q03", "MR"), mc); pm = line_y(S("mic-u4-q03", "D"), q); qc = line_x(S("mic-u4-q03", "D"), mc)
check("mic-u4-q03", key("mic-u4-q03") == "%d units at a price of $%d" % (q, pm), "MR = MC, then the price on the demand curve")
check("mic-u4-q04", key("mic-u4-q04") == "$%d" % (.5 * (pm - mc) * (qc - q)), "triangle between demand and MC from the monopoly to the efficient quantity")
hh, hl, lh, ll = rows("mic-u4-q15")   # each row: [A's profit, B's profit]
check("mic-u4-q15", lh[0] > hh[0] and ll[0] > hl[0] and key("mic-u4-q15").startswith("A low price"), "A earns more with low whichever price B chooses")
check("mic-u4-q16", hl[1] > hh[1] and ll[1] > lh[1] and ll[0] < hh[0] and key("mic-u4-q16").startswith("Both charge low and earn $%d each, less than the $%d" % (ll[0], hh[0])), "low is dominant for both; both-low pays less than both-high")
a = nums(stem("mic-u5-q09")); check("mic-u5-q09", key("mic-u5-q09") == "$%d" % (a[0] * a[1]), "marginal product times price")
price, wage = nums(intro("mic-u5-q10"))[:2]; tp = [r[1] for r in rows("mic-u5-q10")]
check("mic-u5-q10", key("mic-u5-q10") == "%d workers" % sum(1 for a, b in zip(tp, tp[1:]) if (b - a) * price >= wage), "workers whose MRP is at least the wage")
a = nums(stem("mic-u5-q12")); check("mic-u5-q12", a[3] / a[1] > a[2] / a[0] and key("mic-u5-q12").startswith("more machines and fewer workers"), "marginal product per dollar")
r = rows("mic-u5-q16"); tc = [x[0] * x[1] for x in r]; mfc = [tc[0]] + [b - a for a, b in zip(tc, tc[1:])]; n = sum(1 for x, m in zip(r, mfc) if x[2] >= m)
check("mic-u5-q16", key("mic-u5-q16") == "%d workers at a wage of $%d" % (n, r[n - 1][1]), "workers whose MRP is at least marginal factor cost; wage from the supply schedule")
a = nums(stem("mic-u6-q04")); check("mic-u6-q04", a[0] > a[1] and key("mic-u6-q04").startswith("increased"), "MSB above MSC")
D_, MPC, MSC = S("mic-u6-q06", "D = MSB"), S("mic-u6-q06", "MPC"), S("mic-u6-q06", "MSC"); qm = cross(D_, MPC)[0]; qo = cross(D_, MSC)[0]; gap = line_y(MSC, qm) - line_y(D_, qm)
check("mic-u6-q06", key("mic-u6-q06") == "The market produces %d units; the socially optimal quantity is %d units" % (round(qm), round(qo)), "demand meets MPC and MSC")
check("mic-u6-q07", key("mic-u6-q07") == "$%d" % round(.5 * gap * (qm - qo)), "triangle between MSC and MSB")
check("mic-u6-q09", key("mic-u6-q09").startswith("A per-unit tax of $%d on producers" % round(line_y(MSC, 0) - line_y(MPC, 0))), "tax equal to the marginal external cost")
a = nums(stem("mic-u6-q17")); check("mic-u6-q17", a[3] > a[1] and a[2] > a[0] and key("mic-u6-q17") == "progressive", "tax share rises with income")

# ---------------- AP Psychology ----------------
r = {l.split(":")[0]: nums(l.split(":")[1]) for l in PS["psy1-b"]["text"]}
check("psy-u1-q05", r["Identical twins raised together"][0] > r["Fraternal twins raised together"][0] and key("psy-u1-q05").startswith("Identical twins raised together") and "fraternal twins raised together" in key("psy-u1-q05"), "same home, more shared genes, higher correlation")
check("psy-u1-q06", r["Identical twins raised together"][0] >= .7 and key("psy-u1-q06").startswith("A strong positive correlation"), "r of +.82 is strong and positive")
check("psy-u1-q08", min(r, key=lambda k: r[k][1]) == "Identical twins raised apart" and key("psy-u1-q08").startswith("Identical twins raised apart"), "fewest pairs")
a = nums(stem("psy-u1-q18")); check("psy-u1-q18", key("psy-u1-q18") == "About %d grams" % round(a[2] * a[1] / a[0]), "Weber's law: the same proportion")
r = nums(PS["psy1-a"]["text"][3]); d = (r[0] - r[2]) / ((r[1] ** 2 + r[3] ** 2) / 2) ** .5
check("psy-u1-q04", r[0] > r[2] and abs(d - r[-1]) < 0.1 and key("psy-u1-q04").startswith("Memory consolidation"), "full-sleep group recalled more; reported effect size matches the means and standard deviations")
r = nums(PS["psy2-a"]["text"][3]); check("psy-u2-q04", r[3] < r[1] and r[2] > r[0] and "distributed group were more tightly clustered" in key("psy-u2-q04"), "smaller standard deviation in the distributed group")
g1 = [nums(l)[-3] for l in PS["psy2-b"]["text"][1:]]; g2 = [nums(l)[-1] for l in PS["psy2-b"]["text"][1:]]
check("psy-u2-q05", g1[0] - g1[2] > g1[2] - g1[4] and "rapid early loss" in key("psy-u2-q05"), "more loss in the first day than in the next 29")
check("psy-u2-q06", g1[0] - g1[2] > (g1[0] - g1[4]) / 2 and g2[0] - g2[2] > (g2[0] - g2[4]) / 2 and "within the first day" in key("psy-u2-q06"), "most forgetting within a day for both groups")
check("psy-u2-q07", all(x > y for x, y in zip(g1, g2)) and key("psy-u2-q07").startswith("retroactive interference"), "the group that learned a second list recalled less of the first")
a = nums(stem("psy-u2-q19")); check("psy-u2-q19", a[2] == a[0] - a[1] and a[3] == a[0] + a[1] and key("psy-u2-q19") == "About 68%", "one standard deviation each side of the mean")
r = [nums(l)[-1] for l in PS["psy3-b"]["text"]]; check("psy-u3-q06", r[4] > r[3] and key("psy-u3-q06") == "spontaneous recovery", "responding rebounds after the rest")
check("psy-u3-q07", r[5] > 50 > r[6] and key("psy-u3-q07").startswith("generalization to a similar sound"), "high responding to the similar tone, low to the different sound")
easy, hard = [nums(l) for l in PS["psy4-b"]["text"]]
check("psy-u4-q05", hard[1] > hard[0] and hard[1] > hard[2] and "Yerkes-Dodson" in key("psy-u4-q05"), "difficult task peaks at moderate arousal")
check("psy-u4-q06", easy[2] > easy[1] and hard[2] < hard[1] and key("psy-u4-q06").startswith("High arousal helped on the easy task but hurt"), "easy task up, difficult task down")
check("psy-u4-q07", key("psy-u4-q07") == "%d" % round(sum(hard) / 3), "mean of the three difficult-task scores")
d = nums(stem("psy-u5-q03"))[0]; check("psy-u5-q03", d >= 0.8 and "was large" in key("psy-u5-q03"), "effect size of 0.8 or more is large")
r = nums(PS["psy5-b"]["text"][3])[0]; m = [nums(l)[0] for l in PS["psy5-b"]["text"][:3]]
check("psy-u5-q05", 0.3 <= r <= 0.7 and m == sorted(m) and key("psy-u5-q05").startswith("A moderate positive correlation"), "r between 0.3 and 0.7, rising group means")

print("questions recomputed from their own data: %d | failures: %d" % (done, len(fails)))
for f in fails: print("  ", f)
sys.exit(1 if fails else 0)
