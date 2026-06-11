from fastapi import APIRouter
from services.db_service import get_all_open_results_sqlite, reset_database

router = APIRouter()

OUTPUT_DB_FILE = "./data/output/results_open.db"
OUTPUT_CSV_FILE = "./data/output/results_open.csv"


@router.delete("/open-results")
def clear_open_results():
    """Limpa o banco e CSV do modo aberto."""
    reset_database(OUTPUT_DB_FILE, OUTPUT_CSV_FILE)
    return {"message": "Open mode database and CSV cleared."}


@router.get("/open-results")
def fetch_open_results():
    """Retorna todos os resultados históricos do modo aberto."""
    results = get_all_open_results_sqlite(OUTPUT_DB_FILE)
    return results
