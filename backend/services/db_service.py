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
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test_options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                evaluation_id INTEGER NOT NULL,
                option_a TEXT NOT NULL,
                option_b TEXT NOT NULL,
                option_c TEXT NOT NULL,
                option_d TEXT NOT NULL,
                option_e TEXT,
                FOREIGN KEY(evaluation_id) REFERENCES llm_evaluations(id)
            )
        ''')
        # Migrate existing test_options table if option_e is missing
        try:
            cursor.execute('ALTER TABLE test_options ADD COLUMN option_e TEXT')
            conn.commit()
        except sqlite3.OperationalError:
            pass

        cursor.execute('INSERT INTO test_runs DEFAULT VALUES')
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"\nError initializing SQLite: {e}")
        return -1
    finally:
        if conn:
            conn.close()


def append_single_result_to_sqlite(db_filename: str, run_id: int, test_index: int, test_smell: str, correct_answer: str, model_name: str, model_response: str, options: list[str] = None):
    """Appends a single LLM response and its options to the database."""
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

        evaluation_id = cursor.lastrowid

        if options and len(options) >= 5:
            cursor.execute('''
                INSERT INTO test_options
                (evaluation_id, option_a, option_b, option_c, option_d, option_e)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (evaluation_id, options[0], options[1], options[2], options[3], options[4]))

        conn.commit()
        return evaluation_id
    except Exception as e:
        print(f"\n Error inserting row into SQLite: {e}")
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

        # Ensure test_options table is migrated if it already exists from old runs
        try:
            cursor.execute('ALTER TABLE test_options ADD COLUMN option_e TEXT')
            conn.commit()
        except sqlite3.OperationalError:
            pass

        cursor.execute('''
            SELECT e.test_index, e.test_smell, e.correct_answer, e.model_name,
                   e.model_response as answer, e.is_correct as status,
                   o.option_a, o.option_b, o.option_c, o.option_d, o.option_e
            FROM llm_evaluations e
            LEFT JOIN test_options o ON o.evaluation_id = e.id
        ''')
        rows = cursor.fetchall()

        _ERROR_CODES = {"TIMEOUT", "API_ERROR", "PARSE_ERROR", "EMPTY_RESPONSE"}
        for row in rows:
            answer = row["answer"]
            is_api_error = answer in _ERROR_CODES
            result_entry = {
                "testIndex": row["test_index"],
                "correctAnswer": row["correct_answer"],
                "providerName": "Automatic",
                "modelName": row["model_name"],
                "testType": row["test_smell"],
                "answer": answer,
                "isCorrect": bool(row["status"]),
                "errorMessage": answer if is_api_error else None,
                "status": "error" if is_api_error else "success"
            }
            if row["option_a"]:
                result_entry["options"] = {
                    "A": row["option_a"],
                    "B": row["option_b"],
                    "C": row["option_c"],
                    "D": row["option_d"],
                    "E": row["option_e"] if row["option_e"] is not None else "None"
                }
            results.append(result_entry)
    except sqlite3.OperationalError:
        pass
    except Exception as e:
        print(f"\n Error reading results: {e}")
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


# ─────────────────────────────────────────────
# Modo Aberto (prompt sem alternativas)
# ─────────────────────────────────────────────

def init_open_db_and_get_run(db_filename: str) -> int:
    """Cria as tabelas do modo aberto (se não existirem) e retorna um novo run_id."""
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
            CREATE TABLE IF NOT EXISTS open_evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER,
                test_index INTEGER,
                test_smell TEXT,
                model_name TEXT,
                raw_response TEXT,
                normalized_response TEXT,
                was_normalized BOOLEAN,
                is_correct BOOLEAN,
                FOREIGN KEY(run_id) REFERENCES test_runs(run_id)
            )
        ''')
        cursor.execute('INSERT INTO test_runs DEFAULT VALUES')
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"\nError initializing open SQLite: {e}")
        return -1
    finally:
        if conn:
            conn.close()


def append_open_result_to_sqlite(
    db_filename: str,
    run_id: int,
    test_index: int,
    test_smell: str,
    model_name: str,
    raw_response: str,
    normalized_response: str,
    was_normalized: bool,
):
    """Insere um resultado do modo aberto no banco."""
    if run_id == -1:
        return
    conn = None
    try:
        conn = sqlite3.connect(db_filename)
        cursor = conn.cursor()
        is_correct = (normalized_response == test_smell)
        cursor.execute('''
            INSERT INTO open_evaluations
            (run_id, test_index, test_smell, model_name, raw_response, normalized_response, was_normalized, is_correct)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (run_id, test_index, test_smell, model_name, raw_response, normalized_response, was_normalized, is_correct))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"\n Error inserting open result into SQLite: {e}")
        return None
    finally:
        if conn:
            conn.close()


def get_all_open_results_sqlite(db_filename: str) -> list:
    """Retorna todos os resultados da tabela open_evaluations."""
    conn = None
    results = []
    try:
        conn = sqlite3.connect(db_filename)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('''
            SELECT test_index, test_smell, model_name,
                   raw_response, normalized_response, was_normalized, is_correct
            FROM open_evaluations
        ''')
        _ERROR_CODES = {"TIMEOUT", "API_ERROR", "EMPTY_RESPONSE", "UNKNOWN"}
        rows = cursor.fetchall()
        for row in rows:
            normalized = row["normalized_response"]
            is_api_error = normalized in _ERROR_CODES
            results.append({
                "testIndex": row["test_index"],
                "testType": row["test_smell"],
                "providerName": "Automatic",
                "modelName": row["model_name"],
                "rawResponse": row["raw_response"],
                "normalizedResponse": normalized,
                "wasNormalized": bool(row["was_normalized"]),
                "isCorrect": bool(row["is_correct"]),
                "status": "error" if is_api_error else "success",
            })
    except sqlite3.OperationalError:
        pass
    except Exception as e:
        print(f"\n Error reading open results: {e}")
    finally:
        if conn:
            conn.close()
    return results
