# Padel HQ

The shared calendar and department to-do lists for our Virtual Enterprise firm (Syosset High School, 2026–27). "Padel HQ" is a working name until the firm name is picked.

- **Calendar:** deadlines, competitions, trade shows and field trips from now to June. Every date is tagged: *Confirmed* (on VE's own site for 2026–27), *Projected* (guessed from last season, confirm with Ms. Garrison), *From Ms. Garrison*, or *Our target*.
- **Department tabs:** Racquets · Apparel & Booth · Technology · Finance & Compliance · Sales & Marketing · All-firm. Each is a to-do list with a description, an owner and a due date.
- **Circles of Excellence:** VE's 2026–27 point checklist (60 points plus up to 4 bonus), with a bar showing how close we are to Gold (90%).
- **Activity:** every change, who made it and when.

Everyone who has the class passcode sees and edits the same data.

## Privacy

This repo holds **code only**. The firm's calendar, to-dos and names live in the database behind the passcode, never in this repo. The starter data file (`seed/seed.json`) is kept out of Git on purpose.

## How it works

- `public/` is the website (plain HTML, CSS and JavaScript, no build step).
- `api/` holds the small server functions Vercel runs: `login` (checks the class passcode), `data` (loads everything), `item` (saves or deletes one thing), `import` (loads the starter data, never overwriting).
- The data is stored in Upstash Redis, a free database that plugs into Vercel.

## Setting it up on Vercel (one time)

1. Import this GitHub repo at vercel.com/new. Leave the framework as "Other". No build command is needed.
2. In the project, open **Storage**, add **Upstash for Redis** (free plan) and connect it to the project. This adds the database settings automatically.
3. In **Settings → Environment Variables**, add `CLASS_PASSCODE` with the passcode the class will use. Optionally add `SESSION_SECRET` (any long random text).
4. Redeploy. Open the site, enter the passcode, go to **Activity** and load `seed.json`.

Changing `CLASS_PASSCODE` logs everyone out, which is how you lock someone out.

## Running it on your own computer

```bash
CLASS_PASSCODE=pick-anything node dev-server.mjs
```

Then open http://localhost:3030. With no database connected, data is saved in `.data/db.json` on your computer.
