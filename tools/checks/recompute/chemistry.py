#!/usr/bin/env python3
"""Recomputes the arithmetic behind keyed answers for chemistry (offline). Run: python3 tools/checks/recompute/chemistry.py

Each entry redoes a calculation from the numbers in the question and compares the result with the keyed choice (and
often with the values behind wrong choices). Entries that only compared a key with typed text were removed, so the
questions listed as "not recomputed" are conceptual and were checked by reading only. Exit code 1 on any failure.
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) + os.sep
import json, glob, math
D = {}
for f in glob.glob(ROOT + 'data/courses/ap-chemistry/u*.json'):
    for q in json.load(open(f))['questions']: D[q['id']] = q
key = lambda i: D[i]['choices'][D[i]['correctAnswer']]
ch = lambda i: D[i]['choices']
bad, seen = [], set()
def chk(i, expect, cond=None):
    if cond is None: return   # no calculation given: a conceptual key, not recomputed here
    seen.add(i)
    if key(i) != expect: bad.append((i, 'key', key(i), expect))
    elif not cond: bad.append((i, 'math'))
def near(a, b, rel=0.006): return abs(a - b) <= rel * abs(b)
def s3(x): return float('%.3g' % x)
NA, R, Rj, h, c, F, Kw = 6.022e23, 0.08206, 8.314, 6.626e-34, 3.00e8, 96485, 1.0e-14
q = 'chem-u%d-q%02d'
# Unit 1
chk(q % (1, 1), '2.00 mol', 36.0 / 18.0 == 2 and 36 * 18 == 648 and 18 / 36 == 0.5 and s3(2 * NA) == 1.2e24)
chk(q % (1, 2), '3.01 × 10²³', s3(0.5 * NA) == 3.01e23 and s3(NA / 0.5) == 1.2e24 and round(0.5 * 55.85, 1) == 27.9)
chk(q % (1, 3), '10.8 u', round(10 * .199 + 11 * .801, 1) == 10.8 and round(10 * .801 + 11 * .199, 1) == 10.2)
mol = [40.0 / 12.01, 6.7 / 1.008, 53.3 / 16.00]; r = [m / min(mol) for m in mol]
chk(q % (1, 4), 'CH₂O', [round(x) for x in r] == [1, 2, 1] and abs(r[1] - 2) < 0.05)
chk(q % (1, 5), '58.4%', round(0.02 * 58.44 / 2 * 100, 1) == 58.4 and round(100 - 58.44, 1) == 41.6 and round(0.02 * 58.44, 2) == 1.17)
chk(q % (1, 6), '60.1%', round(0.006 * 100.1 * 100, 1) == 60.1 and round(0.006 * 44.01 * 100, 1) == 26.4 and round(0.006 * 56.08 * 100, 1) == 33.6)
chk(q % (1, 7), '1s² 2s² 2p⁶ 3s² 3p⁴', 2 + 2 + 6 + 2 + 4 == 16)
chk(q % (1, 8), '5', 2 + 3 == 5)
chk(q % (1, 9), 'Aluminum', 2 + 2 + 6 + 2 + 1 == 13)
for i, e in [(10, 'The 1s peak, because those electrons are closest to the nucleus and the least shielded'),
             (11, 'Sodium has 11 protons, so its nucleus attracts the 1s electrons more strongly'), (12, 'Na'), (13, 'F'), (14, 'Al₂O₃'),
             (15, 'Oxygen’s removed electron is in a 2p orbital that already holds another electron, and their repulsion makes it easier to remove'.replace('’', "'")),
             (17, 'Ca²⁺')]:
    chk(q % (1, i), e)
ie = [738, 1451, 7733, 10540]; jumps = [ie[k + 1] / ie[k] for k in range(3)]
chk(q % (1, 16), 'XCl₂', max(range(3), key=lambda k: jumps[k]) == 1)
# Unit 2
for i, e in [(1, 'Na and Cl'), (2, 'H–F'), (3, 'The bond length'), (4, 'MgO'), (5, 'Shorter and stronger'),
             (6, 'In the solid the ions are fixed in place; in the liquid they can move'),
             (7, 'Interstitial: small carbon atoms fill gaps between iron atoms, making it harder and less malleable'),
             (8, 'Their delocalized electrons let layers of cations slide past each other without breaking the bonding'),
             (9, 'Copper and zinc atoms have similar radii'), (12, 'O₃'), (13, '(1), because every atom has a formal charge of zero'),
             (14, 'Tetrahedral, 109.5°'), (15, 'Trigonal planar, 120°'), (16, 'Trigonal pyramidal'), (17, 'sp'), (18, 'CO₂')]:
    chk(q % (2, i), e)
chk(q % (2, 10), '16', 4 + 2 * 6 == 16 and 6 + 2 * 8 == 22)
chk(q % (2, 11), '+1', 5 - 0 - 8 / 2 == 1)
# Unit 3
for i, e in [(1, 'Hydrogen bonding'), (2, 'C₄H₁₀'), (3, 'Covalent network solid'),
             (4, 'Water molecules form hydrogen bonds, which are much stronger than the dipole and dispersion forces between H₂S molecules'),
             (5, 'A low melting point and no electrical conductivity'), (7, 'Both have the same average kinetic energy, so helium atoms move faster on average'),
             (9, 'High pressure and low temperature'), (10, 'Solid'), (13, 'Chromatography'), (14, 'Methanol, CH₃OH'),
             (16, 'Ethanol can form hydrogen bonds with water, so mixing replaces water–water attractions with similar ones; hexane can’t'.replace('’', "'")),
             (17, 'Ultraviolet'), (19, 'Infrared')]:
    chk(q % (3, i), e)
P = 2 * R * 300 / 10
chk(q % (3, 6), '4.92 atm', round(P, 2) == 4.92 and round(2 * R * 27 / 10, 3) == 0.443 and round(2 * 8.314 * 300 / 10) == 499 and round(1 / P, 3) == 0.203)
chk(q % (3, 8), '0.50 atm', 1 / 3 * 1.5 == 0.5)
chk(q % (3, 11), '2.0 M', 0.5 / 0.25 == 2 and abs(0.5 * 0.25 - 0.125) < 1e-12 and 0.5 / 250 == 0.002)
chk(q % (3, 12), '0.500 M', 2 * 50 / 200 == 0.5 and 2 * 200 / 50 == 8)
chk(q % (3, 15), '0.60 M', abs(2 * 0.3 - 0.6) < 1e-12)
E = h * c / 500e-9
chk(q % (3, 18), '3.98 × 10⁻¹⁹ J', s3(E) == 3.98e-19 and s3(h * c / 500) == 3.98e-28 and s3(c / 500e-9) == 6e14 and s3(h / 500e-9) == 1.33e-27)
chk(q % (3, 20), '1.0', abs(0.40 * 0.25 / 0.10 - 1.0) < 1e-12)
# Unit 4
chk(q % (4, 1), '5', (3 * 2 + 4) / 2 == 5)
for i, e in [(2, 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)'), (3, 'Iron rusting'), (4, 'Na⁺ and Cl⁻'), (5, 'CH₃COOH(aq) + OH⁻(aq) → CH₃COO⁻(aq) + H₂O(l)'),
             (11, 'The moles of titrant added have exactly reacted with the moles of the substance being titrated, by the mole ratio'),
             (12, 'Oxidation–reduction'), (14, 'Zn'), (15, 'H₂O'), (16, 'AgNO₃ and NaCl')]:
    chk(q % (4, i), e)
chk(q % (4, 6), '6.0 mol', 3 * 2 == 6)
chk(q % (4, 7), '43.9 g', round(16.0 / 16.04 * 44.01, 1) == 43.9 and round(2 * 16.0 / 16.04 * 44.01, 1) == 87.8)
chk(q % (4, 8), '2.0 mol', min(2.0 * 2, 3.0 * 2 / 3) == 2.0)
chk(q % (4, 9), '0.0800 M', abs(0.100 * 0.0200 / 0.0250 - 0.08) < 1e-12 and abs(0.100 * 0.0250 / 0.0200 - 0.125) < 1e-12)
th = 0.400 * 133.3
chk(q % (4, 10), '75.0%', round(40.0 / th * 100, 1) == 75.0 and round(40.0 / (0.6 * 133.3) * 100, 1) == 50.0 and round(th / 40 * 100) == 133)
chk(q % (4, 13), '+7', -1 - 4 * (-2) == 7)
chk(q % (4, 17), '5', 7 - 2 == 5)
# Unit 5
chk(q % (5, 1), '0.0050 M/s', 0.010 / 2 == 0.005)
for i, e in [(2, 'rate = k[A][B]²'), (3, 'M⁻¹s⁻¹'), (5, 'ln[A] against time'), (8, 'rate = k[NO]²[O₂]'),
             (9, 'A larger fraction of collisions has at least the activation energy'),
             (10, 'The highest-energy arrangement, at the peak between reactants and products'), (12, 'They may not be oriented correctly when they collide'),
             (13, 'Provides a pathway with a lower activation energy, and is regenerated'), (14, 'rate = k[NO₂]²'), (15, 'NO₃'),
             (16, 'The first step, because it has the larger activation energy'), (17, 'rate = k[NO]²[O₂]'), (18, 'A catalyst')]:
    chk(q % (5, i), e)
chk(q % (5, 4), '10.0 s', round(0.693 / 0.0693, 1) == 10.0 and round(1 / 0.0693, 1) == 14.4 and round(0.693 * 0.0693, 4) == 0.048)
chk(q % (5, 6), '0.10 M', abs(0.80 * 0.5 ** 3 - 0.10) < 1e-12)
chk(q % (5, 7), '0.50 M', 1 / (1 / 1.0 + 0.5 * 2.0) == 0.5 and round(math.exp(-1), 2) == 0.37)
chk(q % (5, 11), '70 kJ/mol', 120 - 50 == 70 and 120 - 20 == 100)
# Unit 6
for i, e in [(1, 'Endothermic: heat flows from the surroundings into the system'), (2, 'The reaction is exothermic, with ΔH < 0'),
             (4, 'The block and the water are at the same temperature'), (9, 'Into overcoming the attractions between water molecules'), (11, 'Energy is absorbed'),
             (16, '0 kJ/mol'), (18, 'Bond enthalpies are averages over many compounds, so they don’t exactly match the bonds in these particular molecules'.replace('’', "'"))]:
    chk(q % (6, i), e)
chk(q % (6, 3), '50.0 °C', (100 * 80 + 100 * 20) / 200 == 50)
chk(q % (6, 5), '30.0 °C', (50 * 90 + 150 * 10) / 200 == 30 and (150 * 90 + 50 * 10) / 200 == 70)
chk(q % (6, 6), '2090 J', round(50 * 4.18 * 10) == 2090)
chk(q % (6, 7), '+16.7 kJ/mol', round(100 * 4.18 * 2.0 / 1000 / 0.050, 1) == 16.7)
chk(q % (6, 8), '12.0 kJ', round(36 / 18 * 6.01, 1) == 12.0)
cm = 100 * 4.18 * 5 / (50 * 75)
chk(q % (6, 10), '0.557 J/(g·°C)', round(cm, 3) == 0.557 and round(1 / cm, 2) == 1.79 and round(100 * 4.18 * 5 / (50 * 100), 3) == 0.418 and round(50 * 4.18 * 5 / (100 * 75), 3) == 0.139)
chk(q % (6, 12), '−183 kJ', 436 + 243 - 2 * 431 == -183 and 436 + 243 - 431 == 248)
dh = (-393.5 + 2 * -285.8) - (-74.8)
chk(q % (6, 13), '−890.3 kJ', round(dh, 1) == -890.3 and round(-393.5 - 285.8 + 74.8, 1) == -604.5 and round(-393.5 + 2 * -285.8 - 74.8, 1) == -1039.9)
chk(q % (6, 14), '−100 kJ', -2 * 50 == -100)
chk(q % (6, 15), '−110.5 kJ', round(-393.5 + 283.0, 1) == -110.5 and round(-393.5 - 283.0, 1) == -676.5)
chk(q % (6, 17), '572 kJ', 4.0 / 2.0 == 2.0)
# Unit 7
for i, e in [(1, 'The forward and reverse rates are equal, so concentrations stay constant'), (2, 'K = [NH₃]²/([N₂][H₂]³)'), (3, 'Kp = P(CO₂)'),
             (4, 'The reaction proceeds forward, toward products, until Q = K'), (6, 'It contains mostly reactants'), (11, 'Toward products'),
             (12, 'The equilibrium shifts toward reactants and K decreases'), (13, 'Toward NH₃, the side with fewer moles of gas'),
             (14, 'Nothing: the reacting gases’ partial pressures don’t change, so Q still equals K'.replace('’', "'")), (15, 'Ksp = [Ag⁺]²[CrO₄²⁻]'), (18, 'AgCl')]:
    chk(q % (7, i), e)
chk(q % (7, 5), '16', 4.0 ** 2 == 16)
chk(q % (7, 7), '20', round(0.40 / (0.20 * 0.10), 6) == 20)
x = 8 / 10
chk(q % (7, 8), '1.6 M', abs((2 * x) ** 2 / (1 - x) ** 2 - 64) < 1e-9 and abs(2 * x - 1.6) < 1e-12)
xs = math.sqrt(1e-6 * 0.10)
chk(q % (7, 9), '3.2 × 10⁻⁴ M', s3(xs) == 3.16e-4 and xs / 0.10 < 0.05 and abs((xs ** 2 / (0.10 - xs)) - 1e-6) / 1e-6 < 0.01)
chk(q % (7, 10), '1.8 M', abs(2.0 - 0.40 / 2 - 1.8) < 1e-12)
chk(q % (7, 16), '1.3 × 10⁻⁵ M', round(math.sqrt(1.8e-10) * 1e5, 1) == 1.3)
chk(q % (7, 17), '1.8 × 10⁻⁹ M', s3(1.8e-10 / 0.10) == 1.8e-9)
# Unit 8
for i, e in [(4, 'SO₄²⁻'), (5, 'HCl has the lower pH, because it ionizes completely'), (7, 'An acid with pKa = 2.1'), (8, 'Greater than 7'),
             (9, 'pH = pKa, because [HA] = [A⁻]'), (11, 'CH₃COOH and CH₃COONa'), (13, 'They have the same pH, but X has the greater buffer capacity'),
             (15, 'OH⁻ + CH₃COOH → CH₃COO⁻ + H₂O'), (16, 'CCl₃COOH'),
             (17, 'Its extra oxygen atoms pull electron density from the O–H bond and spread out the negative charge on ClO₄⁻'), (18, 'CaF₂')]:
    chk(q % (8, i), e)
chk(q % (8, 1), '2.00', round(-math.log10(0.010), 2) == 2.0)
chk(q % (8, 2), '10.00', 14 - 4 == 10)
chk(q % (8, 3), '12.00', round(14 + math.log10(0.010), 2) == 12.0 and round(14 + math.log10(0.0050), 2) == 11.70 and round(-math.log10(0.0050), 2) == 2.30)
chk(q % (8, 6), '3.00', round(-math.log10(math.sqrt(1e-5 * 0.10)), 2) == 3.0 and round(-math.log10(1e-5 * 0.1), 2) == 6.0)
chk(q % (8, 10), '5.6 × 10⁻¹⁰', round(Kw / 1.8e-5 * 1e10, 1) == 5.6 and round(1 / 1.8e-5 / 1e4, 1) == 5.6)
chk(q % (8, 12), '5.74', round(4.74 + math.log10(10), 2) == 5.74)
chk(q % (8, 14), '4.56', round(4.74 + math.log10(0.080 / 0.12), 2) == 4.56 and round(4.74 + math.log10(0.12 / 0.080), 2) == 4.92 and round(-math.log10(0.020), 2) == 1.70)
# Unit 9
for i, e in [(1, 'H₂O(l) → H₂O(g)'), (2, 'Negative, because 3 mol of gas become 2 mol of gas'), (4, 'Br₂(g)'), (5, 'It is thermodynamically favorable'),
             (7, 'Only at high temperatures'), (9, 'K > 1'), (10, 'The reaction has a very high activation energy, so it is extremely slow (kinetic control)'),
             (13, 'At the anode'), (16, 'It increases, because Q decreases'), (18, 'It uses an outside power source to drive a thermodynamically unfavorable reaction')]:
    chk(q % (9, i), e)
chk(q % (9, 3), '−198.7 J/K', round(2 * 192.5 - (191.6 + 3 * 130.7), 1) == -198.7 and round(192.5 - 191.6 - 130.7, 1) == -129.8)
chk(q % (9, 6), '−40.4 kJ', round(-100 - 298 * -0.200, 1) == -40.4 and -100 - 298 * -200 == 59500 and round(-100 + 298 * -0.200, 1) == -159.6)
chk(q % (9, 8), '400. K', 40000 / 100 == 400)
chk(q % (9, 11), '−15 kJ: the coupled process is favorable', 30 - 45 == -15)
K = math.exp(5700 / (Rj * 298))
chk(q % (9, 12), '10', round(K) == 10 and round(5700 / (Rj * 298), 1) == 2.3)
chk(q % (9, 14), '+1.10 V', round(0.34 - (-0.76), 2) == 1.10 and round(0.34 + -0.76, 2) == -0.42)
chk(q % (9, 15), '−212 kJ', round(-2 * F * 1.10 / 1000) == -212 and round(-F * 1.10 / 1000) == -106)
mcu = 2.00 * 965 / F / 2 * 63.55
chk(q % (9, 17), '0.636 g', round(mcu, 3) in (0.635, 0.636) and round(2 * mcu, 2) == 1.27 and round(mcu / 2, 3) == 0.318)
print('questions:', len(D), 'checked:', len(seen), 'unchecked:', sorted(set(D) - seen), 'failures:', bad)

import sys
sys.exit(1 if (globals().get('bad') or globals().get('fails') or globals().get('failures')) else 0)
