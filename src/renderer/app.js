const state = {
  activeTool: 'diff',
  leftText: '',
  rightText: '',
  leftFile: null,
  rightFile: null,
  mode: 'side',
  ignoreWhitespace: false,
  ignoreCase: false,
  recentComparisons: [],
  historyOpen: false,
  jsonText: '',
  jsonResult: '',
  jsonFile: null,
  jsonIndent: '2',
  logText: '',
  logFile: null,
  logQuery: '',
  logLevel: 'all',
  logMatches: [],
  logActiveMatchIndex: -1
};

const refs = {
  topbar: document.getElementById('app-topbar'),
  tabDiff: document.getElementById('tab-diff'),
  tabJson: document.getElementById('tab-json'),
  tabLog: document.getElementById('tab-log'),
  diffToolbar: document.getElementById('diff-toolbar'),
  jsonToolbar: document.getElementById('json-toolbar'),
  logToolbar: document.getElementById('log-toolbar'),
  diffWorkspace: document.getElementById('diff-workspace'),
  jsonWorkspace: document.getElementById('json-workspace'),
  logWorkspace: document.getElementById('log-workspace'),
  taLeft: document.getElementById('ta-left'),
  taRight: document.getElementById('ta-right'),
  lcLeft: document.getElementById('lc-left'),
  lcRight: document.getElementById('lc-right'),
  metaLeft: document.getElementById('meta-left'),
  metaRight: document.getElementById('meta-right'),
  btnSide: document.getElementById('btn-side'),
  btnInline: document.getElementById('btn-inline'),
  chkWhitespace: document.getElementById('chk-ws'),
  chkCase: document.getElementById('chk-case'),
  stats: document.getElementById('stats'),
  diffOut: document.getElementById('diff-out'),
  diffSummary: document.getElementById('diff-summary'),
  modeLabel: document.getElementById('mode-label'),
  historyPanel: document.getElementById('history-panel'),
  historyList: document.getElementById('history-list'),
  toast: document.getElementById('toast'),
  statusPill: document.getElementById('status-pill'),
  appearancePill: document.getElementById('appearance-pill'),
  btnHistory: document.getElementById('btn-history'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  btnOpenLeft: document.getElementById('btn-open-left'),
  btnOpenRight: document.getElementById('btn-open-right'),
  btnSaveLeft: document.getElementById('btn-save-left'),
  btnSaveRight: document.getElementById('btn-save-right'),
  btnExport: document.getElementById('btn-export'),
  btnOpenJson: document.getElementById('btn-open-json'),
  btnJsonBeautify: document.getElementById('btn-json-beautify'),
  btnJsonMinify: document.getElementById('btn-json-minify'),
  btnJsonCopy: document.getElementById('btn-json-copy'),
  btnJsonSave: document.getElementById('btn-json-save'),
  jsonIndent: document.getElementById('json-indent'),
  jsonStats: document.getElementById('json-stats'),
  jsonInput: document.getElementById('json-input'),
  jsonInputCount: document.getElementById('json-input-count'),
  jsonMeta: document.getElementById('json-meta'),
  jsonSummary: document.getElementById('json-summary'),
  jsonOutput: document.getElementById('json-output'),
  jsonResultCount: document.getElementById('json-result-count'),
  btnOpenLog: document.getElementById('btn-open-log'),
  btnLogCopyVisible: document.getElementById('btn-log-copy-visible'),
  btnLogClear: document.getElementById('btn-log-clear'),
  btnLogPrev: document.getElementById('btn-log-prev'),
  btnLogNext: document.getElementById('btn-log-next'),
  btnLogJump: document.getElementById('btn-log-jump'),
  logSearch: document.getElementById('log-search'),
  logLevel: document.getElementById('log-level'),
  logLineJump: document.getElementById('log-line-jump'),
  logStats: document.getElementById('log-stats'),
  logInput: document.getElementById('log-input'),
  logInputCount: document.getElementById('log-input-count'),
  logMeta: document.getElementById('log-meta'),
  logSummary: document.getElementById('log-summary'),
  logOutput: document.getElementById('log-output'),
  logVisibleCount: document.getElementById('log-visible-count')
};

let toastTimer = null;
let persistTimer = null;
let jsonPersistTimer = null;
let logPersistTimer = null;

const tauriCore = window.__TAURI__?.core;
const tauriDialog = window.__TAURI__?.dialog;
const JSON_TOOL_STORAGE_KEY = 'eldiff-json-tool-state';
const LOG_TOOL_STORAGE_KEY = 'eldiff-log-tool-state';
const MAX_PERSISTED_LOG_BYTES = 500 * 1024;
const LOG_LEVEL_PATTERNS = {
  error: /(?<lead>^|[^a-z0-9_])(?<token>fatal|panic|critical|crit|error|err)(?=[^a-z0-9_]|$)/i,
  warn: /(?<lead>^|[^a-z0-9_])(?<token>warning|warn)(?=[^a-z0-9_]|$)/i,
  info: /(?<lead>^|[^a-z0-9_])(?<token>information|info|notice)(?=[^a-z0-9_]|$)/i,
  debug: /(?<lead>^|[^a-z0-9_])(?<token>debug)(?=[^a-z0-9_]|$)/i,
  trace: /(?<lead>^|[^a-z0-9_])(?<token>trace|verbose)(?=[^a-z0-9_]|$)/i
};
const LOG_TIMESTAMP_PATTERN =
  /\b(?:\d{4}-\d{2}-\d{2}[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:[.,]\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?|\d{2}[/-]\d{2}[/-]\d{2,4}[ T][0-2]?\d:[0-5]\d(?::[0-5]\d(?:[.,]\d{1,9})?)?|[A-Z][a-z]{2}\s+\d{1,2}\s+[0-2]?\d:[0-5]\d:[0-5]\d|[0-2]?\d:[0-5]\d:[0-5]\d(?:[.,]\d{1,9})?)\b/;
const LOG_HEADER_PATTERN =
  /^\s*(?<timestamp>(?:\d{4}-\d{2}-\d{2}[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:[.,]\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?|\d{2}[/-]\d{2}[/-]\d{2,4}[ T][0-2]?\d:[0-5]\d(?::[0-5]\d(?:[.,]\d{1,9})?)?|[A-Z][a-z]{2}\s+\d{1,2}\s+[0-2]?\d:[0-5]\d:[0-5]\d|[0-2]?\d:[0-5]\d:[0-5]\d(?:[.,]\d{1,9})?))\s+(?<level>fatal|panic|critical|crit|error|err|warning|warn|information|info|notice|debug|trace|verbose)\s+(?<source>[A-Za-z0-9_.$:/@-]{1,120})(?=\s+(?:[-:])|\s|$)/i;
const LOG_SOURCE_ASSIGNMENT_PATTERN =
  /\b(?:source|logger|target|module|component|service|thread|class)=["']?(?<source>[A-Za-z0-9_.$:/@-]{2,120})["']?/i;
const LOG_SOURCE_BRACKET_PATTERN = /\[(?<source>[A-Za-z][\w.$:/@-]{1,100})\]/g;
const LOG_SOURCE_QUALIFIED_PATTERN = /\b(?<source>[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*){1,})(?=\s*(?:[:-]|$))/;

const EMPTY_STATE_HTML = `
  <div class="empty-state">
    <svg viewBox="0 0 36 36" fill="none">
      <rect x="4" y="6" width="28" height="24" rx="4" stroke="currentColor" stroke-width="1.5"></rect>
      <line x1="10" y1="13" x2="26" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></line>
      <line x1="10" y1="18" x2="22" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></line>
      <line x1="10" y1="23" x2="18" y2="23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></line>
    </svg>
    <div>Open files or paste text to compare.</div>
  </div>
`;

const EXPORT_CSS = `
  :root {
    color-scheme: light dark;
    --font-sans: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
    --font-mono: "SF Mono", "JetBrains Mono", "Menlo", "Monaco", monospace;
    --text: #17202b;
    --text-muted: #5a6677;
    --surface: #fbfbfc;
    --surface-soft: #f3f5f8;
    --border: #d4dbe4;
    --green: rgba(39,174,96,0.14);
    --green-text: #16753a;
    --red: rgba(215,76,66,0.14);
    --red-text: #b93028;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --text: #edf1f7;
      --text-muted: #b5becb;
      --surface: #1c232c;
      --surface-soft: #202832;
      --border: #313d4b;
      --green: rgba(39,174,96,0.2);
      --green-text: #52d67c;
      --red: rgba(215,76,66,0.2);
      --red-text: #ff8a83;
    }
    body {
      background: linear-gradient(180deg, #171c23 0%, #12161c 52%, #0d1116 100%);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px;
    color: var(--text);
    font-family: var(--font-sans);
    background: linear-gradient(180deg, #f7f8fa 0%, #eceff3 52%, #e2e6ec 100%);
  }
  .shell {
    max-width: 1200px;
    margin: 0 auto;
    border-radius: 22px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: 0 24px 60px rgba(15,23,34,0.12);
    overflow: hidden;
  }
  .head {
    padding: 24px 28px 18px;
    border-bottom: 1px solid var(--border);
    background: var(--surface-soft);
  }
  .eyebrow {
    display: block;
    margin-bottom: 6px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  h1 {
    margin: 0 0 10px;
    font-size: 28px;
    letter-spacing: -0.04em;
  }
  .meta {
    color: var(--text-muted);
    font-size: 13px;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }
  .badge {
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    background: var(--surface-soft);
    border: 1px solid var(--border);
  }
  .badge.add { background: var(--green); color: var(--green-text); }
  .badge.del { background: var(--red); color: var(--red-text); }
  .body { padding: 0 0 18px; }
  .diff-side-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .diff-col + .diff-col { border-left: 1px solid var(--border); }
  .diff-col-hdr {
    padding: 12px 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    background: var(--surface-soft);
  }
  .diff-line {
    display: flex;
    align-items: stretch;
    min-height: 26px;
    font: 12px/1.75 var(--font-mono);
  }
  .ln, .inline-mark {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }
  .ln {
    width: 52px;
    justify-content: flex-end;
    padding: 0 10px;
    border-right: 1px solid var(--border);
  }
  .inline-mark { width: 26px; }
  .lc {
    flex: 1;
    padding: 0 12px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .line-add { background: var(--green); }
  .line-del { background: var(--red); }
  .line-add .ln, .line-add .inline-mark { color: var(--green-text); }
  .line-del .ln, .line-del .inline-mark { color: var(--red-text); }
  .c-add, .c-del { padding: 1px 1px; border-radius: 4px; }
  .c-add { background: rgba(39,174,96,0.18); color: var(--green-text); }
  .c-del { background: rgba(215,76,66,0.18); color: var(--red-text); text-decoration: line-through; }
`;

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getByteCount(value) {
  return new TextEncoder().encode(value).length;
}

function formatByteCount(value) {
  if (value < 1024) {
    return `${value} bytes`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLineCount(value) {
  const count = value ? value.split('\n').length : 0;
  return count === 1 ? '1 line' : `${count} lines`;
}

function getJsonIndentValue() {
  return state.jsonIndent === 'tab' ? '\t' : Number(state.jsonIndent || 2);
}

function getJsonRootType(value) {
  if (Array.isArray(value)) {
    return 'Array';
  }

  if (value === null) {
    return 'Null';
  }

  return `${typeof value}`.replace(/^\w/, (letter) => letter.toUpperCase());
}

function analyzeJsonValue(value) {
  const summary = {
    arrays: 0,
    objects: 0,
    properties: 0,
    primitives: 0,
    maxDepth: 0
  };

  const walk = (node, depth) => {
    summary.maxDepth = Math.max(summary.maxDepth, depth);

    if (Array.isArray(node)) {
      summary.arrays += 1;
      node.forEach((item) => walk(item, depth + 1));
      return;
    }

    if (node && typeof node === 'object') {
      const keys = Object.keys(node);
      summary.objects += 1;
      summary.properties += keys.length;
      keys.forEach((key) => walk(node[key], depth + 1));
      return;
    }

    summary.primitives += 1;
  };

  walk(value, 1);
  return summary;
}

function getJsonParseErrorDetails(error, source) {
  const message = error instanceof Error ? error.message : String(error);
  const positionMatch = message.match(/position\s+(\d+)/i);

  if (!positionMatch) {
    return message;
  }

  const position = Number(positionMatch[1]);
  const before = source.slice(0, position);
  const line = before.split('\n').length;
  const column = before.length - before.lastIndexOf('\n');
  return `${message} (line ${line}, column ${column})`;
}

function parseJsonSource(source) {
  const trimmed = source.trim();

  if (!trimmed) {
    return {
      ok: false,
      empty: true,
      message: 'Paste JSON to parse and beautify.'
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return {
      ok: true,
      parsed,
      summary: analyzeJsonValue(parsed),
      rootType: getJsonRootType(parsed)
    };
  } catch (error) {
    return {
      ok: false,
      message: getJsonParseErrorDetails(error, source)
    };
  }
}

function loadJsonToolState() {
  try {
    const saved = JSON.parse(localStorage.getItem(JSON_TOOL_STORAGE_KEY) || '{}');

    if (saved.activeTool === 'json') {
      state.activeTool = 'json';
    }

    state.jsonText = typeof saved.jsonText === 'string' ? saved.jsonText : '';
    state.jsonResult = typeof saved.jsonResult === 'string' ? saved.jsonResult : '';
    state.jsonIndent = ['2', '4', 'tab'].includes(saved.jsonIndent) ? saved.jsonIndent : '2';
    state.jsonFile = saved.jsonFile && typeof saved.jsonFile.path === 'string' ? saved.jsonFile : null;
  } catch {
    state.jsonText = '';
    state.jsonResult = '';
    state.jsonFile = null;
    state.jsonIndent = '2';
  }
}

function saveJsonToolState() {
  localStorage.setItem(
    JSON_TOOL_STORAGE_KEY,
    JSON.stringify({
      activeTool: state.activeTool,
      jsonText: state.jsonText,
      jsonResult: state.jsonResult,
      jsonIndent: state.jsonIndent,
      jsonFile: state.jsonFile
    })
  );
}

function queueJsonToolPersist() {
  clearTimeout(jsonPersistTimer);
  jsonPersistTimer = window.setTimeout(() => {
    try {
      saveJsonToolState();
    } catch {
      // Local JSON scratch state is best effort and should not block the app.
    }
  }, 180);
}

function getPersistableLogText() {
  return getByteCount(state.logText) <= MAX_PERSISTED_LOG_BYTES ? state.logText : '';
}

function loadLogToolState() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOG_TOOL_STORAGE_KEY) || '{}');

    if (saved.activeTool === 'log') {
      state.activeTool = 'log';
    }

    state.logText = typeof saved.logText === 'string' ? saved.logText : '';
    state.logFile = saved.logFile && typeof saved.logFile.path === 'string' ? saved.logFile : null;
    state.logQuery = typeof saved.logQuery === 'string' ? saved.logQuery : '';
    state.logLevel = ['all', 'error', 'warn', 'info', 'debug', 'trace'].includes(saved.logLevel)
      ? saved.logLevel
      : 'all';
  } catch {
    state.logText = '';
    state.logFile = null;
    state.logQuery = '';
    state.logLevel = 'all';
  }
}

function saveLogToolState() {
  localStorage.setItem(
    LOG_TOOL_STORAGE_KEY,
    JSON.stringify({
      activeTool: state.activeTool,
      logText: getPersistableLogText(),
      logFile: state.logFile,
      logQuery: state.logQuery,
      logLevel: state.logLevel
    })
  );
}

function queueLogToolPersist() {
  clearTimeout(logPersistTimer);
  logPersistTimer = window.setTimeout(() => {
    try {
      saveLogToolState();
    } catch {
      // Local log scratch state is best effort and large logs may exceed storage quota.
    }
  }, 180);
}

function detectLogLevel(line) {
  const headerMatch = line.match(LOG_HEADER_PATTERN);
  const headerLevel = headerMatch?.groups?.level?.toLowerCase();

  if (headerLevel) {
    if (['fatal', 'panic', 'critical', 'crit', 'error', 'err'].includes(headerLevel)) {
      return 'error';
    }

    if (['warning', 'warn'].includes(headerLevel)) {
      return 'warn';
    }

    if (['information', 'info', 'notice'].includes(headerLevel)) {
      return 'info';
    }

    if (headerLevel === 'debug') {
      return 'debug';
    }

    if (['trace', 'verbose'].includes(headerLevel)) {
      return 'trace';
    }
  }

  if (LOG_LEVEL_PATTERNS.error.test(line)) {
    return 'error';
  }

  if (LOG_LEVEL_PATTERNS.warn.test(line)) {
    return 'warn';
  }

  if (LOG_LEVEL_PATTERNS.info.test(line)) {
    return 'info';
  }

  if (LOG_LEVEL_PATTERNS.debug.test(line)) {
    return 'debug';
  }

  if (LOG_LEVEL_PATTERNS.trace.test(line)) {
    return 'trace';
  }

  return 'other';
}

function getMatchRange(match, groupName) {
  const value = match.groups?.[groupName] || match[0];
  const offset = match[0].indexOf(value);

  return {
    start: match.index + Math.max(offset, 0),
    end: match.index + Math.max(offset, 0) + value.length,
    value
  };
}

function findLogLevelRange(line) {
  const headerMatch = line.match(LOG_HEADER_PATTERN);

  if (headerMatch?.groups?.level) {
    return {
      ...getMatchRange(headerMatch, 'level'),
      level: detectLogLevel(line)
    };
  }

  for (const [level, pattern] of Object.entries(LOG_LEVEL_PATTERNS)) {
    const match = line.match(pattern);

    if (match) {
      return {
        ...getMatchRange(match, 'token'),
        level
      };
    }
  }

  return null;
}

function findLogTimestampRange(line) {
  const match = line.match(LOG_TIMESTAMP_PATTERN);
  return match ? getMatchRange(match, 0) : null;
}

function isLogLevelToken(value) {
  return Object.values(LOG_LEVEL_PATTERNS).some((pattern) => pattern.test(value));
}

function looksLikeTimestampToken(value) {
  return LOG_TIMESTAMP_PATTERN.test(value);
}

function findLogSourceRange(line) {
  const headerMatch = line.match(LOG_HEADER_PATTERN);

  if (headerMatch?.groups?.source) {
    return getMatchRange(headerMatch, 'source');
  }

  const assignmentMatch = line.match(LOG_SOURCE_ASSIGNMENT_PATTERN);

  if (assignmentMatch) {
    return getMatchRange(assignmentMatch, 'source');
  }

  LOG_SOURCE_BRACKET_PATTERN.lastIndex = 0;
  for (const match of line.matchAll(LOG_SOURCE_BRACKET_PATTERN)) {
    const range = getMatchRange(match, 'source');

    if (!isLogLevelToken(range.value) && !looksLikeTimestampToken(range.value)) {
      return range;
    }
  }

  const qualifiedMatch = line.match(LOG_SOURCE_QUALIFIED_PATTERN);
  return qualifiedMatch ? getMatchRange(qualifiedMatch, 'source') : null;
}

function findJsonEnd(text, start) {
  const pairs = {
    '{': '}',
    '[': ']'
  };
  const stack = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (pairs[char]) {
      stack.push(pairs[char]);
      continue;
    }

    if (char === '}' || char === ']') {
      if (stack.pop() !== char) {
        return null;
      }

      if (!stack.length) {
        return index + 1;
      }
    }
  }

  return null;
}

function findEmbeddedJson(text) {
  let attempts = 0;

  for (let index = 0; index < text.length && attempts < 30; index += 1) {
    if (text[index] !== '{' && text[index] !== '[') {
      continue;
    }

    attempts += 1;
    const end = findJsonEnd(text, index);

    if (!end) {
      continue;
    }

    const raw = text.slice(index, end);

    if (raw.length > 24_000) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === 'object') {
        return {
          start: index,
          end,
          formatted: JSON.stringify(parsed, null, 2)
        };
      }
    } catch {
      // Keep scanning: bracketed log levels often look like JSON arrays at first glance.
    }
  }

  return null;
}

