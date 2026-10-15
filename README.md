# CasaPala

The shared calendar, to-do lists and Circles of Excellence checklist for our Virtual Enterprise firm (Syosset High School, 2026–27). CasaPala is the firm's name.

It is kept deliberately simple. There are four pages: **Home**, **Offices**, **Mine** and **Circles**.

## What it does

- **Log in with the class passcode and your first name.** Everyone uses the same passcode. There is no special owner or officer mode. Anyone who is logged in can add, edit and delete to-dos, calendar items and links, and can check things off.
- **Home** shows, from top to bottom: the Circles score line, then **Overdue** to-dos, then the **next 14 days** (calendar items and to-dos mixed together in date order), then the month calendar.
- **Offices** are the eight officer offices: CEO office, Operations, Finance & Compliance, Marketing, Sales, Technology, HR and All-firm. On a phone they sit in one "Offices" picker. On a wide screen they are tabs. Each office page has an **Add task** button and lists:
  - the office's open to-dos, grouped by how soon they are due
  - a **Done** list you can show or hide
  - the office's calendar items
  - the office's quick links and learning links
- **Checklists.** Any to-do can hold a checklist of up to 30 small steps. Anyone can add a step or tick one, and the tick shows who did it.
- **Unsorted.** Items still on an old team id (or with no office) show under Unsorted, so nothing gets lost. Open an item and pick its office to move it.
- **Mine** shows the open to-dos whose "Who" box includes your first name.
- **Circles** is VE's Circles of Excellence checklist, scored out of 60. Bronze is 36, Silver is 48 and Gold is 54. Anyone can tick an item, and the tick shows who did it and when. Circles items can be edited but not deleted.
- **Every calendar date says how sure it is:** Confirmed, Projected, From our teacher, Our target, or No date yet.
- **"New" pill.** Items that someone else changed since you last opened the site on that device show a small "New" pill. Nothing shows on your very first visit.

## Who did what, and getting things back

- **Every change records the first name typed at login.** The name is typed in, not checked, so it is an honest record and not a security check.
- **Edits keep the old values.** When someone edits an item, the change log saves what the changed boxes used to say. The log lives in the database and keeps the latest 500 changes. There is no page for reading it yet.
- **Deleted things can be put back.** They wait in **Recently deleted** for 30 days, and anyone logged in can put them back from there.
- **There is no suggestion box.** Just add the to-do directly.

## Privacy

This repo holds **code only**. The firm's calendar, to-dos and names live in the database behind the passcode, never in this repo.

## How it works

- `public/` is the website (plain HTML, CSS and JavaScript, no build step). The JavaScript is split by part of the site: `js/core.js` (data, dates, saving), `js/board.js` (the Home page: the Coming up list and month calendar), `js/views.js` (office pages, Unsorted, Mine, Circles, Recently deleted), `js/drawer.js` (the detail and edit panel, including checklists), `js/main.js` (login, tabs, clicks, keyboard).
- `api/` holds the small server functions Vercel runs: `login` (checks the class passcode), `data` (loads everything), `item` (adds, edits or deletes one thing, and handles checklist steps and putting things back). Edits merge onto the newest saved copy, so nobody overwrites a classmate.
- The data is stored in Upstash Redis, a free database that plugs into Vercel.
- `PRODUCT.md` says who this is for and why. `DESIGN.md` is the style guide.

## Setting it up on Vercel (one time)

1. Import this GitHub repo at vercel.com/new. Leave the framework as "Other". No build command is needed.
2. In the project, open **Storage**, add **Upstash for Redis** (free plan) and connect it to the project. This adds the database settings automatically.
3. In **Settings → Environment Variables**, add `CLASS_PASSCODE` with the passcode the class will use (set it only in Vercel, never in a file in this repo). Optionally add `SESSION_SECRET` (any long random text).
4. Redeploy, open the site and enter the passcode.

Changing `CLASS_PASSCODE` logs everyone out, which is how you lock someone out.

## Running it on your own computer

```bash
CLASS_PASSCODE=pick-anything node dev-server.mjs
```

Then open http://localhost:3030. With no database connected, data is saved in `.data/db.json` on your computer.

## Tests

```bash
npm test
```

This runs the tests in `test/` with Node's built-in test runner (`node:test`).
