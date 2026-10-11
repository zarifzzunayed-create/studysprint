# StudySprint

StudySprint is a free, browser-based review site for AP students. Choose a course and unit to review concise notes, practice with original questions, and build a short study session around that same material.

> StudySprint is an independent student project. It is a review aid, not a complete AP course, and it is not affiliated with or endorsed by the College Board.

## What you can do

- Select an AP course and unit, then open that unit's guide and question bank.
- Practice with introductory, standard, and challenging questions. The adaptive selector adjusts to first-attempt results and rotates through eligible questions before repeating them.
- Finish the main practice set, then review questions you missed in a separate end-of-test section.
- Use the five-step study planner, which stays connected to the selected course and unit.
- Use the optional Learn first path and verified learning-resource links when you want to review a concept before practicing.
- Save progress in your browser and export or restore a backup from the My data page.

## Content status

| Course | Current coverage |
|---|---|
| AP Physics 1: Algebra-Based | 8 of 8 units practice-ready |
| AP Calculus AB | 8 of 8 units practice-ready; 12 questions per unit |
| AP Statistics | 5 of 5 units practice-ready |
| AP Precalculus | Unit outlines only |
| AP Calculus BC | Unit outlines only |
| AP Physics 2: Algebra-Based | Unit outlines only |
| AP Physics C: Mechanics | Unit outlines only |
| AP Physics C: Electricity and Magnetism | Unit outlines only |
| AP Computer Science A | Catalog entry only; no verified unit outline yet |

“Practice-ready” means that a unit has review notes and a question bank. It does not mean the site covers every part of the AP course. See [CONTENT_STATUS.md](CONTENT_STATUS.md) for the unit-by-unit breakdown and known limitations.

## Try it locally

The site is static and does not require an account, a server backend, or a paid API. From the project folder, start a local web server:

```bash
python -m http.server 8000
```

On Windows, you can use:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

## Publish with GitHub Pages

Place the contents of this project folder in the repository root, where `index.html` is located. In the repository's **Settings → Pages**, choose deployment from the `main` branch and the `/(root)` folder. The site is designed to work from a GitHub Pages project URL.

## Build and tests

The project includes its content validator, single-file preview builder, and browser regression tests. From the project folder:

```bash
python tools/build.py
node tests/run-all.js
```

On Windows, run the build with `py tools/build.py`. See [tests/README.md](tests/README.md) for requirements and test coverage. `MANIFEST.sha256` contains checksums for the project files.

## Content and progress notes

Practice questions are original. Official College Board released free-response question pages are linked as resources; their questions, answer keys, and scoring guidelines are not copied into this project. Outside learning links are labeled as unit-specific or general.

Progress is saved in the current browser using local storage. There are no accounts, and progress is not sent to a server. Export a backup before changing devices or clearing browser data.
