export const terrainVertexShader = /* glsl */ `
attribute float elevation;
attribute float temperature;
attribute vec3 aClimate;
attribute float aLake;

uniform float uSeed;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vRadial;
varying vec3 vLocal;
varying float vElevation;
varying float vTemperature;
varying vec3 vClimate;
varying float vLake;

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

  vec3 radial = normalize(position);
  float land = step(0.0008, elevation) * (1.0 - aLake);
  float micro = (hash13(radial * 48.0 + uSeed) - 0.5) * 0.00072;
  micro += (hash13(radial * 140.0 - uSeed) - 0.5) * 0.00022;
  vec3 pos = position + radial * micro * land;

  vLocal = radial;
  vRadial = normalize(mat3(modelMatrix) * radial);
  vNormal = normalize(mat3(modelMatrix) * normal);
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
uniform float uInlandSeas;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vRadial;
varying vec3 vLocal;
varying float vElevation;
varying float vTemperature;
varying vec3 vClimate;
varying float vLake;

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

vec3 pickBiomeColor(float cont, float humidity, float erosion, float height, float t) {
  if (cont < -0.19 || height <= 0.0) {
    if (t < -0.5) return srgb(0.78, 0.86, 0.9);
    if (t < -0.18) return srgb(0.12, 0.28, 0.42);
    if (t > 0.45) return srgb(0.08, 0.48, 0.62);
    return srgb(0.08, 0.32, 0.58);
  }
  if (height > 0.0 && cont < -0.135) {
    if (erosion < -0.4) return srgb(0.45, 0.44, 0.4);
    if (t < -0.28) return srgb(0.89, 0.87, 0.82);
    return srgb(0.91, 0.82, 0.62);
  }
  bool isPeak = erosion < -0.35 && height > 0.03;
  bool isHighland = erosion < -0.08 && cont > -0.02 && height > 0.018;
  if (isPeak) {
    if (t < -0.22) return srgb(0.94, 0.96, 0.97);
    return srgb(0.58, 0.56, 0.52);
  }
  if (isHighland) {
    if (t < -0.42) return srgb(0.82, 0.86, 0.88);
    if (t < -0.12) return srgb(0.24, 0.42, 0.28);
    if (erosion < -0.3 && humidity < 0.0) return srgb(0.52, 0.55, 0.42);
    return srgb(0.46, 0.66, 0.32);
  }
  if (t > 0.32) {
    if (humidity < -0.08) return srgb(0.86, 0.74, 0.45);
    if (humidity < 0.08) return srgb(0.74, 0.68, 0.32);
    return srgb(0.1, 0.36, 0.16);
  }
  if (t > 0.0) {
    if (humidity > 0.22 && erosion > 0.05 && height < 0.05) return srgb(0.3, 0.36, 0.18);
    if (humidity > 0.02) return srgb(0.18, 0.46, 0.22);
    if (humidity < -0.18) return srgb(0.86, 0.74, 0.45);
    return srgb(0.48, 0.68, 0.28);
  }
  if (t > -0.32) {
    if (humidity > 0.0) return srgb(0.22, 0.36, 0.28);
    return srgb(0.48, 0.68, 0.28);
  }
  if (t > -0.52) {
    return humidity > -0.12 ? srgb(0.22, 0.36, 0.28) : srgb(0.9, 0.93, 0.95);
  }
  return srgb(0.9, 0.93, 0.95);
}

void main() {
  vec3 radial = normalize(vRadial);
  float dist = length(cameraPosition - vWorldPos);
  float close = 1.0 - smoothstep(0.22, 1.65, dist);
  float mid = 1.0 - smoothstep(0.7, 2.6, dist);

  float coastN =
    (vnoise(radial * 72.0 + uSeed) - 0.5) * 0.0012 +
    (vnoise(radial * 240.0 - uSeed) - 0.5) * 0.00038 * mid;
  float elevN = vElevation + coastN;
  if (elevN <= 0.0 && uOverlay < 0.5) discard;

  vec3 N = normalize(vNormal);
  vec3 dPdx = dFdx(vWorldPos);
  vec3 dPdy = dFdy(vWorldPos);
  vec3 geoN = normalize(cross(dPdx, dPdy));
  if (dot(geoN, N) < 0.0) geoN = -geoN;
  N = normalize(mix(N, geoN, 0.32));

  float slope = 1.0 - clamp(dot(N, radial), 0.0, 1.0);

  float height = vElevation / max(uHeightScale, 1.0e-5);
  vec3 local = normalize(vLocal);

  float nLo = fbm(radial * mix(22.0, 52.0, close) + uSeed, close);
  float nMid = fbm(radial * mix(55.0, 130.0, close) - uSeed, close);
  float nHi = fbm(radial * mix(110.0, 260.0, close) + uSeed * 1.31, 1.0);
  vec3 warp = vec3(nLo, nMid, nHi) - 0.5;
  float warpAmp = mix(0.038, 0.11, close);
  float cont = vClimate.x + warp.x * warpAmp * 0.5;
  float hum = vClimate.y + warp.y * warpAmp * 1.15;
  float ero = vClimate.z + warp.z * warpAmp * 0.6;
  float temp = vTemperature + warp.x * warpAmp * 0.7 + warp.z * warpAmp * 0.22;

  vec3 colA = pickBiomeColor(cont, hum, ero, height, temp);
  vec3 colB = pickBiomeColor(
    cont + warp.y * 0.06,
    hum + warp.z * 0.09,
    ero + warp.x * 0.045,
    height,
    temp + warp.y * 0.055
  );
  float dither = smoothstep(0.26, 0.74, nHi * 0.62 + nMid * 0.38);
  vec3 col = mix(colA, colB, dither * mix(0.42, 0.78, close));

  if (uHasMaps > 0.5 && uOverlay < 0.5) {
    vec3 w1 = warp * mix(0.0036, 0.012, close);
    vec4 baked = textureCube(uMaps, normalize(local + w1));
    if (baked.a > 0.502) {
      vec3 b0 = srgb(baked.r, baked.g, baked.b);
      vec4 baked2 = textureCube(
        uMaps,
        normalize(local + vec3(w1.y, w1.z, -w1.x) * 1.45)
      );
      vec3 b1 = srgb(baked2.r, baked2.g, baked2.b);
      float edge = clamp(length(b0 - b1) * 3.6 + length(b0 - colA) * 1.5, 0.0, 1.0);
      vec3 noisy = mix(b0, mix(col, b1, dither), nMid);
      col = mix(b0, noisy, edge);
    }
  }
  col = mix(col, srgb(0.12, 0.42, 0.48), smoothstep(0.25, 0.75, vLake));
  col *= 1.0 + (nLo - 0.5) * mix(0.05, 0.14, close);

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

  float bumpFreq = mix(22.0, 96.0, close);
  vec3 bp = radial * bumpFreq + uSeed;
  float eps = 0.035;
  vec3 grad = vec3(
    vnoise(bp + vec3(eps, 0.0, 0.0)) - vnoise(bp - vec3(eps, 0.0, 0.0)),
    vnoise(bp + vec3(0.0, eps, 0.0)) - vnoise(bp - vec3(0.0, eps, 0.0)),
    vnoise(bp + vec3(0.0, 0.0, eps)) - vnoise(bp - vec3(0.0, 0.0, eps))
  );
  float dry = smoothstep(0.05, -0.2, vClimate.y);
  float bumpAmp = mix(0.1, 0.55, close) * (0.35 + slope * 1.4 + dry * 0.5);
  bumpAmp *= 1.0 - fresh * 0.92;
  N = normalize(N + (grad - radial * dot(grad, radial)) * bumpAmp);
  N = normalize(mix(N, radial, fresh * 0.62));

  slope = 1.0 - clamp(dot(N, radial), 0.0, 1.0);

  float rockMix = smoothstep(0.12, 0.42, slope) * (1.0 - fresh);
  col = mix(col, uRockColor, rockMix * 0.92);

  float beach = (1.0 - smoothstep(0.0, 0.0035, elevN)) * (1.0 - rockMix);
  beach *= smoothstep(-0.22, 0.08, vTemperature) * (1.0 - fresh);
  col = mix(col, uSandColor, beach);

  float foam = (1.0 - smoothstep(0.0, 0.0016, elevN)) * (1.0 - rockMix);
  foam *= smoothstep(-0.15, 0.2, vTemperature) * (1.0 - fresh * 0.5);
  col = mix(col, vec3(0.82, 0.9, 0.92), foam * 0.45);

  float snowTemp = smoothstep(0.08, -0.28, vTemperature);
  float snowHeight = smoothstep(0.02, 0.04, vElevation);
  float snowSlope = 1.0 - smoothstep(0.38, 0.72, slope);
  float snow = max(snowTemp * snowHeight, snowTemp * 0.35 * smoothstep(0.008, 0.03, vElevation));
  snow *= 1.0 - fresh * (1.0 - frozen);
  col = mix(col, uSnowColor, clamp(snow * snowSlope, 0.0, 1.0) * 0.9);

  float grain = fbm(vWorldPos * mix(40.0, 180.0, close) + uSeed, close);
  col *= 0.93 + grain * mix(0.08, 0.16, close) * (1.0 - fresh * 0.65);

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
  float wrap = mix(ndl * 0.55 + 0.45, 1.0, uFill);
  float ambient = mix(0.18, 0.38, uFill);
  vec3 lit = col * (ambient + wrap * 0.88);

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

void main() {
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

varying vec3 vNormal;
varying vec3 vWorldPos;

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
