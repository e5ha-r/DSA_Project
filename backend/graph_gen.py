import random
from typing import List

from config import ISB_BOUNDS
from models import Edge, Node
from spatial import SpatialGrid, haversine_m


def generate_uniform_nodes(n: int) -> List[Node]:
    nodes: List[Node] = []
    lat_min = ISB_BOUNDS["lat_min"]
    lat_max = ISB_BOUNDS["lat_max"]
    lng_min = ISB_BOUNDS["lng_min"]
    lng_max = ISB_BOUNDS["lng_max"]

    for i in range(n):
        lat = random.uniform(lat_min, lat_max)
        lng = random.uniform(lng_min, lng_max)
        nodes.append(Node(id=i, lat=lat, lng=lng))
    return nodes


def generate_edges_spatial(nodes: List[Node], radius_m: float, target_avg_degree: int = 8) -> List[Edge]:
    if not nodes:
        return []

    grid = SpatialGrid(lat0=nodes[0].lat, cell_size_m=radius_m)
    for i, nd in enumerate(nodes):
        grid.insert(i, nd.lat, nd.lng)

    deg = [0] * len(nodes)
    edges: List[Edge] = []
    seen = set()

    for i, a in enumerate(nodes):
        cand = grid.neighbors_candidates(a.lat, a.lng)
        random.shuffle(cand)

        for j in cand:
            if j == i:
                continue
            if deg[i] >= target_avg_degree:
                break
            if deg[j] >= target_avg_degree:
                continue

            u, v = (i, j) if i < j else (j, i)
            if (u, v) in seen:
                continue

            d = haversine_m(a.lat, a.lng, nodes[j].lat, nodes[j].lng)
            if d <= radius_m:
                seen.add((u, v))
                edges.append(Edge(a=u, b=v))
                deg[u] += 1
                deg[v] += 1

    attempts = 0
    while attempts < len(nodes) * 2:
        a = random.randrange(len(nodes))
        b = random.randrange(len(nodes))
        if a == b:
            attempts += 1
            continue

        u, v = (a, b) if a < b else (b, a)
        if (u, v) in seen:
            attempts += 1
            continue
        if deg[u] >= target_avg_degree or deg[v] >= target_avg_degree:
            attempts += 1
            continue

        seen.add((u, v))
        edges.append(Edge(a=u, b=v))
        deg[u] += 1
        deg[v] += 1
        attempts += 1

    return edges


def build_adj(n: int, edges: List[Edge]) -> List[List[int]]:
    adj = [[] for _ in range(n)]
    for e in edges:
        adj[e.a].append(e.b)
        adj[e.b].append(e.a)
    return adj
