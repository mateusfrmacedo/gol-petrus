# Forma do VW Gol G6 (2016+, 4 portas) como campo de distância assinado.
# Referencial do jogo: X frente, Y cima, Z direita, origem no chão no centro do entre-eixos. Metros.
import numpy as np
from matplotlib.path import Path

AXF, AXR = 1.2335, -1.2335      # eixos (entre-eixos 2,467 m)
WHEEL_R = 0.298                 # 205/40 R17
ARCH_Y, ARCH_R = 0.297, 0.352

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
SIDE = [   # perfil lateral (x, y); pontos marcados com * vêm da fotogrametria
    (1.968, 0.262, 0), (2.010, 0.330, 0), (2.028, 0.420, 0),           # * para-choque mais à frente (2,028; 0,418)
    (2.022, 0.540, 0), (2.004, 0.640, 0),                               # * emblema na grade (1,991; 0,678)
    (1.982, 0.735, 0), (1.935, 0.795, 0), (1.840, 0.835, 0), (1.600, 0.880, 0), (1.300, 0.930, 0),
    (0.920, 0.995, 0),                                                  # base do para-brisa no centro (* quinas em 0,958; 0,975)
    (0.230, 1.362, 0), (0.000, 1.402, 0), (-0.300, 1.416, 0), (-0.700, 1.412, 0), (-1.000, 1.398, 0),   # * teto ~1,40-1,42
    (-1.250, 1.372, 0), (-1.400, 1.340, 0), (-1.470, 1.322, 0), (-1.492, 1.296, 1),                   # * aerofólio (−1,47; 1,30)
    (-1.425, 1.276, 1),                                                 # sob o aerofólio
    (-1.625, 0.995, 0), (-1.680, 0.960, 0), (-1.790, 0.900, 0),         # * vigia até (−1,60; 1,00) nas quinas; lanterna (−1,79; 0,90)
    (-1.832, 0.810, 0), (-1.855, 0.680, 0), (-1.868, 0.580, 0),         # * emblema VW traseiro (−1,84; 0,81)
    (-1.874, 0.460, 0), (-1.872, 0.380, 0), (-1.850, 0.315, 0), (-1.780, 0.292, 0),   # * para-choque traseiro (−1,872; 0,357)
    (-1.500, 0.270, 0), (-0.900, 0.240, 0), (0.900, 0.240, 0), (1.600, 0.252, 0),     # * soleira a 0,24
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
    """meia largura da seção (vista de frente) por altura; o vinco do ombro sobe da frente (0,76) para trás (0,88)"""
    ys = 0.76 + 0.12 * sstep(1.65, -0.6, x)                          # altura do ombro
    flare = 0.016 * (np.exp(-((x - AXF) / 0.42) ** 2) + np.exp(-((x - AXR) / 0.42) ** 2))   # leve alargamento nas caixas de roda
    w = 0.806 + flare - 0.010 * ((y - 0.60) / 0.24) ** 2               # * lateral a ~0,80 na altura das maçanetas
    w = np.where(y > ys, 0.806 + flare - 0.010 * ((ys - 0.60) / 0.24) ** 2 - 0.08 * (y - ys), w)
    w = w - 0.022 * sstep(-0.8, -1.5, x) * sstep(0.74, 0.92, y)          # ombro traseiro recolhe acima das lanternas
    w = np.where(y < 0.43, w - 0.05 * (0.43 - y) - 1.5 * np.maximum(0, 0.30 - y) ** 1.5, w)
    # estufa: da cintura (0,77) ao teto (0,57)
    belt = 0.945 + 0.03 * np.clip((0.70 - x) / 1.9, 0, 1)
    g = np.clip((y - belt) / (1.40 - belt), 0, 1.2)
    rr_ = sstep(-0.6, -1.45, x)                                        # a estufa afina para trás (colunas C)
    wg = 0.772 - 0.20 * g ** 1.1 - 0.06 * rr_ - 0.20 * rr_ * g         # * medido nas vistas 11.26.28 e gol-06
    wg = np.where((y > 1.22) & (x < -1.25), np.minimum(wg, 0.50), wg)    # * aerofólio: ponta a 0,47 do centro
    w = smin(w, np.where(y > belt - 0.06, wg, 9.0), 0.02)
    # planta: a frente afina e arredonda (o canto do farol fica bem recolhido), a traseira arredonda
    fx = np.clip((x - 1.30) / 0.73, 0, 1); rx = np.clip((-x - 1.30) / 0.58, 0, 1)
    w = w - 0.17 * fx ** 2.2 - 0.19 * rx ** 2.2
    return w

def body_sdf(X, Y, Z, side_P):
    az = np.abs(Z)
    # abaulamento do teto/capô (a borda fica mais baixa que o centro) e frente em "V" (o centro avança)
    # abaulamento: no capô o para-lama cai bastante perto do farol (* canto do farol a 0,73 m de altura)
    crown = (0.04 + 0.09 * sstep(0.9, 1.7, X)) * (az / 0.8) ** 2 * sstep(0.45, 0.75, Y)   # só na parte de cima
    # o centro da frente é o ponto mais avançado (medido); as quinas recuam
    vfront = -0.07 * (az / 0.8) ** 2 * sstep(1.4, 1.8, X)
    vrear = -0.03 * (az / 0.8) ** 2 * sstep(-1.5, -1.8, X)
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
