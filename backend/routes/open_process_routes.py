import asyncio
import json
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from services.llm_initializer import initialize_models
from services.data_extractor import extract_tests_from_folder
from services.prompt_engine import create_open_prompt
from services.executor import invoke_llm_open_async
from services.normalizer import normalize_smell_response
from services.db_service import init_open_db_and_get_run, append_open_result_to_sqlite
from services.csv_service import init_csv, append_row_to_csv

router = APIRouter()

DATA_FOLDER = "./data/test_smell_docs"
OUTPUT_DB_FILE = "./data/output/results_open.db"
OUTPUT_CSV_FILE = "./data/output/results_open.csv"

# Flag simples de cancelamento — funciona em qualquer versão do Python
_should_cancel: bool = False
_current_run_id: int = 0

MAX_CONCURRENT = 3


async def fetch_open_model(i, test_data, model_name, model_instance):
    """Helper to run model asynchronously without blocking DB writing."""
    prompt = create_open_prompt(test_data["code_to_analyze"])
    _, raw_response = await invoke_llm_open_async(prompt, model_instance, model_name)
    return (i, test_data, model_name, raw_response)


async def run_open_automation_stream(enabled_models: list[str] = None):
    global _should_cancel, _current_run_id
    _current_run_id += 1
    my_run_id = _current_run_id
    _should_cancel = False

    models = initialize_models()

    if enabled_models:
        models = {k: v for k, v in models.items() if k in enabled_models}

    try:
        tests_to_process = extract_tests_from_folder(DATA_FOLDER)
    except FileNotFoundError as e:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Error: {e}'})}\n\n"
        return

    if not tests_to_process:
        yield f"data: {json.dumps({'type': 'error', 'message': 'No tests found to process.'})}\n\n"
        return

    total_tests = len(tests_to_process)
    run_id = init_open_db_and_get_run(OUTPUT_DB_FILE)

    csv_headers = ['test_smell', 'model_name', 'raw_response', 'normalized_response', 'was_normalized', 'is_correct']
    init_csv(OUTPUT_CSV_FILE, csv_headers)

    yield f"data: {json.dumps({'type': 'start', 'total_tests': total_tests, 'models': list(models.keys())})}\n\n"

    # Iterar teste por teste: para cada teste, todos os modelos rodam em paralelo
    for i, test_data in enumerate(tests_to_process):
        # Verificar cancelamento antes de cada teste
        if _should_cancel or my_run_id != _current_run_id:
            yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Processing cancelled by user or superseded by new run.'})}\n\n"
            return

        # Lançar todos os modelos para este teste em paralelo
        tasks = [
            asyncio.create_task(fetch_open_model(i, test_data, model_name, model_instance))
            for model_name, model_instance in models.items()
        ]

        # Esperar TODOS os modelos responderem antes de avançar
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Verificar cancelamento após as respostas
        if _should_cancel or my_run_id != _current_run_id:
            yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Processing cancelled by user or superseded by new run.'})}\n\n"
            return

        for result in results:
            if isinstance(result, Exception):
                continue

            idx, td, model_name, raw_response = result
            correct_smell = td["correct_smell"]

            is_api_error = raw_response in ("TIMEOUT", "API_ERROR", "EMPTY_RESPONSE")
            if is_api_error:
                normalized_response = raw_response
                was_normalized = False
            else:
                normalized_response, was_normalized = normalize_smell_response(raw_response)

            is_correct = (normalized_response == correct_smell)

            append_open_result_to_sqlite(
                OUTPUT_DB_FILE, run_id, idx + 1,
                correct_smell, model_name,
                raw_response, normalized_response, was_normalized
            )

            append_row_to_csv(OUTPUT_CSV_FILE, {
                "test_smell": correct_smell,
                "model_name": model_name,
                "raw_response": raw_response,
                "normalized_response": normalized_response,
                "was_normalized": was_normalized,
                "is_correct": is_correct,
            }, csv_headers)

            yield f"data: {json.dumps({'type': 'result', 'test_index': idx + 1, 'test_smell': correct_smell, 'model_name': model_name, 'raw_response': raw_response, 'normalized_response': normalized_response, 'was_normalized': was_normalized, 'is_correct': is_correct})}\n\n"

    yield f"data: {json.dumps({'type': 'complete', 'message': 'Processing complete. Open mode results saved.'})}\n\n"


@router.get("/run-open-tests")
async def run_open_tests_stream(models: str = Query(None, description="Comma-separated list of models")):
    enabled_models = None
    if models:
        enabled_models = [m.strip() for m in models.split(',') if m.strip()]

    return StreamingResponse(
        run_open_automation_stream(enabled_models),
        media_type="text/event-stream"
    )


@router.post("/stop-open-tests")
async def stop_open_tests():
    """Signal the running open test loop to stop."""
    global _should_cancel
    _should_cancel = True
    return {"message": "Open mode cancellation requested."}


@router.get("/open-test-count")
def get_open_test_count():
    """Returns the number of tests available for open mode."""
    try:
        tests = extract_tests_from_folder(DATA_FOLDER)
        return {"count": len(tests)}
    except Exception:
        return {"count": 0}
