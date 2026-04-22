const state = {
  leftText: '',
  rightText: '',
  leftFile: null,
  rightFile: null,
  mode: 'side',
  ignoreWhitespace: false,
  ignoreCase: false,
  recentComparisons: [],
  historyOpen: false
};

const refs = {
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
  btnExport: document.getElementById('btn-export')
};

let toastTimer = null;
let persistTimer = null;

const tauriCore = window.__TAURI__?.core;
const tauriDialog = window.__TAURI__?.dialog;

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
    --text: rgba(17,24,39,0.94);
    --text-muted: rgba(62,72,92,0.72);
    --surface: rgba(255,255,255,0.82);
    --surface-soft: rgba(255,255,255,0.58);
    --border: rgba(206,216,236,0.78);
    --green: rgba(52,199,89,0.18);
    --green-text: #16753a;
    --red: rgba(255,69,58,0.18);
    --red-text: #b93028;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --text: rgba(247,250,255,0.96);
      --text-muted: rgba(213,221,239,0.76);
      --surface: rgba(18,23,36,0.88);
      --surface-soft: rgba(31,37,54,0.86);
      --border: rgba(255,255,255,0.12);
      --green: rgba(52,199,89,0.2);
      --green-text: #52d67c;
      --red: rgba(255,69,58,0.22);
      --red-text: #ff8a83;
    }
    body {
      background: linear-gradient(150deg, #090d17 0%, #101728 28%, #14182f 54%, #16142c 74%, #0c1d26 100%);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px;
    color: var(--text);
    font-family: var(--font-sans);
    background: linear-gradient(145deg, #edf5ff 0%, #e3effd 16%, #eef2ff 34%, #f8eef9 56%, #ebfff6 100%);
  }
  .shell {
    max-width: 1200px;
    margin: 0 auto;
    border-radius: 26px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: 0 24px 90px rgba(8,18,44,0.18);
    overflow: hidden;
  }
  .head {
    padding: 24px 28px 18px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, var(--surface-soft), transparent);
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
    background: rgba(112,123,145,0.14);
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
  .c-add { background: rgba(52,199,89,0.2); color: var(--green-text); }
  .c-del { background: rgba(255,69,58,0.22); color: var(--red-text); text-decoration: line-through; }
`;

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ensureTauri() {
  if (!tauriCore?.invoke || !tauriDialog?.open || !tauriDialog?.save) {
    throw new Error('Tauri API unavailable');
  }
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
  renderDiff();
  renderHistory();
  refs.appearancePill.textContent = matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark glass'
    : 'light glass';
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

function bindEvents() {
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
  });
}

async function init() {
  ensureTauri();
  const loaded = await tauriCore.invoke('load_state');
  applySession(loaded.session || {});
  state.recentComparisons = loaded.recentComparisons || [];
  bindEvents();
  render();
  updateStatus(state.leftText || state.rightText ? 'Session restored' : 'Ready');
}

init().catch((error) => {
  showToast(error.message);
  updateStatus('Startup error');
});