function renderTextWithSearch(text) {
  const query = state.logQuery.trim();

  if (!query) {
    return esc(text);
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = lowerText.indexOf(lowerQuery, cursor);

    if (matchIndex === -1) {
      parts.push(esc(text.slice(cursor)));
      break;
    }

    parts.push(esc(text.slice(cursor, matchIndex)));
    parts.push(`<mark class="log-hit">${esc(text.slice(matchIndex, matchIndex + query.length))}</mark>`);
    cursor = matchIndex + query.length;
  }

  return parts.join('');
}

function renderTextWithRanges(text, ranges) {
  const normalizedRanges = [];

  ranges
    .filter((range) => range && range.start >= 0 && range.end > range.start)
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .forEach((range) => {
      const overlaps = normalizedRanges.some((entry) => range.start < entry.end && range.end > entry.start);

      if (!overlaps) {
        normalizedRanges.push(range);
      }
    });

  const parts = [];
  let cursor = 0;

  normalizedRanges.forEach((range) => {
    if (range.start > cursor) {
      parts.push(renderTextWithSearch(text.slice(cursor, range.start)));
    }

    parts.push(
      `<span class="${range.className}">${renderTextWithSearch(text.slice(range.start, range.end))}</span>`
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    parts.push(renderTextWithSearch(text.slice(cursor)));
  }

  return parts.join('');
}

function getStructuredLogRanges(text) {
  const ranges = [];
  const dividerMatch = text.match(/^\s*-{6,}\s*$/);

  if (dividerMatch) {
    ranges.push({
      start: 0,
      end: text.length,
      value: text,
      className: 'log-token-divider'
    });
  }

  const labelPattern = /(^|[-\s])(?<label>_?[A-Za-z][A-Za-z0-9_ ./-]{0,80}):/g;

  for (const labelMatch of text.matchAll(labelPattern)) {
    ranges.push({
      ...getMatchRange(labelMatch, 'label'),
      className: 'log-token-field'
    });
  }

  const pairPattern = /\b(?<key>[A-Za-z_][\w.-]*)=(?<value>'[^']*'|"[^"]*"|None|True|False|-?\d+(?:\.\d+)?|[A-Za-z_][\w./-]*)/g;
  for (const match of text.matchAll(pairPattern)) {
    const keyRange = getMatchRange(match, 'key');
    const valueRange = getMatchRange(match, 'value');

    ranges.push({
      ...keyRange,
      className: 'log-token-field'
    });
    ranges.push({
      ...valueRange,
      className: getStructuredValueClass(valueRange.value)
    });
  }

  const actionPattern = /\b(?<name>[A-Z][A-Za-z_]*Action|FiredAction|Output|Object|State|Dump)\b/g;
  for (const match of text.matchAll(actionPattern)) {
    ranges.push({
      ...getMatchRange(match, 'name'),
      className: 'log-token-source'
    });
  }

  const valuePattern = /(?<value>\*[^*\s][^*]*\*|\[[^\]\n]{1,40}\]|'[^']*'|"[^"]*"|\b(?:None|True|False|active|default|buy|sell|trade_to_reverse|django_unchained|T\dR|[UD]\d|[A-Z]{1,6}|-?\d+(?:\.\d+)?)\b)/g;
  for (const match of text.matchAll(valuePattern)) {
    const range = getMatchRange(match, 'value');

    ranges.push({
      ...range,
      className: getStructuredValueClass(range.value)
    });
  }

  return ranges;
}

function getStructuredValueClass(value) {
  if (/^['"]/.test(value)) {
    return 'log-token-string';
  }

  if (/^(?:True|False)$/i.test(value)) {
    return 'log-token-boolean';
  }

  if (/^None$/i.test(value)) {
    return 'log-token-null';
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return 'log-token-number';
  }

  if (/^\*.*\*$/.test(value) || /^\[.*\]$/.test(value)) {
    return 'log-token-marker';
  }

  return 'log-token-value';
}

function renderJsonSyntax(value) {
  const tokenPattern =
    /("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/gi;
  const parts = [];
  let cursor = 0;

  value.replace(tokenPattern, (token, _unused, offset) => {
    const start = Number(offset);
    let className = 'json-token-number';

    parts.push(esc(value.slice(cursor, start)));

    if (token.startsWith('"') && value.slice(start + token.length).trimStart().startsWith(':')) {
      className = 'json-token-key';
    } else if (token.startsWith('"')) {
      className = 'json-token-string';
    } else if (token === 'true' || token === 'false') {
      className = 'json-token-boolean';
    } else if (token === 'null') {
      className = 'json-token-null';
    }

    parts.push(`<span class="${className}">${esc(token)}</span>`);
    cursor = start + token.length;
    return token;
  });

  parts.push(esc(value.slice(cursor)));
  return parts.join('');
}

function renderLogLineContent(row) {
  const levelRange = findLogLevelRange(row.text);
  const timestampRange = findLogTimestampRange(row.text);
  const sourceRange = findLogSourceRange(row.text);
  const jsonRange = findEmbeddedJson(row.text);
  const ranges = [
    timestampRange && { ...timestampRange, className: 'log-token-time' },
    levelRange && { ...levelRange, className: `log-token-level log-token-level-${levelRange.level}` },
    sourceRange && { ...sourceRange, className: 'log-token-source' },
    jsonRange && { ...jsonRange, className: 'log-token-json' },
    ...getStructuredLogRanges(row.text)
  ];

  const jsonBlock = jsonRange
    ? `
        <pre class="log-json-block" aria-label="Formatted JSON" hidden>${renderJsonSyntax(jsonRange.formatted)}</pre>
      `
    : '';

  return `${renderTextWithRanges(row.text, ranges)}${jsonBlock}`;
}

function getLogRows() {
  if (!state.logText) {
    return [];
  }

  let currentEntryLevel = 'other';
  let currentEntryLine = 0;

  return state.logText.split('\n').map((text, index) => {
    const detectedLevel = detectLogLevel(text);
    const isEntryStart = Boolean(text.match(LOG_HEADER_PATTERN)) || (detectedLevel !== 'other' && !/^\s/.test(text));

    if (isEntryStart) {
      currentEntryLevel = detectedLevel;
      currentEntryLine = index + 1;
    }

    return {
      line: index + 1,
      text,
      level: isEntryStart ? detectedLevel : currentEntryLevel,
      ownLevel: detectedLevel,
      entryLine: currentEntryLine,
      isContinuation: !isEntryStart && currentEntryLine > 0
    };
  });
}

function getVisibleLogRows() {
  const rows = getLogRows();

  if (state.logLevel === 'all') {
    return rows;
  }

  return rows.filter((row) => row.level === state.logLevel);
}

function getLogLevelCounts(rows) {
  return rows.reduce(
    (counts, row) => {
      counts[row.level] = (counts[row.level] || 0) + 1;
      return counts;
    },
    { error: 0, warn: 0, info: 0, debug: 0, trace: 0, other: 0 }
  );
}

function getLogMatches(rows) {
  const query = state.logQuery.trim().toLowerCase();

  if (!query) {
    return [];
  }

  return rows
    .filter((row) => row.text.toLowerCase().includes(query))
    .map((row) => row.line);
}

function getLogMatchLabel() {
  if (!state.logQuery.trim()) {
    return 'No search';
  }

  if (!state.logMatches.length) {
    return '0 matches';
  }

  return `${state.logActiveMatchIndex + 1} of ${state.logMatches.length} matches`;
}

function scrollToLogLine(line, { smooth = true } = {}) {
  const target = refs.logOutput.querySelector(`[data-log-line="${line}"]`);

  if (!target) {
    return false;
  }

  target.scrollIntoView({
    block: 'center',
    behavior: smooth ? 'smooth' : 'auto'
  });
  return true;
}

function scrollActiveLogMatch({ smooth = true } = {}) {
  const line = state.logMatches[state.logActiveMatchIndex];

  if (!line) {
    return false;
  }

  return scrollToLogLine(line, { smooth });
}

function ensureTauri() {
  if (!tauriCore?.invoke || !tauriDialog?.open || !tauriDialog?.save) {
    throw new Error('Tauri API unavailable');
  }
}

function isWindowDragTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return !target.closest(
    'button, input, textarea, select, option, a, label, .no-drag, .history-panel, .toolbar, .workspace, .editor-card, .diff-card, .json-card, .log-card'
  );
}

function bindNativeWindowDrag() {
  const currentWindow = window.__TAURI__?.window?.getCurrentWindow?.();
  if (!refs.topbar || !currentWindow?.startDragging) {
    return;
  }

  refs.topbar.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || event.detail > 1 || !isWindowDragTarget(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    currentWindow.startDragging().catch(() => {
      // Built-in drag-region remains fallback if native drag call fails.
    });
  });

  refs.topbar.addEventListener('dblclick', (event) => {
    if (!isWindowDragTarget(event.target) || !currentWindow.toggleMaximize) {
      return;
    }

    currentWindow.toggleMaximize().catch(() => {
      // Ignore platforms/configurations that do not support titlebar double-click maximize.
    });
  });
}

function sanitizeFileNameSegment(value, fallback) {
  const normalized = String(value || fallback)
    .replace(/\.[^.]+$/, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || fallback;
}

function lcsArr(a, b) {
  const m = a.length;
  const n = b.length;

  if (m === 0 && n === 0) {
    return [];
  }

  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ t: 'eq', v: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ t: 'ins', v: b[j - 1] });
      j -= 1;
    } else {
      ops.push({ t: 'del', v: a[i - 1] });
      i -= 1;
    }
  }

  return ops.reverse();
}

