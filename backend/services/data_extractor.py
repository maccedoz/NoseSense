from pathlib import Path
import re

def extract_tests_from_folder(folder_path: str) -> list:
    folder = Path(folder_path)
    if not folder.is_dir():
        raise FileNotFoundError(
            f"Error: The folder '{folder_path}' was not found.")

    extracted_tests = []
    print(f"Searching for test files in '{folder.resolve()}'...")

    files = list(folder.glob("*.txt"))
    if not files:
        print(f"Warning: No .txt files found in '{folder_path}'.")
        return []

    for file_path in files:
        true_test_smell = file_path.stem
        print(
            f"Reading file: '{file_path.name}' for smell: '{true_test_smell}'")

        content = file_path.read_text(encoding='utf-8')
        code_blocks = re.findall(
            r"```(?:java)?(.*?)```", content, re.DOTALL)

        if not code_blocks:
            print(
                f"  -> Warning: No code blocks found in '{file_path.name}'.")
            continue

        for code in code_blocks:
            extracted_tests.append({
                "source_file": file_path.name,
                "code_to_analyze": code.strip(),
                "correct_smell": true_test_smell
            })

    print(
        f"\nTotal of {len(extracted_tests)} tests extracted from {len(files)} files.\n")
    return extracted_tests
