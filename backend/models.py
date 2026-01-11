from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class Node:
    id: int
    lat: float
    lng: float


@dataclass
class Edge:
    a: int
    b: int


@dataclass
class SimAgent:
    state: int
    t_exposed: Optional[int] = None
    t_infected: Optional[int] = None
    t_quarantined: Optional[int] = None


@dataclass
class Graph:
    id: str
    nodes: List[Node]
    edges: List[Edge]
    adj: List[List[int]]


@dataclass
class Simulation:
    id: str
    graph_id: str
    day: int
    agents: List[SimAgent]
    series: List[Dict[str, int]]
    policy_quarantine_on: bool
    policy_message: str
