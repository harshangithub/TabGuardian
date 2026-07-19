const stateEl = document.getElementById("state");
const triggerTabsEl = document.getElementById("triggerTabs");
const blockedTodayEl = document.getElementById("blockedToday");
const openSettingsBtn = document.getElementById("openSettings");

function renderStatus(status) {
  const listening = Boolean(status?.isListening);
  const triggerCount = Array.isArray(status?.activeTriggerTabs) ? status.activeTriggerTabs.length : 0;
  const blockedToday = Number(status?.blockedToday || 0);

  stateEl.textContent = listening ? "Listening" : "Inactive";
  stateEl.classList.toggle("listening", listening);
  stateEl.classList.toggle("inactive", !listening);
  triggerTabsEl.textContent = String(triggerCount);
  blockedTodayEl.textContent = String(blockedToday);
}

async function refreshStatus() {
  try {
    const status = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
    renderStatus(status);
  } catch {
    renderStatus({ isListening: false, activeTriggerTabs: [], blockedToday: 0 });
  }
}

openSettingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "STATUS_CHANGED") {
    renderStatus(message.payload);
  }
});

refreshStatus();
