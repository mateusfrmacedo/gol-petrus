"""Câmeras das vistas boas da pasta gol-360 (00 frente, 06 traseira, 03 perfil esq.), resolvidas com pontos já medidos
nas fotos reais. Gera ref360_cams.json no mesmo formato de fotogrametria.json."""
import json, numpy as np, cv2, os
W = os.path.dirname(os.path.abspath(__file__))
FG = json.load(open(os.path.join(W, 'fotogrametria.json'))); L = FG['lm']; g = FG['glob']; AX = 1.233
def pt(b, sg=0):
    p = L[b]; return [p[0], p[1], sg * p[2]] if len(p) == 3 else [p[0], p[1], 0]
PF = lambda zs, ys: [L['PF'][0], L['PF'][1] + ys, zs]; PR = lambda zs, ys: [L['PR'][0], L['PR'][1] + ys, zs]
VISTAS = {
 '00': ((1536, 1024), {'a': (PF(0.2, 0.065), (636.3, 734.7)), 'b': (PF(-0.2, 0.065), (872.1, 734.7)), 'c': (PF(-0.2, -0.065), (872.1, 813.7)), 'd': (PF(0.2, -0.065), (636.3, 813.7)),
        'VWF': (pt('VWF'), (755.3, 653.7)), 'WSb_R': (pt('WSb', 1), (404.7, 443.2)), 'WSb_L': (pt('WSb', -1), (1110, 443.2)), 'WSt_R': (pt('WSt', 1), (482.6, 211.6)),
        'WSt_L': (pt('WSt', -1), (1040.5, 211.6)), 'FOG_R': (pt('FOG', 1), (396.3, 829.5)), 'FOG_L': (pt('FOG', -1), (1127.9, 825.3)), 'HLin_R': (pt('HLin', 1), (545.8, 687.4)), 'HLin_L': (pt('HLin', -1), (966.8, 685.3))}),
 '06': ((1368, 1150), {'a': (PR(-0.2, 0.065), (543.5, 906)), 'b': (PR(0.2, 0.065), (818.5, 906)), 'c': (PR(0.2, -0.065), (818.5, 995)), 'd': (PR(-0.2, -0.065), (543.5, 995)),
        'VWR': (pt('VWR'), (689, 689)), 'BRK': (pt('BRK'), (686, 325)), 'RGb_L': (pt('RGb', -1), (305, 533)), 'RGb_R': (pt('RGb', 1), (1082, 533)), 'ANT': (pt('ANT'), (686, 158))}),
 '03': ((1774, 887), {'W_FL': ([AX, g['rw'], -g['zcf']], (503.5, 738.8)), 'W_RL': ([-AX, g['rw'], -g['zcr']], (1561, 708)), 'G_FL': ([AX, 0, -(g['zcf'] - 0.05)], (503.5, 876)),
        'G_RL': ([-AX, 0, -(g['zcr'] - 0.05)], (1561, 841)), 'DHF': (pt('DHF', -1), (1065, 508)), 'DHR': (pt('DHR', -1), (1453, 467)), 'VWF': (pt('VWF'), (88, 553)), 'FOG': (pt('FOG', -1), (223.5, 739))}),
}
out = {}
for k, ((w, h), obs) in VISTAS.items():
    nm = list(obs); P = np.array([obs[n][0] for n in nm], float); uv = np.array([obs[n][1] for n in nm], float); best = None
    for f in np.geomspace(300, 30000, 200):
        K = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1]]); ok, r, t = cv2.solvePnP(P, uv, K, None, flags=cv2.SOLVEPNP_SQPNP)
        if not ok: continue
        r, t = cv2.solvePnPRefineLM(P, uv, K, None, r, t); e = np.linalg.norm(cv2.projectPoints(P, r, t, K, None)[0].reshape(-1, 2) - uv, axis=1)
        if best is None or e.mean() < best[0]: best = (e.mean(), f, e, r.ravel(), t.ravel())
    m, f, e, r, t = best
    out[k] = dict(r=r.tolist(), t=t.tolist(), f=float(f), size=[w, h], c=[0.0, 0.0], k1=0.0, err={n: float(v) for n, v in zip(nm, e)})
    print(f'{k}: erro médio {m:.1f} px, máx {e.max():.1f}')
json.dump(out, open(os.path.join(W, 'ref360_cams.json'), 'w'), indent=1)
