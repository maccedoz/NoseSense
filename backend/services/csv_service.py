import csv
import os


def init_csv(filename: str, headers: list):
    """Creates (or recreates) the CSV file with the given headers."""
    dirname = os.path.dirname(filename)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
        print(f"CSV initialized: '{filename}'")
    except Exception as e:
        print(f"\nError initializing CSV file: {e}")


def append_row_to_csv(filename: str, row: dict, headers: list):
    """Appends a single row to an existing CSV file.
    If the file doesn't exist yet, it creates it with headers first."""
    dirname = os.path.dirname(filename)
    if dirname:
        os.makedirs(dirname, exist_ok=True)

    is_new_file = not os.path.exists(filename) or os.path.getsize(filename) == 0
    try:
        with open(filename, 'a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            if is_new_file:
                writer.writeheader()
            writer.writerow(row)
    except Exception as e:
        print(f"\nError appending to CSV file: {e}")
