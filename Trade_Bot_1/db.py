import json
import sqlite3
from datetime import datetime, timezone


DB_PATH = "kalshi_bot.sqlite"


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def table_columns(cur, table_name):
    return {
        row["name"]
        for row in cur.execute(f"PRAGMA table_info({table_name})").fetchall()
    }


def add_column_if_missing(cur, table_name, column_name, alter_sql):
    if column_name not in table_columns(cur, table_name):
        cur.execute(alter_sql)


def init_db():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS strategy_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL DEFAULT 0,
        dry_run INTEGER NOT NULL DEFAULT 1,
        min_seconds_left REAL NOT NULL DEFAULT 0,
        max_seconds_left REAL NOT NULL DEFAULT 300,
        bid_range_min REAL NOT NULL DEFAULT 0.95,
        bid_range_max REAL NOT NULL DEFAULT 0.99,
        contracts_to_buy INTEGER NOT NULL DEFAULT 1,
        max_trades_per_market INTEGER NOT NULL DEFAULT 1,
        updated_at_utc TEXT NOT NULL
    )
    """)

    add_column_if_missing(
        cur,
        "strategy_config",
        "bid_range_min",
        "ALTER TABLE strategy_config ADD COLUMN bid_range_min REAL NOT NULL DEFAULT 0.95"
    )

    add_column_if_missing(
        cur,
        "strategy_config",
        "bid_range_max",
        "ALTER TABLE strategy_config ADD COLUMN bid_range_max REAL NOT NULL DEFAULT 0.99"
    )

    add_column_if_missing(
        cur,
        "strategy_config",
        "contracts_to_buy",
        "ALTER TABLE strategy_config ADD COLUMN contracts_to_buy INTEGER NOT NULL DEFAULT 1"
    )

    add_column_if_missing(
        cur,
        "strategy_config",
        "max_trades_per_market",
        "ALTER TABLE strategy_config ADD COLUMN max_trades_per_market INTEGER NOT NULL DEFAULT 1"
    )

    cur.execute("""
    INSERT OR IGNORE INTO strategy_config (
        id,
        enabled,
        dry_run,
        min_seconds_left,
        max_seconds_left,
        bid_range_min,
        bid_range_max,
        contracts_to_buy,
        max_trades_per_market,
        updated_at_utc
    )
    VALUES (
        1,
        0,
        1,
        0,
        300,
        0.95,
        0.99,
        1,
        1,
        ?
    )
    """, (utc_now_iso(),))

    cur.execute("""
    CREATE TABLE IF NOT EXISTS sampled_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sampled_at_utc TEXT NOT NULL,
        market_ticker TEXT NOT NULL,
        seconds_until_market_close REAL,
        yes_bid REAL,
        no_bid REAL,
        chosen_side TEXT,
        chosen_bid REAL,
        trigger_met INTEGER NOT NULL DEFAULT 0,
        trigger_reason TEXT
    )
    """)

    add_column_if_missing(
        cur,
        "sampled_values",
        "chosen_side",
        "ALTER TABLE sampled_values ADD COLUMN chosen_side TEXT"
    )

    add_column_if_missing(
        cur,
        "sampled_values",
        "chosen_bid",
        "ALTER TABLE sampled_values ADD COLUMN chosen_bid REAL"
    )

    add_column_if_missing(
        cur,
        "sampled_values",
        "trigger_reason",
        "ALTER TABLE sampled_values ADD COLUMN trigger_reason TEXT"
    )

    cur.execute("""
    CREATE TABLE IF NOT EXISTS trade_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        decided_at_utc TEXT NOT NULL,
        market_ticker TEXT NOT NULL,
        seconds_until_market_close REAL,
        chosen_side TEXT,
        chosen_bid REAL,
        action TEXT NOT NULL,
        reason TEXT,
        yes_bid REAL,
        no_bid REAL,
        raw_json TEXT
    )
    """)

    add_column_if_missing(
        cur,
        "trade_decisions",
        "chosen_side",
        "ALTER TABLE trade_decisions ADD COLUMN chosen_side TEXT"
    )

    add_column_if_missing(
        cur,
        "trade_decisions",
        "chosen_bid",
        "ALTER TABLE trade_decisions ADD COLUMN chosen_bid REAL"
    )

    cur.execute("""
    CREATE TABLE IF NOT EXISTS executed_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordered_at_utc TEXT NOT NULL,
        market_ticker TEXT NOT NULL,
        chosen_side TEXT NOT NULL,
        chosen_bid REAL NOT NULL,
        contracts INTEGER NOT NULL,
        dry_run INTEGER NOT NULL,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        status_code INTEGER,
        response_json TEXT,
        error TEXT
    )
    """)

    add_column_if_missing(
        cur,
        "executed_orders",
        "attempt_number",
        "ALTER TABLE executed_orders ADD COLUMN attempt_number INTEGER NOT NULL DEFAULT 1"
    )

    cur.execute("""
    CREATE TABLE IF NOT EXISTS raw_ws_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        received_at_utc TEXT NOT NULL,
        market_ticker TEXT,
        type TEXT,
        sid TEXT,
        seq TEXT,
        raw_json TEXT NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS balance_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pulled_at_utc TEXT NOT NULL,
        balance_cents INTEGER,
        portfolio_value_cents INTEGER,
        balance_dollars REAL,
        portfolio_value_dollars REAL,
        updated_ts INTEGER,
        raw_json TEXT
    )
    """)

    conn.commit()
    conn.close()


def get_config():
    init_db()
    conn = get_conn()
    row = conn.execute("SELECT * FROM strategy_config WHERE id = 1").fetchone()
    conn.close()
    return dict(row)


def update_config(data):
    init_db()

    allowed = {
        "enabled",
        "dry_run",
        "min_seconds_left",
        "max_seconds_left",
        "bid_range_min",
        "bid_range_max",
        "contracts_to_buy",
        "max_trades_per_market",
    }

    updates = []
    values = []

    for key, value in data.items():
        if key in allowed:
            updates.append(f"{key} = ?")
            values.append(value)

    if not updates:
        return

    updates.append("updated_at_utc = ?")
    values.append(utc_now_iso())
    values.append(1)

    conn = get_conn()
    conn.execute(
        f"""
        UPDATE strategy_config
        SET {", ".join(updates)}
        WHERE id = ?
        """,
        values,
    )
    conn.commit()
    conn.close()


def insert_sample(row):
    init_db()
    conn = get_conn()
    conn.execute("""
    INSERT INTO sampled_values (
        sampled_at_utc,
        market_ticker,
        seconds_until_market_close,
        yes_bid,
        no_bid,
        chosen_side,
        chosen_bid,
        trigger_met,
        trigger_reason
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        row.get("sampled_at_utc"),
        row.get("market_ticker"),
        row.get("seconds_until_market_close"),
        row.get("yes_bid"),
        row.get("no_bid"),
        row.get("chosen_side"),
        row.get("chosen_bid"),
        int(bool(row.get("trigger_met"))),
        row.get("trigger_reason"),
    ))
    conn.commit()
    conn.close()


