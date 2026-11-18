// Materiais do Civic: valores lineares e mapas originais do visualizador.
#include mesh_vert
#include civic_materials
@group(3) @binding(0) var tConsole: texture_2d<f32>;
@group(3) @binding(1) var tPlate: texture_2d<f32>;
@group(3) @binding(2) var tTire: texture_2d<f32>;
@group(3) @binding(3) var tBrake: texture_2d<f32>;
@group(3) @binding(4) var tCenter: texture_2d<f32>;
@group(3) @binding(5) var tTireNormal: texture_2d<f32>;
@group(3) @binding(6) var tRim17: texture_2d<f32>;
fn surf(in: V2F, ff: bool) -> Surface {
  let id = min(matId(in.mat), 23u);
  var s = surfDefault(normalize(in.nrm));
  if (!ff) { s.normal = -s.normal; }
  let p = CIVIC_PBR[id];
  s.albedo = CIVIC_COLOR[id].rgb;
  s.rough = max(p.x, 0.035); s.metal = p.y; s.coat = p.z;
  switch(id) {
    case 2u: { s.albedo *= textureSample(tConsole, sLin, in.uv).rgb; }
    case 3u: { s.albedo *= textureSample(tPlate, sLin, in.uv).rgb; }
    case 5u: { s.albedo *= textureSample(tTire, sLin, in.uv).rgb; }
    case 7u: { s.albedo *= textureSample(tBrake, sLin, in.uv).rgb; }
    case 10u: { s.albedo *= textureSample(tCenter, sLin, in.uv).rgb; }
    case 21u: { s.albedo *= textureSample(tRim17, sLin, in.uv).rgb; }
    default: {}
  }
  if (id == 5u) {
    let mapped = textureSample(tTireNormal, sLin, in.uv).xyz * 2.0 - 1.0;
    let dp1 = dpdx(in.wpos); let dp2 = dpdy(in.wpos);
    let uv1 = dpdx(in.uv); let uv2 = dpdy(in.uv);
    let a = cross(dp2, s.normal); let b = cross(s.normal, dp1);
    let tangent = a * uv1.x + b * uv2.x;
    let bitangent = a * uv1.y + b * uv2.y;
    let inv = inverseSqrt(max(max(dot(tangent, tangent), dot(bitangent, bitangent)), 1e-20));
    s.normal = normalize(tangent * inv * mapped.x + bitangent * inv * mapped.y + s.normal * mapped.z);
  }
  s.emissive = CIVIC_COLOR[id].w;
  // As peças vermelhas da traseira acompanham o pedal do freio.
  if ((id == 4u || id == 9u) && in.ext.x < -1.8) { s.emissive += 0.5 * sat(O.p0.x); }
  return s;
}
