import re
from typing import List, Dict, Any
from backend.services.model_loader import model_loader

# Words to omit in Indian Sign Language (ISL lacks copulas, articles, and minor auxiliary markers)
OMITTED_WORDS = {
    "is", "am", "are", "was", "were", "be", "been", "being",
    "a", "an", "the",
    "of", "to", "at", "by", "for", "with", "about", "into",
    "do", "does", "did",
    "have", "has", "had",  # unless main verb
    "that", "this", "these", "those"
}

WH_QUESTION_WORDS = {"WHAT", "WHERE", "WHEN", "WHY", "WHO", "HOW", "WHICH"}
TIME_MARKERS = {"TODAY", "YESTERDAY", "TOMORROW", "NOW", "MORNING", "NIGHT", "DAY", "WEEK", "MONTH", "YEAR"}
NEGATION_WORDS = {"NOT", "NO", "NEVER", "DONT", "CANNOT"}

# Mapping common phrases and synonyms to standard ISL glosses
PHRASE_MAPPINGS = {
    "how are you": ["HOW", "YOU", "FINE"],
    "nice to meet you": ["MEET", "YOU", "HAPPY"],
    "what is your name": ["YOUR", "NAME", "WHAT"],
    "where are you going": ["YOU", "GO", "WHERE"],
    "where is the hospital": ["HOSPITAL", "WHERE"],
    "i need help": ["HELP", "I", "WANT"],
    "please help me": ["PLEASE", "HELP", "ME"],
    "thank you very much": ["THANK YOU"],
    "good morning": ["GOOD MORNING"],
    "good night": ["GOOD NIGHT"],
    "i love you": ["LOVE", "YOU"],
    "i am hungry": ["HUNGRY", "I", "FOOD", "WANT"],
    "i want water": ["WATER", "I", "WANT"],
    "i do not understand": ["UNDERSTAND", "NOT"],
    "see you later": ["SEE", "YOU", "LATER"]
}

def transform_english_to_isl(text: str) -> Dict[str, Any]:
    """
    Transforms natural English into Indian Sign Language (ISL) gloss sequence
    according to ISL grammatical principles:
    1. Topic-Comment / Subject-Object-Verb (SOV) order
    2. Temporal markers first (Time frame setting)
    3. WH-words moved to sentence end
    4. Negation positioned adjacent to predicate/end
    5. Elimination of copulas & articles
    """
    cleaned = text.strip().lower()
    cleaned = re.sub(r'[^\w\s]', '', cleaned)

    # Check idiom / phrase dictionary first
    for phrase, seq in PHRASE_MAPPINGS.items():
        if phrase in cleaned:
            return {
                "isl_sequence": seq,
                "structure": "Standard Idiomatic ISL Expression",
                "rules_applied": ["Idiomatic phrase mapping", "Contextual gloss match"]
            }

    tokens = cleaned.split()
    meaningful_tokens = [t for t in tokens if t not in OMITTED_WORDS]

    time_tokens = []
    subject_tokens = []
    object_tokens = []
    verb_tokens = []
    neg_tokens = []
    wh_tokens = []
    other_tokens = []

    for t in meaningful_tokens:
        upper = t.upper()
        # Normalization
        if upper in ("ME", "MYSELF"):
            upper = "I"
        elif upper in ("YOURS", "YOUR"):
            upper = "YOUR"

        if upper in TIME_MARKERS:
            time_tokens.append(upper)
        elif upper in WH_QUESTION_WORDS:
            wh_tokens.append(upper)
        elif upper in NEGATION_WORDS:
            neg_tokens.append(upper)
        elif upper in ("I", "YOU", "HE", "SHE", "WE", "THEY", "MOTHER", "FATHER", "DOCTOR", "TEACHER", "FRIEND"):
            subject_tokens.append(upper)
        elif upper in ("EAT", "DRINK", "GO", "COME", "STUDY", "WORK", "SEE", "HELP", "BUY", "WANT", "CALL", "PLAY", "READ", "WRITE"):
            verb_tokens.append(upper)
        elif upper in ("WATER", "FOOD", "TEA", "COFFEE", "BOOK", "PEN", "HOSPITAL", "BUS", "TRAIN", "CAR", "HOME", "SCHOOL"):
            object_tokens.append(upper)
        else:
            other_tokens.append(upper)

    # ISL Order: [TIME] -> [SUBJECT] -> [OBJECT] -> [OTHER] -> [VERB] -> [NEGATION] -> [WH-QUESTION]
    isl_sequence = []
    isl_sequence.extend(time_tokens)
    isl_sequence.extend(subject_tokens)
    isl_sequence.extend(object_tokens)
    isl_sequence.extend(other_tokens)
    isl_sequence.extend(verb_tokens)
    isl_sequence.extend(neg_tokens)
    isl_sequence.extend(wh_tokens)

    # Fallback to token uppercase if sequence is empty
    if not isl_sequence:
        isl_sequence = [t.upper() for t in tokens if t]

    # Validate against known vocabulary
    validated_sequence = []
    for sign in isl_sequence:
        if sign in model_loader.vocabulary:
            validated_sequence.append(sign)
        else:
            # Check partial match or individual word
            matched = False
            for vocab_sign in model_loader.vocabulary:
                if sign == vocab_sign or sign in vocab_sign.split():
                    validated_sequence.append(vocab_sign)
                    matched = True
                    break
            if not matched:
                validated_sequence.append(sign)

    return {
        "isl_sequence": validated_sequence if validated_sequence else ["HELLO"],
        "structure": "ISL SOV / Topic-Comment Order (Time-Subject-Object-Verb-Negation-Question)",
        "rules_applied": [
            "Omission of copulas (is/are/am) and articles (a/the)",
            "Temporal markers moved to sentence head",
            "WH-question words shifted to sentence coda",
            "Subject-Object-Verb syntactic alignment"
        ]
    }
