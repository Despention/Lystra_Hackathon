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
    improved_text: str | None = None
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


class LLMSettingsResponse(BaseModel):
    use_mock_llm: bool
    use_cloud_llm: bool
    cloud_provider: str  # "none" | "anthropic" | "openai"
    cloud_model: str
    cloud_api_key_set: bool  # True если ключ задан (не раскрываем сам ключ)
    llama_cpp_base_url: str
    llama_cpp_model_large: str
    llm_max_context_chars: int


class ChatRequest(BaseModel):
    analysis_id: str
    message: str
    history: list[dict] = []


class ChatResponse(BaseModel):
    reply: str


class GenerateStructureRequest(BaseModel):
    topic: str
    description: str = ""


class GenerateStructureResponse(BaseModel):
    structure: str


class GenerateExampleRequest(BaseModel):
    topic: str


class GenerateExampleResponse(BaseModel):
    example_tz: str


class LLMSettingsUpdateRequest(BaseModel):
    use_mock_llm: bool | None = None
    use_cloud_llm: bool | None = None
    cloud_provider: str | None = None   # "none" | "anthropic" | "openai"
    cloud_api_key: str | None = None    # "" = очистить ключ
    cloud_model: str | None = None
    llama_cpp_base_url: str | None = None
    llama_cpp_model_large: str | None = None
    llm_max_context_chars: int | None = None
