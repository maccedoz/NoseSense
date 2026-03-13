import sqlite3
import datetime
import csv
import os

def init_db_and_get_run(db_filename: str) -> int:
    """Creates tables if they don't exist and returns a new run_id."""
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
        print(f"\n❌ Erro ao inicializar SQLite: {e}")
        return -1
    finally:
        if conn:
            conn.close()

def append_single_result_to_sqlite(db_filename: str, run_id: int, test_index: int, test_smell: str, correct_answer: str, model_name: str, model_response: str):
    """Appends a single LLM response to the database."""
    if run_id == -1: return

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
        print(f"\n❌ Erro ao inserir linha no SQLite: {e}")
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
                "providerName": "Automático", # Na vdd backend soh manda modelo. providerName front descobre usando store
                "modelName": row["model_name"],
                "testType": row["test_smell"],
                "answer": row["answer"],
                "errorMessage": row["answer"] if row["status"] == 0 and len(row["answer"]) > 2 else None,
                "status": "success" if row["status"] else "error" if len(row["answer"]) > 2 else "success" # Hackish: se tamanho > 2 eh pq tem msg de erro (TIMEOUT/ERROR/PARSE) senao (A|B). Como a API nova eh dinamica
            })
    except sqlite3.OperationalError:
        pass # Tabela ainda nn existe
    except Exception as e:
        print(f"\n❌ Erro ao ler resultados: {e}")
    finally:
        if conn: conn.close()
    return results

def reset_database(db_filename: str, csv_filename: str):
    """Deletes the SQLite file and the CSV file."""
    if os.path.exists(db_filename):
        os.remove(db_filename)
    if os.path.exists(csv_filename):
        os.remove(csv_filename)

def save_results_to_csv(filename: str, results: list, headers: list):
    """Appends a list of dictionaries to a CSV file."""
    if not results:
        print("No results to save to CSV.")
        return

    is_new_file = not os.path.exists(
        filename) or os.path.getsize(filename) == 0
    try:
        with open(filename, 'a', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            if is_new_file:
                writer.writeheader()
            writer.writerows(results)
        print(f"✅ Resultados salvos com sucesso no CSV '{filename}'")
    except Exception as e:
        print(f"\n❌ Erro ao salvar arquivo CSV: {e}")