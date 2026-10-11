# StudySprint browser tests

Automated checks run in headless Chromium with Playwright. They test the built single-file site
(`dist/studysprint.html`) and, for hosting checks, the multi-file site served from a local web server
under a GitHub Pages-style subpath (`/studysprint-site/`, port 8791) and from a plain server (port 8799).

## Run

From the project folder:

```
python3 tools/build.py      # builds dist/studysprint.html and CONTENT_STATUS.md, which the tests read
node tests/run-all.js       # runs all suites and prints the total
node tests/t9_backup.js     # or run one suite
```

Requirements: Node 18 or later, Python 3, and Playwright with Chromium
(`npm install -g playwright` then `npx playwright install chromium`, or a local `npm install playwright`).
Ports 8791 and 8799 must be free. Set `STUDYSPRINT_ROOT` to test a project folder other than the one above `tests/`.

## Suites

| Suite | What it checks |
|---|---|
| t1_catalog | course search, catalog labels, unit lists |
| t2_learn | Learn first: confidence rating, warm-up, resource recommendations, easier practice |
| t3_planner | 5-step planner, checklist kept apart from evidence, threshold, status file agreement |
| t4_kbd | keyboard use and a phone-width Learn first page |
| t5_stats | AP Statistics units and questions |
| t6_http | the multi-file site served over HTTP |
| t7_subpath | GitHub Pages subpath hosting, build stamp, load failures with Try again |
| t8_resume | resuming practice sets and planner sessions after a refresh; history and titles; older saved progress |
| t9_backup | backup export, validated restore with preview, merge/replace, undo, hostile files, blocked storage |
| t10_a11y | no sideways scroll at 320/375/390 px, 44 px targets, labels, unique ids, keyboard and screen-reader feedback |
| t11_merge | My data wording on what a backup includes and excludes, and merge rules matching what merge does |

Some suites pick questions at random, so individual question choices differ between runs; the checks do not depend on which question appears.
