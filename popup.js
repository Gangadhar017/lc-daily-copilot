// LC Daily Copilot - popup: shows today's daily coding challenge.

document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('status');
  const daily = document.getElementById('daily');
  const error = document.getElementById('error');
  const openBtn = document.getElementById('open');

  document.getElementById('opts').addEventListener('click', () => chrome.runtime.openOptionsPage());

  try {
    const res = await chrome.runtime.sendMessage({ type: 'daily' });
    if (!res) throw new Error('No response from background worker.');
    if (!res.ok) throw new Error(res.error || 'Unknown error.');
    const d = res.data;

    document.getElementById('date').textContent = 'Daily challenge \u00B7 ' + d.date;
    document.getElementById('title').textContent =
      d.question.questionFrontendId + '. ' + d.question.title;
    const badge = document.getElementById('badge');
    badge.textContent = d.question.difficulty;
    badge.classList.add(d.question.difficulty);

    daily.hidden = false;
    status.hidden = true;
    openBtn.hidden = false;
    openBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://leetcode.com' + d.link });
      window.close();
    });
  } catch (e) {
    status.hidden = true;
    error.hidden = false;
    error.textContent = 'Error: ' + e.message;
  }
});
