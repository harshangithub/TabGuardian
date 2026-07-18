# Tab Guardian (Microsoft Edge Manifest V3)

Tab Guardian is a production-ready Manifest V3 extension for Microsoft Edge that monitors tabs only while one or more trigger tabs are open.

## Features

- Manifest V3 service worker architecture
- Modular background system (`listener`, `matcher`, `storage`, `badge`, `logger`)
- `chrome.storage.sync` settings with:
  - Multiple trigger websites
  - Multiple whitelist rules
  - Optional block notifications
  - Dark mode preference
- Whitelist rule formats:
  - Exact URL: `https://example.com/page`
  - Wildcard: `https://*.google.com/*`
  - Regex: `regex:^https://(www\.)?github\.com/.*`
- Event-driven tab enforcement (no polling)
- Popup dashboard showing:
  - Listening / Inactive status
  - Current trigger tab count
  - Blocked tab count for today
- Options page for:
  - Add/remove trigger websites
  - Add/remove whitelist rules
  - Import/export JSON settings
  - Dark mode toggle
  - Validation for exact/wildcard/regex patterns
- Badge states:
  - Gray: Inactive
  - Green: Listening
  - Red: Tab blocked
- Logger stores last 100 blocked URLs with timestamp and reason

## Project Structure

```text
manifest.json

/background
  background.js
  listener.js
  matcher.js
  storage.js
  badge.js
  logger.js

/options
  options.html
  options.css
  options.js

/popup
  popup.html
  popup.css
  popup.js

/assets/icons

README.md
```

## How Monitoring Works

1. Extension watches tab URL updates to detect trigger websites.
2. When the first trigger tab is detected, monitoring starts.
3. While monitoring is active:
   - New tab creation is checked.
   - URL updates in existing tabs are checked.
4. If URL matches whitelist: tab remains open.
5. If URL does not match whitelist: tab is closed immediately.
6. When all trigger tabs are closed or leave trigger URLs, monitoring stops.

## Install in Microsoft Edge

1. Open Edge and go to `edge://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository folder:
   - `/home/runner/work/TabGuardian/TabGuardian`

## Notes

- Requires `tabs`, `storage`, and `notifications` permissions.
- Uses `chrome.storage.local` for block logs/counters and `chrome.storage.sync` for user settings.
- The service worker intentionally avoids duplicate event listener registration.