function charDiffHtml(oldLine, newLine) {
  const ops = lcsArr(oldLine.split(''), newLine.split(''));
  const oldHtml = [];
  const newHtml = [];

  ops.forEach((op) => {
    const value = esc(op.v);
    if (op.t === 'eq') {
      oldHtml.push(value);
      newHtml.push(value);
    } else if (op.t === 'del') {
      oldHtml.push(`<span class="c-del">${value}</span>`);
    } else {
      newHtml.push(`<span class="c-add">${value}</span>`);
    }
  });

  return {
    oldHtml: oldHtml.join(''),
    newHtml: newHtml.join('')
  };
}

function getComparableLines(value) {
  return value.split('\n');
}

function getNormalizedText(value) {
  let nextValue = value;

  if (state.ignoreCase) {
    nextValue = nextValue.toLowerCase();
  }

  if (state.ignoreWhitespace) {
    nextValue = nextValue
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .join('\n');
  }

  return nextValue;
}

function updateLineCounts() {
  const leftCount = state.leftText ? state.leftText.split('\n').length : 0;
  const rightCount = state.rightText ? state.rightText.split('\n').length : 0;
  refs.lcLeft.textContent = leftCount === 1 ? '1 line' : `${leftCount} lines`;
  refs.lcRight.textContent = rightCount === 1 ? '1 line' : `${rightCount} lines`;
}

