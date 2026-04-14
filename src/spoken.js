import { uniqueTopics } from "./mcq.js";
import { playDing, playDoubleTone, playWoodDonk, unlockAudio } from "./sounds.js";
import { speakEnglish, speakGreek } from "./speech.js";

/** @typedef {{ greek: string; english: string; topic: string; category: string }} WordEntry */

const ALL = "__all__";

/**
 * @param {WordEntry[]} pool
 * @param {string} selection
 */
function filterByTopic(pool, selection) {
  if (selection === ALL) return pool;
  return pool.filter((e) => (e.topic || "").trim() === selection);
}

/**
 * @param {string} raw
 */
function normalizeTranscript(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ");
}

/**
 * Match glosses like "student (m)" as "student".
 * @param {string} raw
 */
function normalizeGlossKey(raw) {
  let t = normalizeTranscript(raw);
  t = t.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  return t;
}

/**
 * @param {string} t normalized transcript
 * @returns {"again"|"dontknow"|"stop"|null}
 */
function matchProcedure(t) {
  if (t === "again" || t === "repeat") return "again";
  if (t === "i don't know" || t === "dont know" || t === "dunno") return "dontknow";
  if (t === "stop") return "stop";
  return null;
}

const PAUSE_AFTER_ENGLISH_MS = 450;

const SpeechRec =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * @param {WordEntry[]} entries
 * @param {string} wordsSel
 * @param {{ pick: (pool: WordEntry[]) => WordEntry | null }} scheduler
 */
function buildRound(entries, wordsSel, scheduler) {
  const pool = filterByTopic(entries, wordsSel);
  if (pool.length === 0) return null;
  const target = scheduler.pick(pool);
  if (!target) return null;
  return { target, correct: target.english.trim() };
}

/**
 * @param {object} opts
 * @param {WordEntry[]} opts.entries
 * @param {{ pick: (pool: WordEntry[]) => WordEntry | null, record: (greek: string, outcome: "correct" | "wrong" | "guessed" | "know") => void }} opts.scheduler
 */
