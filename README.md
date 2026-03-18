# NoseSense 👃💻

O **NoseSense** é uma plataforma inovadora baseada em Inteligência Artificial para a detecção e análise automática de "Test Smells" (maus cheiros em códigos de teste). O sistema orquestra múltiplos Grandes Modelos de Linguagem (LLMs) simultaneamente para analisar trechos de código e identificar problemas de qualidade nos testes.

O projeto é dividido em um **Backend** robusto em Python (FastAPI) e um **Frontend** moderno em React (Next.js).

---

## 🚀 Funcionalidades Principais

- **Análise Multi-Modelo Simultânea**: Orquestra e compara a performance de diversas IAs através da biblioteca Langchain (OpenAI, Google Gemini, Anthropic Claude, DeepSeek/Qwen via Together API).
- **Streaming em Tempo Real**: Processamento assíncrono com Server-Sent Events (SSE) para enviar resultados parciais em tempo real ao frontend.
- **Armazenamento e Exportação**: Salva todos os testes, prompts e as respostas detalhadas dos modelos localmente em um banco de dados SQLite (`resultados.db`) e exporta relatórios condensados em CSV (`resultado.csv`).
- **Engenharia de Prompt Dinâmica**: Geração automatizada de prompts randomizados para evitar viés de posicionamento nas respostas da IA.

---

## 🏗️ Arquitetura do Projeto

### Backend (FastAPI + LangChain)
- **Localização:** `/backend`
- **Responsabilidades:** Ler base de dados local de *Test Smells*, instanciar modelos LLM, orquestrar chamadas assíncronas (promises simultâneas) de análise, armazenar dados via banco e persistir respostas em CSV.
- **Porta Padrão:** `8001`

### Frontend (Next.js + React)
- **Localização:** `/frontend`
- **Responsabilidades:** Interface gráfica de usuário (UI) para disparar testes, visualizar o andamento das requisições assíncronas em tempo real (dashboard de execução) e analisar as métricas e o desempenho comparado dos LLMs no painel de resultados.
- **Porta Padrão:** `3000` (gerenciado pelo pnpm)

---

## 🛠️ Como Instalar e Rodar o Projeto

### Pré-requisitos
- Python 3.10+
- Node.js 18+ e *pnpm* instalado (`npm install -g pnpm`)
- Chaves de API das plataformas LLM requeridas (configuráveis via `dados.json` no backend).

### 1. Rodando o Backend

Abra um terminal e acesse a pasta do backend:
```bash
cd backend
```

Crie e ative um ambiente virtual (recomendado):
```bash
python3 -m venv venv
source venv/bin/activate  # No Windows: venv\\Scripts\\activate
```

Instale as dependências:
```bash
pip install -r requirements.txt
```

Inicie o servidor de desenvolvimento:
```bash
python main.py
```
*O servidor estará disponível em `http://localhost:8001`.*

> **Nota de Configuração**: O backend busca as chaves de API (OpenAI, Gemini, etc.) em um arquivo `dados.json`. Certifique-se de preencher suas chaves antes de rodar os testes.

### 2. Rodando o Frontend

Abra outro terminal e acesse a pasta do frontend:
```bash
cd frontend
```

Instale os pacotes e dependências através do PNPM:
```bash
pnpm install
```

Inicie a aplicação:
```bash
pnpm run dev
```
*A interface de usuário estará disponível em `http://localhost:3000`.*

---

## 📂 Estrutura de Diretórios Principal

```text
NoseSense/
├── backend/                  # Servidor Python assíncrono
│   ├── main.py               # Ponto de entrada (FastAPI / Rotas SSE)
│   ├── controllers/          # Controladores de regras de negócio
│   ├── routes/               # Rotas separadas da API
│   ├── services/             # Lógica de integração com LLMs, Prompts, Banco e CSV
│   ├── data/                 # Bases de dados locais ou datasets para teste
│   ├── requirements.txt      # Dependências do Python
│   └── dados.json            # (Necessário criar) Tokens e chaves das APIs
└── frontend/                 # Interface em React.js
    ├── app/                  # Rotas e páginas (Next.js App Router)
    ├── components/           # Componentes modulares de UI (shadcn, etc.)
    ├── hooks/                # Hooks customizados React
    ├── lib/                  # Bibliotecas úteis do client-side
    └── package.json          # Dependências do Node/Next
```

---

## 📋 Tecnologias Utilizadas

- **Linguagens**: Python, TypeScript/JavaScript
- **Frameworks**: FastAPI, Next.js, React
- **Integração IA**: LangChain
- **Estilização UI**: Tailwind CSS
- **Persistência**: SQLite3, Exportação CSV nativa
- **Gerenciador de Pacotes**: `pip` (Backend), `pnpm` (Frontend)
