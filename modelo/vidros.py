"""Painéis de vidro com borda limpa: grade 2D projetada na superfície do campo de distância e recortada na linha da região."""
import numpy as np, os
import regions as RG
W = os.path.dirname(os.path.abspath(__file__))
D = np.load(os.path.join(W, 'sdf.npy')); X0, Y0, _, H = np.load(os.path.join(W, 'sdf_meta.npy'))
def samp(P):
    fx = (P[:, 0] - X0) / H; fy = (P[:, 1] - Y0) / H; fz = np.abs(P[:, 2]) / H
    i = np.clip(fx.astype(int), 0, D.shape[0] - 2); j = np.clip(fy.astype(int), 0, D.shape[1] - 2); k = np.clip(fz.astype(int), 0, D.shape[2] - 2)
    tx, ty, tz = np.clip(fx - i, 0, 1), np.clip(fy - j, 0, 1), np.clip(fz - k, 0, 1); c = 0
    for a in (0, 1):
        for b in (0, 1):
            for cc in (0, 1):
                c = c + (tx if a else 1 - tx) * (ty if b else 1 - ty) * (tz if cc else 1 - tz) * D[i + a, j + b, k + cc]
    return c
def grad(P, h=0.004):
    g = np.zeros_like(P)
    for ax in range(3):
        d = np.zeros(3); d[ax] = h; g[:, ax] = (samp(P + d) - samp(P - d)) / (2 * h)
    return g / np.maximum(np.linalg.norm(g, axis=1), 1e-9)[:, None]
def surface(U, V, axis, lo, hi, build):
    """para cada (u, v), acha a coordenada 'axis' entre lo (dentro) e hi (fora) onde o campo zera"""
    a = np.full(U.shape, lo, float); b = np.full(U.shape, hi, float)
    for _ in range(30):
        m = (a + b) / 2; s = samp(build(U, V, m))
        inside = s < 0; a = np.where(inside, m, a); b = np.where(inside, b, m)
    return build(U, V, (a + b) / 2)
def panel(region, u_rng, v_rng, axis, lo, hi, build, step=0.008, off=0.002):
    us = np.arange(u_rng[0], u_rng[1], step); vs = np.arange(v_rng[0], v_rng[1], step)
    U, V = np.meshgrid(us, vs, indexing='ij'); shp = U.shape
    def dist(U, V):
        P = surface(U.ravel(), V.ravel(), axis, lo, hi, build); N = grad(P)
        R = RG.regions(P[:, 0], P[:, 1], P[:, 2], N[:, 0], N[:, 1], N[:, 2]); return R[region], P, N
    d, P, N = dist(U, V); d = d.reshape(shp)
    keep_q = (d[:-1, :-1] < 0) | (d[1:, :-1] < 0) | (d[:-1, 1:] < 0) | (d[1:, 1:] < 0)
    # vértices de fora que tocam um quad mantido escorregam até a linha da região (Newton 2D)
    Uu, Vv = U.copy(), V.copy(); need = np.zeros(shp, bool)
    need[:-1, :-1] |= keep_q; need[1:, :-1] |= keep_q; need[:-1, 1:] |= keep_q; need[1:, 1:] |= keep_q
    out = need & (d > 0); iu, iv = np.where(out)
    u_, v_ = U[out], V[out]
    for _ in range(6):
        e = 0.002; d0, _, _ = dist(u_, v_); du = (dist(u_ + e, v_)[0] - d0) / e; dv = (dist(u_, v_ + e)[0] - d0) / e
        g2 = du * du + dv * dv + 1e-12; su = -d0 * du / g2; sv = -d0 * dv / g2
        L = np.hypot(su, sv); k = np.minimum(1.0, step / np.maximum(L, 1e-12))   # passo limitado a uma célula
        u_ = u_ + su * k; v_ = v_ + sv * k
    ok = np.abs(dist(u_, v_)[0]) < 0.003
    Uu[out] = np.where(ok, u_, U[out]); Vv[out] = np.where(ok, v_, V[out])
    bad = np.zeros(shp, bool); bad[iu[~ok], iv[~ok]] = True        # quem não chegou na linha derruba seus quads
    keep_q &= ~(bad[:-1, :-1] | bad[1:, :-1] | bad[:-1, 1:] | bad[1:, 1:])
    P = surface(Uu.ravel(), Vv.ravel(), axis, lo, hi, build); N = grad(P); P = P + N * off
    idx = np.arange(U.size).reshape(shp); F = []
    for i, j in zip(*np.where(keep_q)):
        F.append((idx[i, j], idx[i + 1, j], idx[i + 1, j + 1], idx[i, j + 1]))
    F = np.array(F); used = np.unique(F); m = -np.ones(U.size, int); m[used] = np.arange(len(used))
    return P[used], N[used], m[F]
def todos(off=0.002, step=0.008):
    pecas = []
    for s in (1, -1):
        b = lambda U, V, M, s=s: np.stack([U, V, s * M], 1)          # lateral: u=x, v=y, eixo z
        V_, N_, F_ = panel('dlo', (-1.25, 0.62), (0.88, 1.30), 2, 0.3, 0.95, b, step=step, off=off)
        if s < 0: F_ = F_[:, ::-1]
        pecas.append(('Vidros_laterais_' + ('dir' if s > 0 else 'esq'), V_, N_, F_))
    b = lambda U, V, M: np.stack([U, M, V], 1)                         # para-brisa: u=x, v=z, eixo y
    V_, N_, F_ = panel('ws', (0.18, 1.02), (-0.70, 0.70), 1, 0.7, 1.55, b, step=step, off=off); pecas.append(('Para_brisa', V_, N_, F_[:, ::-1]))
    b = lambda U, V, M: np.stack([M, U, V], 1)                         # vigia: u=y, v=z, eixo x (para trás)
    V_, N_, F_ = panel('rg', (0.95, 1.30), (-0.65, 0.65), 0, -1.2, -1.95, b, step=step, off=off); pecas.append(('Vigia', V_, N_, F_[:, ::-1]))
    return pecas
