export const terrainVertexShader = /* glsl */ `
attribute float elevation;
attribute float temperature;
attribute vec3 aClimate;
attribute float aLake;
attribute float aSkirt;

uniform float uSeed;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vRadial;
varying vec3 vLocal;
varying float vElevation;
varying float vTemperature;
varying vec3 vClimate;
varying float vLake;
varying float vSkirt;
varying vec3 vWorldX;
varying vec3 vWorldY;
varying vec3 vWorldZ;

float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vElevation = elevation;
  vTemperature = temperature;
  vClimate = aClimate;
  vLake = aLake;
  vSkirt = aSkirt;

  vec3 radial = normalize(position);
  float land = smoothstep(0.0004, 0.0022, elevation) * (1.0 - aLake);
  float micro = (hash13(radial * 48.0 + uSeed) - 0.5) * 0.00072;
  micro += (hash13(radial * 140.0 - uSeed) - 0.5) * 0.00022;
  vec3 pos = position + radial * micro * land;

  vLocal = radial;
  mat3 worldN = mat3(modelMatrix);
  vWorldX = worldN[0];
  vWorldY = worldN[1];
  vWorldZ = worldN[2];
  vRadial = normalize(worldN * radial);
  vNormal = normalize(worldN * normal);
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const terrainFragmentShader = /* glsl */ `
uniform vec3 uLightDir;
uniform vec3 uRockColor;
uniform vec3 uSandColor;
uniform vec3 uSnowColor;
uniform float uFill;
uniform float uOverlay;
uniform float uHeightScale;
uniform float uSeed;
uniform samplerCube uMaps;
uniform float uHasMaps;
uniform samplerCube uNormals;
uniform float uHasNormals;
uniform float uInlandSeas;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vRadial;
varying vec3 vLocal;
varying float vElevation;
varying float vTemperature;
varying vec3 vClimate;
varying float vLake;
varying float vSkirt;
varying vec3 vWorldX;
varying vec3 vWorldY;
varying vec3 vWorldZ;

float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

float fbm(vec3 p, float extra) {
  float a = 0.5 * vnoise(p);
  a += 0.25 * vnoise(p * 2.03);
  a += 0.125 * vnoise(p * 4.07);
  a += extra * 0.0625 * vnoise(p * 8.13);
  return a;
}

float riverBand(vec3 p, float sharp) {
  float d = abs(vnoise(p) - 0.5) * 2.0;
  return pow(clamp(1.0 - d, 0.0, 1.0), sharp);
}

vec3 srgb(float r, float g, float b) {
  vec3 c = vec3(r, g, b);
  vec3 lo = c / 12.92;
  vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(lo, hi, step(vec3(0.04045), c));
}

