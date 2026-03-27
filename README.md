# NoseSense 

*Read this in other languages: [Português](README-PTBR.md).*

**NoseSense** is a platform for evaluating the performance of LLMs in the automatic detection and analysis of "Test Smells" (poor design and implementation in test code). The system simultaneously orchestrates multiple Large Language Models (LLMs) to analyze code snippets, identify test quality issues, and generate comparative metrics between the models.

The project is divided into a **Backend** in Python (FastAPI) and a **Frontend** in React (Next.js).

## Key Features

- **Simultaneous Multi-Model Analysis**: Orchestrates and compares the performance of several APIs using the Langchain library (OpenAI, Google Gemini, Anthropic Claude, via Together API).
- **Real-Time Streaming**: Asynchronous processing with Server-Sent Events (SSE) to send real-time partial results to the frontend.
- **Storage and Exporting**: Locally saves all test names and model responses in a SQLite database (`resultados.db`) and exports condensed CSV reports (`resultado.csv`).
- **Dynamic Prompt Engineering**: Automated generation of randomized prompts to prevent positional bias in AI responses.

## Project Architecture

### Backend (FastAPI + LangChain)
- **Location:** `/backend`
- **Responsibilities:** Reads the local database of *Test Smells*, instantiates LLM models, orchestrates asynchronous analysis calls (simultaneous promises), stores data via the database, and persists responses in CSV.
- **Default Port:** `8001`

### Frontend (Next.js + React)
- **Location:** `/frontend`
- **Responsibilities:** Graphical User Interface (UI) to trigger tests, view the progress of asynchronous requests in real-time (execution dashboard), and analyze the comparative performance and metrics of the LLMs in the results panel.
- **Default Port:** `3000` (managed by pnpm)

## How to Install and Run

### Prerequisites
- Python 3.10+
- Node.js 18+ and *pnpm* installed (`npm install -g pnpm`)
- API Keys for the required LLM platforms (configurable via the backend, in the Add Provider modal, or in an internal file).

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

> **Configuration Note**: The backend looks for API keys (OpenAI, Gemini, etc.) inside a `dados.json` file. Ensure you fill in your keys before running tests.

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

## Main Directory Structure

```text
NoseSense/
├── backend/                  # Asynchronous Python Server
│   ├── main.py               # Entry point (FastAPI / SSE Routes)
│   ├── controllers/          # Business logic controllers
│   ├── routes/               # Separated API routes
│   ├── services/             # LLMs, Prompts, Database and CSV integration logic
│   ├── data/                 # Local databases or test datasets
│   ├── requirements.txt      # Python dependencies
│   └── dados.json            # (Needs to be created) API Keys and Tokens
└── frontend/                 # React.js Interface
    ├── app/                  # Routes and pages (Next.js App Router)
    ├── components/           # Modular UI components (shadcn, etc.)
    ├── hooks/                # Custom React hooks
    ├── lib/                  # Useful client-side libraries
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
