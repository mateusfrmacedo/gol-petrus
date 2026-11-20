"""Confere se uma vista da pasta gol-360 é geometricamente coerente com o carro medido nas fotos reais:
resolve a câmera (PnP, focal livre) com pontos já medidos em 3D e mede o erro de reprojeção."""
import json, numpy as np, cv2, sys
FG = json.load(open('/home/claude/gol/fotogrametria.json')); L = FG['lm']
def P3(n):
    if n.startswith('PR_'):
        c = L['PR']; t = n[3:]; return [c[0], c[1] + (0.065 if t[1] == 't' else -0.065), 0.2 if t[0] == 'p' else -0.2]
    if n in ('VWR', 'BRK', 'ANT'): c = L[n]; return [c[0], c[1], 0.0]
    if n.startswith('RGb_'): c = L['RGb']; return [c[0], c[1], c[2] * (1 if n.endswith('R') else -1)]
obs = {  # vista gol-06-traseira (1368x1150)
 'PR_nt': (543.5, 906), 'PR_pt': (818.5, 906), 'PR_pb': (818.5, 995), 'PR_nb': (543.5, 995),
 'VWR': (689, 689), 'BRK': (686, 325), 'RGb_L': (305, 533), 'RGb_R': (1082, 533), 'ANT': (686, 158)}
w, h = 1368, 1150; nm = list(obs); P = np.array([P3(n) for n in nm], float); uv = np.array([obs[n] for n in nm], float)
best = None
for f in np.geomspace(800, 30000, 120):
    K = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1]])
    ok, r, t = cv2.solvePnP(P, uv, K, None, flags=cv2.SOLVEPNP_SQPNP)
    if not ok: continue
    r, t = cv2.solvePnPRefineLM(P, uv, K, None, r, t)
    e = np.linalg.norm(cv2.projectPoints(P, r, t, K, None)[0].reshape(-1, 2) - uv, axis=1)
    if best is None or e.mean() < best[0]: best = (e.mean(), f, e, r, t)
m, f, e, r, t = best; R, _ = cv2.Rodrigues(r); C = (-R.T @ t).ravel()
print(f'gol-06: erro médio {m:.1f} px (máx {e.max():.1f}), focal {f:.0f}px, câmera em {np.round(C,2)}')
for n, v in zip(nm, e): print(f'   {n}: {v:.1f}')
# escala: 1 px na placa = ? mm
print('mm por px na placa:', round(400 / 275, 2))
