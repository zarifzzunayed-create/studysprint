# StudySprint

AP unit practice tests with useful feedback. Choose a course, a unit, and one of that unit's practice tests; take it timed or untimed in a focused test view; then see your score by concept, an explanation for every answer, a separate set to retry what you missed, and a review plan (the study planner) for the same unit. The unit's study guide, Learn first resources, adaptive practice, videos, and links to official free-response questions stay available. Progress comes from submitted answers, never from ticking a box.

StudySprint covers AP courses only. A practice test is a short unit test, not a full AP exam.

StudySprint is an independent project. It is not affiliated with or endorsed by College Board.

## Run it

It is a static site: HTML, CSS, and plain JavaScript, with no build step and no API keys.

```
python3 -m http.server 8000      # from this folder, then open http://localhost:8000
```

The data are JSON files that the page fetches, so opening `index.html` directly from disk will not load them (browsers block that). GitHub Pages works as is: publish the repository root. Every path is relative, so the site also works from a project subpath such as `https://<name>.github.io/studysprint/`. Run `python3 tools/build.py` before publishing: it stamps a version onto the CSS, script, and data requests so visitors do not get a stale cached copy, and it creates the `.nojekyll` file.

`python3 tools/build.py` validates every data file, refreshes the summaries in `data/catalog.json`, regenerates `CONTENT_STATUS.md`, and builds `dist/studysprint.html`, a single self-contained copy with the data embedded.

## Layout

```
index.html            page shell
css/style.css         styles (light and dark)
js/util.js            helpers, seeded-random hook for tests
js/data.js            loads catalog and unit JSON (or the embedded bundle)
js/store.js           progress in localStorage (first attempts and retries kept apart)
js/backup.js          progress backup file: export, validated restore, merge or replace
js/adaptive.js        rule-based question selection, adaptive level, evidence label
js/runner.js          one-question-at-a-time scoring, shared by Practice and the planner
js/planner.js         study planner ("review plan") built from the selected unit, optionally seeded by test results
js/testing.js         practice tests: focused test view, submit, results, retry missed, review plan suggestion
js/app.js             course search, unit views, Learn first, results
data/catalog.json     every course: id, name, aliases, official FRQ hub link; practiceTests rules
data/courses/<course>/course.json   verified unit list and official topics
data/courses/<course>/<unit>.json   guide, questions, practice tests, videos, learn-first resources, FRQ links for one unit
data/planner.json     the study planner's steps and practice threshold (one source for interface and report)
tools/build.py        validation, CONTENT_STATUS.md, single-file build
tests/                browser test suites (Playwright); see tests/README.md
CONTENT_STATUS.md     generated: what is complete and what is not
```

## Adding a course

1. Make sure the course is in `data/catalog.json` (id is the AP Central slug). Set `"outline": true` once it has a `course.json`.
2. Create `data/courses/<course-id>/course.json` with the unit list. Copy unit titles and topic names from College Board's course page and record that page in `source` with the date you checked it. Set each unit's `status` to `"outline"` and `"file": null`.
3. Run `python3 tools/build.py`.

## Adding a unit's content or a question batch

1. Create `data/courses/<course-id>/<unit-id>.json`. Copy an existing unit file such as `ap-calculus-ab/u3.json` as a template. It has `topics`, `guide`, `questions`, `videos`, `learnResources`, and `frqs`. A review guide is short: at least 3 concept sections (key ideas, formulas or terms), a worked example, and common mistakes.
2. Question fields: `id` (unique, never reused), `courseId`, `unitId`, `topicId`, `type` (`multiple-choice` or `numeric`), `difficulty` (`introductory`, `standard`, `challenging`), `prompt`, `choices`, `correctAnswer`, `explanation`, `choiceExplanations` (one entry per choice, empty for the correct one), `sourceType`, `sourceUrl`, `licenseOrRights`, `isOriginal`, `verified`. Numeric questions use `correctAnswer`, `tolerance`, and `answerUnit` instead of `choices`.
3. In `course.json`, set the unit's `file` and set `status` to `practice-ready` only if it meets the bar in `CONTENT_STATUS.md` (at least 8 multiple-choice questions covering introductory, standard, and challenging levels). The build refuses to pass if the declared status does not match the content.
4. Outside links (`videos`, `learnResources` in a unit, `generalResources` in `course.json`) each need `scope` (`unit` or `general`), `kind` (`video`, `lesson page`, `practice`, `reading`, `collection page`, `textbook`, `course page`), `note`, `licenseOrRights`, and `verified`. Label a link `unit` only when it covers that unit's content; a course page, textbook, or collection page is always `general`, and the build rejects anything else. Open each link before adding it.
5. To add a batch to an existing unit, append questions with new ids. Existing ids must not change, because students' saved progress is keyed by id.
6. Run `python3 tools/build.py`.

