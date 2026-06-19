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
        enabled_models_lower = {m.lower() for m in enabled_models}
        models = {k: v for k, v in models.items() if k.lower() in enabled_models_lower}

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


async def rerun_failed_stream_generator():
    global _should_cancel, _current_run_id
    _current_run_id += 1
    my_run_id = _current_run_id
    _should_cancel = False

    import sqlite3
    import re
    from core.prompt_alternativas import PROMPT_TEMPLATE as ALTERNATIVAS_TEMPLATE

    if not os.path.exists(OUTPUT_DB_FILE):
        yield f"data: {json.dumps({'type': 'error', 'message': 'Database not found. Run a full process first.'})}\n\n"
        return

    conn = sqlite3.connect(OUTPUT_DB_FILE)
    cursor = conn.cursor()

    # Query failed evaluations
    cursor.execute("""
        SELECT id, test_index, test_smell, correct_answer, model_name 
        FROM llm_evaluations 
        WHERE model_response IN ('API_ERROR', 'PARSE_ERROR', 'TIMEOUT') OR model_response IS NULL
    """)
    failed_rows = cursor.fetchall()
    if not failed_rows:
        yield f"data: {json.dumps({'type': 'error', 'message': 'No failed evaluations to rerun.'})}\n\n"
        conn.close()
        return

    # Extract unique models that actually had errors
    failed_models = set(row[4] for row in failed_rows)

    # Initialize only failed models
    from services.llm_initializer import _load_providers, CustomChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic
    models = {}
    providers = _load_providers()

    for provider_key, info in providers.items():
        api_key = info.get("api_key")
        if not api_key:
            continue
        api_type = info.get("api_type", "openai")
        base_url = info.get("base_url")
        model_list = info.get("models", [])
        for model_name in model_list:
            backend_id = f"{provider_key.lower()}_{model_name.replace(' ', '_').replace('.', '_').lower()}"
            if backend_id in failed_models:
                try:
                    if api_type == "google":
                        models[backend_id] = ChatGoogleGenerativeAI(
                            model=model_name,
                            api_key=api_key,
                            streaming=True,
                        )
                    elif api_type == "anthropic":
                        models[backend_id] = ChatAnthropic(
                            model=model_name,
                            api_key=api_key,
                            streaming=True,
                        )
                    else:
                        kwargs = {
                            "model": model_name,
                            "api_key": api_key,
                            "streaming": True,
                            "max_tokens": 4096,
                        }
                        if "minimax-m3" in model_name.lower():
                            kwargs["model_kwargs"] = {
                                "extra_body": {
                                    "thinking": {"type": "adaptive"}
                                }
                            }
                        if base_url:
                            kwargs["base_url"] = base_url
                        models[backend_id] = CustomChatOpenAI(**kwargs)
                except Exception as e:
                    print(f"Error initializing model {backend_id}: {e}")

    # Prepare tasks
    tasks = []
    for row_id, test_index, test_smell, correct_answer, model_name in failed_rows:
        # 1. Fetch options
        cursor.execute("""
            SELECT option_a, option_b, option_c, option_d, option_e 
            FROM test_options 
            WHERE evaluation_id = ?
        """, (row_id,))
        opt = cursor.fetchone()
        if not opt:
            continue
        option_a, option_b, option_c, option_d, option_e = opt
        if option_e is None:
            option_e = "None"

        # 2. Fetch test code
        smell_file = os.path.join(DATA_FOLDER, f"{test_smell}.txt")
        if not os.path.exists(smell_file):
            continue
        
        with open(smell_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        code_blocks = re.findall(r"```(?:java)?(.*?)```", content, re.DOTALL)
        block_idx = (test_index - 1) % 100
        if block_idx >= len(code_blocks):
            continue
        
        code_snippet = code_blocks[block_idx].strip()

        # 3. Format prompt
        prompt = ALTERNATIVAS_TEMPLATE.format(
            test_code=code_snippet,
            option_a=option_a,
            option_b=option_b,
            option_c=option_c,
            option_d=option_d,
            option_e=option_e
        )
        
        tasks.append({
            "row_id": row_id,
            "test_index": test_index,
            "test_smell": test_smell,
            "correct_answer": correct_answer,
            "model_name": model_name,
            "prompt": prompt,
            "options": {"A": option_a, "B": option_b, "C": option_c, "D": option_d, "E": option_e}
        })

    conn.close()

    total_tasks = len(tasks)
    # Yield start event for frontend
    yield f"data: {json.dumps({'type': 'start', 'total_tests': total_tasks, 'models': list(failed_models)})}\n\n"

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def run_one_task(task_data):
        row_id = task_data["row_id"]
        test_index = task_data["test_index"]
        test_smell = task_data["test_smell"]
        correct_answer = task_data["correct_answer"]
        model_name = task_data["model_name"]
        prompt = task_data["prompt"]
        options = task_data["options"]

        model_instance = models.get(model_name)
        if not model_instance:
            return (row_id, test_index, test_smell, correct_answer, model_name, "API_ERROR", options)

        max_retries = 3
        response = "API_ERROR"
        for attempt in range(1, max_retries + 1):
            if _should_cancel or my_run_id != _current_run_id:
                break
            try:
                _, response = await invoke_llm_async(prompt, model_instance, model_name)
                if response not in ("API_ERROR", "TIMEOUT"):
                    break
                await asyncio.sleep(2)
            except Exception:
                await asyncio.sleep(2)
        
        return (row_id, test_index, test_smell, correct_answer, model_name, response, options)

    async def worker(task_data):
        async with semaphore:
            return await run_one_task(task_data)

    async_tasks = [asyncio.create_task(worker(t)) for t in tasks]

    pending = set(async_tasks)
    try:
        while pending:
            if _should_cancel or my_run_id != _current_run_id:
                yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Rerun cancelled by user.'})}\n\n"
                break
            
            # Wait for at least one task to complete with a 1.0 second timeout to check cancel flag
            done, pending = await asyncio.wait(pending, timeout=1.0, return_when=asyncio.FIRST_COMPLETED)
            
            if not done:
                yield ": ping\n\n"
                continue
            
            for completed_task in done:
                try:
                    row_id, test_index, test_smell, correct_answer, model_name, response, options = completed_task.result()
                except Exception:
                    continue

                # Write to SQLite
                try:
                    conn = sqlite3.connect(OUTPUT_DB_FILE)
                    cursor = conn.cursor()
                    is_correct = (response == correct_answer)
                    cursor.execute("""
                        UPDATE llm_evaluations 
                        SET model_response = ?, is_correct = ? 
                        WHERE id = ?
                    """, (response, is_correct, row_id))
                    conn.commit()
                    conn.close()
                except Exception as e:
                    print(f"Error updating SQLite during rerun: {e}")

                is_correct = (response == correct_answer)
                yield f"data: {json.dumps({'type': 'result', 'test_index': test_index, 'test_smell': test_smell, 'model_name': model_name, 'answer': response, 'correct_answer': correct_answer, 'options': options, 'is_correct': is_correct})}\n\n"
    finally:
        for t in pending:
            if not t.done():
                t.cancel()

    # Rewrite CSV file once all are done
    if not _should_cancel and my_run_id == _current_run_id:
        try:
            conn = sqlite3.connect(OUTPUT_DB_FILE)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT test_index, test_smell, correct_answer, model_name, model_response, is_correct 
                FROM llm_evaluations 
                ORDER BY test_index, model_name
            """)
            all_evals = cursor.fetchall()
            conn.close()

            csv_headers = ['test_index', 'test_smell', 'correct_answer', 'model_name', 'response', 'is_correct']
            with open(OUTPUT_CSV_FILE, 'w', encoding='utf-8') as f:
                f.write(",".join(csv_headers) + "\n")
                for t_idx, t_smell, corr_ans, m_name, m_resp, is_corr in all_evals:
                    is_corr_str = "True" if is_corr else "False"
                    m_resp_str = m_resp if m_resp is not None else ""
                    f.write(f"{t_idx},{t_smell},{corr_ans},{m_name},{m_resp_str},{is_corr_str}\n")
        except Exception as e:
            print(f"Error updating CSV after rerun: {e}")

        yield f"data: {json.dumps({'type': 'complete', 'message': 'Failed APIs rerun complete.'})}\n\n"


@router.get("/rerun-failed")
async def rerun_failed_stream():
    return StreamingResponse(
        rerun_failed_stream_generator(),
        media_type="text/event-stream"
    )