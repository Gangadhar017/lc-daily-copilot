// LC Daily Copilot - content script.
// Floating panel on https://leetcode.com/problems/* pages. Generates a Gemini
// draft; the user reviews it, inserts it, and presses Submit themselves.

(() => {
  const LANGS = [
    ['python3', 'Python3'],
    ['cpp', 'C++'],
    ['java', 'Java'],
    ['javascript', 'JavaScript'],
    ['golang', 'Go'],
    ['c', 'C'],
    ['csharp', 'C#'],
    ['typescript', 'TypeScript'],
  ];

  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const c of children) if (c) el.appendChild(c);
    return el;
  }

  let slug = (location.pathname.match(/\/problems\/([a-z0-9-]+)/i) || [])[1];
  if (!slug) return;

  let lastCode = '';

  const codeBox = h('pre', { id: 'lcdc-code', hidden: '' });
  const status = h('div', { id: 'lcdc-status', text: 'Pick a language and press Solve.' });

  const langSel = h('select', { id: 'lcdc-lang' },
    ...LANGS.map(([v, n]) => h('option', { value: v, text: n })));

  const solveBtn = h('button', { class: 'lcdc-btn primary', text: '\u26A1 Solve with Gemini', onclick: solve });
  const copyBtn = h('button', { class: 'lcdc-btn', text: '\u{1F4CB} Copy', onclick: copyCode, disabled: '' });
  const insertBtn = h('button', { class: 'lcdc-btn', text: '\u2935 Insert (beta)', onclick: insertCode, disabled: '' });
  const fixArea = h('textarea', {
    id: 'lcdc-fix',
    placeholder: 'If the judge rejects it, paste the error here (e.g. "Wrong Answer: output 5, expected 3") and press Fix…',
  });
  const fixBtn = h('button', { class: 'lcdc-btn', text: '\u{1F527} Fix with feedback', onclick: doFix, disabled: '' });

  const body = h('div', { class: 'lcdc-body' },
    h('div', { class: 'lcdc-row' }, langSel, solveBtn),
    status,
    codeBox,
    h('div', { class: 'lcdc-row' }, copyBtn, insertBtn),
    fixArea,
    h('div', { class: 'lcdc-row' }, fixBtn),
  );

  const panel = h('div', { id: 'lcdc-panel' },
    h('div', { class: 'lcdc-head' },
      h('b', { text: '\u26A1 LC Daily Copilot' }),
      h('span', { class: 'lcdc-spacer' }),
      h('button', { class: 'lcdc-icon', text: '\u2013', title: 'Minimize', onclick: () => toggleBody() }),
      h('button', {
        class: 'lcdc-icon', text: '\u00D7', title: 'Close',
        onclick: () => { panel.style.display = 'none'; launcher.style.display = 'block'; },
      }),
    ),
    body,
  );

  const launcher = h('button', {
    id: 'lcdc-launcher', text: '\u26A1', title: 'LC Daily Copilot',
    onclick: () => { panel.style.display = 'flex'; launcher.style.display = 'none'; },
  });

  document.documentElement.appendChild(panel);
  document.documentElement.appendChild(launcher);

  function toggleBody() {
    const hidden = body.style.display === 'none';
    body.style.display = hidden ? '' : 'none';
  }

  function setBusy(busy, text) {
    solveBtn.disabled = busy;
    solveBtn.textContent = busy ? '\u23F3 Working\u2026' : '\u26A1 Solve with Gemini';
    status.textContent = text;
  }

  function setResult(code, note) {
    lastCode = code;
    codeBox.textContent = code;
    codeBox.hidden = false;
    status.textContent = note;
    copyBtn.disabled = insertBtn.disabled = fixBtn.disabled = '';
  }

  function toast(text) {
    const t = h('div', { class: 'lcdc-toast', text });
    panel.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  async function send(message) {
    const res = await chrome.runtime.sendMessage(message);
    if (!res) throw new Error('No response from the background worker (extension reloaded?)');
    if (!res.ok) throw new Error(res.error || 'Unknown error');
    return res;
  }

  async function solve() {
    setBusy(true, 'Fetching the problem and asking Gemini\u2026 this usually takes 20\u201360 seconds.');
    try {
      const res = await send({ type: 'solve', slug, lang: langSel.value });
      setResult(res.code,
        'Draft ready for "' + res.question.title + '" (' + res.question.difficulty + '). ' +
        'Review it, insert, then press Submit yourself.');
    } catch (e) {
      setBusy(false, '\u274C ' + e.message);
      solveBtn.disabled = false;
      return;
    }
    solveBtn.disabled = false;
    solveBtn.textContent = '\u26A1 Solve again';
  }

  async function doFix() {
    const feedback = fixArea.value.trim();
    if (!feedback) { toast('Paste what went wrong first.'); return; }
    fixBtn.disabled = true;
    status.textContent = 'Sending feedback to Gemini\u2026';
    try {
      const res = await send({ type: 'fix', slug, lang: langSel.value, previousCode: lastCode, feedback });
      setResult(res.code, 'Fixed draft ready. Review, insert, and submit yourself.');
    } catch (e) {
      status.textContent = '\u274C ' + e.message;
    } finally {
      fixBtn.disabled = false;
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(lastCode).then(
      () => toast('Copied to clipboard.'),
      () => toast('Clipboard blocked \u2014 select the code manually.')
    );
  }

  function insertCode() {
    try {
      const editors = (window.monaco && window.monaco.editor && window.monaco.editor.getEditors) ? window.monaco.editor.getEditors() : [];
      if (editors && editors.length) {
        editors[0].setValue(lastCode);
        toast('Inserted into the editor \u2014 review it and press Submit.');
        return;
      }
    } catch (e) { /* fall through to clipboard */ }
    navigator.clipboard.writeText(lastCode);
    toast('Could not reach the editor \u2014 copied instead. Click the editor, Ctrl+A, Ctrl+V.');
  }

  // Remember the chosen language.
  chrome.storage.local.get({ lang: 'python3' }, (s) => { langSel.value = s.lang; });
  langSel.addEventListener('change', () => chrome.storage.local.set({ lang: langSel.value }));

  // LeetCode is a SPA: keep the slug current when the user navigates between problems.
  setInterval(() => {
    const m = location.pathname.match(/\/problems\/([a-z0-9-]+)/i);
    if (m && m[1] !== slug) {
      slug = m[1];
      lastCode = '';
      codeBox.hidden = true;
      codeBox.textContent = '';
      fixArea.value = '';
      copyBtn.disabled = insertBtn.disabled = fixBtn.disabled = '';
      status.textContent = 'New problem detected. Press Solve.';
    }
  }, 1000);
})();
