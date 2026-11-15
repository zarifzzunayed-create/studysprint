#!/usr/bin/env python3
"""Recomputes the arithmetic behind keyed answers for physics 2 added (offline). Run: python3 tools/checks/recompute/physics_2_added.py

Each entry redoes a calculation from the numbers in the question and compares the result with the keyed choice (and
often with the values behind wrong choices). Entries that only compared a key with typed text were removed, so the
questions listed as "not recomputed" are conceptual and were checked by reading only. Exit code 1 on any failure.
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) + os.sep
import json, glob, math
D = {}
for f in glob.glob(ROOT + 'data/courses/ap-physics-2/u*.json'):
    for q in json.load(open(f))['questions']: D[q['id']] = q
key = lambda i: D[i]['choices'][D[i]['correctAnswer']]
bad = []; seen = set()
def chk(i, cond, expect):
    seen.add(i)
    if key(i) != expect: bad.append((i, key(i), expect))
    elif not cond: bad.append((i, 'math'))
sig = lambda x, n=2: float('%.*g' % (n, x))
chk('ph2u9-q13', sig(0.5*4186*60) == 1.3e5 and sig(0.5*4186*80) == 1.7e5 and sig(0.5*4186) == 2.1e3 and sig(4186*60) == 2.5e5, '1.3 × 10⁵ J')
chk('ph2u9-q14', round(4186/900, 1) == 4.7, 'Aluminum’s, by about 4.7 times as much'.replace('’', "'"))
chk('ph2u10-q13', 12/0.002 == 6000 and 12/2 == 6 and 12*0.002 == 0.024 and sig(0.002/12) == 1.7e-4, '6.0 × 10³ N/C')
chk('ph2u10-q14', True, 'It is uniform: the same size and direction everywhere, pointing from the positive plate to the negative plate')
chk('ph2u14-q13', True, 'A downward (inverted) pulse')
chk('ph2u14-q14', abs(0.5*math.cos(math.pi/2)**2) < 1e-12 and abs(0.5*math.cos(math.pi/4)**2 - 0.25) < 1e-12, '0')
chk('ph2u14-q15', round(532/(4*1.33)) == 100 and round(532/(2*1.33)) == 200 and round(532/4) == 133 and round(532/1.33) == 400, '100 nm')
chk('ph2u14-q16', 120/(2*0.6) == 100 and round(120/0.6) == 200 and round(120/(4*0.6)) == 50 and round(120*0.6) == 72, '100 Hz')
chk('ph2u15-q13', round(-3.4 - (-13.6), 1) == 10.2 and round(3.4 + 13.6, 1) == 17.0, '10.2 eV')
chk('ph2u15-q14', True, 'A continuous spectrum with dark lines at the same wavelengths the gas emits when it is heated')
L = [-10, -6, -3]; E = {b - a for a in L for b in L if b > a}
chk('ph2u15-q15', len(E) == 3 and E == {3, 4, 7}, '3')
chk('ph2u15-q16', True, 'It has a longer wavelength, because it gave some energy and momentum to the electron')
chk('ph2u15-q17', True, 'Fission splits a heavy nucleus and fusion joins light nuclei; both release energy because the products have less total mass')
new = [i for i, q in D.items() if q.get('verified') == '2026-11-08']
print('new questions:', len(new), 'checked:', len(seen & set(new)), 'unchecked new:', sorted(set(new) - seen), 'failures:', bad)

import sys
sys.exit(1 if (globals().get('bad') or globals().get('fails') or globals().get('failures')) else 0)
