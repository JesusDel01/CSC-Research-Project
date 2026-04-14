from fastapi import APIRouter, HTTPException, status

from app.models.schemas import CoreScenarioLoadRequest, CoreScenarioLoadResponse, CoreStatusResponse, CoreScenarioDescriptor
from app.services.core_service import core_service

router = APIRouter(prefix="/core", tags=["core"])


@router.get("/status", response_model=CoreStatusResponse)
def get_core_status() -> CoreStatusResponse:
    return core_service.get_status()


@router.get("/scenarios", response_model=list[CoreScenarioDescriptor])
def list_core_scenarios() -> list[CoreScenarioDescriptor]:
    return core_service.list_scenarios()


@router.post("/scenarios/load", response_model=CoreScenarioLoadResponse, status_code=status.HTTP_200_OK)
def load_core_scenario(request: CoreScenarioLoadRequest) -> CoreScenarioLoadResponse:
    try:
        return core_service.load_scenario(request.scenario_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
