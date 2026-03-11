from schemas.api_schema import KeyApiCreate
from datetime import datetime
import uuid
import json
import os

class ApiService:

    def __init__(self):
        self.arquivo_json = "dados.json"

        if not os.path.exists(self.arquivo_json):
            with open(self.arquivo_json, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def saveApi(self, dados: KeyApiCreate):
        with open(self.arquivo_json, "r", encoding="utf-8") as f:
            chaves_salvas = json.load(f)
            
        chaves_salvas[dados.empresa.lower()] = dados.chave_api
        
        with open(self.arquivo_json, "w", encoding="utf-8") as f:
            json.dump(chaves_salvas, f, indent=4, ensure_ascii=False)
            
        return {"empresa": dados.empresa, "status": "salvo no arquivo"}
