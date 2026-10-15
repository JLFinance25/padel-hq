# Padel HQ

The shared calendar and department to-do lists for our Virtual Enterprise firm (Syosset High School, 2026–27). "Padel HQ" is a working name until the firm name is picked.

Kept deliberately simple: one list of what's coming up, a month calendar, and a to-do list per team.

- **Board (home):** a station-style "Departures" board. Every open to-do and every upcoming deadline or event is one row, sorted by date. Check a to-do off right on the board; tap any row for its details (including how sure a deadline's date is).
- **Month:** a normal month calendar; tap a day to see its items.
- **Team tabs:** Racquets · Apparel & Booth · Technology · Finance & Compliance · Sales & Marketing · All-firm. Each is a to-do list with a description, an owner and a due date.
- **Add to-do:** add a to-do for any team from one form, with every team's open to-dos listed underneath.

**Who can do what**

- **Everyone** logs in with the class passcode and their first name. Anyone logged in can add, edit and delete to-dos, calendar items and links, and check things off.
- **Every change shows who made it.** The site remembers the first name typed at login.
- **Deleted things can be put back.** They wait in **Recently deleted** for 30 days, and anyone logged in can put them back from there.

## Privacy

This repo holds **code only**. The firm's calendar, to-dos and names live in the database behind the passcode, never in this repo.

## How it works

- `public/` is the website (plain HTML, CSS and JavaScript, no build step). The JavaScript is split by part of the site: `js/core.js` (data, dates, saving), `js/board.js` (the home board), `js/views.js` (Month, team tabs, the Add page), `js/drawer.js` (the detail panel), `js/main.js` (login, tabs, clicks, keyboard).
- `api/` holds the small server functions Vercel runs: `login` (checks the class passcode), `data` (loads everything), `item` (saves, edits or deletes one thing; edits merge onto the newest copy so nobody overwrites a classmate).
- The data is stored in Upstash Redis, a free database that plugs into Vercel.
- `PRODUCT.md` says who this is for and why; `DESIGN.md` is the style guide (colors, type, the board) so changes stay consistent.
- The board lettering is Big Shoulders (SIL Open Font License), hosted in `public/fonts/`.

## Setting it up on Vercel (one time)

1. Import this GitHub repo at vercel.com/new. Leave the framework as "Other". No build command is needed.
2. In the project, open **Storage**, add **Upstash for Redis** (free plan) and connect it to the project. This adds the database settings automatically.
3. In **Settings → Environment Variables**, add `CLASS_PASSCODE` with the passcode the class will use (set it only in Vercel, never in a file in this repo). If an old `OWNER_PASSCODE` is still there, delete it. Nothing uses it any more. Optionally add `SESSION_SECRET` (any long random text).
4. Redeploy, open the site and enter the passcode.

Changing `CLASS_PASSCODE` logs everyone out, which is how you lock someone out.

## Running it on your own computer

```bash
CLASS_PASSCODE=pick-anything node dev-server.mjs
```

Then open http://localhost:3030. With no database connected, data is saved in `.data/db.json` on your computer.
