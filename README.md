# Verity — Evidence-First Research Agent

Verity turns a research question into a structured, source-linked report. Its workflow plans bounded subquestions, searches the web, extracts claims with source excerpts, and keeps citations attached to the findings they support.

> **Current milestone:** foundational web interface and research workflow are under active development. Search and report generation require API credentials. Verity does not guarantee that a source is accurate; review sources and evidence before relying on a report.

## What it is designed to do

- Turn a question into an explicit research plan.
- Search a configured provider within source and query limits.
- Preserve source URLs and the excerpts used to support claims.
- Distinguish supported, conflicting, and unverified findings.
- Produce a report with traceable references.
- Keep each run's progress and outcome inspectable.

## Architecture

```text
Next.js / TypeScript
        │ HTTP
        ▼
FastAPI ── LangGraph workflow
        │               ├── Plan subquestions
        │               ├── Search (Tavily)
        │               ├── Extract claims (OpenAI)
        │               └── Verify citations and compose report
        ▼
PostgreSQL (runs, plans, sources, claims, reports)

Redis is provisioned for a later background-job milestone.
```

The workflow has bounded queries and result counts; it is not an unrestricted browsing agent. A citation in a report points to a source record and an excerpt retained with the claim.

## Requirements

- Node.js 20.9 or newer and npm
- Python 3.11 or newer
- Docker Desktop (optional, for PostgreSQL and Redis)
- OpenAI API key and Tavily API key to run live research

## Local development

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` and `TAVILY_API_KEY`.
2. Start the local data services:

   ```powershell
   docker compose up -d postgres redis
   ```

3. Start the API:

   ```powershell
   cd apps\api
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   py -m pip install -e ".[dev]"
   py -m uvicorn app.main:app --reload --port 8000
   ```

   API docs are available at <http://localhost:8000/docs>.

4. Start the web app in another terminal:

   ```powershell
   cd apps\web
   npm install
   npm run dev
   ```

   Open <http://localhost:3000>.

For SQLite development without Docker, set `DATABASE_URL=sqlite:///./verity.db` in `.env`. The API reads environment variables from the process environment; export the values before launching it if your shell does not load `.env` automatically.

## Configuration

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Required for planning and evidence extraction |
| `OPENAI_MODEL` | OpenAI model name; defaults to `gpt-4o-mini` |
| `TAVILY_API_KEY` | Required for web search |
| `DATABASE_URL` | SQLAlchemy URL; PostgreSQL by default |
| `NEXT_PUBLIC_API_URL` | API base URL used by the browser; defaults to `http://localhost:8000` |

Never commit `.env` or real credentials. Local examples in `.env.example` are intentionally blank.

## Research workflow

1. **Plan:** derive an objective and up to four focused subquestions.
2. **Search:** query Tavily with a bounded number of results per question.
3. **Extract:** ask the configured model for claims and verbatim excerpts tied to retrieved source IDs.
4. **Verify:** reject citations whose excerpt does not occur in the retrieved source text; leave unsupported claims flagged.
5. **Report:** render findings and references from the persisted evidence.

Provider failures are surfaced as failed runs rather than being replaced with fabricated results. Generated reports are research aids, not professional or factual guarantees.

## Development

```powershell
# Frontend
cd apps\web
npm run lint
npm run build

# Backend
cd apps\api
py -m pytest
```

## Roadmap

- [x] Repository structure, local service configuration, and project documentation
- [ ] Research request interface and API
- [ ] Stateful planning, search, retrieval, and claim extraction
- [ ] Evidence verification and cited report generation
- [ ] Human review, background processing, and progress updates
- [ ] Evaluation fixtures, exports, and deployment guide

## License

No license has been selected yet. Until one is added, all rights are reserved by default.