export function initSpoken({ entries, scheduler }) {
  const wordsSel = document.getElementById("spoken-words-pool");
  const btnPlay = document.getElementById("spoken-play");
  const btnReveal = document.getElementById("spoken-reveal");
  const btnDontKnow = document.getElementById("spoken-dont-know");
  const btnRepeat = document.getElementById("spoken-repeat");
  const greekEl = document.getElementById("spoken-greek-display");
  const englishEl = document.getElementById("spoken-english-display");

  if (!wordsSel || !btnPlay || !btnReveal || !btnDontKnow || !btnRepeat || !greekEl || !englishEl) {
    return;
  }

  const hasStt = Boolean(SpeechRec);

  /** @type {{ target: WordEntry; correct: string } | null} */
  let round = null;
  /** idle | playingGreek | listening | feedback */
  let phase = "idle";
  /** none = no full Greek prompt yet this round; playing; done = heard full prompt at least once */
  let promptPhase = "none";
  let speakSession = 0;
  let listeningGen = 0;
  /** @type {InstanceType<NonNullable<typeof SpeechRec>> | null} */
  let recognition = null;
  let revealedOnce = false;
  let betweenPlayHidden = false;
  let englishVisible = false;
  let englishText = "";

  const topics = uniqueTopics(entries);

  function fillSelect() {
    wordsSel.innerHTML = "";
    const all = document.createElement("option");
    all.value = ALL;
    all.textContent = "All words";
    wordsSel.appendChild(all);
    for (const t of topics) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t === "" ? "(No subcategory)" : t;
      wordsSel.appendChild(opt);
    }
    wordsSel.value = ALL;
  }

  fillSelect();

  function stopRecognitionOnly() {
    listeningGen++;
    try {
      recognition?.abort();
    } catch {
      /* ignore */
    }
    recognition = null;
  }

  function stopSession() {
    speakSession++;
    speechSynthesis.cancel();
    stopRecognitionOnly();
    if (phase === "playingGreek") {
      promptPhase = "none";
    }
    phase = "idle";
    englishVisible = false;
    englishText = "";
    syncPlayButton();
    syncAuxButtons();
    setGreekDisplay();
    setEnglishDisplay();
  }

  function onModeSwitch(ev) {
    const e = /** @type {CustomEvent<{ mode: string }>} */ (ev);
    const mode = e.detail?.mode;
    if (mode !== "spoken") {
      stopSession();
    }
  }
  document.addEventListener("akouste-mode", onModeSwitch);

  function greekDatasetState() {
    if (!round) return "idle";
    if (phase === "playingGreek" && revealedOnce) return "revealed";
    if (phase === "playingGreek") return "playing";
    if (revealedOnce && !betweenPlayHidden) return "revealed";
    if (revealedOnce && betweenPlayHidden) return "hidden";
    if (promptPhase === "done" && !revealedOnce) return "hidden";
    return "idle";
  }

  function setGreekDisplay() {
    greekEl.dataset.state = greekDatasetState();
    if (!round) {
      greekEl.textContent = "—";
      return;
    }
    if (phase === "playingGreek") {
      greekEl.textContent = revealedOnce ? round.target.greek : "…";
      return;
    }
    if (revealedOnce && !betweenPlayHidden) {
      greekEl.textContent = round.target.greek;
      return;
    }
    if (revealedOnce && betweenPlayHidden) {
      greekEl.textContent = "Hidden";
      return;
    }
    if (promptPhase === "done" && !revealedOnce) {
      greekEl.textContent = "Hidden";
      return;
    }
    greekEl.textContent = "—";
  }

  function setEnglishDisplay() {
    if (englishVisible && englishText) {
      englishEl.hidden = false;
      englishEl.removeAttribute("aria-hidden");
      englishEl.textContent = englishText;
    } else {
      englishEl.hidden = true;
      englishEl.setAttribute("aria-hidden", "true");
      englishEl.textContent = "";
    }
  }

  function syncPlayButton() {
    const stopping =
      phase === "playingGreek" || phase === "listening" || phase === "feedback";
    if (stopping) {
      btnPlay.textContent = "Stop";
      btnPlay.classList.remove("primary");
      btnPlay.classList.add("speak-stop");
      btnPlay.disabled = false;
    } else {
      btnPlay.textContent = "Play";
      btnPlay.classList.add("primary");
      btnPlay.classList.remove("speak-stop");
      btnPlay.disabled = !round || !hasStt;
    }
  }

  function syncAuxButtons() {
    const busy = phase === "playingGreek" || phase === "feedback";
    btnDontKnow.disabled = busy || !hasStt || phase !== "listening" || !round;
    btnRepeat.disabled = busy || !round;
    if (!hasStt) {
      btnDontKnow.title = "Speech recognition not supported in this browser";
    } else {
      btnDontKnow.title = "I don't know";
    }
    if (phase === "playingGreek") {
      btnReveal.disabled = true;
    } else if (round) {
      btnReveal.disabled = false;
    } else {
      btnReveal.disabled = true;
    }
  }

  function syncAll() {
    syncPlayButton();
    syncAuxButtons();
    setGreekDisplay();
    setEnglishDisplay();
  }

  function newRound() {
    speechSynthesis.cancel();
    stopRecognitionOnly();
    const w = wordsSel.value;
    round = buildRound(entries, w, scheduler);
    phase = "idle";
    promptPhase = "none";
    revealedOnce = false;
    betweenPlayHidden = false;
    englishVisible = false;
    englishText = "";
    if (btnReveal) btnReveal.textContent = "Show Greek";
    syncAll();
  }

  function startListening() {
    if (!SpeechRec || !round || phase !== "listening") return;

    const gen = listeningGen;
    let settled = false;

    try {
      recognition = new SpeechRec();
    } catch {
      return;
    }

    const r = recognition;
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onresult = (ev) => {
      if (gen !== listeningGen) return;
      const last = ev.results[ev.results.length - 1];
      if (!last.isFinal) return;
      settled = true;
      const text = (last[0]?.transcript ?? "").trim();
      if (!text) {
        onNotUnderstood();
        return;
      }
      handleTranscript(text);
    };

    r.onerror = (ev) => {
      if (gen !== listeningGen) return;
      if (ev.error === "aborted") return;
      if (!settled) {
        settled = true;
        onNotUnderstood();
      }
    };

    r.onend = () => {
      if (gen !== listeningGen) return;
      recognition = null;
      if (!settled) {
        settled = true;
        onNotUnderstood();
      }
    };

    try {
      r.start();
    } catch {
      if (!settled) {
        settled = true;
        onNotUnderstood();
      }
    }
  }

  /**
   * @param {string} raw
   */
  function handleTranscript(raw) {
    if (!round || phase !== "listening") return;
    const t = normalizeTranscript(raw);
    const proc = matchProcedure(t);
    if (proc === "stop") {
      stopSession();
      return;
    }
    if (proc === "again") {
      replayGreekOnly();
      return;
    }
    if (proc === "dontknow") {
      onDontKnowPath(false);
      return;
    }

    const expected = normalizeGlossKey(round.correct);
    const heard = normalizeGlossKey(raw);
    if (heard === expected) {
      onCorrectPath();
    } else {
      onWrongPath();
    }
  }

  function onCorrectPath() {
    if (!round) return;
    phase = "feedback";
    stopRecognitionOnly();
    syncAll();
    const greek = round.target.greek;
    scheduler.record(greek, "correct");
    playDing(() => {
      newRound();
      playAfterLoad();
    });
  }

  function onWrongPath() {
    if (!round) return;
    phase = "feedback";
    stopRecognitionOnly();
    syncAll();
    const greek = round.target.greek;
    const answer = round.correct;
    scheduler.record(greek, "wrong");
    playWoodDonk(() => {
      speakEnglish(answer, () => {
        setTimeout(() => {
          newRound();
          playAfterLoad();
        }, PAUSE_AFTER_ENGLISH_MS);
      });
    });
  }

  function onDontKnowPath(showAnswerText) {
    if (!round) return;
    phase = "feedback";
    stopRecognitionOnly();
    const greek = round.target.greek;
    const answer = round.correct;
    scheduler.record(greek, "wrong");
    if (showAnswerText) {
      revealedOnce = true;
      betweenPlayHidden = false;
      englishVisible = true;
      englishText = answer;
    }
    syncAll();
    speakEnglish(answer, () => {
      englishVisible = false;
      englishText = "";
      setTimeout(() => {
        newRound();
        playAfterLoad();
      }, PAUSE_AFTER_ENGLISH_MS);
    });
  }

  function onNotUnderstood() {
    if (!round || phase !== "listening") return;
    phase = "listening";
    syncAll();
    playDoubleTone(() => {
      if (phase === "listening" && round) {
        startListening();
      }
    });
  }

  function replayGreekOnly() {
    if (!round) return;
    stopRecognitionOnly();
    const session = ++speakSession;
    phase = "playingGreek";
    promptPhase = "playing";
    btnReveal.disabled = true;
    syncPlayButton();
    syncAuxButtons();
    setGreekDisplay();

    speakGreek(round.target.greek, () => {
      if (session !== speakSession) return;
      promptPhase = "done";
      phase = "listening";
      btnReveal.disabled = false;
      syncPlayButton();
      syncAuxButtons();
      setGreekDisplay();
      startListening();
    });
  }

  function playAfterLoad() {
    if (!round) return;
    unlockAudio().catch(() => {});
    const session = ++speakSession;
    phase = "playingGreek";
    promptPhase = "playing";
    betweenPlayHidden = false;
    if (btnReveal) {
      btnReveal.textContent = revealedOnce ? "Hide Greek" : "Show Greek";
      btnReveal.disabled = true;
    }
    syncPlayButton();
    syncAuxButtons();
    setGreekDisplay();

    speakGreek(round.target.greek, () => {
      if (session !== speakSession) return;
      promptPhase = "done";
      phase = "listening";
      if (btnReveal) btnReveal.disabled = false;
      syncPlayButton();
      syncAuxButtons();
      setGreekDisplay();
      startListening();
    });
  }

  function onPlayClick() {
    unlockAudio().catch(() => {});
    if (phase === "playingGreek" || phase === "listening" || phase === "feedback") {
      stopSession();
      syncAll();
      return;
    }
    if (!round || !hasStt) return;
    playAfterLoad();
  }

  function onRevealClick() {
    if (!round || phase === "playingGreek") return;
    if (revealedOnce && !betweenPlayHidden) {
      betweenPlayHidden = true;
      if (btnReveal) btnReveal.textContent = "Show Greek";
    } else {
      revealedOnce = true;
      betweenPlayHidden = false;
      if (btnReveal) btnReveal.textContent = "Hide Greek";
    }
    setGreekDisplay();
  }

  btnPlay.addEventListener("click", onPlayClick);
  btnReveal.addEventListener("click", onRevealClick);
  btnDontKnow.addEventListener("click", () => {
    if (!round || phase === "playingGreek" || phase === "feedback") return;
    if (phase === "listening") {
      onDontKnowPath(true);
    }
  });
  btnRepeat.addEventListener("click", () => {
    if (!round || phase === "playingGreek" || phase === "feedback") return;
    replayGreekOnly();
  });

  wordsSel.addEventListener("change", () => {
    stopSession();
    newRound();
  });

  if (!hasStt) {
    btnPlay.disabled = true;
    btnPlay.title = "Speech recognition is not available in this browser";
  }

  newRound();
}
