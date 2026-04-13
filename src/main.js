import { initListen } from "./listen.js";
import { initMcq } from "./mcq.js";
import { initVoicesListener } from "./speech.js";

const WORDLIST_URL = `${import.meta.env.BASE_URL}data/wordlist.json`;

const statusEl = document.getElementById("status");

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function setupModeTabs() {
  const tabListen = document.getElementById("tab-listen");
  const tabMcq = document.getElementById("tab-mcq");
  const panelListen = document.getElementById("panel-listen");
  const panelMcq = document.getElementById("panel-mcq");
  if (!tabListen || !tabMcq || !panelListen || !panelMcq) return;

  function activate(mode) {
    const listen = mode === "listen";
    tabListen.setAttribute("aria-selected", listen ? "true" : "false");
    tabMcq.setAttribute("aria-selected", listen ? "false" : "true");
    panelListen.hidden = !listen;
    panelMcq.hidden = listen;
    tabListen.tabIndex = listen ? 0 : -1;
    tabMcq.tabIndex = listen ? -1 : 0;
  }

  tabListen.addEventListener("click", () => activate("listen"));
  tabMcq.addEventListener("click", () => activate("mcq"));
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
  } catch (e) {
    setStatus(e instanceof Error ? e.message : "Could not load vocabulary.");
    const ids = [
      "btn-play",
      "btn-reveal",
      "btn-understand",
      "btn-dont-understand",
      "mcq-play",
      "mcq-reveal",
      "mcq-next",
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    }
    return;
  }

  initVoicesListener();
  initListen({ entries });
  initMcq({ entries });
}

main();
