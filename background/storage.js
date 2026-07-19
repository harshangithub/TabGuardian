const SETTINGS_KEY = "tabGuardianSettings";

const DEFAULT_SETTINGS = {
  triggerWebsites: [],
  whitelistRules: [],
  notifyOnBlock: false,
  darkMode: false
};
let cachedSettings = null;

function normalizeList(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return [...new Set(input.map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizeSettings(raw) {
  const source = raw || {};
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    triggerWebsites: normalizeList(source.triggerWebsites),
    whitelistRules: normalizeList(source.whitelistRules),
    notifyOnBlock: Boolean(source.notifyOnBlock),
    darkMode: Boolean(source.darkMode)
  };
}

function cloneSettings(settings) {
  return {
    ...settings,
    triggerWebsites: [...settings.triggerWebsites],
    whitelistRules: [...settings.whitelistRules]
  };
}

/** Returns default settings object for Tab Guardian. */
export function getDefaultSettings() {
  return cloneSettings(DEFAULT_SETTINGS);
}

/** Loads and returns normalized extension settings from chrome.storage.sync. */
export async function getSettings() {
  if (cachedSettings) {
    return cloneSettings(cachedSettings);
  }

  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  cachedSettings = normalizeSettings(stored[SETTINGS_KEY]);
  return cloneSettings(cachedSettings);
}

/** Persists provided settings fields to chrome.storage.sync after normalization. */
export async function setSettings(nextSettings) {
  const normalized = normalizeSettings(nextSettings);

  await chrome.storage.sync.set({ [SETTINGS_KEY]: normalized });
  cachedSettings = normalized;
  return cloneSettings(cachedSettings);
}

/** Updates selected setting fields and returns the saved complete settings. */
export async function updateSettings(partialSettings) {
  const current = await getSettings();
  return setSettings({ ...current, ...(partialSettings || {}) });
}

if (!globalThis.__tabGuardianStorageListenerRegistered) {
  globalThis.__tabGuardianStorageListenerRegistered = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !(SETTINGS_KEY in changes)) {
      return;
    }

    cachedSettings = normalizeSettings(changes[SETTINGS_KEY].newValue);
  });
}