vec3 blendBiomeColor(float cont, float humidity, float erosion, float height, float t) {
  vec3 desert = srgb(0.86, 0.74, 0.45);
  vec3 savanna = srgb(0.74, 0.68, 0.32);
  vec3 jungle = srgb(0.1, 0.36, 0.16);
  vec3 plains = srgb(0.48, 0.68, 0.28);
  vec3 forest = srgb(0.18, 0.46, 0.22);
  vec3 swamp = srgb(0.3, 0.36, 0.18);
  vec3 taiga = srgb(0.22, 0.36, 0.28);
  vec3 snow = srgb(0.9, 0.93, 0.95);
  vec3 meadow = srgb(0.46, 0.66, 0.32);
  vec3 grove = srgb(0.24, 0.42, 0.28);
  vec3 slopes = srgb(0.82, 0.86, 0.88);
  vec3 wind = srgb(0.52, 0.55, 0.42);
  vec3 peak = srgb(0.58, 0.56, 0.52);
  vec3 icePeak = srgb(0.94, 0.96, 0.97);
  vec3 beach = srgb(0.91, 0.82, 0.62);
  vec3 snowBeach = srgb(0.89, 0.87, 0.82);
  vec3 stone = srgb(0.45, 0.44, 0.4);

  vec3 hot = mix(mix(desert, savanna, smoothstep(-0.16, 0.0, humidity)), jungle, smoothstep(-0.02, 0.18, humidity));
  vec3 warm = mix(desert, plains, smoothstep(-0.28, -0.08, humidity));
  warm = mix(warm, forest, smoothstep(-0.08, 0.12, humidity));
  float swampW = smoothstep(0.12, 0.28, humidity) * smoothstep(-0.02, 0.12, erosion) * (1.0 - smoothstep(0.035, 0.07, height));
  warm = mix(warm, swamp, swampW);
  vec3 cool = mix(plains, taiga, smoothstep(-0.08, 0.12, humidity));
  vec3 cold = mix(snow, taiga, smoothstep(-0.22, 0.0, humidity));

  vec3 low = mix(snow, cold, smoothstep(-0.62, -0.42, t));
  low = mix(low, cool, smoothstep(-0.42, -0.22, t));
  low = mix(low, warm, smoothstep(-0.22, 0.08, t));
  low = mix(low, hot, smoothstep(0.18, 0.42, t));

  vec3 highland = mix(meadow, grove, 1.0 - smoothstep(-0.22, -0.02, t));
  highland = mix(highland, slopes, 1.0 - smoothstep(-0.52, -0.28, t));
  float windW =
    (1.0 - smoothstep(-0.36, -0.18, erosion)) *
    (1.0 - smoothstep(-0.12, 0.05, humidity)) *
    smoothstep(-0.48, -0.28, t);
  highland = mix(highland, wind, windW);
  vec3 peakCol = mix(peak, icePeak, 1.0 - smoothstep(-0.36, -0.08, t));

  float highlandW =
    (1.0 - smoothstep(-0.14, -0.02, erosion)) *
    smoothstep(-0.06, 0.04, cont) *
    smoothstep(0.01, 0.024, height);
  float peakW = (1.0 - smoothstep(-0.42, -0.22, erosion)) * smoothstep(0.018, 0.038, height);
  float shoreW =
    (1.0 - smoothstep(0.0008, 0.016, height)) *
    (1.0 - smoothstep(-0.12, 0.1, cont));
  vec3 shore = mix(beach, snowBeach, 1.0 - smoothstep(-0.38, -0.18, t));
  shore = mix(shore, stone, 1.0 - smoothstep(-0.48, -0.32, erosion));

  vec3 col = mix(low, highland, highlandW);
  col = mix(col, peakCol, peakW);
  return mix(col, shore, shoreW);
}

