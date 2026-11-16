# StudySprint content audit, 2026-11-14

## Scope and method

- **Bank audited:** 1,734 questions in 17 courses (before this audit added 4). Catalog unchanged at 19 courses.
- **Automated, whole bank:** `tools/checks/bank_audit.py` (structure, stimulus references, answer cues), `check_outline.py` (17 outlines against the live AP Students pages), `check_links.py` (341 links), `check_quotes.py` (33 public-domain stimuli, 108 quoted segments, against the cited OpenStax pages), and the `recompute/` scripts (arithmetic behind 400+ keyed answers).
- **Manual:** 95 questions read in full with their stimuli and explanations (list at the end): the 5 flagged U.S. Government questions, the 4 Psychology questions tied to objectives without printed detail, 68 chosen by a fixed rule (4 per course), and 18 that the automated lists pointed to. The 12 World History Units 1–3 interpretation passages were read in full and their facts checked from general knowledge; all 48 of their stems were read.
- **Not done:** the other roughly 1,640 questions were not read one by one in this audit. No subject teacher has reviewed any question. A script comparing a key with its authoring script was not counted as evidence of correctness.
- **Sources used:** College Board course pages and Course and Exam Descriptions (CEDs) for scope and exam format; OpenStax textbooks for facts.

Severity: **high** = wrong or misleading for students; **medium** = inaccurate label, outdated fact, or a cue that gives answers away; **low** = wording or precision.

## Findings

