"""Ajuste de feixes: resolve a câmera de cada foto e a posição 3D dos pontos do carro.
Réguas fixas: entre-eixos 2,466 m (ficha técnica Gol G7 2017) e placa Mercosul 0,400 x 0,130 m.
Referencial: X frente, Y cima, Z direita do carro; origem no chão, no meio do entre-eixos. Metros."""
import os; W = os.path.dirname(os.path.abspath(__file__))   # pasta de trabalho = esta pasta
import numpy as np, cv2, json
from scipy.optimize import least_squares
WB = 2.466; AX = WB / 2
# ---------- observações (pixels da foto original) ----------
OBS = {
 '25': dict(size=(960, 1280), pts={
   'W_FL': (378.3, 666.5), 'W_RL': (594.0, 669.7), 'G_FL': (378.3, 689.0), 'G_RL': (594.0, 692.5),
   'DHF_L': (490.8, 627.0), 'DHR_L': (568.4, 625.1), 'SPO_L': (614.5, 580.9),
   'FB': (324.2, 648.0), 'RB': (643.4, 658.5), 'ROOF': (510.5, 571.2), 'SILL_L': (484.2, 671.7)}),
 '26': dict(size=(1920, 2560), pts={
   'PF_pt': (306, 1335), 'PF_nt': (435.3, 1385.3), 'PF_nb': (434.1, 1442.4), 'PF_pb': (307, 1388.2),
   'VWF': (381.2, 1291.2), 'W_FL': (893, 1454.1), 'FOG_L': (679.4, 1501.2), 'HLout_L': (800, 1291), 'HLin_L': (526.5, 1353),
   'G_FL': (890, 1575), 'W_RL': (1345, 1228), 'DHF_L': (1208, 1153.3), 'DHR_L': (1336.7, 1086.7),
   'WSt_R': (756.7, 880), 'WSt_L': (1076.7, 933.3), 'WSb_R': (550, 1036.7), 'WSb_L': (920, 1130), 'MIR_L': (1150, 1110),
   'ANT': (1133.3, 843.3), 'G_RL': (1336.7, 1303.3)}),
 '28': dict(size=(1206, 1081), pts={
   'PR_nt': (257.4, 681.7), 'PR_pt': (454, 704.6), 'PR_pb': (444.3, 777.1), 'PR_nb': (247.1, 747.4),
   'VWR': (345.4, 516), 'TLin_R': (677.4, 490.3), 'BRK': (437.4, 217.1), 'RGb_L': (134.6, 365.7), 'RGb_R': (710, 408.6),
   'ANT': (550, 111.4), 'SPO_L': (215.7, 202.9), 'W_RR': (884, 760), 'FUEL_R': (843.9, 487.7), 'DHR_R': (934.2, 468.4),
   'DHF_R': (1043.9, 423.2), 'MIR_R': (1147, 287.7), 'W_FR': (1127.7, 507)}),
 '29': dict(size=(1206, 1062), pts={
   'PF_pt': (802.2, 657.3), 'PF_nt': (956.2, 636.8), 'PF_nb': (956.2, 697.8), 'PF_pb': (803.2, 717.8),
   'VWF': (870.8, 580), 'FOG_R': (560, 741.1), 'HLin_R': (708.6, 617.8), 'HLout_R': (473.5, 534), 'W_FR': (377.5, 700.6),
   'W_RR': (93.1, 500.6), 'MIR_R': (222.5, 369.4), 'DHF_R': (196.3, 425.6), 'DHR_R': (110, 363.1), 'WSt_R': (324.4, 225.6),
   'WSb_R': (399.4, 385), 'G_FR': (380.6, 819.4), 'ANT': (340, 158.8)}),
}
# ---------- pontos 3D: parâmetros livres (x, y, |z|) com chute inicial ----------
LM0 = {'FOG': (1.88, 0.37, 0.58), 'HLin': (1.90, 0.68, 0.36), 'HLout': (1.70, 0.79, 0.74), 'WSt': (0.22, 1.37, 0.55),
       'WSb': (0.78, 1.0, 0.68), 'MIR': (0.62, 1.03, 0.95), 'DHF': (-0.03, 0.755, 0.83), 'DHR': (-0.96, 0.755, 0.83),
       'TLin': (-1.82, 0.85, 0.50), 'FUEL': (-1.37, 0.84, 0.80), 'RGb': (-1.70, 0.99, 0.58), 'SPO': (-1.50, 1.34, 0.55), 'SILL': (-0.03, 0.20, 0.80)}
