import math
from typing import Dict, List, Tuple

from config import ISB_BOUNDS, METERS_PER_DEG_LAT, meters_per_deg_lng_at_lat


class SpatialGrid:
    def __init__(self, lat0: float, cell_size_m: float):
        self.lat0 = lat0
        self.cell_m = cell_size_m
        self.m_per_deg_lat = METERS_PER_DEG_LAT
        self.m_per_deg_lng = meters_per_deg_lng_at_lat(lat0)
        self.cells: Dict[Tuple[int, int], List[int]] = {}

    def _cell_of(self, lat: float, lng: float) -> Tuple[int, int]:
        x_m = (lng - ISB_BOUNDS["lng_min"]) * self.m_per_deg_lng
        y_m = (lat - ISB_BOUNDS["lat_min"]) * self.m_per_deg_lat
        cx = int(math.floor(x_m / self.cell_m))
        cy = int(math.floor(y_m / self.cell_m))
        return (cx, cy)

    def insert(self, node_idx: int, lat: float, lng: float) -> None:
        c = self._cell_of(lat, lng)
        self.cells.setdefault(c, []).append(node_idx)

    def neighbors_candidates(self, lat: float, lng: float) -> List[int]:
        cx, cy = self._cell_of(lat, lng)
        out: List[int] = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                out.extend(self.cells.get((cx + dx, cy + dy), []))
        return out


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
