# Forge Studio — Local Roblox Asset Concept Generator

## Abstract

Forge Studio is a local-first web application for designing and organizing original Roblox-inspired asset concepts. It combines configurable generation inputs, repeatable component and material suggestions, procedural SVG previews, a persistent SQLite library, and CMS-ready JSON exports. The README also outlines the standard Roblox asset pipeline: create or shape assets with DCC tools or Studio's Intersect/Union operations, export supported files, import them into Studio, and use Roblox Asset Generator (RAG) to scaffold scripts that reference and configure those assets. Forge supports concept development and metadata workflows; it does not create 3D model files or upload assets to Roblox.

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

## Intersect/Union: The standard asset pipeline

In most Roblox workflows, you create assets in a DCC (digital content creation) tool, export them in a common file format, and import them into Roblox Studio. See the [official Roblox overview](https://create.roblox.com/docs/en-us/art/overview-dcc).

🎨 **01 — Create in a DCC tool**  
Model, texture, or script your asset in a third-party tool such as Blender, Substance Painter, or Maya. For simple solid shapes, Roblox Studio's solid modeling tools can also combine or intersect parts using Union and Negate operations.

📦 **02 — Export as a common format**  
Export your asset as FBX, OBJ, or PNG—the file types Roblox Studio can import directly.

🚀 **03 — Import into Studio**  
Use Roblox Studio's Asset Manager or the Import 3D dialog to bring your asset into the experience.

⚡ **04 — Apply with RAG**  
Use Roblox Asset Generator to scaffold the Lua scripts that reference and configure your imported assets.

This describes a standard asset-creation workflow. Forge itself generates original concept previews and metadata; it does not create 3D model files or scaffold Roblox Lua scripts.

## Content management

Open **http://127.0.0.1:8000/cms.html** while the local server is running to use the CMS workspace. It uses the same local SQLite library as the generator and supports:

- Searching and filtering saved records by workflow status and asset class.
- Creating and editing concept metadata, including title, description, tags, and status (draft, in review, approved, or archived).
- Deleting records and exporting an individual record or a JSON collection.
- Importing a CMS collection or individual CMS JSON records.

The CMS is a local, single-user content organizer, not a hosted service; the local server does not provide user authentication or multi-user access controls. CMS workflow status does not mean an asset has been uploaded to or approved by Roblox.

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
