import os; W = os.path.dirname(os.path.abspath(__file__))   # pasta de trabalho = esta pasta
import numpy as np, sys, time
sys.path.insert(0, W)
import gol_shape as gs
from skimage import measure

H = float(sys.argv[1]) if len(sys.argv) > 1 else 0.008
X0, X1, Y0, Y1, Z0, Z1 = -2.0, 2.06, 0.12, 1.52, -0.9, 0.9
t = time.time()
side_P = gs.side_path()
gs.build_side_grid(side_P, X0 - 0.2, X1 + 0.2, Y0 - 0.2, Y1 + 0.2, 0.003)
xs = np.arange(X0, X1, H); ys = np.arange(Y0, Y1, H); zs = np.arange(0, Z1, H)   # metade z>=0
print('grid', len(xs), len(ys), len(zs), 'side sdf', time.time() - t)
D = np.empty((len(xs), len(ys), len(zs)), np.float32)
YY, ZZ = np.meshgrid(ys, zs, indexing='ij')
import casco
USE_HULL = os.environ.get('CASCO', '0') == '1'   # casco visual: só para estudo (erros de 5-10 cm)
for i, x in enumerate(xs):
    D[i] = gs.body_sdf(np.full_like(YY, x), YY, ZZ, side_P)
    if USE_HULL:
        # recorta só onde o modelo está mais gordo que as fotos (o casco nunca acrescenta volume)
        P = np.stack([np.full(YY.size, x), YY.ravel(), ZZ.ravel()], 1)
        hd = casco.amostra(P).reshape(YY.shape)
        D[i] = gs.smax(D[i], hd, 0.008)
print('sdf', time.time() - t)
np.save(os.path.join(W, 'sdf.npy'), D); np.save(os.path.join(W, 'sdf_meta.npy'), np.array([X0, Y0, 0.0, H]))
# espelha para malha fechada
Df = np.concatenate([D[:, :, :0:-1], D], axis=2)
v, f, n, _ = measure.marching_cubes(Df, 0.0, spacing=(H, H, H))
v[:, 0] += X0; v[:, 1] += Y0; v[:, 2] -= (len(zs) - 1) * H
print('mc', len(v), len(f), time.time() - t)
np.savez(os.path.join(W, 'body_raw.npz'), v=v.astype(np.float32), f=f.astype(np.int32))
