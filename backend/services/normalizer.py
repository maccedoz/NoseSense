import difflib
from core.test_smell_types import TEST_SMELL_TYPES

# Threshold mínimo de similaridade para aceitar um match
MATCH_THRESHOLD = 0.65


def normalize_smell_response(raw_response: str) -> tuple[str, bool]:
    """
    Normaliza uma resposta de texto livre da LLM para o nome canônico do smell.

    Retorna:
        (normalized_name, was_normalized)
        - normalized_name: nome canônico ou "UNKNOWN"
        - was_normalized: True se a resposta original precisou ser corrigida
    """
    if not raw_response or not raw_response.strip():
        return "UNKNOWN", True

    cleaned = raw_response.strip()

    # 1. Verificar match exato (case-insensitive)
    for canonical in TEST_SMELL_TYPES:
        if canonical.lower() == cleaned.lower():
            was_normalized = (canonical != cleaned)
            return canonical, was_normalized

    # 2. Verificar se algum nome canônico está contido na resposta
    cleaned_lower = cleaned.lower()
    for canonical in TEST_SMELL_TYPES:
        if canonical.lower() in cleaned_lower:
            return canonical, True

    # 3. Fuzzy match contra a lista canônica
    matches = difflib.get_close_matches(
        cleaned.lower(),
        [s.lower() for s in TEST_SMELL_TYPES],
        n=1,
        cutoff=MATCH_THRESHOLD
    )

    if matches:
        # Recupera o nome canônico com capitalização correta
        matched_lower = matches[0]
        for canonical in TEST_SMELL_TYPES:
            if canonical.lower() == matched_lower:
                return canonical, True

    return "UNKNOWN", True
