"""Roda definitiva v2: desenho traçado direto da imagem RodaGol.png (vista de frente, sem perspectiva).
- metal (grafite + usinado) vira uma placa extrudada, um pouco funda; as faces usinadas sobem por cima dela
- a própria imagem vai como textura (UV planar) nas faces de frente: acabamento, rebaixos, furos e emblema iguais à foto
Escala: lábio usinado externo = R (0,238 m com a flange). Eixo local Z para fora."""
import numpy as np, cv2, math, os, bpy
from PIL import Image
import roda as R1
W = os.path.dirname(os.path.abspath(__file__))
IMG = os.environ.get('RODA_IMG', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'RodaGol.png'))
C0, C1 = 625.0, 629.0                          # centro na imagem (px)
RP = 0.835 * 608.5 * (0.234 / 0.238)           # px que correspondem a R1.R
S = RP / R1.R                                  # px por metro
def mascaras():
    a = np.array(Image.open(IMG).convert('RGBA'))
    V = cv2.medianBlur(cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2HSV)[..., 2], 5)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]].astype(float); r = np.hypot(xx - C0, yy - C1) / RP
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    metal = ((V > 62) & (r < 1.0)).astype(np.uint8) * 255
    metal = cv2.morphologyEx(cv2.morphologyEx(metal, cv2.MORPH_CLOSE, k), cv2.MORPH_OPEN, k)
    n, lab, st, _ = cv2.connectedComponentsWithStats(255 - metal)
    for i in range(1, n):
        if st[i, 4] < 600: metal[lab == i] = 255
    n, lab, st, _ = cv2.connectedComponentsWithStats(metal); i = 1 + np.argmax(st[1:, 4]); metal = np.where(lab == i, 255, 0).astype(np.uint8)
    usin = ((V > 150) & (metal > 0)).astype(np.uint8) * 255
    usin = cv2.morphologyEx(cv2.morphologyEx(usin, cv2.MORPH_OPEN, k), cv2.MORPH_CLOSE, k)
    usin[(r >= 0.93) & (r < 1.0)] = 255
    return metal, usin
def contornos(mask, eps_px=1.2):
    cs, _ = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE); out = []
    for c in cs:
        c = cv2.approxPolyDP(c, eps_px, True).reshape(-1, 2).astype(float)
        if len(c) >= 3: out.append(np.stack([(c[:, 0] - C0) / S, -(c[:, 1] - C1) / S], 1))
    return out
def uv_de(x, y):
    """coordenada na imagem (0..1) para um ponto local (x, y) da roda"""
    return (C0 + x * S) / 1254.0, (C1 - y * S) / 1254.0
def construir(col):
    ALU = R1.material('Aluminio_usinado', (0.80, 0.81, 0.82), 0.17, 1.0, 0.3)
    GRA = R1.material('Grafite_roda', (0.05, 0.053, 0.057), 0.42, 0.45, 0.6)
    BOR = R1.material('Borracha_pneu', (0.018, 0.018, 0.019), 0.85, 0.0)
    ACO = R1.material('Aco_disco', (0.32, 0.32, 0.33), 0.45, 1.0)
    FOTO = bpy.data.materials.get('Roda_foto') or bpy.data.materials.new('Roda_foto')
    metal, usin = mascaras(); objs = []
    base = R1.curva('Roda_base', contornos(metal), 0.010, 0.001, col); R1.concavo(base, 0.056, 0.016)
    base.data.materials.clear(); base.data.materials.append(FOTO); base.data.materials.append(GRA)
    for p in base.data.polygons: p.material_index = 0 if p.normal.z > 0.5 else 1
    objs.append(base)
    fac = R1.curva('Roda_usinada', contornos(usin), 0.009, 0.0012, col); R1.concavo(fac, 0.072, 0.018)
    fac.data.materials.clear(); fac.data.materials.append(FOTO); fac.data.materials.append(GRA)
    for p in fac.data.polygons: p.material_index = 0 if p.normal.z > 0.5 else 1
    objs.append(fac)
    # tambor, flange, pneu, disco e cubo (iguais à v1)
    R = R1.R
    objs.append(R1.lathe('Roda_tambor', [(0.086, 0.93 * R), (0.07, 0.205), (0.03, 0.198), (-0.09, 0.198), (-0.095, 0.216)], 64, GRA, col))
    objs.append(R1.lathe('Roda_flange', [(0.088, R), (0.084, R + 0.004), (0.075, R + 0.002)], 96, ALU, col))
    pf = [(-0.075, R + 0.001), (-0.093, 0.236), (-0.101, 0.262), (-0.097, 0.284), (-0.086, 0.294), (-0.070, 0.2985)]
    for z_ in (-0.04, 0.0, 0.04): pf += [(z_ - 0.005, 0.2985), (z_ - 0.004, 0.294), (z_ + 0.004, 0.294), (z_ + 0.005, 0.2985)]
    pf += [(0.070, 0.2985), (0.086, 0.294), (0.097, 0.284), (0.101, 0.262), (0.093, 0.236), (0.075, R + 0.001)]
    objs.append(R1.lathe('Pneu_205_40_R17', pf, 128, BOR, col))
    objs.append(R1.lathe('Disco_freio', [(-0.01, 0.075), (-0.01, 0.142), (-0.035, 0.142), (-0.035, 0.075)], 64, ACO, col))
    objs.append(R1.lathe('Cubo', [(0.0, 0.0), (0.0, 0.07), (0.044, 0.07), (0.046, 0.03)], 40, GRA, col))
    return objs
