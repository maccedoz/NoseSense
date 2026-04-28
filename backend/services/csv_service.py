import csv
import os


def save_results_to_csv(filename: str, results: list, headers: list):
    """Appends a list of dictionaries to a CSV file."""
    if not results:
        print("No results to save to CSV.")
        return

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    is_new_file = not os.path.exists(filename) or os.path.getsize(filename) == 0
    try:
        with open(filename, 'a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            if is_new_file:
                writer.writeheader()
            writer.writerows(results)
        print(f"✅ Results saved successfully to CSV '{filename}'")
    except Exception as e:
        print(f"\n❌ Error saving CSV file: {e}")
