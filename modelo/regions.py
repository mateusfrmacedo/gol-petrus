# Regiões da carroceria do Gol (mesmas fórmulas do shader mat_car.wgsl, função golRegions).
# Entrada: posição local (x, y, z) e normal local (nx, ny, nz). Distâncias assinadas: < 0 dentro.
import numpy as np
def cl(x, a, b): return np.clip(x, a, b)
def smax(a, b, k):
    h = cl(0.5 - 0.5 * (b - a) / k, 0, 1); return a * h + b * (1 - h) + k * h * (1 - h)
def rrect(a, b, ha, hb, r):
    qa = np.abs(a) - ha + r; qb = np.abs(b) - hb + r
    return np.hypot(np.maximum(qa, 0), np.maximum(qb, 0)) + np.minimum(np.maximum(qa, qb), 0) - r
def belt(x): return 0.948 + 0.032 * cl((0.70 - x) / 1.87, 0, 1)
def wg(y): return 0.785 - 0.19 * cl((y - 0.95) / 0.45, 0, 1.2) ** 1.1

def regions(x, y, z, nx, ny, nz):
    az = np.abs(z); R = {}
    # janelas laterais (uma abertura só: a coluna B e a divisória ficam como vidro escuro, como no carro)
    f = ((x - 0.70) * 0.352 + (y - 0.948) * 0.42) / 0.548
    r = ((x + 1.165) * -0.32 + (y - 0.985) * 0.19) / 0.372
    d = smax(smax(belt(x) - y, y - 1.322, 0.03), smax(f, r, 0.05), 0.05)
    R['dlo'] = np.maximum(d, (0.45 - np.abs(nz)) * 0.2)
    # para-brisa
    d = smax(smax(0.252 - x, x - 0.762, 0.03), az - (wg(y) - 0.085), 0.06)
    R['ws'] = np.maximum(d, (0.15 - nx) * 0.2 + (y < 0.9) * 1.0)
    # vigia traseira (sob o aerofólio)
    d = smax(smax(1.012 - y, y - 1.262, 0.03), az - (wg(y) - 0.095), 0.07)
    R['rg'] = np.maximum(d, (nx + 0.12) * 0.2 + (x > -1.3) * 1.0)
    # farol: trapézio na quina dianteira
    t = cl((az - 0.33) / 0.45, 0, 1)
    d = smax(smax(0.672 + 0.05 * t - y, y - (0.792 + 0.012 * t), 0.012), smax(0.335 - az, 1.66 - x, 0.02), 0.02)
    R['hl'] = np.maximum(d, np.where(x < 1.5, 1.0, -1.0))
    # grade superior (entre os faróis) e grade inferior do para-choque
    R['gr'] = np.maximum(rrect(z, y - 0.718, 0.33, 0.05, 0.012), 1.8 - x)
    R['gl'] = np.maximum(rrect(z, y - 0.385, 0.62 - 0.25 * cl((y - 0.30) / 0.17, 0, 1) ** 2 * 0, 0.095, 0.03), 1.75 - x)
    # lanterna traseira
    t2 = cl((az - 0.5) / 0.3, 0, 1)
    d = smax(smax(0.655 + 0.015 * t2 - y, y - (0.872 - 0.01 * t2), 0.012), smax(0.50 - az, x + 1.60, 0.02), 0.02)
    R['tl'] = np.maximum(d, np.where(x > -1.4, 1.0, -1.0))
    # painel escuro em volta da placa traseira e aerofólio preto
    R['dif'] = np.maximum(rrect(z, y - 0.385, 0.40 - 0.1 * cl((0.47 - y) / 0.17, 0, 1), 0.085, 0.02), x + 1.82)
    R['spo'] = np.maximum(1.272 - y, x + 1.31)
    # teto solar
    R['sun'] = np.maximum(rrect(x - 0.22, z, 0.36, 0.40, 0.05), 0.7 - ny)
    return R
