import os
import json
from fastapi import APIRouter
from controllers.api_controller import ApiController
from schemas.api_schema import KeyApiCreate
from services.llm_initializer import initialize_models
from services.save_results import reset_database, get_all_results_sqlite
from services.data_extractor import extract_tests_from_folder

DADOS_JSON = "dados.json"
DATA_FOLDER = "./data/test_smell_docs"

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

@router.get("/saved-providers")
def get_saved_providers():
    """Returns a list of provider names that already have an API key saved."""
    if not os.path.exists(DADOS_JSON):
        return []
    try:
        with open(DADOS_JSON, "r", encoding="utf-8") as f:
            chaves = json.load(f)
        # Map the internal key names to the frontend provider names
        NAME_MAP = {
            "openai": "OpenAI",
            "togetherai": "TogetherAI",
            "googleai": "GoogleAI",
            "anthropicai": "AnthropicAI",
        }
        return [NAME_MAP.get(k, k) for k in chaves if chaves[k]]
    except Exception:
        return []

@router.delete("/saved-providers/{provider_name}")
def delete_provider_key(provider_name: str):
    """Removes an API key for the given provider from dados.json."""
    if not os.path.exists(DADOS_JSON):
        return {"message": "Nothing to delete."}
    try:
        with open(DADOS_JSON, "r", encoding="utf-8") as f:
            chaves = json.load(f)
        key = provider_name.lower()
        if key in chaves:
            del chaves[key]
            with open(DADOS_JSON, "w", encoding="utf-8") as f:
                json.dump(chaves, f, indent=4, ensure_ascii=False)
        return {"message": f"Key for '{provider_name}' removed."}
    except Exception as e:
        return {"error": str(e)}

@router.get("/test-count")
def get_test_count():
    """Returns the number of tests available in the data folder."""
    try:
        tests = extract_tests_from_folder(DATA_FOLDER)
        return {"count": len(tests)}
    except Exception:
        return {"count": 0}