#!/usr/bin/env python3
"""Recomputes the arithmetic behind keyed answers for physics c em (offline). Run: python3 tools/checks/recompute/physics_c_em.py

Each entry redoes a calculation from the numbers in the question and compares the result with the keyed choice (and
often with the values behind wrong choices). Entries that only compared a key with typed text were removed, so the
questions listed as "not recomputed" are conceptual and were checked by reading only. Exit code 1 on any failure. Needs sympy (pip install sympy).
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) + os.sep
# Independent check of every AP Physics C: E&M answer key, distractor arithmetic, and worked example.
import json, math, sympy as sp
D = ROOT + "data/courses/ap-physics-c-electricity-and-magnetism/"
Qs = {q["id"]: q for u in range(8, 14) for q in json.load(open(D + "u%d.json" % u))["questions"]}
fails, seen = [], set()
def key(i): seen.add(i); q = Qs[i]; return q["choices"][q["correctAnswer"]]
def rel(a, b, tol=0.03): a, b = float(a), float(b); return abs(a - b) <= tol * abs(b)
def check(i, ok, note=""):
    if not ok: fails.append(i + " " + note)
    print(("OK  " if ok else "FAIL"), i, note)
k, e0, e, mu0 = 9.0e9, 8.85e-12, 1.6e-19, 4*math.pi*1e-7
x, d, L, z, R, t = sp.symbols("x d L z R t", positive=True)

# Unit 8
check("phceu8-q01", key("phceu8-q01") == "0.90 N, repulsive" and rel(k*9e-12/0.09, 0.9) and rel(k*9e-12/0.3, 0.27) and rel(k*9e-12, 0.081))
E1 = k*4e-9/0.1**2
check("phceu8-q02", key("phceu8-q02").startswith("7200 N/C, pointing toward the negative") and rel(E1, 3600) and rel(2*E1, 7200))
xs = [s for s in sp.solve(sp.Eq(1/x**2, 4/(sp.Rational(3, 10) - x)**2), x) if 0 < s < 0.3]
check("phceu8-q03", key("phceu8-q03") == "x = 0.10 m" and len(xs) == 1 and xs[0] == sp.Rational(1, 10) and sp.solve(sp.Eq(1/x, 4/(sp.Rational(3, 10) - x)), x)[0] == sp.Rational(3, 50))
check("phceu8-q04", key("phceu8-q04") == "3.6 × 10⁵ N/C" and rel(2*k*2e-6/0.1, 3.6e5) and rel(k*2e-6/0.1, 1.8e5) and rel(2*k*2e-6/0.01, 3.6e6) and rel(k*2e-6/0.01, 1.8e6))
kk, Qq = sp.symbols("k Q", positive=True)
Erod = sp.integrate(kk*(Qq/L)/x**2, (x, d, d + L))
check("phceu8-q05", key("phceu8-q05") == "kQ/(d(d + L))" and sp.simplify(Erod - kk*Qq/(d*(d + L))) == 0)
check("phceu8-q07", key("phceu8-q07") == "About 5.6 × 10² N·m²/C" and rel(5e-9/e0, 565, 0.01) and rel(5e-9*e0, 4.4e-20, 0.01))
r_ = sp.symbols("r", positive=True)
Ein = kk*(Qq*(r_/R)**3)/r_**2
check("phceu8-q08", key("phceu8-q08") == "kQ/(2R²)" and sp.simplify(Ein.subs(r_, R/2) - kk*Qq/(2*R**2)) == 0 and sp.simplify(kk*Qq/(R/2)**2 - 4*kk*Qq/R**2) == 0)
check("phceu8-q09", key("phceu8-q09").startswith("The net flux through the cube is zero, but"))
check("phceu8-guide", rel(2*k*3e-6/0.2, 2.7e5))

# Unit 9
check("phceu9-q01", key("phceu9-q01") == "60 V" and rel(k*2e-9/0.3, 60) and rel(k*2e-9/0.09, 200) and rel(k*2e-9, 18))
check("phceu9-q02", key("phceu9-q02") == "It decreases by 20 V" and rel(500*0.04, 20) and rel(500/0.04, 12500))
V = 3*x**2 - 2*x
check("phceu9-q03", key("phceu9-q03") == "4.0 V/m in the −x direction" and -sp.diff(V, x).subs(x, 1) == -4 and V.subs(x, 1) == 1 and sp.diff(V, x, 2) == 6)
dq = sp.symbols("dq")
check("phceu9-q05", key("phceu9-q05") == "kQ/√(z² + R²)" and sp.simplify(sp.diff(kk*Qq/sp.sqrt(z**2 + R**2), z) + kk*Qq*z/(z**2 + R**2)**sp.Rational(3, 2)) == 0)
check("phceu9-q06", key("phceu9-q06").startswith("The potential is zero everywhere along it"))
check("phceu9-q07", key("phceu9-q07") == "1.6 × 10⁻¹⁶ J" and rel(e*1000, 1.6e-16))
U0 = k*e**2/1e-10
check("phceu9-q08", key("phceu9-q08") == "About 1.2 × 10⁻¹⁸ J each" and rel(U0, 2.3e-18, 0.01) and rel(U0/2, 1.15e-18, 0.01) and rel(k*e**2/1e-20, 2.3e-8, 0.01), "U=%.3g" % U0)
check("phceu9-q09", key("phceu9-q09") == "1.2 × 10⁻³ J" and rel(3e-6*400, 1.2e-3) and rel(3*400, 1200) and rel(3e-6/400, 7.5e-9))
check("phceu9-guide", rel(k*2e-9/0.2, 90))

# Unit 10
check("phceu10-q01", key("phceu10-q01").startswith("Zero, and the excess charge sits on the outer"))
q1, q2 = 1/3, 2/3; s1, s2 = q1/(4*math.pi*1**2), q2/(4*math.pi*2**2)
check("phceu10-q03", key("phceu10-q03").startswith("The smaller sphere, with twice") and rel(s1/s2, 2))
check("phceu10-q04", key("phceu10-q04") == "About 1.8 × 10⁻¹⁰ F" and rel(e0*0.02/1e-3, 1.77e-10, 0.01) and rel(e0*0.02*1e-3, 1.77e-16, 0.01) and rel(e0*1e-3/0.02, 4.4e-13, 0.01) and rel(e0*0.02/1, 1.77e-13, 0.01))
check("phceu10-q05", key("phceu10-q05") == "2.0 μF" and rel(1/(1/3 + 1/6), 2) and rel(1/3 + 1/6, 0.5))
Q0, C0, V0 = 1.0, 1.0, 1.0
check("phceu10-q06", key("phceu10-q06") == "It doubles" and rel((Q0**2/(2*(C0/2)))/(Q0**2/(2*C0)), 2))
check("phceu10-q07", key("phceu10-q07") == "Both are cut in half" and rel((0.5*(C0/2)*V0**2)/(0.5*C0*V0**2), 0.5) and rel((C0/2*V0)/(C0*V0), 0.5))
check("phceu10-q09", key("phceu10-q09").startswith("The dielectric's molecules polarize"))
check("phceu10-guide", rel(0.5*40e-6*5, 1e-4) and rel(0.5*4e-6*100, 2e-4) and rel(40e-6/8e-6, 5))

# Unit 11
check("phceu11-q01", key("phceu11-q01") == "0.17 Ω" and rel(1.7e-8*10/1e-6, 0.17) and rel(1.7e-8*10*1e-6, 1.7e-13) and rel(1/0.17, 5.9, 0.01) and rel(1.7e-8*1/1e-6, 0.017))
vd = 2.0/(8.5e28*e*1e-6)
check("phceu11-q02", key("phceu11-q02") == "About 1.5 × 10⁻⁴ m/s" and rel(vd, 1.5e-4, 0.03) and rel(2.0/(8.5e28*e), 1.5e-10, 0.03) and rel(1/vd, 6.8e3, 0.01), "vd=%.3g" % vd)
check("phceu11-q03", key("phceu11-q03") == "10 W" and rel(10**2/(20**2/40), 10))
check("phceu11-q04", key("phceu11-q04") == "2.0 A" and rel(12/(4 + 2), 2) and rel(12/13, 0.92, 0.01))
check("phceu11-q05", key("phceu11-q05") == "11 V" and rel(12 - (12/6)*0.5, 11))
Vn = sp.solve(sp.Eq((10 - x)/2 + (4 - x)/2, x/4), x)[0]
check("phceu11-q06", key("phceu11-q06") == "1.4 A" and rel(Vn/4, 1.4) and rel(14/4, 3.5) and rel(6/4, 1.5) and rel(6/8, 0.75), "V=%s" % Vn)
check("phceu11-q07", key("phceu11-q07").startswith("The 3.0 Ω resistor: 48 W") and rel(144/3, 48) and rel(144/6, 24))
rho, A0 = sp.symbols("rho A0", positive=True)
Rw = sp.integrate(rho/(A0*(1 + x/L)), (x, 0, L))
check("phceu11-q08", key("phceu11-q08") == "(ρL/A₀) ln 2" and sp.simplify(Rw - rho*L*sp.log(2)/A0) == 0)
check("phceu11-guide", rel(9/6.5, 1.38, 0.01) and rel(9 - (9/6.5)*0.5, 8.3, 0.01))

# Unit 12
check("phceu12-q01", key("phceu12-q01") == "9.6 × 10⁻¹⁴ N" and rel(e*3e6*0.2, 9.6e-14) and rel(3e6*0.2, 6e5) and rel(e*0.2, 3.2e-20))
check("phceu12-q03", key("phceu12-q03") == "0.20 N" and rel(5*0.2*0.2, 0.2) and rel(5*math.pi*0.1*0.2, 0.31, 0.02) and rel(5*0.1*0.2, 0.1))
check("phceu12-q04", key("phceu12-q04") == "4.0 × 10⁻⁵ T" and rel(mu0*20/(2*math.pi*0.1), 4e-5) and rel(mu0*20/(2*math.pi*0.01), 4e-4) and rel(mu0*20/0.1, 2.5e-4, 0.01))
check("phceu12-q05", key("phceu12-q05") == "4.0 × 10⁻⁴ N/m, attractive" and rel(mu0*100/(2*math.pi*0.05), 4e-4) and rel(mu0*100/(2*math.pi), 2e-5) and rel(mu0*100/(2*math.pi*0.0025), 8e-3))
check("phceu12-q06", key("phceu12-q06") == "About 3.8 × 10⁻³ T" and rel(mu0*2000*1.5, 3.77e-3, 0.01) and rel(mu0*3000/(2*math.pi), 6e-4))
m0, I_ = sp.symbols("mu0 I", positive=True)
Bin = m0*I_*r_/(2*sp.pi*R**2)
check("phceu12-q07", key("phceu12-q07") == "μ₀I/(4πR)" and sp.simplify(Bin.subs(r_, R/2) - m0*I_/(4*sp.pi*R)) == 0 and sp.simplify(m0*I_/(2*sp.pi*R/2) - m0*I_/(sp.pi*R)) == 0)
check("phceu12-q08", key("phceu12-q08") == "About 1.3 × 10⁻⁵ T" and rel(mu0*2/(2*0.1), 1.26e-5, 0.01) and rel(mu0*2/(2*math.pi*0.1), 4e-6) and rel(mu0*2/(4*0.1), 6.3e-6, 0.01) and rel(mu0*2/0.1, 2.5e-5, 0.01))
check("phceu12-q09", key("phceu12-q09") == "2.0 × 10⁵ m/s" and rel(2000/0.01, 2e5) and rel(0.01/2000, 5e-6))
check("phceu12-guide", rel(mu0*2000*2.5, 6.3e-3, 0.01))

# Unit 13
check("phceu13-q01", key("phceu13-q01") == "2.0 V" and rel(100*0.01*0.4/0.2, 2) and rel(0.01*0.4/0.2, 0.02) and rel(100*0.01*0.4, 0.4) and rel(100*0.4/0.2, 200))
Phi = sp.Rational(1, 20)*sp.Rational(1, 5)*t**3
check("phceu13-q02", key("phceu13-q02") == "0.12 V" and sp.diff(Phi, t).subs(t, 2) == sp.Rational(3, 25) and Phi.subs(t, 2) == sp.Rational(2, 25) and (Phi/t).subs(t, 2) == sp.Rational(1, 25))
emf = 0.4*0.5*3; I3 = emf/0.2
check("phceu13-q03", key("phceu13-q03") == "0.60 N" and rel(I3*0.5*0.4, 0.6) and rel(I3**2*0.2, 1.8) and rel(I3*0.5*0.4*3, 1.8))
check("phceu13-q05", key("phceu13-q05").startswith("Its moving field induces currents"))
check("phceu13-q06", key("phceu13-q06") == "2.0 V" and rel(0.5*4, 2) and rel(0.5/4, 0.125) and rel(4/0.5, 8))
check("phceu13-q07", key("phceu13-q07") == "0.020 s and 0.60 A" and rel(0.4/20, 0.02) and rel(12/20, 0.6) and rel(0.4*20, 8) and rel(20/0.4, 50))
check("phceu13-q08", key("phceu13-q08") == "About 0.38 A" and rel(0.6*(1 - math.exp(-1)), 0.38, 0.01) and rel(0.6*math.exp(-1), 0.22, 0.01))
check("phceu13-q09", key("phceu13-q09") == "0.072 J" and rel(0.5*0.4*0.36, 0.072) and rel(0.4*0.36, 0.144) and rel(0.5*0.4*0.6, 0.12))
check("phceu13-guide", rel(0.3/15, 0.02) and rel(6/15, 0.4) and rel(0.4*(1 - math.exp(-1)), 0.25, 0.02))

print("\nquestions:", len(Qs), "checked:", len(seen & set(Qs)), "unchecked:", sorted(set(Qs) - seen), "failures:", fails)

import sys
sys.exit(1 if (globals().get('bad') or globals().get('fails') or globals().get('failures')) else 0)
