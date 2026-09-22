# Titans CGC Game

Live arcade scoreboard for the BNI Titan chapter. **Two squads, seven ways to
score, one number each.**

One HTML file. No build step, no install, no database. It reads your Google
Sheet, does the scoring, and shows a line-by-line audit trail for every squad.
It never writes to the sheet — the sheet stays the source of truth.

**Open it here:** https://chewmunkai.github.io/league-of-titans/titans-cgc-game/

That plain address is the whole link. The page opens on the chapter's sheet and
loads the live numbers by itself — nothing to paste, nothing to remember.

It also carries a saved copy of the last audited month inside the file. If it
cannot reach the sheet — a host that blocks outside requests, a sheet that
stopped being shared, Google having a bad day — it shows those saved numbers and
says so in plain words rather than showing a blank page.

> This replaces **League of Titans** (CGC Season 2), which is finished. That
> board and its scores are untouched and stay where they are. This is a new
> game on a new board: two squads instead of five, no item shop, and both
> squads starting on zero.

---

## How points are scored

Straight off the chapter slide, in the slide's own order:

| Activity | Points |
|---|---|
| **Visitor brought to meeting** | **100 pts** |
| Attend Training | 10 pts |
| Referral given | 50 pts |
| Perfect monthly attendance | 50 pts |
| TYFCB *(pending)* | 25 pts |
| Normal 1-2-1 completed | 25 pts |
| Group 1-2-1 completed | 25 pts |

The first six are counted straight out of the PALMS tabs — nobody has to
remember to claim anything. The seventh comes off the fortnightly draw, below.
Change any value on the **SCORING** tab and the whole board recalculates
instantly — nothing needs redeploying.

### The two squads

**Team 1 is the men's squad. Team 2 is the women's squad, with any surplus men
added to it at random.** Who is on which is decided in the room and recorded in
the **Teams** tab. The board never guesses — nothing in this page reads a name
and decides what someone is.

### What is scored, exactly

- **Referral given** is `RGI + RGO` — given inside the chapter and given
  outside it both count. Referrals *received* are not scored.
- **Perfect attendance** is a monthly prize, not a weekly one: miss nothing all
  month and the squad gets the 50 once. By default only an **A** on the PALMS
  sheet costs it; a substitute still counts as present. There is a toggle on the
  SCORING tab if the chapter decides that arriving late should break it too.
- **Training** counts sessions, not people. Three sessions by one player scores
  the same as one session by three.
- **TYFCB** is marked *pending* on the slide and is scored here at 25. If the
  chapter has not switched it on yet, set it to 0 and the column is read but
  ignored.

#### The one trap, and how it is handled

Most PALMS exports put the **value** of closed business in the TYFCB column, not
a count of slips — and 25 points per ringgit would be absurd. Left on its
default, the board checks the whole month: any TYFCB column topping **20** is
treated as money, and each week a player has business in it scores **one**
TYFCB. When that happens the page says so out loud at the top, rather than
quietly producing a number nobody can explain. There is a dropdown on the
SCORING tab to override it either way.

---

## The fortnightly group 1-2-1

Every two weeks, four players are thrown together — **two from each squad** —
and they have that fortnight to do their group 1-2-1 and post it in the
chapter's social media group.

- **Done it?** Every player in the group scores **25 points**.
- **Missed it?** The group owes **RM 5** to the fines jar.

Open the **GROUP 1-2-1** tab and hit **SHUFFLE THE GROUPS**. Names spin through
every slot and the groups lock in one after another. The draw is a proper
Fisher–Yates shuffle, and the answer is settled before the spinning starts — the
animation is showmanship, not the draw.

Nobody sits out. Two from each squad go into every group; whoever is left over
is dealt round one at a time, so some groups end up with five rather than
anybody missing the points through no fault of their own.

The draw lives only in the browser tab until you hit **COPY FOR SHEET** and
paste it into a **Groups** tab. That is the record, and it is what scores.

### Tracking it

```
Round | Group | Member | Done | Notes
```

One row per player per round. **Done** carries the whole group's outcome, so it
reads the same on all four rows, and it has **three** states, not two:

