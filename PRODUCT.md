# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

High school students in one Virtual Enterprise (VE) class, about 15 people, running a student firm for the 2026–27 school year, plus their teacher. Roughly half are officers (CEO, COO, CFO, CMO and the rest); everyone sits on a team. They open it on their own phones between classes and on school laptops during class, usually to answer one of three questions: what is due next, what is mine, and what changed since I last looked.

## Product Purpose

One shared place for the firm's year: every VE deadline, competition, trade show and field trip on one calendar; a to-do list for each team; and a running count toward VE's Circles of Excellence recognition (Gold means completing 90% or more of VE's checklist). Success is nobody in the class missing a deadline because they didn't know about it, and the firm finishing the year at Gold.

## Positioning

Built around how this firm is actually split up and how VE actually scores firms. Every date carries how sure we are of it (confirmed by VE for this season, projected from last season, given by the teacher, or our own target), because many VE dates are not published yet. A generic shared calendar can't tell you which dates are guesses or how many Circles points you still owe.

## Operating Context

- Teams (tabs): Racquets · Apparel & Booth · Technology · Finance & Compliance · Sales & Marketing · All-firm. Teams are by the work, not by officer title.
- VE's year runs in six Circles of Excellence periods (Aug–Oct, Nov, Dec, Jan–Feb, Mar–Apr, May) plus fall and spring bonus windows.
- Big moments: the national online competitions, the regional trade show and business plan competition, and the Youth Business Summit in April.
- Anyone with the class passcode can view and edit everything. Changes are logged by the first name each person types in.
- Updates: anyone can post a short announcement (pinned on top), and an automatic feed shows what was just added, changed or checked off.

## Capabilities and Constraints

- Plain HTML, CSS and JavaScript with no build step, so a classmate can edit it. Small Vercel serverless functions; Upstash Redis storage.
- The code repository is public. Firm data (dates, to-dos, names) lives only in the database behind the passcode and never in the code.
- Must work well on a phone.
- Firm name not chosen yet; "Padel HQ" is a working name.

## Brand Commitments

The firm sells padel: a beginner set for four players. The site should go with the firm's existing look from its class deck and 3D booth: warm off-white, court green, navy and padel-ball yellow, with a clean "architect's model" feel.

## Evidence on Hand

Real season data (researched VE dates with sources, team to-dos, the full Circles of Excellence checklist) is loaded through the import button from a private file. No VE logos or official marks may be used.

## Product Principles

1. Say how sure a date is. Never show a guess as a fact.
2. Answer "what's next, what's mine, what changed" within seconds of opening.
3. Shared and honest: every change shows who made it.
4. Simple enough for a classmate to change the code.
