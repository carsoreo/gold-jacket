---
version: 1
slug: "site-template-html"
primary_target: "site/template.html"
related_targets: []
---

# Hall of Fame site

Scope: the single-page league history site (`site/template.html`). Mode: Read, built code-led.
Audience: The Boys managers, opening a link from GroupMe or Discord on a phone, usually to settle an argument.
Job: find the champion, record, margin or head-to-head fast. Content: real Yahoo history from 2020–2026, nothing invented.
Constraints: one self-contained file, vanilla JS, data injected at build. Keep all the sections and behavior: Hall, Seasons, Record Book (including highest-scoring games), Rivalries matrix, and Drafts.

## Direction contract

THESIS: The site is the field. A painted end zone carries the league name, and chalk yard lines rule every section. It refuses the dark "stats dashboard with gold accents" and the white ESPN card grid.

OWN-WORLD: Turf green (#1e4d2b) ground with a deeper end-zone green (#0f2a18), chalk white for ink and rules, and one highlighter yellow (#e8c547) used only for the single key number or the current place. Display type is a stencil face (Saira Stencil One); labels are in condensed caps (Saira Condensed); body and tables are in a readable sans (Source Sans 3) with tabular figures. Signature details: hash-mark tick rails and yard-number stencils that number the record lists. Four flat inks, no gradients.

STORY: Champions read first and are honored as yard markers. The standings answer "who's best". The Record Book and Rivalries hand out ammo with the season and week pinned to every number.

FIRST VIEWPORT (390 wide): an end-zone masthead with "THE BOYS" in about 64px stencil caps and an EST. 2020 kicker, a sticky tab rail in condensed caps with the current tab yellow-underlined, a row of champion markers (stencil year plus the manager in yellow) over a hash rail, then the All-Time Standings table ruled in chalk.

FORM: Chalked Gridiron, number 6 on the re-roll list. seed: 43afacf0bf64f3bc.
Raises:
- Tables use one type size; weight, case and reversal carry the ranking.
- Awards are labeled in blunt caps.
- One yard line per season counts the league's age.
- One yellow swipe per card.
- A single turf-to-chalk tonal ramp.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
