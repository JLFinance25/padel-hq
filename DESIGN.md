---
name: Padel HQ
description: The firm's year as a station departures board, set on warm paper.
colors:
  paper: "#F7F5F0"
  paper-2: "#EFEBE2"
  surface: "#FFFFFF"
  row-hover: "#FBFAF6"
  line: "#E4DFD4"
  line-2: "#D2CBBE"
  ink: "#1B2A4A"
  text: "#25282E"
  muted: "#5C6170"
  slate: "#7B8499"
  navy-soft: "#E4E8F0"
  board: "#14213B"
  board-2: "#182742"
  board-hover: "#1F3052"
  cell: "#0A1120"
  board-line: "rgba(243, 239, 230, .09)"
  board-text: "#F3EFE6"
  board-dim: "#A3AEC4"
  green: "#1F6F5C"
  green-hover: "#185A4A"
  green-soft: "#E2EEE9"
  lamp-green: "#4FCB98"
  yellow: "#F0B429"
  yellow-soft: "#FCF0D2"
  amber-ink: "#7A5000"
  red: "#B4432F"
  lamp-red: "#FF8A72"
  placeholder: "#737887"
  tile-hinge: "rgba(0,0,0,.45)"
  ball-shade: "rgba(0,0,0,.08)"
typography:
  display:
    fontFamily: '"Board Display", "Board", "Arial Narrow", sans-serif'
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.03em"
  headline:
    fontFamily: '"Board Display", "Board", "Arial Narrow", sans-serif'
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.05em"
  score:
    fontFamily: '"Board Display", "Board", "Arial Narrow", sans-serif'
    fontSize: "64px"
    fontWeight: 700
    lineHeight: 1
  score-phone:
    fontFamily: '"Board Display", "Board", "Arial Narrow", sans-serif'
    fontSize: "52px"
    fontWeight: 700
    lineHeight: 1
  display-phone:
    fontFamily: '"Board Display", "Board", "Arial Narrow", sans-serif'
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1
  title:
    fontFamily: '"Board", "Arial Narrow", sans-serif'
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "0.03em"
  board-row:
    fontFamily: '"Board", "Arial Narrow", sans-serif'
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.04em"
  board-when:
    fontFamily: '"Board", "Arial Narrow", sans-serif'
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.06em"
  board-row-phone:
    fontFamily: '"Board", "Arial Narrow", sans-serif'
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.04em"
  tab:
    fontFamily: '"Board", "Arial Narrow", sans-serif'
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.07em"
  label:
    fontFamily: '"Board", "Arial Narrow", sans-serif'
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.12em"
  micro:
    fontFamily: '"Board", "Arial Narrow", sans-serif'
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.12em"
  body:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: '"tnum"'
  body-strong:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
  small:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  secondary:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  wordmark:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
    fontSize: "16px"
    fontWeight: 200
    letterSpacing: "0.34em"
rounded:
  tile: "2px"
  tag-sm: "3px"
  tag: "4px"
  sm: "6px"
  control: "8px"
  strip: "10px"
  board-phone: "12px"
  panel: "14px"
  pass: "16px"
  pill: "99px"