| Value | What happens |
|---|---|
| `yes` / `done` / `posted` | Every player in the group scores 25. |
| `no` / `missed` / `failed` | The group goes in the fines jar. |
| *(blank)* | The fortnight is still running. Nothing happens either way. |

Leaving it blank is the honest answer until the two weeks are up. The board will
never invent a fine out of an empty cell, and if the rows of one group disagree
with each other it says so rather than picking one.

### Fines are money, not points

The jar is tallied on its own and never touches the scoreboard. A squad cannot
buy its way up the table, and cannot be knocked down it by owing the jar. The
per-squad figures under the jar are just the group's fine split by head, so you
can see where the money is coming from.

> **Worth confirming:** the slide says *"penalize with RM5"* against the group,
> so the default is **RM 5 once per group**. If the room meant RM 5 from every
> player in it, flip the dropdown on the GROUP 1-2-1 tab — the amount and the
> per-group / per-player choice are both settings.

### There are no items

No shop, no steals, no shields, no gambles. A squad's score is its players'
activity, their group 1-2-1s, and anything the room agreed and wrote down. That
is the whole game.

---

## Order of operations

Every squad is scored in exactly this sequence, every month, and the **Audit
Trail** on each squad's page shows the same sequence with the running total
after each step — so a disputed score traces line by line back to raw activity.

1. Score every player from the weekly PALMS tabs and the training tab.
2. Award the group 1-2-1 points to every player whose fortnightly foursome got
   it done and posted.
3. Roll each player up into their squad, activity by activity.
4. Add any adjustment the room agreed and logged for that squad.
5. Add the points carried in from earlier months to get the season total.

Both squads start this game on **zero**. The carry-in boxes on the SCORING tab
are there for when a month closes and you roll the totals forward.

---

## Where the season stands

Read from the sheet on 1 September 2026 — four meeting weeks, the 27 members
split 14 / 13 into two placeholder squads.

| # | Squad | Visitors | Referrals | 1-2-1s | TYFCB | Training | Attendance | **Season** |
|---|---|---|---|---|---|---|---|---|
| 1 | Team 1 | 600 | 2,800 | 1,100 | 0 | 0 | 700 | **5,200** |
| 2 | Team 2 | 400 | 2,150 | 1,225 | 0 | 0 | 550 | **4,325** |

No group 1-2-1 has been drawn yet, so that column is nil for both.

875 points in it, which is nine visitors. Player of the month is
**Alex Ang** on 950, from 17 referrals given, 2 one-to-ones and perfect
attendance.

These figures reconcile exactly against the audited League of Titans numbers for
the same month — the same 10 visitors, 99 referrals, 93 one-to-ones and 25
players on perfect attendance, re-priced at the new values.

Two things worth your judgement, both flagged on the page rather than guessed at:

- **No training is logged for September**, so nobody earned the 10-a-session.
  If the column simply has not been filled in, fill it in and hit Refresh.
- **The squad names and the split are placeholders.** The saved month predates
  the men's / women's split, so it folds the old five squads 14 / 13 just to
  have something to show. Put the real line-up in the **Teams** tab and it takes
  over completely — names, colours, everything.

---

## Connecting your data

Open the page, go to the **DATA** tab. There are two routes in.

### 1. Straight from the spreadsheet (the normal way)

Paste **either** of these into the box and hit Load:

- **An Apps Script link ending in `/exec`** — the best option. It finds every
  tab by itself and works even on a completely private sheet. Setup is in the
  header comment of `TitansCGC.gs`: open your sheet → Extensions → Apps Script →
  paste that file → Deploy → New deployment → Web app → *Execute as: Me*,
  *Who has access: Anyone*.
- **A plain Google Sheet link** — no Apps Script needed, but the sheet has to be
  shared as **Anyone with the link — Viewer**, and you have to list the tab
  names yourself (the box is pre-filled with the usual ones). A plain sheet link
  cannot list its own tabs.

The page already opens on the chapter's sheet, so the plain address is all you
need to bookmark. To point it somewhere else, press **Copy One-Click Link**:

| Link | What it opens |
|---|---|
| `.../league-of-titans/titans-cgc-game/` | the chapter's sheet — the normal case |
| `.../#s=<sheet id>` | a different Google Sheet |
| `.../#e=<deployment id>` | an Apps Script deployment |
| `.../#saved` | the month saved inside the file |
| `.../#demo` | sample numbers, nothing real |

