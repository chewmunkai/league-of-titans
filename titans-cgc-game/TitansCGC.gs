/**
 * TITANS CGC GAME
 * Data bridge: reads the BNI Titan master sheet, returns clean JSON, and
 * saves the dashboard's edits back into it.
 *
 * This script does NO scoring. It hands the raw rows over, and writes back
 * only the tabs the dashboard owns: Teams, Groups, Mentors, Scoring,
 * Settings and Adjustments. It never touches a PALMS tab or Training.
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
// Each section the dashboard can save is one whole tab, written in full.
// Whole-tab writes are what make the conflict check below possible: the
// page says "I last saw the tab like THIS", and if it has moved on since,
// the save is refused and the page re-reads it.

var SECTIONS = {
  teams:       { headers: ['Member Name', 'Team'] },
  groups:      { headers: ['Round', 'Group', 'Member', 'Role', 'Done', 'Notes'] },
  mentors:     { headers: ['Mentor', 'Order'] },
  scoring:     { headers: ['Key', 'Name', 'Points', 'Source', 'Columns'] },
  settings:    { headers: ['Setting', 'Value'] },
  adjustments: { headers: ['Month', 'Team', 'Reason', 'Points'] }
};

// The tab a section is read from right now…
function readTabName(section) {
  if (section === 'teams') return CONFIG.TEAMS_TAB;
  if (section === 'groups') return CONFIG.GROUPS_TAB;
  if (section === 'mentors') return CONFIG.MENTORS_TAB;
  if (section === 'scoring') return CONFIG.SCORING_TAB;
  if (section === 'settings') return CONFIG.SETTINGS_TAB;
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
  if (Object.prototype.toString.call(req.rows) !== '[object Array]')
    return { ok: false, code: 'bad', error: 'That save had no rows in it.' };

  // One writer at a time. Two committee members saving in the same second
  // must not interleave half of each other's tab.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000))
    return { ok: false, code: 'busy', error: 'Someone else is saving right now. Try again in a moment.' };
  try {
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
    writeTab(writeTabName(req.section), rows);
    SpreadsheetApp.flush();
    return { ok: true, section: req.section, rows: rows.length - 1,
             hash: hashTab(readTabName(req.section)) };
  } finally {
    lock.releaseLock();
  }
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

function writeTab(name, rows) {
  var ss = book();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
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
  var training = readTraining();
  return {
    ok: true,
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
    // A fingerprint of each saveable tab as it stands. The dashboard sends
    // it back with a save, and a save against a tab that has changed since
    // is refused rather than silently overwriting someone else's work.
    hashes: allHashes(),
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
    var row = grid[i].map(function (c) {
      return (c instanceof Date) ? Utilities.formatDate(c, Session.getScriptTimeZone(), 'yyyy-MM-dd') : c;
    });
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
    var row = grid[i].map(function (c) {
      return (c instanceof Date) ? Utilities.formatDate(c, Session.getScriptTimeZone(), 'yyyy-MM-dd') : c;
    });
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
    var row = grid[i].map(function (c) {
      return (c instanceof Date) ? Utilities.formatDate(c, Session.getScriptTimeZone(), 'yyyy-MM-dd') : c;
    });
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
