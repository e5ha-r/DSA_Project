import math

# states
STATE_S = 0
STATE_E = 1
STATE_I = 2
STATE_Q = 3
STATE_R = 4

STATE_NAME = {
    STATE_S: "S",
    STATE_E: "E",
    STATE_I: "I",
    STATE_Q: "Q",
    STATE_R: "R",
}

ISB_BOUNDS = {
    "lat_min": 33.55,
    "lat_max": 33.78,
    "lng_min": 72.95,
    "lng_max": 73.22,
}

DEFAULTS = {
    "incubation_days": 5,
    "infectious_days": 10,
    "quarantine_days": 10,
    "base_transmission": 0.09,
    "contacts_per_day": 8,
    "infection_radius_m": 25.0,
    "auto_quarantine_threshold_I": 150,   # now auto-lockdown threshold (kept key for compatibility)
    "policy_quarantine_strength": 0.65,   # now lockdown strength (kept key for compatibility)
    "test_isolate_rate": 0.08,
}

METERS_PER_DEG_LAT = 111_320.0


def meters_per_deg_lng_at_lat(lat: float) -> float:
    return 111_320.0 * math.cos(math.radians(lat))
