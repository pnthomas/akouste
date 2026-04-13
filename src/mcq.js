import { speakGreek } from "./speech.js";

/** @typedef {{ greek: string; english: string; topic: string; category: string }} WordEntry */

const ALL = "__all__";

/**
 * Distinct subcategory (topic) strings, sorted; empty/missing topics included as "".
 * @param {WordEntry[]} entries
 * @returns {string[]}
 */
export function uniqueTopics(entries) {
  const set = new Set();
  for (const e of entries) {
    set.add((e.topic || "").trim());
  }
  const list = [...set];
  list.sort((a, b) => {
    if (a === "" && b !== "") return 1;
    if (b === "" && a !== "") return -1;
    return a.localeCompare(b, "en");
  });
  return list;
}

/**
 * @param {WordEntry[]} pool
 * @param {string} selection ALL or exact topic string ("" = empty subcategory)
 */
function filterByTopic(pool, selection) {
  if (selection === ALL) return pool;
  return pool.filter((e) => (e.topic || "").trim() === selection);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {WordEntry[]} entries
 * @param {string} wordsSel
 * @param {string} choicesSel
 */
function buildRound(entries, wordsSel, choicesSel) {
  const wordsPool = filterByTopic(entries, wordsSel);
  const choicesPool = filterByTopic(entries, choicesSel);
  if (wordsPool.length === 0) return null;

  const target = wordsPool[Math.floor(Math.random() * wordsPool.length)];
  const correct = target.english.trim();

  const fromChoices = shuffle(
    [
      ...new Set(
        choicesPool.map((e) => e.english.trim()).filter((g) => g && g !== correct)
      ),
    ]
  );
  const fromAll = shuffle(
    [
      ...new Set(
        entries.map((e) => e.english.trim()).filter((g) => g && g !== correct)
      ),
    ]
  );

  const three = [];
  const used = new Set([correct]);
  for (const g of fromChoices) {
    if (three.length >= 3) break;
    if (!used.has(g)) {
      three.push(g);
      used.add(g);
    }
  }
  for (const g of fromAll) {
    if (three.length >= 3) break;
    if (!used.has(g)) {
      three.push(g);
      used.add(g);
    }
  }

  const options = shuffle([correct, ...three.slice(0, 3)]);
  return { target, correct, options };
}

/**
 * @param {object} opts
 * @param {WordEntry[]} opts.entries
 */
export function initMcq({ entries }) {
  const wordsSel = document.getElementById("mcq-words-pool");
  const choicesSel = document.getElementById("mcq-choices-pool");
  const btnPlay = document.getElementById("mcq-play");
  const btnReveal = document.getElementById("mcq-reveal");
  const btnNext = document.getElementById("mcq-next");
  const greekEl = document.getElementById("mcq-greek-display");
  const optionsEl = document.getElementById("mcq-options");

  if (!wordsSel || !choicesSel || !btnPlay || !btnReveal || !btnNext || !greekEl || !optionsEl) {
    return;
  }

  const topics = uniqueTopics(entries);

  function fillSelect(sel) {
    sel.innerHTML = "";
    const all = document.createElement("option");
    all.value = ALL;
    all.textContent = "All words";
    sel.appendChild(all);
    for (const t of topics) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t === "" ? "(No subcategory)" : t;
      sel.appendChild(opt);
    }
    sel.value = ALL;
  }

  fillSelect(wordsSel);
  fillSelect(choicesSel);

  /** @type {{ target: WordEntry; correct: string; options: string[] } | null} */
  let round = null;
  /** idle = before first play; playing = TTS; after = idle between plays */
  let audioState = "idle";
  /** User has revealed Greek at least once this round — replays keep Greek visible (no …). */
  let revealedOnce = false;
  /** User chose Hide between plays while Greek had been shown. Cleared on Play. */
  let betweenPlayHidden = false;
  let answered = false;

  function greekDatasetState() {
    if (!round) return "idle";
    if (audioState === "playing" && revealedOnce) return "revealed";
    if (audioState === "playing") return "playing";
    if (revealedOnce && !betweenPlayHidden) return "revealed";
    if (revealedOnce && betweenPlayHidden) return "hidden";
    if (audioState === "after" && !revealedOnce) return "hidden";
    return "idle";
  }

  function setGreekDisplay() {
    greekEl.dataset.state = greekDatasetState();
    if (!round) {
      greekEl.textContent = "—";
      return;
    }
    if (audioState === "playing") {
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
    if (audioState === "after" && !revealedOnce) {
      greekEl.textContent = "Hidden";
      return;
    }
    greekEl.textContent = "—";
  }

  function renderOptions() {
    optionsEl.innerHTML = "";
    if (!round) return;
    round.options.forEach((label, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn mcq-option";
      b.textContent = label;
      b.dataset.index = String(i);
      b.disabled = answered;
      b.addEventListener("click", () => onPick(label, b));
      optionsEl.appendChild(b);
    });
  }

  function celebrateCorrect(btn) {
    btn.classList.remove("mcq-celebrate");
    void btn.offsetWidth;
    btn.classList.add("mcq-celebrate");
    btn.addEventListener(
      "animationend",
      () => {
        btn.classList.remove("mcq-celebrate");
      },
      { once: true }
    );
  }

  function onPick(label, btn) {
    if (!round || answered) return;
    answered = true;
    const ok = label === round.correct;
    optionsEl.querySelectorAll(".mcq-option").forEach((el) => {
      el.disabled = true;
      const b = /** @type {HTMLButtonElement} */ (el);
      if (b.textContent === round.correct) {
        b.classList.add("mcq-correct");
        if (ok) celebrateCorrect(b);
      } else if (b === btn && !ok) {
        b.classList.add("mcq-wrong");
      }
    });
  }

  function newRound() {
    speechSynthesis.cancel();
    const w = wordsSel.value;
    const c = choicesSel.value;
    round = buildRound(entries, w, c);
    answered = false;
    revealedOnce = false;
    betweenPlayHidden = false;
    audioState = "idle";
    if (btnReveal) {
      btnReveal.textContent = "Show Greek";
      btnReveal.disabled = true;
    }
    btnPlay.disabled = !round;
    setGreekDisplay();
    renderOptions();
  }

  function onPlay() {
    if (!round) return;
    betweenPlayHidden = false;
    if (btnReveal) btnReveal.textContent = revealedOnce ? "Hide Greek" : "Show Greek";
    audioState = "playing";
    if (btnReveal) btnReveal.disabled = true;
    btnPlay.disabled = true;
    setGreekDisplay();

    speakGreek(round.target.greek, () => {
      audioState = "after";
      btnPlay.disabled = false;
      if (btnReveal) btnReveal.disabled = false;
      if (revealedOnce) betweenPlayHidden = false;
      if (btnReveal) btnReveal.textContent = revealedOnce ? "Hide Greek" : "Show Greek";
      setGreekDisplay();
    });
  }

  function onRevealClick() {
    if (!round || audioState === "playing") return;
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

  wordsSel.addEventListener("change", newRound);
  choicesSel.addEventListener("change", newRound);
  btnPlay.addEventListener("click", onPlay);
  btnReveal.addEventListener("click", onRevealClick);
  btnNext.addEventListener("click", () => {
    newRound();
    onPlay();
  });

  newRound();
}