The page stores nothing at all, which is why the source lives in the address
rather than in the browser.

**REFRESH POINTS** at the top of the page re-reads the sheet at any time.

### 2. Upload the file yourself (last resort)

For when the sheet is locked down or you are offline.

- In Google Sheets: **File → Download → Microsoft Excel (.xlsx)** and drop that
  file on the page. It unzips and reads every tab in the browser — nothing is
  uploaded anywhere.
- `.csv` files work too, one tab at a time.
- Or copy cells straight out of Sheets and paste them into the box, telling it
  which tab the paste is.

Uploaded data cannot be refreshed — there is nothing to re-read — so the Refresh
button will tell you to upload the newer export instead.

---

## What the sheet needs

| Tab | What it needs |
|---|---|
| Weekly PALMS tabs | A header row containing `First Name` and `RGI`. One tab per meeting week. The header can sit on any row. Visitors, referrals, 1-2-1s, TYFCB and attendance all come from here. |
| `Teams` | Column A member name, column B squad name. Two squads: the men's and the women's, with any surplus men in the women's squad. |
| `Groups` | The fortnightly draw and whether each group delivered. Make the draw on the GROUP 1-2-1 tab and paste it in. |
| `Training` | A `Name` column plus one column per month. It reads every month and uses the rightmost one, whether or not it is filled in yet. Change it with the month picker on the DATA tab. |
| `Adjustments` | Optional. See below. |

`templates/Teams.csv`, `templates/Groups.csv` and `templates/Adjustments.csv`
are ready to paste into cell A1.

### Adjustments

The escape hatch, and the only one. PALMS cannot record a decision made in the
room — a correction, a one-off chapter bonus, a penalty agreed at a meeting — so
those go here, in plain points, with a reason attached.

```
Month | Team | Reason | Points
```

Column **order does not matter** — the engine reads the headings, not the
positions, and ignores headings it does not recognise. An old `GameLog` tab
still reads correctly, so nothing has to be renamed to upgrade.

A row with no points is skipped and flagged. A row with no reason still counts,
but the page will say so: a points change nobody can explain is a row waiting to
happen.

---

## Nothing is ever silently wrong

Anything the engine cannot resolve raises a warning at the top of the page
instead of producing a quiet number: a player active in the sheet but on no
squad, an adjustment for a squad that does not exist, an adjustment with no
points on it, a training column nobody has filled in, a TYFCB column that holds
money rather than counts, a group whose rows disagree about whether it was done,
a name in the Groups tab that is in no PALMS tab, or a sheet that names more
than two squads.

That last one still scores correctly — the scoreboard just falls back from the
head-to-head to a plain ranked list, and says why.

---

## Working on it locally

```bash
node serve.js 8871
```

Then open `http://localhost:8871`. Add `#demo` to the URL for sample data, or
`#saved` for the month baked into the file.

`index.html` is deliberately one file in plain ES5: it gets opened from a static
host or straight off disk, and there is no build step to forget.

`build-hosted.js` strips the wrapper tags to produce `hosted.html` for hosts
that supply their own `<html>` shell. It is generated, and gitignored.

---

## Where this is published

It currently lives in a `titans-cgc-game/` folder inside the **league-of-titans**
repo, and GitHub Pages serves it from there. That repo's own board — the finished
League of Titans season — is still at the root of the same site, untouched:

| | |
|---|---|
| Titans CGC Game | `chewmunkai.github.io/league-of-titans/titans-cgc-game/` |
| League of Titans (finished) | `chewmunkai.github.io/league-of-titans/` |

To update it, edit `index.html` in that folder, then:

```bash
git add -A && git commit -m "what changed" && git push
```

### Moving it to its own repo

Only worth doing for the shorter URL. Create a **public** repo called
`titans-cgc-game` — empty, no README, no `.gitignore` — then from a clone of
**league-of-titans**:

```bash
git subtree split --prefix=titans-cgc-game -b titans
git push https://github.com/chewmunkai/titans-cgc-game.git titans:main
```

Then **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` →
Save**, and about a minute later it is live at
`chewmunkai.github.io/titans-cgc-game/`. Delete the folder from
**league-of-titans** once you have checked the new address works.
