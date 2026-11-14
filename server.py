#!/usr/bin/env python3
"""Forge Studio local web app with a SQLite-backed asset library."""
from __future__ import annotations

import json
import os
import re
import sqlite3
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("FORGE_DATA_DIR", ROOT / "data")).expanduser().resolve()
DB_PATH = DATA_DIR / "forge.sqlite3"
HOST = os.environ.get("FORGE_HOST", "127.0.0.1")
PORT = int(os.environ.get("FORGE_PORT", "8000"))
MAX_BODY = 1_000_000
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,100}$")


def connect_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    with connect_db() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            data_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS assets_updated_at_idx ON assets(updated_at DESC)")


def validate_asset(value: object) -> dict:
    if not isinstance(value, dict):
        raise ValueError("Asset payload must be a JSON object.")
    asset_id = value.get("id")
    name = value.get("name")
    if not isinstance(asset_id, str) or not ID_RE.fullmatch(asset_id):
        raise ValueError("Asset id must contain 1–100 letters, digits, underscores, or hyphens.")
    if not isinstance(name, str) or not name.strip() or len(name) > 160:
        raise ValueError("Asset name must be between 1 and 160 characters.")
    encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(encoded.encode("utf-8")) > MAX_BODY:
        raise ValueError("Asset is too large to store.")
    return value


class ForgeHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("Invalid Content-Length.") from exc
        if length <= 0 or length > MAX_BODY:
            raise ValueError("Request body must be between 1 byte and 1 MB.")
        try:
            payload = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ValueError("Request body must contain valid JSON.") from exc
        if not isinstance(payload, dict):
            raise ValueError("Request body must be a JSON object.")
        return payload

    def _api_error(self, status: int, message: str):
        self._json(status, {"error": message})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            try:
                with connect_db() as conn:
                    count = conn.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
                return self._json(200, {"ok": True, "storage": "sqlite", "assets": count})
            except sqlite3.Error:
                return self._api_error(503, "SQLite database is unavailable.")
        if path == "/api/assets":
            try:
                with connect_db() as conn:
                    rows = conn.execute("SELECT data_json, created_at, updated_at FROM assets ORDER BY updated_at DESC").fetchall()
                assets = []
                for row in rows:
                    item = json.loads(row["data_json"])
                    item["_storage"] = {"createdAt": row["created_at"], "updatedAt": row["updated_at"]}
                    assets.append(item)
                return self._json(200, {"assets": assets, "count": len(assets)})
            except (sqlite3.Error, json.JSONDecodeError):
                return self._api_error(503, "Could not read the SQLite asset library.")
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/assets":
            return self._api_error(404, "API route not found.")
        try:
            asset = validate_asset(self._body())
            now = datetime.now(timezone.utc).isoformat()
            encoded = json.dumps(asset, ensure_ascii=False, separators=(",", ":"))
            with connect_db() as conn:
                existing = conn.execute("SELECT created_at FROM assets WHERE id=?", (asset["id"],)).fetchone()
                created_at = existing["created_at"] if existing else now
                conn.execute("""INSERT INTO assets(id,name,data_json,created_at,updated_at) VALUES(?,?,?,?,?)
                    ON CONFLICT(id) DO UPDATE SET name=excluded.name,data_json=excluded.data_json,updated_at=excluded.updated_at""",
                    (asset["id"], asset["name"].strip(), encoded, created_at, now))
            return self._json(201, {"asset": asset, "createdAt": created_at, "updatedAt": now})
        except ValueError as exc:
            return self._api_error(400, str(exc))
        except sqlite3.Error:
            return self._api_error(503, "Could not save to the SQLite database.")

    def do_DELETE(self):
        path = urlparse(self.path).path
        prefix = "/api/assets/"
        if not path.startswith(prefix):
            return self._api_error(404, "API route not found.")
        asset_id = unquote(path[len(prefix):])
        if not ID_RE.fullmatch(asset_id):
            return self._api_error(400, "Invalid asset id.")
        try:
            with connect_db() as conn:
                cursor = conn.execute("DELETE FROM assets WHERE id=?", (asset_id,))
            if cursor.rowcount == 0:
                return self._api_error(404, "Asset not found.")
            return self._json(200, {"deleted": True, "id": asset_id})
        except sqlite3.Error:
            return self._api_error(503, "Could not delete from the SQLite database.")

    def log_message(self, fmt, *args):
        # Avoid noisy logs for routine health polling; keep other local requests visible.
        if "/api/health" not in fmt:
            super().log_message(fmt, *args)


def main():
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), ForgeHandler)
    server.daemon_threads = True
    print(f"Forge Studio running at http://{HOST}:{PORT}")
    print(f"SQLite database: {DB_PATH}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Forge Studio…")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
