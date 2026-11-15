# Read-only Roblox documentation snapshots

`docs_service.py` fetches a bounded text snapshot of only these approved public
Roblox Creator documentation pages:

- Engine API reference: <https://create.roblox.com/docs/reference/engine>
- Third-party creation software overview: <https://create.roblox.com/docs/en-us/art/overview-dcc>

Run it with Python 3.9+:

```bash
python3 docs_service.py
python3 docs_service.py --source engine --output /tmp/roblox-engine-docs.json
python3 -m unittest -v test_docs_service.py
```

The default output is `~/.local/share/forge-studio/roblox-docs.json` (or under
`XDG_DATA_HOME` when set), outside the repository and outside the app's static
file root. Each run performs at most two HTTPS requests, uses a fixed source
allowlist, allows redirects only within the Roblox docs host and `/docs/` path,
uses a 15-second timeout and 2 MB response cap, and pauses between requests.
Only visible text and the page title are stored; scripts/styles are not executed
or retained. It does not follow page links, modify application code, upload
assets, or push commits.

Failures are reported with a non-zero exit status; incomplete fetches do not
replace the prior output. This is a documentation snapshot, not an authoritative
API schema or a code-upgrade mechanism. Review documentation and proposed code
changes manually before applying them.
