from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "NetVision API"
    app_version: str = "0.2.0"
    api_prefix: str = "/api/v1"
    project_root: Path = Field(default_factory=lambda: _BACKEND_DIR.parent)
    scan_log_path: Path = Path("backend/logs/scans.jsonl")
    nmap_binary: str = "nmap"
    default_scan_timeout_seconds: int = 300
    cve_mapping_log_path: Path = Path("backend/logs/cve_mappings.jsonl")
    core_binary: str = "corectl"
    core_scenarios_dir: Path = Path("backend/core/scenarios")

    model_config = SettingsConfigDict(env_prefix="NETVISION_", extra="ignore")

    def resolve_path(self, path: Path) -> Path:
        if path.is_absolute():
            return path
        return self.project_root / path

    @property
    def scan_log_file(self) -> Path:
        return self.resolve_path(self.scan_log_path)

    @property
    def cve_mapping_log_file(self) -> Path:
        return self.resolve_path(self.cve_mapping_log_path)

    @property
    def core_scenarios_path(self) -> Path:
        return self.resolve_path(self.core_scenarios_dir)


settings = Settings()
