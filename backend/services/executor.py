

async def invoke_llm_async(prompt: str, model, model_name: str) -> tuple[str, str]:
    print(f"  -> [INICIANDO] Querying model: {model_name}")
    try:
        response = await model.ainvoke(prompt)
        response_content = response.content.strip()

        match = re.search(r'([A-E])', response_content.upper())
        if match:
            print(f"  -> [CONCLUÍDO] Model: {model_name}")
            return (model_name, match.group(1))

        print(
            f"  -> Warning: Could not parse a valid letter from response: '{response_content}'")
        return (model_name, "PARSE_ERROR")

    except Exception as e:
        print(f"  -> Error invoking model {model_name}: {e}")
        return (model_name, "API_ERROR")