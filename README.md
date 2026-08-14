# Concordance

A worldbuilding tool. This repo is the first proof of concept: a 3D globe viewer. If the planet does not look compelling on spin and zoom, there is no product yet.

Later, Concordance is meant to hold hyperlinked articles about a world, pinned onto the globe. Users will authenticate and keep multiple **universes**, each with one or more **worlds**. See [ROADMAP.md](ROADMAP.md).

## Run

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173). Drag to orbit, scroll to zoom.

```bash
npm run build   # production bundle
npm run lint    # oxlint
```

## What this POC does

- Procedural planet from a **seed + params** (the mesh is never stored)
- Height-displaced land on streaming cube-sphere tiles, ocean at sea level, inland seas above it, fresnel atmosphere, homosphere clouds
- Biomes from Minecraft 1.18-style climate: continentalness, erosion, weirdness, temperature, humidity
- Continents and mountain belts from tectonic plates (seed + params; no stored mesh)
- Land shading from biome, slope, and elevation (beaches, rock, snow)
- Harder directional light, valley darkening, and a baked normal cubemap so mountains read as relief instead of vertex paint
- Fragment-rate biomes, noisy coasts, bump, a worker-baked albedo cubemap, and worker tile LOD so coasts stay sharp when you zoom
- **View** menu: spin/orbit axes, even lighting, daylight, climate overlays, view presets, wind and currents
- **Randomiser** menu: tilt, oceans, mountains, continents, roughness, climate, inland seas, flattening, resolution, seed, compare
- Named peaks, basins, islands, and lakes are auto-pinned with atlas labels; click the globe to add your own
- Height-field drainages, valley-hugging clouds, and denser forest on humid flats
- Equirectangular minimap strip; click it to look at that longitude
- Split view to compare two seeds with the same sliders
- Article editor with `[[wiki links]]`; the world and articles persist in the browser

## Worldgen

Climate is 3D simplex noise sampled on the unit sphere (plus latitude for temperature), so poles do not pinch. Plates decide continents and the big mountain belts; noise still adds hills, basins, and climate (humidity, erosion, temperature) everywhere else.

A world is fully defined by `GlobeParams` in [`src/data/types.ts`](src/data/types.ts). Change the seed (or use the Randomiser) to rebuild the globe.

## Data model

```
User → Universe[] → World[] → GlobeParams
                 ↘ Article[] (optional pin: world + lat/lon)
```

Articles are wiki pages with optional globe pins. The POC stores one world plus articles in `localStorage`. Auth and a multi-universe UI are still ahead.

## Layout

```
src/
  globe/       canvas, terrain, ocean, atmosphere, clouds, axes
  worldgen/    noise, plates, climate, height, biomes, water, features, rivers, flow, minimap, tiles
  shaders/     terrain, ocean, atmosphere, clouds
  data/        types, sample world, randomiser, wiki, persistence
  ui/          View, Randomiser, article dock, minimap
```

## Out of scope

Auth, multi-universe UI, full planetary clipmap / disk streaming.
