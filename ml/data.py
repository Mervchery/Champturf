"""Loads Champ Turf's existing tables from Supabase and turns the text fields into numbers.
Nothing is invented: a value that can't be read stays NaN and the model treats it as missing."""
import os, re
import numpy as np
import pandas as pd
import requests
from config import NO_PRICE, ODDS_UNIT_OVERRIDE


def _load_env():
    for name in (".env.local", ".env"):
        path = os.path.join(os.path.dirname(__file__), "..", name)
        if os.path.exists(path):
            for line in open(path, encoding="utf-8"):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


class Supabase:
    def __init__(self):
        _load_env()
        self.url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        self.key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not self.url or not self.key:
            raise SystemExit("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (same as the scraper).")
        self.h = {"apikey": self.key, "Authorization": f"Bearer {self.key}"}

    def fetch(self, table, columns, page=1000):
        rows, start = [], 0
        while True:
            # ordered by id so paging is stable; Range pages through PostgREST's row limit
            r = requests.get(f"{self.url}/rest/v1/{table}?select={columns}&order=id.asc",
                             headers={**self.h, "Range-Unit": "items", "Range": f"{start}-{start + page - 1}"}, timeout=60)
            r.raise_for_status()
            chunk = r.json()
            rows += chunk
            if len(chunk) < page:
                return pd.DataFrame(rows)
            start += page

    def upsert(self, table, records, on_conflict, chunk=500):
        for i in range(0, len(records), chunk):
            r = requests.post(f"{self.url}/rest/v1/{table}?on_conflict={on_conflict}", json=records[i:i + chunk],
                              headers={**self.h, "Content-Type": "application/json",
                                       "Prefer": "resolution=merge-duplicates,return=minimal"}, timeout=60)
            if not r.ok:
                raise RuntimeError(f"{table} upsert failed: {r.status_code} {r.text[:300]}")

    def delete_where(self, table, column, values, chunk=100):
        for i in range(0, len(values), chunk):
            ids = ",".join(values[i:i + chunk])
            r = requests.delete(f"{self.url}/rest/v1/{table}?{column}=in.({ids})", headers=self.h, timeout=60)
            if not r.ok:
                raise RuntimeError(f"{table} delete failed: {r.status_code} {r.text[:300]}")


# ---------- field parsers ----------
def parse_distance_m(s):
    m = re.search(r"(\d[\d,.\s]*)", str(s or ""))
    if not m:
        return np.nan
    v = float(re.sub(r"[^\d.]", "", m.group(1)) or "nan")
    return v if 600 <= v <= 4000 else np.nan


def parse_class_num(s):
    m = re.search(r"(\d{1,3})", str(s or ""))
    return float(m.group(1)) if m else np.nan


_MARGIN_WORDS = {"dh": 0.0, "nse": 0.05, "nose": 0.05, "sh": 0.1, "shd": 0.1, "hd": 0.2, "head": 0.2, "nk": 0.3, "neck": 0.3,
                 "dist": 30.0, "distance": 30.0}


def parse_margin_len(s, position=None):
    """Beaten margin in lengths. The winner is 0. Anything that can't be read is NaN (never guessed)."""
    if position == 1:
        return 0.0
    t = str(s or "").strip().lower().replace("l", "").replace("½", ".5").replace("¼", ".25").replace("¾", ".75").strip()
    if not t or t in {"-", "—", "n/a"}:
        return np.nan
    if t in _MARGIN_WORDS:
        return _MARGIN_WORDS[t]
    m = re.fullmatch(r"(\d+)?\s*(\d+)/(\d+)", t)
    if m:
        return float(m.group(1) or 0) + float(m.group(2)) / float(m.group(3))
    try:
        return float(t)
    except ValueError:
        return np.nan


def raw_price(s):
    """Tote price as a float, or NaN for blanks and the 9999 'no price' placeholder."""
    try:
        v = float(str(s).replace(",", "."))
    except (TypeError, ValueError):
        return np.nan
    return v if 0 < v < NO_PRICE else np.nan


def detect_odds_unit(win_prices_by_race):
    """Raw tote prices -> decimal returns needs a unit (590 -> 5.90 means unit 100). Rather than assume it,
    pick the unit that makes a race's implied probabilities add up to a believable 1.0-1.6 (the tote's margin)."""
    if ODDS_UNIT_OVERRIDE:
        return ODDS_UNIT_OVERRIDE, {}
    # only races where EVERY runner has a real price — a missing price would understate the total
    sums = np.array([np.sum(1.0 / np.asarray(p, float)) for p in win_prices_by_race if len(p) >= 4 and not np.isnan(p).any()])
    if len(sums) < 20:
        return None, {"reason": f"only {len(sums)} races with full prices"}
    diag = {}
    for unit in (1.0, 10.0, 100.0, 1000.0):
        med = float(np.median(sums * unit))
        diag[unit] = round(med, 3)
        if 1.0 <= med <= 1.6:
            return unit, diag
    return None, diag


def load_tables(db):
    races = db.fetch("races", "id,name,race_date,race_time,distance,race_class,prize,status")
    results = db.fetch("race_results", "race_id,horse_id,position,jockey_id,trainer_id,weight_kg,gate,margin,rating,win_odds,is_tipped")
    entries = db.fetch("race_entries", "race_id,horse_id,jockey_id,trainer_id,weight_kg,gate,rating,odds,odds_open,odds_prev,is_tipped")
    if races.empty:
        return races, results, entries
    races["dt"] = pd.to_datetime(races["race_date"].astype(str) + " " + races["race_time"].astype(str).str.slice(0, 8), errors="coerce")
    races["distance_m"] = races["distance"].map(parse_distance_m)
    races["class_num"] = races["race_class"].map(parse_class_num) if "race_class" in races else np.nan
    races["prize"] = pd.to_numeric(races["prize"], errors="coerce")
    return races.dropna(subset=["dt"]), results, entries
