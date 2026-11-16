# Content checks

Scripts for auditing the question bank. They read the files in `data/` and change nothing. Run them from the project root.

| Script | Needs internet | What it checks |
|---|---|---|
| `python3 tools/checks/bank_audit.py [--list]` | no | Every question: quoted phrases that are not in their stimulus, stems that point to a missing or different source, explanations that refer to a choice by letter, placeholder text, interpretations wrapped in quotation marks. Prints per-course answer-cue statistics (how often the key is the longest or shortest choice, key positions, runs in tests, absolute words). `--list` prints items worth a human look. |
| `python3 tools/checks/check_outline.py [course-id]` | yes | Each course outline against College Board's live AP Students page: unit names, topic lists, exam weightings. |
| `python3 tools/checks/check_links.py [course-id]` | yes | Every outside link loads without being redirected; OpenStax section titles match. Sites that block automated requests are reported as UNVERIFIED. |
| `python3 tools/checks/check_quotes.py` | yes | Every public-domain stimulus, word for word, against the OpenStax page it cites. |
| `python3 tools/checks/recompute/<file>.py` | no | Redoes the arithmetic behind keyed answers from the numbers in the questions. `social_science.py` (Macroeconomics, Microeconomics, Psychology) uses only the Python standard library; `biology.py`, `chemistry.py`, `physics_2.py`, `physics_2_added.py` do too; `calculus_bc.py`, `precalculus.py`, `physics_c_mechanics.py`, and `physics_c_em.py` need `pip install sympy`. |
| `python3 tools/checks/recompute/computer_science_a.py` | no (needs a JDK 11 or later, `java` on PATH) | Compiles and runs the Java that a Computer Science A question shows (its code listing, or the statements quoted in its stem) and compares what happens with the keyed choice: the exact output, a compile error and its reason, an exception, or a loop that never ends. For "which statement or loop is correct" questions it runs every choice and requires that only the keyed one works. Takes about a minute. |

Each script exits with code 1 when it finds a problem, so they can be chained:

    for f in tools/checks/recompute/*.py; do python3 "$f" > /dev/null || echo "FAILED: $f"; done

## What these checks do not show

- They do not prove that a conceptual answer is correct. The recompute scripts cover questions with a calculation; each prints how many questions it covered. Everything else was checked by reading, and a subject teacher's review is still recommended.
- None of them compares an answer key with the script that wrote it. A check like that only shows the file was not edited by accident.
- A passing link check shows that a page loads, not that its content still matches the note beside the link.

Findings from audits, with what was fixed and what remains open, are in `CONTENT_AUDIT.md`.
