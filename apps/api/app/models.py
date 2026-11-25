from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def utc_now() -> datetime:
    return datetime.now(UTC)


class ResearchRun(Base):
    __tablename__ = "research_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False)
    stage: Mapped[str] = mapped_column(String(40), default="queued", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    plan_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    report_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    sources: Mapped[list["Source"]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="Source.id",
    )
    claims: Mapped[list["Claim"]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="Claim.id",
    )


class Source(Base):
    __tablename__ = "sources"
    __table_args__ = (UniqueConstraint("run_id", "canonical_url"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("research_runs.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(String(2000), nullable=False)
    canonical_url: Mapped[str] = mapped_column(String(2000), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    run: Mapped[ResearchRun] = relationship(back_populates="sources")
    claims: Mapped[list["Claim"]] = relationship(back_populates="source")


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("research_runs.id", ondelete="CASCADE"))
    source_id: Mapped[int | None] = mapped_column(
        ForeignKey("sources.id", ondelete="SET NULL"),
        nullable=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="unverified", nullable=False)

    run: Mapped[ResearchRun] = relationship(back_populates="claims")
    source: Mapped[Source | None] = relationship(back_populates="claims")