spacing:
  gap: "8px"
  row: "12px"
  gutter-phone: "14px"
  row-x: "16px"
  gutter: "22px"
  page-x: "24px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  button-ghost-hover:
    backgroundColor: "{colors.paper-2}"
  button-sm:
    padding: "5px 10px"
  icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    size: "34px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
  segmented-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  segmented-active-on-board:
    backgroundColor: "{colors.board-text}"
    textColor: "{colors.board}"
  tab:
    textColor: "{colors.muted}"
    typography: "{typography.tab}"
    padding: "12px 11px 10px"
  tab-current:
    textColor: "{colors.ink}"
  tick:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    size: "22px"
  tick-checked:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
  board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-text}"
    rounded: "{rounded.panel}"
  board-row:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-text}"
    typography: "{typography.board-row}"
    height: "54px"
  board-row-even:
    backgroundColor: "{colors.board-2}"
  board-row-hover:
    backgroundColor: "{colors.board-hover}"
  flap-tile:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.board-text}"
    rounded: "{rounded.tile}"
    padding: "3px 1px 2px"
  status-today:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.board}"
    rounded: "{rounded.tag}"
    padding: "5px 8px 4px"
  tag-flap:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.board}"
    rounded: "3px"
    padding: "3px 5px 2px"
  pill-confirmed:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  pill-projected:
    backgroundColor: "{colors.yellow-soft}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  pill-teacher:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  pill-quiet:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  pill-new:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.board}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  ruled-list:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  ruled-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    padding: "12px 16px"
  ruled-row-hover:
    backgroundColor: "{colors.row-hover}"
  ruled-row-lit:
    backgroundColor: "{colors.yellow-soft}"
  update-strip:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.strip}"
    height: "58px"
  update-stub:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.board}"
    width: "52px"
  post:
    backgroundColor: "{colors.yellow-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  drawer:
    backgroundColor: "{colors.surface}"
    width: "min(500px, 100%)"
  drawer-head:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-text}"
    typography: "{typography.title}"
    padding: "18px 22px 16px"
  drawer-head-editing:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
  pass:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pass}"
    width: "380px"
  toast:
    backgroundColor: "{colors.board}"
    textColor: "{colors.board-text}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
---

# Design System: Padel HQ

## Overview

**Creative North Star: "The Departures Board"**

The whole site is a train station departures board for the firm's year. Every deadline, event and to-do is a departure, ranked by how soon it leaves. The home screen is one deep navy board with warm white capital letters, each letter sitting in its own little flip tile, and the tiles flip when something changes. Around that one board everything else is calm: warm off-white paper, white panels, thin hairlines, and plain Helvetica Neue for anything you read as a sentence or type into a box.

The second idea is the boarding pass. The lock screen is a ticket with a perforated tear line, and the detail panel that slides in from the right is laid out like a pass: a navy header with the item's name, then a grid of small labeled fields (When, In, Team, Date is). Colors carry meaning, never decoration. Green means confirmed or "go", yellow means look at this now (new, changed, due soon, today), red means late. The look follows the firm's class deck and booth: warm off-white, court green, navy and padel-ball yellow, clean like an architect's model.

The density is "glanceable between classes". The board shows 12 departures on a laptop and 6 on a phone, lists are ruled rows rather than cards, and the answer to "what's next, what's mine, what changed" sits in the first screen.

**Key Characteristics:**
- One navy departures board per screen, everything else on warm paper.
- Two typefaces with strict jobs: Big Shoulders capitals for the board and labels, Helvetica Neue for reading and typing.
- Every letter on the board sits in its own flip tile and only flips when its text changes.
- Status is told by colored letters and a small lamp dot; only Today gets a filled block.
- Lists are ruled rows with hairlines, not stacks of cards.
- Ticket details: perforations, notches, dashed route lines, a navy pass header.

## Colors

A warm paper ground, one deep navy board, and three signal colors (court green, ball yellow, red) that each mean one thing.

### Primary
- **Court Green** (`--green`): the action and "confirmed" color on paper. Primary buttons, links, the text cursor, focus rings, the current tab's underline, checked boxes, confirmed pills, the season line track and its station rings, filled to-do counter cells. Darkens to **Deep Court** (`--green-hover`) on hover. **Pale Court** (`--green-soft`) is its quiet partner: the halo around a focused field, the selected day in Month, the background of a "Confirmed" pill and the current Circles period band.

### Secondary
- **Departures Navy** (`--board`): the board itself, plus every surface that copies the board or the pass header: the lock-screen pass header, the detail panel header, the day sheet header in Month, the Circles score panel, the Circles period headers, and the toast. It is also the browser's theme color.
- **Board Stripe** (`--board-2`): every other row on the board, so long rows are easy to follow. **Board Hover** (`--board-hover`) when you point at a row.
- **Tile Black** (`--cell`): the background of each flip tile. It must stay darker than the board so each letter reads as its own tile.
- **Warm White Letters** (`--board-text`): all text on navy. **Dim Letters** (`--board-dim`): column headings, the weekday by the clock, "far away" day counts, and quiet statuses on navy. **Board Hairline** (`--board-line`): the thin rules between board rows and columns.

