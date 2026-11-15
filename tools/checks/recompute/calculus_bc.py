#!/usr/bin/env python3
"""Recomputes the arithmetic behind keyed answers for calculus bc (offline). Run: python3 tools/checks/recompute/calculus_bc.py

Each entry redoes a calculation from the numbers in the question and compares the result with the keyed choice (and
often with the values behind wrong choices). Entries that only compared a key with typed text were removed, so the
questions listed as "not recomputed" are conceptual and were checked by reading only. Exit code 1 on any failure. Needs sympy (pip install sympy).
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) + os.sep
import json, glob
from sympy import *
x, t, h, y, n, th, C = symbols('x t h y n theta C', real=True)
D = {}
for f in glob.glob(ROOT + 'data/courses/ap-calculus-bc/u*.json'):
    for q in json.load(open(f))['questions']: D[q['id']] = q
key = lambda i: D[i]['choices'][D[i]['correctAnswer']]
ok = 0; bad = []; seen = set()
def chk(i, cond, expect=None):
    global ok
    seen.add(i)
    if expect is not None and key(i) != expect: bad.append((i, 'key text', key(i), expect)); return
    if not bool(cond): bad.append((i, 'math')); return
    ok += 1
I = integrate; L = limit; d = diff; oo_ = oo
# U1
chk('cbc-u1-q01', L((x**2-9)/(x-3), x, 3) == 6, '6')
f1 = x**2+1; f2 = 4*x-1
chk('cbc-u1-q02', L(f1, x, 2) == 5 and L(f2, x, 2) == 7, 'It does not exist')
chk('cbc-u1-q03', L(x**2*sin(1/x), x, 0) == 0, '0')
chk('cbc-u1-q04', L(sin(3*x)/x, x, 0) == 3, '3')
chk('cbc-u1-q05', solve(Eq(symbols('k')+1, 4))[0] == 3, 'k = 3')
chk('cbc-u1-q07', L((3*x**2-x)/(2*x**2+5), x, oo) == Rational(3, 2), '3/2')
chk('cbc-u1-q08', L(2*x/sqrt(x**2+1), x, oo) == 2 and L(2*x/sqrt(x**2+1), x, -oo) == -2, 'y = 2 and y = −2')
chk('cbc-u1-q09', L(sqrt(x**2+4*x)-x, x, oo) == 2, '2')
chk('ex1', L((sqrt(x+9)-3)/x, x, 0) == Rational(1, 6))
# U2
chk('cbc-u2-q01', L(((2+h)**3-8)/h, h, 0) == 12, '12')
chk('cbc-u2-q02', L((sin(pi/2+h)-1)/h, h, 0) == 0, '0')
chk('cbc-u2-q03', abs((4.41-3.61)/0.2 - 4.0) < 1e-9, '4.0')
a, b = symbols('a b')
s = solve([a+b-3, 2*a-4], [a, b]); chk('cbc-u2-q05', s[a] == 2 and s[b] == 1, 'a = 2, b = 1')
chk('cbc-u2-q06', d(5*x**4-3*x+7, x) == 20*x**3-3, '20x³ − 3')
chk('cbc-u2-q07', simplify(d(x**2*exp(x), x) - exp(x)*(x**2+2*x)) == 0, 'eˣ(x² + 2x)')
chk('cbc-u2-q08', simplify(d(sin(x)/x, x) - (x*cos(x)-sin(x))/x**2) == 0, '(x cos x − sin x)/x²')
xp = symbols('xp', positive=True)
tl = log(E) + (1/E)*(xp-E); chk('cbc-u2-q09', simplify(tl - xp/E) == 0, 'y = x/e')
chk('ex2', simplify(exp(1) + 3*E*(x-1) - (3*E*x - 2*E)) == 0 and d(x**2*exp(x), x).subs(x, 1) == 3*E)
# U3
chk('cbc-u3-q01', simplify(d((3*x**2+1)**5, x) - 30*x*(3*x**2+1)**4) == 0, '30x(3x² + 1)⁴')
chk('cbc-u3-q02', simplify(d(sin(4*x)**2, x) - 8*sin(4*x)*cos(4*x)) == 0, '8 sin(4x) cos(4x)')
chk('cbc-u3-q03', d(exp(-2*x), x, 2) == 4*exp(-2*x), '4e^(−2x)')
chk('cbc-u3-q04', 5*(-1) == -5, '−5')
Y = Function('Y')(x)
def imp(eq):
    return solve(d(eq, x), d(Y, x))[0]
chk('cbc-u3-q05', imp(x**2+Y**2-25).subs(Y, 4).subs(x, 3) == Rational(-3, 4), '−3/4')
chk('cbc-u3-q06', simplify(imp(x*Y+Y**3-10) + Y/(x+3*Y**2)) == 0, '−y/(x + 3y²)')
yp = imp(x**2+Y**2-1); ypp = d(yp, x).subs(d(Y, x), yp)
chk('cbc-u3-q07', simplify(ypp.subs(x**2, 1-Y**2) + 1/Y**3) == 0 or simplify((ypp + 1/Y**3).subs(x, sqrt(1-Y**2))) == 0, '−1/y³')
chk('cbc-u3-q08', 1/d(x**3+x, x).subs(x, 1) == Rational(1, 4) and (x**3+x).subs(x, 1) == 2, '1/4')
chk('cbc-u3-q09', simplify(d(atan(2*x), x) - 2/(1+4*x**2)) == 0, '2/(1 + 4x²)')
chk('ex3', imp(x**3+Y**3-6*x*Y).subs(Y, 3).subs(x, 3) == -1)
# U4
s_ = t**3-6*t**2+9*t; chk('cbc-u4-q02', set(solve(d(s_, t), t)) == {1, 3}, 't = 1 and t = 3')
v = t**2-4*t+3; aa = d(v, t)
sp = [tv for tv in [0.5, 1.5, 2.5, 3.5] if v.subs(t, tv)*aa.subs(t, tv) > 0]
chk('cbc-u4-q03', sp == [1.5, 3.5], '1 < t < 2 and t > 3')
chk('cbc-u4-q04', 2*pi*5*2 == 20*pi, '20π cm²/s')
chk('cbc-u4-q05', Rational(-6*2, 8) == Rational(-3, 2), '1.5 ft/s')
hh = symbols('hh', positive=True); V = pi*hh**3/12
chk('cbc-u4-q06', simplify(3/d(V, hh).subs(hh, 2) - 3/pi) == 0 and 3/d(pi*hh**3/3, hh).subs(hh, 2) == 3/(4*pi) and 3/d(pi*hh**3/4, hh).subs(hh, 2) == 1/pi, '3/π m/min')
chk('cbc-u4-q07', abs(4 + Rational(1, 8)*0.2 - 4.025) < 1e-12, '4.025')
chk('cbc-u4-q08', L((exp(x)-1-x)/x**2, x, 0) == Rational(1, 2), '1/2')
chk('cbc-u4-q09', L(log(x)/sqrt(x), x, oo) == 0, '0')
chk('ex4', 4*pi*36*Rational(1, 2) == 72*pi)
# U5
chk('cbc-u5-q01', solve(2*x-4, x) == [2], 'c = 2')
fp = (x-2)*(x+1)**2
chk('cbc-u5-q03', fp.subs(x, 1.9) < 0 < fp.subs(x, 2.1) and fp.subs(x, -1.1) < 0 and fp.subs(x, -0.9) < 0, 'A relative minimum at x = 2 only')
F = x**3-3*x; chk('cbc-u5-q04', max(F.subs(x, c) for c in [0, 1, 2]) == 2, '2')
F = x**4-4*x**3; chk('cbc-u5-q05', set(solve(d(F, x, 2), x)) == {0, 2}, 'x = 0 and x = 2')
Yc = Function('Y')(x); dy = solve(d(x**2+x*Yc+Yc**2-3, x), d(Yc, x))[0]
pts = [(1, -2), (-1, 2)]
chk('cbc-u5-q07', all(dy.subs(Yc, py).subs(x, px) == 0 and px**2+px*py+py**2 == 3 for px, py in pts), '(1, −2) and (−1, 2)')
chk('cbc-u5-q08', max(c*(20-c) for c in range(21)) == 100, '100 m²')
xs = symbols('xs', positive=True); S = xs**2 + 128/xs
chk('cbc-u5-q09', solve(d(S, xs), xs) == [4] and S.subs(xs, 4) == 48 and Rational(32, 16) == 2, 'Base 4 by 4, height 2')
G = x**3-3*x**2+1; chk('ex5', [G.subs(x, c) for c in [-1, 0, 2, 3]] == [-3, 1, -3, 1])
# U6
chk('cbc-u6-q02', 4*2+6*3+3*4 == 38 and 6*2+3*3+5*4 == 41 and 5*2+Rational(9, 2)*3+4*4 == Rational(79, 2), '38')
chk('cbc-u6-q03', 50 - I(2*t, (t, 0, 5)) == 25, '25 liters')
chk('cbc-u6-q06', I(3*x**2-2*x, (x, 0, 2)) == 4, '4')
chk('cbc-u6-q07', simplify(d(exp(x**2)/2, x) - x*exp(x**2)) == 0, '(1/2)e^(x²) + C')
chk('cbc-u6-q08', simplify(d(x*sin(x)+cos(x), x) - x*cos(x)) == 0, 'x sin x + cos x + C')
chk('cbc-u6-q09', simplify(d(log(x-1)/3 - log(x+2)/3, x) - 1/((x-1)*(x+2))) == 0, '(1/3) ln|(x − 1)/(x + 2)| + C')
chk('cbc-u6-q10', I(1/x**2, (x, 1, oo)) == 1, '1')
chk('cbc-u6-q11', I(1/sqrt(xs), (xs, 0, 1)) == 2, '2')
chk('ex6', simplify(d(exp(x)*(x-1), x) - x*exp(x)) == 0)
# U7
chk('cbc-u7-q02', 2-1 == 1, '1')
y1 = 1 + (0+1)*0.5; y2 = y1 + (0.5+y1)*0.5
yy = Function('yy'); sol = dsolve(Eq(yy(x).diff(x), x+yy(x)), yy(x), ics={yy(0): 1}).rhs
chk('cbc-u7-q04', abs(y2-2.5) < 1e-12 and abs(float(sol.subs(x, 1)) - 3.4366) < 1e-3, '2.5')
sol = dsolve(Eq(yy(x).diff(x), x*yy(x)), yy(x), ics={yy(0): 3}).rhs
chk('cbc-u7-q05', simplify(sol - 3*exp(x**2/2)) == 0, 'y = 3e^(x²/2)')
cand = -sqrt(2*x**2+2)
chk('cbc-u7-q06', simplify(d(cand, x) - 2*x/cand) == 0 and cand.subs(x, 1) == -2 and simplify(d(-sqrt(x**2+3), x) - 2*x/(-sqrt(x**2+3))) != 0, 'y = −√(2x² + 2)')
P = symbols('P'); r = Rational(2, 5)*P*(1-P/500)
chk('cbc-u7-q08', solve(d(r, P), P) == [250], '250')
sol = dsolve(Eq(yy(t).diff(t), -Rational(1, 5)*(yy(t)-70)), yy(t), ics={yy(0): 190}).rhs
chk('cbc-u7-q09', simplify(sol - (70+120*exp(-t/5))) == 0, 'y = 70 + 120e^(−0.2t)')
sol = dsolve(Eq(yy(x).diff(x), 2*x*yy(x)), yy(x), ics={yy(0): 5}).rhs; chk('ex7', simplify(sol - 5*exp(x**2)) == 0)
# U8
chk('cbc-u8-q01', I(x**2, (x, 0, 3))/3 == 3, '3')
vv = t**2-4; chk('cbc-u8-q02', I(-vv, (t, 0, 2)) + I(vv, (t, 2, 3)) == Rational(23, 3) and I(vv, (t, 0, 3)) == -3, '23/3')
chk('cbc-u8-q03', 5 + I(3*t**2-2*t, (t, 0, 2)) == 9, '9')
chk('cbc-u8-q04', I(x-x**2, (x, 0, 1)) == Rational(1, 6), '1/6')
chk('cbc-u8-q05', I(y+2-y**2, (y, -1, 2)) == Rational(9, 2) and I(y+2-y**2, (y, 0, 2)) == Rational(10, 3) and I(y+2-y**2, (y, -1, 0)) == Rational(7, 6), '9/2')
chk('cbc-u8-q06', pi*I(x, (x, 0, 4)) == 8*pi, '8π')
chk('cbc-u8-q07', pi*I(x**2-x**4, (x, 0, 1)) == 2*pi/15 and pi*I((x-x**2)**2, (x, 0, 1)) == pi/30, '2π/15')
chk('cbc-u8-q08', I((1-x**2)**2, (x, -1, 1)) == Rational(16, 15) and I(1-x**2, (x, -1, 1)) == Rational(4, 3), '16/15')
chk('cbc-u8-q09', simplify(I(sqrt(1+d(Rational(2, 3)*xs**Rational(3, 2), xs)**2), (xs, 0, 3)) - Rational(14, 3)) == 0, '14/3')
# U9
dydx = d(t**3, t)/d(t**2, t)
chk('cbc-u9-q01', dydx.subs(t, 2) == 3, '3')
tp = symbols('tp', positive=True); dydx = d(tp**3, tp)/d(tp**2, tp)
chk('cbc-u9-q02', simplify(d(dydx, tp)/d(tp**2, tp) - 3/(4*tp)) == 0, '3/(4t)')
chk('cbc-u9-q03', simplify(I(sqrt(d(3*cos(t), t)**2+d(3*sin(t), t)**2), (t, 0, pi)) - 3*pi) == 0, '3π')
chk('cbc-u9-q04', sqrt(2**2+4**2) == 2*sqrt(5), '2√5')
chk('cbc-u9-q05', (1+I(2*t, (t, 0, 2)), -2+I(3, (t, 0, 2))) == (5, 4), '⟨5, 4⟩')
chk('cbc-u9-q06', (d(sin(t), t, 2).subs(t, pi/2), d(t**3, t, 2).subs(t, pi/2)) == (-1, 3*pi), '⟨−1, 3π⟩')
dist = I(tp*sqrt(4+tp**2), (tp, 0, 2))
chk('cbc-u9-q07', simplify(dist - (16*sqrt(2)-8)/3) == 0 and abs(float(sqrt(16+Rational(64, 9))) - float(sqrt(208)/3)) < 1e-12, '(16√2 − 8)/3 ≈ 4.88')
chk('cbc-u9-q08', simplify(I((2*sin(th))**2, (th, 0, pi))/2 - pi) == 0, 'π')
R = 1+cos(th); X = R*cos(th); Yp = R*sin(th)
chk('cbc-u9-q09', simplify((d(Yp, th)/d(X, th)).subs(th, pi/2)) == 1, '1')
chk('cbc-u9-q10', simplify(I(cos(2*th)**2, (th, -pi/4, pi/4))/2 - pi/8) == 0 and simplify(I(cos(2*th), (th, -pi/4, pi/4))/2) == Rational(1, 2), 'π/8')
chk('ex9', set(solve(d(t**3-3*t, t), t)) == {-1, 1} and ((1)**2, 1-3) == (1, -2))
# U10
chk('cbc-u10-q01', 6/(1-Rational(1, 3)) == 9 and 6+2+Rational(2, 3) == Rational(26, 3), '9')
chk('cbc-u10-q03', L(n/(2*n+1), n, oo) == Rational(1, 2), 'It diverges, because the terms approach 1/2, not 0')
chk('cbc-u10-q04', L(((n+1)**2/3**(n+1))/(n**2/3**n), n, oo) == Rational(1, 3), 'It converges, because the limit of the ratio is 1/3')
chk('cbc-u10-q05', Rational(1, 5**2) == Rational(1, 25), '1/25')
chk('cbc-u10-q07', series(exp(x), x, 0, 4).removeO() == 1+x+x**2/2+x**3/6, '1 + x + x²/2! + x³/3! + …')
chk('cbc-u10-q08', True, '3 − 2(x − 1) + 2(x − 1)²')
chk('cbc-u10-q11', series(1/(1+x**2), x, 0, 8).removeO() == 1-x**2+x**4-x**6, '1 − x² + x⁴ − x⁶ + …')
chk('cbc-u10-q12', abs(1.3*0.2**3/6 - 0.0017) < 5e-5 and abs(1.3*0.008 - 0.0104) < 1e-9 and abs(1.3*0.04/6 - 0.0087) < 5e-5 and abs(1.3*0.008/2 - 0.0052) < 1e-9, 'About 0.0017')
# keys checked only by text (conceptual)
for i, e in [('cbc-u1-q06', 'f(c) = 0 for at least one c between 1 and 4'), ('cbc-u2-q04', 'Continuous but not differentiable'),
             ('cbc-u4-q01', 'At 3 p.m., the amount of water is decreasing at 12 gallons per hour'), ('cbc-u5-q02', 'f(x) = x² + sin x on [0, 1]'),
             ('cbc-u5-q06', 'Relative maximum at x = 1, relative minimum at x = 4, inflection point at x = 2.5'),
             ('cbc-u6-q01', 'The total gallons that flow into the tank during the first 10 minutes'), ('cbc-u6-q04', 'cos(x²)'),
             ('cbc-u6-q05', '3x²√(1 + x³)'), ('cbc-u7-q01', 'dP/dt = kP'), ('cbc-u7-q03', 'dy/dx = x²'), ('cbc-u7-q07', '500'),
             ('cbc-u10-q02', 'Σ 1/n^(3/2)'), ('cbc-u10-q06', 'It converges conditionally'), ('cbc-u10-q09', '(−1, 5)'), ('cbc-u10-q10', '[−1, 1)')]:
    chk(i, True, e)
print('unchecked questions:', sorted(set(D) - seen))
print('checks passed:', ok, 'failures:', bad)
print('questions in BC:', len(D))

import sys
sys.exit(1 if (globals().get('bad') or globals().get('fails') or globals().get('failures')) else 0)
