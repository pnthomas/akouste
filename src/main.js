const WORDLIST_URL = "/data/wordlist.json";

/** @typedef {{ greek: string; english: string; topic: string; category: string }} WordEntry */

/** @type {WordEntry[]} */
let entries = [];
/** @type {WordEntry | null} */
let current = null;
/** @type {'idle' | 'playing' | 'hidden' | 'revealed'} */
let greekUiState = "idle";

const statusEl = document.getElementById("status");
const greekEl = document.getElementById("greek-display");
const btnPlay = document.getElementById("btn-play");
const btnReveal = document.getElementById("btn-reveal");
const btnUnderstand = document.getElementById("btn-understand");
const btnDontUnderstand = document.getElementById("btn-dont-understand");

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function sameEntry(a, b) {
  return a.greek === b.greek && a.english === b.english;
}

function setGreekDisplay() {
  if (!greekEl) return;
  greekEl.dataset.state = greekUiState;
  if (greekUiState === "revealed" && current) {
    greekEl.textContent = current.greek;
  } else if (greekUiState === "playing") {
    greekEl.textContent = "…";
  } else if (greekUiState === "hidden") {
    greekEl.textContent = "Hidden";
  } else {
    greekEl.textContent = "—";
  }
}

function updateResponseButtons() {
  const ok = current !== null && entries.length > 0;
  if (btnUnderstand) btnUnderstand.disabled = !ok;
  if (btnDontUnderstand) btnDontUnderstand.disabled = !ok;
}

function pickGreekVoice() {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("el")) ||
    voices.find((v) => /greek/i.test(v.name)) ||
    null
  );
}

/**
 * @param {string} text
 * @param {() => void} onEnd
 */
function speakGreek(text, onEnd) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "el-GR";
  const voice = pickGreekVoice();
  if (voice) u.voice = voice;
  u.rate = 0.92;
  u.onend = () => onEnd();
  u.onerror = () => onEnd();
  speechSynthesis.speak(u);
}

function randomEntry() {
  if (entries.length === 0) return null;
  const i = Math.floor(Math.random() * entries.length);
  return entries[i];
}

/** Pick a random entry different from `avoid` when possible. */
function nextRandomEntry(avoid) {
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0];
  let next;
  for (let n = 0; n < 64; n++) {
    next = randomEntry();
    if (!avoid || !sameEntry(next, avoid)) break;
  }
  return next;
}

function onPlay() {
  if (entries.length === 0) return;
  if (!current) {
    current = randomEntry();
    updateResponseButtons();
  }
  if (btnReveal) btnReveal.textContent = "Show Greek";
  greekUiState = "playing";
  if (btnReveal) btnReveal.disabled = true;
  if (btnPlay) btnPlay.disabled = true;
  setGreekDisplay();

  speakGreek(current.greek, () => {
    greekUiState = "hidden";
    if (btnPlay) btnPlay.disabled = false;
    if (btnReveal) btnReveal.disabled = false;
    setGreekDisplay();
  });
}

function onReveal() {
  if (!current || greekUiState === "playing") return;
  greekUiState = "revealed";
  if (btnReveal) btnReveal.textContent = "Hide Greek";
  setGreekDisplay();
}

function onRevealClick() {
  if (!current) return;
  if (greekUiState === "revealed") {
    greekUiState = "hidden";
    if (btnReveal) btnReveal.textContent = "Show Greek";
    setGreekDisplay();
  } else {
    onReveal();
  }
}

function goToNextWord() {
  if (entries.length === 0) return;
  speechSynthesis.cancel();
  current = nextRandomEntry(current);
  if (btnReveal) btnReveal.textContent = "Show Greek";
  greekUiState = "idle";
  if (btnReveal) btnReveal.disabled = true;
  if (btnPlay) btnPlay.disabled = false;
  updateResponseButtons();
  setGreekDisplay();
}

function onUnderstand() {
  goToNextWord();
}

function onDontUnderstand() {
  goToNextWord();
}

async function loadWordlist() {
  setStatus("");
  const res = await fetch(WORDLIST_URL);
  if (!res.ok) throw new Error(`Failed to load word list (${res.status})`);
  const data = await res.json();
  const list = data.entries;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Word list is empty");
  }
  entries = list;
}

function initVoices() {
  pickGreekVoice();
}

async function init() {
  if (!btnPlay || !btnReveal || !greekEl) return;

  try {
    await loadWordlist();
  } catch (e) {
    setStatus(e instanceof Error ? e.message : "Could not load vocabulary.");
    btnPlay.disabled = true;
    btnReveal.disabled = true;
    if (btnUnderstand) btnUnderstand.disabled = true;
    if (btnDontUnderstand) btnDontUnderstand.disabled = true;
    return;
  }

  speechSynthesis.addEventListener("voiceschanged", initVoices);
  initVoices();

  btnPlay.addEventListener("click", onPlay);
  btnReveal.addEventListener("click", onRevealClick);
  if (btnUnderstand) btnUnderstand.addEventListener("click", onUnderstand);
  if (btnDontUnderstand) btnDontUnderstand.addEventListener("click", onDontUnderstand);

  updateResponseButtons();
  setGreekDisplay();
}

init();
