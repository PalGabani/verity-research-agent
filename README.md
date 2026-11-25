# Verity — Evidence-First Research Agent

Verity turns a research question into a structured, source-linked report. Its workflow plans bounded subquestions, searches the web, extracts claims with source excerpts, and keeps citations attached to the findings they support.

> **Current milestone:** the end-to-end research MVP is available. Live research requires OpenAI and Tavily API credentials. Verity checks that cited excerpts occur in retrieved text, but it does not guarantee that a source is accurate or that a model-generated claim is true. Review original sources before relying on a report.

## What it is designed to do

- Turn a question into an explicit research plan.
- Search a configured provider within source and query limits.
- Preserve source URLs and the excerpts used to support claims.
- Distinguish supported, conflicting, and unverified findings.
- Produce a report with traceable references.
- Keep each run's plan, evidence, status, and outcome inspectable.

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

The workflow is bounded to four subquestions, three search results per subquestion, twelve unique sources, and twenty extracted claims per run. It is not an unrestricted browsing agent. A citation points to a retained source record; claims are only marked supported when their excerpt is found in the retrieved text.

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
   python -m pip install -e ".[dev]"
   python -m uvicorn app.main:app --reload --port 8000
   ```

   API docs are available at <http://localhost:8000/docs>.

4. Start the web app in another terminal:

   ```powershell
   cd apps\web
   npm install
   npm run dev
   ```

   Open <http://localhost:3000>.

For SQLite development without Docker, set `DATABASE_URL=sqlite:///./verity.db` in the root `.env` file. The API reads that file automatically. The Next.js app defaults to `http://localhost:8000`; set `NEXT_PUBLIC_API_URL` in the web app's environment if the API runs elsewhere.

## Configuration

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Required for planning and evidence extraction |
| `OPENAI_MODEL` | OpenAI model name; defaults to `gpt-4o-mini` |
| `TAVILY_API_KEY` | Required for web search |
| `DATABASE_URL` | SQLAlchemy URL; `.env.example` uses PostgreSQL, and the API falls back to local SQLite if unset |
| `FRONTEND_ORIGIN` | Allowed browser origin for API requests; defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | API base URL used by the browser; defaults to `http://localhost:8000` |

Never commit `.env` or real credentials. Local examples in `.env.example` are intentionally blank.

## Research workflow

1. **Plan:** derive an objective and up to four focused subquestions.
2. **Search:** query Tavily and retain deduplicated source URLs and retrieved text.
3. **Extract:** ask the configured model for claims and verbatim excerpts tied to source IDs.
4. **Verify:** retain claims as unverified when their excerpt cannot be found in the source text.
5. **Report:** assemble findings and references from the persisted evidence.

Provider failures are surfaced as failed runs rather than being replaced with fabricated results. Generated reports are research aids, not professional or factual guarantees.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Check API and database connectivity |
| `GET` | `/research/runs` | List the 50 most recent research runs |
| `POST` | `/research/runs` | Plan, search, extract, verify, and report for a question |
| `GET` | `/research/runs/{id}` | Retrieve a run, its plan, claims, evidence, and report |

Interactive API documentation is available at `/docs` while the API is running.

## Current limitations

- Research runs execute synchronously in the API request; Redis is provisioned but background workers and durable job recovery are not implemented yet.
- Source text is stored in the relational database; object storage, snapshot versioning, and migrations are not implemented yet.
- Claim extraction and conflict labels are model-generated. Excerpt matching checks quotation presence, not the truth of the source or full semantic entailment.
- Human claim editing, approval controls, authentication, report export, and deployment hardening remain future milestones.

## Development

```powershell
# Frontend
cd apps\web
npm install
npm run lint
npm run build

# Backend
cd apps\api
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\ruff.exe check .
```

## Staged milestones

- [x] **Foundation:** repository structure, local services, environment template, and setup docs
- [x] **Research desk:** responsive research interface and run-history views
- [x] **Research workflow:** FastAPI and LangGraph planning, bounded Tavily search, and OpenAI claim extraction
- [x] **Evidence reports:** source persistence, excerpt verification, explicit failed-run handling, and Markdown report generation
- [ ] **Review and jobs:** human approval, background processing, progress updates, and recovery
- [ ] **Portfolio and deployment:** evaluation fixtures, exports, migrations, and deployment guide

## License

No license has been selected yet. Until one is added, all rights are reserved by default.
