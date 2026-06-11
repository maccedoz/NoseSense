import re
import asyncio


async def invoke_llm_async(
    prompt: str,
    model,
    model_name: str,
) -> tuple[str, str]:
    """Modo alternativas: extrai a letra (A-E) da resposta da LLM."""
    print(f"  -> [STARTING] Querying model: {model_name}")
    try:
        # Forçar execução em thread separada para contornar bibliotecas que bloqueiam o Event Loop
        response = await asyncio.wait_for(asyncio.to_thread(model.invoke, prompt), timeout=60.0)

        response_content = response.content.strip()

        match = re.search(r'([A-E])', response_content.upper())
        if match:
            print(f"  -> [DONE] Model: {model_name}")
            return (model_name, match.group(1))

        safe_resp = response_content.encode('ascii', 'replace').decode('ascii')
        print(f"  -> Warning: Could not parse a valid letter from response: '{safe_resp}'")
        return (model_name, "PARSE_ERROR")

    except asyncio.TimeoutError:
        print(f"  -> Error invoking model {model_name}: TIMEOUT (60s limit reached)")
        return (model_name, "TIMEOUT")
    except asyncio.CancelledError:
        print(f"  -> [CANCELLED] Model: {model_name}")
        raise
    except Exception as e:
        safe_err = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"  -> Error invoking model {model_name}: {safe_err}")
        return (model_name, "API_ERROR")


async def invoke_llm_open_async(
    prompt: str,
    model,
    model_name: str,
) -> tuple[str, str]:
    """Modo aberto: retorna o texto bruto da resposta (sem extrair letra)."""
    print(f"  -> [OPEN] Querying model: {model_name}")
    try:
        # Forçar execução em thread separada para contornar bibliotecas que bloqueiam o Event Loop
        response = await asyncio.wait_for(asyncio.to_thread(model.invoke, prompt), timeout=60.0)

        response_content = response.content.strip()
        if response_content:
            print(f"  -> [DONE OPEN] Model: {model_name}")
            return (model_name, response_content)

        print(f"  -> Warning: Empty response from model: {model_name}")
        return (model_name, "EMPTY_RESPONSE")

    except asyncio.TimeoutError:
        print(f"  -> Error invoking model {model_name}: TIMEOUT (60s limit reached)")
        return (model_name, "TIMEOUT")
    except asyncio.CancelledError:
        print(f"  -> [CANCELLED] Model: {model_name}")
        raise
    except Exception as e:
        safe_err = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"  -> Error invoking model {model_name}: {safe_err}")
        return (model_name, "API_ERROR")