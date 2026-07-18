import { getDefaultSettings, getSettings, setSettings } from "../background/storage.js";

const triggerInput = document.getElementById("triggerInput");
const addTriggerBtn = document.getElementById("addTrigger");
const triggerListEl = document.getElementById("triggerList");
const ruleInput = document.getElementById("ruleInput");
const addRuleBtn = document.getElementById("addRule");
const ruleListEl = document.getElementById("ruleList");
const notifyOnBlockEl = document.getElementById("notifyOnBlock");
const darkModeEl = document.getElementById("darkMode");
const importBtn = document.getElementById("importBtn");
const importFileEl = document.getElementById("importFile");
const exportBtn = document.getElementById("exportBtn");
const messageEl = document.getElementById("message");

let settings = getDefaultSettings();

function setTheme(darkMode) {
  document.documentElement.dataset.theme = darkMode ? "dark" : "light";
}

function showMessage(text, type = "success") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function ensureValidPattern(input) {
  const value = String(input || "").trim();

  if (!value) {
    throw new Error("Value cannot be empty.");
  }

  if (value.startsWith("regex:")) {
    const body = value.slice("regex:".length);

    if (!body) {
      throw new Error("Regex pattern cannot be empty.");
    }

    try {
      new RegExp(body);
    } catch {
      throw new Error("Regex pattern is invalid.");
    }

    return value;
  }

  if (value.includes("*")) {
    if (!/^https?:\/\/.+/.test(value)) {
      throw new Error("Wildcard rules must start with http:// or https://.");
    }

    return value;
  }

  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only http and https URLs are supported.");
    }
  } catch {
    throw new Error("Please enter a valid URL.");
  }

  return value;
}

function renderList(targetEl, values, onRemove) {
  targetEl.textContent = "";

  if (!values.length) {
    const empty = document.createElement("li");
    empty.textContent = "No items configured";
    targetEl.appendChild(empty);
    return;
  }

  values.forEach((value, index) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.className = "value";
    span.textContent = value;

    const button = document.createElement("button");
    button.className = "remove";
    button.type = "button";
    button.textContent = "Remove";
    button.addEventListener("click", () => onRemove(index));

    li.append(span, button);
    targetEl.appendChild(li);
  });
}

async function persistSettings() {
  settings = await setSettings(settings);
  setTheme(settings.darkMode);
  renderAll();
}

function renderAll() {
  notifyOnBlockEl.checked = settings.notifyOnBlock;
  darkModeEl.checked = settings.darkMode;

  renderList(triggerListEl, settings.triggerWebsites, async (index) => {
    settings.triggerWebsites.splice(index, 1);
    await persistSettings();
    showMessage("Trigger website removed.");
  });

  renderList(ruleListEl, settings.whitelistRules, async (index) => {
    settings.whitelistRules.splice(index, 1);
    await persistSettings();
    showMessage("Whitelist rule removed.");
  });
}

async function addTrigger() {
  try {
    const value = ensureValidPattern(triggerInput.value);

    if (settings.triggerWebsites.includes(value)) {
      showMessage("Trigger website already exists.", "error");
      return;
    }

    settings.triggerWebsites.push(value);
    triggerInput.value = "";
    await persistSettings();
    showMessage("Trigger website added.");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function addRule() {
  try {
    const value = ensureValidPattern(ruleInput.value);

    if (settings.whitelistRules.includes(value)) {
      showMessage("Whitelist rule already exists.", "error");
      return;
    }

    settings.whitelistRules.push(value);
    ruleInput.value = "";
    await persistSettings();
    showMessage("Whitelist rule added.");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function importJson(file) {
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    settings = {
      ...getDefaultSettings(),
      ...parsed,
      triggerWebsites: Array.isArray(parsed.triggerWebsites) ? parsed.triggerWebsites : [],
      whitelistRules: Array.isArray(parsed.whitelistRules) ? parsed.whitelistRules : []
    };

    settings.triggerWebsites = settings.triggerWebsites.map(ensureValidPattern);
    settings.whitelistRules = settings.whitelistRules.map(ensureValidPattern);
    settings.notifyOnBlock = Boolean(settings.notifyOnBlock);
    settings.darkMode = Boolean(settings.darkMode);

    await persistSettings();
    showMessage("Settings imported.");
  } catch (error) {
    showMessage(`Import failed: ${error.message}`, "error");
  } finally {
    importFileEl.value = "";
  }
}

function exportJson() {
  const payload = JSON.stringify(settings, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "tab-guardian-settings.json";
  anchor.click();

  URL.revokeObjectURL(url);
  showMessage("Settings exported.");
}

addTriggerBtn.addEventListener("click", addTrigger);
addRuleBtn.addEventListener("click", addRule);
triggerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTrigger();
  }
});
ruleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addRule();
  }
});

notifyOnBlockEl.addEventListener("change", async () => {
  settings.notifyOnBlock = notifyOnBlockEl.checked;
  await persistSettings();
  showMessage("Notification setting updated.");
});

darkModeEl.addEventListener("change", async () => {
  settings.darkMode = darkModeEl.checked;
  await persistSettings();
  showMessage("Theme updated.");
});

importBtn.addEventListener("click", () => {
  importFileEl.click();
});
importFileEl.addEventListener("change", () => {
  importJson(importFileEl.files[0]);
});

exportBtn.addEventListener("click", exportJson);

(async () => {
  settings = await getSettings();
  setTheme(settings.darkMode);
  renderAll();
})();