function renderFileMeta() {
  refs.metaLeft.textContent = state.leftFile?.path || 'No file loaded';
  refs.metaRight.textContent = state.rightFile?.path || 'No file loaded';
}

function renderMode() {
  refs.btnSide.classList.toggle('active', state.mode === 'side');
  refs.btnInline.classList.toggle('active', state.mode === 'inline');
  refs.modeLabel.textContent = state.mode === 'side' ? 'Side by Side' : 'Inline';
  refs.chkWhitespace.checked = state.ignoreWhitespace;
  refs.chkCase.checked = state.ignoreCase;
}

function renderStats(adds, dels, eqs) {
  refs.stats.innerHTML = [
    adds ? `<span class="stat-badge add">+${adds} added</span>` : '',
    dels ? `<span class="stat-badge del">−${dels} removed</span>` : '',
    `<span class="stat-badge">${eqs} unchanged</span>`
  ].join('');
}

function renderHistory() {
  refs.historyPanel.classList.toggle('open', state.historyOpen);
  refs.historyPanel.setAttribute('aria-hidden', String(!state.historyOpen));

  if (!state.recentComparisons.length) {
    refs.historyList.innerHTML = '<div class="history-empty">No saved comparisons yet.</div>';
    return;
  }

  refs.historyList.innerHTML = state.recentComparisons
    .map((entry) => {
      const formatter = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      const detail = [
        formatter.format(new Date(entry.timestamp)),
        entry.mode === 'side' ? 'side by side' : 'inline',
        entry.ignoreWhitespace ? 'ignore ws' : null,
        entry.ignoreCase ? 'ignore case' : null
      ]
        .filter(Boolean)
        .join(' · ');

      return `
        <div class="history-item">
          <button class="history-button" data-history-id="${entry.id}" type="button">
            <div class="history-title">${esc(entry.label)}</div>
            <div class="history-meta">${esc(detail)}</div>
          </button>
        </div>
      `;
    })
    .join('');
}

function syncInputs() {
  if (refs.taLeft.value !== state.leftText) {
    refs.taLeft.value = state.leftText;
  }
  if (refs.taRight.value !== state.rightText) {
    refs.taRight.value = state.rightText;
  }
}

