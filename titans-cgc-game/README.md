# Titans CGC Game

Live arcade scoreboard for the BNI Titan chapter. **Two squads, seven ways to
score, one number each.**

One HTML file. No build step, no install, no separate database: **your Google
Sheet is the database.** The page reads it, does the scoring, shows a
line-by-line audit trail for every squad — and saves every change made on it
back into the sheet, so everyone who opens the board sees the same thing.

> ⚠️ **Saving needs a one-time setup** — see [Switching saving on](#switching-saving-on).
> Until it is done the board reads fine but every change is lost on reload.

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
remember to claim anything. The seventh comes off the monthly draw, below.
Anything the sheet cannot see goes in by hand on the **MANUAL SCORES** tab —
see [Manual scores](#manual-scores).

### Adding your own scoring lines

The seven above are only the starting list. On the **SCORING** tab you can
change any of them, remove any of them, and add your own. A line is not just a
number: it also says **where its number comes from**, so a line you invent
counts itself off your spreadsheet every month instead of being typed in by hand.

| Source | What it counts |
|---|---|
| Add up a weekly column | Any column on the PALMS tabs — `V`, `RGI`, `RRI`, `CEU`, or a heading this board has never heard of |
| Weeks a column has anything in | One per week the player has anything in that column, whatever the figure |
| TYFCB (money check applied) | TYFCB, with the money trap below handled |
| Training tab sessions | The Training tab |
| Perfect attendance | Once a month, for a clean sheet |
| Group 1-2-1s completed | The monthly draw |

The column picker lists every column found in your loaded sheet, so if you add
a `CEU` or `Testimonials` column to your PALMS tabs it is there to point at —
no code change, no redeploy.

Changes save to a **Scoring** tab in the sheet. Once that tab exists it
defines the whole scoring list for everyone, and the defaults in this file step
aside. A source it does not
recognise is skipped and flagged rather than silently scoring zero.

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

## Manual scores

For points the sheet cannot see: a visitor missed off PALMS, a bonus the room
gave one person, a correction. Open the **MANUAL SCORES** tab and add a line:

```
Name | Item | Score
```

- **Name** — who. The box offers the roster as you type, and a unique part of
  a name is enough (`alex` → Alex Ang). A name that is not on the roster, or
  that could be two people, is refused rather than scoring for nobody.
- **Item** — what it was for. Free text; the box suggests the scoring lines,
  and picking one fills in its points for you.
- **Score** — the points. A minus number takes points away.

To add a batch, paste lines into **Paste several at once** — `Name | Item |
Score`, one per line, with a pipe, a tab or a comma between them, so rows copied
straight out of a spreadsheet go in as they are. Lines that cannot go in stay in
the box with the reason.

A manual score counts for that **player** — so it shows on the Players table,
in Player of the Month, and in the squad's total and audit trail, line by line.
That is the difference from an **Adjustment**, which is for a whole squad.

They save to a **Manual Scores** tab: `Name | Item | Score | Added | ID`. The
board fills in **Added** (the date) and **ID** (a tag that lets two people add
and remove lines at the same time). A row typed straight into the sheet can
leave both blank.

---

## Periods

The game runs in **periods** — **Period 1**, **Period 2**, and so on (rename
any of them with the ✎). Each is a calendar month unless you set other dates
(see [Changing a period's dates](#changing-a-periods-dates)). The
current period is scored live from the weekly PALMS tabs. Every earlier one is
**saved** in a **Monthly Scores** tab in the sheet, so it stays on the board for
good.

### What you see

- **The scoreboard shows this period** — every new month starts on zero.
- **SHOWING bar** at the top of the Scoreboard, Squads, Players and Broadcast
  tabs: pick **From** and **To** to add up any run of periods (say Period 1 →
  Period 3), or tap **THIS PERIOD** / **ALL PERIODS**. ALL PERIODS also adds
  any points carried in from before. What you pick is remembered on that device
  only — it changes what *you* see, not the board for everyone.
- **PERIODS tab:**
  - **This Period** — its name and dates, points so far, weekly tabs counted,
    days to go, each squad's bar, and the big button.
  - **Saved Periods** — a card for each: squad scores, who won, top player.
    **VIEW** opens the scoreboard on that period. **REOPEN** (most recent only)
    undoes a save.
  - **Compare Periods** — every period side by side, a chart, and the players
    over whatever is showing.
  - **Fix the current period** — tucked away, only for putting the board back
    on the right month by hand, or deleting a saved period.

### Changing a period's dates

Press **📅 CHANGE DATES** under the current period (or 📅 on a saved period's
card), pick **Starts** and **Ends**, then **SAVE DATES**. Any length works: 1 Sep
– 4 Oct, four weeks, a whole quarter.

- Periods sit end to end, so moving one end moves its neighbour: Period 1
  ending 4 Oct means Period 2 starts 5 Oct. The date boxes won't let a
  neighbour shrink to nothing.
- **The next period copies the current one's length.** Whole months stay
  whole months (Oct → Nov); four weeks stays four weeks (21 Oct – 17 Nov →
  18 Nov – 15 Dec). Change it once it starts if it needs to be different.
- Moving a saved period changes only its dates. Its saved points stay
  exactly as they are, and manual scores, adjustments and rounds stay in the
  period they were logged in.
- **Training** is a column per month, so each month's column counts in the
  period that holds the middle of that month (the 15th).

### End of the period — one button

On the **PERIODS** tab press **🏁 SAVE PERIOD 1 & START PERIOD 2**. That's it:

1. Period 1's points are saved for good in the **Monthly Scores** tab.
2. The board starts Period 2 (the day after Period 1 ends) on **zero**.
3. **No need to clear the weekly tabs.** The board remembers what each weekly
   tab held, and leaves a tab out until new numbers are pasted into it. The
   PERIODS tab lists the tabs still waiting.

It saves straight to the sheet, so every copy of the board moves on together.
Pressed it by mistake? **REOPEN** on Period 1's card puts it back — as long as
no new weekly numbers have gone in yet. The same goes for a late fix to last
month's weekly numbers: changing a tab makes it count in the new period, so
reopen first, fix, then save again.

Anything left hanging is tidied for you: manual scores, adjustments and rounds
with no month of their own are stamped with the period they counted in, and a
group 1-2-1 group still marked running moves on to the new period, so its points
land when it is marked. If the calendar moves on and nobody has pressed the
button, the board says so at the top of the page.

A saved period keeps the points it was given when it was saved, even if a point
value is changed later.

### Period records — the proof, for any discrepancy

Every time a period is saved, the board first keeps a **record** of it in the
sheet. **The period is not saved until the record is.** A record is a new hidden
tab called `Record <start day> #1` (for example `Record 2026-09-01 #1`), written
once and never changed. It holds:

- the period's name, dates, when it was saved and which weekly tabs it counted
- squad totals, player totals and every score line exactly as saved to Monthly
  Scores, plus each squad's audit trail
- the manual scores, adjustments, group 1-2-1 groups, roster, scoring lines and
  settings it was scored with
- **an exact copy of every weekly PALMS tab it counted, and of the Training
  tab**, as they stood at that moment, so the numbers survive the weekly tabs
  being overwritten next month.

**To look back:** press **📋 RECORD** on a saved period's card. The board
opens the record and **checks it against the scores saved now**, squad by squad
and player by player: `✓ Matches` or `⚠ Differs`, naming who and by how much.
**⬇ DOWNLOAD CSV** saves the whole record as a file. In the sheet the records
are under **View → Hidden sheets**.

Saving a period again (after **REOPEN**) adds a new record (`#2`, `#3`, …).
Older ones are kept, and the record viewer links them.

**Period log.** Everything done to a period gets a line in the **Period Log**
tab: saved (with squad totals and the record's name), reopened, renamed, dates
changed, saved scores deleted. It's under **Records & period log** at the bottom
of the PERIODS tab.

### Which period things count in

- **Weekly tabs** count in the current period. A tab with a month in its name
  (`Oct W1`, `Master list 1st week Oct 2026`) counts in the period holding that
  month instead.
- **Training** — each month's column counts in the period holding its 15th.
- **Group 1-2-1 rounds** run one per period and are named for its dates
  ("1–31 Oct 2026", "5 Oct – 1 Nov 2026"). The **Saved Rounds** table has a
  *Counts in* picker to change it, including *next period*.
- **Manual scores and adjustments** have a *Counts in* picker when you add them,
  set to the current period.

A saved period is frozen: it is greyed out in the *Counts in* pickers. Late
points for a finished period go into the current one instead.

---

## The monthly group 1-2-1

Every month the chapter is split into small groups, mixed across both
squads, each led by the same **mentor** every round. They have that month
to do their group 1-2-1 and post it in the chapter's social media group.

- **Done it?** Every player in the group scores **25 points**.
- **Missed it?** The group owes **RM 5** to the fines jar.

Open the **GROUP 1-2-1** tab and hit **SHUFFLE THE GROUPS**. Names spin through
every slot and the groups lock in one after another. The draw is a proper
Fisher–Yates shuffle, and the answer is settled before the spinning starts — the
animation is showmanship, not the draw.

### Mentors

Five or six people lead a group each and **never move**. The first mentor
always leads Group 1, the second Group 2, and so on — only the members around
them are reshuffled. Add, remove and reorder them in the **Mentors** panel on
the GROUP 1-2-1 tab; they are saved to a **Mentors** tab.

### Group size

**Players per group** is a setting: up to 3, 4, 5 or 6, default 4, counting the
mentor. The draw makes enough groups that nobody is over it, and never fewer
groups than there are mentors. Everyone is dealt; nobody sits out.

The line above the draw tells you what the next shuffle will produce, and the
fix when it does not add up. With the September roster:

| Setting | Result |
|---|---|
| 27 players, 6 mentors, up to **4** | 7 groups — **one without a mentor**. The page says "set 5 per group". |
| 27 players, 6 mentors, up to **5** | 6 groups of 4–5, **one mentor each**. |

Squads take turns at the deck and each player goes to the smallest group, then
to the one with fewest from their squad — so groups stay mixed and within one
of each other in size.

### Rebalancing by hand

After a shuffle, **drag a player onto another group** — or on a phone, **tap
them, then tap the group**. Drop onto **+ New Group** to split someone off.
Mentors cannot be moved. A group over the size, or with only one squad in it,
is flagged in red on its card.

### Saving a round

**SAVE THIS ROUND** writes it to the **Groups** tab of the sheet, under its
round name (filled in for you as the month, e.g. "1–31 Oct 2026"). It is then the same round
for everyone, and it is what scores. **Saved Rounds** lists every round; **Open**
brings one back into the editor to change and save again, which replaces it.
Replacing a round keeps each group's Done/Missed where the group number still
exists. Each round counts in its month — see
[Which period things count in](#which-period-things-count-in).

### Marking each group

When the month is up, hit **✓ Done** or **Missed** on each group's card.
That is saved straight to the sheet: Done pays every player in the group, Missed
puts the group in the fines jar, **Running** puts it back to undecided.

In the sheet it looks like this:

```
Round | Group | Member | Role | Done | Notes
```

One row per player per round; `Role` is `Mentor` for the mentor. **Done** has
**three** states, not two:

| Value | What happens |
|---|---|
| `yes` / `done` / `posted` | Every player in the group scores 25. |
| `no` / `missed` / `failed` | The group goes in the fines jar. |
| *(blank)* | The month is still running. Nothing happens either way. |

The board will never invent a fine out of an empty cell, and if the rows of one
group disagree with each other it says so rather than picking one.

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

Every squad is scored in exactly this sequence, one month at a time, and the **Audit
Trail** on each squad's page shows the same sequence with the running total
after each step — so a disputed score traces line by line back to raw activity.

1. Score every player from the weekly PALMS tabs and the training tab.
2. Award the group 1-2-1 points to every player whose monthly group got
   it done and posted.
3. Add any manual scores typed in for a player (Name | Item | Score).
4. Roll each player up into their squad, activity by activity.
5. Add any adjustment the room agreed and logged for that squad.
6. Add the points carried in from before the board kept monthly records.

When several periods are showing, each one is scored like this on its own and
they are then added up. Both squads start this game on **zero**, and with
periods now saved there is no need to roll totals into the carry-in boxes on
the SCORING tab — they are only for points from before the records began.

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

## Switching saving on

The page is a static file on GitHub Pages; it cannot store anything by itself.
It saves by writing into **your own Google Sheet** through a small Apps Script
that you deploy from your own Google account. Nothing else is involved — no new
service, no new account, nothing that costs money. About five minutes, once:

1. Open the chapter sheet → **Extensions → Apps Script**. Delete what is there
   and paste in **`TitansCGC.gs`** from this folder. Save.
2. In its `CONFIG` block set **`EDIT_PIN`** to something only the committee
   knows. Saving stays refused until you do.
3. **Deploy → New deployment → Web app.** Execute as **Me**, who has access
   **Anyone**. Approve the permission prompt (it is asking to edit *this*
   sheet, as you).
4. Copy the **`/exec`** link. Paste it on the DATA tab and hit Load — or send
   it to whoever maintains this page to be baked in as the default, so the plain
   address saves for everyone with no special link.

Then on each device that should be able to change things, tap the badge at the
top and enter the PIN once.

### Updating the script

When `TitansCGC.gs` changes in this repo, paste the new one over the old one
in the sheet's Apps Script (keep your `EDIT_PIN`), then **Deploy → Manage
deployments → pencil → Version: New version → Deploy**. Edit the *existing*
deployment — a brand-new deployment gets a new `/exec` link and the board would
still be talking to the old one.

Until the script is updated the board still works and still saves, but it says
so at the top of the page and holds back whatever the old script cannot store:
**Save Period** needs the current script (it reports itself as version 4)
because it keeps a period record, and manual scores need version 2 or later.

### How saving works

- **Change anything, then press Save.** Moves, shuffles, mentors, scoring,
  Done/Missed — they wait on screen for as long as you like. A bar pinned to
  the bottom of every tab lists what is unsaved, with **💾 Save Changes** and
  **Discard**. One Save covers every tab.
- **The PIN is asked for when you press Save**, not before. Tick *Remember on
  this device* and it is never asked again there; untick it on a shared or
  projector laptop.
- **Nothing reverts on its own.** When the board opens it shows the saved
  numbers instantly, then loads the live sheet. While that is loading (a cold
  Google script can take several seconds) the editing tabs are locked with a
  "Connecting to the live sheet…" note, so nothing you do can be overwritten
  when the live data arrives.
- **The badge at the top is the truth.** `✓ Saved`, `● 2 unsaved — tap to save`,
  `Saving…`, `⚠ Not saved — tap to retry`, or `View only`.
- **Everyone can look; only PIN-holders can change.**
- **Several people can edit and save at once.** A save does not send the whole
  tab — only the rows *you* changed or removed. The script takes a lock, reads
  the tab as it is at that moment, lays your rows onto it and writes it back.
  So one person marking Group 2 done and another marking Group 3 missed both
  keep their change, and so do two people adding manual scores, moving
  different players or editing different scoring lines. Only when two people
  change the **very same row** does the later save win — for that one row.
- **Open boards keep themselves up to date.** While the page is on screen it
  checks about once a minute (and whenever you come back to the tab) whether
  anybody has saved. If you have nothing unsaved, it quietly reloads the sheet
  and says so. If you *do* have unsaved changes it leaves them alone and just
  tells you — your Save is added to theirs, not written over it.
- **A save that is sent twice is harmless.** If the answer from Google is lost
  and the page retries, the rows are already there and nothing doubles up.
- **What gets saved:** roster (Teams), rounds and Done/Missed (Groups),
  mentors (Mentors), scoring lines (Scoring), group size / fine / carry-in, the
  attendance and TYFCB options and the month the weekly tabs hold (Settings),
  adjustments (Adjustments), manual scores (Manual Scores), saved periods
  (Monthly Scores), the Period Log, and a new hidden `Record …` tab each time a
  period is saved. PALMS and Training are only ever read (and copied into records),
  never written to.
- **Leaving or refreshing with unsaved changes** asks first.
- A name typed as a formula (`=…`) is stored as text, never run.

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
| `Groups` | The monthly draw and whether each group delivered, plus the `Month` each round counts in. Make the draw on the GROUP 1-2-1 tab. |
| `Scoring` | Optional. Your own scoring lines. If it exists it defines the whole list. |
| `Training` | A `Name` column plus one column per month. Each month's points read that month's column. |
| `Adjustments` | Optional. See below. |
| `Manual Scores` | Optional. `Name \| Item \| Score` (plus `Added`, `ID` and `Month`, filled in by the board). Made for you the first time a manual score is saved. |
| `Monthly Scores` | Made for you the first time a month is recorded: `Month \| Squad \| Player \| Key \| Category \| Count \| Points \| Recorded`. One row per player per category per month. |

`templates/Teams.csv`, `templates/Groups.csv`, `templates/Scoring.csv`,
`templates/Adjustments.csv` and `templates/ManualScores.csv` are ready to paste
into cell A1.

### Adjustments

The escape hatch, and the only one. PALMS cannot record a decision made in the
room — a correction, a one-off chapter bonus, a penalty agreed at a meeting — so
those go here, in plain points, with a reason attached.

```
Month | Team | Reason | Points | ID
```

`ID` is filled in by the board for rows it adds, so two people can add and
remove adjustments at once; rows typed in by hand can leave it blank.
Column **order does not matter** — the engine reads the headings, not the
positions, and ignores headings it does not recognise. An old `GameLog` tab
still reads correctly, so nothing has to be renamed to upgrade.

A row with no points is skipped and flagged. A row with no reason still counts,
but the page will say so: a points change nobody can explain is a row waiting to
happen.

---

## Managing the roster

The **ROSTER** tab is where the line-up is kept honest between sheet updates.

- **Drag anyone onto another squad** and the whole board recalculates at once.
- **Drag them onto "No squad"** when they leave the chapter. They come off the
  board and their points stop counting for anyone, without deleting the history.
- **Add a player** who has joined, or who is in the room but missing from the
  sheet. Spell the name exactly as the PALMS tabs spell it or their activity
  will not find them.

Every move saves to the **Teams** tab straight away (someone who has left is
written as `No squad`). Undo works, and **Reset To Sheet** puts the roster back
to what was last saved.

---

## Nothing is ever silently wrong

Anything the engine cannot resolve raises a notice at the top of the page
instead of producing a quiet number: a player active in the sheet but on no
squad, an adjustment for a squad that does not exist, an adjustment with no
points on it, a training column nobody has filled in, a TYFCB column that holds
money rather than counts, a group whose rows disagree about whether it was done,
a name in the Groups tab that is in no PALMS tab, or a sheet that names more
than two squads, or a scoring line pointed at a source that does not exist, or
a manual score for a name the board does not know.

On the scoreboard those notices are folded into a single chip so they do not
shout over a board being shown to a room; tap it to read them, and they open by
themselves on the DATA, SCORING and ROSTER tabs where you would be fixing them.

A sheet with more than two squads still scores correctly — the scoreboard just falls back from the
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
