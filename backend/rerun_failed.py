import sys
import os
import re
import sqlite3
import asyncio

# Setup paths
sys.path.append(os.getcwd())

from services.llm_initializer import initialize_models
from core.prompt_alternativas import PROMPT_TEMPLATE as ALTERNATIVAS_TEMPLATE
from services.executor import invoke_llm_async

db_path = 'data/output/results.db'
csv_path = 'data/output/results.csv'

async def worker(sem, task, models):
    row_id, test_index, test_smell, correct_answer, model_name, prompt = task
    model_instance = models[model_name]
    
    async with sem:
        max_retries = 3
        response = "API_ERROR"
        for attempt in range(1, max_retries + 1):
            try:
                print(f"[START] Rerunning index {test_index} for model {model_name} (attempt {attempt}/{max_retries})...")
                _, response = await invoke_llm_async(prompt, model_instance, model_name)
                if response not in ("API_ERROR", "TIMEOUT"):
                    break
                await asyncio.sleep(2)
            except Exception as e:
                print(f"[EXCEPTION] {model_name} on index {test_index}: {e}")
                await asyncio.sleep(2)
        
        print(f"[DONE] Rerunning index {test_index} for model {model_name} -> Result: {response}")
        return (row_id, test_index, test_smell, correct_answer, model_name, response)

async def main():
    if not os.path.exists(db_path):
        print(f"Error: Database {db_path} not found. Are you running this script from NoseSense/backend?")
        sys.exit(1)
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Query failed evaluations
    cursor.execute("""
        SELECT id, test_index, test_smell, correct_answer, model_name 
        FROM llm_evaluations 
        WHERE model_response IN ('API_ERROR', 'PARSE_ERROR', 'TIMEOUT') OR model_response IS NULL
    """)
    failed_rows = cursor.fetchall()
    print(f"Found {len(failed_rows)} failed evaluations to rerun.")
    if not failed_rows:
        conn.close()
        return

    # Extract unique models that actually had errors
    failed_models = set(row[4] for row in failed_rows)
    print(f"Models to rerun: {list(failed_models)}")

    print("Initializing only failed models...")
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
            
            if backend_id not in failed_models:
                continue

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
            else:
                print(f"Model {backend_id} initialized successfully")

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
            print(f"  -> Warning: options not found for evaluation ID {row_id}")
            continue
        option_a, option_b, option_c, option_d, option_e = opt
        if option_e is None:
            option_e = "None"

        # 2. Fetch test code
        smell_file = f"data/test_smell_docs/{test_smell}.txt"
        if not os.path.exists(smell_file):
            print(f"  -> Warning: file {smell_file} not found")
            continue
        
        with open(smell_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        code_blocks = re.findall(r"```(?:java)?(.*?)```", content, re.DOTALL)
        block_idx = (test_index - 1) % 100
        if block_idx >= len(code_blocks):
            print(f"  -> Warning: test index {test_index} maps to block index {block_idx} but file only has {len(code_blocks)} blocks")
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
        
        tasks.append((row_id, test_index, test_smell, correct_answer, model_name, prompt))

    conn.close()  # Close connection during API calls to avoid locking

    # Run concurrently with Semaphore
    sem = asyncio.Semaphore(16)
    worker_tasks = [worker(sem, task, models) for task in tasks]
    
    print(f"Starting execution of {len(worker_tasks)} tasks concurrently...")
    results = await asyncio.gather(*worker_tasks)

    # Reconnect and write results sequentially
    print("\nAll tasks completed. Saving results to database...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    for row_id, test_index, test_smell, correct_answer, model_name, response in results:
        is_correct = (response == correct_answer)
        cursor.execute("""
            UPDATE llm_evaluations 
            SET model_response = ?, is_correct = ? 
            WHERE id = ?
        """, (response, is_correct, row_id))
    
    conn.commit()
    print("Database successfully updated!")

    # Rewrite CSV file
    print("Rewriting results.csv from updated database...")
    cursor.execute("""
        SELECT test_index, test_smell, correct_answer, model_name, model_response, is_correct 
        FROM llm_evaluations 
        ORDER BY test_index, model_name
    """)
    all_evals = cursor.fetchall()
    
    with open(csv_path, 'w', encoding='utf-8') as f:
        f.write("test_index,test_smell,correct_answer,model_name,response,is_correct\n")
        for t_idx, t_smell, corr_ans, m_name, m_resp, is_corr in all_evals:
            is_corr_str = "True" if is_corr else "False"
            m_resp_str = m_resp if m_resp is not None else ""
            f.write(f"{t_idx},{t_smell},{corr_ans},{m_name},{m_resp_str},{is_corr_str}\n")
            
    print("results.csv successfully updated!")
    conn.close()

if __name__ == "__main__":
    asyncio.run(main())