## Adding a practice test

A unit's tests are listed in its file as `"tests": [{"id": "t1", "title": "Practice test 1", "questionIds": [...]}]`. The rules are in `data/catalog.json` under `practiceTests`, and the build enforces them: a test needs at least `minQuestions` (8) questions from the unit, every topic in the unit, and all three difficulty levels, and it may not share a question with another test in the same unit. Reordering an existing test's questions is therefore never a new test. Write new original questions first, then list them as the next test (`t2`, ...). Never change or reuse a test's id or its question list once students may have taken it: test history is keyed by test id. `CONTENT_STATUS.md` reports, per unit, how many distinct tests the bank could support and at least how many new questions are needed for `plannedPerUnit` (3) tests.

## Study planner steps

The planner's steps and practice threshold live in `data/planner.json`. Change them there; the planner, the saved session history, and `CONTENT_STATUS.md` all follow. Ticking a step is plan completion only and is never counted as evidence.

## Content rules

- Write questions and guides yourself. Do not copy or closely paraphrase College Board exam questions, answer keys, scoring guidelines, AP Classroom, or Student Question Bank items, and do not paste any of them into an AI tool.
- Link to officially released questions on College Board's pages. Do not copy, rehost, or embed them. If you add a `frqs` entry, label the match `approximate` or `spans-units` unless you can show it is exact.
- Link to videos only after confirming the address works. Record source, rights, and the date for every item.

## How progress and adaptivity work

See the "How questions are chosen" and "How the evidence label is defined" panels in the app, or the comment at the top of `js/adaptive.js`. Results are stored in this browser only (`localStorage`). There is no sign-in and nothing is sent anywhere.

## Saving, backup, and undo

- Progress is saved under the `localStorage` key `studysprint:v3`. Progress from the first version (`studysprint:v2`) is migrated automatically, and saved progress without newer fields is still read.
- An unfinished practice test, practice set, or planner session is saved as the student works (`runs` in the saved data), so a page refresh returns to the same question or step. The home page lists unfinished work with Resume and Discard.
- The last submission of each practice test is kept in the unit record (`u[unit].tests[testId]`: number of submissions, best and last score, and each answer), so its results and explanations can be reopened. Older saved progress without it is still read.
- The **My data** page downloads a backup (`studysprint-progress-YYYY-MM-DD.json`) or shows it as text to copy. A backup holds `q` (answer results), `u` (unit settings: level, streak, range, seen-question list, confidence rating, warm-up result, practice test history), and `sess` (completed study sessions). It never holds `runs` (unfinished sets) or `ctx`, so unfinished sets stay on the device where they were started. Restoring checks every field, shows what will change, and offers merge or replace.
- Merge rules (`js/backup.js`): a question on both sides keeps the whole record with more attempts (the newer one on a tie), never a mix; a unit on both sides keeps the device's level, streak, range, and seen-question list, taking only a newer confidence rating or warm-up result from the backup, and per practice test the history with more submissions (the newer one on a tie); sessions are combined by id (the device's copy wins) and capped at the 50 most recent; this device's unfinished sets are kept. Replace swaps in the backup and drops unfinished sets. Before a restore, a unit reset, or "clear all", the current progress is copied to `studysprint:v3:backup`, so the last change can be undone.
- If storage is blocked (some private windows), the site still works for the open tab and says that progress will be lost unless a backup is downloaded.

## Tests

`python3 tools/build.py && node tests/run-all.js` runs every browser test suite against the built site and prints the total. Requirements and what each suite covers are in `tests/README.md`.
