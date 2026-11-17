"""Casco visual: distância (m, aproximada) de um ponto 3D até ficar dentro de TODAS as silhuetas das fotos.
Cada vista é usada duas vezes (com z e com -z), porque o carro é simétrico."""
import numpy as np, cv2, json, os
W = os.path.dirname(os.path.abspath(__file__))
FG = json.load(open(os.path.join(W, 'fotogrametria.json')))['cams']
R3 = json.load(open(os.path.join(W, 'ref360_cams.json')))
VIEWS = []
for k in ('25', '26', '28', '29', 'r00', 'r06'):
    c = FG[k] if k[0] != 'r' else R3[k[1:]]
    m = cv2.imread(os.path.join(W, 'silhuetas', f'{k}.png'), 0) > 127
    # distância em px até a silhueta (0 dentro); margem de 2 px para erro de recorte
    dout = cv2.distanceTransform((~m).astype(np.uint8), cv2.DIST_L2, 5)
    w, h = c['size']; K = np.array([[c['f'], 0, w / 2 + c.get('c', [0, 0])[0]], [0, c['f'], h / 2 + c.get('c', [0, 0])[1]], [0, 0, 1]])
    R, _ = cv2.Rodrigues(np.array(c['r'])); t = np.array(c['t'])
    VIEWS.append((k, K, np.array([c.get('k1', 0.0), 0, 0, 0, 0]), np.array(c['r']), t, R, dout, w, h))
MARGEM = {'25': 3.0, '26': 14.0, '28': 6.0, '29': 8.0, 'r00': 10.0, 'r06': 7.0}   # ~erro de câmera de cada vista (px)
def hull_dist(P, margem_px=None):
    """P (N,3) no referencial do carro -> distância aproximada para fora do casco (<=0 dentro)"""
    best = np.zeros(len(P))
    for (k, K, D, r, t, R, dout, w, h) in VIEWS:
        for sz in (1, -1):
            Q = P * np.array([1, 1, sz]); uv, _ = cv2.projectPoints(Q.reshape(-1, 1, 3), r, t, K, D); uv = uv.reshape(-1, 2)
            depth = (Q @ R.T + t)[:, 2]
            u = np.clip(uv[:, 0], 0, w - 1); v = np.clip(uv[:, 1], 0, h - 1)
            from scipy.ndimage import map_coordinates
            px = map_coordinates(dout, np.stack([v, u]), order=1, mode='nearest')
            fora = (uv[:, 0] < 0) | (uv[:, 0] >= w) | (uv[:, 1] < 0) | (uv[:, 1] >= h)
            px = np.where(fora, 0.0, px)                # fora do quadro: a foto não diz nada
            d = np.maximum(px - (MARGEM[k] if margem_px is None else margem_px), 0) * depth / K[0, 0]
            best = np.maximum(best, d)
    return best

def grade(h=0.012, sigma_vox=2.0):
    """casco em grade 3D, suavizado (gaussiana), para amostrar com interpolação"""
    from scipy.ndimage import gaussian_filter
    xs = np.arange(-2.1, 2.2, h); ys = np.arange(0.1, 1.6, h); zs = np.arange(0, 0.95, h)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing='ij')
    G = hull_dist(np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)).reshape(X.shape)
    # dentro do casco: distância negativa aproximada (para a suavização não "puxar" a borda para dentro)
    from scipy.ndimage import distance_transform_edt
    inside = G <= 0; G = np.where(inside, -distance_transform_edt(inside) * h, G)
    Gs = gaussian_filter(np.concatenate([G[:, :, :0:-1], G], axis=2), sigma_vox)[:, :, G.shape[2] - 1:]
    np.savez(os.path.join(W, 'casco_grade.npz'), G=Gs.astype(np.float32), o=np.array([xs[0], ys[0], zs[0], h]))
    return Gs
_GR = None
def amostra(P):
    global _GR
    if _GR is None:
        d = np.load(os.path.join(W, 'casco_grade.npz')); _GR = (d['G'], d['o'])
    G, (x0, y0, z0, h) = _GR
    from scipy.ndimage import map_coordinates
    c = np.stack([(P[:, 0] - x0) / h, (P[:, 1] - y0) / h, (np.abs(P[:, 2]) - z0) / h])
    return map_coordinates(G, c, order=1, mode='nearest')
if __name__ == '__main__':
    import time; t = time.time(); G = grade(); print('casco', G.shape, round(time.time() - t, 1), 's')
