from schemas.api_schema import ProviderCreate, ModelAdd
import json
import os

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DADOS_JSON = os.path.join(_BASE_DIR, "dados.json")

def _load_data() -> dict:
    """Load dados.json, migrating from old format if needed."""
    if not os.path.exists(DADOS_JSON):
        return {"providers": {}}

    with open(DADOS_JSON, "r", encoding="utf-8") as f:
        raw = json.load(f)

    if "providers" in raw:
        return raw

    OLD_TYPE_MAP = {
        "openai": ("openai", None),
        "togetherai": ("openai", "https://api.together.xyz/v1"),
        "googleai": ("google", None),
        "anthropicai": ("anthropic", None),
    }
    new_data: dict = {"providers": {}}
    for old_key, api_key_value in raw.items():
        if not api_key_value:
            continue
        api_type, base_url = OLD_TYPE_MAP.get(old_key, ("openai", None))
        new_data["providers"][old_key] = {
            "api_key": api_key_value,
            "api_type": api_type,
            "base_url": base_url,
            "models": [],
        }

    _save_data(new_data)
    return new_data


def _save_data(data: dict):
    with open(DADOS_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


class ApiService:
    def save_provider(self, dados: ProviderCreate) -> dict:
        data = _load_data()
        key = dados.name.lower()
        data["providers"][key] = {
            "api_key": dados.api_key,
            "api_type": dados.api_type,
            "base_url": dados.base_url,
            "models": [],
        }
        _save_data(data)
        return {"provider": dados.name, "status": "saved"}

    def delete_provider(self, provider_name: str) -> dict:
        data = _load_data()
        key = provider_name.lower()
        if key in data["providers"]:
            del data["providers"][key]
            _save_data(data)
        return {"message": f"Provider '{provider_name}' removed."}

    def get_saved_providers(self) -> list[dict]:
        data = _load_data()
        result = []
        for key, info in data["providers"].items():
            if info.get("api_key"):
                result.append({
                    "name": key,
                    "api_type": info.get("api_type", "openai"),
                    "base_url": info.get("base_url"),
                    "models": info.get("models", []),
                })
        return result

    def add_model(self, provider_name: str, model_name: str) -> dict:
        data = _load_data()
        key = provider_name.lower()
        if key not in data["providers"]:
            raise ValueError(f"Provider '{provider_name}' not found.")
        models = data["providers"][key].get("models", [])
        if model_name not in models:
            models.append(model_name)
            data["providers"][key]["models"] = models
            _save_data(data)
        return {"provider": provider_name, "model": model_name, "status": "added"}

    def remove_model(self, provider_name: str, model_name: str) -> dict:
        data = _load_data()
        key = provider_name.lower()
        if key not in data["providers"]:
            raise ValueError(f"Provider '{provider_name}' not found.")
        models = data["providers"][key].get("models", [])
        data["providers"][key]["models"] = [m for m in models if m != model_name]
        _save_data(data)
        return {"provider": provider_name, "model": model_name, "status": "removed"}

    def update_api_key(self, provider_name: str, new_api_key: str) -> dict:
        data = _load_data()
        key = provider_name.lower()
        if key not in data["providers"]:
            raise ValueError(f"Provider '{provider_name}' not found.")
        data["providers"][key]["api_key"] = new_api_key
        _save_data(data)
        return {"provider": provider_name, "status": "key updated"}
