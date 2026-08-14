export const terrainVertexShader = /* glsl */ `
attribute float elevation;
attribute float temperature;
attribute vec3 biomeColor;

varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vWorldPos;
varying vec3 vRadial;
varying float vElevation;
varying float vTemperature;

void main() {
  vColor = biomeColor;
  vElevation = elevation;
  vTemperature = temperature;
  vec3 radial = normalize(position);
  vRadial = normalize(mat3(modelMatrix) * radial);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const terrainFragmentShader = /* glsl */ `
uniform vec3 uLightDir;
uniform vec3 uRockColor;
uniform vec3 uSandColor;
uniform vec3 uSnowColor;

varying vec3 vNormal;
varying vec3 vColor;
varying vec3 vWorldPos;
varying vec3 vRadial;
varying float vElevation;
varying float vTemperature;

float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  if (vElevation <= 0.0) discard;

  vec3 N = normalize(vNormal);
  vec3 radial = normalize(vRadial);
  float slope = 1.0 - clamp(dot(N, radial), 0.0, 1.0);

  vec3 col = vColor;

  float rockMix = smoothstep(0.12, 0.42, slope);
  col = mix(col, uRockColor, rockMix * 0.92);

  float beach = (1.0 - smoothstep(0.0, 0.0035, vElevation)) * (1.0 - rockMix);
  beach *= smoothstep(-0.22, 0.08, vTemperature);
  col = mix(col, uSandColor, beach);

  float snowTemp = smoothstep(0.08, -0.28, vTemperature);
  float snowHeight = smoothstep(0.02, 0.04, vElevation);
  float snowSlope = 1.0 - smoothstep(0.38, 0.72, slope);
  float snow = max(snowTemp * snowHeight, snowTemp * 0.35 * smoothstep(0.008, 0.03, vElevation));
  col = mix(col, uSnowColor, clamp(snow * snowSlope, 0.0, 1.0) * 0.9);

  float grain = hash13(vWorldPos * 90.0);
  col *= 0.955 + grain * 0.09;

  vec3 L = normalize(uLightDir);
  float ndl = dot(N, L);
  float wrap = ndl * 0.55 + 0.45;
  float ambient = 0.18;
  vec3 lit = col * (ambient + wrap * 0.88);

  float specMask = snow * 0.35 + rockMix * 0.08;
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 48.0) * specMask;
  lit += vec3(spec) * 0.25;

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

varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uLightDir);

  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 albedo = mix(uDeepColor, uShallowColor, fresnel * 0.65);

  float ndl = dot(N, L);
  float wrap = ndl * 0.5 + 0.5;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 80.0);
  float spec2 = pow(max(dot(N, H), 0.0), 16.0);

  vec3 lit = albedo * (0.16 + wrap * 0.85);
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

varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - abs(dot(N, V)), 2.8);
  float sun = clamp(dot(N, normalize(uLightDir)) * 0.5 + 0.5, 0.25, 1.0);
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
  vSun = clamp(dot(worldDir, normalize(uLightDir)) * 0.45 + 0.55, 0.28, 1.0);

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
