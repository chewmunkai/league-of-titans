/**
 * TITANS CGC GAME
 * Data bridge: reads the BNI Titan master sheet, returns clean JSON, and
 * saves the dashboard's edits back into it.
 *
 * This script does NO scoring. It hands the raw rows over, and writes back
 * only the tabs the dashboard owns: Teams, Groups, Mentors, Scoring,
 * Settings, Adjustments, Manual Scores and Monthly Scores. It never touches
 * a PALMS tab or Training.
 *
 * The sheet is the shared record. Anyone with the dashboard link can READ
 * it; SAVING needs the edit PIN below, so the board can be put up in front
 * of the whole chapter without anyone in the room being able to change it.
 *
 * ── SETUP ───────────────────────────────────────────────────────
 * 1. Open your sheet → Extensions → Apps Script
 * 2. Delete everything, paste this file, Save
 * 3. Run `listTabs()` once, click "Allow" on the permission popup,
 *    then read the Execution Log to see your real tab names
 * 4. Fix the CONFIG block below if any of them differ
 * 5. Set EDIT_PIN in the CONFIG block to something only your
 *    committee knows. Saving stays switched OFF until you do.
 * 6. Deploy → New deployment → type "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 * 7. Copy the /exec URL into the dashboard, hit Load, then
 *    Copy One-Click Link and bookmark that.
 *
 * Re-deploy (Manage deployments → edit → New version) only if you change
 * THIS file — including a change to EDIT_PIN. Changing point values, the
 * roster or the draw never needs a redeploy: that is what saving is for.
 *
 * Updating from an older copy of this file? Paste this one over it, keep
 * your EDIT_PIN, and deploy a New version of the SAME deployment (Manage
 * deployments → pencil → Version: New version). A brand-new deployment
 * gets a new /exec link, and the dashboard would still be talking to the
 * old one.
 * ────────────────────────────────────────────────────────────────
 */

var CONFIG = {
  // Tab names for the CURRENT month's weekly PALMS data.
  // Leave as null to auto-detect every PALMS-shaped tab (safer to start).
  WEEK_TABS: null,

  // Substrings of tab names to NEVER treat as a meeting week. Keep these
  // narrow: the real weekly tabs are called "Master list 1st week", so a
  // blanket 'Master' here would throw away the entire month.
  EXCLUDE_TABS: ['past 5 month', 'past ', 'cumulative', 'archive', 'leaderboard',
                 'rolling', 'dashboard', 'mtl ', 'formula', 'settings', 'mentor'],

  // The chapter's sheet. Only used if this script was created on its own at
  // script.google.com rather than from inside the sheet (Extensions → Apps
  // Script) — either way now works.
  SHEET_ID: '1DGPPrDKswS0JMJUMkwdtoffV9S7LmReKGT_FmQ1ZlSg',

  TEAMS_TAB: 'Teams',
  // The fortnightly group 1-2-1 draw and whether each group delivered.
  GROUPS_TAB: 'Groups',
  // The chapter's own scoring lines. If this tab exists it defines the
  // whole scoring list and the dashboard's built-in defaults step aside.
  SCORING_TAB: 'Scoring',
  // Points the room agreed that PALMS cannot show. The first of these that
  // exists is used, so an old GameLog tab keeps working untouched.
  ADJUSTMENT_TABS: ['Adjustments', 'GameLog'],
  TRAINING_TAB: 'Training',
  // The fixed group leaders for the fortnightly draw, in group order.
  MENTORS_TAB: 'Mentors',
  // Everything the dashboard lets you tune: group size, the fine, points
  // carried in. One row per setting.
  SETTINGS_TAB: 'Settings',
  // Points typed in by hand for one player: Name | Item | Score.
  SCORES_TAB: 'Manual Scores',
  // Each finished month, frozen: every player's points by category, so a
  // month is kept after its weekly PALMS tabs are cleared for the next one.
  MONTHS_TAB: 'Monthly Scores',

  // Saving is refused until this is set. Anyone who has it can change the
  // roster, the draw and the scoring for everybody, so treat it like a
  // committee password, not a secret for one person.
  EDIT_PIN: '',

  // Which column of the Training tab is the current month.
  // Leave as null and it takes the rightmost month column in the sheet.
  // The dashboard can switch months without touching this.
  CURRENT_MONTH: null
};

// The spreadsheet this script works on: the one it lives inside, or failing
// that the one named in CONFIG.SHEET_ID.
function book() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

// ── Entry point ──────────────────────────────────────────────────

