# Concordance roadmap

Ideas from the globe POC. The goal is still the same: this has to feel like **a place you could write about**, not only a noise ball.

## Done

1. Climate overlays, pins, article stubs, seed, view presets, daylight playhead
2. Named features, minimap, wind/currents, compare two seeds
3. Non-spherical sea level — inland seas, polar flattening
4. Article editor — `[[wiki links]]`, persistence

## Apparent resolution

The **mesh** cannot go much denser on the main thread (320 is already ~1.2M tris). The **climate field** is continuous and can be sampled per pixel. These tricks make the globe look sharper without a denser heightmap.

### Now

1. **Pixel biomes** — rebuild tint in the fragment from interpolated climate, not vertex colors.
2. **Noisy coasts** — fragment discard with extra noise so the waterline is not the triangle edge.
3. **Procedural normals** — bump lighting with close-up noise.
4. **GPU heightlets** — tiny vertex displacement.
5. **Distance octaves** — more noise when zoomed in.
6. **Baked cubemap** — 512² climate albedo + height per cube face, in a worker. Mesh stays 320.

### Later (real geometry)

7. Worker / tessellation / streaming LOD — actual mesh density. Still out of scope.

## Still out of scope

Auth, multi-universe UI, streaming planetary LOD.
