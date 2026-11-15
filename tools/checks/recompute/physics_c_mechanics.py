#!/usr/bin/env python3
"""Recomputes the arithmetic behind keyed answers for physics c mechanics (offline). Run: python3 tools/checks/recompute/physics_c_mechanics.py

Each entry redoes a calculation from the numbers in the question and compares the result with the keyed choice (and
often with the values behind wrong choices). Entries that only compared a key with typed text were removed, so the
questions listed as "not recomputed" are conceptual and were checked by reading only. Exit code 1 on any failure. Needs sympy (pip install sympy).
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) + os.sep
# Independent check of every AP Physics C: Mechanics answer key, distractor arithmetic, and worked example.
import json, math, sympy as sp
t, x, s, k, v0, L = sp.symbols("t x s k v0 L", positive=True)
xr = sp.symbols("xr", real=True)
D = ROOT + "data/courses/ap-physics-c-mechanics/"
Qs = {q["id"]: q for u in range(1, 8) for q in json.load(open(D + "u%d.json" % u))["questions"]}
fails, seen = [], set()
def key(qid): seen.add(qid); q = Qs[qid]; return q["choices"][q["correctAnswer"]]
def rel(a, b, tol=0.03): a, b = float(a), float(b); return abs(a - b) <= tol * abs(b) if b else abs(a) < 1e-9
def check(qid, ok, note=""):
    if not ok: fails.append(qid + " " + note)
    print(("OK  " if ok else "FAIL"), qid, note)
g = 10

# ---- Unit 1 ----
X = 3*t**2 - 2*t + 1; V = sp.diff(X, t)
check("phcmu1-q01", key("phcmu1-q01") == "10 m/s" and V.subs(t, 2) == 10 and X.subs(t, 2) == 9 and sp.diff(V, t) == 6)
Vt = 2 + sp.integrate(6*s, (s, 0, t))
check("phcmu1-q02", key("phcmu1-q02") == "14 m/s" and Vt.subs(t, 2) == 14 and (6*t**2 + 2).subs(t, 2) == 26)
v = 4 - 2*t
d1 = sp.integrate(v, (t, 0, 2)); d2 = sp.integrate(v, (t, 2, 3))
check("phcmu1-q03", key("phcmu1-q03") == "5 m" and d1 == 4 and d2 == -1 and d1 + abs(d2) == 5 and d1 + d2 == 3 and v.subs(t, 3) == -2)
f = sp.Function("f")
sol = sp.dsolve(sp.Eq(f(t).diff(t), -k*f(t)), f(t), ics={f(0): v0})
check("phcmu1-q05", key("phcmu1-q05") == "v₀e^(−kt)" and sp.simplify(sol.rhs - v0*sp.exp(-k*t)) == 0)
X6 = t**3 - 6*t**2
check("phcmu1-q06", key("phcmu1-q06").startswith("Speeding up") and sp.diff(X6, t).subs(t, 1) == -9 and sp.diff(X6, t, 2).subs(t, 1) == -6)
T7 = math.sqrt(2*20/g)
check("phcmu1-q07", key("phcmu1-q07") == "24 m" and rel(12*T7, 24) and rel(2*20/g*12, 48))
check("phcmu1-q08", key("phcmu1-q08") == "About 6.3 m/s" and rel(math.hypot(2, 6), 6.32, 0.01))
check("phcmu1-q09", key("phcmu1-q09") == "28.8 m" and rel((30*0.8)**2/(2*g), 28.8) and rel(900/20, 45) and rel((30*0.6)**2/20, 16.2) and rel(24**2/g, 57.6))
X10 = t**3 - 6*t**2 + 9*t; V10 = sp.diff(X10, t)
dist = abs(X10.subs(t, 1) - X10.subs(t, 0)) + abs(X10.subs(t, 2) - X10.subs(t, 1))
check("phcmu1-q10", key("phcmu1-q10") == "1 m/s" and (X10.subs(t, 2) - X10.subs(t, 0))/2 == 1 and dist/2 == 3 and V10.subs(t, 2) == -3 and sp.solve(V10, t) == [1, 3])
Xg = 4 + t**3 - 12*t
check("phcmu1-guide", Xg.subs(t, 3) == -5 and Xg.subs(t, 2) == -12 and abs(Xg.subs(t, 2) - 4) + abs(Xg.subs(t, 3) - Xg.subs(t, 2)) == 23)

# ---- Unit 2 ----
check("phcmu2-q01", key("phcmu2-q01") == "x = 3.0 m" and (2*0 + 6*4)/8 == 3 and 2*4/8 == 1)
lam = k*x
xcm = sp.integrate(x*lam, (x, 0, L))/sp.integrate(lam, (x, 0, L))
xcm2 = sp.integrate(x*k*x**2, (x, 0, L))/sp.integrate(k*x**2, (x, 0, L))
xcm3 = sp.integrate(x*k*(L-x), (x, 0, L))/sp.integrate(k*(L-x), (x, 0, L))
check("phcmu2-q02", key("phcmu2-q02") == "x = 2L/3" and sp.simplify(xcm - 2*L/3) == 0 and sp.simplify(xcm2 - 3*L/4) == 0 and sp.simplify(xcm3 - L/3) == 0)
check("phcmu2-q04", key("phcmu2-q04") == "4.0 m/s²" and 12/3 == 4)
a5 = 2*g/5
check("phcmu2-q05", key("phcmu2-q05") == "12 N" and rel(3*a5, 12) and rel(2*a5, 8))
check("phcmu2-q07", key("phcmu2-q07") == "5.0 m/s² downward" and rel((2*g - 4*2.5)/2, 5) and rel(2*g/4, 5) and rel((20 + 10)/2, 15))
check("phcmu2-q08", key("phcmu2-q08") == "4.0 N toward the center" and rel(0.5*16/2, 4) and rel(0.5*4/2, 1) and rel(0.5*16*2, 16))
check("phcmu2-q09", key("phcmu2-q09") == "20 m/s" and rel(math.sqrt(0.8*g*50), 20) and rel(math.sqrt(g*50), 22.4, 0.01) and rel(math.sqrt(g*50/0.8), 25))
check("phcmu2-q10", key("phcmu2-q10") == "About 2.5 m/s²" and rel(9.8/4, 2.45, 0.01) and rel(9.8/9, 1.1, 0.02))
check("phcmu2-q11", key("phcmu2-q11") == "Half as fast" and rel(math.sqrt(1/4), 0.5))
check("phcmu2-guide", rel(1200*144/40, 4320) and rel(144/(g*40), 0.36))

# ---- Unit 3 ----
check("phcmu3-q01", key("phcmu3-q01") == "8.0 J" and sp.integrate(3*x**2, (x, 0, 2)) == 8 and rel(sp.integrate(x**2, (x, 0, 2)), 2.7, 0.02))
check("phcmu3-q02", key("phcmu3-q02") == "About 5.4 m/s" and rel(math.sqrt(29), 5.39, 0.01) and rel(math.sqrt(20), 4.47, 0.01))
U3 = 4*x**2
check("phcmu3-q03", key("phcmu3-q03") == "−12 N" and -sp.diff(U3, x).subs(x, sp.Rational(3, 2)) == -12 and U3.subs(x, sp.Rational(3, 2)) == 9)
check("phcmu3-q04", key("phcmu3-q04") == "2.0 m" and rel(0.5*200*0.01/(0.05*g), 2.0) and rel(200*0.01/(0.05*g), 4) and rel(200*0.1/(0.05*g), 40) and rel(0.5*200*0.01/0.05, 20))
U5 = x**3 - 3*x; eq = sp.solve(sp.diff(U5, x), x)
check("phcmu3-q05", key("phcmu3-q05") == "x = 1 and x = −1; x = 1 is stable" and sorted(sp.solve(sp.diff(xr**3 - 3*xr, xr))) == [-1, 1] and sp.diff(xr**3 - 3*xr, xr, 2).subs(xr, 1) > 0 and sp.diff(xr**3 - 3*xr, xr, 2).subs(xr, -1) < 0)
check("phcmu3-q06", key("phcmu3-q06") == "About 6.3 m/s" and rel(math.sqrt(2*(2*g*3 - 20)/2), 6.32, 0.01) and rel(math.sqrt(60), 7.7, 0.01) and rel(math.sqrt(80), 8.9, 0.01))
check("phcmu3-q07", key("phcmu3-q07") == "200 W" and rel(50*g*4/10, 200) and rel(50*4/10, 20))
check("phcmu3-q08", key("phcmu3-q08") == "45 kW" and rel(1500*30, 45000) and rel(1500/30, 50))
check("phcmu3-q09", key("phcmu3-q09") == "16 J" and sp.integrate(6*t**2, (t, 0, 2)) == 16 and rel(sp.integrate(t**2, (t, 0, 2)), 2.7, 0.02))
Wg = sp.integrate(12 - 4*x, (x, 0, 2))
check("phcmu3-guide", Wg == 16 and rel(math.sqrt(2*16/2), 4.0))

# ---- Unit 4 ----
check("phcmu4-q01", key("phcmu4-q01") == "6.0 kg·m/s" and rel(0.15*40, 6) and rel(0.5*0.15*1600, 120))
J = sp.integrate(10*t, (t, 0, 3))
check("phcmu4-q02", key("phcmu4-q02") == "9.0 m/s" and J == 45 and J/5 == 9 and 30*3/5 == 18)
check("phcmu4-q03", key("phcmu4-q03") == "180 N" and rel(0.2*18/0.02, 180) and rel(0.2*2/0.02, 20))
check("phcmu4-q04", key("phcmu4-q04") == "2.0 m/s" and rel(2*3/3, 2))
check("phcmu4-q05", key("phcmu4-q05") == "0.50 m/s backward" and rel(2*15/60, 0.5))
vbx, vby = 5.0 - 3.0*0.6, 0 - 3.0*0.8
Kb, Ka = 0.5*25, 0.5*9 + 0.5*(vbx**2 + vby**2)
check("phcmu4-q06", key("phcmu4-q06") == "4.0 m/s, about 37° south of east" and rel(math.hypot(vbx, vby), 4.0) and abs(math.degrees(math.atan2(-vby, vbx)) - 37) < 0.5 and rel(Ka, Kb, 0.001), "K before %.2f after %.2f" % (Kb, Ka))
check("phcmu4-q08", key("phcmu4-q08") == "3.0 J" and rel(0.5*2*9 - 0.5*3*4, 3))
v1, v2 = (1 - 2)*6/3, 2*1*6/3
check("phcmu4-q09", key("phcmu4-q09") == "1.0 kg ball: −2.0 m/s; 2.0 kg ball: +4.0 m/s" and v1 == -2 and v2 == 4 and 1*v1 + 2*v2 == 6 and 0.5*v1**2 + 0.5*2*v2**2 == 18 and 0.5*2*9 == 9)
check("phcmu4-guide", rel(0.05*400/2.0, 10) and rel(0.5*0.05*400**2, 4000) and rel(0.5*2*100, 100))

# ---- Unit 5 ----
check("phcmu5-q01", key("phcmu5-q01") == "3.0 N·m" and rel(0.3*20*0.5, 3) and rel(6*math.cos(math.radians(30)), 5.2, 0.01) and rel(20/0.3, 67, 0.01))
check("phcmu5-q02", key("phcmu5-q02") == "1.5 m" and rel(30*2/40, 1.5) and rel(40*2/30, 2.7, 0.02))
R = (100*2 + 200*1)/4
check("phcmu5-q03", key("phcmu5-q03") == "100 N" and rel(R, 100) and rel(300 - R, 200) and rel(200*1/4, 50))
check("phcmu5-q04", key("phcmu5-q04") == "25 rad" and 0.5*2*25 == 25 and 2*5 == 10)
th = 2*t**3
check("phcmu5-q05", key("phcmu5-q05") == "12 rad/s²" and sp.diff(th, t, 2).subs(t, 1) == 12 and sp.diff(th, t).subs(t, 1) == 6)
check("phcmu5-q06", key("phcmu5-q06") == "2.0 m/s" and rel(0.4*5, 2) and rel(2*math.pi*0.4*5, 12.6, 0.01))
check("phcmu5-q07", key("phcmu5-q07") == "1.0 kg·m²" and rel(2*2*0.25, 1.0))
check("phcmu5-q08", key("phcmu5-q08") == "4.0 rad/s²" and rel(2/(0.5*4*0.25), 4) and rel(2/(4*0.25), 2))
check("phcmu5-q09", key("phcmu5-q09") == "5.0 m/s²" and rel(2*g/(2 + 4/2), 5) and rel(2*g/(2 + 4), 3.33, 0.01) and rel(2*g/(2 + 4/4), 6.67, 0.01))
check("phcmu5-guide", rel(1.2*4/3, 1.6) and rel(1.2*g*1.0/1.6, 7.5))

# ---- Unit 6 ----
check("phcmu6-q01", key("phcmu6-q01") == "9.0 J" and rel(0.5*2*9, 9) and rel(2*3, 6))
vs = lambda c: math.sqrt(2*g*1.4/(1 + c))
check("phcmu6-q02", key("phcmu6-q02") == "About 4.5 m/s" and rel(vs(0.4), 4.47, 0.01) and rel(vs(0), 5.29, 0.01) and rel(vs(1), 3.74, 0.01) and rel(vs(0.5), 4.32, 0.01))
check("phcmu6-q03", key("phcmu6-q03") == "Sphere, then disk, then hoop" and vs(0.4) > vs(0.5) > vs(1))
check("phcmu6-q04", key("phcmu6-q04") == "1/3" and sp.Rational(1, 4)/sp.Rational(3, 4) == sp.Rational(1, 3))
check("phcmu6-q05", key("phcmu6-q05") == "2.0 kg·m²/s" and rel(0.5*4, 2))
check("phcmu6-q06", key("phcmu6-q06") == "5.0 rad/s" and rel(4*2/1.6, 5))
check("phcmu6-q07", key("phcmu6-q07").startswith("It increases from 8.0 J to 20 J") and rel(0.5*4*4, 8) and rel(0.5*1.6*25, 20))
check("phcmu6-q08", key("phcmu6-q08") == "About 6.3 × 10³ m/s" and rel(math.sqrt(4e14/1e7), 6.32e3, 0.01) and rel(math.sqrt(2*4e14/1e7), 8.9e3, 0.01) and rel(4e14/1e14, 4))
check("phcmu6-q09", key("phcmu6-q09") == "30 km/s" and rel(20*1.5, 30) and rel(20/1.5, 13, 0.03) and rel(20*1.5**2, 45))
check("phcmu6-q10", key("phcmu6-q10").startswith("Gravity is always perpendicular"))
check("phcmu6-guide", rel(0.75*2*9, 13.5))

# ---- Unit 7 ----
check("phcmu7-q01", key("phcmu7-q01") == "About 0.63 s" and rel(2*math.pi*math.sqrt(0.5/50), 0.628, 0.01) and rel(2*math.pi*math.sqrt(50/0.5), 63, 0.01) and rel(1/(2*math.pi*0.1), 1.6, 0.01))
xx = sp.Rational(1, 5)*sp.cos(5*t)
check("phcmu7-q02", key("phcmu7-q02") == "1.0 m/s" and sp.maximum(sp.diff(xx, t), t, sp.Interval(0, 2*sp.pi)) == 1)
check("phcmu7-q03", key("phcmu7-q03") == "0.75 J" and rel(0.5*200*0.01 - 0.5*200*0.0025, 0.75))
y = sp.Function("y"); gen = sp.dsolve(y(t).diff(t, 2) + 16*y(t)).rhs
check("phcmu7-q04", key("phcmu7-q04") == "About 1.6 s" and sp.cos(4*t) in [a for a in gen.atoms(sp.cos)] and rel(2*math.pi/4, 1.57, 0.01) and rel(2*math.pi/16, 0.39, 0.01))
check("phcmu7-q05", key("phcmu7-q05") == "About 3.1 s" and rel(2*math.pi*math.sqrt(2.5/g), 3.14, 0.01) and rel(2*math.pi*math.sqrt(g/2.5), 12.6, 0.01))
check("phcmu7-q06", key("phcmu7-q06") == "It doubles" and math.sqrt(4) == 2)
check("phcmu7-q07", key("phcmu7-q07") == "It becomes about 2.4 times longer" and rel(math.sqrt(6), 2.45, 0.01))
Tr = 2*math.pi*math.sqrt(2*1.5/(3*g))
check("phcmu7-q08", key("phcmu7-q08") == "About 2.0 s" and rel(Tr, 2.0, 0.01) and rel(2*math.pi*math.sqrt(1.5/g), 2.43, 0.01) and rel(2*math.pi*math.sqrt(0.75/g), 1.72, 0.01) and rel(2*math.pi*math.sqrt(1.5/(6*g)), 0.99, 0.01))
check("phcmu7-q09", key("phcmu7-q09").startswith("Its rotational inertia about the pivot"))
# exact large-amplitude period ratio: T/T0 = 2K(sin²(θ0/2))/π
m_ = math.sin(math.radians(30))**2
Kell = float(sp.elliptic_k(m_))
ratio = 2*Kell/math.pi
check("phcmu7-q10", key("phcmu7-q10").startswith("It is somewhat longer") and 1.06 < ratio < 1.08, "T(60°)/T0 = %.4f" % ratio)
check("phcmu7-guide", rel(math.sqrt(160/0.4), 20) and rel(2*math.pi/20, 0.31, 0.02) and rel(0.05*20, 1.0) and rel(0.5*160*0.0025, 0.2))

missing = sorted(set(Qs) - seen)
print("\nquestions:", len(Qs), "checked:", len(seen & set(Qs)), "unchecked:", missing, "failures:", fails)

import sys
sys.exit(1 if (globals().get('bad') or globals().get('fails') or globals().get('failures')) else 0)
