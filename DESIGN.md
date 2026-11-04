---
name: The Boys Hall of Fame
description: League history set on a freshly lined football field.
colors:
  endzone-green: "#0f2a18"
  turf-green: "#1e4d2b"
  turf-hover: "#245a33"
  chalk: "#f4f4ee"
  chalk-soft: "#c9d6cb"
  chalk-faint: "#a3b9a7"
  chalk-line: "rgba(244, 244, 238, .22)"
  flag-yellow: "#e8c547"
typography:
  display:
    fontFamily: "Saira Stencil One, sans-serif"
    fontSize: "clamp(60px, 15vw, 96px)"
    fontWeight: 400
    lineHeight: 0.88
    letterSpacing: "-0.01em"
  marker:
    fontFamily: "Saira Stencil One, sans-serif"
    fontSize: "clamp(32px, 9vw, 44px)"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "Saira Condensed, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    letterSpacing: "0.12em"
  title:
    fontFamily: "Saira Condensed, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    letterSpacing: "0.12em"
  body:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Saira Condensed, sans-serif"
    fontSize: "13px"
    fontWeight: 800
    letterSpacing: "0.12em"
rounded:
  sm: "2px"
spacing:
  gutter: "clamp(16px, 4vw, 32px)"
  section: "48px"
  row: "9px"
components:
  tab:
    textColor: "{colors.chalk-soft}"
    typography: "{typography.title}"
    padding: "14px 0 12px"
  tab-active:
    textColor: "{colors.chalk}"
  flag:
    backgroundColor: "{colors.flag-yellow}"
    textColor: "{colors.endzone-green}"
    rounded: "{rounded.sm}"
    padding: "1px 5px"
  select:
    backgroundColor: "{colors.endzone-green}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sm}"
    padding: "8px 36px 8px 12px"
  playoff-tag:
    backgroundColor: "{colors.chalk-soft}"
    textColor: "{colors.endzone-green}"
    rounded: "{rounded.sm}"
    padding: "0 5px"
---

# Design System: The Boys Hall of Fame

## Overview

**Creative North Star: "The Chalked Gridiron"**

The site is a football field. A painted end zone carries the league name in stencil caps, and chalk yard lines rule every section, table and list. Champions stand as yard markers, one chalk line per season, so the field's length counts the league's age. Everything sits on flat turf. There is no texture, gradient, glow or card: the field is drawn only in paint and chalk.

Reading stays calm inside the frame. Tables and record lists are set in one readable sans with tabular figures. Rank comes from weight, case and a single yellow flag, not from size jumps. The yellow is the referee's flag: it marks the one number that matters in a block and the place you are standing in the navigation.

It refuses both the dark stats dashboard with gold accents and the white card grid of a sports app.

**Key Characteristics:**
- Four flat inks: end-zone green, turf green, chalk and flag yellow.
- Stencil display type for the league name, yard markers and rank numerals.
- Chalk rules (2px) under headers and above blocks, faint chalk lines (1px) between rows.
- One yellow flag per block.
- Phone-first: wide tables scroll inside themselves with the name column pinned.

## Colors

A field palette: two greens for ground, chalk for ink, one flag yellow.

