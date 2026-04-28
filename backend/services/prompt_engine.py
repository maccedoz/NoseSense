from core.test_smell_types import TEST_SMELL_TYPES
from core.prompt import PROMPT_TEMPLATE
import random

def create_randomized_prompt(code_snippet: str, correct_smell: str) -> tuple[str | None, str | None]:
    if correct_smell not in TEST_SMELL_TYPES:
        print(
            f"Warning: Test smell '{correct_smell}' not found in the predefined list. Skipping.")
        return None, None
    random.shuffle(TEST_SMELL_TYPES)
    other_smells = [s for s in TEST_SMELL_TYPES if s != correct_smell]
    incorrect_options = random.sample(other_smells, 3)

    options = [correct_smell] + incorrect_options
    random.shuffle(options)

    correct_letter = "ABCD"[options.index(correct_smell)]

    prompt = PROMPT_TEMPLATE.format(
        test_code=code_snippet,
        option_a=options[0],
        option_b=options[1],
        option_c=options[2],
        option_d=options[3]
    )
    return prompt, correct_letter