function syncJsonInput() {
  if (refs.jsonInput.value !== state.jsonText) {
    refs.jsonInput.value = state.jsonText;
  }

  if (refs.jsonIndent.value !== state.jsonIndent) {
    refs.jsonIndent.value = state.jsonIndent;
  }
}

function syncLogInput() {
  if (refs.logInput.value !== state.logText) {
    refs.logInput.value = state.logText;
  }

  if (refs.logSearch.value !== state.logQuery) {
    refs.logSearch.value = state.logQuery;
  }

  if (refs.logLevel.value !== state.logLevel) {
    refs.logLevel.value = state.logLevel;
  }
}

function renderToolShell() {
  const isDiff = state.activeTool === 'diff';
  const isJson = state.activeTool === 'json';
  const isLog = state.activeTool === 'log';

  refs.tabDiff.classList.toggle('active', isDiff);
  refs.tabJson.classList.toggle('active', isJson);
  refs.tabLog.classList.toggle('active', isLog);
  refs.tabDiff.setAttribute('aria-selected', String(isDiff));
  refs.tabJson.setAttribute('aria-selected', String(isJson));
  refs.tabLog.setAttribute('aria-selected', String(isLog));
  refs.diffToolbar.hidden = !isDiff;
  refs.jsonToolbar.hidden = !isJson;
  refs.logToolbar.hidden = !isLog;
  refs.diffWorkspace.hidden = !isDiff;
  refs.jsonWorkspace.hidden = !isJson;
  refs.logWorkspace.hidden = !isLog;
  refs.btnHistory.hidden = !isDiff;
}

function renderJsonTool() {
  syncJsonInput();

  refs.jsonInputCount.textContent = formatLineCount(state.jsonText);
  refs.jsonMeta.textContent = state.jsonFile?.path || 'Scratch JSON';

  const parsed = parseJsonSource(state.jsonText);

  if (parsed.empty) {
    refs.jsonSummary.textContent = 'Waiting for JSON';
    refs.jsonStats.innerHTML = '';
    refs.jsonOutput.textContent = 'Formatted JSON will appear here.';
    refs.jsonOutput.classList.add('empty');
    refs.jsonOutput.classList.remove('error');
    refs.jsonResultCount.textContent = '0 bytes';
    return;
  }

  if (!parsed.ok) {
    refs.jsonSummary.textContent = 'Invalid JSON';
    refs.jsonStats.innerHTML = '<span class="stat-badge del">Parse error</span>';
    refs.jsonOutput.textContent = parsed.message;
    refs.jsonOutput.classList.remove('empty');
    refs.jsonOutput.classList.add('error');
    refs.jsonResultCount.textContent = '0 bytes';
    return;
  }

  const fallbackResult = JSON.stringify(parsed.parsed, null, getJsonIndentValue());
  const output = state.jsonResult || fallbackResult;

  refs.jsonSummary.textContent = `${parsed.rootType} parsed`;
  refs.jsonStats.innerHTML = [
    `<span class="stat-badge add">Valid JSON</span>`,
    `<span class="stat-badge">${esc(parsed.rootType)}</span>`,
    `<span class="stat-badge">${parsed.summary.properties} keys</span>`,
    `<span class="stat-badge">${parsed.summary.arrays} arrays</span>`,
    `<span class="stat-badge">depth ${parsed.summary.maxDepth}</span>`
  ].join('');
  refs.jsonOutput.textContent = output;
  refs.jsonOutput.classList.remove('empty', 'error');
  refs.jsonResultCount.textContent = formatByteCount(getByteCount(output));
}

function renderLogTool() {
  syncLogInput();

  const allRows = getLogRows();
  const visibleRows = getVisibleLogRows();
  const counts = getLogLevelCounts(allRows);

  state.logMatches = getLogMatches(visibleRows);

  if (!state.logMatches.length) {
    state.logActiveMatchIndex = -1;
  } else if (state.logActiveMatchIndex < 0 || state.logActiveMatchIndex >= state.logMatches.length) {
    state.logActiveMatchIndex = 0;
  }

  refs.logInputCount.textContent = formatLineCount(state.logText);
  refs.logMeta.textContent = state.logFile?.path || 'Scratch log';
  refs.logVisibleCount.textContent = visibleRows.length === 1 ? '1 visible' : `${visibleRows.length} visible`;
  refs.logSummary.textContent = state.logText ? getLogMatchLabel() : 'Waiting for logs';
  refs.btnLogPrev.disabled = !state.logMatches.length;
  refs.btnLogNext.disabled = !state.logMatches.length;

  refs.logStats.innerHTML = state.logText
    ? [
        `<span class="stat-badge">${allRows.length} lines</span>`,
        counts.error ? `<span class="stat-badge del">${counts.error} errors</span>` : '',
        counts.warn ? `<span class="stat-badge warn">${counts.warn} warnings</span>` : '',
        counts.info ? `<span class="stat-badge">${counts.info} info</span>` : '',
        state.logQuery.trim() ? `<span class="stat-badge add">${state.logMatches.length} matches</span>` : ''
      ].join('')
    : '';

  if (!state.logText) {
    refs.logOutput.textContent = 'Filtered log lines will appear here.';
    refs.logOutput.classList.add('empty');
    return;
  }

  if (!visibleRows.length) {
    refs.logOutput.textContent = `No ${state.logLevel} lines found.`;
    refs.logOutput.classList.add('empty');
    return;
  }

  const activeLine = state.logMatches[state.logActiveMatchIndex];

  refs.logOutput.innerHTML = visibleRows
    .map((row) => {
      const classes = ['log-row', `log-level-${row.level}`];
      if (row.isContinuation) {
        classes.push('continuation');
      }
      if (row.line === activeLine) {
        classes.push('active');
      }

      return `
        <div class="${classes.join(' ')}" data-log-line="${row.line}">
          <button class="log-line-number" data-log-jump-line="${row.line}" type="button">${row.line}</button>
          <div class="log-line-text">${renderLogLineContent(row)}</div>
        </div>
      `;
    })
    .join('');
  refs.logOutput.classList.remove('empty');
}

