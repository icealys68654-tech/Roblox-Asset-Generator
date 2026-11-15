# Documentation Service — Project Abstract

Forge Studio is a local-first Roblox-inspired asset concept generator. Its optional documentation snapshot utility complements the existing generator by retrieving a bounded, read-only text snapshot of two explicitly approved public Roblox Creator documentation pages:

- [Roblox Engine API reference](https://create.roblox.com/docs/reference/engine)
- [Third-party creation software overview](https://create.roblox.com/docs/en-us/art/overview-dcc)

## Scope and safeguards

The utility is documentation ingestion only. It does not automatically rewrite application code, infer or apply API migrations, crawl arbitrary links, execute page scripts, upload assets, or push Git commits. Requests are restricted to the configured HTTPS Roblox docs host and documentation paths; response bodies and extracted text are bounded; and snapshots are written atomically to a user data directory outside the repository by default.

Run the service and its unit tests from the repository root:

```bash
python3 docs_service.py
python3 -m unittest -v test_docs_service.py
```

To snapshot just the engine reference:

```bash
python3 docs_service.py --source engine --output /tmp/roblox-engine-docs.json
```

The snapshot is not an authoritative API schema or a code-upgrade mechanism. Review documentation and any proposed code changes manually. Keep the existing root `README.md` as the application overview; this file is a focused README supplement for the documentation service.

## Validation and release status

A CI workflow is not yet confirmed as present or green. Run the tests locally and verify GitHub Actions on a pull request before treating the work as release-ready. A passing test suite does not by itself establish deployment readiness, production security, or correctness of changes derived from external documentation.
