from fastapi import HTTPException
from schemas.api_schema import KeyApiCreate
from services.api_service import ApiService

class ApiController:
    def __init__(self):
        self.service = ApiService()
        
    def create_key(self, dados: KeyApiCreate):
        try:
            result = self.service.saveApi(dados)            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))