function renderDiff() {
  updateLineCounts();
  renderFileMeta();
  renderMode();

  if (!state.leftText && !state.rightText) {
    refs.diffSummary.textContent = 'Waiting for input';
    refs.diffOut.innerHTML = EMPTY_STATE_HTML;
    refs.stats.innerHTML = '';
    return;
  }

  const originalLines = getComparableLines(state.leftText);
  const modifiedLines = getComparableLines(state.rightText);
  const normalizedOriginal = getComparableLines(getNormalizedText(state.leftText));
  const normalizedModified = getComparableLines(getNormalizedText(state.rightText));
  const lineOps = lcsArr(normalizedOriginal, normalizedModified);

  let adds = 0;
  let dels = 0;
  let eqs = 0;

  lineOps.forEach((op) => {
    if (op.t === 'ins') {
      adds += 1;
    } else if (op.t === 'del') {
      dels += 1;
    } else {
      eqs += 1;
    }
  });

  refs.diffSummary.textContent = `${adds + dels} changed lines`;
  renderStats(adds, dels, eqs);

  let leftIndex = 0;
  let rightIndex = 0;

  if (state.mode === 'side') {
    const leftRows = [];
    const rightRows = [];
    const pending = [];

    const flushPending = () => {
      const delsOnly = pending.filter((entry) => entry.t === 'del');
      const addsOnly = pending.filter((entry) => entry.t === 'ins');
      const maxLen = Math.max(delsOnly.length, addsOnly.length);

      for (let idx = 0; idx < maxLen; idx += 1) {
        const delEntry = delsOnly[idx];
        const addEntry = addsOnly[idx];

        if (delEntry && addEntry) {
          const { oldHtml, newHtml } = charDiffHtml(
            originalLines[delEntry.leftIndex],
            modifiedLines[addEntry.rightIndex]
          );
          leftRows.push({ n: delEntry.leftIndex + 1, html: oldHtml, t: 'del' });
          rightRows.push({ n: addEntry.rightIndex + 1, html: newHtml, t: 'ins' });
        } else if (delEntry) {
          leftRows.push({ n: delEntry.leftIndex + 1, html: esc(originalLines[delEntry.leftIndex]), t: 'del' });
          rightRows.push({ n: '', html: '', t: 'empty' });
        } else if (addEntry) {
          leftRows.push({ n: '', html: '', t: 'empty' });
          rightRows.push({ n: addEntry.rightIndex + 1, html: esc(modifiedLines[addEntry.rightIndex]), t: 'ins' });
        }
      }

      pending.length = 0;
    };

    lineOps.forEach((op) => {
      if (op.t === 'eq') {
        flushPending();
        leftRows.push({ n: leftIndex + 1, html: esc(originalLines[leftIndex]), t: 'eq' });
        rightRows.push({ n: rightIndex + 1, html: esc(modifiedLines[rightIndex]), t: 'eq' });
        leftIndex += 1;
        rightIndex += 1;
      } else if (op.t === 'del') {
        pending.push({ t: 'del', leftIndex });
        leftIndex += 1;
      } else {
        pending.push({ t: 'ins', rightIndex });
        rightIndex += 1;
      }
    });

    flushPending();

    const buildColumn = (rows) =>
      rows
        .map((row) => {
          const classes = ['diff-line'];
          if (row.t === 'del') {
            classes.push('line-del');
          }
          if (row.t === 'ins') {
            classes.push('line-add');
          }
          return `<div class="${classes.join(' ')}"><span class="ln">${row.n}</span><span class="lc">${row.html}</span></div>`;
        })
        .join('');

    refs.diffOut.innerHTML = `
      <div class="diff-side-grid">
        <div class="diff-col">
          <div class="diff-col-hdr">Original</div>
          ${buildColumn(leftRows)}
        </div>
        <div class="diff-col">
          <div class="diff-col-hdr">Modified</div>
          ${buildColumn(rightRows)}
        </div>
      </div>
    `;
    return;
  }

  const rows = [];
  const pending = [];

  const flushPending = () => {
    const delsOnly = pending.filter((entry) => entry.t === 'del');
    const addsOnly = pending.filter((entry) => entry.t === 'ins');
    const maxLen = Math.max(delsOnly.length, addsOnly.length);

    for (let idx = 0; idx < maxLen; idx += 1) {
      const delEntry = delsOnly[idx];
      const addEntry = addsOnly[idx];

      if (delEntry && addEntry) {
        const { oldHtml, newHtml } = charDiffHtml(
          originalLines[delEntry.leftIndex],
          modifiedLines[addEntry.rightIndex]
        );
        rows.push(
          `<div class="diff-line line-del"><span class="ln">${delEntry.leftIndex + 1}</span><span class="inline-mark">−</span><span class="lc">${oldHtml}</span></div>`
        );
        rows.push(
          `<div class="diff-line line-add"><span class="ln">${addEntry.rightIndex + 1}</span><span class="inline-mark">+</span><span class="lc">${newHtml}</span></div>`
        );
      } else if (delEntry) {
        rows.push(
          `<div class="diff-line line-del"><span class="ln">${delEntry.leftIndex + 1}</span><span class="inline-mark">−</span><span class="lc">${esc(originalLines[delEntry.leftIndex])}</span></div>`
        );
      } else if (addEntry) {
        rows.push(
          `<div class="diff-line line-add"><span class="ln">${addEntry.rightIndex + 1}</span><span class="inline-mark">+</span><span class="lc">${esc(modifiedLines[addEntry.rightIndex])}</span></div>`
        );
      }
    }

    pending.length = 0;
  };

  lineOps.forEach((op) => {
    if (op.t === 'eq') {
      flushPending();
      rows.push(
        `<div class="diff-line"><span class="ln">${leftIndex + 1}</span><span class="inline-mark"> </span><span class="lc">${esc(originalLines[leftIndex])}</span></div>`
      );
      leftIndex += 1;
      rightIndex += 1;
    } else if (op.t === 'del') {
      pending.push({ t: 'del', leftIndex });
      leftIndex += 1;
    } else {
      pending.push({ t: 'ins', rightIndex });
      rightIndex += 1;
    }
  });

  flushPending();
  refs.diffOut.innerHTML = rows.join('');
}

function render() {
  syncInputs();
  renderToolShell();
  renderDiff();
  renderJsonTool();
  renderLogTool();
  renderHistory();
  refs.appearancePill.textContent = matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark mode'
    : 'light mode';
}

function updateStatus(text) {
  refs.statusPill.textContent = text;
}

function showToast(message) {
  clearTimeout(toastTimer);
  refs.toast.hidden = false;
  refs.toast.textContent = message;
  toastTimer = window.setTimeout(() => {
    refs.toast.hidden = true;
  }, 2200);
}

async function persistState() {
  const result = await tauriCore.invoke('save_state', {
    session: {
      leftText: state.leftText,
      rightText: state.rightText,
      leftFile: state.leftFile,
      rightFile: state.rightFile,
      mode: state.mode,
      ignoreWhitespace: state.ignoreWhitespace,
      ignoreCase: state.ignoreCase
    }
  });

  state.recentComparisons = result.recentComparisons || [];
  renderHistory();
}

function queuePersist() {
  clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistState().catch((error) => {
      showToast(error.message);
    });
  }, 280);
}

function applySession(session) {
  state.leftText = session.leftText || '';
  state.rightText = session.rightText || '';
  state.leftFile = session.leftFile || null;
  state.rightFile = session.rightFile || null;
  state.mode = session.mode === 'inline' ? 'inline' : 'side';
  state.ignoreWhitespace = Boolean(session.ignoreWhitespace);
  state.ignoreCase = Boolean(session.ignoreCase);
}

