import asyncio
import base64
import json
import os
import signal
import time
import uuid
from datetime import datetime, timezone

import requests
import websockets
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from dotenv import load_dotenv

from db import (
    cleanup_market_runtime_data,
    get_config,
    get_order_count_for_market,
    insert_decision,
    insert_executed_order,
    insert_raw_ws,
    insert_sample,
)


load_dotenv()

KEY_ID = os.getenv("KALSHI_KEY_ID")
PRIVATE_KEY_PATH = os.getenv("KALSHI_PRIVATE_KEY_PATH", "kalshi_private_key.pem")

BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"
WS_URL = "wss://api.elections.kalshi.com/trade-api/ws/v2"
WS_PATH = "/trade-api/ws/v2"
ORDER_PATH = "/trade-api/v2/portfolio/events/orders"

SERIES_TICKER = "KXBTC15M"

if not KEY_ID:
    raise RuntimeError("Missing KALSHI_KEY_ID in .env")


stop_requested = False


def request_stop(signum=None, frame=None):
    global stop_requested
    stop_requested = True
    print("\nStop requested. Saving and exiting...")


signal.signal(signal.SIGINT, request_stop)
signal.signal(signal.SIGTERM, request_stop)


def utc_now():
    return datetime.now(timezone.utc)


def utc_now_iso():
    return utc_now().isoformat()


def parse_dt(dt_text):
    if not dt_text:
        return None
    return datetime.fromisoformat(dt_text.replace("Z", "+00:00"))


def load_private_key(path):
    with open(path, "rb") as f:
        key_data = f.read()

    key_data = key_data.replace(b"\\n", b"\n")

    return serialization.load_pem_private_key(
        key_data,
        password=None
    )


def make_auth_headers(method, path):
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


def find_btc_15m_market():
    r = requests.get(
        f"{BASE_URL}/markets",
        params={
            "limit": 1000,
            "status": "open",
            "series_ticker": SERIES_TICKER,
        },
        timeout=20,
    )
    r.raise_for_status()

    markets = r.json().get("markets", [])

    if not markets:
        raise RuntimeError(f"No open {SERIES_TICKER} markets found.")

    markets = sorted(markets, key=lambda m: m.get("close_time") or "")
    chosen = markets[0]

    print(
        "\nUsing market:",
        chosen.get("ticker"),
        "| close_time:",
        chosen.get("close_time"),
    )

    return chosen


def book_from_levels(levels):
    book = {}

    for price, count in levels or []:
        book[float(price)] = float(count)

    return book


def best_bid(book):
    valid_prices = [price for price, count in book.items() if count > 0]
    return max(valid_prices) if valid_prices else None


def get_book_values(yes_book, no_book):
    return {
        "yes_bid": best_bid(yes_book),
        "no_bid": best_bid(no_book),
    }


def choose_side_in_bid_range(config, values):
    bid_min = config["bid_range_min"]
    bid_max = config["bid_range_max"]

    yes_bid = values.get("yes_bid")
    no_bid = values.get("no_bid")

    yes_ok = yes_bid is not None and bid_min <= yes_bid <= bid_max
    no_ok = no_bid is not None and bid_min <= no_bid <= bid_max

    if yes_ok and no_ok:
        if yes_bid >= no_bid:
            return "yes", yes_bid, "Both in range; chose YES because bid is higher"
        return "no", no_bid, "Both in range; chose NO because bid is higher"

    if yes_ok:
        return "yes", yes_bid, "YES bid in configured range"

    if no_ok:
        return "no", no_bid, "NO bid in configured range"

    return None, None, "Neither YES nor NO bid is in configured range"


def trigger_met(config, seconds_until_market_close, values):
    if not config["enabled"]:
        return False, None, None, "Trader disabled"

    if seconds_until_market_close is None:
        return False, None, None, "Missing close time"

    if seconds_until_market_close < config["min_seconds_left"]:
        return False, None, None, "Too close to market close"

    if seconds_until_market_close > config["max_seconds_left"]:
        return False, None, None, "Too early"

    chosen_side, chosen_bid, reason = choose_side_in_bid_range(config, values)

    if chosen_side:
        return True, chosen_side, chosen_bid, reason

    return False, None, None, reason


async def connect_ws(headers):
    try:
        return await websockets.connect(WS_URL, additional_headers=headers)
    except TypeError:
        return await websockets.connect(WS_URL, extra_headers=headers)


def log_decision(action, market_ticker, seconds_until_market_close, chosen_side, chosen_bid, reason, values):
    row = {
        "decided_at_utc": utc_now_iso(),
        "market_ticker": market_ticker,
        "seconds_until_market_close": seconds_until_market_close,
        "chosen_side": chosen_side,
        "chosen_bid": chosen_bid,
        "action": action,
        "reason": reason,
        **values,
    }

    insert_decision(row)
    print("DECISION:", row)


