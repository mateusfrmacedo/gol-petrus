// Detalhes próprios a partir do Street View de out/2024, vista para noroeste:
// https://www.google.com/maps/@?api=1&map_action=pano&pano=pkdCqpWt8CB7H-VRR8VBWw&heading=287&pitch=5
// Muro baixo, trepadeiras floridas e laje sobre drenagem. Medidas aproximadas.
function borghiNorthDetails(mb) {
  const M = MARCOS.borghi, garden = M && M.neighbors && M.neighbors.find(h => h.borghiRef === 'jardim');
  if (!garden) return;
  const h = garden, X = h.d / 2, Z = h.w / 2, F = -X - h.set;
  const front = [h.x - h.nx * X, h.z - h.nz * X], y = Math.max(h.yr, hfAt(...front)) + 0.08;
  const at = (a, b) => [h.x + h.nx * a + h.fx * b, h.z + h.nz * a + h.fz * b];
  mb.push(m4basis(m4(), h.nx, 0, h.nz, 0, 1, 0, h.fx, 0, h.fz, h.x, y, h.z));
  // Armações e hastes esparsas atrás do muro: não acrescentam colisão à calçada.
  for (const z of [-10.5, -6.5, 1.5, 8.0, 11.5]) {
    mb.mat(2, 180).color(0.34, 0.32, 0.25, 1);
    mb.box(F + 0.55, 1.65, z, 0.065, 3.3, 0.065);
    for (let k = 0; k < 7; k++) {
      const a = F + 0.8 + Math.sin(k * 2.4 + z) * 0.36;
      const b = z + Math.cos(k * 1.7) * 0.6, yy = 1.05 + k * 0.33;
      mb.mat(19, 230).color(0.24 + (k % 3) * 0.03, 0.36, 0.16, 1);
      mb.cyl(a, yy - 0.17, b, 0.08, yy, 0.30, 6, false, false);
      mb.cyl(a, yy, b, 0.30, yy + 0.19, 0.06, 6, false, true);
      mb.mat(19, 230).color(k % 3 ? 0.68 : 0.73, k % 3 ? 0.24 : 0.57, k % 3 ? 0.43 : 0.69, 1);
      for (let j = 0; j < 3; j++) {
        const by = yy + 0.06 * j, bz = b - 0.16 + j * 0.14;
        mb.cyl(a - 0.24, by - 0.04, bz, 0.025, by, 0.085, 5, false, false);
        mb.cyl(a - 0.24, by, bz, 0.085, by + 0.06, 0.025, 5, false, true);
      }
    }
  }
  // Pingadeira e faixa escurecida no rodapé do muro existente.
  mb.mat(3).color(0.57, 0.57, 0.54, 1);
  for (const [a, b] of [[-Z, Z * 0.30], [Z * 0.72, Z]]) mb.box(F, 1.07, (a + b) / 2, 0.27, 0.055, b - a);
  mb.mat(19, 245).color(0.48, 0.49, 0.45, 1);
  mb.box(F - 0.105, 0.10, -Z * 0.35, 0.012, 0.18, Z * 1.25);
  mb.pop();

  // Laje baixa sobre a boca de drenagem, junto ao canto do muro, fora da pista.
  const a = F - 0.7, b = Z - 0.95, p = at(a, b), q = new Float64Array(12);
  q[0] = p[0]; q[1] = p[1]; cityRasterQ(q);
  if (q[9] > 0.65) {
    const ground = cityGroundY(...p);
    mb.push(m4basis(m4(), h.nx, 0, h.nz, 0, 1, 0, h.fx, 0, h.fz, p[0], ground, p[1]));
    mb.mat(19, 245).color(0.12, 0.13, 0.12, 1);
    mb.box(0, 0.025, 0, 0.82, 0.045, 1.65);
    mb.mat(3).color(0.64, 0.63, 0.58, 1);
    mb.box(0.08, 0.115, 0, 0.82, 0.11, 1.82);
    for (const z of [-0.78, -0.39, 0, 0.39, 0.78]) mb.box(-0.40, 0.06, z, 0.045, 0.12, 0.055);
    // Balizador branco visto ao lado da laje, com pequena faixa vermelha.
    mb.cyl(0.11, 0, 1.18, 0.095, 0.73, 0.075, 8, false, true);
    mb.mat(19, 220).color(0.73, 0.36, 0.30, 1);
    mb.cyl(0.11, 0.48, 1.18, 0.085, 0.56, 0.083, 8, false, false);
    mb.pop();
    const post = at(a + 0.11, b + 1.18); CITY.addCircle(post[0], post[1], 0.10);
    M.northDrain = { x: p[0], z: p[1], y: ground };
  }
}
