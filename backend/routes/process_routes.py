import asyncio
import json
import os
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from services.llm_initializer import initialize_models
from services.data_extractor import extract_tests_from_folder
from services.prompt_engine import create_randomized_prompt
from services.executor import invoke_llm_async
from services.db_service import init_db_and_get_run, append_single_result_to_sqlite
from services.csv_service import init_csv, append_row_to_csv

router = APIRouter()

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FOLDER = os.path.join(_BASE_DIR, "data", "test_smell_docs")
OUTPUT_DB_FILE = os.path.join(_BASE_DIR, "data", "output", "results.db")
OUTPUT_CSV_FILE = os.path.join(_BASE_DIR, "data", "output", "results.csv")

# Flag simples de cancelamento — funciona em qualquer versão do Python
_should_cancel: bool = False
_current_run_id: int = 0

MAX_CONCURRENT = 16


async def fetch_model(semaphore, i, prompt, correct_letter, options, model_name, model_instance):
    """Helper to run model asynchronously for multi-choice mode."""
    async with semaphore:
        _, response = await invoke_llm_async(prompt, model_instance, model_name)
        return (i, correct_letter, options, model_name, response)


async def run_automation_stream(enabled_models: list[str] = None):
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

    run_id = init_db_and_get_run(OUTPUT_DB_FILE)

    csv_headers = ['test_index', 'test_smell', 'correct_answer', 'model_name', 'response', 'is_correct']
    init_csv(OUTPUT_CSV_FILE, csv_headers)

    yield f"data: {json.dumps({'type': 'start', 'total_tests': total_tests, 'models': list(models.keys())})}\n\n"

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    # Iterar teste por teste: para cada teste, todos os modelos rodam em paralelo
    for i, test_data in enumerate(tests_to_process):
        # Verificar cancelamento antes de cada teste
        if _should_cancel or my_run_id != _current_run_id:
            yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Processing cancelled by user or superseded by new run.'})}\n\n"
            return

        prompt, correct_letter, options = create_randomized_prompt(
            test_data["code_to_analyze"],
            test_data["correct_smell"]
        )
        if not prompt:
            continue

        # Lançar todos os modelos para este teste em paralelo
        tasks = [
            asyncio.create_task(fetch_model(semaphore, i, prompt, correct_letter, options, model_name, model_instance))
            for model_name, model_instance in models.items()
        ]

        async def run_gather():
            return await asyncio.gather(*tasks, return_exceptions=True)

        gather_task = asyncio.create_task(run_gather())

        try:
            # Manter a conexão SSE viva enquanto aguarda a resposta paralela de todos os modelos
            while not gather_task.done():
                if _should_cancel or my_run_id != _current_run_id:
                    break

                try:
                    await asyncio.wait_for(asyncio.shield(gather_task), timeout=1.0)
                except asyncio.TimeoutError:
                    # Envia ping de keep-alive no formato de comentário SSE (ignorado pelo browser, mas mantém canal ativo)
                    yield ": ping\n\n"

            if _should_cancel or my_run_id != _current_run_id:
                yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Processing cancelled by user or superseded by new run.'})}\n\n"
                return

            try:
                results = await gather_task
            except asyncio.CancelledError:
                yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Processing cancelled by user or superseded by new run.'})}\n\n"
                return
        finally:
            # Garantir cancelamento das tarefas se o gerador for interrompido
            if not gather_task.done():
                gather_task.cancel()
            for t in tasks:
                if not t.done():
                    t.cancel()

        for result in results:
            if isinstance(result, Exception):
                continue

            if not result:
                continue

            idx, correct_letter, options, model_name, response = result
            td = tests_to_process[idx]
            correct_smell = td["correct_smell"]

            append_single_result_to_sqlite(OUTPUT_DB_FILE, run_id, idx + 1, correct_smell, correct_letter, model_name, response, options)

            is_correct = (response == correct_letter)
            result_row = {
                "test_index": idx + 1,
                "test_smell": correct_smell,
                "correct_answer": correct_letter,
                "model_name": model_name,
                "response": response,
                "is_correct": is_correct,
            }
            append_row_to_csv(OUTPUT_CSV_FILE, result_row, csv_headers)

            options_dict = {"A": options[0], "B": options[1], "C": options[2], "D": options[3], "E": options[4]}
            yield f"data: {json.dumps({'type': 'result', 'test_index': idx + 1, 'test_smell': correct_smell, 'model_name': model_name, 'answer': response, 'correct_answer': correct_letter, 'options': options_dict, 'is_correct': is_correct})}\n\n"

    yield f"data: {json.dumps({'type': 'complete', 'message': 'Processing complete. Results saved to database and CSV.'})}\n\n"


@router.get("/run-tests")
async def run_tests_stream(models: str = Query(None, description="Comma-separated list of models")):
    enabled_models = None
    if models:
        enabled_models = [m.strip() for m in models.split(',') if m.strip()]

    return StreamingResponse(
        run_automation_stream(enabled_models),
        media_type="text/event-stream"
    )


@router.post("/stop-tests")
async def stop_tests():
    """Signal the running test loop to stop after the current batch."""
    global _should_cancel
    _should_cancel = True
    return {"message": "Cancellation requested."}


@router.get("/test-count")
def get_test_count():
    """Returns the number of tests available in the data folder."""
    try:
        tests = extract_tests_from_folder(DATA_FOLDER)
        return {"count": len(tests)}
    except Exception:
        return {"count": 0}