void main() {
  vec3 radial = normalize(vRadial);
  float dist = length(cameraPosition - vWorldPos);
  float close = 1.0 - smoothstep(0.22, 1.65, dist);

  vec3 local = normalize(vLocal);
  float coastWarp =
    (vnoise(local * 6.2 + uSeed) - 0.5) * 0.0005 +
    (vnoise(local * 13.5 - uSeed) - 0.5) * 0.0002;
  float elevN = vElevation + coastWarp;
  float aa = max(fwidth(elevN), 0.00016);
  if (elevN < -aa * 2.8 && uOverlay < 0.5) discard;
  float landCover = smoothstep(-aa * 1.4, aa * 2.4, elevN);

  vec3 N = normalize(vNormal);
  vec3 dPdx = dFdx(vWorldPos);
  vec3 dPdy = dFdy(vWorldPos);
  vec3 geoN = normalize(cross(dPdx, dPdy));
  if (dot(geoN, N) < 0.0) geoN = -geoN;
  float snowHint = smoothstep(0.05, -0.28, vTemperature);
  float geoMix =
    mix(0.1, 0.2, uHasMaps) *
    landCover *
    (1.0 - vSkirt) *
    (1.0 - snowHint * 0.82) *
    mix(1.0, 0.22, uHasNormals);
  N = normalize(mix(N, geoN, geoMix));
  N = normalize(mix(N, radial, vSkirt + snowHint * 0.28 * (1.0 - uHasMaps)));
  if (uHasNormals > 0.5) {
    vec3 nLocal = textureCube(uNormals, local).xyz * 2.0 - 1.0;
    vec3 nBake = normalize(vWorldX * nLocal.x + vWorldY * nLocal.y + vWorldZ * nLocal.z);
    if (dot(nBake, radial) < 0.0) nBake = -nBake;
    N = normalize(mix(N, nBake, 0.8 * landCover * (1.0 - vSkirt)));
  }

  float slope = 1.0 - clamp(dot(N, radial), 0.0, 1.0);

  float height = vElevation / max(uHeightScale, 1.0e-5);

  float nLo = fbm(local * 16.0 + uSeed, 0.45);
  float nMid = fbm(local * 31.0 - uSeed, 0.45);
  float nHi = fbm(local * 48.0 + uSeed * 1.31, 0.3);
  float nPatch = fbm(local * 11.0 + uSeed * 2.05, 0.5);
  float nDune = fbm(local * 19.0 + 8.4, 0.5);
  vec3 warp = vec3(nLo, nMid, nHi) - 0.5;
  float warpAmp = mix(0.04, 0.12, close);
  float cont = vClimate.x + warp.x * warpAmp * 0.55;
  float hum = vClimate.y + warp.y * warpAmp * 1.45;
  float ero = vClimate.z + warp.z * warpAmp * 0.7;
  float temp = vTemperature + warp.x * warpAmp * 0.75 + warp.z * warpAmp * 0.28;

  vec3 colA = blendBiomeColor(cont, hum, ero, height, temp);
  vec3 colB = blendBiomeColor(
    cont + warp.y * 0.05,
    hum + warp.z * 0.09,
    ero + warp.x * 0.04,
    height,
    temp + warp.y * 0.045
  );
  float dither = smoothstep(0.18, 0.82, nMid * 0.65 + nPatch * 0.35);
  vec3 col = mix(colA, colB, dither * mix(0.18, 0.38, close));

  if (uHasMaps > 0.5 && uOverlay < 0.5) {
    vec3 w1 = warp * 0.007;
    vec4 baked = textureCube(uMaps, normalize(local + w1));
    if (baked.a > 0.45) {
      vec3 b0 = srgb(baked.r, baked.g, baked.b);
      vec4 baked2 = textureCube(
        uMaps,
        normalize(local + vec3(w1.y, w1.z, -w1.x) * 1.45)
      );
      vec3 b1 = srgb(baked2.r, baked2.g, baked2.b);
      vec3 bAvg = mix(b0, b1, 0.38);
      float edge = clamp(length(b0 - b1) * 2.2, 0.0, 1.0);
      vec3 noisy = mix(bAvg, col, mix(0.12, 0.38, nMid));
      float leak = mix(0.16, 0.4, close);
      float bakeW = smoothstep(0.5, 0.64, baked.a);
      col = mix(col, mix(bAvg, noisy, max(edge, leak)), bakeW);
    }
  }

  float sandAmt =
    smoothstep(0.04, 0.48, temp) *
    (1.0 - smoothstep(-0.38, 0.18, hum)) *
    smoothstep(0.0005, 0.003, elevN);
  float grassAmt =
    smoothstep(-0.42, 0.18, temp) *
    smoothstep(-0.42, 0.28, hum) *
    smoothstep(-0.17, 0.02, vClimate.x) *
    smoothstep(0.0005, 0.003, elevN);
  grassAmt *= 1.0 - sandAmt * 0.7;

  vec3 sandCol = mix(srgb(0.86, 0.74, 0.45), srgb(0.76, 0.54, 0.32), nDune);
  sandCol = mix(sandCol, srgb(0.93, 0.85, 0.66), smoothstep(0.25, 0.8, nMid));
  sandCol = mix(sandCol, srgb(0.6, 0.5, 0.36), smoothstep(0.55, 0.88, nPatch) * 0.45);
  vec3 grassCol = mix(srgb(0.48, 0.68, 0.28), srgb(0.18, 0.44, 0.18), nPatch);
  grassCol = mix(grassCol, srgb(0.58, 0.62, 0.28), (1.0 - smoothstep(-0.22, 0.05, hum)) * smoothstep(0.2, 0.75, nMid));
  grassCol = mix(grassCol, srgb(0.34, 0.3, 0.18), nHi * nHi * 0.28);

  col = mix(col, sandCol, sandAmt * mix(0.18, 0.42, close) * (0.4 + nDune * 0.6));
  col = mix(col, grassCol, grassAmt * mix(0.2, 0.48, close) * (0.38 + nPatch * 0.62));

  col = mix(col, srgb(0.12, 0.42, 0.48), smoothstep(0.25, 0.75, vLake));
  float lakeEdge = 4.0 * vLake * (1.0 - vLake);
  col = mix(col, sandCol, lakeEdge * 0.4);
  col *= 1.0 + (nLo - 0.5) * mix(0.04, 0.1, close);

  float landMask = smoothstep(0.0004, 0.003, elevN);
  float wet = smoothstep(-0.38, 0.08, vClimate.y);
  float valley = smoothstep(-0.55, 0.12, vClimate.z);
  float notPeak = 1.0 - smoothstep(0.1, 0.24, height);
  float inland = smoothstep(-0.18, 0.0, vClimate.x);
  float drain = landMask * wet * inland * notPeak * (1.0 - vLake);
  drain *= mix(0.4, 1.0, valley);
  drain *= 1.0 - smoothstep(0.18, 0.4, slope);

  vec3 flowP = local;
  float warpR = fbm(flowP * 3.6 + uSeed + 3.1, close) - 0.5;
  vec3 rp = flowP * 4.2 + vec3(warpR, -warpR, warpR * 0.7) * 0.85 + uSeed;
  float major = riverBand(rp, mix(5.5, 8.5, close));
  float minor = riverBand(flowP * 9.4 + vec3(warpR) * 1.6 - uSeed, mix(6.5, 10.0, close));
  float creek = riverBand(flowP * 18.5 + uSeed * 0.7, 11.0) * mix(0.15, 1.0, close);
  float rivers = max(major, max(minor * 0.85, creek * 0.55)) * drain;
  rivers = smoothstep(0.12, 0.42, rivers);

  float pondN = vnoise(flowP * mix(7.5, 13.0, close) + 19.4 + uSeed);
  float basin =
    landMask *
    wet *
    inland *
    notPeak *
    smoothstep(-0.2, 0.15, vClimate.z);
  float ponds =
    smoothstep(0.58, 0.74, pondN) * basin * mix(0.45, 1.0, uInlandSeas);
  ponds = smoothstep(0.2, 0.65, ponds);
  float fresh = clamp(max(rivers, ponds * 0.9), 0.0, 1.0);
  vec3 waterCol = mix(srgb(0.1, 0.38, 0.44), srgb(0.05, 0.2, 0.3), clamp(rivers * 1.3, 0.0, 1.0));
  waterCol = mix(waterCol, srgb(0.12, 0.4, 0.42), ponds * (1.0 - rivers));
  float frozen = smoothstep(-0.18, -0.42, vTemperature);
  waterCol = mix(waterCol, srgb(0.72, 0.84, 0.9), frozen);
  if (uOverlay < 0.5) {
    col = mix(col, waterCol, fresh);
  }

  vec3 bp = local * 28.0 + uSeed;
  float eps = 0.035;
  vec3 grad = vec3(
    vnoise(bp + vec3(eps, 0.0, 0.0)) - vnoise(bp - vec3(eps, 0.0, 0.0)),
    vnoise(bp + vec3(0.0, eps, 0.0)) - vnoise(bp - vec3(0.0, eps, 0.0)),
    vnoise(bp + vec3(0.0, 0.0, eps)) - vnoise(bp - vec3(0.0, 0.0, eps))
  );
  float dry = smoothstep(0.05, -0.2, vClimate.y);
  float bumpAmp = mix(0.14, 0.72, close) * (0.28 + slope * 1.85 + dry * 0.45);
  bumpAmp *= 1.0 - fresh * 0.92;
  bumpAmp *= mix(0.15, 1.0, landCover);
  bumpAmp *= 1.0 - vSkirt;
  bumpAmp *= mix(1.0, 0.55, snowHint);
  N = normalize(N + (grad - radial * dot(grad, radial)) * bumpAmp);
  N = normalize(mix(N, radial, fresh * 0.62));

  slope = 1.0 - clamp(dot(N, radial), 0.0, 1.0);

  float rockMix =
    smoothstep(0.05, 0.26, slope) *
    (1.0 - fresh) *
    landCover *
    (1.0 - vSkirt) *
    mix(0.72, 1.0, 1.0 - smoothstep(-0.08, 0.22, vClimate.z));
  col = mix(col, uRockColor, rockMix * 0.96);

  vec3 wetSand = mix(srgb(0.62, 0.52, 0.38), sandCol, 0.55);
  vec3 drySand = mix(sandCol, srgb(0.91, 0.82, 0.62), 0.35);
  float beach = (1.0 - smoothstep(0.0004, 0.0085, elevN)) * (1.0 - rockMix);
  beach *= smoothstep(-0.28, 0.12, vTemperature) * (1.0 - fresh);
  col = mix(col, mix(wetSand, drySand, smoothstep(0.0006, 0.005, elevN)), beach * 0.92);

  float foam = (1.0 - smoothstep(0.0, 0.0028, elevN)) * (1.0 - rockMix);
  foam *= smoothstep(-0.15, 0.2, vTemperature) * (1.0 - fresh * 0.5);
  foam *= landCover * mix(0.35, 1.0, 1.0 - landCover);
  col = mix(col, vec3(0.82, 0.9, 0.92), foam * 0.4);

  vec3 shoreWater = mix(srgb(0.12, 0.42, 0.55), srgb(0.18, 0.5, 0.58), 0.35);
  shoreWater = mix(shoreWater, srgb(0.72, 0.84, 0.9), frozen);
  if (uOverlay < 0.5) {
    col = mix(shoreWater, col, landCover);
  }

  float snowTemp = smoothstep(0.08, -0.28, vTemperature);
  float snowHeight = smoothstep(0.02, 0.04, vElevation);
  float snowSlope = 1.0 - smoothstep(0.38, 0.72, slope);
  float snow = max(snowTemp * snowHeight, snowTemp * 0.35 * smoothstep(0.008, 0.03, vElevation));
  snow *= 1.0 - fresh * (1.0 - frozen);
  col = mix(col, uSnowColor, clamp(snow * snowSlope, 0.0, 1.0) * 0.9);

  float grain = fbm(local * 42.0 + uSeed, 0.3);
  col *= 0.95 + grain * mix(0.05, 0.14, close) * (1.0 - fresh * 0.65);

  float valleyAO =
    landCover *
    (1.0 - vSkirt) *
    (1.0 - vLake) *
    (1.0 - fresh) *
    smoothstep(-0.2, 0.4, vClimate.z) *
    (1.0 - smoothstep(0.07, 0.2, height));
  valleyAO = valleyAO * 0.48 + pow(clamp(slope, 0.0, 1.0), 1.55) * 0.28 * landCover * (1.0 - vSkirt);
  float ao = 1.0 - clamp(valleyAO, 0.0, 0.65);
  vec3 Lpre = normalize(uLightDir);
  float sunHit = clamp(dot(N, Lpre), 0.0, 1.0);
  col = mix(
    col,
    col * vec3(1.12, 1.16, 0.8),
    sunHit * (1.0 - rockMix) * (1.0 - snow) * landCover * 0.38
  );
  col *= mix(0.72, 1.0, ao);

  float t = clamp(vTemperature * 0.5 + 0.5, 0.0, 1.0);
  vec3 tempCol = mix(vec3(0.12, 0.28, 0.85), vec3(0.95, 0.95, 0.98), smoothstep(0.0, 0.5, t));
  tempCol = mix(tempCol, vec3(0.92, 0.28, 0.18), smoothstep(0.5, 1.0, t));
  float h = clamp(vClimate.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 humCol = mix(vec3(0.72, 0.55, 0.22), vec3(0.18, 0.55, 0.42), smoothstep(0.0, 0.55, h));
  humCol = mix(humCol, vec3(0.15, 0.38, 0.82), smoothstep(0.55, 1.0, h));
  float c = clamp(vClimate.x * 0.5 + 0.5, 0.0, 1.0);
  vec3 contCol = mix(vec3(0.05, 0.12, 0.38), vec3(0.2, 0.55, 0.72), smoothstep(0.0, 0.42, c));
  contCol = mix(contCol, vec3(0.42, 0.62, 0.28), smoothstep(0.42, 0.7, c));
  contCol = mix(contCol, vec3(0.55, 0.42, 0.28), smoothstep(0.7, 1.0, c));
  float e = clamp(vClimate.z * 0.5 + 0.5, 0.0, 1.0);
  vec3 eroCol = mix(vec3(0.82, 0.84, 0.88), vec3(0.55, 0.38, 0.22), e);

  if (uOverlay > 0.5 && uOverlay < 1.5) col = tempCol;
  else if (uOverlay > 1.5 && uOverlay < 2.5) col = humCol;
  else if (uOverlay > 2.5 && uOverlay < 3.5) col = contCol;
  else if (uOverlay > 3.5) col = eroCol;

  vec3 L = normalize(uLightDir);
  float ndl = dot(N, L);
  float hemi = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
  float diffuse = mix(pow(hemi, 1.9), 1.0, uFill);
  float ambient = mix(0.08, 0.38, uFill);
  vec3 lit = col * (ambient + diffuse * mix(1.08, 0.88, uFill));
  lit *= mix(mix(0.78, 1.0, ao), 1.0, uFill);

  float specMask = snow * 0.35 + rockMix * 0.08 + fresh * mix(0.22, 0.5, 1.0 - frozen);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 48.0) * specMask;
  lit += vec3(spec) * 0.25 * (1.0 - uFill);

  gl_FragColor = vec4(lit, 1.0);
}
`

export const oceanVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocal;

void main() {
  vLocal = normalize(position);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const oceanFragmentShader = /* glsl */ `
