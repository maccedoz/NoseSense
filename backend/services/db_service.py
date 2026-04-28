import sqlite3
import os


def init_db_and_get_run(db_filename: str) -> int:
    """Creates tables if they don't exist and returns a new run_id."""
    os.makedirs(os.path.dirname(db_filename), exist_ok=True)
    conn = None
    try:
        conn = sqlite3.connect(db_filename)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test_runs (
                run_id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS llm_evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER,
                test_index INTEGER,
                test_smell TEXT,
                correct_answer TEXT,
                model_name TEXT,
                model_response TEXT,
                is_correct BOOLEAN,
                FOREIGN KEY(run_id) REFERENCES test_runs(run_id)
            )
        ''')
        cursor.execute('INSERT INTO test_runs DEFAULT VALUES')
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"\n❌ Error initializing SQLite: {e}")
        return -1
    finally:
        if conn:
            conn.close()


def append_single_result_to_sqlite(db_filename: str, run_id: int, test_index: int, test_smell: str, correct_answer: str, model_name: str, model_response: str):
    """Appends a single LLM response to the database."""
    if run_id == -1:
        return

    conn = None
    try:
        conn = sqlite3.connect(db_filename)
        cursor = conn.cursor()
        is_correct = (model_response == correct_answer)

        cursor.execute('''
            INSERT INTO llm_evaluations 
            (run_id, test_index, test_smell, correct_answer, model_name, model_response, is_correct)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (run_id, test_index, test_smell, correct_answer, model_name, model_response, is_correct))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"\n❌ Error inserting row into SQLite: {e}")
        return None
    finally:
        if conn:
            conn.close()


def get_all_results_sqlite(db_filename: str) -> list:
    """Returns all rows from the llm_evaluations table across all runs."""
    conn = None
    results = []
    try:
        conn = sqlite3.connect(db_filename)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT test_index, test_smell, correct_answer, model_name, model_response as answer, is_correct as status FROM llm_evaluations')
        rows = cursor.fetchall()

        for row in rows:
            results.append({
                "testIndex": row["test_index"],
                "correctAnswer": row["correct_answer"],
                "providerName": "Automatic",
                "modelName": row["model_name"],
                "testType": row["test_smell"],
                "answer": row["answer"],
                "errorMessage": row["answer"] if row["status"] == 0 and len(row["answer"]) > 2 else None,
                "status": "success" if row["status"] else "error" if len(row["answer"]) > 2 else "success"
            })
    except sqlite3.OperationalError:
        pass  # Table doesn't exist yet
    except Exception as e:
        print(f"\n❌ Error reading results: {e}")
    finally:
        if conn:
            conn.close()
    return results


def reset_database(db_filename: str, csv_filename: str):
    """Deletes the SQLite file and the CSV file."""
    if os.path.exists(db_filename):
        os.remove(db_filename)
    if os.path.exists(csv_filename):
        os.remove(csv_filename)
