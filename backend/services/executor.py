import re
import asyncio

# Limita o número de requests simultâneos a 3 para evitar limites da API (OpenAI Free Tier)
semaphore = asyncio.Semaphore(3)

async def invoke_llm_async(prompt: str, model, model_name: str) -> tuple[str, str]:
    print(f"  -> [INICIANDO] Querying model: {model_name}")
    try:
        async with semaphore:
            # Wrap again with 20.0s timeout to avoid infinite freezes
            response = await asyncio.wait_for(model.ainvoke(prompt), timeout=20.0)
            
        response_content = response.content.strip()

        match = re.search(r'([A-E])', response_content.upper())
        if match:
            print(f"  -> [CONCLUIDO] Model: {model_name}")
            return (model_name, match.group(1))

        safe_resp = response_content.encode('ascii', 'replace').decode('ascii')
        print(f"  -> Warning: Could not parse a valid letter from response: '{safe_resp}'")
        return (model_name, "PARSE_ERROR")

    except asyncio.TimeoutError:
        print(f"  -> Error invoking model {model_name}: TIMEOUT (20s limit reached)")
        return (model_name, "TIMEOUT")
    except Exception as e:
        safe_err = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"  -> Error invoking model {model_name}: {safe_err}")
        return (model_name, "API_ERROR")