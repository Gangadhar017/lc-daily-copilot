// LC Daily Copilot - background service worker.
// Does all network work (LeetCode GraphQL + Gemini API) so content scripts
// never make cross-origin requests themselves.

const DEFAULT_MODEL = 'gemini-2.5-flash';
const STATEMENT_CHAR_LIMIT = 20000;

async function getSettings() {
  return chrome.storage.local.get({ apiKey: '', model: DEFAULT_MODEL, lang: 'python3' });
}

async function graphql(query, variables, operationName) {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables, operationName }),
  });
  if (!res.ok) throw new Error('LeetCode request failed (HTTP ' + res.status + ').');
  const data = await res.json();
  if (data.errors && data.errors.length) {
    throw new Error('LeetCode API error: ' + data.errors[0].message);
  }
  return data.data;
}

async function fetchQuestion(titleSlug) {
  const query = `
    query questionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
        title
        titleSlug
        difficulty
        content
        codeSnippets { lang langSlug code }
        exampleTestcaseList
        topicTags { name }
      }
    }`;
  const data = await graphql(query, { titleSlug }, 'questionDetail');
  const q = data && data.question;
  if (!q) throw new Error('Problem not found. It may be premium or the URL slug is wrong.');
  return q;
}

async function fetchDaily() {
  const query = `
    query activeDailyCodingChallengeQuestion {
      activeDailyCodingChallengeQuestion {
        date
        link
        question {
          questionFrontendId
          title
          titleSlug
          difficulty
        }
      }
    }`;
  const data = await graphql(query, {}, 'activeDailyCodingChallengeQuestion');
  if (!data || !data.activeDailyCodingChallengeQuestion) {
    throw new Error('Could not fetch the daily challenge.');
  }
  return data.activeDailyCodingChallengeQuestion;
}

function stripHtml(html) {
  if (!html) return '';
  let t = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|pre|li|ul|ol|tr|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '');
  const entities = {
    '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&nbsp;': ' ', '&minus;': '-', '&times;': '*', '&divide;': '/',
  };
  t = t.replace(/&[a-zA-Z#0-9]+;/g, (m) => (m in entities ? entities[m] : m))
       .replace(/&amp;/g, '&')
       .replace(/[ \t]+\n/g, '\n')
       .replace(/\n{3,}/g, '\n\n')
       .trim();
  return t;
}

function extractCodeBlock(text) {
  const matches = [...String(text).matchAll(/```[a-zA-Z0-9+#.-]*\r?\n([\s\S]*?)```/g)];
  if (matches.length) return matches[matches.length - 1][1].trim();
  return String(text).trim();
}

function statementSection(question) {
  const statement = stripHtml(question.content).slice(0, STATEMENT_CHAR_LIMIT);
  if (!statement) throw new Error('Problem statement is empty. It may be a premium problem.');
  return statement;
}

function buildPrompt(question, langSlug) {
  const snippet = (question.codeSnippets || []).find((s) => s.langSlug === langSlug);
  const starter = snippet ? snippet.code : '(Starter code unavailable for this language.)';
  const samples = (question.exampleTestcaseList || []).join('\n');
  return [
    'You are an expert competitive programmer. Solve this LeetCode problem.',
    'Problem: ' + question.questionFrontendId + '. ' + question.title + ' (' + question.difficulty + ')',
    '',
    'PROBLEM STATEMENT:',
    statementSection(question),
    '',
    'STARTER CODE (keep these exact class/function names and signatures):',
    '```', starter, '```',
    '',
    'SAMPLE TEST CASE INPUTS (one case per line, arguments in order):',
    samples || '(none provided)',
    '',
    'Write a complete, correct, and optimal solution in ' + langSlug + '.',
    'Rules:',
    '- Return exactly ONE fenced code block containing ONLY the full solution file.',
    '- Keep the exact signature from the starter code; read input only from the function arguments.',
    '- Standard library only. No explanations, no test code, no console printing.',
    '- Aim for the optimal complexity the constraints allow.',
  ].join('\n');
}

function buildReviewPrompt(question, langSlug, code) {
  const samples = (question.exampleTestcaseList || []).join('\n');
  return [
    'You are reviewing a candidate solution before it is submitted to LeetCode.',
    'Problem: ' + question.questionFrontendId + '. ' + question.title + ' (' + question.difficulty + ')',
    '',
    'PROBLEM STATEMENT:',
    statementSection(question),
    '',
    'SAMPLE TEST CASE INPUTS:',
    samples || '(none provided)',
    '',
    'CANDIDATE SOLUTION (' + langSlug + '):',
    '```', code, '```',
    '',
    'Trace the code by hand against EACH sample input. Also check that it compiles,',
    'matches the required signature, and handles edge cases implied by the constraints.',
    'If it is correct, output the exact same code block unchanged.',
    'If anything is wrong, output the corrected FULL solution.',
    'Output exactly ONE fenced code block and nothing else.',
  ].join('\n');
}

async function callGemini(prompt, apiKey, model) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error('Gemini API error ' + res.status + ': ' + ((data && data.error && data.error.message) || 'unknown'));
  }
  const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts) || [];
  const text = parts.map((p) => p.text || '').join('');
  if (!text.trim()) {
    throw new Error('Gemini returned an empty response (quota, safety filter, or wrong model name).');
  }
  return text;
}

async function handleSolve(msg) {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new Error('No Gemini API key set. Right-click the extension icon > Options to add one.');
  const question = await fetchQuestion(msg.slug);
  const first = extractCodeBlock(await callGemini(buildPrompt(question, msg.lang), apiKey, model));
  // Best-effort self-review pass: trace samples, fix if broken.
  let final = first;
  try {
    const reviewed = extractCodeBlock(await callGemini(buildReviewPrompt(question, msg.lang, first), apiKey, model));
    if (reviewed) final = reviewed;
  } catch (e) {
    // Review is optional; keep the first draft if the review call fails.
  }
  return {
    code: final,
    question: {
      title: question.title,
      difficulty: question.difficulty,
      languages: (question.codeSnippets || []).map((s) => s.langSlug),
    },
  };
}

async function handleFix(msg) {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new Error('No Gemini API key set. Right-click the extension icon > Options to add one.');
  const question = await fetchQuestion(msg.slug);
  const prompt = [
    buildPrompt(question, msg.lang),
    '',
    'A PREVIOUS ATTEMPT FAILED. Here is the previous code:',
    '```', msg.previousCode, '```',
    '',
    'Failure feedback from the judge or user:',
    msg.feedback,
    '',
    'Fix the bug(s) and return the corrected FULL solution. Same rules: ONE code block only.',
  ].join('\n');
  return { code: extractCodeBlock(await callGemini(prompt, apiKey, model)) };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'daily') {
        sendResponse({ ok: true, data: await fetchDaily() });
      } else if (msg.type === 'question') {
        sendResponse({ ok: true, data: await fetchQuestion(msg.slug) });
      } else if (msg.type === 'solve') {
        sendResponse({ ok: true, ...(await handleSolve(msg)) });
      } else if (msg.type === 'fix') {
        sendResponse({ ok: true, ...(await handleFix(msg)) });
      } else {
        sendResponse({ ok: false, error: 'Unknown message type: ' + msg.type });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String((e && e.message) || e) });
    }
  })();
  return true; // keep the message channel open for the async response
});

chrome.runtime.onInstalled.addListener(async () => {
  const { apiKey } = await getSettings();
  if (!apiKey) chrome.runtime.openOptionsPage();
});
