const BADGE = {
  inactive: { text: "", color: "#6B7280", title: "Tab Guardian: Inactive" },
  listening: { text: "ON", color: "#16A34A", title: "Tab Guardian: Listening" },
  blocked: { text: "!", color: "#DC2626", title: "Tab Guardian: Blocked tab" }
};

/** Sets the extension badge color and text for a given status. */
export async function setBadgeState(state) {
  const config = BADGE[state] || BADGE.inactive;

  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ color: config.color }),
    chrome.action.setBadgeText({ text: config.text }),
    chrome.action.setTitle({ title: config.title })
  ]);
}
