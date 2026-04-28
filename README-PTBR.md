# NoseSense

O **NoseSense** é uma plataforma para a avaliação da performance de LLMs na detecção e análise automática de "Test Smells" (maus cheiros em códigos de teste). O sistema orquestra múltiplos Grandes Modelos de Linguagem (LLMs) simultaneamente para analisar trechos de código e identificar problemas de qualidade nos testes, gerando métricas comparativas entre os modelos.

O projeto é dividido em um **Backend** em Python (FastAPI) e um **Frontend** em React (Next.js).

## Funcionalidades Principais

- **Análise Multi-Modelo Simultânea**: Orquestra e compara a performance de múltiplos LLMs através da biblioteca LangChain. Suporta qualquer provedor, adicione suas próprias empresas e modelos livremente.
- **Configuração Dinâmica de Provedores**: Adicione qualquer provedor de IA (OpenAI, Google, Anthropic, Groq, Together, ou qualquer API compatível com OpenAI) com chaves de API customizadas, URLs base e nomes de modelos, tudo pela interface, sem configuração hardcoded.
- **Streaming em Tempo Real**: Processamento assíncrono com Server-Sent Events (SSE) para enviar resultados parciais em tempo real ao frontend.
- **Armazenamento e Exportação**: Salva todos os nomes dos testes e as respostas dos modelos localmente em um banco de dados SQLite (`resultados.db`) e exporta relatórios condensados em CSV (`resultado.csv`).
- **Engenharia de Prompt Dinâmica**: Geração automatizada de prompts randomizados para evitar viés de posicionamento nas respostas da IA.

## Arquitetura do Projeto

### Backend (FastAPI + LangChain)
- **Localização:** `/backend`
- **Responsabilidades:** Ler base de dados local de *Test Smells*, instanciar modelos LLM dinamicamente com base nos provedores configurados pelo usuário, orquestrar chamadas assíncronas de análise, armazenar dados via banco e persistir respostas em CSV.
- **Porta Padrão:** `8001`

### Frontend (Next.js + React)
- **Localização:** `/frontend`
- **Responsabilidades:** Interface gráfica de usuário (UI) para configurar provedores e modelos, disparar testes, visualizar o andamento das requisições assíncronas em tempo real (dashboard de execução) e analisar as métricas e o desempenho comparado dos LLMs no painel de resultados.
- **Porta Padrão:** `3000` (gerenciado pelo pnpm)

## Como Instalar e Rodar o Projeto

### Pré-requisitos
- Python 3.10+
- Node.js 18+ e *pnpm* instalado (`npm install -g pnpm`)
- Chaves de API dos provedores de LLM que você deseja usar (configuráveis pela interface do frontend).

---

### Inicialização Rápida (Recomendado)

O projeto contém um utilitário em script Bash que constrói os ambientes, instala as dependências do Backend e Frontend, sobe os dois servidores simultaneamente e abre a interface no seu navegador automaticamente.

Na pasta raiz (`NoseSense/`), execute:

```bash
chmod +x dev.sh
./dev.sh
```

---

### Inicialização Manual

#### 1. Rodando o Backend

Abra um terminal e acesse a pasta do backend:
```bash
cd backend
```

Crie e ative um ambiente virtual (recomendado):
```bash
python3 -m venv venv
source venv/bin/activate
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

#### 2. Rodando o Frontend

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

## Configurando Provedores e Modelos

Toda a configuração é feita pela interface do frontend, não é necessário editar arquivos manualmente.

1. **Adicionar Provedor**: Clique em "Add Provider", digite o nome do provedor (ex: "OpenAI", "Groq"), selecione o tipo de API e cole sua chave de API.
   - **Tipos de API**: `OpenAI-compatible` (para OpenAI, Groq, Together, etc.), `Google GenAI` (para Gemini), `Anthropic` (para Claude).
   - **Base URL**: Para provedores que usam o formato compatível com OpenAI mas não são a OpenAI, defina a URL base customizada (ex: `https://api.together.xyz/v1`).
2. **Adicionar Modelos**: Expanda o provedor e clique em "Add Model". Digite o nome exato do modelo conforme a documentação da API do provedor (ex: `gpt-4o`, `gemini-2.5-flash`, `claude-3.5-sonnet`).
3. **Selecionar Modelos**: Use os checkboxes para ativar/desativar modelos para os testes.
4. **Editar Chave de API**: Clique no ícone de lápis em qualquer provedor para atualizar sua chave.
5. **Executar Testes**: Clique em "Run Process" para executar os testes em todos os modelos selecionados simultaneamente.

A configuração é armazenada em `backend/dados.json` com o seguinte formato:

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

## Estrutura de Diretórios Principal

```text
NoseSense/
├── backend/                  # Servidor Python assíncrono
│   ├── main.py               # Ponto de entrada (FastAPI / Rotas SSE)
│   ├── controllers/          # Controladores de regras de negócio
│   ├── routes/               # Rotas separadas da API
│   ├── services/             # Lógica de integração com LLMs, Prompts, Banco e CSV
│   ├── schemas/              # Schemas de validação Pydantic
│   ├── data/                 # Bases de dados locais ou datasets para teste
│   ├── requirements.txt      # Dependências do Python
│   └── dados.json            # (Gerado automaticamente) Configuração de provedores e chaves
└── frontend/                 # Interface em React.js
    ├── app/                  # Rotas e páginas (Next.js App Router)
    ├── components/           # Componentes modulares de UI (shadcn, etc.)
    ├── hooks/                # Hooks customizados React
    ├── lib/                  # Bibliotecas úteis do client-side (store, types)
    └── package.json          # Dependências do Node/Next
```

---

## Tecnologias Utilizadas

- **Linguagens**: Python, TypeScript/JavaScript
- **Frameworks**: FastAPI, Next.js, React
- **Integração IA**: LangChain
- **Estilização UI**: Tailwind CSS
- **Persistência**: SQLite3, Exportação CSV nativa
- **Gerenciador de Pacotes**: `pip` (Backend), `pnpm` (Frontend)
