import asyncio
from services.llm_initializer import initialize_models
from services.data_extractor import extract_tests_from_folder
from services.prompt_engine import create_randomized_prompt
from services.executor import invoke_llm_async
from services.save_results import save_results_to_csv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import api_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Em produção, substitua "*" pela URL real do seu frontend
    allow_credentials=True,
    allow_methods=["*"], # Permite POST, GET, PUT, DELETE, etc.
    allow_headers=["*"], # Permite o envio de JSON
)

app.include_router(api_routes.router, prefix="/api")

DATA_FOLDER = "./data/test_smell_docs"
OUTPUT_CSV_FILE = "resultado.csv"


async def main():
    models = initialize_models()
    try:
        tests_to_process = extract_tests_from_folder(DATA_FOLDER)
    except FileNotFoundError as e:
        print(e)
        return

    all_results = []

    print("--- Starting cross-processing of tests and models ---")
    for i, test_data in enumerate(tests_to_process):
        print(
            f"Processing test {i+1}/{len(tests_to_process)} (from {test_data['source_file']})...")

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

        all_results.append(result_row)

    model_columns = list(models.keys())
    csv_headers = ['test_smell', 'correct_answer'] + model_columns
    save_results_to_csv(OUTPUT_CSV_FILE, all_results, csv_headers)


if __name__ == "__main__":
    asyncio.run(main())