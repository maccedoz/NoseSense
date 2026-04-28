from fastapi import APIRouter, HTTPException
from schemas.provider_schema import ProviderCreate, ModelAdd, KeyUpdate
from services.provider_service import ProviderService
from services.llm_initializer import initialize_models

router = APIRouter()
service = ProviderService()


@router.post("/create-provider")
def create_provider(payload: ProviderCreate):
    """Create or update a provider with API key, type, and optional base URL."""
    try:
        result = service.save_provider(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved-providers")
def get_saved_providers():
    """Returns a list of providers with their models and metadata."""
    return service.get_saved_providers()


@router.delete("/saved-providers/{provider_name}")
def delete_provider_key(provider_name: str):
    """Removes a provider entirely from the models JSON."""
    try:
        return service.delete_provider(provider_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/providers/{provider_name}/key")
def update_provider_key(provider_name: str, payload: KeyUpdate):
    """Update the API key for an existing provider."""
    try:
        return service.update_api_key(provider_name, payload.api_key)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/providers/{provider_name}/models")
def add_model_to_provider(provider_name: str, payload: ModelAdd):
    """Add a model to an existing provider."""
    try:
        return service.add_model(provider_name, payload.model_name)
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