function doGet(e) {
  var p = (e && e.parameter) || {};
  // Saves normally arrive by POST. This is the fallback for a browser that
  // refuses the POST, and it also answers the PIN check.
  if (p.action) return reply(handleAction(p), p.callback);
  var payload;
  try {
    payload = buildPayload();
  } catch (err) {
    payload = { ok: false, error: String(err), tabs: getTabNames() };
  }

  var json = JSON.stringify(payload);
  var cb = e && e.parameter && e.parameter.callback;

  if (cb) {
    // JSONP — avoids all CORS headaches when the dashboard runs from a file
    return ContentService
      .createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return reply({ ok: false, code: 'bad', error: 'Could not read that save request.' }); }
  return reply(handleSave(req));
}

function reply(obj, cb) {
  var json = JSON.stringify(obj);
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function handleAction(p) {
  // What each saveable tab looks like right now, as a fingerprint. Cheap,
  // needs no PIN, and is how an open dashboard notices that somebody else
  // has saved something since it last looked.
  if (p.action === 'hashes') return { ok: true, api: API_VERSION, hashes: allHashes() };
  if (p.action === 'checkpin') {
    if (!CONFIG.EDIT_PIN) return { ok: false, code: 'nopin', error: pinOffMessage() };
    return String(p.pin || '') === String(CONFIG.EDIT_PIN)
      ? { ok: true } : { ok: false, code: 'badpin', error: 'That edit PIN is not right.' };
  }
  if (p.action === 'save') {
    var req;
    try { req = JSON.parse(p.payload); }
    catch (err) { return { ok: false, code: 'bad', error: 'Could not read that save request.' }; }
    return handleSave(req);
  }
  return { ok: false, code: 'bad', error: 'Unknown action ' + p.action + '.' };
}

// ── Saving ───────────────────────────────────────────────────────
// Every section the dashboard can save is one tab. A save does NOT send the
// whole tab: it sends only the rows that person changed ("put") and the rows
// they removed ("del"), each named by a key — the player for Teams, the
// round + player for Groups, a hidden ID for Adjustments and Manual Scores.
// The script takes the lock, reads the tab as it is NOW, applies just those
// rows to it and writes it back.
//
// That is what lets several people keep the board open at once. Somebody
// marking Group 2 done no longer wipes out somebody else marking Group 3
// done a minute earlier: both rows survive. Only when two people change the
// very same row does the later save win — for that one row.

var API_VERSION = 3;

// headers: how the tab is written. heads: words that find each column when
// the tab is read, so a tab somebody built by hand in another order still
// reads right. must: the columns that have to be there for a row to count as
// the heading row. key: the columns that name a row. id: a hidden ID column
// that names a row instead, when it is filled in. text: columns kept as
// plain text, so "September 2026" is not turned into a date.
var SECTIONS = {
  teams:       { headers: ['Member Name', 'Team'],
                 heads: [['member', 'name', 'player'], ['team', 'squad']],
                 must: [0, 1], key: [0] },
  groups:      { headers: ['Round', 'Group', 'Member', 'Role', 'Done', 'Notes', 'Month'],
                 heads: [['round', 'cycle', 'fortnight', 'period'], ['group', 'pod'],
                         ['member', 'player', 'name'], ['role'],
                         ['done', 'completed', 'complete', 'posted', 'status', 'outcome'],
                         ['notes', 'note', 'detail'], ['month']],
                 must: [1, 2], key: [0, 2], text: [0, 6] },
  mentors:     { headers: ['Mentor', 'Order'],
                 heads: [['mentor'], ['order', 'group']],
                 must: [0], key: [0] },
  scoring:     { headers: ['Key', 'Name', 'Points', 'Source', 'Columns'],
                 heads: [['key', 'id'], ['name', 'label', 'activity'], ['points', 'pts', 'score'],
                         ['source', 'counted from', 'from'], ['columns', 'column', 'which']],
                 must: [1, 2], key: [0], keyFallback: 1 },
  settings:    { headers: ['Setting', 'Value'],
                 heads: [['setting'], ['value']],
                 must: [0, 1], key: [0] },
  adjustments: { headers: ['Month', 'Team', 'Reason', 'Points', 'ID'],
                 heads: [['month'], ['team', 'squad'],
                         ['reason', 'why', 'notes', 'note', 'detail', 'type'],
                         ['points', 'pts', 'score'], ['id']],
                 not: { 1: ['target'] },
                 must: [1], key: [0, 1, 2, 3], id: 4, text: [0] },
  scores:      { headers: ['Name', 'Item', 'Score', 'Added', 'ID', 'Month'],
                 heads: [['name', 'member', 'player'], ['item', 'activity', 'what', 'reason'],
                         ['score', 'points', 'pts'], ['added', 'date', 'when'], ['id'], ['month']],
                 must: [0, 2], key: [0, 1, 2, 3], id: 4, text: [3, 5] },
  // One row per player per category per month, plus one per squad for that
  // month's adjustments. Recording a month again replaces its rows.
  months:      { headers: ['Month', 'Squad', 'Player', 'Key', 'Category', 'Count', 'Points', 'Recorded'],
                 heads: [['month'], ['squad', 'team'], ['player', 'member', 'name'], ['key'],
                         ['category', 'activity', 'item'], ['count', 'qty'], ['points', 'pts', 'score'],
                         ['recorded', 'saved']],
                 must: [0, 6], key: [0, 1, 2, 3], text: [0, 7] }
};

// The tab a section is read from right now…
function readTabName(section) {
  if (section === 'teams') return CONFIG.TEAMS_TAB;
  if (section === 'groups') return CONFIG.GROUPS_TAB;
  if (section === 'mentors') return CONFIG.MENTORS_TAB;
  if (section === 'scoring') return CONFIG.SCORING_TAB;
  if (section === 'settings') return CONFIG.SETTINGS_TAB;
  if (section === 'scores') return CONFIG.SCORES_TAB;
  if (section === 'months') return CONFIG.MONTHS_TAB;
  if (section === 'adjustments') {
    var ss = book();
    for (var i = 0; i < CONFIG.ADJUSTMENT_TABS.length; i++)
      if (ss.getSheetByName(CONFIG.ADJUSTMENT_TABS[i])) return CONFIG.ADJUSTMENT_TABS[i];
    return CONFIG.ADJUSTMENT_TABS[0];
  }
  return null;
}
// …and the tab it is written to. Only adjustments differ: an old GameLog
// is read, and its rows are saved forward into a proper Adjustments tab.
function writeTabName(section) {
  return section === 'adjustments' ? CONFIG.ADJUSTMENT_TABS[0] : readTabName(section);
}

function pinOffMessage() {
  return 'Saving is switched off until an EDIT_PIN is set in the Apps Script CONFIG ' +
    'and the script is deployed again.';
}

function handleSave(req) {
  req = req || {};
  if (!CONFIG.EDIT_PIN) return { ok: false, code: 'nopin', error: pinOffMessage() };
  if (String(req.pin || '') !== String(CONFIG.EDIT_PIN))
    return { ok: false, code: 'badpin', error: 'That edit PIN is not right.' };
  var sec = SECTIONS[req.section];
  if (!sec) return { ok: false, code: 'bad', error: 'There is no section called ' + req.section + '.' };
  var isArr = function (x) { return Object.prototype.toString.call(x) === '[object Array]'; };
  if (!req.ops && !isArr(req.rows))
    return { ok: false, code: 'bad', error: 'That save had no rows in it.' };
  if (req.ops && (!isArr(req.ops.put || []) || !isArr(req.ops.del || [])))
    return { ok: false, code: 'bad', error: 'Could not read that save request.' };

  // One writer at a time. Two committee members saving in the same second
  // must not interleave half of each other's tab.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000))
    return { ok: false, code: 'busy', error: 'Someone else is saving right now. Try again in a moment.' };
  try {
    if (req.ops) return applyOps(req.section, req.ops);

    // An older copy of the dashboard, still open in somebody's browser,
    // sends the whole tab with a fingerprint of how it looked. Refuse it if
    // the tab has moved on since, exactly as before.
    var now = hashTab(readTabName(req.section));
    if (req.base !== undefined && req.base !== null && String(req.base) !== now)
      return { ok: false, code: 'conflict', hash: now,
               error: 'The ' + req.section + ' tab changed since you opened the page.' };

    var width = sec.headers.length, rows = [sec.headers], i, j;
    for (i = 0; i < req.rows.length && i < 5000; i++) {
      var src = req.rows[i] || [], row = [];
      for (j = 0; j < width; j++) row.push(cell(src[j]));
      rows.push(row);
    }
    writeTab(writeTabName(req.section), rows, sec.text);
    SpreadsheetApp.flush();
    return { ok: true, section: req.section, rows: rows.length - 1,
             hash: hashTab(readTabName(req.section)) };
  } finally {
    lock.releaseLock();
  }
}

// Put the changed rows into the tab as it stands now. Called with the lock held.
function applyOps(section, ops) {
  var def = SECTIONS[section], cur = readSection(section), i, j;
  if (cur.error) return { ok: false, code: 'bad', error: cur.error };
  var P = ops.put || [], D = ops.del || [];
  if (P.length > 5000 || D.length > 5000)
    return { ok: false, code: 'bad', error: 'That save is too big to be right.' };

  var del = {}, put = [], putAt = {};
  for (i = 0; i < D.length; i++) del['$' + String(D[i])] = 1;
  for (i = 0; i < P.length; i++) {
    var src = (P[i] && P[i].r) || [], row = [];
    for (j = 0; j < def.headers.length; j++) row.push(src[j] === undefined || src[j] === null ? '' : src[j]);
    putAt['$' + String(P[i] && P[i].k)] = put.length;
    put.push({ row: row, used: false });
  }

  // A page that was running on its built-in defaults (no Teams, Scoring or
  // Settings tab yet) sends its whole list as a seed. It is only used if the
  // tab is STILL empty; if somebody else created it meanwhile, the changed
  // rows go onto theirs like any other save.
  var seed = ops.seed;
  if (!cur.rows.length && Object.prototype.toString.call(seed) === '[object Array]' && seed.length) {
    P = []; D = []; put = []; putAt = {};
    for (i = 0; i < seed.length && i < 5000; i++) {
      var srow = [];
      for (j = 0; j < def.headers.length; j++) srow.push(seed[i] && seed[i][j] !== undefined && seed[i][j] !== null ? seed[i][j] : '');
      put.push({ row: srow, used: false });
    }
  }

  var keys = rowKeys(section, cur.rows), out = [], changed = 0;
  for (i = 0; i < cur.rows.length; i++) {
    var k = '$' + keys[i];
    if (del[k]) { changed++; continue; }
    if (putAt.hasOwnProperty(k)) {
      var p = put[putAt[k]];
      if (!p.used) { out.push(p.row); p.used = true; changed++; }
      continue;
    }
    out.push(cur.rows[i]);
  }
  for (i = 0; i < put.length; i++) if (!put[i].used) { out.push(put[i].row); changed++; }
  if (section === 'groups') out = tidyGroups(out);

  if (changed) {
    var rows = [def.headers];
    for (i = 0; i < out.length; i++) rows.push(out[i].map(cell));
    writeTab(writeTabName(section), rows, def.text);
    SpreadsheetApp.flush();
  }
  // Hand back the tab exactly as it now stands — everyone's rows, not just
  // this person's — so the page that saved is up to date as well.
  var now = readSection(section);
  return { ok: true, api: API_VERSION, section: section, changed: changed,
           headers: def.headers, rows: now.rows, hash: hashTab(readTabName(section)) };
}

// A section's tab, read by heading into the order it is written in.
function readSection(section) {
  var def = SECTIONS[section], name = readTabName(section);
  var sheet = name ? book().getSheetByName(name) : null;
  var out = { tab: name, exists: !!sheet, rows: [] };
  if (!sheet) return out;
  var grid = sheet.getDataRange().getValues(), tz = sheetTz(), r, c;
  var filled = false;
  for (r = 0; r < grid.length && !filled; r++)
    for (c = 0; c < grid[r].length; c++) if (grid[r][c] !== '' && grid[r][c] !== null) { filled = true; break; }
  if (!filled) return out;

  var hr = -1, map = null;
  for (r = 0; r < Math.min(grid.length, 10) && hr === -1; r++) {
    var m = mapHeads(grid[r], def), hits = 0, used = 0, all = true;
    for (c = 0; c < m.length; c++) if (m[c] !== -1) hits++;
    for (c = 0; c < def.must.length; c++) if (m[def.must[c]] === -1) all = false;
    for (c = 0; c < grid[r].length; c++) if (String(grid[r][c]).trim()) used++;
    if (all && hits >= Math.min(2, used)) { hr = r; map = m; }
  }
  // An old GameLog this board cannot make sense of is left exactly where it
  // is; saving starts a clean Adjustments tab beside it, as it always has.
  if (hr === -1 && name !== writeTabName(section)) return { tab: name, exists: false, rows: [] };
  if (hr === -1) {
    out.error = 'The ' + name + ' tab has something in it this board cannot read. It needs a heading ' +
      'row of ' + def.headers.join(' | ') + '. Fix the headings (or rename that tab), then save again.';
    return out;
  }
  for (r = hr + 1; r < grid.length; r++) {
    var row = [], any = false;
    for (c = 0; c < def.headers.length; c++) {
      var v = map[c] === -1 ? '' : canon(grid[r][map[c]], tz);
      if (v !== '') any = true;
      row.push(v);
    }
    if (any) out.rows.push(row);
  }
  return out;
}

// Which column holds each field, by heading. -1 where the tab has none.
function mapHeads(cells, def) {
  var low = cells.map(function (x) { return String(x).trim().toLowerCase(); }), map = [], taken = {};
  for (var f = 0; f < def.heads.length; f++) {
    map[f] = -1;
    for (var j = 0; j < low.length && map[f] === -1; j++) {
      if (!low[j] || taken[j]) continue;
      var skip = false, nots = (def.not && def.not[f]) || [];
      for (var n = 0; n < nots.length; n++) if (low[j].indexOf(nots[n]) !== -1) skip = true;
      if (skip) continue;
      for (var a = 0; a < def.heads[f].length; a++) {
        var w = def.heads[f][a];
        if (low[j] === w || (w.length > 2 && low[j].indexOf(w) !== -1)) { map[f] = j; taken[j] = 1; break; }
      }
    }
  }
  return map;
}

// One cell as the dashboard sees it: dates as yyyy-MM-dd in the sheet's
// own time zone, text trimmed, numbers left as numbers.
var TZ_ = null;
function sheetTz() { return TZ_ || (TZ_ = book().getSpreadsheetTimeZone()); }
function canon(v, tz) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz || sheetTz(), 'yyyy-MM-dd');
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  return String(v).trim();
}

