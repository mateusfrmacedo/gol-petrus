// Peças do carro que não vêm da malha do Gol: interior, piloto, escapamento, volante, placas e emblemas.
const CRK = { x0: 0.0, x1: -0.98, barY: GOL_META.barY, railZ: 0.205, lx0: -1.98, lx1: 1.22 };
function carBuildParts(mb, gl) {
  const v0 = mb.nv, i0 = mb.ni, gv0 = gl.nv, gi0 = gl.ni;
  // ================= interior (metade direita; espelhado) =================
  mb.mat(CM.INTERIOR).color(0.05, 0.05, 0.055);
  mb.quad(-0.86, 0.235, 0.72, 0.85, 0.235, 0.72, 0.85, 0.235, 0, -0.86, 0.235, 0);
  mb.quad(-1.33, 0.235, 0.5, -0.86, 0.235, 0.5, -0.86, 0.235, 0, -1.33, 0.235, 0);   // ao lado das rodas traseiras o carpete é estreito (o plano inteiro atravessava a calota: risco fino horizontal)
  mb.quad(-1.63, 0.45, 0.72, -1.33, 0.45, 0.72, -1.33, 0.45, 0, -1.63, 0.45, 0);                         // assoalho do porta-malas (acima do fundo elevado)                       // assoalho (carpete)
  mb.quad(0.82, 0.2, 0, 0.82, 0.2, 0.72, 0.82, 0.93, 0.72, 0.82, 0.93, 0);                               // parede corta-fogo
  mb.mat(CM.INTERIOR, 3).color(0.045, 0.045, 0.05);
  mb.rbox(0.60, 0.80, 0.34, 0.40, 0.22, 0.70, 0.05, 4);                                                  // painel
  mb.rbox(0.45, 0.52, 0.05, 0.3, 0.34, 0.12, 0.03, 2);                                                   // console
  mb.mat(CM.INTERIOR, 3).color(0.075, 0.075, 0.082); mb.rbox(0.62, 0.915, 0.34, 0.34, 0.024, 0.69, 0.01, 2);              // tampo do painel (mais claro)
  mb.mat(CM.GRILLE).color(0.02, 0.02, 0.022);                                                                              // saídas de ar (palhetas)
  mb.box(0.397, 0.862, 0.615, 0.008, 0.045, 0.1); mb.box(0.397, 0.862, 0.09, 0.008, 0.045, 0.1);
  mb.mat(CM.INTERIOR, 3).color(0.03, 0.03, 0.034); mb.rbox(0.396, 0.775, 0.34, 0.012, 0.085, 0.3, 0.005, 2);               // tampa do porta-luvas / rádio
  // banco dianteiro
  const seat = (x, z, w, color) => {
    mb.mat(CM.INTERIOR, 4).color(color[0], color[1], color[2]);
    mb.rbox(x, 0.43, z, 0.5, 0.15, w, 0.055, 4);
    mb.push(m4translate(m4(), x - 0.26, 0.47, z)); mb.push(m4rotZ(m4(), 0.33)); mb.rbox(0, 0.3, 0, 0.13, 0.6, w - 0.02, 0.055, 4);
    mb.color(color[0] * 1.9, color[1] * 1.9, color[2] * 2.1); mb.rbox(0.058, 0.3, 0, 0.03, 0.46, w - 0.2, 0.012, 2); mb.pop(); mb.pop();   // inserto de tecido claro no encosto
    mb.rbox(x + 0.02, 0.498, z, 0.36, 0.03, w - 0.2, 0.012, 2);                                                                          // e no assento
  };
  seat(-0.03, 0.345, 0.5, [0.07, 0.072, 0.08]);
  mb.push(m4translate(m4(), -0.29, 0.47, 0.345)); mb.push(m4rotZ(m4(), 0.33));
  mb.mat(CM.INTERIOR, 2).color(0.065, 0.067, 0.075); mb.rbox(0.005, 0.71, 0, 0.1, 0.17, 0.25, 0.04, 4);
  mb.mat(CM.STEEL).color(0.3, 0.3, 0.3); mb.cyl(0, 0.58, -0.06, 0.006, 0.64, 0.006, 6); mb.cyl(0, 0.58, 0.06, 0.006, 0.64, 0.006, 6);
  mb.pop(); mb.pop();
  // banco traseiro (inteiriço) e tampão
  mb.mat(CM.INTERIOR, 4).color(0.07, 0.072, 0.08);
  mb.rbox(-0.93, 0.45, 0.31, 0.46, 0.15, 0.62, 0.055, 4);
  mb.push(m4translate(m4(), -1.16, 0.5, 0.31)); mb.push(m4rotZ(m4(), 0.36)); mb.rbox(0, 0.25, 0, 0.12, 0.52, 0.62, 0.05, 4); mb.pop(); mb.pop();
  mb.mat(CM.INTERIOR).color(0.04, 0.04, 0.045); mb.box(-1.40, 0.925, 0.3, 0.28, 0.02, 0.6);
  mb.mirror(v0, i0, 2); gl.mirror(gv0, gi0, 2);
  // ======================= peças não simétricas =======================
  // (sem rack nem escada: o Gol real não tem; carLadder fica no arquivo, sem uso)
  // Escapamento já incluído no modelo exportado do Blender.
  // volante: coluna fixa
  mb.mat(CM.INTERIOR, 3).color(0.04, 0.04, 0.045);
  mb.tube([[0.36, 0.875, -0.36], [0.56, 0.80, -0.36]], 0.03, 10);
  mb.rbox(0.47, 0.925, -0.36, 0.2, 0.07, 0.32, 0.03, 3);        // capela dos instrumentos
  // retrovisor interno, alavanca de câmbio, freio de mão
  mb.rbox(0.23, 1.29, 0, 0.025, 0.055, 0.2, 0.012, 2); mb.tube([[0.24, 1.29, 0], [0.2, 1.35, 0]], 0.008, 6);
  mb.tube([[0.2, 0.42, 0.0], [0.17, 0.6, 0.0]], 0.01, 6); mb.rbox(0.168, 0.62, 0, 0.045, 0.045, 0.045, 0.02, 3);
  mb.rbox(-0.12, 0.40, 0, 0.3, 0.05, 0.04, 0.015, 2);
  // piloto: tronco, ombros, braços no volante e capacete (simples, visto pelos vidros)
  {
    const zd = -0.345;
    mb.mat(CM.INTERIOR, 2).color(0.2, 0.028, 0.03);   // macacão vermelho-escuro
    mb.push(m4translate(m4(), -0.245, 0.50, zd)); mb.push(m4rotZ(m4(), 0.30));
    mb.rbox(0.085, 0.27, 0, 0.2, 0.54, 0.36, 0.08, 4);                 // tronco
    mb.rbox(0.085, 0.50, 0, 0.17, 0.1, 0.44, 0.045, 3);                // ombros
    mb.pop(); mb.pop();
    mb.rbox(0.02, 0.535, zd, 0.44, 0.13, 0.34, 0.06, 3);               // coxas
    for (const sg of [-1, 1]) mb.tube([[-0.26, 0.97, zd + sg * 0.2], [-0.02, 0.86, zd + sg * 0.215], [0.275, 0.93, -0.36 + sg * 0.165]], 0.043, 8);   // braços
    mb.mat(CM.INTERIOR, 3).color(0.02, 0.02, 0.022);
    for (const sg of [-1, 1]) mb.rbox(0.285, 0.935, -0.36 + sg * 0.17, 0.085, 0.07, 0.075, 0.03, 2);   // luvas
    mb.rbox(-0.275, 1.035, zd, 0.1, 0.07, 0.11, 0.03, 2);              // pescoço
    // cinto de segurança diagonal (ombro esquerdo → quadril direito), à frente do tronco
    mb.mat(CM.INTERIOR, 3).color(0.012, 0.012, 0.013);
    mb.sweep([[-0.262, 1.0, zd - 0.15], [-0.15, 0.82, zd - 0.02], [-0.085, 0.63, zd + 0.15]], [[-0.022, 0.004], [0.022, 0.004], [0.022, -0.004], [-0.022, -0.004]], { closedProfile: true, hard: true, up: [1, 0.3, 0] });
    mb.mat(CM.GLOSS).color(0.05, 0.052, 0.058);   // capacete integral grafite (discreto pelo vidro); o macacão é vermelho-escuro
    mb.rbox(-0.262, 1.168, zd, 0.25, 0.25, 0.228, 0.112, 7);          // casco
    mb.rbox(-0.236, 1.092, zd, 0.186, 0.105, 0.206, 0.05, 5);         // queixeira (rente ao casco)
    mb.mat(CM.GLOSS, 1).color(0.01, 0.011, 0.014);
    mb.rbox(-0.2, 1.178, zd, 0.13, 0.08, 0.233, 0.034, 5);        // viseira: faixa escura que envolve a frente e os lados do casco
  }
  // placas e emblemas: vêm dos insertos fotográficos (carDecals fica sem uso)
}
function carLadder(mb) {
  const yb = CRK.barY + 0.014, h = 0.062, yc = yb + h / 2, L = CRK.lx1 - CRK.lx0, xc = (CRK.lx0 + CRK.lx1) / 2;
  // longarinas (perfil retangular) e ponteiras de borracha
  for (const s of [-1, 1]) {
    mb.mat(CM.ALU).color(0.86, 0.87, 0.88); mb.rbox(xc, yc, s * CRK.railZ, L, h, 0.024, 0.004, 1);
    mb.mat(CM.RUBBER).color(0.02, 0.02, 0.02);
    mb.rbox(CRK.lx0 - 0.012, yc, s * CRK.railZ, 0.04, h + 0.008, 0.034, 0.006, 1); mb.rbox(CRK.lx1 + 0.012, yc, s * CRK.railZ, 0.04, h + 0.008, 0.034, 0.006, 1);
  }
  // degraus
  mb.mat(CM.ALU, 1).color(0.88, 0.89, 0.9);
  const n = 11, sp = 0.28, xs = xc - (n - 1) * sp / 2;
  mb.push(m4rotX(m4(), PI / 2));
  for (let i = 0; i < n; i++) mb.cyl(xs + i * sp, -CRK.railZ - 0.0135, -yc, 0.017, CRK.railZ + 0.0135, 0.017, 14, true, true);
  mb.pop();
  // cintas com catraca, uma em cada barra
  for (const xb of [CRK.x0, CRK.x1]) {
    const z0 = CRK.railZ + 0.0165, y0 = CRK.barY - 0.0165, y1 = yb + h + 0.0025, r = 0.008, path = [];
    const corner = (cz, cy, a0) => { for (let k = 0; k <= 4; k++) { const a = a0 + k * PI / 8; path.push([xb, cy + Math.sin(a) * r, cz + Math.cos(a) * r]); } };
    corner(z0 - r, y1 - r, 0); corner(-z0 + r, y1 - r, PI / 2); corner(-z0 + r, y0 + r, PI); corner(z0 - r, y0 + r, 1.5 * PI);
    mb.mat(CM.STRAP).color(0.85, 0.28, 0.02);
    mb.sweep(path, [[-0.0013, -0.019], [0.0013, -0.019], [0.0013, 0.019], [-0.0013, 0.019]], { closed: true, closedProfile: true, hard: true, up: [1, 0, 0], vScale: 0.02 });
    // catraca e sobra da cinta
    mb.mat(CM.CHROME, 1).color(0.62, 0.62, 0.64); mb.rbox(xb, y1 + 0.011, 0.07, 0.052, 0.02, 0.085, 0.004, 1);
    mb.rbox(xb, y1 + 0.028, 0.1, 0.04, 0.012, 0.07, 0.004, 1);
    mb.mat(CM.STRAP).color(0.85, 0.28, 0.02); mb.box(xb, y1 + 0.004, -0.06, 0.036, 0.004, 0.14);
  }
}
// regiões do atlas (u0, v0, u1, v1)
const CAT = { plateF: [0, 0, 0.5, 0.326], plateR: [0, 0, 0.5, 0.326], vwF: [0.5, 0, 0.75, 0.5], vwR: [0.75, 0, 1, 0.5], golR: [0.07, 0.4, 0.23, 0.505], msiR: [0.375, 0.4, 0.505, 0.477] };
function carDecals(mb) {
  for (const d of GOL_META.decals) {
    const n = d.n, reg = CAT[d.name];
    // base do quadro: normal n, "cima" = Y projetado, "lado" = cima × n (texto lido de fora)
    let ux = -n[1] * n[0], uy = 1 - n[1] * n[1], uz = -n[1] * n[2]; const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
    const sx = uy * n[2] - uz * n[1], sy = uz * n[0] - ux * n[2], sz = ux * n[1] - uy * n[0];
    const hw = d.w / 2, hh = d.h / 2, p = d.p;
    const P = (a, b) => [p[0] + sx * a + ux * b, p[1] + sy * a + uy * b, p[2] + sz * a + uz * b];
    const A = P(-hw, -hh), B = P(hw, -hh), C = P(hw, hh), D = P(-hw, hh);
    mb.mat(CM.DECAL, d.name.startsWith('plate') ? 0 : 1).color(1, 1, 1);
    mb.quad(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], D[0], D[1], D[2], reg[0], reg[3], reg[2], reg[1]);
  }
}
// ---------- atlas de placa e emblemas (canvas 2D) ----------
function carAtlas() {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  // placa Mercosul: fundo branco, faixa azul com BRASIL, letras pretas
  g.fillStyle = '#f2f3f1'; g.fillRect(0, 0, 512, 167); g.strokeStyle = '#222'; g.lineWidth = 5; g.strokeRect(3, 3, 506, 161);
  g.fillStyle = '#1f47a8'; g.fillRect(6, 6, 500, 32);
  g.fillStyle = '#fff'; g.font = 'bold 24px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BRASIL', 256, 23);
  g.fillStyle = '#1d9a4a'; g.fillRect(462, 12, 34, 20); g.fillStyle = '#f6d32d'; g.beginPath(); g.moveTo(479, 14); g.lineTo(494, 22); g.lineTo(479, 30); g.lineTo(464, 22); g.closePath(); g.fill();
  g.fillStyle = '#1f47a8'; g.beginPath(); g.arc(479, 22, 5, 0, TAU); g.fill();
  g.fillStyle = '#111'; g.font = 'bold 104px "Arial Narrow", Arial, Helvetica, sans-serif'; g.fillText('FGG2D68', 262, 106);
  g.font = 'bold 15px Arial, sans-serif'; g.textAlign = 'left'; g.fillText('BR', 14, 150);
  // emblema VW: aro + V + W (frente cromado, traseira preto brilhante)
  const vw = (cx, cy, R, ink) => {
    g.save(); g.translate(cx, cy); g.strokeStyle = ink; g.lineCap = 'butt'; g.lineJoin = 'miter';
    g.lineWidth = R * 0.12; g.beginPath(); g.arc(0, 0, R * 0.92, 0, TAU); g.stroke();
    g.lineWidth = R * 0.12;
    g.beginPath(); g.moveTo(-R * 0.46, -R * 0.72); g.lineTo(0, R * 0.1); g.lineTo(R * 0.46, -R * 0.72); g.stroke();
    g.beginPath(); g.moveTo(-R * 0.86, -R * 0.32); g.lineTo(-R * 0.44, R * 0.8); g.lineTo(0, -R * 0.02); g.lineTo(R * 0.44, R * 0.8); g.lineTo(R * 0.86, -R * 0.32); g.stroke();
    g.restore();
  };
  vw(640, 128, 118, '#d9dde2'); vw(896, 128, 118, '#0b0b0c');
  // GOL e MSI (traseira, letras pretas)
  g.fillStyle = '#0b0b0c'; g.textAlign = 'center'; g.font = 'italic bold 46px Arial, Helvetica, sans-serif'; g.fillText('GOL', 154, 230);
  g.font = 'bold 34px Arial, Helvetica, sans-serif'; g.fillText('MSI', 450, 225);
  const im = g.getImageData(0, 0, W, H);
  const tex = mkTex(W, H, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: 6 });
  G.dev.queue.writeTexture({ texture: tex }, im.data, { bytesPerRow: W * 4 }, [W, H]);
  genMips(tex, 'rgba8unorm-srgb');
  return tex;
}
// ---------- volante (eixo da coluna = X local) ----------
function carBuildSteer(mb) {
  mb.mat(CM.INTERIOR, 3).color(0.035, 0.035, 0.038);
  const ring = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ring.push([0, 0.185 * Math.cos(a), 0.185 * Math.sin(a)]); }
  mb.tube(ring, 0.0135, 10, { closed: true, up: [1, 0, 0] });
  mb.rbox(-0.035, -0.01, 0, 0.05, 0.1, 0.16, 0.025, 3);
  mb.rbox(-0.02, 0.0, 0.1, 0.022, 0.03, 0.17, 0.008, 1); mb.rbox(-0.02, 0.0, -0.1, 0.022, 0.03, 0.17, 0.008, 1); mb.rbox(-0.02, -0.1, 0, 0.022, 0.17, 0.035, 0.008, 1);
  m4translate(CAR._t, 0.345, 0.885, -0.36); m4rotZ(CAR._t2, 158 * PI / 180); m4mul(CAR.steerMat, CAR._t, CAR._t2);
}
