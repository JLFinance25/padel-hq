# Padel HQ

The shared calendar and department to-do lists for our Virtual Enterprise firm (Syosset High School, 2026–27). "Padel HQ" is a working name until the firm name is picked.

- **Board (home):** a station-style "Departures" board. Every deadline and to-do is a row ranked by date, with how sure the date is: *Confirmed* (on VE's own site for 2026–27), *Projected* (guessed from last season, confirm with our teacher), *From our teacher*, or *Our target*. Anything a classmate changed lights up yellow until you open it.
- **Updates:** post a short note for the class, plus an automatic "just added" feed of who changed what.
- **Season line:** the whole year on one transit-style map, with the Circles of Excellence periods.
- **Month:** a normal month calendar; tap a day to see its items.
- **Team tabs:** Racquets · Apparel & Booth · Technology · Finance & Compliance · Sales & Marketing · All-firm. Each is a to-do list with a description, an owner and a due date.
- **Circles of Excellence:** VE's 2026–27 point checklist (60 points plus up to 4 bonus), with a bar showing how close we are to Gold (90%).
- **Log:** every change, who made it and when.

Everyone who has the class passcode sees and edits the same data.

## Privacy

This repo holds **code only**. The firm's calendar, to-dos and names live in the database behind the passcode, never in this repo. The starter data file (`seed/seed.json`) is kept out of Git on purpose.

## How it works

- `public/` is the website (plain HTML, CSS and JavaScript, no build step). The JavaScript is split by part of the site: `js/core.js` (data, dates, saving), `js/board.js` (home board, Updates, season line), `js/views.js` (Month, team tabs, Circles, Log), `js/drawer.js` (the detail panel), `js/main.js` (login, tabs, clicks, keyboard).
- `api/` holds the small server functions Vercel runs: `login` (checks the class passcode), `data` (loads everything), `item` (saves, edits or deletes one thing; edits merge onto the newest copy so nobody overwrites a classmate), `import` (loads the starter data, never overwriting).
- The data is stored in Upstash Redis, a free database that plugs into Vercel.
- `PRODUCT.md` says who this is for and why; `DESIGN.md` is the style guide (colors, type, the board) so changes stay consistent.
- The board lettering is Big Shoulders (SIL Open Font License), hosted in `public/fonts/`.

## Setting it up on Vercel (one time)

1. Import this GitHub repo at vercel.com/new. Leave the framework as "Other". No build command is needed.
2. In the project, open **Storage**, add **Upstash for Redis** (free plan) and connect it to the project. This adds the database settings automatically.
3. In **Settings → Environment Variables**, add `CLASS_PASSCODE` with the passcode the class will use. Optionally add `SESSION_SECRET` (any long random text).
4. Redeploy. Open the site, enter the passcode, go to the **Log** tab, open **Setup: load starter data** and choose `seed.json`.

Changing `CLASS_PASSCODE` logs everyone out, which is how you lock someone out.

## Running it on your own computer

```bash
CLASS_PASSCODE=pick-anything node dev-server.mjs
```

Then open http://localhost:3030. With no database connected, data is saved in `.data/db.json` on your computer.
