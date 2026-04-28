import asyncio
import json
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from services.llm_initializer import initialize_models
from services.data_extractor import extract_tests_from_folder
from services.prompt_engine import create_randomized_prompt
from services.executor import invoke_llm_async
from services.db_service import init_db_and_get_run, append_single_result_to_sqlite
from services.csv_service import save_results_to_csv

router = APIRouter()

DATA_FOLDER = "./data/test_smell_docs"
OUTPUT_DB_FILE = "./data/output/results.db"
OUTPUT_CSV_FILE = "./data/output/results.csv"

_cancel_event: asyncio.Event | None = None


async def run_automation_stream(enabled_models: list[str] = None):
    global _cancel_event
    _cancel_event = asyncio.Event()

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

    all_results = []
    total_tests = len(tests_to_process)

    run_id = init_db_and_get_run(OUTPUT_DB_FILE)

    yield f"data: {json.dumps({'type': 'start', 'total_tests': total_tests, 'models': list(models.keys())})}\n\n"

    for i, test_data in enumerate(tests_to_process):
        if _cancel_event and _cancel_event.is_set():
            yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Processing cancelled by user.'})}\n\n"
            return

        prompt, correct_letter = create_randomized_prompt(
            test_data["code_to_analyze"],
            test_data["correct_smell"]
        )

        if not prompt:
            continue

        result_row = {
            "test_smell": test_data["correct_smell"],
            "correct_answer": correct_letter
        }

        tasks = []
        for model_name, model_instance in models.items():
            tasks.append(invoke_llm_async(prompt, model_instance, model_name))

        model_responses = await asyncio.gather(*tasks)

        for model_name, response in model_responses:
            result_row[model_name] = response

            append_single_result_to_sqlite(OUTPUT_DB_FILE, run_id, i + 1, test_data["correct_smell"], correct_letter, model_name, response)

            yield f"data: {json.dumps({'type': 'result', 'test_index': i + 1, 'test_smell': test_data['correct_smell'], 'model_name': model_name, 'answer': response, 'correct_answer': correct_letter})}\n\n"

        all_results.append(result_row)

    model_columns = list(models.keys())
    csv_headers = ['test_smell', 'correct_answer'] + model_columns
    save_results_to_csv(OUTPUT_CSV_FILE, all_results, csv_headers)

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
    global _cancel_event
    if _cancel_event:
        _cancel_event.set()
    return {"message": "Cancellation requested."}


@router.get("/test-count")
def get_test_count():
    """Returns the number of tests available in the data folder."""
    try:
        tests = extract_tests_from_folder(DATA_FOLDER)
        return {"count": len(tests)}
    except Exception:
        return {"count": 0}