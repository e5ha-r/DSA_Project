import random
import time
from typing import Dict, List

from config import STATE_NAME
from models import SimAgent


def new_id(prefix: str) -> str:
    return f"{prefix}_{int(time.time()*1000)}_{random.randint(1000,9999)}"


def clamp(v: float, a: float, b: float) -> float:
    return max(a, min(b, v))


def counts_from_agents(agents: List[SimAgent]) -> Dict[str, int]:
    c = {"S": 0, "E": 0, "I": 0, "Q": 0, "R": 0}
    for a in agents:
        c[STATE_NAME[a.state]] += 1
    return c


def total_ever_infected(agents: List[SimAgent]) -> int:
    return sum(1 for a in agents if a.t_infected is not None)


def seed_initial_infected(agents: List[SimAgent], k: int, day: int, state_I: int) -> None:
    n = len(agents)
    k = max(1, min(k, n))
    picks = random.sample(range(n), k)
    for i in picks:
        agents[i].state = state_I
        agents[i].t_infected = day
        agents[i].t_exposed = None
        agents[i].t_quarantined = None
