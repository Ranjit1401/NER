import uuid
import datetime
from enum import Enum
from pydantic import BaseModel, Field

class AgentType(str, Enum):
    SUPERVISOR = "SUPERVISOR"
    DISASTER = "DISASTER"
    ROUTE = "ROUTE"
    LOGISTICS = "LOGISTICS"
    RESEARCH = "RESEARCH"

class FindingItem(BaseModel):
    category: str
    fact: str
    is_database_result: bool = True
    reference_id: str | None = None

class RecommendationItem(BaseModel):
    action: str
    reasoning: str
    requires_human_approval: bool = True
    safety_override_active: bool = False

class EvidenceItem(BaseModel):
    source_type: str
    source_name: str
    data_summary: str

class AgentResult(BaseModel):
    agent_name: str
    agent_type: AgentType
    status: str = "SUCCESS"  # SUCCESS, WARNING, FAILED
    summary: str
    findings: list[FindingItem] = []
    recommendations: list[RecommendationItem] = []
    evidence: list[EvidenceItem] = []
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    warnings: list[str] = []
    execution_time_ms: int = 0

class OrchestratedQueryRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Operator command or question")

class OrchestratedQueryResponse(BaseModel):
    query: str
    execution_plan: list[str]
    agent_results: list[AgentResult]
    final_summary: str
    recommendations: list[RecommendationItem]
    evidence: list[EvidenceItem]
    warnings: list[str]
    total_execution_time_ms: int
    audit_log_id: str | None = None
