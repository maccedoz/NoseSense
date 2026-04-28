from fastapi import APIRouter
from services.db_service import get_all_results_sqlite, reset_database

router = APIRouter()

OUTPUT_DB_FILE = "./data/output/results.db"
OUTPUT_CSV_FILE = "./data/output/results.csv"


@router.delete("/results")
def clear_db_results():
    """Wipes the database and CSV clean."""
    reset_database(OUTPUT_DB_FILE, OUTPUT_CSV_FILE)
    return {"message": "Database and CSV cleared."}


@router.get("/results")
def fetch_previous_results():
    """Returns all historical results from SQLite to populate Dashboard."""
    results = get_all_results_sqlite(OUTPUT_DB_FILE)
    return results