def make_order_payload(market_ticker, chosen_side, chosen_bid, contracts):
    """
    V2 endpoint quotes orders on one book.

    Buying YES:
      side = bid
      price = YES price

    Buying NO:
      equivalent to selling YES
      side = ask
      price = 1 - NO price
    """
    if chosen_side == "yes":
        order_side = "bid"
        order_price = chosen_bid
    elif chosen_side == "no":
        order_side = "ask"
        order_price = round(1.0 - chosen_bid, 4)
    else:
        raise ValueError(f"Invalid chosen_side: {chosen_side}")

    return {
        "ticker": market_ticker,
        "client_order_id": str(uuid.uuid4()),
        "side": order_side,
        "count": f"{contracts:.2f}",
        "price": f"{order_price:.4f}",
        "time_in_force": "fill_or_kill",
        "self_trade_prevention_type": "taker_at_cross",
        "cancel_order_on_pause": True,
    }


def place_order_v2(market_ticker, chosen_side, chosen_bid, contracts, attempt_number):
    payload = make_order_payload(
        market_ticker=market_ticker,
        chosen_side=chosen_side,
        chosen_bid=chosen_bid,
        contracts=contracts,
    )

    headers = make_auth_headers("POST", ORDER_PATH)

    response = requests.post(
        f"{BASE_URL}/portfolio/events/orders",
        headers=headers,
        json=payload,
        timeout=20,
    )

    try:
        response_json = response.json()
    except Exception:
        response_json = {"text": response.text}

    order_row = {
        "ordered_at_utc": utc_now_iso(),
        "market_ticker": market_ticker,
        "chosen_side": chosen_side,
        "chosen_bid": chosen_bid,
        "contracts": contracts,
        "dry_run": False,
        "attempt_number": attempt_number,
        "status_code": response.status_code,
        "response_json": response_json,
        "error": None if response.ok else response.text,
    }

    insert_executed_order(order_row)

    if not response.ok:
        raise RuntimeError(f"Order failed: {response.status_code} {response.text}")

    print("ORDER PLACED:", order_row)
    return response_json


def log_dry_run_order(market_ticker, chosen_side, chosen_bid, contracts):
    order_row = {
        "ordered_at_utc": utc_now_iso(),
        "market_ticker": market_ticker,
        "chosen_side": chosen_side,
        "chosen_bid": chosen_bid,
        "contracts": contracts,
        "dry_run": True,
        "attempt_number": 1,
        "status_code": None,
        "response_json": {
            "message": "Dry run only. No order sent to Kalshi."
        },
        "error": None,
    }

    insert_executed_order(order_row)
    print("DRY RUN ORDER:", order_row)


def should_block_for_trade_limit(config, market_ticker):
    current_count = get_order_count_for_market(
        market_ticker=market_ticker,
        dry_run=bool(config["dry_run"]),
    )

    return current_count >= int(config["max_trades_per_market"])


async def attempt_real_order_with_one_retry(
    market_ticker,
    config,
    seconds_until_market_close,
    chosen_side,
    chosen_bid,
    reason,
    values,
):
    contracts = int(config["contracts_to_buy"])

    log_decision(
        action="PLACING_REAL_ORDER_ATTEMPT_1",
        market_ticker=market_ticker,
        seconds_until_market_close=seconds_until_market_close,
        chosen_side=chosen_side,
        chosen_bid=chosen_bid,
        reason=reason,
        values=values,
    )

    try:
        place_order_v2(
            market_ticker=market_ticker,
            chosen_side=chosen_side,
            chosen_bid=chosen_bid,
            contracts=contracts,
            attempt_number=1,
        )
        return
    except Exception as e:
        print("First order attempt failed:", repr(e))

    await asyncio.sleep(1)

    fresh_config = get_config()
    fresh_values = values

    should_still_trigger, fresh_side, fresh_bid, fresh_reason = trigger_met(
        fresh_config,
        seconds_until_market_close,
        fresh_values,
    )

    if should_block_for_trade_limit(fresh_config, market_ticker):
        log_decision(
            action="RETRY_SKIPPED",
            market_ticker=market_ticker,
            seconds_until_market_close=seconds_until_market_close,
            chosen_side=fresh_side,
            chosen_bid=fresh_bid,
            reason="Retry skipped because trade limit was reached",
            values=fresh_values,
        )
        return

    if not should_still_trigger:
        log_decision(
            action="RETRY_SKIPPED",
            market_ticker=market_ticker,
            seconds_until_market_close=seconds_until_market_close,
            chosen_side=fresh_side,
            chosen_bid=fresh_bid,
            reason=f"Retry skipped because trigger no longer valid: {fresh_reason}",
            values=fresh_values,
        )
        return

    log_decision(
        action="PLACING_REAL_ORDER_ATTEMPT_2",
        market_ticker=market_ticker,
        seconds_until_market_close=seconds_until_market_close,
        chosen_side=fresh_side,
        chosen_bid=fresh_bid,
        reason="Retrying after first order attempt failed and trigger is still valid",
        values=fresh_values,
    )

    try:
        place_order_v2(
            market_ticker=market_ticker,
            chosen_side=fresh_side,
            chosen_bid=fresh_bid,
            contracts=int(fresh_config["contracts_to_buy"]),
            attempt_number=2,
        )
    except Exception as e:
        log_decision(
            action="REAL_ORDER_FAILED_AFTER_RETRY",
            market_ticker=market_ticker,
            seconds_until_market_close=seconds_until_market_close,
            chosen_side=fresh_side,
            chosen_bid=fresh_bid,
            reason=repr(e),
            values=fresh_values,
        )


