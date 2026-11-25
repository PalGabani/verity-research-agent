from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ClaimStatus = Literal["supported", "conflicting", "unverified"]
RunStatus = Literal["queued", "running", "completed", "failed"]


class ResearchQuestion(BaseModel):
    question: str = Field(min_length=12, max_length=500)


class SourceRead(BaseModel):
    id: int
    title: str
    url: str
    domain: str
    excerpt: str

    model_config = ConfigDict(from_attributes=True)


class ClaimRead(BaseModel):
    id: int
    text: str
    status: ClaimStatus
    excerpt: str
    source_id: int | None
    source_title: str | None = None
    source_url: str | None = None


class RunSummary(BaseModel):
    id: int
    question: str
    status: RunStatus
    created_at: datetime
    source_count: int
    claim_count: int

    model_config = ConfigDict(from_attributes=True)


class RunDetail(RunSummary):
    stage: str
    objective: str | None = None
    subquestions: list[str] = Field(default_factory=list)
    information_gaps: list[str] = Field(default_factory=list)
    sources: list[SourceRead] = Field(default_factory=list)
    claims: list[ClaimRead] = Field(default_factory=list)
    report_markdown: str | None = None
    error: str | None = None