uniform vec3 uLightDir;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform float uFill;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocal;

float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

vec3 rollAround(vec3 p, vec3 axis, float a) {
  axis = normalize(axis);
  float c = cos(a);
  float s = sin(a);
  return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uLightDir);

  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 albedo = mix(uDeepColor, uShallowColor, fresnel * 0.65);

  float ndl = dot(N, L);
  float wrap = mix(ndl * 0.5 + 0.5, 1.0, uFill);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 80.0) * (1.0 - uFill);
  float spec2 = pow(max(dot(N, H), 0.0), 16.0) * (1.0 - uFill);

  vec3 lit = albedo * mix(0.16 + wrap * 0.85, 1.05, uFill);
  lit += vec3(0.85, 0.92, 1.0) * spec * 0.55;
  lit += uShallowColor * spec2 * 0.12;
  lit += uShallowColor * fresnel * 0.18;

  vec3 roll = rollAround(normalize(vLocal), vec3(0.18, 0.96, 0.22), uTime * 0.00522);
  roll = rollAround(roll, vec3(0.92, 0.12, 0.38), uTime * 0.00192);
  vec3 warp = roll + vec3(
    vnoise(roll * 3.1) - 0.5,
    vnoise(roll * 3.1 + 11.0) - 0.5,
    vnoise(roll * 3.1 + 19.0) - 0.5
  ) * 0.62;
  float ridgeA = abs(vnoise(warp * 9.2) - 0.5);
  float ridgeB = abs(vnoise(warp * 13.4 + 21.0) - 0.5);
  float snake = max(
    1.0 - smoothstep(0.018, 0.07, ridgeA),
    (1.0 - smoothstep(0.016, 0.055, ridgeB)) * 0.85
  );
  float holes = smoothstep(0.28, 0.52, vnoise(roll * 16.0 + 4.8));
  snake *= holes;

  vec3 grid = roll * 168.0;
  vec3 cell = floor(grid);
  float id = hash13(cell);
  float disc = 1.0 - smoothstep(0.04, 0.13, length(fract(grid) - 0.5));
  float cycle = mix(0.35, 1.4, hash13(cell + vec3(2.1, 0.4, 8.8)));
  float duty = mix(0.2, 0.65, hash13(cell + vec3(0.7, 5.2, 1.3)));
  float blink = step(duty, fract(uTime / cycle + hash13(cell + 9.4)));
  float spark = pow(id, 5.0) * disc * blink;
  float facing = clamp(dot(N, V) * 0.35 + 0.65, 0.0, 1.0);
  float sunGlint = pow(max(dot(N, normalize(L + V)), 0.0), 14.0);
  float moonGlint = pow(max(dot(N, normalize(-L + V)), 0.0), 12.0);
  float bounce = facing * (0.45 + sunGlint + moonGlint * 0.85);
  float glitter = snake * spark * bounce;
  float dist = length(cameraPosition - vWorldPos);
  glitter *= 1.0 - smoothstep(0.58, 1.18, dist);
  lit += vec3(0.92, 0.97, 1.0) * glitter * 5.2;

  gl_FragColor = vec4(lit, 1.0);
}
`

export const atmosphereVertexShader = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const atmosphereFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform vec3 uLightDir;
uniform float uFill;

varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - abs(dot(N, V)), 2.8);
  float sun = clamp(dot(N, normalize(uLightDir)) * 0.5 + 0.5, 0.25, 1.0);
  sun = mix(sun, 1.0, uFill);
  float alpha = fresnel * uIntensity * sun;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
`

