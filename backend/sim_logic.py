import random
from typing import List

from config import (
    STATE_E,
    STATE_I,
    STATE_Q,
    STATE_R,
    STATE_S,
)
from models import Simulation
from stores import GRAPHS
from utils import clamp, counts_from_agents, total_ever_infected


def step_sim(sim: Simulation, params: dict) -> None:
    g = GRAPHS.get(sim.graph_id)
    if not g:
        raise RuntimeError("Graph not found")

    # stop if finished (no extra day increments)
    cur_counts0 = counts_from_agents(sim.agents)
    cur_total0 = total_ever_infected(sim.agents)
    active0 = cur_counts0["I"] + cur_counts0["E"] + cur_counts0["Q"]
    if active0 == 0 and cur_counts0["R"] == cur_total0:
        if not sim.policy_message:
            sim.policy_message = f"Simulation ended: infections neutralized on day {sim.day}."
        return

    day = sim.day
    agents = sim.agents
    adj = g.adj

    incubation = params["incubation_days"]
    infectious = params["infectious_days"]
    quarantine_days = params["quarantine_days"]

    base_p = params["base_transmission"]
    contacts_per_day = params["contacts_per_day"]

    lockdown_thresh = params["auto_quarantine_threshold_I"]      # kept key
    lockdown_strength = params["policy_quarantine_strength"]     # kept key
    test_isolate_rate = params["test_isolate_rate"]

    cur_counts = counts_from_agents(agents)
    cur_I = cur_counts["I"]

    if (not sim.policy_quarantine_on) and cur_I >= lockdown_thresh:
        sim.policy_quarantine_on = True
        sim.policy_message = (
            f"Auto-lockdown imposed: infections reached {cur_I} (threshold {lockdown_thresh})."
        )

    lockdown_factor = lockdown_strength if sim.policy_quarantine_on else 0.0

    # strict covid-era style reductions (same as your latest single-file)
    effective_contacts = max(1, int(round(contacts_per_day * max(0.0, (1.0 - 1.15 * lockdown_factor)))))
    effective_p = clamp(base_p * max(0.0, (1.0 - 1.08 * lockdown_factor)), 0.001, 0.9)

    # lockdown does not change isolation; testing still applies
    effective_isolate = clamp(test_isolate_rate, 0.0, 0.8)

    # e -> i
    for a in agents:
        if a.state == STATE_E and a.t_exposed is not None:
            if (day - a.t_exposed) >= incubation:
                a.state = STATE_I
                a.t_infected = day

    # i -> q (testing)
    for a in agents:
        if a.state == STATE_I:
            if random.random() < effective_isolate:
                a.state = STATE_Q
                a.t_quarantined = day

    # i/q -> r
    for a in agents:
        if a.state == STATE_I and a.t_infected is not None:
            if (day - a.t_infected) >= infectious:
                a.state = STATE_R
        elif a.state == STATE_Q and a.t_quarantined is not None:
            if (day - a.t_quarantined) >= max(4, int(round(quarantine_days * 0.9))):
                a.state = STATE_R

    # transmission
    newly_exposed: List[int] = []
    for i, a in enumerate(agents):
        if a.state != STATE_I:
            continue
        nbrs = adj[i]
        if not nbrs:
            continue

        if len(nbrs) <= effective_contacts:
            picks = nbrs
        else:
            picks = random.sample(nbrs, effective_contacts)

        for j in picks:
            b = agents[j]
            if b.state != STATE_S:
                continue

            p = clamp(effective_p * (0.7 + 0.6 * random.random()), 0.0, 1.0)
            if random.random() < p:
                newly_exposed.append(j)

    for j in newly_exposed:
        b = agents[j]
        if b.state == STATE_S:
            b.state = STATE_E
            b.t_exposed = day

    sim.day += 1
    sim.series.append({"day": sim.day, **counts_from_agents(agents)})

    # end condition: active==0 and recovered == total ever infected
    cur_counts2 = counts_from_agents(agents)
    cur_total2 = total_ever_infected(agents)
    active2 = cur_counts2["I"] + cur_counts2["E"] + cur_counts2["Q"]
    if active2 == 0 and cur_counts2["R"] == cur_total2:
        sim.policy_message = f"Simulation ended: infections neutralized on day {sim.day}."
