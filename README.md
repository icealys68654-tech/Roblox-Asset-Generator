# Forge — Roblox Asset Generator

A small, browser-based concept studio for generating original Roblox-inspired asset ideas. Forge provides a four-stage workflow, a procedural SVG concept preview, a browser-local saved library, and JSON exports with CMS-ready metadata.

## Run it

Open `index.html` in a modern browser, or serve this directory with any static web server. There is no build step or dependency installation.

## Four-stage workflow

1. **Input pool** — choose an asset class, style, color, complexity, asymmetry, and generation seed.
2. **Compute layer** — randomize a component set, proportions, and material.
3. **Linking / reasoning** — review how the components, material, and visual direction are combined. Optionally open a Roblox catalog search for related existing items.
4. **Execution layer** — review the concept preview and description, save the concept, or export the generated asset data as JSON.

Use the circular-arrow button to roll a fresh concept. Saved concepts live in this browser's `localStorage`; they are not uploaded or synced.

## Important distinction

Forge generates original **asset concepts and metadata**, represented by a stylized SVG preview. It does not produce a Roblox-ready 3D model, upload content, or return catalog items. The optional catalog action opens Roblox's catalog search in a separate tab and is distinct from original concept generation.

## JSON output

Single-asset exports include the generated design fields and a `metadata` object containing a title, asset class, style, color, material, component list, generation seed, generator identifier, format, and `robloxCatalogItem: false`. The library can also be exported as a JSON collection.

## Privacy

Saved assets are stored only in the current browser profile. Clearing browser storage removes them. No backend or account connection is used.