export const cloudVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vObjectPos;

void main() {
  vObjectPos = position;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const cloudFragmentShader = /* glsl */ `
uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uOffset;
uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform float uCoverage;
uniform float uSoftness;
uniform float uOpacity;
uniform float uStretch;
uniform float uWarp;
uniform float uFill;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vObjectPos;

float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(
      mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec3(0.17, 0.31, 0.11);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vObjectPos);
  float t = uTime * uSpeed;
  float cs = cos(t);
  float sn = sin(t);
  vec3 drifted = vec3(
    cs * dir.x + sn * dir.z,
    dir.y * uStretch,
    -sn * dir.x + cs * dir.z
  );

  vec3 p = drifted * uScale + uOffset;
  float n = fbm(p);
  n = fbm(p + n * uWarp);

  float lat = abs(dir.y);
  float tropic = smoothstep(0.92, 0.22, lat);
  float itcz = exp(-dir.y * dir.y * 28.0) * 0.18;
  float coverage = mix(0.72, uCoverage, tropic) - itcz;

  float cloud = smoothstep(coverage, coverage + uSoftness, n);

  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = max(dot(N, V), 0.0);
  cloud *= 0.7 + 0.3 * ndv;

  if (cloud < 0.012) discard;

  vec3 L = normalize(uLightDir);
  float ndl = dot(N, L);
  float wrap = ndl * 0.4 + 0.6;
  vec3 day = uColor * (0.42 + wrap * 0.7);
  vec3 night = uColor * 0.58;
  float terminator = smoothstep(-0.35, 0.25, ndl);
  vec3 lit = mix(night, day, terminator);
  lit = mix(lit, uColor * 0.95, uFill);

  gl_FragColor = vec4(lit, cloud * uOpacity);
}
`

export const precipVertexShader = /* glsl */ `
attribute float aPhase;
attribute float aSpeed;
attribute float aKind;
attribute float aIntensity;

uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform vec3 uLightDir;
uniform float uFill;

varying float vKind;
varying float vIntensity;
varying float vFade;
varying float vSun;
varying vec2 vFallDir;

void main() {
  vec3 dir = normalize(position);
  float cycle = fract(aPhase + uTime * aSpeed);
  float h = mix(uOuter, uInner, cycle);

  float wobble = aKind * 0.006;
  vec3 pos = dir * h;
  pos += vec3(
    sin(uTime * 1.7 + aPhase * 6.28) * wobble,
    0.0,
    cos(uTime * 1.4 + aPhase * 5.1) * wobble
  );

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vec4 mvFall = modelViewMatrix * vec4(pos - dir * 0.025, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec4 clipFall = projectionMatrix * mvFall;
  vec2 screen = clip.xy / max(clip.w, 0.0001);
  vec2 screenFall = clipFall.xy / max(clipFall.w, 0.0001);
  vec2 fall = screenFall - screen;
  vFallDir = length(fall) > 0.00001 ? normalize(fall) : vec2(0.0, -1.0);

  vec3 worldDir = normalize((modelMatrix * vec4(dir, 0.0)).xyz);
  vKind = aKind;
  vIntensity = aIntensity;
  vFade = smoothstep(0.0, 0.1, cycle) * (1.0 - smoothstep(0.84, 1.0, cycle));
  vSun = mix(
    clamp(dot(worldDir, normalize(uLightDir)) * 0.45 + 0.55, 0.28, 1.0),
    1.0,
    uFill
  );

  gl_Position = clip;
  float dist = max(length(mv.xyz), 0.2);
  float size = mix(30.0, 13.0, aKind) * (0.75 / dist);
  size *= 0.7 + 0.5 * aIntensity;
  gl_PointSize = clamp(size, 2.0, 42.0);
}
`

export const precipFragmentShader = /* glsl */ `
uniform vec3 uRainColor;
uniform vec3 uSnowColor;

varying float vKind;
varying float vIntensity;
varying float vFade;
varying float vSun;
varying vec2 vFallDir;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  uv.y = -uv.y;

  vec2 along = normalize(vFallDir);
  vec2 across = vec2(-along.y, along.x);
  float u = dot(uv, across);
  float v = dot(uv, along);

  float rain = (1.0 - smoothstep(0.03, 0.1, abs(u))) * (1.0 - smoothstep(0.28, 0.5, abs(v)));
  float flake = 1.0 - smoothstep(0.12, 0.42, length(uv));
  float shape = mix(rain, flake, vKind);
  if (shape < 0.02) discard;

  vec3 col = mix(uRainColor, uSnowColor, vKind);
  float alpha = shape * vFade * mix(0.22, 0.55, vKind) * vIntensity * vSun;
  gl_FragColor = vec4(col, alpha);
}
`
