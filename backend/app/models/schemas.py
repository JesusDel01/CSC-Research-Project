from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ScanType(str, Enum):
    syn = "syn"
    full = "full"
    vuln = "vuln"


SCAN_TYPE_LABELS: dict[ScanType, str] = {
    ScanType.syn: "SYN Scan",
    ScanType.full: "Full Scan",
    ScanType.vuln: "NSE Vulnerability Scan",
}


class RiskLevel(str, Enum):
    green = "green"
    yellow = "yellow"
    red = "red"


class ServiceInfo(BaseModel):
    port: int
    protocol: str
    state: str
    service: str | None = None
    product: str | None = None
    version: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class NodeData(BaseModel):
    id: str
    label: str
    ip: str
    hostname: str | None = None
    status: str
    risk_level: RiskLevel = RiskLevel.green
    open_ports: list[int] = Field(default_factory=list)
    services: list[ServiceInfo] = Field(default_factory=list)
    vulnerabilities: list[str] = Field(default_factory=list)


class EdgeData(BaseModel):
    source: str
    target: str
    relation: str = "discovered"


class GraphData(BaseModel):
    nodes: list[NodeData] = Field(default_factory=list)
    edges: list[EdgeData] = Field(default_factory=list)


class ScannerResult(BaseModel):
    raw_summary: str | None = None
    graph: GraphData
    metadata: dict[str, Any] = Field(default_factory=dict)


class ScanRequest(BaseModel):
    scanner: str = "nmap"
    target: str = Field(..., description="IP, host, CIDR, or range")
    scan_type: ScanType
    source: str | None = Field(default=None, description="Who initiated the scan")
    extra_args: list[str] = Field(default_factory=list)


class ScanLogEntry(BaseModel):
    scan_id: str
    timestamp: datetime
    scanner: str
    scan_type: ScanType
    source: str | None = None
    destination: str
    ports: list[int] = Field(default_factory=list)
    result: ScannerResult


class RunScanResponse(BaseModel):
    scan: ScanLogEntry


class ScannerDescriptor(BaseModel):
    name: str
    supported_scan_types: list[ScanType]
    scan_type_labels: dict[str, str] = Field(default_factory=dict)
    description: str


class CveMapRequest(BaseModel):
    cve_ids: list[str] = Field(..., min_length=1, description="CVE identifiers to map")


class CveTaxonomyMap(BaseModel):
    cve_id: str
    cwe: list[str]
    capec: list[dict[str, Any]]
    attack: list[dict[str, Any]]
    d3fend: list[dict[str, Any]]


class CveMapResponse(BaseModel):
    mappings: list[CveTaxonomyMap]


class CveMappingsPdfRequest(BaseModel):
    mappings: list[CveTaxonomyMap] = Field(..., min_length=1)


class HoneypotRecommendation(BaseModel):
    target_node_id: str
    ip: str
    priority: int = Field(..., ge=1, description="1 = highest priority")
    rationale: str
    emulate_ports: list[int] = Field(default_factory=list)
    placement_hint: str


class HoneypotAnalyzeRequest(BaseModel):
    scan_id: str | None = None
    graph: GraphData | None = None


class HoneypotAnalyzeResponse(BaseModel):
    recommendations: list[HoneypotRecommendation]
    summary: str


class ScanStreamEvent(BaseModel):
    type: str
    message: str | None = None
    scan: ScanLogEntry | None = None


class CoreStatusResponse(BaseModel):
    available: bool
    configured_binary: str
    detected_binary: str | None = None
    scenario_count: int = 0
    mode: str
    message: str


class CoreScenarioDescriptor(BaseModel):
    id: str
    name: str
    description: str | None = None
    node_count: int = 0
    edge_count: int = 0


class CoreScenarioLoadRequest(BaseModel):
    scenario_id: str = Field(..., min_length=1)


class CoreScenarioLoadResponse(BaseModel):
    scenario_id: str
    name: str
    graph: GraphData
    metadata: dict[str, Any] = Field(default_factory=dict)
