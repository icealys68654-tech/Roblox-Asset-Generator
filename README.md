# Forge Studio — Local Roblox Asset Concept Generator

Forge is a local-first web app for creating original Roblox-inspired asset concepts. It combines a four-stage generator, richer procedural SVG previews, category templates, a SQLite-backed saved library, and CMS-oriented JSON exports.

## Run locally

Requirements: Python 3.9+ (standard library only; SQLite is included with Python).

```bash
python3 server.py
```

Open **http://127.0.0.1:8000** in your browser. The app creates `data/forge.sqlite3` on first run. Stop the server with Ctrl+C. To use a different local port or database directory:

```bash
FORGE_PORT=8080 FORGE_DATA_DIR="$HOME/.forge-studio" python3 server.py
```

The server binds to `127.0.0.1` by default, so it is only accessible from your computer. It does not need an internet connection for app or database operation; Google Fonts are an optional visual enhancement.

## Workflow

1. **Input pool** — choose a category template, asset class, style, color, complexity, asymmetry, and seed.
2. **Compute layer** — generate a repeatable component set and proportions from the seed, plus a compatible material.
3. **Linking / reasoning** — inspect how the components, material, and style fit together. Optionally open a separate Roblox catalog search for existing listings.
4. **Execution layer** — review the concept description and save the record to SQLite or export CMS JSON.

Templates include Pocket companion, Arcane artifact, Retro gadget, Organic bloom, Modular structure, and Wearable token. The live preview is a layered procedural SVG with shaded geometry; it is an illustration of a concept, not a 3D model.

## Persistence and API

Saved concepts are stored in `data/forge.sqlite3`, not browser storage. The library survives browser restarts and app restarts. Back up this file to preserve the local collection.

The local server exposes:

- `GET /api/health` — database status and saved record count.
- `GET /api/assets` — saved concept records.
- `POST /api/assets` — create or update an asset (JSON body).
- `DELETE /api/assets/{id}` — delete a saved concept.

The standard-library server validates JSON payloads and limits request bodies to 1 MB. Keep the server bound to localhost; it is a personal local app and does not provide user authentication or multi-user access controls.

## CMS export

Single asset exports and library bundles use schema version `1.0.0`, with structured title/slug/description, taxonomy and tags, visual properties, generation parameters, moderation draft state, and platform/upload disclaimers. The export explicitly marks `roblox_catalog_item` and `model_file_included` as false. Adapt the schema to your CMS before importing it.

## Important distinction

Forge generates original **concept previews and metadata only**. It does not generate Roblox-ready 3D model files, upload assets, or claim ownership of Roblox catalog content. The optional catalog lookup only opens a search for existing catalog items and is distinct from original concept generation.