// The name of every row. The dashboard works these out the same way, which
// is how a "put" from the page lands on the right row here. Two rows that
// would share a name are told apart by a #2, #3 on the later ones.
function keyPart(v) { return String(v === null || v === undefined ? '' : v).toLowerCase().replace(/\s+/g, ' ').trim(); }
function slugKey(v) { return keyPart(v).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function rowKeys(section, rows) {
  var def = SECTIONS[section], seen = {}, out = [], i, c;
  for (i = 0; i < rows.length; i++) {
    var row = rows[i] || [], k;
    if (def.id !== undefined && keyPart(row[def.id])) k = 'id:' + keyPart(row[def.id]);
    else if (def.keyFallback !== undefined && !keyPart(row[def.key[0]])) k = slugKey(row[def.keyFallback]);
    else {
      var parts = [];
      for (c = 0; c < def.key.length; c++) parts.push(keyPart(row[def.key[c]]));
      k = parts.join('|');
    }
    seen['$' + k] = (seen['$' + k] || 0) + 1;
    if (seen['$' + k] > 1) k += '#' + seen['$' + k];
    out.push(k);
  }
  return out;
}

// Keep the Groups tab readable: each round together, groups in number
// order, the mentor at the top of their group.
function tidyGroups(rows) {
  var first = {}, n = 0;
  rows.forEach(function (r) { var k = '$' + keyPart(r[0]); if (!first.hasOwnProperty(k)) first[k] = n++; });
  function grp(v) { var x = Number(v); return isNaN(x) || String(v).trim() === '' ? null : x; }
  return rows.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
    var d = first['$' + keyPart(a.r[0])] - first['$' + keyPart(b.r[0])];
    if (d) return d;
    var ga = grp(a.r[1]), gb = grp(b.r[1]);
    if (ga !== null && gb !== null && ga !== gb) return ga - gb;
    if ((ga === null) !== (gb === null)) return ga === null ? 1 : -1;
    if (ga === null && keyPart(a.r[1]) !== keyPart(b.r[1])) return keyPart(a.r[1]) < keyPart(b.r[1]) ? -1 : 1;
    var ma = keyPart(a.r[3]) === 'mentor' ? 0 : 1, mb = keyPart(b.r[3]) === 'mentor' ? 0 : 1;
    return (ma - mb) || (a.i - b.i);
  }).map(function (x) { return x.r; });
}

