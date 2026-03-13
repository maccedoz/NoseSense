import asyncio
import re
import json
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from services.executor import invoke_llm_async
from services.llm_initializer import initialize_models
from services.data_extractor import extract_tests_from_folder
from services.prompt_engine import create_randomized_prompt
from services.save_results import init_db_and_get_run, append_single_result_to_sqlite, save_results_to_csv
from routes import api_routes

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_routes.router, prefix="/api")

DATA_FOLDER = "./data/test_smell_docs"
OUTPUT_DB_FILE = "resultados.db"
OUTPUT_CSV_FILE = "resultado.csv"

async def run_automation_stream(enabled_models: list[str] = None):
    models = initialize_models()
    
    # Filtrar modelos se o frontend enviar alvos específicos
    if enabled_models:
        models = {k: v for k, v in models.items() if k in enabled_models}

    try:
        tests_to_process = extract_tests_from_folder(DATA_FOLDER)
    except FileNotFoundError as e:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Erro: {e}'})}\n\n"
        return

    if not tests_to_process:
        yield f"data: {json.dumps({'type': 'error', 'message': 'Nenhum teste encontrado para processar.'})}\n\n"
        return

    all_results = []
    total_tests = len(tests_to_process)
    
    # Inicia a tabela SQL e pega o ID da rodada
    run_id = init_db_and_get_run(OUTPUT_DB_FILE)
    
    yield f"data: {json.dumps({'type': 'start', 'total_tests': total_tests, 'models': list(models.keys())})}\n\n"

    for i, test_data in enumerate(tests_to_process):
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
      
        # Dispara as promises simultaneamente
        tasks = []
        for model_name, model_instance in models.items():
            tasks.append(invoke_llm_async(prompt, model_instance, model_name))

        model_responses = await asyncio.gather(*tasks)

        for model_name, response in model_responses:
            result_row[model_name] = response
            
            # Instert Banco Local Continuo E pega ID UNICO
            append_single_result_to_sqlite(OUTPUT_DB_FILE, run_id, i + 1, test_data["correct_smell"], correct_letter, model_name, response)
            
            # Avisa o frontend de CADA resposta de modelo de CADA teste (usando o índice do loop oficial)
            yield f"data: {json.dumps({'type': 'result', 'test_index': i + 1, 'test_smell': test_data['correct_smell'], 'model_name': model_name, 'answer': response, 'correct_answer': correct_letter})}\n\n"

        all_results.append(result_row)
    
    model_columns = list(models.keys())
    csv_headers = ['test_smell', 'correct_answer'] + model_columns
    save_results_to_csv(OUTPUT_CSV_FILE, all_results, csv_headers)
    
    yield f"data: {json.dumps({'type': 'complete', 'message': 'Processamento concluído e salvo no banco de dados e CSV.'})}\n\n"

@app.get("/api/run-tests")
async def run_tests_stream(models: str = Query(None, description="Comma-separated list of models")):
    enabled_models = None
    if models:
        enabled_models = [m.strip() for m in models.split(',') if m.strip()]

    return StreamingResponse(
        run_automation_stream(enabled_models), 
        media_type="text/event-stream"
    )

@app.get("/")
async def health_check():
    return {"status": "online", "message": "Backend de automação de Test Smells ativo"}

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Iniciando o servidor FastAPI. Aguardando execuções do Frontend (http://localhost:8001/api/run-tests)...")
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)