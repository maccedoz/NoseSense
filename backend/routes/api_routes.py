from fastapi import APIRouter
from controllers.api_controller import ApiController
from schemas.api_schema import KeyApiCreate
from services.llm_initializer import initialize_models
from services.save_results import reset_database, get_all_results_sqlite

router = APIRouter()

@router.post("/create-key")
def create_key(dados: KeyApiCreate):
    controller = ApiController()
    return controller.create_key(dados)

@router.get("/active-models")
def get_active_models():
    models_dict = initialize_models()
    return list(models_dict.keys())

@router.delete("/results")
def clear_db_results():
    """Wipes the database and CSV clean."""
    reset_database("resultados.db", "resultado.csv")
    return {"message": "Database and CSV cleared."}

@router.get("/results")
def fetch_previous_results():
    """Returns all historical results from SQLite to populate Dashboard."""
    results = get_all_results_sqlite("resultados.db")
    return results