// A value on its way into a cell. Numbers stay numbers; text is kept as
// text. Anything that looks like a formula is escaped with a leading
// apostrophe, so a name typed as "=IMPORTXML(...)" is stored, not run.
function cell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return isFinite(v) ? v : '';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  var s = String(v).slice(0, 500);
  if (/^[=+@]/.test(s) || (/^-/.test(s) && isNaN(Number(s)))) s = "'" + s;
  return s;
}

// Write over the old rows first and only then clear whatever is left below
// or to the right, so somebody reading the tab mid-save never catches it
// empty.
function writeTab(name, rows, textCols) {
  var ss = book();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  var width = rows[0].length, oldRows = sheet.getLastRow(), oldCols = sheet.getLastColumn(), i;
  if (textCols && rows.length > 1)
    for (i = 0; i < textCols.length; i++)
      sheet.getRange(2, textCols[i] + 1, rows.length - 1, 1).setNumberFormat('@');
  sheet.getRange(1, 1, rows.length, width).setValues(rows);
  if (oldRows > rows.length)
    sheet.getRange(rows.length + 1, 1, oldRows - rows.length, Math.max(width, oldCols)).clearContent();
  if (oldCols > width)
    sheet.getRange(1, width + 1, Math.max(oldRows, rows.length), oldCols - width).clearContent();
  sheet.getRange(1, 1, 1, width).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function hashTab(name) {
  var sheet = name ? book().getSheetByName(name) : null;
  if (!sheet) return '';
  var text = JSON.stringify(sheet.getDataRange().getDisplayValues());
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function allHashes() {
  var out = {};
  for (var k in SECTIONS) if (SECTIONS.hasOwnProperty(k)) out[k] = hashTab(readTabName(k));
  return out;
}

// ── Payload ──────────────────────────────────────────────────────

function buildPayload() {
  // Fingerprints first, rows second. If a save lands in between, the page
  // gets new rows under an old fingerprint and simply refreshes once more —
  // never the other way round, which would hide somebody's save.
  var hashes = allHashes();
  var training = readTraining();
  return {
    ok: true,
    api: API_VERSION,
    generatedAt: new Date().toISOString(),
    month: training.month,
    trainingMonths: training.months,
    tabs: getTabNames(),
    weeks: readWeeks(),
    teams: readTeams(),
    training: training.rows,
    // Headers + rows, read by name at the far end, so column order and any
    // extra columns are harmless.
    adjustmentsRaw: readAdjustmentsRaw(),
    groupsRaw: readGroupsRaw(),
    scoringRaw: readTabRaw(CONFIG.SCORING_TAB, ['points', 'pts']),
    mentorsRaw: readTabRaw(CONFIG.MENTORS_TAB, ['mentor']),
    settingsRaw: readTabRaw(CONFIG.SETTINGS_TAB, ['setting']),
    scoresRaw: readTabRaw(CONFIG.SCORES_TAB, ['score', 'points']),
    monthsRaw: readTabRaw(CONFIG.MONTHS_TAB, ['category', 'points']),
    // A fingerprint of each saveable tab as it stands. The dashboard checks
    // these every so often and refreshes itself when somebody else has saved.
    hashes: hashes,
    canSave: !!CONFIG.EDIT_PIN,
    warnings: []
  };
}

function getTabNames() {
  return book().getSheets().map(function (s) {
    return s.getName();
  });
}

function listTabs() {
  Logger.log('TAB NAMES IN THIS SHEET:');
  getTabNames().forEach(function (n, i) { Logger.log((i + 1) + '. ' + n); });
}

// ── Weekly PALMS tabs ────────────────────────────────────────────

/**
 * A PALMS tab is any sheet with a header row containing
 * "First Name" and "RGI". Header position varies, so we hunt for it.
 */
function readWeeks() {
  var ss = book();
  var out = [];

  ss.getSheets().forEach(function (sheet) {
    var name = sheet.getName();

    if (CONFIG.WEEK_TABS && CONFIG.WEEK_TABS.indexOf(name) === -1) return;
    if (!CONFIG.WEEK_TABS && isExcluded(name)) return;

    var grid = sheet.getDataRange().getValues();
    var headerRow = findHeaderRow(grid);
    if (headerRow === -1) return;

    var map = mapColumns(grid[headerRow]);
    if (map.RGI == null) return;

    var rows = [];
    for (var r = headerRow + 1; r < grid.length; r++) {
      var rec = readMemberRow(grid[r], map);
      if (rec) rows.push(rec);
    }
    if (rows.length) out.push({ tab: name, rows: rows });
  });

  return out;
}

function isExcluded(name) {
  var n = name.toLowerCase();
  if (n === CONFIG.TEAMS_TAB.toLowerCase()) return true;
  for (var a = 0; a < CONFIG.ADJUSTMENT_TABS.length; a++)
    if (n === CONFIG.ADJUSTMENT_TABS[a].toLowerCase()) return true;
  if (n === CONFIG.GROUPS_TAB.toLowerCase()) return true;
  if (n === CONFIG.SCORING_TAB.toLowerCase()) return true;
  if (n === CONFIG.SCORES_TAB.toLowerCase()) return true;
  if (n === CONFIG.MONTHS_TAB.toLowerCase()) return true;
  if (n === CONFIG.TRAINING_TAB.toLowerCase()) return true;
  for (var i = 0; i < CONFIG.EXCLUDE_TABS.length; i++) {
    if (n.indexOf(CONFIG.EXCLUDE_TABS[i].toLowerCase()) !== -1) return true;
  }
  return false;
}

function findHeaderRow(grid) {
  var limit = Math.min(grid.length, 14);
  for (var r = 0; r < limit; r++) {
    var joined = grid[r].map(function (c) { return String(c).toLowerCase(); }).join('|');
    if (joined.indexOf('first name') !== -1 && joined.indexOf('rgi') !== -1) return r;
  }
  return -1;
}

/**
 * Maps header text -> column index. Handles merged cells (blank headers)
 * and the "1-2-1" column that Google silently converts to a date.
 */
function mapColumns(headerCells) {
  var map = {};
  for (var c = 0; c < headerCells.length; c++) {
    var raw = headerCells[c];
    var h = String(raw).trim().toLowerCase();
    if (!h) continue;

    if (h === 'first name' && map.FIRST == null) map.FIRST = c;
    else if (h === 'last name' && map.LAST == null) map.LAST = c;
    else if (h === 'p' && map.P == null) map.P = c;
    else if (h === 'a' && map.A == null) map.A = c;
    else if (h === 'l' && map.L == null) map.L = c;
    else if (h === 'm' && map.M == null) map.M = c;
    else if (h === 's' && map.S == null) map.S = c;
    else if (h === 'rgi' && map.RGI == null) map.RGI = c;
    else if (h === 'rgo' && map.RGO == null) map.RGO = c;
    else if (h === 'rri' && map.RRI == null) map.RRI = c;
    else if (h === 'rro' && map.RRO == null) map.RRO = c;
    else if (h === 'v' && map.V == null) map.V = c;
    else if (map.TYFCB == null && isTyfcbHeader(h)) map.TYFCB = c;
    else if (h === 'ceu' && map.CEU == null) map.CEU = c;
    else if (map.ONE21 == null && isOneToOneHeader(raw, h)) map.ONE21 = c;
  }
  return map;
}

function isOneToOneHeader(raw, h) {
  if (raw instanceof Date) return true;              // "1-2-1" eaten by Sheets
  if (h.replace(/[^0-9]/g, '') === '121') return true;
  if (h.indexOf('1-2-1') !== -1) return true;
  if (h.indexOf('1-2-2001') !== -1) return true;
  return false;
}

function readMemberRow(row, map) {
  var first = String(row[map.FIRST] || '').trim();
  var last = map.LAST != null ? String(row[map.LAST] || '').trim() : '';
  var full = (first + ' ' + last).replace(/\s+/g, ' ').trim();
  if (!full) return null;
  var lower = full.toLowerCase();
  if (lower === 'first name' || lower === 'total' || lower === 'totals') return null;

  return {
    name: full,
    P: num(row[map.P]),
    A: num(row[map.A]),
    L: num(row[map.L]),
    M: num(row[map.M]),
    S: num(row[map.S]),
    RGI: num(row[map.RGI]),
    RGO: num(row[map.RGO]),
    RRI: num(row[map.RRI]),
    RRO: num(row[map.RRO]),
    V: num(row[map.V]),
    ONE21: num(row[map.ONE21]),
    TYFCB: num(row[map.TYFCB])
  };
}

// TYFCB is spelled a dozen ways across PALMS exports. Catch the lot, but
// never mistake "Rev Received" or "RRI" for it — those are not given.
function isTyfcbHeader(h) {
  if (h.indexOf('tyfcb') !== -1) return true;
  if (h.indexOf('closed business') !== -1) return true;
  if (h.indexOf('thank you') !== -1) return true;
  if (h.indexOf('receiv') !== -1) return false;
  return h.indexOf('rev given') !== -1 || h.indexOf('revenue given') !== -1 || h === 'rev';
}

function num(v) {
  if (v === '' || v === null || v === undefined) return 0;
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ── Teams tab ────────────────────────────────────────────────────
// Expected: col A = Member Name, col B = Team

function readTeams() {
  var sheet = book().getSheetByName(CONFIG.TEAMS_TAB);
  if (!sheet) return [];
  var grid = sheet.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < grid.length; r++) {
    var name = String(grid[r][0] || '').trim();
    var team = String(grid[r][1] || '').trim();
    if (name && team) out.push({ name: name, team: team });
  }
  return out;
}

// ── A tab handed over raw ────────────────────────────────────────
// Headers plus rows, with the header row found by the words that have to
// be in it. The dashboard reads it by heading name, so column order and
// extra columns are both harmless.

function readTabRaw(tabName, mustHave) {
  var sheet = book().getSheetByName(tabName);
  if (!sheet) return { headers: [], rows: [] };
  var grid = sheet.getDataRange().getValues();
  if (!grid.length) return { headers: [], rows: [] };

  var hr = 0;
  for (var r = 0; r < Math.min(grid.length, 10); r++) {
    var joined = grid[r].map(function (c) { return String(c).toLowerCase(); }).join('|');
    var hit = false;
    for (var m = 0; m < mustHave.length; m++) if (joined.indexOf(mustHave[m]) !== -1) hit = true;
    if (hit) { hr = r; break; }
  }

  var headers = grid[hr].map(function (c) { return String(c).trim(); });
  var rows = [];
  for (var i = hr + 1; i < grid.length; i++) {
    var row = grid[i].map(function (c) { return (c instanceof Date) ? canon(c) : c; });
    var blank = row.every(function (c) { return c === '' || c === null; });
    if (!blank) rows.push(row);
  }
  return { headers: headers, rows: rows };
}

// ── Groups tab ───────────────────────────────────────────────────
// One row per player per round: Round | Group | Member | Done | Notes.
// Handed over raw; the dashboard reads it by heading name.

function readGroupsRaw() {
  var sheet = book().getSheetByName(CONFIG.GROUPS_TAB);
  if (!sheet) return { headers: [], rows: [] };
  var grid = sheet.getDataRange().getValues();
  if (!grid.length) return { headers: [], rows: [] };

  var hr = 0;
  for (var r = 0; r < Math.min(grid.length, 10); r++) {
    var joined = grid[r].map(function (c) { return String(c).toLowerCase(); }).join('|');
    if (joined.indexOf('group') !== -1 && joined.indexOf('member') !== -1) { hr = r; break; }
  }

  var headers = grid[hr].map(function (c) { return String(c).trim(); });
  var rows = [];
  for (var i = hr + 1; i < grid.length; i++) {
    var row = grid[i].map(function (c) { return (c instanceof Date) ? canon(c) : c; });
    var blank = row.every(function (c) { return c === '' || c === null; });
    if (!blank) rows.push(row);
  }
  return { headers: headers, rows: rows };
}

// ── Adjustments tab ──────────────────────────────────────────────
// The dashboard reads these by heading name, so the column order does not
// matter and extra columns are harmless. Expected: Month | Team | Reason | Points.

function adjustmentsGrid() {
  var ss = book();
  for (var i = 0; i < CONFIG.ADJUSTMENT_TABS.length; i++) {
    var sheet = ss.getSheetByName(CONFIG.ADJUSTMENT_TABS[i]);
    if (!sheet) continue;
    var grid = sheet.getDataRange().getValues();
    if (grid.length) return grid;
  }
  return null;
}

function readAdjustmentsRaw() {
  var grid = adjustmentsGrid();
  if (!grid) return { headers: [], rows: [] };

  // Find the header row: the first row within the top few that mentions a team.
  var hr = 0;
  for (var r = 0; r < Math.min(grid.length, 10); r++) {
    var joined = grid[r].map(function (c) { return String(c).toLowerCase(); }).join('|');
    if (joined.indexOf('team') !== -1 || joined.indexOf('squad') !== -1) { hr = r; break; }
  }

  var headers = grid[hr].map(function (c) { return String(c).trim(); });
  var rows = [];
  for (var i = hr + 1; i < grid.length; i++) {
    var row = grid[i].map(function (c) { return (c instanceof Date) ? canon(c) : c; });
    var blank = row.every(function (c) { return c === '' || c === null; });
    if (!blank) rows.push(row);
  }
  return { headers: headers, rows: rows };
}

// ── Training tab ─────────────────────────────────────────────────
// Header row has month names as columns. We take CONFIG.CURRENT_MONTH,
// or the rightmost month column that actually has numbers in it.

function readTraining() {
  var ss = book();
  var sheet = ss.getSheetByName(CONFIG.TRAINING_TAB);

  if (!sheet) {
    // fall back: find any tab with a "Name" column and a month column
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      var g = sheets[i].getDataRange().getValues();
      if (findTrainingHeader(g) !== -1) { sheet = sheets[i]; break; }
    }
  }
  if (!sheet) return { rows: [], month: '' };

  var grid = sheet.getDataRange().getValues();
  var hr = findTrainingHeader(grid);
  if (hr === -1) return { rows: [], month: '' };

  var header = grid[hr].map(function (c) { return String(c).trim().toLowerCase(); });
  var nameCol = header.indexOf('name');
  if (nameCol === -1) {
    for (var h = 0; h < header.length; h++) {
      if (header[h].indexOf('member') !== -1) { nameCol = h; break; }
    }
  }
  if (nameCol === -1) return { rows: [], month: '' };

  // Every month column, so the dashboard can switch months on its own.
  var cols = [], labels = [];
  for (var c = 0; c < header.length; c++) {
    if (!header[c] || !MONTH_RE.test(header[c]) || header[c].indexOf('total') !== -1) continue;
    cols.push(c);
    labels.push(String(grid[hr][c] || '').trim());
  }
  if (!cols.length) return { rows: [], month: '', months: [] };

  var monthCol = pickMonthColumn(cols, labels);
  var current = String(grid[hr][monthCol] || '').trim();

  var out = [];
  for (var r = hr + 1; r < grid.length; r++) {
    var nm = String(grid[r][nameCol] || '').trim();
    if (!nm || nm.toLowerCase() === 'total') continue;
    var months = {};
    for (var i = 0; i < cols.length; i++) months[labels[i].toLowerCase()] = num(grid[r][cols[i]]);
    out.push({ name: nm, sessions: months[current.toLowerCase()] || 0, months: months });
  }
  return { rows: out, month: current, months: labels };
}

var MONTH_RE = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

// The month being run now is the rightmost month column in the sheet, whether
// or not anyone has filled it in yet. Picking "the last column with numbers"
// silently reads LAST month whenever this month is still blank.
function pickMonthColumn(cols, labels) {
  if (CONFIG.CURRENT_MONTH) {
    var want = String(CONFIG.CURRENT_MONTH).trim().toLowerCase();
    for (var i = 0; i < labels.length; i++) if (labels[i].toLowerCase() === want) return cols[i];
  }
  return cols[cols.length - 1];
}

function findTrainingHeader(grid) {
  var limit = Math.min(grid.length, 12);
  for (var r = 0; r < limit; r++) {
    var cells = grid[r].map(function (c) { return String(c).trim().toLowerCase(); });
    var hasName = cells.indexOf('name') !== -1;
    if (!hasName) {
      for (var i = 0; i < cells.length; i++) if (cells[i].indexOf('member') !== -1) hasName = true;
    }
    if (!hasName) continue;
    for (var j = 0; j < cells.length; j++) if (cells[j] && MONTH_RE.test(cells[j])) return r;
  }
  return -1;
}