def insert_decision(row):
    init_db()
    conn = get_conn()
    conn.execute("""
    INSERT INTO trade_decisions (
        decided_at_utc,
        market_ticker,
        seconds_until_market_close,
        chosen_side,
        chosen_bid,
        action,
        reason,
        yes_bid,
        no_bid,
        raw_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        row.get("decided_at_utc"),
        row.get("market_ticker"),
        row.get("seconds_until_market_close"),
        row.get("chosen_side"),
        row.get("chosen_bid"),
        row.get("action"),
        row.get("reason"),
        row.get("yes_bid"),
        row.get("no_bid"),
        json.dumps(row),
    ))
    conn.commit()
    conn.close()


def insert_executed_order(row):
    init_db()
    conn = get_conn()
    conn.execute("""
    INSERT INTO executed_orders (
        ordered_at_utc,
        market_ticker,
        chosen_side,
        chosen_bid,
        contracts,
        dry_run,
        attempt_number,
        status_code,
        response_json,
        error
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        row.get("ordered_at_utc"),
        row.get("market_ticker"),
        row.get("chosen_side"),
        row.get("chosen_bid"),
        row.get("contracts"),
        int(bool(row.get("dry_run"))),
        row.get("attempt_number", 1),
        row.get("status_code"),
        json.dumps(row.get("response_json")),
        row.get("error"),
    ))
    conn.commit()
    conn.close()


