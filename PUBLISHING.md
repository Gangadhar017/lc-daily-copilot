# Publishing LC Daily Copilot

This guide covers publishing to Microsoft Edge Add-ons and Firefox Add-ons
(both free), plus GitHub distribution. Chrome Web Store steps are included at
the end for whenever the one-time $5 developer fee becomes an option.

## Packages

Run the build first:

```
node tools/make-icons.js   # only needed if icons/ is missing
node tools/build.js
```

| Package | Contents | For |
|---|---|---|
| `dist/lc-daily-copilot-chromium.zip` | Manifest V3 (service worker) | Edge Add-ons, Chrome Web Store |
| `dist/lc-daily-copilot-firefox.zip` | MV3 + `browser_specific_settings.gecko` | Firefox Add-ons (AMO) |

`manifest.json` is at the **root** of each zip, as the stores require.

---

## Microsoft Edge Add-ons (free)

1. Sign in at <https://partner.microsoft.com/dashboard/microsoftedge> with a
   **Microsoft account** (create one for free if needed).
2. First time: enroll in the Microsoft Edge Program — individual account,
   verify your email. No fee.
3. **Create new extension** → upload
   `dist/lc-daily-copilot-chromium.zip`.
4. Fill the listing:
   - Name: `LC Daily Copilot`
   - Description: reuse the README's first paragraphs.
   - Store icon: `icons/icon128.png` (128×128).
   - Screenshots: 1–5 PNGs, 1280×800 recommended — capture the panel open on
     a problem page and the popup.
   - Website / Support URL: the GitHub repo URL.
   - Privacy policy URL:
     `https://github.com/Gangadhar017/lc-daily-copilot/blob/main/PRIVACY.md`
5. Submit for review — Edge review typically takes about a week. You'll get
   an email when it's published.

## Firefox Add-ons / AMO (free)

1. Create a free Mozilla account and sign in at
   <https://addons.mozilla.org/developers/>.
2. **Submit a New Add-on** → "On this site" → upload
   `dist/lc-daily-copilot-firefox.zip`. The code is unminified, so no separate
   source upload is required.
3. Listing: name, summary (≤250 chars), description, screenshots
   (1280×1024 or smaller), icon `icons/icon128.png`.
4. Privacy policy URL: same GitHub `PRIVACY.md` link as above.
5. After passing review (usually a few days), AMO signs the add-on and it
   installs for everyone.

**Firefox quirk to document in your listing:** Firefox grants host
permissions per site. If solving fails with a network error, users must open
`about:addons` → LC Daily Copilot → **Permissions** → and enable "Access your
data for leetcode.com" (and Google). One sentence in the add-on description
avoids most 1-star reviews.

## GitHub distribution (free, instant)

The repo is the source of truth: source, privacy policy, and releases.

1. Users can **Download ZIP** of the repo and load it unpacked
   (chrome://extensions → Developer mode → Load unpacked).
2. Optionally publish versioned releases with the built zips attached so
   users always get a working snapshot.

## Chrome Web Store (when the $5 is possible)

1. Register at <https://chrome.google.com/webstore/devconsole> ($5, one-time).
2. **New item** → upload `dist/lc-daily-copilot-chromium.zip`.
3. Icon `icons/icon128.png`, at least one 1280×800 screenshot, privacy policy
   URL (GitHub `PRIVACY.md`).
4. In **Privacy practices**, declare that the extension does not collect user
   data (it doesn't — the API key stays local and goes only to Google).
5. Submit. Review usually takes a few days to ~2 weeks.

## Updating any store

1. Bump `"version"` in **both** `manifest.json` and `manifest.firefox.json`
   (e.g. `1.0.0` → `1.0.1`).
2. `node tools/build.js`, re-zip, upload the new zip on the store dashboard,
   submit.
