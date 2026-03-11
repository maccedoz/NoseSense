from pydantic import BaseModel

class KeyApiCreate(BaseModel):
    empresa: str
    chave_api: str