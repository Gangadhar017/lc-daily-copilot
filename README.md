# LC Daily Copilot

A Chrome extension (Manifest V3) that keeps today's LeetCode **Daily Challenge** one click away:

1. The popup shows today's daily problem (title + difficulty) with a button to open it.
2. On any free problem page (`leetcode.com/problems/...`), a small panel fetches the problem and asks **Gemini** to draft a full solution — with a built-in self-review pass that traces the draft against the sample test cases before showing it to you.
3. You review the draft, hit **Copy** or **Insert**, and **you press Submit yourself** in your own logged-in browser.

That last part is by design: the extension never submits on your behalf, never touches contests, and has no anti-detection features of any kind. It is a drafting/hint tool — the click is yours.

## Install

1. Open `chrome://extensions` in Chrome (or Edge/Brave — anything Chromium).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `leetcode-daily-helper` folder.

## Setup

1. Get a free Gemini API key at <https://aistudio.google.com/apikey>.
2. Click the extension icon → **Settings (API key)** (or right-click the icon → Options).
3. Paste the key, optionally pick a default language, and **Save**.

The key is stored only in your browser (`chrome.storage.local`) and sent only to Google's Gemini API endpoint.

## Daily flow

1. Click the ⚡ extension icon → see today's problem → **Open today's problem**.
2. On the problem page, the ⚡ launcher appears bottom-right; open the panel.
3. Pick a language → **Solve with Gemini** (takes ~20–60s; it generates a draft, then runs a second review pass).
4. **Copy** (or **Insert (beta)** — tries to write into LeetCode's Monaco editor directly).
5. Read the code, press **Submit** yourself, and watch the verdict.

If the judge rejects it, paste the error ("Wrong Answer: output 5, expected 3", "TLE on test 87", …) into the feedback box and press **Fix with feedback** — the previous code plus your feedback goes back to Gemini for a corrected draft.

## Honest limitations

- **Hidden test cases are not accessible to anyone.** The extension can only sanity-check against the visible samples (via the Gemini review pass). On Hard problems especially, expect to use the Fix loop occasionally.
- **Premium problems are unsupported** — LeetCode doesn't return their statements.
- **Insert (beta)** depends on LeetCode's page exposing the Monaco editor instance; if it can't, the code is copied to the clipboard instead.
- If Gemini API calls fail, check the model name in Settings (Google renames models periodically; default is `gemini-2.5-flash`) and your API key quota.

## Firefox note

Firefox grants host permissions per site. If solving fails with a network
error, open `about:addons` → LC Daily Copilot → **Permissions** → enable
"Access your data for leetcode.com" (and for Google).

## Build & publish

```
node tools/make-icons.js   # regenerate icon PNGs (only if missing)
node tools/build.js        # assembles dist/chromium + dist/firefox
```

Store submission steps (Edge Add-ons and Firefox AMO are **free**; Chrome Web
Store has a one-time $5 developer fee) are in [PUBLISHING.md](PUBLISHING.md).
Store-ready packages land in `dist/` as `lc-daily-copilot-chromium.zip`
(Edge/Chrome) and `lc-daily-copilot-firefox.zip` (Firefox).

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest for Chrome/Edge |
| `manifest.firefox.json` | MV3 manifest for Firefox (adds gecko ID) |
| `background.js` | Service worker: LeetCode GraphQL fetches + Gemini calls + prompts |
| `content.js` | The floating panel on problem pages |
| `content.css` | Panel styles |
| `popup.html` / `popup.js` | Toolbar popup showing today's daily challenge |
| `options.html` / `options.js` | API key, model, and default language settings |
| `icons/` | Generated icon set (`tools/make-icons.js`) |
| `tools/build.js` | Assembles store packages into `dist/` |
| `PRIVACY.md` | Privacy policy (store listings link here) |
| `PUBLISHING.md` | Step-by-step store submission guide |

## License

MIT — see [LICENSE](LICENSE).
