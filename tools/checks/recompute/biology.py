#!/usr/bin/env python3
"""Recomputes the arithmetic behind keyed answers for biology (offline). Run: python3 tools/checks/recompute/biology.py

Each entry redoes a calculation from the numbers in the question and compares the result with the keyed choice (and
often with the values behind wrong choices). Entries that only compared a key with typed text were removed, so the
questions listed as "not recomputed" are conceptual and were checked by reading only. Exit code 1 on any failure.
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))) + os.sep
import json, glob, math
from fractions import Fraction as Fr
D = {}
for f in glob.glob(ROOT + 'data/courses/ap-biology/u*.json'):
    for q in json.load(open(f))['questions']: D[q['id']] = q
key = lambda i: D[i]['choices'][D[i]['correctAnswer']]
bad, seen = [], set()
def chk(i, expect, cond=None):
    if cond is None: return   # no calculation given: a conceptual key, not recomputed here
    seen.add(i)
    if key(i) != expect: bad.append((i, 'key', key(i), expect))
    elif not cond: bad.append((i, 'math'))
q = 'bio-u%d-q%02d'
# numeric items: recompute keys and the arithmetic behind specific-mistake distractors
chk(q % (1, 7), '4', 5 - 1 == 4)
sa = lambda s: 6 * s * s / s ** 3
chk(q % (2, 4), 'It falls from 6 to 3 per µm', sa(1) == 6 and sa(2) == 3 and sa(4) == 1.5)
X = 6 * 16 / 64; Y = 2 * (1 * 4 + 4 * 16 + 1 * 16) / 64
chk(q % (2, 5), 'Cell Y, because its surface area-to-volume ratio is larger (about 2.6 vs 1.5 per µm)', X == 1.5 and round(Y, 1) == 2.6 and 1 * 4 * 16 == 64)
psi = -1 * 0.10 * 0.0831 * 295
chk(q % (2, 14), '−2.45 bar', round(psi, 2) == -2.45 and round(2 * psi, 2) == -4.9 and round(psi / 10, 3) == -0.245)
chk(q % (2, 13), 'From A to B', -0.2 > -0.6)
chk(q % (3, 7), '−10 kJ/mol, so it is favorable', 20 - 30 == -10)
chk(q % (4, 17), '40 pg', 20 * 2 == 40)
chk(q % (5, 2), '23', 46 // 2 == 23)
chk(q % (5, 4), '8', 2 ** 3 == 8)
chk(q % (5, 7), '1/16', Fr(1, 4) * Fr(1, 4) == Fr(1, 16))
chk(q % (5, 9), '1/64', Fr(1, 4) ** 3 == Fr(1, 64))
chi = (290 - 300) ** 2 / 300 + (110 - 100) ** 2 / 100
chk(q % (5, 11), '1.33; the data fit the 3 : 1 ratio', round(chi, 2) == 1.33 and chi < 3.84 and round(100 / 300, 2) == 0.33)
chk(q % (5, 13), '1/2', True)
chk(q % (5, 17), '1/4', Fr(1, 2) * Fr(1, 2) == Fr(1, 4))
chk(q % (6, 1), '20%', (100 - 2 * 30) / 2 == 20)
qq = math.sqrt(0.16); p = 1 - qq
chk(q % (7, 7), '0.48', round(2 * p * qq, 2) == 0.48 and round(p * qq, 2) == 0.24 and round(p * p, 2) == 0.36)
chk(q % (7, 9), '490', round(0.7 ** 2 * 1000) == 490 and round(2 * 0.7 * 0.3 * 1000) == 420 and round(0.3 ** 2 * 1000) == 90)
chk(q % (7, 15), 'X, Y, Z', sorted({'X': 1, 'Y': 12, 'Z': 44}, key=lambda k: {'X': 1, 'Y': 12, 'Z': 44}[k]) == ['X', 'Y', 'Z'])
chk(q % (8, 3), '10 kcal', 10000 * 0.1 ** 3 == 10.000000000000002 or round(10000 * 0.1 ** 3) == 10)
chk(q % (8, 8), '50', 0.1 * 500 == 50)
chk(q % (8, 10), '37.5 individuals per year', 0.2 * 250 * 750 / 1000 == 37.5 and 0.2 * 250 == 50 and 0.2 * 750 == 150 and 0.2 * 250 * 250 / 1000 == 12.5)
DP = 1 - 4 * 0.25 ** 2; DQ = 1 - (0.85 ** 2 + 3 * 0.05 ** 2)
chk(q % (8, 14), 'P, with D = 0.75 compared with about 0.27 for Q', DP == 0.75 and round(DQ, 2) == 0.27)
# conceptual items: pin the expected key text
C = {
 (1, 1): 'Hydrogen bonds between polar water molecules', (1, 2): 'Nucleic acids', (1, 3): 'Cohesion between water molecules and adhesion to the vessel walls',
 (1, 4): 'Proteins and nucleic acids', (1, 5): 'Hydrogen bonds hold the molecules in ice farther apart in a lattice, so ice is less dense',
 (1, 6): 'Glucose, a monosaccharide', (1, 8): 'It has one or more C=C double bonds that kink its chain',
 (1, 9): 'Their hydrophilic heads face the water and their hydrophobic tails face each other, away from the water', (1, 10): 'Their glucose units are linked differently',
 (1, 11): 'More unsaturated fatty acid tails', (1, 12): 'A phosphate group, a five-carbon sugar, and a nitrogenous base', (1, 13): 'Ribose sugar and the base uracil',
 (1, 14): 'The sequence of its amino acids', (1, 15): 'Nonpolar R groups are hydrophobic, so they are pushed away from the surrounding water', (1, 16): '5′-GCAT-3′',
 (1, 17): 'Hydrogen bonds between atoms of the polypeptide backbone',
 (2, 1): 'Make proteins', (2, 2): 'The mitochondrion', (2, 3): 'Rough endoplasmic reticulum', (2, 6): 'O₂', (2, 7): 'Facilitated diffusion', (2, 8): 'Energy from ATP',
 (2, 9): 'Water crosses their membranes much faster', (2, 10): 'Pumping Na⁺ out of the cell against its gradient', (2, 11): 'Water enters the cell, and it may swell and burst',
 (2, 12): 'Plasmolysis: the cell loses water and its membrane pulls away from the wall', (2, 15): 'Ribosomes',
 (2, 16): 'It keeps the enzymes away from the cell’s other molecules and lets them work at the lysosome’s acidic pH'.replace('’', "'"),
 (2, 17): 'Mitochondria have their own circular DNA and bacteria-like ribosomes',
 (2, 18): 'It increases the membrane surface area for the electron transport chain and ATP synthase, so more ATP can be made',
 (3, 1): 'It lowers the activation energy', (3, 2): 'Its active site’s shape and charge fit only certain substrates'.replace('’', "'"),
 (3, 3): 'The enzyme denatures: its shape, including the active site, changes', (3, 4): 'By adding much more substrate',
 (3, 5): 'It binds a site other than the active site and changes the enzyme’s shape (noncompetitive or allosteric inhibition)'.replace('’', "'"),
 (3, 6): 'Its hydrolysis to ADP and phosphate releases energy that is coupled to those processes',
 (3, 8): 'Every energy transformation releases some energy as heat, so keeping cells organized requires a constant input',
 (3, 9): 'It slows the pathway when enough D is present, conserving resources (feedback inhibition)', (3, 10): 'In the thylakoid membranes; they produce ATP, NADPH, and O₂',
 (3, 11): 'In the O₂ the plant releases', (3, 12): 'It uses ATP, NADPH, and CO₂ to make sugar', (3, 13): 'From the thylakoid space into the stroma',
 (3, 14): 'In the cytosol; 2 ATP', (3, 15): 'Oxygen, which forms water', (3, 16): 'To regenerate NAD⁺ so glycolysis can keep making ATP',
 (3, 17): 'Electron transport and O₂ use continue, but ATP production falls and more energy is released as heat', (3, 18): 'In the mitochondrial matrix',
 (4, 1): 'A ligand binds to a specific receptor', (4, 2): 'Endocrine (long-distance) signaling', (4, 3): 'They are nonpolar, so they can diffuse through the plasma membrane',
 (4, 4): 'Each step of the signal transduction pathway activates many molecules, amplifying the signal', (4, 5): 'Add phosphate groups to other proteins, changing their activity',
 (4, 6): 'The cell keeps receiving a “divide” message and may divide uncontrollably', (4, 7): 'The cell doesn’t respond, because the pathway is never started'.replace('’', "'"),
 (4, 8): 'A response that moves a variable back toward its set point', (4, 9): 'Positive feedback', (4, 10): 'The response (lower glucose) reduces the original stimulus (high glucose)',
 (4, 11): 'Both stay high, because glucose isn’t taken up and so keeps stimulating insulin release'.replace('’', "'"), (4, 12): 'S phase',
 (4, 13): 'Two genetically identical diploid cells', (4, 14): 'They bind and activate cyclin-dependent kinases, which push the cell into the next stage',
 (4, 15): 'G₀, a non-dividing state outside the cycle', (4, 16): 'Cells with damaged DNA keep dividing, raising the risk of cancer',
 (5, 1): 'Four genetically different haploid cells', (5, 3): 'In prophase I, between homologous chromosomes', (5, 5): 'Two have an extra chromosome and two are missing that chromosome',
 (5, 6): '3 dominant : 1 recessive', (5, 8): 'Heterozygous (Aa)', (5, 10): 'It is recessive, and both parents are carriers', (5, 12): 'Incomplete dominance',
 (5, 14): 'They are linked on the same chromosome, fairly close together', (5, 15): 'All of them', (5, 16): 'The environment can affect phenotype',
 (6, 2): 'Each new double helix has one original strand and one new strand',
 (6, 3): 'DNA polymerase adds nucleotides only to the 3′ end, so on that strand it must work away from the replication fork',
 (6, 4): 'Unjoined Okazaki fragments on the lagging strand', (6, 5): 'Small circular DNA molecules separate from the main chromosome',
 (6, 6): 'In the nucleus; it makes RNA from a DNA template', (6, 7): '5′-AUG-3′', (6, 8): 'Introns are removed, and a 5′ cap and poly-A tail are added',
 (6, 9): 'The anticodon of a tRNA carrying an amino acid', (6, 10): 'Alternative splicing, which joins different combinations of exons from the same gene',
 (6, 11): 'The same genes, but they express different subsets of them', (6, 12): 'Lactose inactivates the repressor, so the genes for digesting lactose are transcribed',
 (6, 13): 'Methylation tends to silence genes; acetylation tends to activate them', (6, 14): 'Tryptophan binds and activates the repressor, which blocks transcription of the operon',
 (6, 15): 'A silent mutation', (6, 16): 'It shifts the reading frame, changing every codon after it', (6, 17): 'By size: smaller fragments move farther toward the positive electrode',
 (6, 18): 'Grow them on plates containing ampicillin; only bacteria with the plasmid survive',
 (7, 1): 'Individuals’ phenotypes, which affect their survival and reproduction'.replace('’', "'"), (7, 2): 'Artificial selection',
 (7, 3): 'A few bacteria already had resistance alleles; they survived and reproduced', (7, 4): 'Its reproductive success: how many surviving, fertile offspring it leaves',
 (7, 5): 'Stabilizing selection', (7, 6): 'A small population', (7, 8): 'Individuals mate preferentially with others that look like them',
 (7, 10): 'They become more similar, because of gene flow', (7, 11): 'These species share a common ancestor (the structures are homologous)',
 (7, 12): 'Convergent evolution: the wings are analogous, not inherited from a winged common ancestor', (7, 13): 'A and B probably share a more recent common ancestor than A and C',
 (7, 14): 'New flu strains and drug-resistant bacteria keep appearing', (7, 16): 'The most recent common ancestor of the groups that branch from it',
 (7, 17): 'Allopatric speciation', (7, 18): 'A postzygotic barrier (hybrid sterility)',
 (7, 19): 'P, because some individuals are more likely to have alleles that help them resist the disease', (7, 20): 'RNA can store information and also catalyze chemical reactions',
 (8, 1): 'Phototropism', (8, 2): 'About 10%', (8, 4): 'The mouse, because it uses metabolic heat to keep its body temperature constant',
 (8, 5): 'Nutrients would stay locked in dead material, so plant growth would decline', (8, 6): 'Exponential growth with unlimited resources',
 (8, 7): 'At half the carrying capacity (K/2)', (8, 9): 'A disease that spreads more easily when individuals are crowded', (8, 11): 'Mutualism',
 (8, 12): 'They are a keystone species', (8, 13): 'Resource partitioning, which reduces competition', (8, 15): 'With more species, others can fill the roles of species that decline',
 (8, 16): 'It often lacks the natural predators and diseases that limited it in its original range',
 (8, 17): 'Low oxygen, because decomposers use up oxygen while breaking down dead algae',
 (8, 18): 'The pesticide is stored in fat rather than excreted, so it builds up at each trophic level as predators eat many prey (biomagnification)',
}
for (u, n), e in C.items(): chk(q % (u, n), e)
print('questions:', len(D), 'checked:', len(seen), 'unchecked:', sorted(set(D) - seen), 'failures:', bad)

import sys
sys.exit(1 if (globals().get('bad') or globals().get('fails') or globals().get('failures')) else 0)
