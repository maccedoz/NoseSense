import json
import os
import re 
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

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

    # # ✅ TOGETHER AI
    try:
        together_key_1 = search_for_api_keys("togetherai")
    except Exception as e:
        print(f"Error occurred while fetching Together AI API key: {e}")
        together_key_1 = None

    if together_key_1:
        models.update({
            "togetherai_deepseek": ChatOpenAI(base_url="https://api.together.xyz/v1", model="deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free", api_key=together_key_1),
            "togetherai_gemma": ChatOpenAI(base_url="https://api.together.xyz/v1", model="google/gemma-3n-E4B-it", api_key=together_key_1),
            "togetherai_qwen": ChatOpenAI(base_url="https://api.together.xyz/v1", model="Qwen/Qwen2.5-7B-Instruct-Turbo", api_key=together_key_1),
        })
    # ✅ GOOGLE API
    try:
        google_key = search_for_api_keys("googleai")
    except Exception as e:
        print(f"Error occurred while fetching Google API key: {e}")
        google_key = None

    if google_key:
        models.update({
            "google_gemini": ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=google_key),
        })
    
    return models