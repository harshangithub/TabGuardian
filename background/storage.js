const SETTINGS_KEY = "tabGuardianSettings";

const DEFAULT_SETTINGS = {
  triggerWebsites: [],
  whitelistRules: [],
  notifyOnBlock: false,
  darkMode: false
};

function normalizeList(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return [...new Set(input.map((item) => String(item || "").trim()).filter(Boolean))];
}

/** Returns default settings object for Tab Guardian. */
export function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

/** Loads and returns normalized extension settings from chrome.storage.sync. */
export async function getSettings() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const raw = stored[SETTINGS_KEY] || {};

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    triggerWebsites: normalizeList(raw.triggerWebsites),
    whitelistRules: normalizeList(raw.whitelistRules),
    notifyOnBlock: Boolean(raw.notifyOnBlock),
    darkMode: Boolean(raw.darkMode)
  };
}

/** Persists provided settings fields to chrome.storage.sync after normalization. */
export async function setSettings(nextSettings) {
  const normalized = {
    ...DEFAULT_SETTINGS,
    ...(nextSettings || {}),
    triggerWebsites: normalizeList(nextSettings?.triggerWebsites),
    whitelistRules: normalizeList(nextSettings?.whitelistRules),
    notifyOnBlock: Boolean(nextSettings?.notifyOnBlock),
    darkMode: Boolean(nextSettings?.darkMode)
  };

  await chrome.storage.sync.set({ [SETTINGS_KEY]: normalized });
  return normalized;
}

/** Updates selected setting fields and returns the saved complete settings. */
export async function updateSettings(partialSettings) {
  const current = await getSettings();
  return setSettings({ ...current, ...(partialSettings || {}) });
}
