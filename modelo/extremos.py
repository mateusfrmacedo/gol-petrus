"""Do casco visual, a superfície da frente x_f(y,|z|) e da traseira x_r(y,|z|), bem suavizadas."""
import numpy as np, os
from scipy.ndimage import gaussian_filter
W = os.path.dirname(os.path.abspath(__file__))
d = np.load(os.path.join(W, 'casco_grade.npz')); G = d['G']; x0, y0, z0, h = d['o']
xs = x0 + np.arange(G.shape[0]) * h
ins = G <= 0
def face(sel, front):
    xf = np.full(G.shape[1:], np.nan)
    idx = np.where(sel)[0]
    sub = ins[idx]
    for j in range(G.shape[1]):
        for k in range(G.shape[2]):
            col = sub[:, j, k]
            if col.any():
                i = np.where(col)[0]; xf[j, k] = xs[idx[i.max()]] if front else xs[idx[i.min()]]
    return xf
xf = face(xs > 0.9, True); xr = face(xs < -0.9, False)
def lisa(a, fill, s):
    m = np.isfinite(a); a2 = np.where(m, a, fill)
    num = gaussian_filter(a2 * m, s); den = gaussian_filter(m.astype(float), s) + 1e-9
    return np.where(den > 0.05, num / den, fill)
XF = lisa(xf, 0.9, (3.0, 4.0)); XR = lisa(xr, -0.9, (3.0, 4.0))
np.savez(os.path.join(W, 'extremos.npz'), XF=XF.astype(np.float32), XR=XR.astype(np.float32), o=np.array([y0, z0, h]))
for y in (0.3, 0.45, 0.6, 0.72, 0.8):
    j = int(round((y - y0) / h)); print(f'y={y}: frente', [round(float(XF[j, int(round(z / h))]), 2) for z in (0, 0.3, 0.5, 0.6, 0.7, 0.78)],
                                        ' traseira', [round(float(XR[j, int(round(z / h))]), 2) for z in (0, 0.3, 0.5, 0.6, 0.7, 0.78)])
