from typing import Dict, List
from pydantic import BaseModel


class GraphGenerateReq(BaseModel):
    n: int


class GraphGenerateResp(BaseModel):
    graph_id: str
    sim_id: str
    day: int
    counts: Dict[str, int]
    policy_message: str
    policy_quarantine_on: bool


class GraphExportResp(BaseModel):
    nodes: List[dict]
    edges: List[dict]
    meta: dict


class SimStepReq(BaseModel):
    days: int = 1


class SimStepResp(BaseModel):
    sim_id: str
    day: int
    counts: Dict[str, int]
    policy_message: str
    policy_quarantine_on: bool


class SimStateResp(BaseModel):
    state: List[int]


class SimTimeseriesResp(BaseModel):
    series: List[Dict[str, int]]
