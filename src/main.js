import { initListen } from "./listen.js";
import { initMcq } from "./mcq.js";
import { createRecurrenceScheduler } from "./scheduler.js";
import { initSpoken } from "./spoken.js";
import { initVoicesListener } from "./speech.js";

const WORDLIST_URL = `${import.meta.env.BASE_URL}data/wordlist.json`;

const statusEl = document.getElementById("status");
const wordlistMetaEl = document.getElementById("wordlist-meta");

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function setWordlistMeta(data, entries) {
  if (!wordlistMetaEl) return;
  const fetchedAtRaw = data?.meta?.fetchedAt;
  const fetchedAt = fetchedAtRaw ? new Date(fetchedAtRaw) : null;
  const hasValidDate = fetchedAt instanceof Date && !Number.isNaN(fetchedAt.valueOf());
  const dateText = hasValidDate
    ? new Intl.DateTimeFormat("en-US", {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
      }).format(fetchedAt)
    : "unknown";
  const lemmaCount = new Set(entries.map((entry) => entry.greek.trim()).filter(Boolean)).size;
  wordlistMetaEl.textContent = `Wordlist ${dateText} Lemmata ${lemmaCount}`;
}

function setupModeTabs() {
  const tabMcq = document.getElementById("tab-mcq");
  const tabSpoken = document.getElementById("tab-spoken");
  const tabListen = document.getElementById("tab-listen");
  const panelMcq = document.getElementById("panel-mcq");
  const panelSpoken = document.getElementById("panel-spoken");
  const panelListen = document.getElementById("panel-listen");
  if (!tabMcq || !tabSpoken || !tabListen || !panelMcq || !panelSpoken || !panelListen) return;

  const modes = [
    { id: "mcq", tab: tabMcq, panel: panelMcq },
    { id: "spoken", tab: tabSpoken, panel: panelSpoken },
    { id: "listen", tab: tabListen, panel: panelListen },
  ];

  function activate(mode) {
    for (const m of modes) {
      const sel = m.id === mode;
      m.tab.setAttribute("aria-selected", sel ? "true" : "false");
      m.panel.hidden = !sel;
      m.tab.tabIndex = sel ? 0 : -1;
    }
    document.dispatchEvent(new CustomEvent("akouste-mode", { detail: { mode } }));
  }

  tabMcq.addEventListener("click", () => activate("mcq"));
  tabSpoken.addEventListener("click", () => activate("spoken"));
  tabListen.addEventListener("click", () => activate("listen"));
  activate("mcq");
}

async function main() {
  setStatus("");
  setupModeTabs();

  let entries;
  try {
    const res = await fetch(WORDLIST_URL);
    if (!res.ok) throw new Error(`Failed to load word list (${res.status})`);
    const data = await res.json();
    const list = data.entries;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("Word list is empty");
    }
    entries = list;
    setWordlistMeta(data, entries);
  } catch (e) {
    setStatus(e instanceof Error ? e.message : "Could not load vocabulary.");
    const ids = [
      "btn-play",
      "btn-reveal",
      "btn-understand",
      "btn-dont-understand",
      "mcq-play",
      "mcq-reveal",
      "mcq-guessed",
      "mcq-know",
      "mcq-next",
      "spoken-play",
      "spoken-reveal",
      "spoken-dont-know",
      "spoken-repeat",
      "mcq-words-pool",
      "mcq-choices-pool",
      "spoken-words-pool",
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    }
    return;
  }

  initVoicesListener();
  const scheduler = createRecurrenceScheduler(entries);
  initListen({ entries, scheduler });
  initMcq({ entries, scheduler });
  initSpoken({ entries, scheduler });
}

main();
