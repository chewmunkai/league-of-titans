# League of Titans — Command Centre

Live scoreboard and item engine for the BNI Titan chapter game, **CGC Season 2**.

One HTML file. No build step, no install, no database. It reads your Google Sheet,
does all the scoring and item maths, and shows you a line-by-line audit trail for
every team. It never writes to the sheet — the sheet stays the source of truth.

**Open it here:** https://chewmunkai.github.io/league-of-titans/

That plain address is the whole link. The page opens on the chapter's sheet and
loads the live numbers by itself — nothing to paste, nothing to remember.

---

## Getting it online (one time)

1. Create a new **public** repo on GitHub called `league-of-titans` — no README, no
   `.gitignore`, nothing. Just the empty repo.
2. From this folder, run:

```bash
git remote add origin https://github.com/chewmunkai/league-of-titans.git && git push -u origin main
```

3. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save.**
4. Wait about a minute. The board is live at the URL above.

To update it later, edit `index.html`, then:

```bash
git add -A && git commit -m "what changed" && git push
```

---

## Where the season stands

Read from the sheet on 1 September 2026 — four meeting weeks, no items bought yet.

| # | Team | Visitors | Referrals | 1-2-1s | Training | Attendance | September | Carried in | **Season** |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Heng Ong Huat | 300 | 80 | 32 | 0 | 20 | 432 | 1,403 | **1,835** |
| 2 | Big Hero | 200 | 50 | 34 | 0 | 20 | 304 | 1,496 | **1,800** |
| 3 | 6 Braincells | 100 | 150 | 22 | 0 | 30 | 302 | 1,171 | **1,473** |
| 4 | Team Pokemon | 400 | 90 | 38 | 0 | 25 | 553 | 515 | **1,068** |
| 5 | Backstreet Boys | 0 | 125 | 60 | 0 | 30 | 215 | 750 | **965** |

Heng Ong Huat take top spot from Big Hero. Team Pokemon had the best month by a
distance (+553) and climb off the bottom, which Backstreet Boys inherit — so the
free Guardian Angel is theirs.

Member of the month is **Dominic Yeoh Wei Ching** on 241, from 2 visitors,
6 referrals given and 3 one-to-ones.

These numbers were audited a second time straight from the raw cells, sharing no code
with the scoring engine: all five teams and all 27 members reconcile exactly. The 1-2-1
column, which Sheets stores as the date 2 Jan 2001, is corroborated by a second tab that
labels the same column. Nobody is in the sheet but off a team, nobody is on a team but
missing from the sheet, and no name is spelled two ways. Sharon Lee missed two meetings
and Shane Tan one; everyone else has perfect attendance.

Three things worth your judgement, all flagged on the page rather than guessed at:

- **No training is logged for September**, so nobody earned the 20-a-session.
  If the column simply has not been filled in, fill it in and hit Refresh.
- **There is no GameLog tab**, so no item purchases, visitor conversions, theme
  bonuses or level-ups are counted. September is pure meeting activity.
- **The carried-forward figures cannot be re-derived.** Applying today's rules to the
  `past 5 month data` tab gives Big Hero 1,555 / Team Pokemon 2,017 / 6 Braincells 2,100
  / Heng Ong Huat 1,164 / Backstreet Boys 1,272 — nothing like the 1,496 / 515 / 1,171 /
  1,403 / 750 carried in. That is expected if the earlier months used different point
  values, different team line-ups, or had item costs taken off. They are taken on trust
  from the Groups slide. If they ever need defending, the workings for April–August have
  to come from wherever that slide was built.

Once the month closes, the season totals above become the new carry-forward on
the RULES tab.

---

## Connecting your data

Open the page, go to the **DATA** tab. There are two routes in.

### 1. Straight from the spreadsheet (the normal way)

Paste **either** of these into the box and hit Load:

- **An Apps Script link ending in `/exec`** — the best option. It finds every tab by
  itself and works even on a completely private sheet. Setup is in the header comment
  of `LeagueOfTitans.gs`: open your sheet → Extensions → Apps Script → paste that file
  → Deploy → New deployment → Web app → *Execute as: Me*, *Who has access: Anyone*.
- **A plain Google Sheet link** — no Apps Script needed, but the sheet has to be shared
  as **Anyone with the link — Viewer**, and you have to list the tab names yourself
  (the box is pre-filled with the usual ones). A plain sheet link cannot list its own tabs.

The page already opens on the chapter's sheet, so the plain address is all you need to
bookmark. To point it somewhere else, press **Copy One-Click Link** — it gives you the
shortest link that still loads the right thing:

| Link | What it opens |
|---|---|
| `.../league-of-titans/` | the chapter's sheet — the normal case |
| `.../#s=<sheet id>` | a different Google Sheet |
| `.../#e=<deployment id>` | an Apps Script deployment |
| `.../#demo` | sample numbers, nothing real |

The page stores nothing at all, which is why the source lives in the address rather
than in the browser.

**REFRESH POINTS** at the top of the page re-reads the sheet at any time.

