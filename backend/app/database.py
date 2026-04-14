import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Folder(Base):
    __tablename__ = "folders"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    parent_id = Column(String, ForeignKey("folders.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    analyses = relationship("Analysis", back_populates="folder")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=gen_uuid)
    filename = Column(String, nullable=True)
    file_type = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending/processing/completed/failed
    total_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime, nullable=True)
    document_text = Column(Text, nullable=True)
    mode = Column(String, default="full")  # quick/full
    not_ready = Column(String, nullable=True)  # null or reason
    summary = Column(Text, nullable=True)
    improved_text = Column(Text, nullable=True)
    folder_id = Column(String, ForeignKey("folders.id"), nullable=True)

    agent_results = relationship("AgentResult", back_populates="analysis", cascade="all, delete-orphan")
    issues = relationship("Issue", back_populates="analysis", cascade="all, delete-orphan")
    corrections = relationship("Correction", back_populates="analysis", cascade="all, delete-orphan")
    folder = relationship("Folder", back_populates="analyses")


class AgentResult(Base):
    __tablename__ = "agent_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending/running/completed/failed
    score = Column(Float, nullable=True)
    weight = Column(Float, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    raw_output = Column(Text, nullable=True)

    analysis = relationship("Analysis", back_populates="agent_results")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(String, primary_key=True, default=gen_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # critical/serious/warning/advice
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    document_quote = Column(Text, nullable=True)
    standard_reference = Column(String, nullable=True)
    recommendation = Column(Text, nullable=False)
    penalty = Column(Float, default=0.0)

    analysis = relationship("Analysis", back_populates="issues")


class Correction(Base):
    __tablename__ = "corrections"

    id = Column(String, primary_key=True, default=gen_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    section = Column(String, nullable=False)
    original_text = Column(Text, nullable=False)
    suggested_text = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    severity = Column(String, nullable=False)  # critical/serious/warning/advice

    analysis = relationship("Analysis", back_populates="corrections")


class LLMCache(Base):
    """Cache of LLM responses keyed by SHA-256 of (model, system_prompt, user_prompt).

    The system prompt is part of the key, so editing prompts.py invalidates
    affected entries automatically.
    """
    __tablename__ = "llm_cache"

    key = Column(String, primary_key=True)  # SHA-256 hex
    model = Column(String, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    hit_count = Column(Integer, default=0, nullable=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with async_session() as session:
        yield session
