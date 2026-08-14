# Concordance

A worldbuilding tool. This repo is the first proof of concept: a 3D globe viewer. If the planet does not look compelling on spin and zoom, there is no product yet.

Later, Concordance is meant to hold hyperlinked articles about a world, pinned onto the globe. Users will authenticate and keep multiple **universes**, each with one or more **worlds**. None of that is built here. The data types already assume it.

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
- Height-displaced land on a cube-sphere, ocean at a spherical sea level, fresnel atmosphere, homosphere clouds
- Biomes from Minecraft 1.18-style climate: continentalness, erosion, weirdness, temperature, humidity
- Land shading from biome, slope, and elevation (beaches, rock, snow)
- **View** menu: toggle the planet spin axis and the orbital axis (they split when the world has axial tilt)
- **Randomiser** menu: set tilt, oceans, mountains, continent size, roughness, climate variation, then generate a new seeded world

## Worldgen

Climate is 3D simplex noise sampled on the unit sphere (plus latitude for temperature), so poles do not pinch. Height is a simplified noise router: continentalness for land vs ocean, ridged peaks where erosion is low.

A world is fully defined by `GlobeParams` in [`src/data/types.ts`](src/data/types.ts). Change the seed (or use the Randomiser) to rebuild the globe.

## Data model (for later)

```
User → Universe[] → World[] → GlobeParams
                 ↘ Article[] (optional pin: world + lat/lon)
```

Articles, auth, persistence, and pinning are type-only. Default is one world per universe.

## Layout

```
src/
  globe/       canvas, terrain, ocean, atmosphere, clouds, axes
  worldgen/    noise, climate, height, biomes, mesh
  shaders/     terrain, ocean, atmosphere, clouds
  data/        types, sample world, randomiser mappings
  ui/          View and Randomiser menus
```

## Out of scope

Auth, article editor, hyperlinks, pins, multi-world UI, persistence, planetary LOD, non-spherical sea level.
