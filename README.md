# NoseSense 

*Read this in other languages: [Português](README-PTBR.md).*

**NoseSense** is a platform for evaluating the performance of LLMs in the automatic detection and analysis of "Test Smells" (poor design and implementation in test code). The system simultaneously orchestrates multiple Large Language Models (LLMs) to analyze code snippets, identify test quality issues, and generate comparative metrics between the models.

The project is divided into a **Backend** in Python (FastAPI) and a **Frontend** in React (Next.js).

## Key Features

- **Simultaneous Multi-Model Analysis**: Orchestrates and compares the performance of multiple LLMs using the LangChain library. Supports any provider, add your own companies and models freely.
- **Dynamic Provider Configuration**: Add any AI provider (OpenAI, Google, Anthropic, Groq, Together, or any OpenAI-compatible API) with custom API keys, base URLs, and model names, all through the UI, with no hardcoded configuration.
- **Real-Time Streaming**: Asynchronous processing with Server-Sent Events (SSE) to send real-time partial results to the frontend.
- **Storage and Exporting**: Locally saves all test names and model responses in a SQLite database (`resultados.db`) and exports condensed CSV reports (`resultado.csv`).
- **Dynamic Prompt Engineering**: Automated generation of randomized prompts to prevent positional bias in AI responses.

## Project Architecture

### Backend (FastAPI + LangChain)
- **Location:** `/backend`
- **Responsibilities:** Reads the local database of *Test Smells*, dynamically instantiates LLM models based on user-configured providers, orchestrates asynchronous analysis calls, stores data via the database, and persists responses in CSV.
- **Default Port:** `8001`

### Frontend (Next.js + React)
- **Location:** `/frontend`
- **Responsibilities:** Graphical User Interface (UI) to configure providers and models, trigger tests, view the progress of asynchronous requests in real-time (execution dashboard), and analyze the comparative performance and metrics of the LLMs in the results panel.
- **Default Port:** `3000` (managed by pnpm)

## How to Install and Run

### Prerequisites
- Python 3.10+
- Node.js 18+ and *pnpm* installed (`npm install -g pnpm`)
- API keys for the LLM providers you want to use (configurable via the frontend UI).

---

### Quick Start (Recommended)

The project includes a Bash script utility that builds the environments, installs both Backend and Frontend dependencies, spins up both servers simultaneously, and automatically opens the interface in your browser.

In the root folder (`NoseSense/`), run:

```bash
chmod +x dev.sh
./dev.sh
```

---

### Manual Setup

#### 1. Running the Backend

Open a terminal and access the backend folder:
```bash
cd backend
```

Create and activate a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install the dependencies:
```bash
pip install -r requirements.txt
```

Start the development server:
```bash
python main.py
```
*The server will be available at `http://localhost:8001`.*

#### 2. Running the Frontend

Open another terminal and access the frontend folder:
```bash
cd frontend
```

Install the packages and dependencies using PNPM:
```bash
pnpm install
```

Start the application:
```bash
pnpm run dev
```
*The user interface will be available at `http://localhost:3000`.*

---

## Configuring Providers and Models

All configuration is done through the frontend UI, no need to edit files manually.

1. **Add a Provider**: Click "Add Provider", enter the provider name (e.g. "OpenAI", "Groq"), select the API type, and paste your API key.
   - **API Types**: `OpenAI-compatible` (for OpenAI, Groq, Together, etc.), `Google GenAI` (for Gemini), `Anthropic` (for Claude).
   - **Base URL**: For non-OpenAI providers using the OpenAI-compatible format, set the custom base URL (e.g. `https://api.together.xyz/v1`).
2. **Add Models**: Expand the provider and click "Add Model". Type the exact model name as listed in the provider's API documentation (e.g. `gpt-4o`, `gemini-2.5-flash`, `claude-3.5-sonnet`).
3. **Select Models**: Use the checkboxes to enable/disable models for testing.
4. **Edit API Key**: Click the pencil icon on any provider to update its API key.
5. **Run Tests**: Click "Run Process" to execute tests across all selected models simultaneously.

The configuration is stored in `backend/dados.json` with the following format:

```json
{
    "providers": {
        "openai": {
            "api_key": "sk-...",
            "api_type": "openai",
            "base_url": null,
            "models": ["gpt-4o", "gpt-4-turbo"]
        },
        "groq": {
            "api_key": "gsk-...",
            "api_type": "openai",
            "base_url": "https://api.groq.com/openai/v1",
            "models": ["llama-3-70b", "mixtral-8x7b"]
        }
    }
}
```

---

## Main Directory Structure

```text
NoseSense/
├── backend/                  # Asynchronous Python Server
│   ├── main.py               # Entry point (FastAPI / SSE Routes)
│   ├── controllers/          # Business logic controllers
│   ├── routes/               # Separated API routes
│   ├── services/             # LLMs, Prompts, Database and CSV integration logic
│   ├── schemas/              # Pydantic validation schemas
│   ├── data/                 # Local databases or test datasets
│   ├── requirements.txt      # Python dependencies
│   └── dados.json            # (Auto-generated) Provider configs and API keys
└── frontend/                 # React.js Interface
    ├── app/                  # Routes and pages (Next.js App Router)
    ├── components/           # Modular UI components (shadcn, etc.)
    ├── hooks/                # Custom React hooks
    ├── lib/                  # Useful client-side libraries (store, types)
    └── package.json          # Node/Next dependencies
```

---

## Technologies Used

- **Languages**: Python, TypeScript/JavaScript
- **Frameworks**: FastAPI, Next.js, React
- **AI Integration**: LangChain
- **UI Styling**: Tailwind CSS
- **Persistence**: SQLite3, Native CSV Exporting
- **Package Managers**: `pip` (Backend), `pnpm` (Frontend)