async def run_trader_once_for_market(market):
    market_ticker = market["ticker"]
    market_close_time = parse_dt(market.get("close_time"))

    yes_book = {}
    no_book = {}

    headers = make_auth_headers("GET", WS_PATH)
    ws = await connect_ws(headers)

    async with ws:
        subscribe_msg = {
            "id": 1,
            "cmd": "subscribe",
            "params": {
                "channels": ["orderbook_delta", "trade"],
                "market_tickers": [market_ticker],
            },
        }

        await ws.send(json.dumps(subscribe_msg))

        next_sample_time = time.time()

        while not stop_requested:
            now = time.time()

            if now >= next_sample_time:
                config = get_config()
                current_utc = utc_now()
                values = get_book_values(yes_book, no_book)

                seconds_until_market_close = None
                if market_close_time:
                    seconds_until_market_close = round(
                        (market_close_time - current_utc).total_seconds(),
                        3
                    )

                should_trigger, chosen_side, chosen_bid, reason = trigger_met(
                    config,
                    seconds_until_market_close,
                    values,
                )

                if should_trigger and should_block_for_trade_limit(config, market_ticker):
                    should_trigger = False
                    reason = "Max trades per market reached"
                    chosen_side = None
                    chosen_bid = None

                sample_row = {
                    "sampled_at_utc": current_utc.isoformat(),
                    "market_ticker": market_ticker,
                    "seconds_until_market_close": seconds_until_market_close,
                    "yes_bid": values.get("yes_bid"),
                    "no_bid": values.get("no_bid"),
                    "chosen_side": chosen_side,
                    "chosen_bid": chosen_bid,
                    "trigger_met": should_trigger,
                    "trigger_reason": reason,
                }

                insert_sample(sample_row)
                print(sample_row)

                if should_trigger:
                    contracts = int(config["contracts_to_buy"])

                    if config["dry_run"]:
                        log_decision(
                            action="DRY_RUN_WOULD_BUY",
                            market_ticker=market_ticker,
                            seconds_until_market_close=seconds_until_market_close,
                            chosen_side=chosen_side,
                            chosen_bid=chosen_bid,
                            reason=reason,
                            values=values,
                        )
                        log_dry_run_order(
                            market_ticker=market_ticker,
                            chosen_side=chosen_side,
                            chosen_bid=chosen_bid,
                            contracts=contracts,
                        )
                    else:
                        await attempt_real_order_with_one_retry(
                            market_ticker=market_ticker,
                            config=config,
                            seconds_until_market_close=seconds_until_market_close,
                            chosen_side=chosen_side,
                            chosen_bid=chosen_bid,
                            reason=reason,
                            values=values,
                        )

                if seconds_until_market_close is not None and seconds_until_market_close <= 0:
                    print("Market closed. Cleaning up runtime data for market:", market_ticker)
                    cleanup_market_runtime_data(market_ticker)
                    print("Market runtime data cleaned. Moving to next market.")
                    return

                next_sample_time += 1

            timeout = max(0.01, min(0.25, next_sample_time - time.time()))

            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
            except asyncio.TimeoutError:
                continue

            data = json.loads(raw)
            msg = data.get("msg", {})
            msg_type = data.get("type")

            insert_raw_ws({
                "received_at_utc": utc_now_iso(),
                "type": msg_type,
                "sid": data.get("sid"),
                "seq": data.get("seq"),
                "market_ticker": msg.get("market_ticker"),
                "raw_json": json.dumps(data),
            })

            if msg_type == "orderbook_snapshot":
                yes_book = book_from_levels(msg.get("yes_dollars_fp"))
                no_book = book_from_levels(msg.get("no_dollars_fp"))

            elif msg_type == "orderbook_delta":
                side = msg.get("side")
                price = float(msg.get("price_dollars"))
                delta = float(msg.get("delta_fp"))

                book = yes_book if side == "yes" else no_book
                book[price] = book.get(price, 0.0) + delta

                if book[price] <= 0:
                    del book[price]


async def main_loop():
    while not stop_requested:
        try:
            market = find_btc_15m_market()
            await run_trader_once_for_market(market)
        except Exception as e:
            print("Trader error:", repr(e))
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main_loop())