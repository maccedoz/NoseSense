import json
import os
import re 
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_together import ChatTogether
from langchain_anthropic import ChatAnthropic

CAMINHO_JSON = "dados.json"

def initialize_models() -> dict:
    models = {}
    
    chaves_salvas = {}
    if os.path.exists(CAMINHO_JSON):
        try:
            with open(CAMINHO_JSON, "r", encoding="utf-8") as f:
                chaves_salvas = json.load(f)
        except Exception as e:
            print(f"Erro ao ler {CAMINHO_JSON}: {e}")

    # ✅ OPENAI
    openai_key = chaves_salvas.get("openai")
    if openai_key:
        models.update({
            # --- Modelos de Fronteira (Alta inteligência para lógica e análise profissional) ---
            "openai_gpt5.4": ChatOpenAI(model="gpt-5.4", api_key=openai_key),
            "openai_gpt5.4_pro": ChatOpenAI(model="gpt-5.4-pro", api_key=openai_key),
            "openai_gpt5.2": ChatOpenAI(model="gpt-5.2", api_key=openai_key),
            "openai_gpt5.2_pro": ChatOpenAI(model="gpt-5.2-pro", api_key=openai_key),
            "openai_gpt5.1": ChatOpenAI(model="gpt-5.1", api_key=openai_key),
            "openai_gpt5": ChatOpenAI(model="gpt-5", api_key=openai_key),
            "openai_gpt5_pro": ChatOpenAI(model="gpt-5-pro", api_key=openai_key),

            # --- Especializados em Código (Codex / Agentic Coding) ---
            # Essenciais para detectar smells complexos e sugerir refatorações.
            "openai_gpt5_codex": ChatOpenAI(model="gpt-5-codex", api_key=openai_key),
            "openai_gpt5.3_codex": ChatOpenAI(model="gpt-5.3-codex", api_key=openai_key),
            "openai_gpt5.2_codex": ChatOpenAI(model="gpt-5.2-codex", api_key=openai_key),
            "openai_gpt5.1_codex": ChatOpenAI(model="gpt-5.1-codex", api_key=openai_key),
            "openai_gpt5.1_codex_max": ChatOpenAI(model="gpt-5.1-codex-max", api_key=openai_key),

            # --- Modelos de Raciocínio (O-Series / Reasoning) ---
            # Excelentes para entender a semântica por trás de Assertion Roulette ou Lazy Tests.
            "openai_o3": ChatOpenAI(model="o3", api_key=openai_key),
            "openai_o3_pro": ChatOpenAI(model="o3-pro", api_key=openai_key),
            "openai_o3_mini": ChatOpenAI(model="o3-mini", api_key=openai_key),
            "openai_o1": ChatOpenAI(model="o1", api_key=openai_key),
            "openai_o1_pro": ChatOpenAI(model="o1-pro", api_key=openai_key),

            # --- Modelos de Versatilidade e Performance ---
            "openai_gpt4o": ChatOpenAI(model="gpt-4o", api_key=openai_key),
            "openai_gpt4_turbo": ChatOpenAI(model="gpt-4-turbo", api_key=openai_key),
            "openai_gpt5_mini": ChatOpenAI(model="gpt-5-mini", api_key=openai_key),
        })

    # ✅ TOGETHER AI
    together_key_1 = chaves_salvas.get("togetherai")
    if together_key_1:
        models.update({
            "togetherai_deepseek": ChatTogether(base_url="https://api.together.xyz/v1", model="deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free", api_key=together_key_1),
            "togetherai_gemma": ChatTogether(base_url="https://api.together.xyz/v1", model="google/gemma-3n-E4B-it", api_key=together_key_1),
            "togetherai_qwen": ChatTogether(base_url="https://api.together.xyz/v1", model="Qwen/Qwen2.5-7B-Instruct-Turbo", api_key=together_key_1),
        })  

    # ✅ GOOGLE API
    google_key = chaves_salvas.get("googleai")
    if google_key:
        models.update({
            "google_gemini_2.5_flash": ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=google_key),
            "google_gemini_3.1_pro": ChatGoogleGenerativeAI(model="gemini-3.1-pro", api_key=google_key),
            "google_gemini_3_flash": ChatGoogleGenerativeAI(model="gemini-3-flash", api_key=google_key),
            "google_gemini_3_flash_lite": ChatGoogleGenerativeAI(model="gemini-3-flash-lite", api_key=google_key),
            "google_gemini_2.5_flash_lite": ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", api_key=google_key),
            "google_gemini_2.5_pro": ChatGoogleGenerativeAI(model="gemini-2.5-pro", api_key=google_key),
        })

    # ✅ ANTHROPIC
    anthropic_key = chaves_salvas.get("anthropicai")
    if anthropic_key:
        models.update({
            "anthropic_claude_4.6_opus": ChatAnthropic(model="claude-4.6-opus", api_key=anthropic_key),
            "anthropic_claude_4.5_sonnet": ChatAnthropic(model="claude-4.5-sonnet", api_key=anthropic_key),
            "anthropic_claude_4.5_haiku": ChatAnthropic(model="claude-4.5-haiku", api_key=anthropic_key),
        })

    return models