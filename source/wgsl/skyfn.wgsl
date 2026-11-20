// Consulta ao céu pré-gerado + disco solar. Requer tSky, sSky, F.
fn skyUV(d: vec3f) -> vec2f {
  let el = asin(clamp(d.y, -1.0, 1.0)); let az = atan2(d.z, d.x);
  let t = pow(sat((el - SKY_EL0) / SKY_ELR), 1.0 / 1.5);
  return vec2f(az / (2.0 * PI), 1.0 - t);
}
fn skyColor(d: vec3f) -> vec3f {
  let uv = skyUV(d);
  // gradientes explícitos: evita a costura do atan2 em u = ±0.5
  let s = textureSampleLevel(tSky, sSky, uv, 0.0);
  var c = s.rgb;
  let cs = dot(d, F.sunDir.xyz);
  // disco solar com escurecimento de borda + halo
  let disc = smoothstep(0.99987, 0.99993, cs);
  c += F.sunCol.rgb * (disc * 420.0 + pow(sat(cs), 900.0) * 6.0 + pow(sat(cs), 90.0) * 0.5) * s.a;
  // noite: estrelas (grade na esfera, piscando pouco) e um fundo azul muito escuro
  let nt = F.sunDir.w;
  if (nt > 0.0 && d.y > 0.0) {
    let g = d / max(max(abs(d.x), abs(d.y)), abs(d.z)) * 260.0; let cell = floor(g); let h = hash31(cell);
    let f = fract(g) - 0.5 - (hash33(cell) - 0.5) * 0.6; let st = smoothstep(0.08, 0.0, length(f)) * step(0.985, h) * (0.4 + 0.6 * hash31(cell + 7.0));
    c += (vec3f(0.0006, 0.0009, 0.0018) + vec3f(st) * 0.05 * smoothstep(0.0, 0.25, d.y)) * nt * s.a;
  }
  return c;
}
