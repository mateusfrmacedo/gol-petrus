"""Limpeza da casca no Blender: funde vértices, reduz (decimate collapse), confere (QA básico) e devolve a malha.
Depois projeta cada vértice de volta na superfície exata do campo de distância e tira a normal do gradiente."""
import os; W = os.path.dirname(os.path.abspath(__file__))   # pasta de trabalho = esta pasta
import bpy, bmesh, numpy as np, sys, json
TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 60000
raw = np.load(os.path.join(W, 'body_raw.npz')); v, f = raw['v'], raw['f']
bpy.ops.wm.read_factory_settings(use_empty=True)
me = bpy.data.meshes.new('body'); me.from_pydata(v.tolist(), [], f.tolist()); me.update()
ob = bpy.data.objects.new('body', me); bpy.context.scene.collection.objects.link(ob)
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(me); bm.free()
m = ob.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = TARGET / len(me.polygons); m.use_symmetry = True; m.symmetry_axis = 'Z'
dg = bpy.context.evaluated_depsgraph_get(); e = ob.evaluated_get(dg); em = e.to_mesh()
em.calc_loop_triangles()
V = np.zeros(len(em.vertices) * 3, np.float32); em.vertices.foreach_get('co', V); V = V.reshape(-1, 3)
T = np.zeros(len(em.loop_triangles) * 3, np.int32); em.loop_triangles.foreach_get('vertices', T); T = T.reshape(-1, 3)
# QA: arestas não-manifold
bm = bmesh.new(); bm.from_mesh(em); nm = sum(1 for ed in bm.edges if not ed.is_manifold); bm.free()
e.to_mesh_clear()
# projeção na superfície exata
D = np.load(os.path.join(W, 'sdf.npy')); X0, Y0, _, H = np.load(os.path.join(W, 'sdf_meta.npy'))
def samp(P):
    fx = (P[:, 0] - X0) / H; fy = (P[:, 1] - Y0) / H; fz = np.abs(P[:, 2]) / H
    i = np.clip(fx.astype(int), 0, D.shape[0] - 2); j = np.clip(fy.astype(int), 0, D.shape[1] - 2); k = np.clip(fz.astype(int), 0, D.shape[2] - 2)
    tx, ty, tz = fx - i, fy - j, fz - k
    c = 0
    for a in (0, 1):
        for b in (0, 1):
            for cc in (0, 1):
                w = (tx if a else 1 - tx) * (ty if b else 1 - ty) * (tz if cc else 1 - tz)
                c = c + w * D[i + a, j + b, k + cc]
    return c
def grad(P, h=0.004):
    g = np.zeros_like(P)
    for ax in range(3):
        d = np.zeros(3); d[ax] = h
        g[:, ax] = (samp(P + d) - samp(P - d)) / (2 * h)
    return g
P = V.astype(np.float64)
import scipy.sparse as sp
nv = len(P); r = np.concatenate([T[:, 0], T[:, 1], T[:, 2], T[:, 1], T[:, 2], T[:, 0]]); c = np.concatenate([T[:, 1], T[:, 2], T[:, 0], T[:, 0], T[:, 1], T[:, 2]])
A = sp.csr_matrix((np.ones(len(r)), (r, c)), shape=(nv, nv)); A.data[:] = 1; deg = np.asarray(A.sum(1)).ravel()
def proj(P, n=3):
    for it in range(n):
        s = samp(P); g = grad(P); gl = np.maximum(np.linalg.norm(g, axis=1), 1e-6)
        P = P - (s / gl ** 2)[:, None] * g
    return P
P = proj(P)
for it in range(int(sys.argv[2]) if len(sys.argv) > 2 else 12):   # relaxa no plano tangente (triângulos mais regulares) e reprojeta
    Lp = (A @ P) / deg[:, None]; g = grad(P); g /= np.maximum(np.linalg.norm(g, axis=1), 1e-6)[:, None]
    dlt = Lp - P; dlt -= (dlt * g).sum(1)[:, None] * g
    P = proj(P + 0.6 * dlt, 2)
for it in range(2):
    s = samp(P); g = grad(P); gl = np.maximum(np.linalg.norm(g, axis=1), 1e-6)
    P -= (s / gl ** 2)[:, None] * g
N = grad(P, 0.006); N /= np.maximum(np.linalg.norm(N, axis=1), 1e-6)[:, None]
err = np.abs(samp(P))
np.savez(os.path.join(W, 'body.npz'), v=P.astype(np.float32), n=N.astype(np.float32), f=T)
print(json.dumps({'verts': len(P), 'tris': len(T), 'non_manifold_edges': nm, 'sdf_err_max_mm': float(err.max() * 1000), 'dims': (P.max(0) - P.min(0)).round(3).tolist()}))
