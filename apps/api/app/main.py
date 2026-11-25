from contextlib import asynccontextmanager
from typing import Annotated, cast

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.db import engine, get_db
from app.models import Base, Claim, ResearchRun, Source
from app.research import research_graph
from app.schemas import ClaimRead, ResearchQuestion, RunDetail, RunSummary, SourceRead


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Verity Research API",
    description="A bounded research workflow with source-linked evidence.",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _source_read(source: Source) -> SourceRead:
    return SourceRead(
        id=source.id,
        title=source.title,
        url=source.url,
        domain=source.domain,
        excerpt=source.content[:300],
    )


def _run_detail(run: ResearchRun) -> RunDetail:
    plan = run.plan_json or {}
    return RunDetail(
        id=run.id,
        question=run.question,
        status=cast(str, run.status),
        stage=run.stage,
        created_at=run.created_at,
        source_count=len(run.sources),
        claim_count=len(run.claims),
        objective=plan.get("objective"),
        subquestions=plan.get("subquestions", []),
        information_gaps=plan.get("information_gaps", []),
        sources=[_source_read(source) for source in run.sources],
        claims=[
            ClaimRead(
                id=claim.id,
                text=claim.text,
                status=cast(str, claim.status),
                excerpt=claim.excerpt,
                source_id=claim.source_id,
                source_title=claim.source.title if claim.source else None,
                source_url=claim.source.url if claim.source else None,
            )
            for claim in run.claims
        ],
        report_markdown=run.report_markdown,
        error=run.error,
    )


def _get_run_with_details(session: Session, run_id: int) -> ResearchRun | None:
    return session.scalar(
        select(ResearchRun)
        .where(ResearchRun.id == run_id)
        .options(
            selectinload(ResearchRun.sources),
            selectinload(ResearchRun.claims).selectinload(Claim.source),
        )
    )


@app.get("/health")
def health(db: Annotated[Session, Depends(get_db)]):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/research/runs", response_model=list[RunSummary])
def list_runs(db: Annotated[Session, Depends(get_db)]):
    runs = db.scalars(
        select(ResearchRun)
        .options(selectinload(ResearchRun.sources), selectinload(ResearchRun.claims))
        .order_by(ResearchRun.created_at.desc())
        .limit(50)
    ).all()
    return [
        RunSummary(
            id=run.id,
            question=run.question,
            status=cast(str, run.status),
            created_at=run.created_at,
            source_count=len(run.sources),
            claim_count=len(run.claims),
        )
        for run in runs
    ]


@app.post("/research/runs", response_model=RunDetail, status_code=201)
def create_run(payload: ResearchQuestion, db: Annotated[Session, Depends(get_db)]):
    run = ResearchRun(question=payload.question.strip(), status="queued", stage="queued")
    db.add(run)
    db.commit()
    db.refresh(run)
    try:
        research_graph.invoke({"run_id": run.id, "question": run.question})
    except Exception as error:
        db.rollback()
        failed_run = db.get(ResearchRun, run.id)
        if failed_run is not None:
            failed_run.status = "failed"
            failed_run.stage = "failed"
            failed_run.error = str(error)[:2000]
            db.commit()
        raise HTTPException(status_code=502, detail=f"Research workflow failed: {error}") from error

    db.expire_all()
    completed_run = _get_run_with_details(db, run.id)
    if completed_run is None:
        raise HTTPException(status_code=500, detail="Research run disappeared after processing.")
    return _run_detail(completed_run)


@app.get("/research/runs/{run_id}", response_model=RunDetail)
def get_run(run_id: int, db: Annotated[Session, Depends(get_db)]):
    run = _get_run_with_details(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Research run not found.")
    return _run_detail(run)
