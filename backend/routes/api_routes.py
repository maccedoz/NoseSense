from fastapi import APIRouter
from controllers.api_controller import ApiController
from schemas.api_schema import KeyApiCreate
from services.llm_initializer import initialize_models

router = APIRouter()

@router.post("/create-key")
def create_key(dados: KeyApiCreate):
    controller = ApiController()
    return controller.create_key(dados)

@router.get("/active-models")
def get_active_models():
    models_dict = initialize_models()
    return list(models_dict.keys())