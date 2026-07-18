const BLOCKED_LOG_KEY = "blockedLog";
const BLOCKED_DAY_COUNT_KEY = "blockedDayCounts";
const MAX_BLOCKED_LOG_ITEMS = 100;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Logs a blocked URL with timestamp and reason and updates daily counters. */
export async function logBlockedUrl(url, reason) {
  const now = new Date().toISOString();
  const [{ [BLOCKED_LOG_KEY]: log = [] }, { [BLOCKED_DAY_COUNT_KEY]: dayCounts = {} }] = await Promise.all([
    chrome.storage.local.get(BLOCKED_LOG_KEY),
    chrome.storage.local.get(BLOCKED_DAY_COUNT_KEY)
  ]);

  const nextLog = [{ url, reason, timestamp: now }, ...log].slice(0, MAX_BLOCKED_LOG_ITEMS);
  const key = todayKey();
  const nextDayCounts = { ...dayCounts, [key]: (dayCounts[key] || 0) + 1 };

  await chrome.storage.local.set({
    [BLOCKED_LOG_KEY]: nextLog,
    [BLOCKED_DAY_COUNT_KEY]: nextDayCounts
  });

  return nextLog;
}

/** Returns the number of blocked tabs for today. */
export async function getBlockedToday() {
  const stored = await chrome.storage.local.get(BLOCKED_DAY_COUNT_KEY);
  const dayCounts = stored[BLOCKED_DAY_COUNT_KEY] || {};
  return Number(dayCounts[todayKey()] || 0);
}

/** Returns the latest blocked URL log entries. */
export async function getBlockedLog() {
  const stored = await chrome.storage.local.get(BLOCKED_LOG_KEY);
  return stored[BLOCKED_LOG_KEY] || [];
}
