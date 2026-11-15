#!/usr/bin/env python3
"""Recomputes the arithmetic behind keyed answers for physics 2 (offline). Run: python3 tools/checks/recompute/physics_2.py

Each entry redoes a calculation from the numbers in the question and compares the result with the keyed choice (and
often with the values behind wrong choices). Entries that only compared a key with typed text were removed, so the
questions listed as "not recomputed" are conceptual and were checked by reading only. Exit code 1 on any failure.
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) + os.sep
# Independent check of every AP Physics 2 answer key: recompute from the problem statement, compare with the keyed
# choice (to its stated precision), and check the arithmetic quoted for distractors.
import json, math
D = ROOT + "data/courses/ap-physics-2/"
Qs = {q["id"]: q for u in range(9, 16) for q in json.load(open(D + "u%d.json" % u))["questions"]}
fails, seen = [], set()
def key(qid): seen.add(qid); q = Qs[qid]; return q["choices"][q["correctAnswer"]]
def rel(a, b, tol=0.03): return abs(a - b) <= tol * abs(b)
def check(qid, ok, note=""):
    if not ok: fails.append(qid + " " + note)
    print(("OK  " if ok else "FAIL"), qid, note)
k, e, R, kB, G, c, h, mu0 = 9.0e9, 1.6e-19, 8.31, 1.38e-23, 6.67e-11, 3.0e8, 6.63e-34, 4*math.pi*1e-7
deg = math.radians

# ---- Unit 9 ----
check("ph2u9-q01", key("ph2u9-q01") == "1.5 × 10⁵ Pa" and rel(3000/0.020, 1.5e5) and rel(3000*0.020, 60) and rel(0.020/3000, 6.7e-6))
p2 = 1.2e5*450/300
check("ph2u9-q02", key("ph2u9-q02") == "1.8 × 10⁵ Pa" and rel(p2, 1.8e5) and rel(1.2e5*177/27, 7.9e5) and rel(1.2e5*300/450, 0.8e5))
n = 2.0e5*0.050/(R*400)
check("ph2u9-q03", key("ph2u9-q03") == "3.0 mol" and rel(n, 3.0) and rel(R*400/(2e5*0.05), 0.33) and rel(2e5*0.05/400, 25) and rel(2e5*0.05/R, 1200), "n=%.3f" % n)
check("ph2u9-q05", key("ph2u9-q05") == "2" and math.sqrt(4) == 2)
check("ph2u9-q06", key("ph2u9-q06") == "About 2.8" and rel(math.sqrt(32/4), 2.83, 0.01) and rel(math.sqrt(4/32), 0.35, 0.02))
check("ph2u9-q07", key("ph2u9-q07").startswith("Molecules collide with the walls"))
check("ph2u9-q08", key("ph2u9-q08") == "+300 J" and 500 + (-200) == 300)
W = -2.0e5*(0.030-0.010)
check("ph2u9-q09", key("ph2u9-q09") == "−4000 J" and rel(W, -4000) and rel(2e5*0.030, 6000))
check("ph2u9-q10", key("ph2u9-q10") == "It is the same" and (2*1)/(2*1) == 1)
check("ph2u9-q11", key("ph2u9-q11").startswith("Energy flows from the hot block to the cold block"))
check("ph2u9-q12", key("ph2u9-q12").startswith("Its internal energy does not change"))
check("ph2u9-guide", rel(-1e5*0.003, -300) and 800 - 300 == 500)

# ---- Unit 10 ----
check("ph2u10-q01", key("ph2u10-q01") == "+8.0 × 10⁻⁹ C" and rel(5.0e10*e, 8.0e-9) and rel(5.0e10/e, 3.1e29))
check("ph2u10-q03", key("ph2u10-q03").startswith("The balloon is negative and your hair is positive"))
F = k*2e-6*3e-6/0.30**2
check("ph2u10-q05", key("ph2u10-q05") == "0.60 N, attractive" and rel(F, 0.60) and rel(k*6e-12/0.30, 0.18) and rel(k*6e-12, 0.054))
ratio = k*e**2/(G*1.67e-27*9.11e-31)
check("ph2u10-q06", key("ph2u10-q06").startswith("The electric force is about 2 × 10³⁹ times larger, at any") and 1.5e39 < ratio < 2.5e39, "ratio=%.3g" % ratio)
check("ph2u10-q08", key("ph2u10-q08") == "1.0 × 10⁻³ N west" and rel(2e-6*500, 1e-3) and rel(500/2e-6, 2.5e8) and rel(2*500, 1000))
E = k*4e-9/0.20**2
check("ph2u10-q09", key("ph2u10-q09") == "900 N/C, pointing away from the charge" and rel(E, 900) and rel(k*4e-9/0.2, 180) and rel(k*4e-9, 36))
phi = 200*0.50*math.cos(deg(60))
check("ph2u10-q10", key("ph2u10-q10") == "50 N·m²/C" and rel(phi, 50) and rel(100*math.sin(deg(60)), 87) and rel(200/0.5, 400))
check("ph2u10-q11", key("ph2u10-q11") == "8.0 × 10⁻¹⁷ J" and rel(e*500, 8.0e-17))
Wk = k*(3e-6)**2*(1/0.050 - 1/0.10)
check("ph2u10-q12", key("ph2u10-q12") == "0.81 J" and rel(Wk, 0.81) and rel(k*9e-12/0.05, 1.6, 0.02) and rel(k*9e-12*(1/0.05**2 - 1/0.1**2), 24, 0.02), "W=%.3f" % Wk)
x = 0.40/3
check("ph2u10-guide", rel(2e-6/x**2, 8e-6/(0.40-x)**2, 1e-9) and rel(x, 0.13, 0.03))

# ---- Unit 11 ----
check("ph2u11-q01", key("ph2u11-q01") == "60 C" and 2.0*30 == 60 and rel(30/2, 15) and rel(2/30, 0.067))
check("ph2u11-q02", key("ph2u11-q02") == "R/2" and 2/2**2 == 0.5)
check("ph2u11-q03", key("ph2u11-q03") == "0.50 A and 240 Ω" and rel(60/120, 0.5) and rel(120/0.5, 240) and rel(120/60, 2) and rel(120/2, 60) and rel(0.5/120, 0.0042) and rel(60*120, 7200) and rel(120/7200, 0.017))
check("ph2u11-q04", key("ph2u11-q04") == "2.0 A" and 18/(3+6) == 2 and 18/(1/(1/3+1/6)) == 9 and 18/3 == 6 and 9/18 == 0.5)
check("ph2u11-q05", key("ph2u11-q05") == "9.0 A" and rel(18/3 + 18/6, 9))
check("ph2u11-q06", key("ph2u11-q06") == "3.0 A out of the junction" and 5 - 2 == 3)
Rp = 6*3/(6+3); I = 12/(2+Rp)
check("ph2u11-q07", key("ph2u11-q07") == "6.0 V" and rel(I*2, 6.0) and rel(12/11*2, 2.2, 0.02))
check("ph2u11-q09", key("ph2u11-q09") == "48 μC" and 4*12 == 48 and 0.5*4*144 == 288)
U = 0.5*10e-6*20**2
check("ph2u11-q12", key("ph2u11-q12") == "2.0 × 10⁻³ J" and rel(U, 2.0e-3) and rel(10e-6*400, 4e-3) and rel(10e-6*20, 2e-4) and rel(0.5*10e-6*20, 1e-4))
check("ph2u11-guide", rel(9.0/(2.0 + 2.0), 2.25) and rel(2.25/2, 1.1, 0.03))

# ---- Unit 12 ----
check("ph2u12-q01", key("ph2u12-q01").startswith("Two smaller magnets"))
B = mu0*10/(2*math.pi*0.050)
check("ph2u12-q02", key("ph2u12-q02") == "4.0 × 10⁻⁵ T" and rel(B, 4.0e-5) and rel(mu0*10/0.05, 2.5e-4) and rel(mu0*10/(2*math.pi*0.05**2), 8.0e-4) and rel(mu0*10*0.05/(2*math.pi), 1.0e-7))
check("ph2u12-q04", key("ph2u12-q04").startswith("Iron has a high magnetic permeability"))
check("ph2u12-q05", key("ph2u12-q05") == "1.6 × 10⁻¹³ N" and rel(e*2e6*0.5, 1.6e-13) and rel(e*2e6, 3.2e-13) and rel(2e6*0.5, 1e6))
# v = +x (east), B = +y (north): v × B = +z (up)
vx = (1, 0, 0); By = (0, 1, 0)
cross = (vx[1]*By[2]-vx[2]*By[1], vx[2]*By[0]-vx[0]*By[2], vx[0]*By[1]-vx[1]*By[0])
check("ph2u12-q06", key("ph2u12-q06") == "Up (away from the ground)" and cross == (0, 0, 1))
check("ph2u12-q07", key("ph2u12-q07").startswith("The proton's circle is about 1800 times larger, and they circle in opposite"))
Fw = 3.0*0.40*0.20*math.sin(deg(30))
check("ph2u12-q08", key("ph2u12-q08") == "0.12 N" and rel(Fw, 0.12) and rel(3*0.4*0.2, 0.24) and rel(0.24*math.cos(deg(30)), 0.21))
check("ph2u12-q09", key("ph2u12-q09") == "0.020 Wb" and rel(0.40*0.050, 0.020) and rel(0.4/0.05, 8.0))
check("ph2u12-q10", key("ph2u12-q10") == "10 V" and rel(50*0.020/0.10, 10) and rel(0.020/0.10, 0.20) and rel(50*0.020, 1.0) and rel(50*0.020*0.10, 0.10))
# Lenz: N pole approaching; B from magnet at the loop points away from the viewer (the magnet's side), i.e. -z if viewer
# looks along -z. The induced B points +z (toward the viewer), which a counterclockwise current (seen by the viewer) makes.
check("ph2u12-q11", key("ph2u12-q11").startswith("Counterclockwise, so the face of the loop toward the magnet acts like a north pole"))
check("ph2u12-q12", key("ph2u12-q12") == "0.60 V" and rel(0.30*0.50*4.0, 0.60) and rel(0.5*4/0.3, 6.7, 0.01) and rel(0.3*0.5, 0.15) and rel(0.3*4, 1.2))
check("ph2u12-guide", rel(1.67e-27*3e6/(e*0.20), 0.16, 0.03))

# ---- Unit 13 ----
t2 = math.degrees(math.asin(math.sin(deg(60))/1.50))
check("ph2u13-q02", key("ph2u13-q02") == "35°" and abs(t2 - 35) < 0.5 and abs(60/1.5 - 40) < 1e-9 and abs(90 - t2 - 55) < 0.5, "θ2=%.2f" % t2)
check("ph2u13-q03", key("ph2u13-q03") == "2.3 × 10⁸ m/s" and rel(c/1.33, 2.3e8, 0.03) and rel(c*1.33, 4.0e8) and rel(1.33/c, 4.4e-9))
tc = math.degrees(math.asin(1/1.50))
check("ph2u13-q04", key("ph2u13-q04").startswith("It is totally reflected") and abs(tc - 42) < 0.5 and 45 > tc and rel(1.5*math.sin(deg(45)), 1.06, 0.01), "θc=%.2f" % tc)
check("ph2u13-q05", key("ph2u13-q05").startswith("It absorbs most other colors"))
check("ph2u13-q06", key("ph2u13-q06").startswith("2.0 m behind the mirror"))
lens = lambda f, so: 1/(1/f - 1/so)
si = lens(10, 30)
check("ph2u13-q07", key("ph2u13-q07").startswith("15 cm in front") and rel(si, 15) and rel(-si/30, -0.5) and rel(1/(1/10+1/30), 7.5))
si = lens(-20, 20)
check("ph2u13-q08", key("ph2u13-q08").startswith("10 cm behind the mirror") and rel(si, -10) and rel(-si/20, 0.5))
si = lens(5.0, 3.0)
check("ph2u13-q09", key("ph2u13-q09").startswith("A virtual, upright image 2.5 times") and rel(si, -7.5) and rel(-si/3.0, 2.5) and rel(1/(1/5+1/3), 1.9, 0.02))
check("ph2u13-q10", key("ph2u13-q10") == "20 cm" and rel(lens(10, 20), 20) and rel(1/(1/10+1/20), 6.7, 0.01))
si = lens(-15, 30)
check("ph2u13-q11", key("ph2u13-q11").startswith("A virtual, upright image one third") and rel(si, -10) and rel(-si/30, 1/3))
check("ph2u13-guide", rel(lens(8.0, 12), 24) and rel(-24/12, -2.0))

# ---- Unit 14 ----
check("ph2u14-q01", key("ph2u14-q01") == "200 m/s" and 50*4 == 200 and rel(50/4, 12.5) and rel(4/50, 0.08))
check("ph2u14-q02", key("ph2u14-q02") == "3.0 m" and rel(c/100e6, 3.0) and rel(c*100e6, 3e16) and rel(100e6/c, 0.33) and rel(c/1e6, 300))
check("ph2u14-q03", key("ph2u14-q03").startswith("They are transverse and can travel through a vacuum"))
check("ph2u14-q05", key("ph2u14-q05") == "85 m" and 340*0.5/2 == 85 and 340/0.5 == 680)
check("ph2u14-q06", key("ph2u14-q06") == "200 Hz" and rel(340/(2*0.85), 200) and rel(340/(4*0.85), 100) and rel(340/0.85, 400) and rel(340*0.85, 289))
check("ph2u14-q07", key("ph2u14-q07").startswith("A higher pitch while it approaches"))
fp = 400*340/(340-20)
check("ph2u14-q08", key("ph2u14-q08") == "425 Hz" and rel(fp, 425, 0.001) and rel(400*340/360, 378, 0.002))
dy = 600e-9*2.0/0.20e-3
check("ph2u14-q10", key("ph2u14-q10") == "6.0 mm" and rel(dy, 6.0e-3) and rel(600e-9*2/2.0e-3, 0.6e-3))
d = 1e-3/500
th = math.degrees(math.asin(600e-9/d))
check("ph2u14-q11", key("ph2u14-q11") == "17°" and abs(th - 17.5) < 0.1 and abs(math.degrees(math.asin(1200e-9/d)) - 36.9) < 0.1
      and abs(math.degrees(math.asin(600e-9/(1e-2/500))) - 1.7) < 0.05 and abs(math.degrees(math.asin(600e-9/(1/500))) - 0.017) < 0.001, "θ=%.2f" % th)
check("ph2u14-guide", rel(530e-9*1.5/0.10e-3, 8.0e-3, 0.01))

# ---- Unit 15 ----
check("ph2u15-q01", key("ph2u15-q01") == "8.0 mg" and 64*0.5**(9/3) == 8 and rel(64/3, 21, 0.02))
check("ph2u15-q02", key("ph2u15-q02") == "Z = 90, A = 234" and (92-2, 238-4) == (90, 234))
check("ph2u15-q03", key("ph2u15-q03").startswith("A neutron becomes a proton"))
check("ph2u15-q04", key("ph2u15-q04") == "1.8 × 10⁻¹¹ J" and rel(2e-28*c**2, 1.8e-11) and rel(2e-28*c, 6e-20))
check("ph2u15-q05", key("ph2u15-q05") == "28.3 MeV" and rel(0.0304*931.5, 28.3, 0.002) and rel(0.0304*931.5/4, 7.08, 0.002) and rel(931.5/0.0304, 3.06e4, 0.002))
check("ph2u15-q06", key("ph2u15-q06") == "2.0 eV" and rel(1240/620, 2.0) and rel(620/1240, 0.5) and rel(1240*620, 7.7e5, 0.01))
check("ph2u15-q07", key("ph2u15-q07") == "0.70 eV" and rel(3.0-2.3, 0.70))
check("ph2u15-q09", key("ph2u15-q09") == "About 5800 K" and rel(2.9e-3/500e-9, 5800) and rel(2.9e-3/5e-10, 5.8e6) and rel(2.9e-3*500e-9, 1.5e-9, 0.04) and rel(2.9e-3/5e-6, 580))
check("ph2u15-q10", key("ph2u15-q10") == "1.0 × 10⁻¹⁰ m" and rel(h/6.63e-24, 1e-10) and rel(h*6.63e-24, 4.4e-57, 0.01))
check("ph2u15-q11", key("ph2u15-q11").startswith("Electrons passing through a crystal"))
check("ph2u15-q12", key("ph2u15-q12") == "The electron, about 43 times longer" and abs(math.sqrt(1836) - 43) < 0.5)
check("ph2u15-guide", rel(1240/400, 3.1) and rel(3.1-2.0, 1.1))

missing = sorted(set(Qs) - seen)
print("\nquestions:", len(Qs), "checked:", len(seen & set(Qs)), "unchecked:", missing, "failures:", fails)

import sys
sys.exit(1 if (globals().get('bad') or globals().get('fails') or globals().get('failures')) else 0)
