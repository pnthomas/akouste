import { speakGreek } from "./speech.js";

/** @typedef {{ greek: string; english: string; topic: string; category: string }} WordEntry */

/**
 * @param {object} opts
 * @param {WordEntry[]} opts.entries
 */
export function initListen({ entries }) {
  /** @type {WordEntry | null} */
  let current = null;
  /** @type {'idle' | 'playing' | 'hidden' | 'revealed'} */
  let greekUiState = "idle";
  /** User tapped Show Greek at least once for the current word (cleared on next word). */
  let hasRevealed = false;
  /** User tapped δεν καταλαβαίνω — English gloss shown on the right until next word. */
  let englishShown = false;
  /** Bumps when starting or invalidating TTS so stale `onend` handlers are ignored. */
  let speakSession = 0;

  const greekEl = document.getElementById("greek-display");
  const englishEl = document.getElementById("listen-english-display");
  const btnPlay = document.getElementById("btn-play");
  const btnReveal = document.getElementById("btn-reveal");
  const btnUnderstand = document.getElementById("btn-understand");
  const btnDontUnderstand = document.getElementById("btn-dont-understand");

  function sameEntry(a, b) {
    return a.greek === b.greek && a.english === b.english;
  }

  function setEnglishPanel() {
    if (!englishEl) return;
    if (englishShown && current) {
      englishEl.hidden = false;
      englishEl.removeAttribute("aria-hidden");
      englishEl.textContent = current.english.trim();
    } else {
      englishEl.hidden = true;
      englishEl.setAttribute("aria-hidden", "true");
      englishEl.textContent = "";
    }
  }

  function syncRevealButton() {
    if (!btnReveal) return;
    if (greekUiState === "playing" || englishShown) {
      btnReveal.disabled = true;
      return;
    }
    btnReveal.disabled = greekUiState === "idle";
  }

  function syncDontUnderstandButton() {
    if (!btnDontUnderstand) return;
    if (englishShown) {
      btnDontUnderstand.textContent = "Επόμενος";
      btnDontUnderstand.title = "Next word";
    } else {
      btnDontUnderstand.textContent = "δεν καταλαβαίνω";
      btnDontUnderstand.title = "I don't understand";
    }
  }

  function setGreekDisplay() {
    if (!greekEl) return;
    const showGreekText =
      englishShown ||
      (greekUiState === "playing" && hasRevealed) ||
      (greekUiState === "revealed");

    if (greekUiState === "playing") {
      if (showGreekText && current) {
        greekEl.dataset.state = "revealed";
        greekEl.textContent = current.greek;
      } else {
        greekEl.dataset.state = "playing";
        greekEl.textContent = "…";
      }
      setEnglishPanel();
      syncRevealButton();
      syncDontUnderstandButton();
      return;
    }

    if (englishShown && current) {
      greekEl.dataset.state = "revealed";
      greekEl.textContent = current.greek;
      setEnglishPanel();
      syncRevealButton();
      syncDontUnderstandButton();
      return;
    }

    greekEl.dataset.state = greekUiState;
    if (greekUiState === "revealed" && current) {
      greekEl.textContent = current.greek;
    } else if (greekUiState === "hidden") {
      greekEl.textContent = "Hidden";
    } else {
      greekEl.textContent = "—";
    }
    setEnglishPanel();
    syncRevealButton();
    syncDontUnderstandButton();
  }

  function updateResponseButtons() {
    const ok = current !== null && entries.length > 0;
    if (btnUnderstand) btnUnderstand.disabled = !ok;
    if (btnDontUnderstand) btnDontUnderstand.disabled = !ok;
  }

  function randomEntry() {
    if (entries.length === 0) return null;
    const i = Math.floor(Math.random() * entries.length);
    return entries[i];
  }

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
    const prePlay = greekUiState;
    const session = ++speakSession;
    if (btnReveal) {
      btnReveal.textContent =
        prePlay === "revealed" ? "Hide Greek" : "Show Greek";
    }
    greekUiState = "playing";
    if (btnPlay) btnPlay.disabled = true;
    setGreekDisplay();

    speakGreek(current.greek, () => {
      if (session !== speakSession) return;
      greekUiState = prePlay === "revealed" ? "revealed" : "hidden";
      if (btnPlay) btnPlay.disabled = false;
      if (btnReveal) {
        btnReveal.textContent = greekUiState === "revealed" ? "Hide Greek" : "Show Greek";
      }
      setGreekDisplay();
    });
  }

  function onReveal() {
    if (!current || greekUiState === "playing") return;
    greekUiState = "revealed";
    hasRevealed = true;
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
    speakSession++;
    speechSynthesis.cancel();
    current = nextRandomEntry(current);
    hasRevealed = false;
    englishShown = false;
    if (btnReveal) btnReveal.textContent = "Show Greek";
    greekUiState = "idle";
    if (btnPlay) btnPlay.disabled = false;
    updateResponseButtons();
    setGreekDisplay();
  }

  function onDontUnderstand() {
    if (!current || entries.length === 0) return;
    if (!englishShown) {
      speakSession++;
      speechSynthesis.cancel();
      englishShown = true;
      hasRevealed = true;
      greekUiState = "revealed";
      if (btnPlay) btnPlay.disabled = false;
      if (btnReveal) btnReveal.textContent = "Hide Greek";
      setGreekDisplay();
      return;
    }
    goToNextWord();
  }

  if (!btnPlay || !btnReveal || !greekEl) return;

  btnPlay.addEventListener("click", onPlay);
  btnReveal.addEventListener("click", onRevealClick);
  if (btnUnderstand) btnUnderstand.addEventListener("click", goToNextWord);
  if (btnDontUnderstand) btnDontUnderstand.addEventListener("click", onDontUnderstand);

  updateResponseButtons();
  setGreekDisplay();
}
