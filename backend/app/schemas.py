from datetime import datetime
from pydantic import BaseModel


# --- Request ---

class AnalyzeTextRequest(BaseModel):
    text: str
    mode: str = "full"


# --- Response ---

class IssueResponse(BaseModel):
    id: str
    agent_name: str
    severity: str
    title: str
    description: str
    document_quote: str | None = None
    standard_reference: str | None = None
    recommendation: str
    penalty: float


class AgentResultResponse(BaseModel):
    agent_name: str
    status: str
    score: float | None = None
    weight: float
    started_at: datetime | None = None
    completed_at: datetime | None = None


class CorrectionResponse(BaseModel):
    id: str
    analysis_id: str
    section: str
    original_text: str
    suggested_text: str
    reason: str
    severity: str


class AnalysisResponse(BaseModel):
    id: str
    filename: str | None
    file_type: str | None
    status: str
    total_score: float | None
    created_at: datetime
    completed_at: datetime | None
    mode: str
    not_ready: str | None
    summary: str | None = None
    folder_id: str | None = None
    agent_results: list[AgentResultResponse]
    issues: list[IssueResponse]
    corrections: list[CorrectionResponse] = []


class AnalysisListItem(BaseModel):
    id: str
    filename: str | None
    status: str
    total_score: float | None
    created_at: datetime
    mode: str
    summary: str | None = None
    folder_id: str | None = None
    issues_count: int = 0
    critical_count: int = 0


class AnalyzeStartResponse(BaseModel):
    analysis_id: str
    status: str


class FolderResponse(BaseModel):
    id: str
    name: str
    parent_id: str | None
    created_at: datetime
    analyses_count: int = 0


class FolderCreateRequest(BaseModel):
    name: str
    parent_id: str | None = None


class MoveToFolderRequest(BaseModel):
    folder_id: str | None


class HealthResponse(BaseModel):
    status: str
    llm_available: bool
    llm_model: str | None = None
    llm_url: str | None = None
    use_mock: bool = False
    database: str
    version: str
