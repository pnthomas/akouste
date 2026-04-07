# Akouste

Akouste is a listening-comprehension practice app for Greek (ákouste means "listen" in Greek).  
Its goal is to make listening practice low-stress and confidence-building, especially for beginners following a classroom course.

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

This roadmap describes capabilities, not specific technologies, so the implementation can evolve.

1. **Play Greek questions and show answers**  
   - The app has a fixed set of Q&A pairs.
   - It can:
     - Select a question.
     - Play the question in Greek (TTS or pre-recorded audio).
     - Display the expected answer on screen.
   - There is **no user input** yet; this is just "listen and see the answer."

2. **Text-based answer and feedback**  
   - The learner types their answer into an input field.
   - The app:
     - Normalizes the input (e.g. trimming, case, optional diacritics).
     - Compares it to the expected answer.
     - Plays a **ding** for correct / **bong** for incorrect.
     - Shows the expected answer for learning.

3. **Voice-based answer and feedback**  
   - The learner answers by speaking into the device's microphone.
   - The app:
     - Uses speech recognition to turn the spoken answer into text (for Greek).
     - Evaluates the answer in the same way as for text input.
     - Plays **ding/bong** and shows the expected answer.

4. **Dictionary / vocabulary intake**  
   - Make it easy to get classroom vocabulary into the system:
     - **Baseline:** Paste a list of words or upload a small text/CSV file, review them, and add them to the dictionary.
     - **Camera-based (Google-Lens-style):** Take a photo of a printed word list, extract text (OCR), then "select all / subset" and review before importing.
     - **Audio-based:** Read Greek words aloud from a vocabulary list; for each recognized word, the app creates a candidate entry for this session, filtering out false starts, mispronunciations, duplicates, and words already in the dictionary, then presents a review screen to confirm before saving.

5. **Stats and metrics**  
   - Track how the learner is doing over time:
     - Correct vs. missed questions.
     - Optional **spaced repetition** for missed items.
     - Strengths and weaknesses by word or topic.
     - Option to **weight practice** toward weaker areas.
     - Lifetime or session-based **response latency** (how quickly answers are given).
   - All stored locally in the browser, so no account or backend is required initially.

---

## How to use this README

- When you create the GitHub repo, this file serves as the default landing page.
- A more detailed **implementation plan** (tech stack, phased roadmap) lives in `.cursor/plans` for development reference.
- This README stays **human-facing**, describing what Akouste is, why it exists, and what it will be able to do.