def insert_raw_ws(row):
    init_db()
    conn = get_conn()
    conn.execute("""
    INSERT INTO raw_ws_messages (
        received_at_utc,
        market_ticker,
        type,
        sid,
        seq,
        raw_json
    )
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        row.get("received_at_utc"),
        row.get("market_ticker"),
        row.get("type"),
        row.get("sid"),
        row.get("seq"),
        row.get("raw_json"),
    ))
    conn.commit()
    conn.close()


def insert_balance_snapshot(row):
    init_db()
    conn = get_conn()
    conn.execute("""
    INSERT INTO balance_snapshots (
        pulled_at_utc,
        balance_cents,
        portfolio_value_cents,
        balance_dollars,
        portfolio_value_dollars,
        updated_ts,
        raw_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        row.get("pulled_at_utc"),
        row.get("balance_cents"),
        row.get("portfolio_value_cents"),
        row.get("balance_dollars"),
        row.get("portfolio_value_dollars"),
        row.get("updated_ts"),
        json.dumps(row.get("raw_json")),
    ))
    conn.commit()
    conn.close()


def get_recent_samples(limit=200):
    init_db()
    conn = get_conn()
    rows = conn.execute("""
    SELECT *
    FROM sampled_values
    ORDER BY id DESC
    LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows][::-1]


def get_recent_decisions(limit=100):
    init_db()
    conn = get_conn()
    rows = conn.execute("""
    SELECT *
    FROM trade_decisions
    ORDER BY id DESC
    LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_orders(limit=100):
    init_db()
    conn = get_conn()
    rows = conn.execute("""
    SELECT *
    FROM executed_orders
    ORDER BY id DESC
    LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_balance_snapshots(limit=200):
    init_db()
    conn = get_conn()
    rows = conn.execute("""
    SELECT *
    FROM balance_snapshots
    ORDER BY id DESC
    LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows][::-1]


def get_latest_balance_snapshot():
    init_db()
    conn = get_conn()
    row = conn.execute("""
    SELECT *
    FROM balance_snapshots
    ORDER BY id DESC
    LIMIT 1
    """).fetchone()
    conn.close()
    return dict(row) if row else None


def get_order_count_for_market(market_ticker, dry_run=None):
    init_db()
    conn = get_conn()

    if dry_run is None:
        row = conn.execute("""
        SELECT COUNT(*) AS cnt
        FROM executed_orders
        WHERE market_ticker = ?
        """, (market_ticker,)).fetchone()
    else:
        row = conn.execute("""
        SELECT COUNT(*) AS cnt
        FROM executed_orders
        WHERE market_ticker = ?
          AND dry_run = ?
        """, (market_ticker, int(bool(dry_run)))).fetchone()

    conn.close()
    return int(row["cnt"])


def cleanup_market_runtime_data(market_ticker):
    init_db()
    conn = get_conn()

    conn.execute(
        "DELETE FROM sampled_values WHERE market_ticker = ?",
        (market_ticker,),
    )

    conn.execute(
        "DELETE FROM raw_ws_messages WHERE market_ticker = ?",
        (market_ticker,),
    )

    conn.commit()
    conn.close()