### Primary
- **Flag Yellow** (#e8c547): the single most important number in a block (the win-percentage leader, the #1 record value, the champion's finish), the active tab underline, champion names on yard markers, the text-selection highlight and focus rings.

### Neutral
- **End-Zone Green** (#0f2a18): masthead, footer, select fields, the empty diagonal of the rivalry matrix, and ink on yellow.
- **Turf Green** (#1e4d2b): the page ground and the background behind pinned table columns.
- **Turf Hover** (#245a33): hover fill on matrix records.
- **Chalk** (#f4f4ee): primary text, the masthead lettering, and 2px rules under headers, above record blocks and around yard markers.
- **Soft Chalk** (#c9d6cb): secondary text, labels, notes and the playoff tag.
- **Faint Chalk** (#a3b9a7): losing scores and the in-progress season marker. Kept at at least 4.5:1 on turf.
- **Chalk Line** (rgba(244, 244, 238, .22)): 1px dividers between table rows and list items.

### Named Rules
**The One Flag Rule.** Each table, record list or award block carries at most one yellow flag. When two things are flagged, neither is.

**The Four Inks Rule.** No color outside the four inks and their chalk tints. Wins and losses are told apart by chalk weight (bold chalk versus faint chalk), never by red and green.

## Typography

**Display Font:** Saira Stencil One (sans-serif fallback)
**Body Font:** Source Sans 3 (sans-serif fallback)
**Label Font:** Saira Condensed (sans-serif fallback)

**Character:** Painted field stencils for anything that would be on the turf. Condensed caps are the press-box signage, and a plain humanist sans does the reading.

### Hierarchy
- **Display** (Stencil 400, clamp(60px, 15vw, 96px), 0.88): the league name in the end zone, uppercase.
- **Marker** (Stencil 400, clamp(32px, 9vw, 44px) under 480px, 44px above): yard-marker years. The rivalry score uses Stencil at clamp(64px, 18vw, 112px).
- **Headline** (Condensed 800, 22px, 0.12em, uppercase): section headings, with 48px above and 12px below.
- **Title** (Condensed 800, 15–16px, 0.12–0.14em, uppercase): record-list titles and tabs.
- **Body** (Source Sans 3, 15px, 1.5, tabular figures): tables, lists, notes up to 62ch.
- **Label** (Condensed 800, 13px, 0.12em, uppercase): table headers, award terms, the subline.

### Named Rules
**The One Size Table Rule.** Inside a table every cell is the same size. Names are bold, losses are faint chalk, and the leader carries the flag. Nothing grows.

**The Stencil Numeral Rule.** Ranks in record lists are stencil yard numbers (26px, soft chalk), never plain digits or "01/02".

## Layout

A single centered column with a 1040px maximum width and a fluid gutter (clamp(16px, 4vw, 32px)). The masthead and tab rail are full-bleed, but their content aligns to the column edge. Sections sit on a 48px rhythm. The record book is an auto-fit grid of 440px-minimum lists with a 40px column gap; awards are a 300px-minimum grid of term and value rows. Wide tables scroll horizontally inside their own container, bleeding to the screen edge, with the first column pinned. The tab rail is sticky and scrolls sideways on phones. Yard markers are a horizontal strip that shows three seasons on a 390px screen.

## Elevation & Depth

Flat. Depth is never shadow: the only layers are the end-zone band against the turf, and the sticky tab rail and pinned columns, which take the turf color so content passes under them. There are no box-shadows; a flat turf fill masks the gutter beside a pinned column.

### Named Rules
**The Painted Field Rule.** Nothing floats above the field. If an element needs separation, give it a chalk rule, not a shadow.

## Shapes

Square and ruled. Corners are 2px at most (flags, tags, selects). Structure comes from straight chalk lines: 6px chalk borders seal the end zone and footer, 2px lines frame headers, record blocks and yard markers, and the hash rail repeats 2px ticks every 20px under the champions. There are no pills, circles or rounded cards.

## Components

### Tab rail
- **Style:** uppercase condensed caps in soft chalk, on turf, above a 2px chalk baseline.
- **Active:** chalk text, plus a 4px flag-yellow bar that slides to the active tab (0.45s, cubic-bezier(.16, 1, .3, 1); instant under reduced motion).
- **Mobile:** scrolls sideways with its scrollbar hidden.

### Yard marker (signature)
- A column with a chalk border on the left (and on the right of the last marker), a stencil year, the champion's name in flag-yellow condensed caps, and the team name in soft chalk. The in-progress season shows its year in faint chalk and "Live" in soft chalk. A hash rail runs beneath the strip.

### Tables
- Header labels sit above a 2px chalk rule, rows are divided by 1px chalk lines, and padding is 9px by 8px. Tables use tabular figures and right-align numbers. The first column is pinned on turf while the table scrolls.

### Record list
- A 2px chalk rule on top and a condensed title, then numbered rows in a three-column grid: a stencil rank, the value right-aligned, and the detail with its season and week in soft chalk below. The #1 value carries the flag.

### Flag
- Flag yellow behind end-zone green text, 2px corners, padding of 1px by 5px. One per block.

### Playoff tag
- A small soft-chalk tag reading "Playoffs" in end-zone green condensed caps (11px), set after the week.

### Select
- End-zone green fill, a 2px chalk border, 2px corners, condensed 800 caps and a chalk chevron. Focus shows a 2px flag-yellow outline.

## Do's and Don'ts

### Do:
- **Do** pin every record to its season and week ("2024 · Week 14") right next to the number.
- **Do** mark the single key value of a block with the flag (#e8c547 on #0f2a18).
- **Do** rule sections with chalk lines: 2px chalk under headers, 1px chalk lines between rows.
- **Do** use stencil type for anything painted on the field: the league name, years and rank numerals.
- **Do** theme browser surfaces: yellow selection, yellow focus rings and caret, and chalk-and-green scrollbars.

### Don't:
- **Don't** add gradients, textures, glows or drop shadows. The field is flat paint.
- **Don't** use red and green for wins and losses. Use bold chalk versus faint chalk.
- **Don't** put a label or eyebrow above a heading. The heading carries itself.
- **Don't** use emoji or Unicode glyphs as icons. The trophy is an authored SVG symbol.
- **Don't** box content in cards. Blocks are separated by chalk rules on open turf.
