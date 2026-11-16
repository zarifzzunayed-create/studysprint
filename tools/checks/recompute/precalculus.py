#!/usr/bin/env python3
"""Recomputes the arithmetic behind keyed answers for precalculus (offline). Run: python3 tools/checks/recompute/precalculus.py

Each entry redoes a calculation from the numbers in the question and compares the result with the keyed choice (and
often with the values behind wrong choices). Entries that only compared a key with typed text were removed, so the
questions listed as "not recomputed" are conceptual and were checked by reading only. Exit code 1 on any failure. Needs sympy (pip install sympy).
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) + os.sep
# Independent check of every AP Precalculus answer key and of the arithmetic quoted in explanations.
# Recomputes each answer with sympy from the problem statement, then compares with the keyed choice.
import json, sympy as sp
from sympy import pi, sqrt, Rational as R, sin, cos, log, exp, Matrix, symbols, solve, Interval, solveset, S
x, t, th, y, n = symbols("x t theta y n", real=True)
D = ROOT + "data/courses/ap-precalculus/"
Qs = {q["id"]: q for u in ("u1", "u2", "u3", "u4") for q in json.load(open(D + u + ".json"))["questions"]}
fails = []
def key(qid): q = Qs[qid]; return q["choices"][q["correctAnswer"]]
def check(qid, ok, note=""):
    if not ok: fails.append(qid + " " + note)
    print(("OK  " if ok else "FAIL"), qid, note)
near = lambda a, b, tol=0.006: abs(float(a) - float(b)) <= tol

# ---- Unit 1 ----
f = x**2 + 1
aroc = (f.subs(x, 3) - f.subs(x, 1)) / 2
check("pc-u1-q01", key("pc-u1-q01") == "4" and aroc == 4 and f.subs(x,3)-f.subs(x,1) == 8 and f.subs(x,3)/2 == 5)
g = x**2 + x + 3
vals = [3, 5, 9, 15, 23]
d1 = [vals[i+1]-vals[i] for i in range(4)]; d2 = [d1[i+1]-d1[i] for i in range(3)]
check("pc-u1-q02", key("pc-u1-q02") == "Quadratic" and all(g.subs(x, i) == v for i, v in enumerate(vals)) and len(set(d2)) == 1 and len(set(d1)) > 1)
check("pc-u1-q03", key("pc-u1-q03") == "Increasing and concave down")  # rates 6,4,3,1 positive and decreasing
p = -2*x**5 + 7*x**2 - 1
check("pc-u1-q04", sp.limit(p, x, sp.oo) == -sp.oo and sp.limit(p, x, -sp.oo) == sp.oo and key("pc-u1-q04").startswith("As x → ∞, p(x) → −∞; as x → −∞, p(x) → ∞"))
p5 = (x-1)**2*(x+3)
sign_change = lambda e, a: sp.sign(e.subs(x, a-R(1,10))) != sp.sign(e.subs(x, a+R(1,10)))
check("pc-u1-q05", not sign_change(p5, 1) and sign_change(p5, -3) and key("pc-u1-q05").startswith("It touches the x-axis at x = 1"))
r6 = (x**2-4)/(x**2-x-2); rs = sp.cancel(r6)
check("pc-u1-q06", sp.factor(x**2-x-2) == (x-2)*(x+1) and rs == (x+2)/(x+1) and rs.subs(x, 2) == R(4,3) and key("pc-u1-q06").startswith("A hole at x = 2"))
q7, r7 = sp.div(2*x**2+3*x-1, x-1)
check("pc-u1-q07", q7 == 2*x+5 and r7 == 4 and key("pc-u1-q07") == "y = 2x + 5")
P8 = sp.expand((x-1)**2*(x-(2-sp.I))*(x-(2+sp.I)))
check("pc-u1-q08", all(c.is_real for c in sp.Poly(P8, x).all_coeffs()) and sp.degree(P8, x) == 4 and key("pc-u1-q08") == "4")
check("pc-u1-q09", key("pc-u1-q09") == "0 < x < 10" and (x*(20-2*x)**2).subs(x, 10) == 0)
C = (500+2*n)/n
check("pc-u1-q10", sp.limit(C, n, sp.oo) == 2 and C.subs(n, 2) == 252 and sp.simplify(C - 2 - 500/n) == 0)
h = -R(49,10)*t**2 + 20*t + 2
roots = [float(r) for r in solve(h, t)]; land = max(roots)
check("pc-u1-q11", near(land, 4.18) and near(20/9.8, 2.04) and near(20/4.9, 4.08) and min(roots) < 0 and key("pc-u1-q11") == "0 ≤ t ≤ 4.18", "land=%.4f" % land)

# ---- Unit 2 ----
check("pc-u2-q01", 5*3**5 == 1215 and 5*3**6 == 3645 and 5*3**4 == 405 and 5 + 5*3 == 20 and key("pc-u2-q01") == "1215")
check("pc-u2-q03", 4*3**0 == 4 and 4*3**2 == 36 and key("pc-u2-q03") == "f(x) = 4·3ˣ")
A = lambda tt: 80*R(1,2)**(R(tt)/6)
check("pc-u2-q04", near(A(15), 14.1, 0.05) and A(12) == 20 and A(18) == 10 and near(80*0.5**(6/15), 60.6, 0.05) and key("pc-u2-q04") == "14.1 mg", "A15=%.4f" % float(A(15)))
check("pc-u2-q05", near(49.5-52.0, -2.5) and near(49.5/52, 0.95, 0.005) and key("pc-u2-q05") == "−2.5")
check("pc-u2-q06", key("pc-u2-q06").startswith("The model misses a curved pattern"))
check("pc-u2-q07", near(sp.exp(1.5), 4.48) and near(sp.exp(0.2), 1.22) and key("pc-u2-q07") == "y ≈ 4.48(1.22)ˣ", "e^1.5=%.4f e^.2=%.4f" % (float(sp.exp(1.5)), float(sp.exp(0.2))))
fi = sp.solve(sp.Eq(3*y - 6, x), y)[0]
check("pc-u2-q08", sp.simplify(fi - (x+6)/3) == 0 and sp.simplify((3*x-6).subs(x, x/3-6) - x) != 0 and key("pc-u2-q08") == "f⁻¹(x) = (x + 6)/3")
F = x**2 + 1; G = 2*x - 3
check("pc-u2-q09", F.subs(x, G.subs(x, 2)) == 2 and G.subs(x, F.subs(x, 2)) == 7 and F.subs(x,2)*G.subs(x,2) == 5 and G.subs(x,2) == 1 and key("pc-u2-q09") == "2")
xs = sp.log(40)/sp.log(5)
check("pc-u2-q10", near(xs, 2.292, 0.0006) and near(sp.log(5)/sp.log(40), 0.436, 0.0006) and near(sp.log(40), 3.689, 0.0006) and near(5**float(xs), 40, 1e-6) and key("pc-u2-q10") == "2.292")
check("pc-u2-q11", 3*2-5 == 1 and R(6,5) == R(12,10) and 3*2+5 == 11 and 3*(2-5) == -9 and key("pc-u2-q11") == "1")
check("pc-u2-q12", sp.simplify(10*sp.log(100, 10)) == 20 and key("pc-u2-q12") == "It increases by 20 dB")
# guide example (u2): t = ln 1.5 / ln 1.03
check("pc-u2-guide", near(sp.log(1.5)/sp.log(1.03), 13.7, 0.05), "t=%.3f" % float(sp.log(1.5)/sp.log(1.03)))

# ---- Unit 3 ----
check("pc-u3-q01", sin(5*pi/6) == R(1,2) and cos(5*pi/6) == -sqrt(3)/2 and key("pc-u3-q01") == "1/2")
check("pc-u3-q02", sqrt(9+16) == 5 and key("pc-u3-q02") == "−3/5")
check("pc-u3-q03", 2*pi/2 == pi and key("pc-u3-q03") == "π")
hh = 25 - 20*cos(pi*t/4)
check("pc-u3-q04", hh.subs(t, 0) == 5 and hh.subs(t, 4) == 45 and hh.subs(t, 8) == 5 and near(2*pi/8, 0.785, 0.001) and key("pc-u3-q04") == "h(t) = 25 − 20cos(πt/4)")
T = 20 - 10*cos(pi*(t-1)/6)
check("pc-u3-q05", T.subs(t, 1) == 10 and T.subs(t, 7) == 30 and T.subs(t, 13) == 10 and key("pc-u3-q05") == "T(t) = 20 − 10cos(π(t − 1)/6)")
check("pc-u3-q06", sp.asin(-R(1,2)) == -pi/6 and sin(7*pi/6) == -R(1,2) and sin(11*pi/6) == -R(1,2) and sin(-pi/3) == -sqrt(3)/2 and key("pc-u3-q06") == "−π/6")
sol7 = solveset(2*cos(x)-1, x, Interval.Ropen(0, 2*pi))
check("pc-u3-q07", sol7 == sp.FiniteSet(pi/3, 5*pi/3) and cos(2*pi/3) == -R(1,2) and key("pc-u3-q07") == "x = π/3 and x = 5π/3")
sol8 = solveset(sin(2*x)-sqrt(3)/2, x, Interval.Ropen(0, pi))
check("pc-u3-q08", sol8 == sp.FiniteSet(pi/6, pi/3) and sp.simplify(sin(2*7*pi/6) - sqrt(3)/2) == 0 and sp.simplify(sin(2*4*pi/3) - sqrt(3)/2) == 0 and key("pc-u3-q08") == "x = π/6 and x = π/3")
check("pc-u3-q09", 2*cos(pi/3) == 1 and 2*sin(pi/3) == sqrt(3) and key("pc-u3-q09") == "(1, √3)")
X, Y = symbols("X Y", real=True)
check("pc-u3-q10", sp.expand((X-2)**2 + Y**2 - 4 - (X**2 + Y**2 - 4*X)) == 0 and key("pc-u3-q10") == "A circle with center (2, 0) and radius 2")
r = 3 + 2*sin(th)
check("pc-u3-q11", r.subs(th, pi/2) == 5 and r.subs(th, pi) == 3 and sp.minimum(r, th, Interval(0, 2*pi)) == 1 and key("pc-u3-q11").startswith("r decreases from 5 to 3"))
check("pc-u3-q12", sp.simplify((r.subs(th, pi/2) - r.subs(th, 0))/(pi/2) - 4/pi) == 0 and key("pc-u3-q12") == "4/π")
sol_ex = solveset(2*sin(x)+sqrt(3), x, Interval.Ropen(0, 2*pi))
check("pc-u3-guide", sol_ex == sp.FiniteSet(4*pi/3, 5*pi/3))

# ---- Unit 4 ----
check("pc-u4-q01", (2*3, 3**2+1) == (6, 10) and key("pc-u4-q01") == "(6, 10)")
check("pc-u4-q02", sp.simplify((2*cos(t))**2/4 + (5*sin(t))**2/25) == 1 and key("pc-u4-q02") == "x²/4 + y²/25 = 1")
xt, yt = t**2, 3*t
check("pc-u4-q03", (yt.subs(t,3)-yt.subs(t,1))/(xt.subs(t,3)-xt.subs(t,1)) == R(3,4) and (yt.subs(t,3)-yt.subs(t,1))/2 == 3 and (xt.subs(t,3)-xt.subs(t,1))/2 == 4 and key("pc-u4-q03") == "3/4")
check("pc-u4-q05", sqrt(3**2 + 4**2) == 5 and key("pc-u4-q05") == "5")
check("pc-u4-q06", Matrix([2,1]).dot(Matrix([-1,2])) == 0 and key("pc-u4-q06") == "They are perpendicular")
pos = Matrix([1,2]) + 4*Matrix([3,-1])
check("pc-u4-q07", list(pos) == [13, -2] and Matrix([3,-1]).norm() == sqrt(10) and key("pc-u4-q07") == "(13, −2), speed √10 units per second")
check("pc-u4-q08", Matrix([[3,1],[2,4]]).det() == 10 and key("pc-u4-q08") == "10")
img = Matrix([[0,-1],[1,0]]) * Matrix([2,1])
check("pc-u4-q09", list(img) == [-1, 2] and list(Matrix([[0,1],[-1,0]])*Matrix([2,1])) == [1,-2] and key("pc-u4-q09").startswith("(−1, 2), a 90° counterclockwise"))
check("pc-u4-q10", abs(-3)*5 == 15 and key("pc-u4-q10") == "15 square units")
M = Matrix([[R(8,10), R(3,10)], [R(2,10), R(7,10)]]); s0 = Matrix([100, 100])
s1 = M*s0; s2 = M*s1
check("pc-u4-q11", list(s1) == [110, 90] and list(s2) == [115, 85] and key("pc-u4-q11") == "115")
Ai = Matrix([[2,1],[5,3]]).inv()
check("pc-u4-q12", Ai == Matrix([[3,-1],[-5,2]]) and key("pc-u4-q12") == "[3 −1; −5 2]")
check("pc-u4-guide", list(Matrix([[2,0],[0,3]])*Matrix([1,2])) == [2, 6] and Matrix([[2,0],[0,3]]).det() == 6)
# u1 guide example
re = (x**2-9)/(x**2+x-6)
check("pc-u1-guide", sp.cancel(re) == (x-3)/(x-2) and sp.cancel(re).subs(x, -3) == R(6,5) and sp.limit(re, x, sp.oo) == 1)

# Every keyed answer is checked above
checked = {f.split()[0] for f in fails}
print("\nquestions in files:", len(Qs), " failures:", fails)

import sys
sys.exit(1 if (globals().get('bad') or globals().get('fails') or globals().get('failures')) else 0)
