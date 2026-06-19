import json
import os
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH_JSON = os.path.join(_BASE_DIR, "data", "models", "models.json")


class CustomChatOpenAI(ChatOpenAI):
    """Subclass of ChatOpenAI to accumulate reasoning/thinking content from providers like Together AI/DeepSeek."""

    def _convert_chunk_to_generation_chunk(
        self,
        chunk: dict,
        default_chunk_class: type,
        base_generation_info: dict | None,
    ):
        gen_chunk = super()._convert_chunk_to_generation_chunk(chunk, default_chunk_class, base_generation_info)

        if gen_chunk and hasattr(gen_chunk, "message") and gen_chunk.message:
            choices = chunk.get("choices", []) or chunk.get("chunk", {}).get("choices", [])
            if choices:
                choice = choices[0]
                delta = choice.get("delta", {}) if isinstance(choice, dict) else getattr(choice, "delta", None)
                if delta:
                    reasoning = None
                    if isinstance(delta, dict):
                        reasoning = delta.get("reasoning") or delta.get("reasoning_content")
                    else:
                        reasoning = getattr(delta, "reasoning", None) or getattr(delta, "reasoning_content", None)

                    if reasoning:
                        gen_chunk.message.additional_kwargs["reasoning_content"] = reasoning
                        thinking_wrapped = f"<think>{reasoning}</think>"
                        if gen_chunk.message.content:
                            gen_chunk.message.content += thinking_wrapped
                        else:
                            gen_chunk.message.content = thinking_wrapped

        return gen_chunk

    def _convert_dict_to_message(self, _dict):
        msg = super()._convert_dict_to_message(_dict)
        message = _dict.get("message", {})
        reasoning = None
        if isinstance(message, dict):
            reasoning = message.get("reasoning") or message.get("reasoning_content")
        else:
            reasoning = getattr(message, "reasoning", None) or getattr(message, "reasoning_content", None)

        if reasoning:
            msg.additional_kwargs["reasoning_content"] = reasoning
            thinking_wrapped = f"<think>{reasoning}</think>"
            if msg.content:
                msg.content = thinking_wrapped + "\n" + msg.content
            else:
                msg.content = thinking_wrapped
        return msg


def _load_providers() -> dict:
    if not os.path.exists(PATH_JSON):
        return {}

    try:
        with open(PATH_JSON, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        print(f"Error reading {PATH_JSON}: {e}")
        return {}

    if "providers" in raw:
        return raw["providers"]

    from services.provider_service import _load_data
    data = _load_data()
    return data.get("providers", {})


def initialize_models() -> dict:
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
            backend_id = f"{provider_key.lower()}_{model_name.replace(' ', '_').replace('.', '_').lower()}"

            try:
                if api_type == "google":
                    models[backend_id] = ChatGoogleGenerativeAI(
                        model=model_name,
                        api_key=api_key,
                        streaming=True,
                    )
                elif api_type == "anthropic":
                    models[backend_id] = ChatAnthropic(
                        model=model_name,
                        api_key=api_key,
                        streaming=True,
                    )
                else:
                    kwargs = {
                        "model": model_name,
                        "api_key": api_key,
                        "streaming": True,
                        "max_tokens": 4096,
                    }
                    if "minimax-m3" in model_name.lower():
                        kwargs["model_kwargs"] = {
                            "extra_body": {
                                "thinking": {"type": "adaptive"}
                            }
                        }
                    if base_url:
                        kwargs["base_url"] = base_url
                    models[backend_id] = CustomChatOpenAI(**kwargs)
            except Exception as e:
                print(f"Error initializing model {backend_id}: {e}")
            else:
                print(f"Model {backend_id} initialized successfully")

    return models