async function promptOpenPath(side) {
  const selected = await tauriDialog.open({
    multiple: false,
    directory: false,
    filters: [
      { name: 'Text', extensions: ['txt', 'md', 'js', 'ts', 'json', 'html', 'css', 'log', 'csv'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    title: side === 'right' ? 'Open Modified File' : 'Open Original File'
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return selected;
}

async function handleOpenFile(side, directPath) {
  const selectedPath = directPath || (await promptOpenPath(side));

  if (!selectedPath) {
    return;
  }

  try {
    const result = await tauriCore.invoke('read_text_file', { path: selectedPath });

    if (side === 'right') {
      state.rightText = result.content;
      state.rightFile = result.file;
    } else {
      state.leftText = result.content;
      state.leftFile = result.file;
    }

    updateStatus(`Opened ${result.file.name}`);
    render();
    await persistState();
  } catch (error) {
    showToast(String(error));
    updateStatus('Open failed');
  }
}

async function promptSavePath(side) {
  const knownPath = side === 'right' ? state.rightFile?.path : state.leftFile?.path;
  const fallbackName = side === 'right' ? 'modified.txt' : 'original.txt';

  return tauriDialog.save({
    defaultPath: knownPath || fallbackName,
    title: side === 'right' ? 'Save Modified File' : 'Save Original File'
  });
}

async function handleSavePane(side) {
  const content = side === 'right' ? state.rightText : state.leftText;
  const selectedPath = await promptSavePath(side);

  if (!selectedPath) {
    return;
  }

  try {
    const filePath = await tauriCore.invoke('write_text_file', {
      path: selectedPath,
      content
    });
    const fileMeta = {
      path: filePath,
      name: filePath.split('/').pop()
    };

    if (side === 'right') {
      state.rightFile = fileMeta;
    } else {
      state.leftFile = fileMeta;
    }

    render();
    updateStatus(`Saved ${fileMeta.name}`);
    showToast('Saved');
    await persistState();
  } catch (error) {
    showToast(String(error));
    updateStatus('Save failed');
  }
}

function refreshJsonResult({ minify = false, replaceInput = false } = {}) {
  const parsed = parseJsonSource(state.jsonText);

  if (!parsed.ok) {
    state.jsonResult = '';
    renderJsonTool();
    return false;
  }

  const result = JSON.stringify(parsed.parsed, null, minify ? 0 : getJsonIndentValue());
  state.jsonResult = result;

  if (replaceInput) {
    state.jsonText = result;
  }

  renderJsonTool();
  queueJsonToolPersist();
  return true;
}

async function promptOpenJsonPath() {
  const selected = await tauriDialog.open({
    multiple: false,
    directory: false,
    filters: [
      { name: 'JSON', extensions: ['json', 'geojson'] },
      { name: 'Text', extensions: ['txt', 'log'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    title: 'Open JSON File'
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return selected;
}

async function handleOpenJson() {
  const selectedPath = await promptOpenJsonPath();

  if (!selectedPath) {
    return;
  }

  try {
    const result = await tauriCore.invoke('read_text_file', { path: selectedPath });
    state.jsonText = result.content;
    state.jsonFile = result.file;
    refreshJsonResult();
    updateStatus(`Opened ${result.file.name}`);
    showToast('JSON loaded');
  } catch (error) {
    showToast(String(error));
    updateStatus('Open failed');
  }
}

function handleFormatJson(minify) {
  if (!state.jsonText.trim()) {
    showToast('Paste JSON first');
    return;
  }

  if (!refreshJsonResult({ minify, replaceInput: true })) {
    showToast('Fix JSON parse errors first');
    updateStatus('JSON parse error');
    return;
  }

  updateStatus(minify ? 'JSON minified' : 'JSON beautified');
  showToast(minify ? 'Minified JSON' : 'Beautified JSON');
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const temp = document.createElement('textarea');
  temp.value = value;
  temp.setAttribute('readonly', '');
  temp.style.position = 'fixed';
  temp.style.opacity = '0';
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  temp.remove();
}

async function handleCopyJsonResult() {
  if (!state.jsonResult && !refreshJsonResult()) {
    showToast('No valid JSON result to copy');
    return;
  }

  await copyText(state.jsonResult);
  updateStatus('Copied JSON result');
  showToast('Copied result');
}

async function handleSaveJsonResult() {
  if (!state.jsonResult && !refreshJsonResult()) {
    showToast('No valid JSON result to save');
    return;
  }

  const defaultPath = state.jsonFile?.path || 'formatted.json';
  const selectedPath = await tauriDialog.save({
    defaultPath,
    title: 'Save JSON Result',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (!selectedPath) {
    return;
  }

  try {
    const targetPath = selectedPath.endsWith('.json') ? selectedPath : `${selectedPath}.json`;
    const filePath = await tauriCore.invoke('write_text_file', {
      path: targetPath,
      content: state.jsonResult
    });
    state.jsonFile = {
      path: filePath,
      name: filePath.split('/').pop()
    };
    renderJsonTool();
    queueJsonToolPersist();
    updateStatus(`Saved ${state.jsonFile.name}`);
    showToast('Saved JSON');
  } catch (error) {
    showToast(String(error));
    updateStatus('Save failed');
  }
}

async function promptOpenLogPath() {
  const selected = await tauriDialog.open({
    multiple: false,
    directory: false,
    filters: [
      { name: 'Logs', extensions: ['log', 'out', 'err', 'trace'] },
      { name: 'Text', extensions: ['txt', 'md', 'json', 'csv'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    title: 'Open Log File'
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return selected;
}

async function handleOpenLog() {
  const selectedPath = await promptOpenLogPath();

  if (!selectedPath) {
    return;
  }

  try {
    const result = await tauriCore.invoke('read_text_file', { path: selectedPath });
    state.logText = result.content;
    state.logFile = result.file;
    state.logActiveMatchIndex = -1;
    renderLogTool();
    scrollActiveLogMatch({ smooth: false });
    queueLogToolPersist();
    updateStatus(`Opened ${result.file.name}`);
    showToast('Log loaded');
  } catch (error) {
    showToast(String(error));
    updateStatus('Open failed');
  }
}

function clearLogTool() {
  state.logText = '';
  state.logFile = null;
  state.logQuery = '';
  state.logLevel = 'all';
  state.logMatches = [];
  state.logActiveMatchIndex = -1;
  refs.logLineJump.value = '';
  renderLogTool();
  queueLogToolPersist();
  updateStatus('Log cleared');
}

function navigateLogMatch(direction) {
  if (!state.logMatches.length) {
    showToast('No matches');
    return;
  }

  state.logActiveMatchIndex =
    (state.logActiveMatchIndex + direction + state.logMatches.length) % state.logMatches.length;
  renderLogTool();
  scrollActiveLogMatch();
}

function handleJumpToLogLine() {
  const line = Number(refs.logLineJump.value);

  if (!Number.isInteger(line) || line < 1) {
    showToast('Enter a line number');
    return;
  }

  if (!scrollToLogLine(line)) {
    showToast('Line is hidden by the current filter');
    return;
  }

  updateStatus(`Jumped to line ${line}`);
}

async function handleCopyVisibleLog() {
  const visibleText = getVisibleLogRows().map((row) => row.text).join('\n');

  if (!visibleText) {
    showToast('No visible log lines to copy');
    return;
  }

  await copyText(visibleText);
  updateStatus('Copied visible logs');
  showToast('Copied visible lines');
}

function buildSuggestedExportName() {
  const left = sanitizeFileNameSegment(state.leftFile?.name, 'original');
  const right = sanitizeFileNameSegment(state.rightFile?.name, 'modified');
  return `${left}-vs-${right}-diff`;
}

function buildExportDocument() {
  const statsHtml = refs.stats.innerHTML || '<span class="badge">No changes yet</span>';
  const subtitle = [
    state.mode === 'side' ? 'Side by Side' : 'Inline',
    state.ignoreWhitespace ? 'Ignore whitespace' : null,
    state.ignoreCase ? 'Ignore case' : null
  ]
    .filter(Boolean)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(buildSuggestedExportName())}</title>
  <style>${EXPORT_CSS}</style>
</head>
<body>
  <div class="shell">
    <div class="head">
      <span class="eyebrow">ElDiff Export</span>
      <h1>${esc(buildSuggestedExportName())}</h1>
      <div class="meta">${esc(subtitle || 'Text comparison snapshot')}</div>
      <div class="stats">${statsHtml.replace(/stat-badge/g, 'badge')}</div>
    </div>
    <div class="body">${refs.diffOut.innerHTML}</div>
  </div>
</body>
</html>`;
}

async function handleExportDiff() {
  const selectedPath = await tauriDialog.save({
    defaultPath: `${buildSuggestedExportName()}.html`,
    title: 'Export Diff',
    filters: [{ name: 'HTML', extensions: ['html'] }]
  });

  if (!selectedPath) {
    return;
  }

  try {
    const targetPath = selectedPath.endsWith('.html') ? selectedPath : `${selectedPath}.html`;
    await tauriCore.invoke('write_text_file', {
      path: targetPath,
      content: buildExportDocument()
    });
    updateStatus('Exported diff');
    showToast(`Exported to ${targetPath.split('/').pop()}`);
  } catch (error) {
    showToast(String(error));
    updateStatus('Export failed');
  }
}

async function handleReopenComparison(id) {
  try {
    const result = await tauriCore.invoke('reopen_comparison', { id });
    applySession(result.session);
    state.recentComparisons = result.recentComparisons || [];
    state.historyOpen = false;
    updateStatus('Restored comparison');
    render();
  } catch (error) {
    showToast(String(error));
  }
}

async function handleClearHistory() {
  state.recentComparisons = await tauriCore.invoke('clear_history');
  renderHistory();
  showToast('History cleared');
}

function clearComparison() {
  applySession({
    leftText: '',
    rightText: '',
    leftFile: null,
    rightFile: null,
    mode: 'side',
    ignoreWhitespace: false,
    ignoreCase: false
  });
  updateStatus('New comparison');
  render();
  queuePersist();
}

function setActiveTool(tool) {
  state.activeTool = ['diff', 'json', 'log'].includes(tool) ? tool : 'diff';

  if (state.activeTool !== 'diff') {
    state.historyOpen = false;
  }

  render();
  queueJsonToolPersist();
  queueLogToolPersist();
}

function bindEvents() {
  refs.tabDiff.addEventListener('click', () => {
    setActiveTool('diff');
  });

  refs.tabJson.addEventListener('click', () => {
    setActiveTool('json');
  });

  refs.tabLog.addEventListener('click', () => {
    setActiveTool('log');
  });

  refs.taLeft.addEventListener('input', () => {
    state.leftText = refs.taLeft.value;
    renderDiff();
    queuePersist();
  });

  refs.taRight.addEventListener('input', () => {
    state.rightText = refs.taRight.value;
    renderDiff();
    queuePersist();
  });

  refs.chkWhitespace.addEventListener('change', () => {
    state.ignoreWhitespace = refs.chkWhitespace.checked;
    renderDiff();
    queuePersist();
  });

  refs.chkCase.addEventListener('change', () => {
    state.ignoreCase = refs.chkCase.checked;
    renderDiff();
    queuePersist();
  });

  refs.btnSide.addEventListener('click', () => {
    state.mode = 'side';
    render();
    queuePersist();
  });

  refs.btnInline.addEventListener('click', () => {
    state.mode = 'inline';
    render();
    queuePersist();
  });

  refs.btnHistory.addEventListener('click', () => {
    state.historyOpen = !state.historyOpen;
    renderHistory();
  });

  refs.btnClearHistory.addEventListener('click', () => {
    handleClearHistory().catch((error) => showToast(error.message));
  });

  refs.historyList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-history-id]');
    if (!button) {
      return;
    }

    handleReopenComparison(button.getAttribute('data-history-id')).catch((error) => showToast(error.message));
  });

  refs.btnOpenLeft.addEventListener('click', () => {
    handleOpenFile('left').catch((error) => showToast(error.message));
  });

  refs.btnOpenRight.addEventListener('click', () => {
    handleOpenFile('right').catch((error) => showToast(error.message));
  });

  refs.btnSaveLeft.addEventListener('click', () => {
    handleSavePane('left').catch((error) => showToast(error.message));
  });

  refs.btnSaveRight.addEventListener('click', () => {
    handleSavePane('right').catch((error) => showToast(error.message));
  });

  refs.btnExport.addEventListener('click', () => {
    handleExportDiff().catch((error) => showToast(error.message));
  });

  refs.jsonInput.addEventListener('input', () => {
    state.jsonText = refs.jsonInput.value;

    if (!refreshJsonResult()) {
      queueJsonToolPersist();
    }
  });

  refs.jsonIndent.addEventListener('change', () => {
    state.jsonIndent = refs.jsonIndent.value;

    if (!refreshJsonResult()) {
      queueJsonToolPersist();
    }
  });

  refs.btnOpenJson.addEventListener('click', () => {
    handleOpenJson().catch((error) => showToast(error.message));
  });

  refs.btnJsonBeautify.addEventListener('click', () => {
    handleFormatJson(false);
  });

  refs.btnJsonMinify.addEventListener('click', () => {
    handleFormatJson(true);
  });

  refs.btnJsonCopy.addEventListener('click', () => {
    handleCopyJsonResult().catch((error) => showToast(String(error)));
  });

  refs.btnJsonSave.addEventListener('click', () => {
    handleSaveJsonResult().catch((error) => showToast(String(error)));
  });

  refs.logInput.addEventListener('input', () => {
    state.logText = refs.logInput.value;
    state.logFile = null;
    state.logActiveMatchIndex = -1;
    renderLogTool();
    queueLogToolPersist();
  });

  refs.logSearch.addEventListener('input', () => {
    state.logQuery = refs.logSearch.value;
    state.logActiveMatchIndex = -1;
    renderLogTool();
    scrollActiveLogMatch({ smooth: false });
    queueLogToolPersist();
  });

  refs.logLevel.addEventListener('change', () => {
    state.logLevel = refs.logLevel.value;
    state.logActiveMatchIndex = -1;
    renderLogTool();
    scrollActiveLogMatch({ smooth: false });
    queueLogToolPersist();
  });

  refs.btnOpenLog.addEventListener('click', () => {
    handleOpenLog().catch((error) => showToast(String(error)));
  });

  refs.btnLogCopyVisible.addEventListener('click', () => {
    handleCopyVisibleLog().catch((error) => showToast(String(error)));
  });

  refs.btnLogClear.addEventListener('click', () => {
    clearLogTool();
  });

  refs.btnLogPrev.addEventListener('click', () => {
    navigateLogMatch(-1);
  });

  refs.btnLogNext.addEventListener('click', () => {
    navigateLogMatch(1);
  });

  refs.btnLogJump.addEventListener('click', () => {
    handleJumpToLogLine();
  });

  refs.logLineJump.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleJumpToLogLine();
    }
  });

  refs.logOutput.addEventListener('click', (event) => {
    const jsonToggle = event.target.closest('.log-token-json');
    if (jsonToggle) {
      const lineText = jsonToggle.closest('.log-line-text');
      const block = lineText?.querySelector('.log-json-block');

      if (block) {
        const expanded = block.hidden;
        block.hidden = !expanded;
        jsonToggle.classList.toggle('expanded', expanded);
      }
      return;
    }

    const button = event.target.closest('[data-log-jump-line]');
    if (!button) {
      return;
    }

    refs.logLineJump.value = button.getAttribute('data-log-jump-line');
  });

  document.addEventListener('click', (event) => {
    if (
      state.historyOpen &&
      !refs.historyPanel.contains(event.target) &&
      !refs.btnHistory.contains(event.target)
    ) {
      state.historyOpen = false;
      renderHistory();
    }
  });

  document.addEventListener('keydown', (event) => {
    const meta = event.metaKey || event.ctrlKey;

    if (!meta) {
      return;
    }

    if (event.key === '1' && event.shiftKey) {
      event.preventDefault();
      setActiveTool('diff');
      return;
    }

    if (event.key === '2' && event.shiftKey) {
      event.preventDefault();
      setActiveTool('json');
      return;
    }

    if (event.key === '3' && event.shiftKey) {
      event.preventDefault();
      setActiveTool('log');
      return;
    }

    if (state.activeTool === 'json') {
      if (event.key === 'o') {
        event.preventDefault();
        handleOpenJson().catch((error) => showToast(String(error)));
        return;
      }

      if (event.key === 's') {
        event.preventDefault();
        handleSaveJsonResult().catch((error) => showToast(String(error)));
        return;
      }

      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        handleFormatJson(false);
        return;
      }

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        handleFormatJson(true);
        return;
      }

      return;
    }

    if (state.activeTool === 'log') {
      if (event.key === 'o') {
        event.preventDefault();
        handleOpenLog().catch((error) => showToast(String(error)));
        return;
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        refs.logSearch.focus();
        refs.logSearch.select();
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        event.preventDefault();
        navigateLogMatch(event.shiftKey ? -1 : 1);
        return;
      }

      if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        refs.logLineJump.focus();
        refs.logLineJump.select();
        return;
      }

      return;
    }

    if (event.key === 'n') {
      event.preventDefault();
      clearComparison();
      return;
    }

    if (event.key === 'o' && event.shiftKey) {
      event.preventDefault();
      handleOpenFile('right').catch((error) => showToast(String(error)));
      return;
    }

    if (event.key === 'o') {
      event.preventDefault();
      handleOpenFile('left').catch((error) => showToast(String(error)));
      return;
    }

    if (event.key === 's' && event.shiftKey) {
      event.preventDefault();
      handleSavePane('right').catch((error) => showToast(String(error)));
      return;
    }

    if (event.key === 's') {
      event.preventDefault();
      handleSavePane('left').catch((error) => showToast(String(error)));
      return;
    }

    if (event.key === 'e') {
      event.preventDefault();
      handleExportDiff().catch((error) => showToast(String(error)));
      return;
    }

    if (event.key === '1') {
      event.preventDefault();
      state.mode = 'side';
      render();
      queuePersist();
      return;
    }

    if (event.key === '2') {
      event.preventDefault();
      state.mode = 'inline';
      render();
      queuePersist();
      return;
    }

    if (event.altKey && event.key.toLowerCase() === 'w') {
      event.preventDefault();
      state.ignoreWhitespace = !state.ignoreWhitespace;
      render();
      queuePersist();
      return;
    }

    if (event.altKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      state.ignoreCase = !state.ignoreCase;
      render();
      queuePersist();
    }
  });

  window.addEventListener('beforeunload', () => {
    clearTimeout(persistTimer);
    clearTimeout(jsonPersistTimer);
    clearTimeout(logPersistTimer);
    try {
      saveJsonToolState();
      saveLogToolState();
    } catch {
      // Ignore localStorage quota issues during shutdown.
    }
  });
}

async function init() {
  ensureTauri();
  loadJsonToolState();
  loadLogToolState();
  const loaded = await tauriCore.invoke('load_state');
  applySession(loaded.session || {});
  state.recentComparisons = loaded.recentComparisons || [];
  bindNativeWindowDrag();
  bindEvents();
  render();
  updateStatus(
    state.activeTool === 'json' && state.jsonText
      ? 'JSON restored'
      : state.activeTool === 'log' && state.logText
        ? 'Log restored'
      : state.leftText || state.rightText
        ? 'Session restored'
        : 'Ready'
  );
}

init().catch((error) => {
  showToast(error.message);
  updateStatus('Startup error');
});
