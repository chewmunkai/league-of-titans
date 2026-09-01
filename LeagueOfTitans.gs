/**
 * LEAGUE OF TITANS — CGC Season 2
 * Data bridge: reads the BNI Titan master sheet, returns clean JSON.
 *
 * This script does NO scoring. It only hands the raw rows over.
 * All point maths and item mechanics live in the dashboard HTML, so you
 * can change point values, item costs and rules without redeploying this.
 *
 * ── SETUP ───────────────────────────────────────────────────────
 * 1. Open your sheet → Extensions → Apps Script
 * 2. Delete everything, paste this file, Save
 * 3. Run `listTabs()` once, click "Allow" on the permission popup,
 *    then read the Execution Log to see your real tab names
 * 4. Fix the CONFIG block below if any of them differ
 * 5. Deploy → New deployment → type "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 * 6. Copy the /exec URL into the dashboard, hit Load, then
 *    Copy One-Click Link and bookmark that.
 *
 * Re-deploy (Manage deployments → edit → New version) only if you change
 * THIS file. Changing point values or item rules never needs a redeploy.
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

  TEAMS_TAB: 'Teams',
  GAMELOG_TAB: 'GameLog',
  TRAINING_TAB: 'Training',

  // Which column of the Training tab is the current month.
  // Leave as null and it takes the rightmost month column in the sheet.
  // The dashboard can switch months without touching this.
  CURRENT_MONTH: null
};

// ── Entry point ──────────────────────────────────────────────────

function doGet(e) {
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
    gameLog: readGameLog(),        // old five-field shape, still honoured
    gameLogRaw: readGameLogRaw(),  // headers + rows, so new columns come through
    warnings: []
  };
}

function getTabNames() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function (s) {
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  if (n === CONFIG.GAMELOG_TAB.toLowerCase()) return true;
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
    else if (h.indexOf('rev given') !== -1 && map.REV == null) map.REV = c;
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
    REV: num(row[map.REV])
  };
}

function num(v) {
  if (v === '' || v === null || v === undefined) return 0;
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ── Teams tab ────────────────────────────────────────────────────
// Expected: col A = Member Name, col B = Team

function readTeams() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.TEAMS_TAB);
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

// ── GameLog tab ──────────────────────────────────────────────────
// Old shape:  Month | Team | Type | Detail | Points
// New shape:  Month | Team | Type | Item | Target Team | Target Member |
//             Area | Outcome | Points | Notes
//
// The dashboard reads gameLogRaw by heading name, so the column order
// does not matter and extra columns are harmless. readGameLog() below
// stays for anything still expecting the old five fields.

function gameLogGrid() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.GAMELOG_TAB);
  if (!sheet) return null;
  var grid = sheet.getDataRange().getValues();
  return grid.length ? grid : null;
}

function readGameLogRaw() {
  var grid = gameLogGrid();
  if (!grid) return { headers: [], rows: [] };

  // Find the header row: the first row within the top few that mentions a team.
  var hr = 0;
  for (var r = 0; r < Math.min(grid.length, 10); r++) {
    var joined = grid[r].map(function (c) { return String(c).toLowerCase(); }).join('|');
    if (joined.indexOf('team') !== -1) { hr = r; break; }
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

function readGameLog() {
  var grid = gameLogGrid();
  if (!grid) return [];
  var out = [];
  for (var r = 1; r < grid.length; r++) {
    var team = String(grid[r][1] || '').trim();
    if (!team) continue;
    out.push({
      month: String(grid[r][0] || '').trim(),
      team: team,
      type: String(grid[r][2] || '').trim(),
      detail: String(grid[r][3] || '').trim(),
      points: num(grid[r][4])
    });
  }
  return out;
}

// ── Training tab ─────────────────────────────────────────────────
// Header row has month names as columns. We take CONFIG.CURRENT_MONTH,
// or the rightmost month column that actually has numbers in it.

function readTraining() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
