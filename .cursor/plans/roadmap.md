# Akouste — roadmap

Canonical **capabilities and phase order** for Akouste. High-level **what/why** (purpose, learning loop, corpus ideas) stays in the repo root [`README.md`](../../README.md).

**Ordering rule:** complete earlier phases before depending on later ones unless a spike explicitly says otherwise.

---

## Phase 1 — Vocabulary intake (simplified)

| | |
|---|---|
| **Goal** | Greek/English word pairs available to the app in a stable shape. |
| **Source** | Google Doc layout: **A** = Greek, **B** = English gloss. **C** = topic, **D** = grammatical category (parse but unused in UI until distractor polish). |
| **Deliverables** | Import path (export CSV/JSON from Doc, or script); runtime data format (e.g. JSON) checked in or generated at build. |
| **Side task** | Google Sheets: either **read at runtime** (API + auth constraints) or **periodic export** into the repo from the canonical sheet. |

---

## Phase 2 — Random Greek word, listening-first

| | |
|---|---|
| **Goal** | Validate audio pipeline: pick random lemma, play Greek (TTS or pre-recorded). |
| **UX** | Default: **no on-screen Greek** (listening only). **Optional:** reveal Greek **after** play (toggle or setting). |
| **Deliverables** | Wire TTS or bundled audio; random selection from loaded list. |

---

## Phase 3 — Multiple choice (English gloss)

| | |
|---|---|
| **Goal** | Hear Greek, choose the correct English gloss. |
| **Rules** | **Four** options = one correct + **three distractors**. Distractor **English glosses** are drawn at random from the pool defined by the **choices** filter (see UI). The spoken word is drawn from the pool defined by the **words** filter. |
| **UI** | Copy: **“Select words from [X] and choices from [Y]”** — two dropdowns with the **same** options, set **independently**: default **All words**, then one option per **subcategory** (topic) in the list (e.g. People and Family, Classroom and Office supplies). **X** controls which lemmas can be chosen as the prompt; **Y** controls which lemmas contribute **wrong-answer glosses** (and the correct gloss always matches the prompt word). |
| **Defaults** | With both on **All words**, word and distractors are chosen **at random** from the full list (subject to the four-option rule). |
| **Deliverables** | MCQ UI, play-on-prompt, immediate feedback (ding/bong pattern; record outcomes into Phase 4 stats when stats exist). |

---

## Phase 4 — Minimal stats

| | |
|---|---|
| **Goal** | Persist enough signal for **spaced repetition** and “what to drill next.” |
| **When** | As soon as Phase 2 behaves reliably; refine alongside Phase 3 (MCQ) as modes grow. |
| **Storage** | Browser-only (e.g. `localStorage` / IndexedDB as needed); no accounts. |
| **Deliverables** | Per-item outcomes, scheduling hooks for SRS; keep schema open for Phase 9. |

---

## Phase 5 — Typed English answer

| | |
|---|---|
| **Goal** | Free-text English gloss (not MCQ); same 1:1 expected string as the word list. |
| **Deliverables** | Input field, normalization (trim, case), compare to expected gloss, feedback. |

---

## Phase 6 — English STT + rule-based grading

| | |
|---|---|
| **Goal** | Spoken English answer → text → rule match to expected gloss from the 1:1 list. |
| **Data** | Word list may remain Sheet-backed; same sync story as Phase 1. |
| **Deliverables** | Web Speech API or chosen STT provider; same UX feedback as typed English. |

**Milestone:** **Phases 3, 5, and 6** are the **English-language word loop** (MCQ → typed → voice). **Phase 4** adds minimal stats alongside. That loop should be solid before Phase 7.

---

## Phase 7 — Greek questions + answers in Greek (deferred)

| | |
|---|---|
| **Goal** | Transition from **isolated words + English answers** to **short Greek questions** heard in full, with **appropriate responses in Greek**. |
| **Includes** | **Greek question generation / curation**: pipeline for a finite corpus (e.g. pre-generated JSON, human review, constrained LLM translation—exact stack TBD). Each item needs a **clear, gradable** expected answer. |
| **Pedagogy** | **Listen in context, respond appropriately** — not English gloss ID. |
| **Answers** | **Greek** (typed and/or spoken); Greek ASR + grading when using voice. |
| **Prerequisite** | English word loop (Phases 3, 5–6) end-to-end; stats (Phase 4) as needed for your product. |

---

## Phase 8 — Expand Greek question practice (deferred)

| | |
|---|---|
| **Goal** | More items, difficulty ramps, topics; optional richer question shapes or optional live generation. |
| **Constraint** | Same core contract as Phase 7: **question in Greek → short answer in Greek** (unless product changes). |

---

## Phase 9 — Richer stats and metrics, more vocabulary intake options (later)

| | |
|---|---|
| **Stats / metrics** | Beyond minimal SRS (Phase 4): response **latency**, strengths and weaknesses by word or topic, optional **weighting** practice toward weaker areas, lifetime vs session views—still client-side unless product changes. |
| **Vocabulary intake** | Additional ways to get words into the system (beyond Phase 1’s Google Doc / Sheet path): **paste or upload** a list or small CSV and review before save; **camera + OCR** (e.g. photo of a printed list, extract text, select subset, review); **audio-based**: read Greek words aloud, propose candidate entries per recognized word, filter false starts/duplicates/already-known, end with a **review screen** before saving. |

---

## Technical stack (initial assumptions)

- **Client:** static or minimal SPA in the browser; no backend required for early phases.
- **Audio:** browser TTS and/or pre-generated assets per word (later per question).
- **Secrets:** if using Google APIs for Sheets at runtime, handle credentials outside the public client (or stick to export-to-repo).

Revise this section as the stack is chosen (framework, hosting, STT provider).

---

## Out of scope (early)

- Native app stores, multi-user cloud sync (see README).
- Greek **spoken** answers **before** Phase 7 (English production answers first).
- Sentence-level **English-answer** drills as the main mode before the word loop is done; full **Greek question** corpus at scale is Phase 7–8.
- **Alternate vocabulary intake** (paste, camera, audio) until Phase 9—Phase 1 stays the near-term path.