LMC = {'FB': (2.0, 0.42), 'RB': (-1.92, 0.40), 'ROOF': (-0.4, 1.45), 'VWF': (1.94, 0.72), 'VWR': (-1.80, 0.80), 'ANT': (-1.28, 1.48), 'BRK': (-1.45, 1.30), 'PF': (1.98, 0.43), 'PR': (-1.93, 0.39)}
GLOB0 = dict(rw=0.30, zcf=0.76, zcr=0.75)
names_lm = list(LM0); names_c = list(LMC)
def unpack_world(w):
    g = dict(rw=w[0], zcf=w[1], zcr=w[2]); i = 3; L = {}
    for k in names_lm: L[k] = w[i:i + 3]; i += 3
    for k in names_c: L[k] = w[i:i + 2]; i += 2
    return g, L, i
def point3d(name, g, L):
    side = 0.0
    if name.endswith('_L'): side = -1.0
    if name.endswith('_R'): side = 1.0
    base = name.split('_')[0]
    if base in ('W', 'G'):
        kind, pos = name.split('_'); fr = pos[0] == 'F'; s = -1.0 if pos[1] == 'L' else 1.0
        x = AX if fr else -AX; zc = g['zcf'] if fr else g['zcr']
        return np.array([x, g['rw'], s * zc]) if kind == 'W' else np.array([x, 0.0, s * (zc - 0.05)])
    if base in ('PF', 'PR'):
        c = L[base]; t = name.split('_')[1]; zs = 0.2 if t[0] == 'p' else -0.2; ys = 0.065 if t[1] == 't' else -0.065
        return np.array([c[0], c[1] + ys, zs])
    if base in LMC: c = L[base]; return np.array([c[0], c[1], 0.0])
    p = L[base]; return np.array([p[0], p[1], side * p[2]])
photos = list(OBS)
def unpack(x):
    g, L, i = unpack_world(x); cams = {}
    for k in photos:
        cams[k] = dict(r=x[i:i + 3], t=x[i + 3:i + 6], f=x[i + 6], c=x[i + 7:i + 9], k1=x[i + 9]); i += 10
    return g, L, cams
def project(cam, P, size):
    # centro óptico pode estar fora do meio (foto recortada) e a lente pode ter distorção radial (k1)
    c = cam.get('c', (0, 0)); K = np.array([[cam['f'], 0, size[0] / 2 + c[0]], [0, cam['f'], size[1] / 2 + c[1]], [0, 0, 1]])
    D = np.array([cam.get('k1', 0.0), 0, 0, 0, 0])
    uv, _ = cv2.projectPoints(P.reshape(-1, 1, 3), cam['r'], cam['t'], K, D); return uv.reshape(-1, 2)
def residuals(x):
    g, L, cams = unpack(x); res = []
    for k in photos:
        o = OBS[k]; nm = list(o['pts']); P = np.array([point3d(n, g, L) for n in nm]); uv = project(cams[k], P, o['size'])
        sc = 1000.0 / max(o['size'])     # normaliza: fotos de tamanhos diferentes pesam igual
        res.append(((uv - np.array([o['pts'][n] for n in nm])) * sc).ravel())
    # priors fracos: largura do carro (|z| plausível) e pneu
    res.append([(g['rw'] - 0.30) * 20, (g['zcf'] - 0.76) * 5, (g['zcr'] - 0.75) * 5])
    # pontos vistos numa foto só (lanterna, tampa de combustível): ficam presos ao chute em profundidade (x) e largura (z)
    for k in photos: res.append(np.r_[np.asarray(cams[k]['c']) / max(OBS[k]['size']) * 60, cams[k]['k1'] * 40])
    for k in ('TLin', 'FUEL'): res.append([(L[k][0] - LM0[k][0]) * 30, (L[k][2] - LM0[k][2]) * 30])
    res.append([(L['SILL'][2] - 0.80) * 60])
    res.append([(L['PF'][0] - (L['FB'][0] + 0.01)) * 200])
    res.append([((L['FB'][0] - L['RB'][0]) - 3.897) * 200])
    res.append([(L['PR'][0] - (L['RB'][0] + 0.035)) * 200])   # placa traseira no nicho, 3,5 cm para dentro do para-choque   # comprimento da ficha técnica   # a placa dianteira fica na frente do para-choque (vínculo de montagem)   # soleira: largura conhecida, só a altura vem da foto
    return np.concatenate(res)
