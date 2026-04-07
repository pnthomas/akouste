# Akouste — implementation roadmap

Product-facing narrative and capability order live in the repo root [`README.md`](../../README.md). This document is the **development roadmap**: phased work, dependencies, and implementation notes for Cursor and contributors.

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
| **Goal** | Duolingo-style parity: hear Greek, choose correct English gloss. |
| **Rules** | Five options = one correct + **four distractors** drawn **at random from the full list** (later: filter by C/D). |
| **Deliverables** | MCQ UI, play-on-prompt, immediate feedback (ding/bong pattern aligned with later phases). |

---

## Phase 4 — Minimal stats

| | |
|---|---|
| **Goal** | Persist enough signal for **spaced repetition** and “what to drill next.” |
| **When** | Immediately after Phase 2 + 3 behave reliably. |
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

**Milestone:** Phases 3–6 are the **English-language word loop** (MCQ → typed → voice). This should be solid before Phase 7.

---

## Phase 7 — Greek questions + answers in Greek (deferred)

| | |
|---|---|
| **Goal** | Transition from **isolated words + English answers** to **short Greek questions** heard in full, with **appropriate responses in Greek**. |
| **Includes** | **Greek question generation / curation**: pipeline for a finite corpus (e.g. pre-generated JSON, human review, constrained LLM translation—exact stack TBD). Each item needs a **clear, gradable** expected answer. |
| **Pedagogy** | **Listen in context, respond appropriately** — not English gloss ID. |
| **Answers** | **Greek** (typed and/or spoken); Greek ASR + grading when using voice. |
| **Prerequisite** | English word loop (Phases 3–6) end-to-end. |

---

## Phase 8 — Expand Greek question practice (deferred)

| | |
|---|---|
| **Goal** | More items, difficulty ramps, topics; optional richer question shapes or optional live generation. |
| **Constraint** | Same core contract as Phase 7: **question in Greek → short answer in Greek** (unless product changes). |

---

## Phase 9 — Richer stats and metrics (later)

| | |
|---|---|
| **Goal** | Beyond minimal SRS: latency, strengths/weaknesses by word/topic, weighting weak areas, etc. |

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
