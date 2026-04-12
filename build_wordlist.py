#!/usr/bin/env python3
"""
Parse wordlist.md, validate (Phase 1), expand (Phase 2), output lemma-centric JSON.
"""
import re
import json
from collections import defaultdict

SPELLING_FIXES = {
    "ώμοσ": "ώμος", "αυτι": "αυτί", "ποσεσ": "πόσες", "ένασ": "ένας",
    "απιστερά": "αριστερά", "μαχύρη": "μαχαίρι", "γραφω": "γράφω", "κατίζω": "κάθομαι",
    "στουσ": "στους", "στισ": "στις", "δεσποινίς": "δεσποινίδα", "πλυσταριό": "πλυνσταριό",
    "σορτσ": "σορτ", "αυτοι": "αυτοί", "αυτεσ": "αυτές", "αυτα": "αυτά",
    "χείλη": "χείλος", "δόντια": "δόντι", "αδελφοί": "αδελφός", "ενήλικοι": "ενήλικος",
}

def normalize_tag(s):
    return s.strip().lower().replace(" ", "-").replace("**", "")

def parse_md(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    lines = text.split("\n")
    current_heading = None
    current_sub = None
    current_sub2 = None
    word_to_tags = defaultdict(set)
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith("## "):
            current_heading = normalize_tag(line[2:])
            current_sub = None
            current_sub2 = None
            continue
        if line.startswith("### "):
            current_sub = normalize_tag(line[3:])
            current_sub2 = None
            continue
        if line.startswith("#### "):
            current_sub2 = normalize_tag(line[4:])
            continue
        if current_heading is None:
            continue
        content = re.sub(r"^(Nominative|Objective|Genetive|Genitive|Accusative|Possessive)\s*", "", line, flags=re.I)
        content = content.strip()
        # In Phrases and Interjections, split only on comma to preserve "Τα λέμε"
        if current_heading == "phrases-and-interjections" or (current_sub and "phrases" in current_sub):
            parts = [p.strip() for p in content.split(",") if p.strip()]
        else:
            parts = re.split(r"[\s,]+", content)
        if current_sub2:
            section_tag = current_sub2
        elif current_sub:
            section_tag = current_sub
        else:
            section_tag = current_heading
        skip_tokens = {"nominative", "objective", "genetive", "genitive", "accusative", "possessive"}
        for w in parts:
            w = w.strip().strip(",")
            if not w:
                continue
            if w.lower() in skip_tokens or (w.startswith("(") and w.endswith(")")):
                continue
            word_to_tags[w].add(section_tag)
    return word_to_tags

def main():
    word_to_tags = parse_md("/Users/pthomas/src/akouste/wordlist.md")

    raw_entries = []
    for word, tags in word_to_tags.items():
        w = word.strip()
        lemma = SPELLING_FIXES.get(w, w)
        raw_entries.append((lemma, tags, word))

    lemma_to_tags = defaultdict(set)
    for lemma, tags, _ in raw_entries:
        lemma_to_tags[lemma].update(tags)
    for w, tags in word_to_tags.items():
        lemma = SPELLING_FIXES.get(w, w)
        lemma_to_tags[lemma].update(tags)
    lemma_to_tags["των"].add("articles")
    # Normalize to lowercase for single-word lemmas (deduplicate Κάνω/κάνω)
    normalized = defaultdict(set)
    for lemma, tags in lemma_to_tags.items():
        key = lemma if " " in lemma else lemma.lower()
        normalized[key].update(tags)
    lemma_to_tags = dict(normalized)
    # Add phrase "πάρα πολύ" if we have "πάρα" (merge)
    if "πάρα" in lemma_to_tags:
        lemma_to_tags["πάρα πολύ"] = lemma_to_tags.get("πάρα πολύ", set()) | lemma_to_tags["πάρα"]
        del lemma_to_tags["πάρα"]
    # Remove "λέμε" (only part of "Τα λέμε")
    if "λέμε" in lemma_to_tags and lemma_to_tags["λέμε"] == {"phrases-and-interjections"}:
        del lemma_to_tags["λέμε"]

    lemmas_with_tags = list(lemma_to_tags.items())

    from wordlist_data import (
        NOUN_PLURALS,
        VERB_PRESENT,
        ADJECTIVE_FORMS,
        ENGLISH_GLOSSES,
        POS_OVERRIDES,
        SINGLE_FORM_POS,
    )

    def infer_pos(lemma, tags):
        if lemma in POS_OVERRIDES:
            return POS_OVERRIDES[lemma]
        if "articles" in tags:
            return "article"
        if "pronouns" in tags or "possessive-pronouns" in tags:
            return "pronoun"
        if "prepositions" in tags:
            return "preposition"
        if "conjunctions" in tags:
            return "conjunction"
        if "question-words" in tags:
            return "question_word"
        if "phrases-and-interjections" in tags:
            return "phrase" if lemma == "Τα λέμε" else "interjection"
        if "group-1" in tags or "group-2" in tags:
            return "verb"
        if tags & {"verbs"} and lemma in VERB_PRESENT:
            return "verb"
        if "numbers" in tags:
            return "number"
        if "colors" in tags and lemma in ADJECTIVE_FORMS:
            return "adjective"
        if "colors" in tags and lemma == "χρώμα":
            return "noun"
        if "amounts-and-magnitudes" in tags or "location-direction-time-and-space" in tags:
            return "adverb"
        noun_sections = {"people-and-family", "classroom-and-office-supplies", "furniture", "house-and-rooms", "kitchen", "bathroom", "bedroom", "body-parts", "clothes", "colors"}
        if tags & noun_sections and lemma not in VERB_PRESENT:
            return "noun"
        if lemma in VERB_PRESENT:
            return "verb"
        if lemma in ADJECTIVE_FORMS and "colors" in tags:
            return "adjective"
        return "noun"

    lemmas_out = []
    seen = set()
    idx = 1
    for lemma, tags in sorted(lemmas_with_tags, key=lambda x: (x[0].lower())):
        if lemma in seen:
            continue
        seen.add(lemma)
        lemma = lemma.strip()
        tags_list = sorted(tags)
        pos = infer_pos(lemma, tags)
        if pos in SINGLE_FORM_POS:
            forms = [lemma]
        else:
            if pos == "noun":
                forms = [lemma, NOUN_PLURALS[lemma]] if lemma in NOUN_PLURALS else [lemma]
            elif pos == "verb" and lemma in VERB_PRESENT:
                forms = VERB_PRESENT[lemma]
            elif pos == "adjective" and lemma in ADJECTIVE_FORMS:
                forms = ADJECTIVE_FORMS[lemma]
            elif pos == "number" and lemma in ADJECTIVE_FORMS:
                forms = ADJECTIVE_FORMS[lemma]
            else:
                forms = [lemma]
        english = ENGLISH_GLOSSES.get(lemma) or ENGLISH_GLOSSES.get(lemma.lower()) or "?"
        notes = None
        for wrong, right in SPELLING_FIXES.items():
            if right == lemma and wrong in word_to_tags:
                notes = f"corrected from \"{wrong}\""
                break
        lemmas_out.append({
            "id": f"lemma-{idx:03d}",
            "greek": lemma,
            "english": english,
            "pos": pos,
            "tags": tags_list,
            "frequency": "A1",
            "forms": forms,
            "notes": notes,
        })
        idx += 1

    out = {
        "meta": {
            "source": "wordlist.md",
            "version": "1.0",
            "description": "Validated and expanded Greek 101 word list; one lemma per entry; function words and question words as single-form lemmas.",
        },
        "lemmas": lemmas_out,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
