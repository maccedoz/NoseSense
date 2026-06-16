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
        response = await asyncio.wait_for(model.ainvoke(prompt), timeout=300.0)

        response_content = response.content.strip()

        # Fallback se a resposta vier vazia no stream (ex: gpt-oss-20b)
        if not response_content and getattr(model, "streaming", False):
            print(f"  -> Warning: Empty streaming response from {model_name}. Retrying without streaming...")
            model.streaming = False
            try:
                response = await asyncio.wait_for(model.ainvoke(prompt), timeout=300.0)
                response_content = response.content.strip()
            finally:
                model.streaming = True

        # Remove APENAS as tags <think> e </think>, mantendo o raciocínio e o conteúdo final
        clean_content = re.sub(r'</?think>', '', response_content)

        matches = re.findall(r'\b([A-E])\b', clean_content.upper())
        if matches:
            print(f"  -> [DONE] Model: {model_name}")
            return (model_name, matches[-1])

        safe_resp = response_content.encode('ascii', 'replace').decode('ascii')
        print(f"  -> Warning: Could not parse a valid letter from model {model_name} from response: '{safe_resp}'")
        return (model_name, "PARSE_ERROR")

    except asyncio.TimeoutError:
        print(f"  -> Error invoking model {model_name}: TIMEOUT (300s limit reached)")
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
        response = await asyncio.wait_for(model.ainvoke(prompt), timeout=300.0)

        response_content = response.content.strip()

        # Fallback se a resposta vier vazia no stream (ex: gpt-oss-20b)
        if not response_content and getattr(model, "streaming", False):
            print(f"  -> Warning: Empty streaming response from {model_name}. Retrying without streaming...")
            model.streaming = False
            try:
                response = await asyncio.wait_for(model.ainvoke(prompt), timeout=300.0)
                response_content = response.content.strip()
            finally:
                model.streaming = True
        if response_content:
            print(f"  -> [DONE OPEN] Model: {model_name}")
            return (model_name, response_content)

        print(f"  -> Warning: Empty response from model: {model_name}")
        return (model_name, "EMPTY_RESPONSE")

    except asyncio.TimeoutError:
        print(f"  -> Error invoking model {model_name}: TIMEOUT (300s limit reached)")
        return (model_name, "TIMEOUT")
    except asyncio.CancelledError:
        print(f"  -> [CANCELLED] Model: {model_name}")
        raise
    except Exception as e:
        safe_err = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"  -> Error invoking model {model_name}: {safe_err}")
        return (model_name, "API_ERROR")