### Tertiary
- **Ball Yellow** (`--yellow`): "look here now". The clock, changed items (the NEW / UPDATED tag, the yellow date letters on a changed row, the yellow count on the Board tab, the "n new" badge), Due soon and Today statuses, the pinned update's icon stub, the TODAY ball on the season line, the Gold tier, and text selection. It is also the padel-ball mark.
- **Pale Ball** (`--yellow-soft`): backgrounds for posted updates, changed rows on paper, "Projected" pills and "Circles +n" pills.
- **Amber Ink** (`--amber-ink`): readable yellow-family text on paper. Use it for words that sit on Pale Ball, for "due soon" dates on paper, and for "Projected" in the detail panel. Never put plain Ball Yellow text on white.
- **Clay Red** (`--red`): late and destructive on paper. Overdue due dates, error text, the Delete button, a missed Circles period header, the deadline dot in Month, and the error toast.

### Lamp colors (navy only)
- **Lamp Green** (`--lamp-green`) and **Lamp Red** (`--lamp-red`): brighter versions of green and red that glow on navy. Lamp Green marks Confirmed on the board and fills the Circles progress bar. Lamp Red marks Overdue on the board and the folded "late to-dos" row. They are too light for paper.

### Neutral
- **Warm Paper** (`--paper`): the page background behind everything.
- **Paper Shade** (`--paper-2`): ghost-button hover, owner and kind pills, event chips in Month, tab counters, the name chip in the top bar, and the detail panel header while editing.
- **White** (`--surface`): panels, ruled lists, inputs, buttons, the pass card. **Row Hover** (`--row-hover`) is the faint warm tint when you point at a row or day on paper.
- **Hairline** (`--line`) for borders and row dividers; **Hairline Dark** (`--line-2`) for control borders, dashed placeholders and the scrollbar thumb.
- **Navy Ink** (`--ink`): headings, button text, the active segmented button, today's date circle in Month, important text. **Body Text** (`--text`) for running text. **Muted** (`--muted`) for secondary text, hints and timestamps.
- **Slate** (`--slate`): the dot for plain events, our own milestones (hollow ring) and to-dos (dashed ring) in Month.
- **Navy Mist** (`--navy-soft`): the continuous band behind a multi-day event in Month. Note: the stylesheet uses this variable with a fallback value but never defines it in `:root`. If you change it, add it to `:root` first.

### Status colors and what they mean

On the board, the Status column tells you how sure a date is, or how urgent it is. The first matching state wins, in this order:

| State | Looks like on the board | Meaning |
|---|---|---|
| Overdue | Lamp Red letters, blinking red dot | A to-do past its due date and not checked off |
| On now / Today | Ball Yellow block, navy letters, navy dot | Happening today, or a multi-day event that is under way |
| Due soon | Ball Yellow letters, blinking yellow dot | 3 days or less away |
| To-do | Dim letters, dim dot | A to-do that is not urgent yet |
| Confirmed | Lamp Green letters, glowing green dot | Date confirmed for this season |
| Projected | Ball Yellow letters, hollow yellow ring | Date guessed from last season |
| From teacher | Warm white letters, solid white dot | Date given by the teacher |
| Our target | Dim letters, dim dot | A date the firm set for itself |

