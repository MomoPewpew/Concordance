# Concordance roadmap

Ideas from the globe POC. The goal is still the same: this has to feel like **a place you could write about**, not only a noise ball.

## Done

1. Climate overlays, pins, article stubs, seed, view presets, daylight playhead
2. Named features, minimap, wind/currents, compare two seeds
3. Non-spherical sea level — inland seas, polar flattening
4. Article editor — `[[wiki links]]`, persistence
5. Apparent resolution — pixel biomes, noisy coasts, bump, heightlets, distance octaves, baked cubemap
6. Streaming cube-sphere tiles — coarse globe immediately, worker refines nearby patches, skirts at LOD seams
7. Fresh water — valley rivers and small ponds in the terrain shader; inland seas still have a mesh

## Painted-terrain look

Runeterra-style relief is mostly **lighting a height field**, not a hand-painted JPEG. Stay procedural; shade like terrain.

### Now

1. Harder sunlight — less wrap, so ridges and the terminator have real shadow
2. Valley AO — darken eroded folds and steep crevices (planet-fixed, not screen-space)
3. Slope rock — expose rock on steep faces the way a painted map uses cliff grain
4. Baked normal cubemap — light from height, not from tile triangles

### Next

5. Sunlit vs fold color — yellow-green on lit grass, deeper green in shade
6. Micro grain / triplanar detail at continent zoom
7. Valley haze when looking across land
8. Extra ridged erosion in height when zoomed in

## Still out of scope

Auth, multi-universe UI, full planetary clipmap / disk streaming.
