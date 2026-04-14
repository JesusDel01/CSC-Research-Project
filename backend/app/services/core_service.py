import json
import shutil
from pathlib import Path

from app.core.config import settings
from app.models.schemas import (
    CoreScenarioDescriptor,
    CoreScenarioLoadResponse,
    CoreStatusResponse,
    GraphData,
)


class CoreService:
    """Adapter for CORE integration points.

    Today this service focuses on two useful capabilities:
    1. Detect whether a CORE CLI is available on the host.
    2. Load scenario snapshots from JSON so the UI can work end-to-end now.

    The JSON scenario contract mirrors the graph models already used by scans,
    which keeps the frontend integration simple and gives us a clean seam for
    replacing this with real daemon/session orchestration later.
    """

    def __init__(self, scenarios_dir: Path | None = None, core_binary: str | None = None) -> None:
        self.scenarios_dir = scenarios_dir or settings.core_scenarios_path
        self.core_binary = core_binary or settings.core_binary

    def get_status(self) -> CoreStatusResponse:
        detected_binary = shutil.which(self.core_binary)
        scenario_count = len(self.list_scenarios())
        if detected_binary:
            message = (
                f"CORE binary detected at {detected_binary}. "
                "Scenario import is ready; live session orchestration can be layered on next."
            )
        else:
            message = (
                f"CORE binary '{self.core_binary}' was not found on PATH. "
                "Scenario import mode is still available for UI and API integration."
            )

        return CoreStatusResponse(
            available=bool(detected_binary),
            configured_binary=self.core_binary,
            detected_binary=detected_binary,
            scenario_count=scenario_count,
            mode="scenario-import",
            message=message,
        )

    def list_scenarios(self) -> list[CoreScenarioDescriptor]:
        if not self.scenarios_dir.exists():
            return []

        scenarios: list[CoreScenarioDescriptor] = []
        for path in sorted(self.scenarios_dir.glob("*.json")):
            try:
                with path.open("r", encoding="utf-8") as handle:
                    payload = json.load(handle)
                scenario_id = str(payload.get("id") or path.stem)
                name = str(payload.get("name") or scenario_id.replace("-", " ").title())
                description = payload.get("description")
                scenarios.append(
                    CoreScenarioDescriptor(
                        id=scenario_id,
                        name=name,
                        description=str(description) if description else None,
                        node_count=len(payload.get("graph", {}).get("nodes", [])),
                        edge_count=len(payload.get("graph", {}).get("edges", [])),
                    )
                )
            except (json.JSONDecodeError, OSError, TypeError, ValueError):
                continue
        return scenarios

    def load_scenario(self, scenario_id: str) -> CoreScenarioLoadResponse:
        path = self.scenarios_dir / f"{scenario_id}.json"
        if not path.exists():
            raise ValueError(f"CORE scenario '{scenario_id}' was not found")

        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)

        graph = GraphData.model_validate(payload.get("graph", {}))
        return CoreScenarioLoadResponse(
            scenario_id=str(payload.get("id") or scenario_id),
            name=str(payload.get("name") or scenario_id.replace("-", " ").title()),
            graph=graph,
            metadata={
                "description": payload.get("description"),
                "source": "core-scenario",
                "binary_available": self.get_status().available,
            },
        )


core_service = CoreService()
