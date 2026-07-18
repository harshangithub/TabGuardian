import { getSettings } from "./storage.js";
import { isAllowed } from "./matcher.js";
import { getBlockedLog, getBlockedToday, logBlockedUrl } from "./logger.js";
import { setBadgeState } from "./badge.js";

let isListening = false;
const activeTriggerTabs = new Set();
const blockedTabs = new Set();
let monitorAttached = false;
let initialized = false;
let blockedBadgeTimer;

function safeUrl(tab, changeInfo) {
  return changeInfo?.url || tab?.url || tab?.pendingUrl || "";
}

async function isTriggerMatch(url) {
  if (!url) {
    return false;
  }

  const { triggerWebsites } = await getSettings();
  return isAllowed(url, triggerWebsites);
}

async function notifyStatusChanged() {
  const status = await getStatus();

  try {
    await chrome.runtime.sendMessage({ type: "STATUS_CHANGED", payload: status });
  } catch {
    // Ignore when no popup/options page is listening.
  }
}

async function closeBlockedTab(tabId, url, reason, notifyOnBlock) {
  if (blockedTabs.has(tabId)) {
    return;
  }

  blockedTabs.add(tabId);

  try {
    await chrome.tabs.remove(tabId);
    await logBlockedUrl(url, reason);
    await setBadgeState("blocked");

    if (blockedBadgeTimer) {
      clearTimeout(blockedBadgeTimer);
    }

    blockedBadgeTimer = setTimeout(() => {
      setBadgeState(isListening ? "listening" : "inactive");
      blockedBadgeTimer = null;
    }, 1500);

    if (notifyOnBlock) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icons/icon48.png",
        title: "Tab Guardian blocked a tab",
        message: `${url}\nReason: ${reason}`
      });
    }

    await notifyStatusChanged();
  } catch {
    // Ignore remove/notification errors.
  }
}

async function evaluateTab(tabId, tab, changeInfo, source) {
  if (!isListening || activeTriggerTabs.has(tabId)) {
    return;
  }

  const url = safeUrl(tab, changeInfo);

  if (!url) {
    return;
  }

  const settings = await getSettings();
  const allowed = isAllowed(url, settings.whitelistRules);

  if (!allowed) {
    await closeBlockedTab(tabId, url, `Blocked via ${source}`, settings.notifyOnBlock);
  }
}

async function startMonitoring() {
  if (isListening) {
    return;
  }

  isListening = true;

  if (!monitorAttached) {
    chrome.tabs.onCreated.addListener(onCreatedMonitoredTab);
    chrome.tabs.onUpdated.addListener(onUpdatedMonitoredTab);
    monitorAttached = true;
  }

  await setBadgeState("listening");
  await notifyStatusChanged();
}

async function stopMonitoring() {
  if (!isListening) {
    return;
  }

  isListening = false;

  if (monitorAttached) {
    chrome.tabs.onCreated.removeListener(onCreatedMonitoredTab);
    chrome.tabs.onUpdated.removeListener(onUpdatedMonitoredTab);
    monitorAttached = false;
  }

  await setBadgeState("inactive");
  await notifyStatusChanged();
}

async function refreshTriggerMembership(tabId, tab, changeInfo) {
  const url = safeUrl(tab, changeInfo);

  if (!url) {
    return;
  }

  const matches = await isTriggerMatch(url);
  const wasTrigger = activeTriggerTabs.has(tabId);

  if (matches && !wasTrigger) {
    activeTriggerTabs.add(tabId);

    if (activeTriggerTabs.size === 1) {
      await startMonitoring();
    }

    await notifyStatusChanged();
    return;
  }

  if (!matches && wasTrigger) {
    activeTriggerTabs.delete(tabId);

    if (activeTriggerTabs.size === 0) {
      await stopMonitoring();
    }

    await notifyStatusChanged();
  }
}

async function onCreatedMonitoredTab(tab) {
  await evaluateTab(tab.id, tab, null, "tab create");
}

async function onUpdatedMonitoredTab(tabId, changeInfo, tab) {
  if (!changeInfo.url) {
    return;
  }

  await evaluateTab(tabId, tab, changeInfo, "url update");
}

async function onUpdatedAnyTab(tabId, changeInfo, tab) {
  if (!changeInfo.url) {
    return;
  }

  await refreshTriggerMembership(tabId, tab, changeInfo);
}

async function onRemovedAnyTab(tabId) {
  blockedTabs.delete(tabId);

  if (!activeTriggerTabs.delete(tabId)) {
    return;
  }

  if (activeTriggerTabs.size === 0) {
    await stopMonitoring();
  }

  await notifyStatusChanged();
}

function onRuntimeMessage(message, _sender, sendResponse) {
  if (message?.type === "GET_STATUS") {
    getStatus().then(sendResponse);
    return true;
  }

  if (message?.type === "GET_BLOCKED_LOG") {
    getBlockedLog().then((log) => sendResponse({ log }));
    return true;
  }

  return false;
}

/** Returns current monitoring status for popup and options pages. */
export async function getStatus() {
  return {
    isListening,
    activeTriggerTabs: Array.from(activeTriggerTabs),
    blockedToday: await getBlockedToday()
  };
}

/** Initializes listener registration and bootstraps state from existing tabs. */
export async function initializeListener() {
  if (initialized) {
    return;
  }

  initialized = true;

  chrome.tabs.onUpdated.addListener(onUpdatedAnyTab);
  chrome.tabs.onRemoved.addListener(onRemovedAnyTab);
  chrome.runtime.onMessage.addListener(onRuntimeMessage);

  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(async (tab) => {
    const url = tab.url || tab.pendingUrl;

    if (url && (await isTriggerMatch(url))) {
      activeTriggerTabs.add(tab.id);
    }
  }));

  if (activeTriggerTabs.size > 0) {
    await startMonitoring();
  } else {
    await setBadgeState("inactive");
  }

  await notifyStatusChanged();
}
