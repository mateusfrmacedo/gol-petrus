# Forma do VW Gol G6 (2016+, 4 portas) como campo de distância assinado.
# Referencial do jogo: X frente, Y cima, Z direita, origem no chão no centro do entre-eixos. Metros.
import numpy as np
from matplotlib.path import Path

AXF, AXR = 1.2335, -1.2335      # eixos (entre-eixos 2,467 m)
WHEEL_R = 0.298                 # 205/40 R17
ARCH_Y, ARCH_R = 0.298, 0.352

def chaikin(pts, sharp, it=4):
    P = [np.array(p, float) for p in pts]; S = list(sharp)
    for _ in range(it):
        n = len(P)
        Q, T = [], []
        for i in range(n):
            a, b = P[i], P[(i + 1) % n]
            if S[i]:
                Q.append(a); T.append(True)
            Q.append(0.75 * a + 0.25 * b if not S[i] else a * 0.9 + b * 0.1); T.append(False)
            Q.append(0.25 * a + 0.75 * b if not S[(i + 1) % n] else a * 0.1 + b * 0.9); T.append(False)
        P, S = Q, T
    return np.array(P)

# silhueta lateral (x, y), sentido horário a partir do lábio dianteiro; True = canto vivo
SIDE = [
    (1.875, 0.215, 0), (1.917, 0.300, 0), (1.931, 0.420, 0), (1.920, 0.540, 0), (1.897, 0.650, 0),
    (1.873, 0.755, 0), (1.825, 0.815, 0), (1.696, 0.852, 0), (1.300, 0.925, 0), (0.950, 0.982, 0),
    (0.790, 1.008, 0),                                   # base do para-brisa
    (0.200, 1.380, 0), (-0.050, 1.428, 0), (-0.400, 1.445, 0), (-0.800, 1.442, 0), (-1.120, 1.424, 0),
    (-1.350, 1.392, 0), (-1.470, 1.366, 0), (-1.505, 1.338, 1),   # ponta do aerofólio
    (-1.405, 1.292, 1),                                 # sob o aerofólio
    (-1.690, 0.990, 0), (-1.735, 0.930, 0), (-1.790, 0.840, 0), (-1.828, 0.700, 0),
    (-1.864, 0.590, 0), (-1.892, 0.540, 0), (-1.900, 0.420, 0), (-1.885, 0.300, 0), (-1.840, 0.240, 0),
    (-1.500, 0.215, 0), (-0.900, 0.190, 0), (0.900, 0.190, 0), (1.582, 0.205, 0),
]

def side_path():
    pts = [(p[0], p[1]) for p in SIDE]; sh = [bool(p[2]) for p in SIDE]
    return chaikin(pts, sh, 4)

def poly_sdf(P, X, Y):
    """distância assinada 2D ao polígono fechado P (negativa dentro)"""
    pts = np.stack([X.ravel(), Y.ravel()], 1)
    d = np.full(len(pts), 1e9)
    A = P; B = np.roll(P, -1, 0)
    for a, b in zip(A, B):
        ab = b - a; ap = pts - a
        t = np.clip((ap @ ab) / (ab @ ab), 0, 1)
        q = ap - t[:, None] * ab
        d = np.minimum(d, np.hypot(q[:, 0], q[:, 1]))
    inside = Path(P).contains_points(pts)
    d[inside] *= -1
    return d.reshape(X.shape)

def smax(a, b, k):
    h = np.clip(0.5 - 0.5 * (b - a) / k, 0, 1)
    return a * h + b * (1 - h) + k * h * (1 - h)

def smin(a, b, k):
    return -smax(-a, -b, k)

def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def half_width(x, y):
    """meia largura da seção (vista de frente) em função da altura, com vinco do ombro e da porta"""
    # parede: 0,826 no bojo (y~0,62); vinco do ombro em y=0,86 (acima dele a parede recolhe); vinco baixo em 0,415
    w = 0.826 - 0.010 * ((y - 0.62) / 0.24) ** 2
    w = np.where(y > 0.86, 0.818 - 0.07 * (y - 0.86), w)          # ombro: aresta + caída até a cintura
    w = np.where(y < 0.415, 0.818 - 0.05 * (0.415 - y) - 0.25 * np.maximum(0, 0.28 - y) ** 1.5 * 6, w)
    # estufa (vidros): de 0,80 na cintura até 0,63 no teto
    belt = 0.94 + 0.035 * np.clip((0.72 - x) / 1.9, 0, 1)
    g = np.clip((y - belt) / (1.40 - belt), 0, 1.2)
    wg = 0.785 - 0.19 * g ** 1.1
    w = smin(w, np.where(y > belt - 0.06, wg, 9.0), 0.02)
    # planta: a frente afina (focinho arredondado), a traseira arredonda
    fx = np.clip((x - 1.30) / 0.69, 0, 1); rx = np.clip((-x - 1.50) / 0.42, 0, 1)
    w = w - 0.20 * fx ** 2.4 - 0.08 * rx ** 2.6
    return w

def body_sdf(X, Y, Z, side_P):
    az = np.abs(Z)
    # abaulamento do teto/capô (a borda fica mais baixa que o centro) e frente em "V" (o centro avança)
    crown = 0.045 * (az / 0.8) ** 2
    vfront = 0.07 * (1 - (az / 0.8) ** 2) * sstep(1.4, 1.8, X)
    vrear = 0.025 * (1 - (az / 0.8) ** 2) * sstep(-1.5, -1.8, X)
    d_side = poly_sdf_interp(side_P, X - vfront + vrear, Y + crown)
    d_w = az - half_width(X, Y)
    d = smax(d_side, d_w, 0.07)
    # caixas de roda: cilindro ao longo de z, só na parte de fora
    for ax in (AXF, AXR):
        cyl = np.hypot(X - ax, Y - ARCH_Y) - ARCH_R
        hole = smax(cyl, 0.50 - az, 0.02)
        d = smax(d, -hole, 0.018)
    return d

_SIDE_GRID = None
def build_side_grid(side_P, x0, x1, y0, y1, h):
    global _SIDE_GRID
    xs = np.arange(x0, x1 + h, h); ys = np.arange(y0, y1 + h, h)
    XX, YY = np.meshgrid(xs, ys, indexing='ij')
    _SIDE_GRID = (x0, y0, h, poly_sdf(side_P, XX, YY))

def poly_sdf_interp(side_P, X, Y):
    x0, y0, h, G = _SIDE_GRID
    fx = (X - x0) / h; fy = (Y - y0) / h
    i = np.clip(np.floor(fx).astype(int), 0, G.shape[0] - 2); j = np.clip(np.floor(fy).astype(int), 0, G.shape[1] - 2)
    tx = np.clip(fx - i, 0, 1); ty = np.clip(fy - j, 0, 1)
    return (G[i, j] * (1 - tx) * (1 - ty) + G[i + 1, j] * tx * (1 - ty) + G[i, j + 1] * (1 - tx) * ty + G[i + 1, j + 1] * tx * ty)
