import json
import os
from langchain_openai import ChatOpenAI
from langchain_together import ChatTogether

CAMINHO_JSON = "dados.json"
def search_for_api_keys(name: str) -> str:
    with open(CAMINHO_JSON, "r", encoding="utf-8") as f:
        chaves_salvas = json.load(f)
    return chaves_salvas.get(name.lower())

def initialize_models() -> dict:
    models = {}

    # ✅ OPENAI
    try:
        openai_key = search_for_api_keys("openai")
    except Exception as e:
        print(f"Error occurred while fetching OpenAI API key: {e}")
        openai_key = None

    if openai_key:
        models.update({
            "openai_gpt5": ChatOpenAI(model="gpt-5", api_key=openai_key),
            "openai_gpt4.1": ChatOpenAI(model="gpt-4.1", api_key=openai_key),
            "openai_gpt4.1_nano": ChatOpenAI(model="gpt-4.1-nano", api_key=openai_key),
            "openai_gpt5_nano": ChatOpenAI(model="gpt-5-nano", api_key=openai_key),
        })

    # ✅ TOGETHER AI
    try:
        together_key_1 = search_for_api_keys("together")
    except Exception as e:
        print(f"Error occurred while fetching Together AI API key: {e}")
        together_key_1 = None

    if together_key_1:
        models.update({
            "together_deepseek": ChatTogether(model="deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free", api_key=together_key_1),
            "together_gemma": ChatTogether(model="google/gemma-3n-E4B-it", api_key=together_key_1),
            "together_qwen": ChatTogether(model="Qwen/Qwen2.5-7B-Instruct-Turbo", api_key=together_key_1),
        })

    return models