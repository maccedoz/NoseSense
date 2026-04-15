import json
import os
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic

CAMINHO_JSON = "dados.json"


def _load_providers() -> dict:
    """Load providers from dados.json (new format)."""
    if not os.path.exists(CAMINHO_JSON):
        return {}

    try:
        with open(CAMINHO_JSON, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        print(f"Erro ao ler {CAMINHO_JSON}: {e}")
        return {}

    # New format
    if "providers" in raw:
        return raw["providers"]

    # Old format — trigger migration by importing api_service
    from services.api_service import _load_data
    data = _load_data()
    return data.get("providers", {})


def initialize_models() -> dict:
    """Dynamically initialize LLM models based on user-configured providers."""
    models = {}
    providers = _load_providers()

    for provider_key, info in providers.items():
        api_key = info.get("api_key")
        if not api_key:
            continue

        api_type = info.get("api_type", "openai")
        base_url = info.get("base_url")
        model_list = info.get("models", [])

        for model_name in model_list:
            # Backend ID: provider_modelname (sanitized)
            backend_id = f"{provider_key}_{model_name.replace(' ', '_').replace('.', '_').lower()}"

            try:
                if api_type == "google":
                    models[backend_id] = ChatGoogleGenerativeAI(
                        model=model_name,
                        api_key=api_key,
                    )
                elif api_type == "anthropic":
                    models[backend_id] = ChatAnthropic(
                        model=model_name,
                        api_key=api_key,
                    )
                else:
                    # Default: OpenAI-compatible (works for OpenAI, Together, Groq, etc.)
                    kwargs = {
                        "model": model_name,
                        "api_key": api_key,
                    }
                    if base_url:
                        kwargs["base_url"] = base_url
                    models[backend_id] = ChatOpenAI(**kwargs)
            except Exception as e:
                print(f"Erro ao inicializar modelo {backend_id}: {e}")

    return models