On paper (Month, team pages, the day sheet) the same certainty shows as pills: Confirmed = Pale Court with green text, Projected = Pale Ball with Amber Ink, From teacher = Navy Ink with white text, Our target and No date = Paper Shade with muted text. Due dates on paper rows turn Amber Ink at 7 days or less and Clay Red when late. (The board's "Due soon" is 3 days; the paper rows use 7. That gap is in the build today.)

The **kind** of an item (Month dots and the color key): deadline = Clay Red, competition = Navy Ink, trade show = Court Green, field trip = Ball Yellow, event = Slate, our milestone = hollow Slate ring, to-do = dashed Slate ring.

### Named Rules

**The Yellow Means Look Rule.** Ball Yellow only marks things that need your eyes now: new, changed, due soon, today, the pinned update, the clock, the Gold goal. If nothing about it is urgent or new, it is not yellow.

**The One Board Rule.** Navy is the board. Use it for the board and for headers that copy the board or the pass, never as a page background or for ordinary cards.

**The Lamps Stay on Navy Rule.** Lamp Green and Lamp Red only appear on navy. On paper, use Court Green and Clay Red.

**The Say How Sure Rule.** Every date shown anywhere carries its certainty color. A guess never looks like a fact.

## Typography

**Board Font:** Big Shoulders Text, self-hosted and named `"Board"` in the CSS (falls back to Arial Narrow)
**Board Display Font:** Big Shoulders Display, named `"Board Display"` (falls back to Board, then Arial Narrow)
**Body Font:** Helvetica Neue (falls back to Helvetica, Arial, system-ui). It is not downloaded: Macs and iPhones have it; most Chromebooks and Windows laptops will show Arial instead.

**Character:** Big Shoulders is the tall, narrow capital lettering of a real station board. Helvetica Neue is the same plain sans the firm deck uses. The board shouts in capitals; everything you actually read or type is quiet and normal.

### Hierarchy
- **Display** (Board Display 700, 40px, line-height 1, 0.03 to 0.04em spacing, all caps): the board title "Departures", page titles (team names, Month, Circles, Log), and the big month words on the lock-screen pass. 32px on phones.
- **Headline** (Board Display 700, 22 to 32px, 0.04 to 0.05em, all caps): the Updates heading (26px), the season line heading (22px), the month name next to the arrows (32px, 26px on phones), the name dialog title (24px). The day sheet's big date number is 44px.
- **Score** (Board Display 700, 64px in flip tiles; 52px on phones): the Circles of Excellence score only.
- **Title** (Board 700, 26px, line-height 1.08, all caps): the item name in the detail panel header.
- **Board row** (Board 700, 18px, 20px on wide screens over 1100px, 0.04 to 0.06em, all caps): When, Days and the item title on the board. Titles may wrap to 2 lines, then cut off. The pass field values in the detail panel use the same face at 20px.
- **Tab** (Board 600, 15px, 0.07em, all caps): the section tabs. 14px on phones.
- **Label** (Board 600, 12 to 15px, 0.1 to 0.14em, all caps): board column headings, the legend, statuses, group headings over lists ("Overdue · 3"), weekday names in Month, pass field labels, "Just added". Labels are always muted or dim unless they carry a status color.
- **Body** (Helvetica Neue 400, 15px, line-height 1.5, tabular numbers): descriptions, sentences, inputs, buttons (weight 500). Long descriptions stop at 65ch.
- **Body strong** (Helvetica Neue 600, 15px): item titles in ruled rows on paper. Navy Ink.
- **Small** (Helvetica Neue, 12 to 13px): meta lines, timestamps, pills, hints, chips in Month.
- **Wordmark** (Helvetica Neue 200, 16px, 0.34em spacing): "PADEL HQ" next to the ball mark. Thin and wide, like the firm deck.

### Named Rules

**The Two Voices Rule.** Big Shoulders is always capitals and always letterspaced: it is for the board, labels, dates, counts and headings. Helvetica Neue is for anything you read as a sentence or type into a field, and it is never set in spaced capitals. The one exception is the wordmark.

**The Paper Titles Rule.** An item's title is Big Shoulders when it sits on navy (the board, the detail panel header) and Helvetica Neue 600 when it sits on paper (ruled rows, chips). Same item, the surface decides.

## Layout

The page is a centered column up to 1280px wide, with 24px side padding (14px on phones) and generous bottom space so the last row never hides under a thumb. The top bar and the tab strip both stick to the top while you scroll.

**Home:** a pinned update strip across the top, then two columns: the board on the left and the Updates rail (340px) on the right, 22px apart. The season line map runs full width underneath. The rail sticks beside the board while you scroll on laptops.

**Month:** the calendar grid on the left and a 320px day sheet on the right. Day cells are at least 118px tall.

**Board columns** (left to right): a 12px spacer, When (86px), Days (62px), the title (takes the rest), Team (128px) and Status (132px). Thin vertical rules separate When, Days and the title, like a real board.

**Spacing rhythm:** 22px is the house gap (between big blocks, inside the board and panels). Rows use 12px top and bottom and 16px sides. Small gaps inside controls are 6 to 8px.

### Breakpoints
- **Over 1100px:** board letters grow to 20px.
- **1240px and below:** the Team column drops off the board; the rail narrows to 300px.
- **1100px and below:** the rail narrows to 280px; Month stacks the day sheet under the grid.
- **900px and below:** Home becomes one column; the Updates rail moves under the board and stops sticking.
- **680px and below (phones):** the board shows 6 rows instead of 12, and each row becomes three columns: a thin spacer, the date with "n days" in yellow under it, and the title with the status underneath. Column headings disappear. Segmented buttons and the team picker go full width. Month day cells shrink to 54px and show up to 4 colored dots instead of event chips. Ruled rows move their side details (due date, owner) under the title. The pass fields and form fields become one column where needed, and the detail panel takes the full screen width.

The JavaScript uses the same 680px line to decide "phone" (`isPhone()`), so change both together.

## Elevation & Depth

Mostly flat. The paper page and its white panels sit level, separated by 1px hairlines, with no shadow. Depth is saved for the few things that really sit above the page, plus a soft glow on lamps.

### Shadow Vocabulary
- **Board slab** (`0 2px 4px rgba(20,33,59,.12), 0 18px 40px rgba(20,33,59,.18)`): only the departures board. It is the heaviest object on the page.
- **Floating card** (`--shadow`: `0 1px 2px rgba(20,33,59,.06), 0 8px 28px rgba(20,33,59,.08)`): the lock-screen pass and the name dialog.
- **Drawer** (`-12px 0 40px rgba(20,33,59,.18)`): the detail panel, over a navy scrim at 32%.
- **Here marker** (`0 0 0 4px` white ring plus `0 4px 10px rgba(20,33,59,.25)`): the TODAY ball on the season line.
- **Lamp glow** (`0 0 8px rgba(79,203,152,.6)`): the Confirmed dot on the board. A light, not a shadow.
- **Tile edge** (`inset 0 1px 0 rgba(243,239,230,.07)`): a hairline highlight on the top of each flip tile.

### Named Rules

**The Flat Paper Rule.** Panels on paper never get a shadow. If something needs to stand out on paper, give it a hairline or a status color, not a shadow.

## Shapes

Softly rounded, with ticket details.

- **Radius scale:** flip tiles 2px, status blocks and small tags 3 to 4px, posts and checkboxes 6px, buttons and inputs 8px, the update strip 10px, every panel and list 14px (12px for the board on phones), the lock-screen pass 16px, pills and counters fully round.
- **Ticket details:** the lock-screen pass has a dashed perforation line with two half-circle notches cut out of its edges, and a dashed route line between the two month words with a yellow dot on it. The detail panel's field grid ends in a dashed perforation too.
- **Dashed means "not settled":** a dashed outline marks placeholders and unsettled things: an unassigned owner, the "working name" badge, a to-do chip in Month, the to-do ring in the color key, an empty list.
- **The ball mark:** a yellow circle with two white seam curves. It is the logo (next to the wordmark and in the favicon), sits beside the board title, and marks TODAY on the season line.
- **Icons:** simple stroke icons drawn inline as SVG (18px, 1.75 stroke, round ends), always in the current text color.

## Components

### Buttons
Plain and solid, like a ticket machine.
- **Shape:** gently rounded (8px).
- **Default:** white, Hairline Dark border, Navy Ink text, weight 500, 8px by 14px padding. Border turns Navy Ink on hover; presses down 1px when clicked.
- **Primary:** Court Green with white text, Deep Court on hover. One primary per area (Save, Post, Open the board, Mark done).
- **Ghost:** no border or fill until hover, then Paper Shade. Used for quiet actions (Cancel, All updates, Mark all seen).
- **Danger:** default button with Clay Red text and a red border on hover (Delete).
- **Small:** 5px by 10px, 13px text. **Icon button:** 34px square, 40px where thumbs need it (the update strip and posts).
- **On the board:** transparent with a faint warm white border that turns solid warm white on hover.

### Segmented control
A row of joined buttons inside an 8px rounded outline. The chosen one is filled Navy Ink with white text. On the board it flips: transparent with a faint border, and the chosen one is filled warm white with navy text.

### Inputs / Fields
- **Style:** white, Hairline Dark border, 8px radius, 9px by 11px padding. Labels sit above the field in Helvetica 13 to 14px weight 500, Navy Ink.
- **Focus:** the border turns Court Green with a 3px Pale Court halo.
- **Selects** use a custom navy chevron (warm white on the board).
- **Error:** a Clay Red line of text under the form.

### Checkbox (tick)
A 22px square with 6px corners. Empty is white with a Hairline Dark border (faint warm white on the board); hover shows a green border. Checked fills Court Green and the white check mark scales in. The tap area is invisibly extended to 44px.

### Navigation
- **Top bar:** white, hairline underneath, sticky. Ball mark and wordmark on the left (with a dashed "working name" badge that hides on phones); your name in a Paper Shade chip and a log-out icon on the right.
- **Tabs:** Big Shoulders capitals, muted, never underlined like links. Hover turns Navy Ink and previews a Hairline Dark rule that draws in from the left. The current tab is Navy Ink with a 2px Court Green rule. A small round counter can sit after a label; on the Board tab it turns Ball Yellow when things changed since you looked. Tabs scroll sideways on phones.

### Departures board (signature)
The heart of the site.
- A navy slab with 14px corners and the board-slab shadow. The header has "DEPARTURES" in Display with the ball mark, and a yellow flip-tile clock on the right with the weekday and date in Dim Letters.
- Controls under the title: a segmented filter (Dates, To-dos, Mine, Everything) and a team picker.
- Column headings in Dim Letters label, between two hairlines.
- **Rows:** at least 54px tall, hairline between rows, every other row in Board Stripe. The whole row is one big button that opens the detail panel; a yellow inset outline shows keyboard focus. Under the pointer or keyboard focus the row's lamp warms to a faint warm white bar (Lamp Red on the late row), like a selected line on a station board.
- **Loading:** before the data arrives the board shows six placeholder rows of Tile Black bars that pulse in a slow wave. **Failure:** if the data can't load, the board says "THE BOARD DIDN'T LOAD" in Title type, the reason in Lamp Red, and a Try again button. It never sits on a loading message forever.
- **Days column** is Ball Yellow when 14 days or less away and Dim when further.
- **Changed rows** (new or edited by someone else since you looked): the When and Days letters turn Ball Yellow and a small yellow NEW or UPDATED tag sits under the title. No background tint, no side bar.
- **Late to-dos** fold into one row at the top with a red count, so they do not push real deadlines off the board. Tapping it shows or hides them.
- **Footer:** a color key (Confirmed, Projected, Due soon = 3 days or less, NEW = changed since you looked) and buttons for undated items and the full board.

### Flip tiles (signature)
Each character on the board (When, Days, the clock, the Circles score) sits in its own Tile Black tile with 2px corners, a 2px gap between tiles, a thin dark split line across the middle, and a faint top highlight. Spaces are narrow empty gaps, not tiles. In the Status column the tiles are removed: status reads as plain lit letters with a dot. Screen readers get the whole word, not the tiles.

### Ruled rows
Every list on paper (team to-dos, the day sheet, undated items, Circles checklist, the log) is a white panel with 14px corners and rows divided by hairlines, never a stack of separate cards.
- **Row:** 12px by 16px padding, three parts: a checkbox or a kind dot, the title (Helvetica 600, Navy Ink) with a 2-line description in muted 13px, and a right-hand side with the due date (Big Shoulders 15px caps) and pills.
- **Hover** shows Row Hover. **Changed** rows get Pale Ball and a yellow "New" pill. **Done** rows strike through the title in muted. Keyboard focus draws a 2px green ring inside the row.
- **Group headings** over lists are Big Shoulders labels with a count ("Overdue · 2"); the overdue heading is Clay Red.

### Pills
Small fully rounded tags in 12px Helvetica weight 500: owner (Paper Shade, or a dashed outline when unassigned), certainty (see Status colors), "Circles +n" (Pale Ball, Amber Ink), and "New" (Ball Yellow, navy, weight 600).

### Pinned update strip and posts
- **Strip:** the newest class update across the top of Home. A white bar with 10px corners and a Hairline Dark border, at least 58px tall, with a 52px Ball Yellow stub on the left holding a navy megaphone icon. Text in Navy Ink 500, a muted meta line, and actions on the right.
- **Posts** in the Updates rail repeat the shape smaller: Pale Ball background, a 34px yellow stub, Amber Ink meta.
- **Updates rail:** a white panel with "UPDATES" and a yellow "n new" badge, a post box that grows from one line to four when you start typing, then a "Just added" feed of hairline-separated lines where a yellow dot marks what is new to you.

### Detail panel: the pass
Slides in from the right (500px wide, full width on phones) over a navy scrim.
- **Header:** navy, the item name in Title type in warm white, a close button at the top right. No label above the title.
- **Field grid:** two columns of label and value pairs (When, In, What, Team, Date is, Owner, Due) with hairlines between them, like the fields on a boarding pass. Labels are Big Shoulders 12px muted capitals; values are Big Shoulders 20px Navy Ink capitals, colored Court Green, Amber Ink or Clay Red when they carry certainty or urgency. A lone last field spans both columns. The grid ends in a dashed perforation.
- **Below:** a one-line explanation of what the date's certainty means, the description (65ch max), notes, links and "Last changed by".
- **Footer:** hairline on top; Delete or Mark done on the left, Edit or Cancel and Save on the right.
- **Editing mode:** the header turns Paper Shade with Navy Ink text, so you can always tell reading (navy) from editing (paper). Form fields stack in one column, with short pairs side by side on wider screens.

### Lock screen: the boarding pass
A centered 380px white card with 16px corners and the floating-card shadow. A full-width navy header holds the ball, the wordmark in warm white and a yellow "CLASS PASS" tag. Under it, the season's first and last month in big Display capitals joined by a dashed route line; the ball rolls along it to where today falls in the season and the travelled part turns Ball Yellow, one sentence about the site, the perforation, then the passcode and name fields and a green "Open the board" button.

### Month calendar
A white panel with weekday headings in Big Shoulders labels. Day numbers are Big Shoulders in a 28px circle; today is a filled Navy Ink circle; the selected day is Pale Court; days outside the month are Warm Paper. Events are small Paper Shade chips with a kind dot; to-dos are dashed chips; changed items are Pale Ball; done items fade and strike through; a multi-day event is one continuous Navy Mist band across its days. The day sheet beside it has a navy header with the big date number.

### Season line
A white panel with a horizontal Court Green track (the past part turns Hairline Dark), white station circles with green rings (big stops ringed in Navy Ink, past stops grey), stop names in Big Shoulders capitals above, the Circles periods as bands below (the current one in Pale Court), month ticks, and the yellow TODAY ball. It scrolls sideways on narrow screens.

### Circles of Excellence score
A navy panel with the score in 64px flip tiles, "of N" in Dim Letters, a 12px round progress track filled in Lamp Green, and tier marks for Bronze, Silver and Gold (Gold's label in Ball Yellow). One plain line under the message (bonus points, when to check an item off); the longer caveat about how the score is counted folds into a "+ How the score is counted" toggle. Each period below is a navy header strip sitting on a ruled list; a missed period's header turns Clay Red.

### Team progress
At the top right of each team page: a tiny "DONE" label over the done count in 30px flip tiles ("3/5"), with one small cell per item underneath, filled Court Green when done. On phones it sits under the heading, left-aligned.

### Officer mode
Only officers add, edit and delete to-dos. On a team page the filter (Everything · Mine · Unassigned) sits on the left of one row; officers see a green "+ Add to-do" button on the right of it (full width under the filter on phones) that opens the panel's New to-do form. Everyone else sees a muted line there instead: "Officers add to-dos. Officer sign-in", the last part an underlined Court Green link. Signed-in officers get a small navy "OFFICER" tag in Ball Yellow board letters inside the name button. The officer sign-in is a second floating-card dialog styled like the name dialog; the name dialog's last line, under a dashed rule, links to it (or to "Leave officer mode").

### Toast
A small navy bar at the bottom center with a check icon and a short message, sliding up into place. An "Undo" action shows in Ball Yellow, underlined. Errors use Clay Red.

### Motion
- **One easing curve** for everything that moves: `--ease`, a fast start with a soft landing (`cubic-bezier(.16, 1, .3, 1)`).
- **Hover and state changes:** 0.15s.
- **Flip tiles:** each tile flips down into place in 0.42s. Letters start 32ms apart (capped at 0.9s), and each board row starts 28ms after the one above. The whole board cascades once when the page first loads. After that a tile flips only when its own text changes, never just because you changed a filter.
- **Blink:** the dot for Due soon and Overdue blinks on a 1.6s on/off step, and the clock's colon ticks on a 2s step. Nothing else blinks, and the dots in the color key stay still.
- **Page change:** a new page rises 8px into place in 0.42s, its parts 50ms apart. It plays once per tab change, never on background refreshes.
- **Lock screen:** the route fills and the ball rolls to today in 1.1s.
- **Panels:** the detail panel slides in 40px from the right in 0.26s while the scrim fades in 0.2s. Month slides 18px sideways in 0.28s when you change months. The toast rises in 0.25s. The Circles bar fills in 0.5s. Season stops grow to 125% on hover.
- **Reduced motion:** if the device asks for less motion, every animation and transition is switched off, and the flip tiles do not flip at all.

## Do's and Don'ts

### Do:
- **Do** keep exactly one navy departures board per screen and let everything else sit on Warm Paper with white panels and hairlines.
- **Do** put every character on the board in its own flip tile, and only flip a tile when its text changes.
- **Do** show every date's certainty with its status color (Confirmed, Projected, From teacher, Our target), on the board and on paper.
- **Do** mark changed items by lighting them: yellow letters and a NEW or UPDATED tag on the board, Pale Ball and a "New" pill on paper.
- **Do** use ruled rows with hairlines for every list, with the checkbox on the left and due date and owner on the right.
- **Do** use Big Shoulders capitals for board text, labels, dates and headings, and Helvetica Neue for sentences and anything typed.
- **Do** use Amber Ink, not Ball Yellow, for yellow-family text on paper.
- **Do** extend small tap targets invisibly instead of making the box bigger: the checkbox and season stops reach 44px, and icon buttons on the update strip and posts are 40px.
- **Do** use the shared `--ease` curve and switch all motion off under reduced motion.

### Don't:
- **Don't** add colored side stripes (a thick colored left or right border, or a colored bar down a row's edge) to rows, cards or alerts. Changed rows light their letters instead. The pinned update's yellow icon stub is a 52px icon cell, not a stripe, and it belongs only to class updates.
- **Don't** put a small label above a heading. The heading is the label. Boarding-pass field labels over their values (When, In, Team) are fine: they label data, not headings.
- **Don't** give any board status a filled block except Today and On now. Due soon and Overdue are colored letters with a blinking dot.
- **Don't** tint whole board rows yellow or any other color; tints turn muddy on navy.
- **Don't** use navy for page backgrounds or ordinary cards, or put a shadow on panels that sit on paper.
- **Don't** use Lamp Green or Lamp Red on paper, or Court Green and Clay Red as text on navy.
- **Don't** set sentences, descriptions or form fields in Big Shoulders, and don't letterspace Helvetica in capitals (except the wordmark).
- **Don't** make anything else blink, or replay the flip cascade when someone changes a filter.
- **Don't** add new hex colors in a rule; add a variable to `:root` and use it.
- **Don't** use VE logos or official marks anywhere.
