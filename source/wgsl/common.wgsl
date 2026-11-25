// Comum às famílias de geometria: utilitários + bindings globais do grupo 0.
#include util
@group(0) @binding(0) var<uniform> F: Frame;
@group(0) @binding(1) var sLin: sampler;     // trilinear, repeat, anisotrópico
@group(0) @binding(2) var sClamp: sampler;   // linear, clamp
@group(0) @binding(3) var tNoise: texture_2d<f32>;   // ruído ladrilhável 512²: R,G = fbm de valor (2 sementes), B = celular, A = ruído branco
@group(0) @binding(4) var tNoise3: texture_3d<f32>;  // ruído 3D 64³ ladrilhável: R = fbm perlin, G = worley fbm, B = worley fino, A = perlin fino
@group(0) @binding(5) var tHeight: texture_2d<f32>;  // altura do terreno (m), 1 m/texel em volta do circuito
@group(0) @binding(6) var tZone: texture_2d<f32>;    // zonas (ver 11_worldmap.js)
// mapas do mundo: F.wm = (x0, z0, tamanhoX, tamanhoZ) em metros
fn wmIn(xz: vec2f) -> bool { let p = xz - F.wm.xy; return p.x >= 0.0 && p.y >= 0.0 && p.x <= F.wm.z && p.y <= F.wm.w; }
// Interpolação explícita permite alturas r32float também em GPUs móveis sem float32-filterable.
fn wmHeight(xz: vec2f) -> f32 {
#ifdef HEIGHT_MANUAL
  let size = vec2i(textureDimensions(tHeight));
  let p = clamp(xz - F.wm.xy, vec2f(0.0), vec2f(size - vec2i(1)));
  let a = vec2i(floor(p)); let b = min(a + vec2i(1), size - vec2i(1)); let f = fract(p);
  let low = mix(textureLoad(tHeight, a, 0).r, textureLoad(tHeight, vec2i(b.x, a.y), 0).r, f.x);
  let high = mix(textureLoad(tHeight, vec2i(a.x, b.y), 0).r, textureLoad(tHeight, b, 0).r, f.x);
  return mix(low, high, f.y);
#else
  return textureSampleLevel(tHeight, sClamp, (xz - F.wm.xy + 0.5) / vec2f(textureDimensions(tHeight)), 0.0).r;
#endif
}
fn wmZone(xz: vec2f) -> vec4f { if (!wmIn(xz)) { return vec4f(1.0, 0.0, 1.0, 0.0); } return textureSampleLevel(tZone, sClamp, ((xz - F.wm.xy) * WM_ZS + 0.5) / vec2f(textureDimensions(tZone)), 0.0); }
