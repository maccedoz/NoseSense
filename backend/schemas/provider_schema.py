from pydantic import BaseModel
from typing import Optional


class ProviderCreate(BaseModel):
    name: str
    api_key: str
    api_type: str  # "openai", "google", "anthropic"
    base_url: Optional[str] = None


class ModelAdd(BaseModel):
    model_name: str


class KeyUpdate(BaseModel):
    api_key: str
