import os
import json
from fastapi import APIRouter, HTTPException
from schemas.api_schema import ProviderCreate, ModelAdd, KeyUpdate
from services.api_service import ApiService
from services.llm_initializer import initialize_models
from services.save_results import reset_database, get_all_results_sqlite
from services.data_extractor import extract_tests_from_folder

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FOLDER = os.path.join(_BASE_DIR, "data", "test_smell_docs")

router = APIRouter()
service = ApiService()


@router.post("/create-provider")
def create_provider(dados: ProviderCreate):
    """Create or update a provider with API key, type, and optional base URL."""
    try:
        result = service.save_provider(dados)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved-providers")
def get_saved_providers():
    """Returns a list of providers with their models and metadata."""
    return service.get_saved_providers()


@router.delete("/saved-providers/{provider_name}")
def delete_provider_key(provider_name: str):
    """Removes a provider entirely from dados.json."""
    try:
        return service.delete_provider(provider_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/providers/{provider_name}/key")
def update_provider_key(provider_name: str, dados: KeyUpdate):
    """Update the API key for an existing provider."""
    try:
        return service.update_api_key(provider_name, dados.api_key)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/providers/{provider_name}/models")
def add_model_to_provider(provider_name: str, dados: ModelAdd):
    """Add a model to an existing provider."""
    try:
        return service.add_model(provider_name, dados.model_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/providers/{provider_name}/models/{model_name:path}")
def remove_model_from_provider(provider_name: str, model_name: str):
    """Remove a model from a provider."""
    try:
        return service.remove_model(provider_name, model_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active-models")
def get_active_models():
    """Returns all model backend IDs that can be initialized."""
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


@router.get("/test-count")
def get_test_count():
    """Returns the number of tests available in the data folder."""
    try:
        tests = extract_tests_from_folder(DATA_FOLDER)
        return {"count": len(tests)}
    except Exception:
        return {"count": 0}