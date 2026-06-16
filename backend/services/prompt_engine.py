from core.test_smell_types import TEST_SMELL_TYPES
from core.prompt_alternativas import PROMPT_TEMPLATE as ALTERNATIVAS_TEMPLATE
from core.prompt_aberto import PROMPT_TEMPLATE as ABERTO_TEMPLATE
import random

def create_randomized_prompt(code_snippet: str, correct_smell: str) -> tuple[str | None, str | None, list | None]:
    """Modo alternativas: gera prompt com 5 opções (A-E). Retorna (prompt, letra_correta, opcoes)."""

    # Caso especial: testes limpos (sem smell) vindos do None.txt
    if correct_smell == "None":
        smells_copy = list(TEST_SMELL_TYPES)
        random.shuffle(smells_copy)
        incorrect_options = random.sample(smells_copy, 4)
        options = incorrect_options + ["None"]
        random.shuffle(options)
        correct_letter = "ABCDE"[options.index("None")]

        prompt = ALTERNATIVAS_TEMPLATE.format(
            test_code=code_snippet,
            option_a=options[0],
            option_b=options[1],
            option_c=options[2],
            option_d=options[3],
            option_e=options[4]
        )
        return prompt, correct_letter, options

    if correct_smell not in TEST_SMELL_TYPES:
        print(
            f"Warning: Test smell '{correct_smell}' not found in the predefined list. Skipping.")
        return None, None, None
    smells_copy = list(TEST_SMELL_TYPES)
    random.shuffle(smells_copy)
    other_smells = [s for s in smells_copy if s != correct_smell]
    incorrect_options = random.sample(other_smells, 3)

    options = [correct_smell] + incorrect_options + ["None"]
    random.shuffle(options)

    correct_letter = "ABCDE"[options.index(correct_smell)]

    prompt = ALTERNATIVAS_TEMPLATE.format(
        test_code=code_snippet,
        option_a=options[0],
        option_b=options[1],
        option_c=options[2],
        option_d=options[3],
        option_e=options[4]
    )
    return prompt, correct_letter, options


def create_open_prompt(code_snippet: str) -> str:
    """Modo aberto: gera prompt sem alternativas. Retorna apenas o prompt."""
    prompt = ABERTO_TEMPLATE.format(test_code=code_snippet)
    return prompt
