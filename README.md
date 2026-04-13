# Akouste

Live at: [https://pnthomas.github.io/akouste/](https://pnthomas.github.io/akouste/)  

Akouste is a listening-comprehension practice app for Greek (ákouste means "listen" in Greek). Its goal is to make listening practice low-stress and confidence-building, especially for beginners following a classroom course.

Runs in browser via web so it should work on any device. Tested on OSX + Chrome and Pixel 9 + Chrome. It uses TTS so you might have to add Greek as a supported TTS langage on your mobile device, see **Mobile Setup**, below.

## Purpose

- **Focus on listening, not speaking:** The primary skill is listening comprehension; speaking is secondary and comes later via voice answers.
- **Low-stress, confidence-building practice:** Short, simple, highly constrained questions with clear, unambiguous answers.
- **Aligned with classroom vocabulary:** Questions only use words from a configurable vocabulary list (e.g. a class word list).

## Core learning loop

1. The app **speaks a question in Greek** (using TTS or pre-recorded audio).
2. The learner **answers**:
  - First via **text**, then later via **voice**.
3. The app **evaluates the answer**:
  - **Correct** → "ding" sound.
  - **Incorrect** → "bong" sound and show the expected answer.
4. Repeat with another question.

## Question design

- **Closed-ended and simple:** Questions are crafted so answers are short and easy to grade:
  - Yes/no answers.
  - Simple nouns (e.g. room, object, relation).
  - Simple numbers, colors, names, actions.
- **Examples (in English for illustration):**
  - "In what room is the oven?" → "The kitchen."
  - "Is your uncle a woman?" → "No."
  - "How many legs do you have?" → "Two."
- **Goal:** Not deep reasoning, just clear signals that the learner heard and understood correctly.

## Question corpus strategy

To keep runtime simple and cheap, Akouste uses a **pre-generated, finite corpus** of Q&A pairs:

1. **Generate English Q&A with an LLM**
  - Use a large language model to create hundreds of simple, closed-ended Q&A pairs in **English**, constrained by:
    - Target difficulty.
    - A specific **vocabulary list** (words the student has learned in class).
2. **Human review and pruning**
  - Manually remove or edit:
    - Awkward, confusing, or ambiguous questions.
    - Items that don't fit the desired style or difficulty.
3. **Translate to Greek with constraints**
  - Use the LLM again to translate vetted English Q&A into **Greek**, with instructions to:
    - Respect the same vocabulary list.
    - Keep answers short and closed-ended.
4. **Export for the app**
  - Store the final Greek Q&A in a **JSON (or similar) file** that the app loads at runtime.
  - Optionally pre-generate **audio files** (e.g. `.mp3`) for each question.

This process can be repeated a few times to build a large, offline corpus.  
Later, a **live-generation mode** can be added as an optional feature for extra variety.

## Platform and tech (high level)

- **Platform:** Web app
  - Runs in a browser.
  - On Android, can be "Added to Home Screen" to feel app-like.
  - Easy to test on a MacBook and to share via a URL.
- **Initial stack:** A simple, lightweight frontend:
  - Static or minimal single-page app (SPA).
  - Pre-generated Q&A JSON files (and optional audio files).
  - No backend required for the early phases.
- **Data and privacy:**
  - Stats and progress can live in **browser storage** (e.g. `localStorage`), so no server or account system is required initially.

## Audience and scope

- **Primary audience:** You (the creator) and other beginner/intermediate learners of Greek.
- **Secondary audience:** Potentially other learners or teachers who want:
  - Custom word lists aligned with their class.
  - A low-friction, focused listening tool.
- **Out of scope for early versions:**
  - Native mobile apps and app store distribution.
  - Multi-user account systems and cloud-sync of stats.

## Roadmap (capabilities)

Capabilities are ordered **1 → 9** to match the phased plan in `[.cursor/plans/roadmap.md](.cursor/plans/roadmap.md)`. Early work centers on **classroom vocabulary** and **English-backed answers**; **short Greek questions with Greek answers** comes later (phases 7–8). Details and milestones live in that file.

1. **Vocabulary intake**
  - Greek/English pairs (plus topic and grammatical category) in a stable runtime format.  
  - Near term: Google Sheet → export / script → JSON checked in or generated at build.
2. **Random Greek word, listening-first**
  - Pick a word from the list, play it in Greek (TTS or bundled audio).  
  - Default: **no on-screen Greek** while listening; optional reveal after play.
3. **Multiple choice (English gloss)**
  - Hear Greek, choose the correct English gloss: **four** options = one correct + **three distractors**.  
  - UI: **“Select words from [X] and choices from [Y]”** — two independent dropdowns (same options: **All words**, then each **subcategory** / topic). **X** limits which words can be prompted; **Y** limits where distractor glosses are drawn from. Default **All** / **All** = fully random.  
  - Immediate feedback (**ding** / **bong**); outcomes feed phase-4 stats when implemented.
4. **Minimal stats**
  - Persist enough for **spaced repetition** and “what to drill next.”  
  - **Browser-only** storage (e.g. `localStorage` / IndexedDB); no accounts.  
  - Refined alongside phase 3 as modes grow.
5. **Typed English answer**
  - Type the English gloss; normalize (trim, case), compare to the expected string, same feedback pattern as MCQ.
6. **Spoken English answer (STT)**
  - Speak the English gloss; speech-to-text, then rule match to the expected gloss; same feedback as typed English.
7. **Greek questions + answers in Greek** *(deferred)*
  - Move from isolated words and English answers to **short Greek questions** heard in full, with **short Greek answers** (typed and/or spoken). Requires a curated Greek Q&A corpus.
8. **Expand Greek question practice** *(deferred)*
  - More items, difficulty, topics; optional richer shapes or optional live generation—still **question in Greek → answer in Greek**.
9. **Richer stats and more vocabulary intake options** *(later)*
  - **Stats:** Beyond minimal SRS—e.g. latency, strengths/weaknesses by word or topic, optional weighting toward weak areas, lifetime vs session views (still client-side unless the product changes).  
  - **Vocabulary:** Paste/upload CSV, camera + OCR, or audio-based capture with review—beyond the phase-1 Sheet path.

**Milestone:** Phases **3, 5, and 6** are the **English-language word loop** (MCQ → typed → voice). **Phase 4** adds minimal stats alongside. That loop should be solid before phase 7.

---

## Mobile Setup

**Greek TTS** depends on your OS/browser voices—if audio is wrong or silent, check system speech/voice settings and try another browser.  

**Install Greek Voice Data:**

- Open your Pixel **Settings** > **System** > **Language & Region**
- In **Preferred Languages** add **Ελληνικά**.  > **Text-to-speech output**.
- In **App Languages**, set your browser (e.g. **Chrome**) to **Ελληνικά.**
- In **Speech > Text to Speech Output**
  - Tap Language and select Greek
  - Then tap the **cog icon** next to "Preferred engine" (usually Google Speech Services) and select **Install voice data**.
- **Chrome Permissions:**
  - Ensure Chrome isn't in "Data Saver" mode, which can sometimes block the fetching of remote TTS assets.

---

