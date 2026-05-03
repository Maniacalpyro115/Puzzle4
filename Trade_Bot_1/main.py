import base64
import os
import subprocess
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from pydantic import BaseModel

from db import (
    get_config,
    get_latest_balance_snapshot,
    get_recent_balance_snapshots,
    get_recent_decisions,
    get_recent_orders,
    get_recent_samples,
    init_db,
    insert_balance_snapshot,
    update_config,
    utc_now_iso,
)


load_dotenv()

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "test123")
KEY_ID = os.getenv("KALSHI_KEY_ID")
PRIVATE_KEY_PATH = os.getenv("KALSHI_PRIVATE_KEY_PATH", "kalshi_private_key.pem")

BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"
BALANCE_PATH = "/trade-api/v2/portfolio/balance"

app = FastAPI()
init_db()

app.mount("/static", StaticFiles(directory="static"), name="static")

TRADER_PROCESS = None


class StrategyConfigUpdate(BaseModel):
    enabled: bool | None = None
    dry_run: bool | None = None
    min_seconds_left: float | None = None
    max_seconds_left: float | None = None
    bid_range_min: float | None = None
    bid_range_max: float | None = None
    contracts_to_buy: int | None = None
    max_trades_per_market: int | None = None


def require_admin(x_admin_password: str | None):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")


def trader_is_running():
    global TRADER_PROCESS

    if TRADER_PROCESS is None:
        return False

    return TRADER_PROCESS.poll() is None


def load_private_key(path):
    with open(path, "rb") as f:
        key_data = f.read()

    key_data = key_data.replace(b"\\n", b"\n")

    return serialization.load_pem_private_key(
        key_data,
        password=None
    )


def make_auth_headers(method, path):
    if not KEY_ID:
        raise RuntimeError("Missing KALSHI_KEY_ID in .env")

    private_key = load_private_key(PRIVATE_KEY_PATH)
    timestamp_ms = str(int(time.time() * 1000))
    message = f"{timestamp_ms}{method.upper()}{path}".encode("utf-8")

    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )

    return {
        "KALSHI-ACCESS-KEY": KEY_ID,
        "KALSHI-ACCESS-TIMESTAMP": timestamp_ms,
        "KALSHI-ACCESS-SIGNATURE": base64.b64encode(signature).decode("utf-8"),
        "Content-Type": "application/json",
    }


def fetch_kalshi_balance():
    headers = make_auth_headers("GET", BALANCE_PATH)

    r = requests.get(
        f"{BASE_URL}/portfolio/balance",
        headers=headers,
        timeout=20,
    )
    r.raise_for_status()

    data = r.json()

    balance_cents = data.get("balance")
    portfolio_value_cents = data.get("portfolio_value")

    row = {
        "pulled_at_utc": utc_now_iso(),
        "balance_cents": balance_cents,
        "portfolio_value_cents": portfolio_value_cents,
        "balance_dollars": None if balance_cents is None else balance_cents / 100,
        "portfolio_value_dollars": None if portfolio_value_cents is None else portfolio_value_cents / 100,
        "updated_ts": data.get("updated_ts"),
        "raw_json": data,
    }

    insert_balance_snapshot(row)

    return row


@app.get("/")
def home():
    return FileResponse(Path("static") / "index.html")


@app.get("/api/config")
def api_get_config():
    return get_config()


@app.post("/api/config")
def api_update_config(
    body: StrategyConfigUpdate,
    x_admin_password: str | None = Header(default=None),
):
    require_admin(x_admin_password)

    data = body.model_dump(exclude_unset=True)

    if "enabled" in data and data["enabled"] is not None:
        data["enabled"] = int(data["enabled"])

    if "dry_run" in data and data["dry_run"] is not None:
        data["dry_run"] = int(data["dry_run"])

    update_config(data)

    return get_config()


@app.get("/api/samples")
def api_samples(limit: int = 200):
    return get_recent_samples(limit)


@app.get("/api/decisions")
def api_decisions(limit: int = 100):
    return get_recent_decisions(limit)


@app.get("/api/orders")
def api_orders(limit: int = 100):
    return get_recent_orders(limit)


@app.get("/api/balance/latest")
def api_balance_latest():
    return get_latest_balance_snapshot()


@app.get("/api/balance/history")
def api_balance_history(limit: int = 200):
    return get_recent_balance_snapshots(limit)


@app.post("/api/balance/snapshot")
def api_balance_snapshot(x_admin_password: str | None = Header(default=None)):
    require_admin(x_admin_password)

    try:
        return fetch_kalshi_balance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))


@app.get("/api/trader/status")
def api_trader_status():
    global TRADER_PROCESS

    running = trader_is_running()

    return {
        "running": running,
        "pid": TRADER_PROCESS.pid if running else None,
    }


@app.post("/api/trader/start")
def api_start_trader(x_admin_password: str | None = Header(default=None)):
    global TRADER_PROCESS

    require_admin(x_admin_password)

    if trader_is_running():
        return {
            "running": True,
            "pid": TRADER_PROCESS.pid,
            "message": "Trader is already running.",
        }

    trader_path = Path("trader.py").resolve()

    if not trader_path.exists():
        raise HTTPException(status_code=500, detail="trader.py not found.")

    TRADER_PROCESS = subprocess.Popen(
        [sys.executable, str(trader_path)],
        cwd=str(Path(".").resolve()),
    )

    return {
        "running": True,
        "pid": TRADER_PROCESS.pid,
        "message": "Trader started.",
    }


@app.post("/api/trader/stop")
def api_stop_trader(x_admin_password: str | None = Header(default=None)):
    global TRADER_PROCESS

    require_admin(x_admin_password)

    if not trader_is_running():
        return {
            "running": False,
            "pid": None,
            "message": "Trader is not running.",
        }

    pid = TRADER_PROCESS.pid

    TRADER_PROCESS.terminate()

    try:
        TRADER_PROCESS.wait(timeout=10)
    except subprocess.TimeoutExpired:
        TRADER_PROCESS.kill()
        TRADER_PROCESS.wait(timeout=5)

    TRADER_PROCESS = None

    return {
        "running": False,
        "pid": None,
        "message": f"Trader stopped. Previous PID: {pid}",
    }