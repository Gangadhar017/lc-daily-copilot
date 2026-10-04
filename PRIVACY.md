# Privacy Policy — LC Daily Copilot

_Last updated: 2026-10-04_

LC Daily Copilot is a browser extension that shows the LeetCode Daily Challenge
and drafts solution code using Google's Gemini API. This policy explains what
the extension stores and where data goes.

## What the extension stores

- **Your Gemini API key** — stored **only in your browser's local extension
  storage** (`chrome.storage.local`). It never leaves your device except in
  requests made directly from your browser to Google's Gemini API.
- **Your preferences** — default language and model name, also stored only
  locally.

## What the extension sends, and where

The extension has **no backend, no analytics, no tracking, and no developer
servers**. All network activity happens in your browser:

1. **leetcode.com** — the extension requests the daily challenge and the
   current problem's statement, starter code, and sample test cases from
   LeetCode's public GraphQL endpoint, exactly as the LeetCode website itself
   does.
2. **generativelanguage.googleapis.com** — the problem statement (and, if you
   use the fix feature, your feedback text plus the previous code draft) is
   sent **directly from your browser to Google's Gemini API** using your own
   API key, to generate or fix solution code.

The developer of this extension never sees, receives, or stores any of this
data. No data is sold, shared with third parties, or used for advertising.

## What the extension does NOT do

- It does **not** collect browsing history, credentials, or personal data.
- It does **not** submit anything to LeetCode on your behalf — every submission
  is a click you make yourself.
- It does **not** read or modify any website other than `leetcode.com`
  problem pages.

## Third-party services

Use of the Gemini API is subject to [Google's Terms of Service and Privacy
Policy](https://policies.google.com/privacy). Use of LeetCode is subject to
LeetCode's own terms.

## Contact

Questions about this policy: open an issue at the [GitHub
repository](https://github.com/Gangadhar017/lc-daily-copilot) or email
gangadharglau@gmail.com.