### 2. Upload the file yourself (last resort)

For when the sheet is locked down or you are offline.

- In Google Sheets: **File → Download → Microsoft Excel (.xlsx)** and drop that file on
  the page. It unzips and reads every tab in the browser — nothing is uploaded anywhere.
- `.csv` files work too, one tab at a time.
- Or copy cells straight out of Sheets and paste them into the box, telling it which tab
  the paste is.

Uploaded data cannot be refreshed — there is nothing to re-read — so the Refresh button
will tell you to upload the newer export instead.

---

## What the sheet needs

| Tab | What it needs |
|---|---|
| Weekly PALMS tabs | A header row containing `First Name` and `RGI`. One tab per meeting week. The header can sit on any row. |
| `Teams` | Column A member name, column B team name. |
| `Training` | A `Name` column plus one column per month. It reads every month and uses the rightmost one, whether or not it is filled in yet. Change it with the month picker on the DATA tab. |
| `GameLog` | See below. |

`templates/Teams.csv` and `templates/GameLog.csv` are ready to paste into cell A1.

### GameLog columns

```
Month | Team | Type | Item | Target Team | Target Member | Area | Outcome | Points | Notes
```

Column **order does not matter** — the engine reads the headings, not the positions, and
ignores headings it does not recognise. Old five-column logs
(`Month | Team | Type | Detail | Points`) still work exactly as before.

- **Item** — which item was bought. Leave blank for a plain bonus row.
- **Target Team / Target Member** — Bloodthirster only. Who was attacked, and who was drawn.
- **Area** — Trinity Force only. Which area is being doubled.
- **Points** — negative for a cost, positive for a bonus. Leave blank and the shop price
  is used. A negative value here overrides the shop price, so old months stay correct.

---

## The item engine

Every team is scored in the same sequence, every month. The **Audit Trail** on each
team's page shows this same sequence with the running total after each step, so a
disputed score can be traced line by line back to the raw activity.

1. Add up every member's points from the weekly tabs, training and attendance.
2. Apply any player taken by a Bloodthirster — their points move with them.
3. Roll members up into team totals, category by category.
4. Trinity Force doubles the chosen area.
5. Mejai's Soulstealer checks the weekly target and pays out, or does not.
6. Add the manual bonuses from the game log.
7. Guardian Angel adds its percentage to the month so far.
8. Take off what every item cost.
9. Add the points carried in from earlier months.

### Rules that were open questions, and how they are answered here

These were undefined on the shop cards. **Everything in the first list is a setting on the
RULES tab** — change it and every score updates instantly, no redeploy.

| Setting | Default |
|---|---|
| A team may only take a player from a team ranked above them | on |
| One shield blocks every attempt that month | off — it blocks one, then it is spent |
| A blocked attacker still pays for the item | on |
| Guardian Angel's percentage counts the Trinity Force doubling | on |
| Item costs may push a team below zero | on |
| Mejai's: points needed in a week / weeks to hit / payout | 100 / 3 / 100 |
| Guardian Angel bonus | 20% |

Point values and item costs are editable on the same tab.

These are treated as settled and are stated on the RULES tab:

- **A stolen player stays put.** They join the new team for good and every point they
  earn from then on belongs to that team. The **Roster Board** is the record — drag them
  across and the maths follows.
- **Items are paid for in points**, straight off the month. No separate coin purse.
- **Trinity Force doubles activity only** — visitors, referrals, 1-2-1s, training,
  perfect attendance. It cannot double a bonus that came from the game log.
- **Guardian Angel is worked out before item costs.**
- **Shields last one month.** This board scores one month at a time. If the chapter lets
  an unused shield carry over, log it again in the new month.
- **Merging teams is not scored here.** It changes how many teams the chapter has, so
  settle it in the room and log the outcome as a plain points row.

### Nothing is ever silently wrong

Anything the engine cannot resolve raises a warning at the top of the page instead of
producing a quiet number: a steal logged but not actioned on the roster, an attack that
went downwards, two teams drawing the same member, a Trinity Force with no area, a
Guardian Angel taken by a team that is not bottom, a log row it cannot read at all, or a
member who is active in the sheet but on no team.

---

## Running a Bloodthirster

1. **ITEMS → Steal Resolver.** Pick the attacking team and the target team. Press
   **Draw At Random**, or pick the name that was actually drawn at the meeting.
2. Check the preview — it shows the swing on both teams and whether a shield blocked it.
3. **Copy Game Log Row** and paste that line into your GameLog tab. This is what makes
   it survive a refresh.
4. **Apply The Move** (or drag them on the Roster Board), then **Copy For Sheet** and
   paste that into your Teams tab.

Changes made on the page live only in that browser tab. The two Copy buttons are how
they get back into the sheet.

---

## Working on it locally

```bash
node serve.js 8871
```

Then open `http://localhost:8871`. Add `#demo` to the URL to load sample data —
real rosters, invented weekly numbers, all five items in play.

`index.html` is deliberately one file in plain ES5: it gets opened from a static host or
straight off disk, and there is no build step to forget.