# chute inicial: PnP por foto com os pontos do chute
w0 = [GLOB0['rw'], GLOB0['zcf'], GLOB0['zcr']] + [v for k in names_lm for v in LM0[k]] + [v for k in names_c for v in LMC[k]]
g, L, _ = unpack_world(np.array(w0, float)); x0 = list(w0)
for k in photos:
    o = OBS[k]; nm = list(o['pts']); P = np.array([point3d(n, g, L) for n in nm], float); uv = np.array([o['pts'][n] for n in nm], float)
    best = None
    for fm in (0.7, 0.9, 1.1, 1.4, 1.8, 2.4, 3.2):
        f = fm * max(o['size']); K = np.array([[f, 0, o['size'][0] / 2], [0, f, o['size'][1] / 2], [0, 0, 1]])
        ok, r, t = cv2.solvePnP(P, uv, K, None, flags=cv2.SOLVEPNP_SQPNP)
        if not ok: continue
        e = np.linalg.norm(cv2.projectPoints(P, r, t, K, None)[0].reshape(-1, 2) - uv, axis=1).mean()
        if best is None or e < best[0]: best = (e, r.ravel(), t.ravel(), f)
    print(k, 'PnP inicial: erro médio %.1f px, f=%.0f' % (best[0], best[3]))
    x0 += list(best[1]) + list(best[2]) + [best[3], 0.0, 0.0, 0.0]
sol = least_squares(residuals, np.array(x0, float), loss='soft_l1', f_scale=3.0, max_nfev=20000)
g, L, cams = unpack(sol.x)
out = dict(glob=g, lm={k: list(map(float, v)) for k, v in L.items()}, cams={})
print('\nresíduo final por foto (px na foto original):')
for k in photos:
    o = OBS[k]; nm = list(o['pts']); P = np.array([point3d(n, g, L) for n in nm]); uv = project(cams[k], P, o['size'])
    e = np.linalg.norm(uv - np.array([o['pts'][n] for n in nm]), axis=1)
    R, _ = cv2.Rodrigues(cams[k]['r']); C = -R.T @ cams[k]['t']
    if k == '26': print('   ', {n: round(float(v), 1) for n, v in zip(nm, e)})
    print(f"  {k}: médio {e.mean():.1f}, máx {e.max():.1f} ({nm[int(e.argmax())]}), f={cams[k]['f']:.0f}, câmera em {np.round(C, 2)}, centro {np.round(cams[k]['c'],0)}, k1 {cams[k]['k1']:.3f}")
    out['cams'][k] = dict(r=list(map(float, cams[k]['r'])), t=list(map(float, cams[k]['t'])), f=float(cams[k]['f']), size=o['size'], c=list(map(float, cams[k]['c'])), k1=float(cams[k]['k1']),
                          err={n: float(v) for n, v in zip(nm, e)})
print('\nraio do pneu %.3f m, plano do miolo da roda: dianteira %.3f, traseira %.3f (bitola ~%.3f / %.3f)' % (g['rw'], g['zcf'], g['zcr'], 2 * g['zcf'] - 0.1, 2 * g['zcr'] - 0.1))
for k, v in L.items(): print(' ', k, np.round(v, 3))
json.dump(out, open(os.path.join(W, 'fotogrametria.json'), 'w'), indent=1)
