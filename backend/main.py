import math
import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api_schemas import (
    GraphExportResp,
    GraphGenerateReq,
    GraphGenerateResp,
    SimStateResp,
    SimStepReq,
    SimStepResp,
    SimTimeseriesResp,
)
from config import DEFAULTS, ISB_BOUNDS, STATE_S, STATE_I
from graph_gen import build_adj, generate_edges_spatial, generate_uniform_nodes
from models import Graph, SimAgent, Simulation
from sim_logic import step_sim
from stores import GRAPHS, SIMS
from utils import counts_from_agents, new_id, seed_initial_infected, total_ever_infected


app = FastAPI(title="COVID-19 Simulation Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/graph/generate/islamabad_uniform", response_model=GraphGenerateResp)
def graph_generate_islamabad_uniform(req: GraphGenerateReq):
    n = int(req.n)
    if n < 200 or n > 20000:
        raise HTTPException(status_code=400, detail="n must be between 200 and 20000")

    graph_id = new_id("g")
    nodes = generate_uniform_nodes(n)
    edges = generate_edges_spatial(nodes, radius_m=DEFAULTS["infection_radius_m"], target_avg_degree=8)
    adj = build_adj(n, edges)
    GRAPHS[graph_id] = Graph(id=graph_id, nodes=nodes, edges=edges, adj=adj)

    sim_id = new_id("s")
    agents = [SimAgent(state=STATE_S) for _ in range(n)]

    # initial infected = random between 1% and 10%
    k_min = max(1, int(math.ceil(0.01 * n)))
    k_max = max(k_min, int(math.floor(0.10 * n)))
    k0 = random.randint(k_min, k_max)
    seed_initial_infected(agents, k=k0, day=0, state_I=STATE_I)

    sim = Simulation(
        id=sim_id,
        graph_id=graph_id,
        day=0,
        agents=agents,
        series=[{"day": 0, **counts_from_agents(agents)}],
        policy_quarantine_on=False,
        policy_message="",
    )
    SIMS[sim_id] = sim

    return GraphGenerateResp(
        graph_id=graph_id,
        sim_id=sim_id,
        day=sim.day,
        counts=counts_from_agents(sim.agents),
        policy_message=sim.policy_message,
        policy_quarantine_on=sim.policy_quarantine_on,
    )


@app.get("/graph/{graph_id}/export/json", response_model=GraphExportResp)
def graph_export_json(graph_id: str):
    g = GRAPHS.get(graph_id)
    if not g:
        raise HTTPException(status_code=404, detail="graph not found")

    nodes_out = [{"id": nd.id, "lat": nd.lat, "lng": nd.lng} for nd in g.nodes]
    edges_out = [{"a": e.a, "b": e.b} for e in g.edges]
    meta = {
        "bounds": ISB_BOUNDS,
        "infection_radius_m": DEFAULTS["infection_radius_m"],
        "n": len(g.nodes),
        "m": len(g.edges),
    }
    return GraphExportResp(nodes=nodes_out, edges=edges_out, meta=meta)


@app.post("/sim/{sim_id}/step", response_model=SimStepResp)
def sim_step(sim_id: str, req: SimStepReq):
    sim = SIMS.get(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="sim not found")

    days = int(req.days)
    days = max(1, min(days, 30))

    for _ in range(days):
        before = counts_from_agents(sim.agents)
        before_total = total_ever_infected(sim.agents)
        before_active = before["I"] + before["E"] + before["Q"]
        if before_active == 0 and before["R"] == before_total:
            break
        step_sim(sim, DEFAULTS)

    return SimStepResp(
        sim_id=sim.id,
        day=sim.day,
        counts=counts_from_agents(sim.agents),
        policy_message=sim.policy_message,
        policy_quarantine_on=sim.policy_quarantine_on,
    )


@app.get("/sim/{sim_id}/export/state.json", response_model=SimStateResp)
def sim_export_state(sim_id: str):
    sim = SIMS.get(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="sim not found")
    return SimStateResp(state=[a.state for a in sim.agents])


@app.get("/sim/{sim_id}/timeseries", response_model=SimTimeseriesResp)
def sim_timeseries(sim_id: str):
    sim = SIMS.get(sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="sim not found")
    return SimTimeseriesResp(series=sim.series[-400:])
