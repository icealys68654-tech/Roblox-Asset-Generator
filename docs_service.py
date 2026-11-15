#!/usr/bin/env python3
"""Fetch bounded, read-only snapshots of approved Roblox creator documentation.

This tool deliberately fetches only the two configured pages. It does not crawl
links, execute page scripts, alter application code, or push to GitHub.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import BinaryIO
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

SOURCES = {
    "engine": "https://create.roblox.com/docs/reference/engine",
    "dcc": "https://create.roblox.com/docs/en-us/art/overview-dcc",
}
ALLOWED_HOST = "create.roblox.com"
MAX_RESPONSE_BYTES = 2_000_000
MAX_TEXT_CHARS = 500_000
TIMEOUT_SECONDS = 15
USER_AGENT = "ForgeStudioDocsSnapshot/1.0 (+read-only; bounded requests)"


class DocsFetchError(Exception):
    """An expected validation or remote-fetch failure."""


class VisibleTextParser(HTMLParser):
    """Extract visible text without evaluating or retaining markup/scripts."""

    _HIDDEN = {"script", "style", "noscript", "svg", "template"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._hidden_depth = 0
        self._title_depth = 0
        self._parts: list[str] = []
        self._title: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in self._HIDDEN:
            self._hidden_depth += 1
        if tag == "title":
            self._title_depth += 1
        if tag in {"p", "br", "div", "li", "h1", "h2", "h3", "tr", "section"}:
            self._parts.append(" ")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in self._HIDDEN and self._hidden_depth:
            self._hidden_depth -= 1
        if tag == "title" and self._title_depth:
            self._title_depth -= 1
        if tag in {"p", "br", "div", "li", "h1", "h2", "h3", "tr", "section"}:
            self._parts.append(" ")

    def handle_data(self, data: str) -> None:
        if self._title_depth:
            self._title.append(data)
        if not self._hidden_depth:
            self._parts.append(data)

    @property
    def title(self) -> str:
        return " ".join(" ".join(self._title).split())[:500]

    @property
    def text(self) -> str:
        return " ".join(" ".join(self._parts).split())[:MAX_TEXT_CHARS]


class ApprovedRedirects(HTTPRedirectHandler):
    """Allow HTTPS redirects only within the approved Roblox docs host/path."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urlparse(newurl)
        if parsed.scheme != "https" or parsed.hostname != ALLOWED_HOST or not parsed.path.startswith("/docs/"):
            raise DocsFetchError("Documentation page redirected outside the approved Roblox docs host.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _validate_source(source_id: str) -> str:
    if source_id not in SOURCES:
        raise DocsFetchError("Unknown source. Select 'engine' or 'dcc'.")
    url = SOURCES[source_id]
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != ALLOWED_HOST or not parsed.path.startswith("/docs/"):
        raise DocsFetchError("Configured source failed the HTTPS host/path allowlist.")
    return url


def _read_bounded(stream: BinaryIO, limit: int = MAX_RESPONSE_BYTES) -> bytes:
    """Read at most limit+1 bytes to detect oversized responses safely."""
    data = stream.read(limit + 1)
    if len(data) > limit:
        raise DocsFetchError(f"Documentation response exceeds the {limit}-byte limit.")
    return data


def fetch_source(source_id: str) -> dict[str, str]:
    url = _validate_source(source_id)
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    opener = build_opener(ApprovedRedirects())
    try:
        with opener.open(request, timeout=TIMEOUT_SECONDS) as response:
            final = urlparse(response.geturl())
            if final.scheme != "https" or final.hostname != ALLOWED_HOST or not final.path.startswith("/docs/"):
                raise DocsFetchError("Final response URL failed the approved Roblox docs host/path check.")
            content_type = response.headers.get_content_type()
            if content_type != "text/html":
                raise DocsFetchError(f"Expected HTML from {source_id}; received {content_type}.")
            raw = _read_bounded(response)
            charset = response.headers.get_content_charset() or "utf-8"
    except (URLError, TimeoutError, OSError) as exc:
        raise DocsFetchError(f"Could not fetch {source_id}: {exc}") from exc

    try:
        html = raw.decode(charset, errors="replace")
    except LookupError as exc:
        raise DocsFetchError(f"Unsupported page character encoding: {charset}") from exc
    parser = VisibleTextParser()
    try:
        parser.feed(html)
        parser.close()
    except Exception as exc:
        raise DocsFetchError(f"Could not parse {source_id} documentation HTML: {exc}") from exc
    if not parser.text:
        raise DocsFetchError(f"The {source_id} page contained no extractable visible text.")
    return {
        "id": source_id,
        "url": url,
        "title": parser.title,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "text": parser.text,
    }


def default_output_path() -> Path:
    data_home = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return data_home / "forge-studio" / "roblox-docs.json"


def write_snapshot(output: Path, payload: dict) -> None:
    """Atomically write a snapshot so interrupted runs don't leave partial JSON."""
    output = output.expanduser()
    output.parent.mkdir(parents=True, exist_ok=True)
    temp_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=output.parent, delete=False) as handle:
            temp_name = handle.name
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, output)
    except OSError:
        if temp_name:
            try:
                os.unlink(temp_name)
            except OSError:
                pass
        raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=sorted(SOURCES), action="append",
                        help="Fetch only this approved source (repeatable; default: both).")
    parser.add_argument("--output", type=Path, default=default_output_path(),
                        help="Snapshot JSON destination (default is outside the repository).")
    args = parser.parse_args(argv)
    source_ids = args.source or list(SOURCES)
    records = []
    try:
        for index, source_id in enumerate(source_ids):
            if index:
                time.sleep(1.0)  # courteous pacing; only two fixed requests are possible
            records.append(fetch_source(source_id))
        payload = {
            "schema_version": "1.0.0",
            "record_type": "roblox_documentation_snapshot",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "sources": records,
        }
        write_snapshot(args.output, payload)
    except (DocsFetchError, OSError) as exc:
        print(f"Documentation snapshot failed: {exc}", file=sys.stderr)
        return 1
    print(f"Saved {len(records)} validated documentation page(s) to {args.output.expanduser()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
