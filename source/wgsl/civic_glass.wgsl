#include mesh_vert
#include fwd_common
#include civic_materials
fn shade(in: V2F, ff: bool) -> vec4f {
  let id = min(matId(in.mat), 23u);
  let material = CIVIC_PBR[id]; let color = CIVIC_COLOR[id].rgb;
  let opacity = CIVIC_ALPHA[id].x;
  var N = normalize(in.nrm); if (!ff) { N = -N; }
  let localN = normalize((vec4f(N, 0.0) * O.model).xyz);
  let clearWindshield = O.p0.w > 0.5 && in.ext.x > 0.15 && in.ext.y > 0.9 && abs(localN.x) > 0.3;
#ifdef GLASS_MUL
  return vec4f(select(vec3f(1.0 - opacity), vec3f(1.0), clearWindshield), 1.0);
#else
  let V = normalize(F.camPos.xyz - in.wpos);
  let nv = max(dot(N, V), 1e-3); let L = F.sunDir.xyz;
  let nl = sat(dot(N, L)); let H = normalize(L + V);
  let shadow = sunShadow(in.wpos, N, in.pos.xy, nl);
  let ior = CIVIC_ALPHA[id].y; let f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
  let fr = fSchlick(mix(vec3f(f0), color, material.y), nv);
  let rough = max(0.035, material.x); let a = rough * rough;
  let env = textureSampleLevel(tEnv, sClamp, reflect(-V, N), rough * 7.0).rgb;
  let diffuse = (shIrr(N) + F.sunCol.rgb * nl * shadow / PI) * color * (1.0 - material.y);
  let spec = F.sunCol.rgb * nl * shadow * fr * min(dGGX(sat(dot(N, H)), a) * vSmith(nv, nl, a), 14.0);
  let c = (diffuse + env * fr + spec) * opacity;
  return vec4f(select(c, vec3f(0.0), clearWindshield), 0.0);
#endif
}
