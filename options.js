// LC Daily Copilot - options page.

const DEFAULTS = { apiKey: '', model: 'gemini-2.5-flash', lang: 'python3' };

document.addEventListener('DOMContentLoaded', () => {
  const apiKey = document.getElementById('apiKey');
  const model = document.getElementById('model');
  const lang = document.getElementById('lang');
  const saved = document.getElementById('saved');

  chrome.storage.local.get(DEFAULTS, (s) => {
    apiKey.value = s.apiKey;
    model.value = s.model;
    lang.value = s.lang;
  });

  document.getElementById('save').addEventListener('click', () => {
    chrome.storage.local.set({
      apiKey: apiKey.value.trim(),
      model: model.value.trim() || DEFAULTS.model,
      lang: lang.value,
    }, () => {
      saved.hidden = false;
      setTimeout(() => { saved.hidden = true; }, 2000);
    });
  });
});