| # | Course | Unit / ID | Severity | Evidence | Disposition |
|---|---|---|---|---|---|
| 1 | Biology | u5 / `bio-u5-q17` | high | Stem wrote the parents' genotypes as `IᴬI` and `IᴮI`; the explanation and key need `Iᴬi` and `Iᴮi` (type O is `ii`). | **Fixed** (stem). Key and choices unchanged. |
| 2 | Macroeconomics | u4 guide | medium | Guide described M2 as "M1 plus savings deposits". OpenStax *Principles of Macroeconomics 3e* 14.2: since May 2020 savings deposits are in M1; M2 adds small time deposits and retail money market funds. | **Fixed** (guide sentence). |
| 3 | Physics C: E&M | u13 / `phceu13-q08` | medium | Stem began "In the circuit with τ = 0.020 s…" but no circuit is described; it depended on another question. | **Fixed** (stem now describes an LR circuit). |
| 4 | U.S. History | u8 / `ush8-b` | medium | John Kerry's 1971 Senate testimony was labelled public domain on the generic basis "published before 1931, or a work of the U.S. government". A private witness's statement is not automatically a government work. | **Label corrected** to state the actual basis (printed in the committee's published hearing record) and that the status should be confirmed. **Open: owner decision** whether to keep or replace this stimulus. |
| 5 | World History, U.S. History | 44 interpretation passages (WH 26, USH 18) | medium | Interpretations written for StudySprint were wrapped in quotation marks, which presents them as quotations. Titles and source lines already said "interpretation". | **Fixed**: outer quotation marks removed. `bank_audit.py` now fails if one returns. |
| 6 | World History | u1–u3, all 12 stimuli | medium | Every stimulus in Units 1–3 is an interpretation; none is a primary source. None is presented as one: each title says "An interpretation of…", each source line says it was written by StudySprint's editors, and stems say "According to Source A". No factual error found in the 12 passages. | **Labels confirmed accurate.** Gap recorded in the course file. **Open:** add primary sources for c. 1200–1750 when a checkable public-domain text is available. |
| 7 | Physics 1 | whole bank | medium | Answer-position cue: the key is choice B in 39 of 74 multiple-choice questions and choice D in 1; one test has six B answers in a row. Choices are shown in stored order. | **Open, not changed**: fixing it moves answer positions, which saved in-progress tests depend on. Needs an owner decision (reorder with a data migration, or shuffle at display time). Smaller imbalances: Physics C: E&M 15/20/8/11, Precalculus 14/14/12/7. |
| 8 | Biology (also Physics 2, Statistics) | whole bank | medium | Answer-length cue: the key is the uniquely longest choice in 80 of 143 Biology questions (56%); Physics 2 28%, Statistics 25%, Chemistry 19%, Calculus BC 18%. Courses rewritten earlier are at 0–9%. | **Open, not changed**: needs the same distractor rewrite done for English Language and U.S. History; too broad for this audit. |
| 9 | Psychology | u3 / `psy-u3-q01`, `q03`, `q04`, `q18`; u4 and u5 guides | medium | Five objectives have no detailed content in the CED (3.1.B, 3.3.A, 4.1.B, 5.1.A, 5.5.E; confirmed on the rendered pages). The site labelled three of them in the guides; 4.1.B and 5.1.A were not labelled, and four questions rest on these objectives. "Cohort effects" and "attrition" do not appear anywhere in the CED. | **Fixed**: both guides now label the objective, and the four explanations say the question rests on standard textbook content the CED does not list. No question tests 4.1.B, 5.1.A, or 5.5.E. |
| 10 | Macroeconomics, U.S. Government | stimuli | medium | CED: Macroeconomics multiple choice includes questions "in which a graph or visual representation is provided"; Government includes quantitative and visual stimuli. The site had no drawn graphs or charts. | **Added** a small accessible chart option for stimuli (bar chart or line graph, inline SVG, required text alternative, numbers also listed as text; build-validated; tested). Used on 3 Government data sets and 6 Macroeconomics stimuli, including 4 new graph-reading questions (`mac-u3-q18`, `mac-u4-q18`, `mac-u5-q18`, `mac-u6-q18`, not in any test, so existing tests are unchanged). **Open:** maps, cartoons, and graph drawing are still not practiced. |
| 11 | U.S. Government | u4 / `gov-u4-q03` | low | Stem asked which explanation is "best supported by" poll data that cannot show causes. Key matches CED EK 4.3.A.1 (life cycle effects). | **Fixed** (stem now "most consistent with"; explanation names life cycle effects). Teacher review still advised. |
| 12 | U.S. Government | u3 / `gov-u3-q17` | low | Stem defines affirmative action by one example (race-conscious admissions); CED EK 3.13.A.1 is broader. Key correct. | **Fixed** (explanation now gives the CED definition). |
| 13 | U.S. Government | u1 / `gov-u1-q08` | low | Links *United States v. Lopez* to the Tenth Amendment; the CED states the holding under the Commerce Clause. The key is the best of the four parts of the source. | **Fixed** (explanation now states the Commerce Clause basis first). Teacher review still advised. |
| 14 | U.S. Government | u4 / `gov-u4-q20` | low | Correct, but party realignment is CED Unit 5 content (5.4, 5.7) and the question sits in Unit 4. | **Noted in the explanation.** Not moved (IDs are permanent). |
| 15 | U.S. Government | u5 / `gov-u5-q20` | low | Checked against CED EK 5.13.A.3 (media that "reinforce existing beliefs"). | **No change needed.** |
| 16 | Physics 1, Precalculus, Physics C: Mechanics, Physics C: E&M | course files | low | Status report said the CED edition was "not recorded". Current PDFs: Fall 2024, Fall 2026 (title page), Fall 2024, Fall 2024. | **Recorded.** Precalculus's edition is newer than its questions; its outline still matches the AP Students page, but its questions were **not** re-read against the Fall 2026 CED. **Open.** |
| 17 | Physics C (both), Precalculus, Statistics, Physics 2 | links | low | Five College Board addresses redirect to new ones. | **Fixed** (updated to the final addresses). |
| 18 | Calculus AB, Statistics, Physics 1 | 14 Khan Academy links, 1 OER Commons link | low | Cannot be checked automatically (bot challenge or network policy). | **Open:** check by hand. |
| 19 | Psychology | u2, u4 | low | Two questions shared one stem. | **Fixed** (u4 stem reworded). |
| 20 | Physics C: E&M (College Board page) | AP Students page | low | College Board's page misspells a heading ("Uint 9"). Not a StudySprint error. | Checker tolerates it. |

No other problems were found in the manual sample: all 68 rule-chosen questions had a correct key, accurate distractor explanations, and, where the question has a calculation, arithmetic that was redone during the read.

## Automated results after fixes

- `bank_audit.py`: 0 hard problems; 15 review-list items, all read and found correct.
- `check_outline.py`: all 17 outlines match the live AP Students pages (unit names, topic lists, weights).
- `check_links.py`: 326 links load, 0 fail, 15 cannot be checked automatically.
- `check_quotes.py`: 33 public-domain stimuli, 108 segments, all found word for word in the cited pages.
- `recompute/`: all pass. Questions recomputed: Biology 22 of 143, Chemistry 65 of 162, Calculus BC 104 checks over 96 questions, Precalculus 49 checks over 47 questions, Physics 2 70 of 96 plus 13 added, Physics C: Mechanics 64 of 68, Physics C: E&M 47 of 54, Macroeconomics and Psychology 45. The rest are conceptual and were not recomputed.
- Saved-progress check against the previous commit: no existing question changed its choices, key position, topic, difficulty, or stimulus; no test list changed. Four stems and eight explanations were edited; four questions were added.

## Open items for a teacher or the owner

1. Subject-teacher review of all banks; priority: U.S. Government `gov-u1-q08`, `gov-u4-q03`, `gov-u4-q20`, and Psychology `psy-u3-q01`, `q03`, `q04`, `q18`.
2. Physics 1 answer positions (finding 7) and Biology answer lengths (finding 8).
3. Rights status of the 1971 Senate testimony (finding 4).
4. Precalculus questions against the Fall 2026 CED (finding 16).
5. Primary sources for World History Units 1–3; image stimuli for Government and history courses.
6. Links that cannot be checked automatically (finding 18).

## Courses added after this audit

AP Microeconomics (102 questions) and AP Computer Science A (71 questions) were written after the audit above and are not part of its 1,734-question scope or its manual sample. What was checked for them:

- Outline, topic lists, exam weightings: `check_outline.py` against the live AP Students pages (both OK on 2026-11-16).
- Microeconomics: 13 hypothetical tables and graphs; every numeric answer is recomputed from the question's own numbers by `recompute/social_science.py`.
- Computer Science A: 54 of 71 keyed answers are confirmed by compiling and running the Java the student sees (`recompute/computer_science_a.py`, 0 failures). The other 17 are conceptual questions checked by reading against the CED's essential knowledge statements.
- `bank_audit.py` over all 1,911 questions: 0 hard problems.

Open for these two courses:

- Computer Science A has no unit-specific outside reading. The free Java textbooks that would fit (for example Runestone's CSAwesome, Oracle's Java Tutorials) could not be opened from the build machine, so none is linked; only College Board's Java Quick Reference is listed, as a general resource. The interface says so and points to the review guide.
- Computer Science A's 2023–2025 released free-response sets predate the Fall 2025 framework; the course file says so.
- Neither course has had a subject-teacher review.

Two interface defects found while adding code listings were fixed: a wide code listing made the page scroll sideways on phone-width screens in tests and test review, and the "Check your answers" screen printed the word "null" when every question was answered.

## Manual sample

Rule for the 68: within each course, order questions by the SHA-256 hash of `audit-2026-11:<question id>`; take the first introductory, first standard, and first challenging question, then the next question that has a stimulus or a numeric answer (or simply the next one).

- Biology: `bio-u1-q01`, `bio-u7-q03`, `bio-u2-q10`, `bio-u6-q07`
- Calculus AB: `cab-u8-q02`, `cab-u4-q06`, `cab-u7-q07`, `cab-u6-q04`
- Calculus BC: `cbc-u8-q06`, `cbc-u3-q08`, `cbc-u5-q06`, `cbc-u8-q05`
- Chemistry: `chem-u3-q10`, `chem-u7-q13`, `chem-u7-q09`, `chem-u4-q14`
- English Language: `lang-u6-q13`, `lang-u7-q10`, `lang-u3-q08`, `lang-u2-q02`
- English Literature: `lit-u2-q13`, `lit-u9-q15`, `lit-u2-q12`, `lit-u3-q01`
- Macroeconomics: `mac-u1-q06`, `mac-u1-q03`, `mac-u1-q05`, `mac-u1-q07`
- Physics 1: `ph1u6-q01`, `ph1u8-q09`, `ph1u8-q08`, `ph1u1-q08`
- Physics 2: `ph2u13-q05`, `ph2u15-q03`, `ph2u15-q15`, `ph2u11-q05`
- Physics C: E&M: `phceu11-q09`, `phceu8-q04`, `phceu13-q03`, `phceu13-q08`
- Physics C: Mechanics: `phcmu2-q01`, `phcmu6-q08`, `phcmu7-q08`, `phcmu3-q03`
- Precalculus: `pc-u2-q02`, `pc-u2-q03`, `pc-u3-q05`, `pc-u1-q05`
- Psychology: `psy-u1-q01`, `psy-u2-q02`, `psy-u4-q04`, `psy-u2-q01`
- Statistics: `stat-u5-q03`, `stat-u5-q05`, `stat-u5-q07`, `stat-u2-q08`
- U.S. Government: `gov-u3-q09`, `gov-u3-q15`, `gov-u4-q13`, `gov-u2-q06`
- U.S. History: `ush-u3-q06`, `ush-u7-q15`, `ush-u9-q08`, `ush-u4-q09`
- World History: `wh-u3-q09`, `wh-u3-q11`, `wh-u3-q08`, `wh-u6-q03`

Flagged or pointed to by the automated lists (27): `gov-u1-q08`, `gov-u3-q17`, `gov-u4-q03`, `gov-u4-q20`, `gov-u5-q20`, `psy-u3-q01`, `psy-u3-q03`, `psy-u3-q04`, `psy-u3-q18`, `bio-u4-q17`, `bio-u5-q02`, `bio-u5-q13`, `bio-u5-q17`, `bio-u8-q02`, `chem-u2-q14`, `ph1u1-q14`, `stat-u3-q03`, `stat-u3-q04`, `stat-u4-q04`, `gov-u3-q19`, `ush-u3-q10`, `ush-u6-q11`, `cbc-u6-q02`, `ph1u2-q01`, `lang-u1-q15`, `lit-u2-q14`, `wh-u3-q03`.
