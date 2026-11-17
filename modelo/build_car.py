"""Monta todas as peças do Gol e grava gol_parts.npz (pré-visualização) e gol_mesh.bin (jogo).
Peças de superfície dura (retrovisores, antena, maçanetas) saem do Blender com bevel + weighted normal."""
import os; W = os.path.dirname(os.path.abspath(__file__))   # pasta de trabalho = esta pasta
import numpy as np, sys, math, json, zlib, struct
sys.path.insert(0, W)
import regions as RG, gol_shape as gs
import bpy, bmesh

# ids de material do jogo (mat_car.wgsl)
PAINT, PLASTIC, RUBBER, TIRE, STEEL, CHROME, INTERIOR, LENS, UNDER, MIRROR, GOL, RIM = 1, 2, 3, 4, 6, 7, 8, 9, 13, 15, 18, 19
parts = []   # dict(name, dest, mat, pa, col, v, n, f)
def part(name, dest, mat, pa, col, v, n, f, **kw):
    parts.append(dict(name=name, dest=dest, mat=mat, pa=pa, col=tuple(col), v=np.asarray(v, np.float32), n=np.asarray(n, np.float32), f=np.asarray(f, np.int32), **kw))

# ---------------- carroceria, vidros e forro ----------------
B = np.load(os.path.join(W, 'body.npz')); v, n, f = B['v'], B['n'], B['f']
R = RG.regions(v[:, 0], v[:, 1], v[:, 2], n[:, 0], n[:, 1], n[:, 2])
glassd = np.minimum(np.minimum(R['dlo'], R['ws']), R['rg'])
fc = glassd[f]
keep = ~(fc < -0.014).all(1)
cen = v[f].mean(1)
cls = np.zeros(len(f), np.uint8)
cls |= keep.astype(np.uint8) * 1
# (vidros: painéis próprios gerados por vidros.py, ver abaixo)
cls |= (R['hl'][f] < 0.003).any(1).astype(np.uint8) * 4                           # lente do farol
cls |= (R['tl'][f] < 0.003).any(1).astype(np.uint8) * 8                           # lente da lanterna
lin = (cen[:, 1] > 0.52) & (cen[:, 0] > -1.80) & (cen[:, 0] < 0.86) & (np.abs(cen[:, 2]) > 0.05)
cls |= (lin & (cen[:, 1] <= 1.28)).astype(np.uint8) * 16                          # forro escuro
cls |= (lin & (cen[:, 1] > 1.28)).astype(np.uint8) * 32                           # forro do teto (claro)
part('body', 0, GOL, 0, (1, 1, 1), v, n, f, cls=cls)
import vidros
for nome_, Vg, Ng, Fg in vidros.todos(off=-0.003, step=0.022):
    Fg = np.concatenate([Fg[:, [0, 1, 2]], Fg[:, [0, 2, 3]]])          # quads -> triângulos
    part(nome_, 1, 0, 0, (0.16, 0.175, 0.18), Vg, Ng, Fg)
# ---------------- utilitários de malha ----------------
def surf_y(x, z):
    """altura da superfície do teto em (x, z) pelo campo de distância"""
    D = np.load(os.path.join(W, 'sdf.npy'), mmap_mode='r'); X0, Y0, _, H = np.load(os.path.join(W, 'sdf_meta.npy'))
    i = int(round((x - X0) / H)); k = int(round(abs(z) / H)); col = np.array(D[i, :, k])
    j = np.where(col < 0)[0].max(); t = col[j] / (col[j] - col[j + 1])
    return Y0 + (j + t) * H
def body_z(x, y):
    D = np.load(os.path.join(W, 'sdf.npy'), mmap_mode='r'); X0, Y0, _, H = np.load(os.path.join(W, 'sdf_meta.npy'))
    i = int(round((x - X0) / H)); j = int(round((y - Y0) / H)); row = np.array(D[i, j, :])
    k = np.where(row < 0)[0].max(); t = row[k] / (row[k] - row[k + 1]); return (k + t) * H
def blender_obj_to_arrays(ob):
    dg = bpy.context.evaluated_depsgraph_get(); e = ob.evaluated_get(dg); me = e.to_mesh(); me.calc_loop_triangles()
    nl = len(me.loops); co = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    cn = np.zeros(nl * 3); me.corner_normals.foreach_get('vector', cn) if hasattr(me, 'corner_normals') else None; cn = cn.reshape(-1, 3)
    lv_ = np.zeros(nl, int); me.loops.foreach_get('vertex_index', lv_)
    tl = np.zeros(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('loops', tl)
    mw = np.array(ob.matrix_world); P = co[lv_] @ mw[:3, :3].T + mw[:3, 3]; N = cn @ np.linalg.inv(mw[:3, :3])
    N /= np.linalg.norm(N, axis=1)[:, None]
    e.to_mesh_clear()
    # Blender (X frente, Y esquerda, Z cima) -> jogo (X frente, Y cima, Z direita); por canto (normais divididas)
    g = lambda A: np.stack([A[:, 0], A[:, 2], -A[:, 1]], 1)
    return g(P), g(N), tl.reshape(-1, 3)
def bl_rbox(name, size, bevel, seg=4, loc=(0, 0, 0), rot=(0, 0, 0)):
    """caixa arredondada no Blender (bevel + weighted normal). size/loc em coords do jogo"""
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.object; ob.name = name
    ob.scale = (size[0], size[2], size[1]); bpy.ops.object.transform_apply(scale=True)
    m = ob.modifiers.new('bev', 'BEVEL'); m.width = bevel; m.segments = seg; m.limit_method = 'NONE'; m.use_clamp_overlap = True
    ob.location = (loc[0], -loc[2], loc[1]); ob.rotation_euler = rot
    for p in ob.data.polygons: p.use_smooth = True
    return ob

bpy.ops.wm.read_factory_settings(use_empty=True)
# ---------------- retrovisores (capa na cor do carro, base preta, espelho) ----------------
for s in (1, -1):
    zb = body_z(0.66, 0.97)
    cap = bl_rbox('mcap', (0.13, 0.115, 0.215), 0.045, 5, loc=(0.60, 1.035, s * (zb + 0.115)))
    cap.rotation_euler = (0, math.radians(-4), math.radians(-s * 9)); bpy.context.view_layer.update()
    P, N, T = blender_obj_to_arrays(cap); part('mirror_cap', 0, GOL, 1, (1, 1, 1), P, N, T, corner=True)
    gl = bl_rbox('mgl', (0.004, 0.09, 0.18), 0.02, 3, loc=(0.536, 1.035, s * (zb + 0.115)))
    gl.rotation_euler = (0, 0, math.radians(-s * 9)); bpy.context.view_layer.update()
    P, N, T = blender_obj_to_arrays(gl); part('mirror_glass', 0, MIRROR, 0, (0.6, 0.62, 0.65), P, N, T, corner=True)
    base = bl_rbox('mbase', (0.16, 0.07, 0.07), 0.015, 3, loc=(0.64, 0.985, s * (zb + 0.02)))
    P, N, T = blender_obj_to_arrays(base); part('mirror_base', 0, PLASTIC, 0, (0.02, 0.02, 0.021), P, N, T, corner=True)
# ---------------- maçanetas (cor do carro) ----------------
for x in (-0.03, -0.96):
    for s in (1, -1):
        zb = body_z(x, 0.755)
        h = bl_rbox('handle', (0.13, 0.03, 0.03), 0.012, 3, loc=(x, 0.755, s * (zb + 0.004)))
        P, N, T = blender_obj_to_arrays(h); part('handle', 0, GOL, 1, (1, 1, 1), P, N, T, corner=True)
# ---------------- antena "barbatana" ----------------
ya = surf_y(-1.28, 0.0)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1); a = bpy.context.object
a.scale = (0.09, 0.028, 0.055); a.location = (-1.28, 0, ya + 0.005); a.rotation_euler = (0, math.radians(-10), 0)
for p in a.data.polygons: p.use_smooth = True
bpy.context.view_layer.update(); P, N, T = blender_obj_to_arrays(a); part('antenna', 0, GOL, 1, (1, 1, 1), P, N, T, corner=True)
# ---------------- altura do teto nas posições do antigo rack ----------------
CRK_X = (0.0, -0.98); feet = {}
for xb in CRK_X:
    for s in (1, -1):
        yr = surf_y(xb, 0.56); feet[xb] = yr
        # (sem pés de rack: o Gol real não tem rack nem escada; a altura do teto fica registrada em barY)
BAR_Y = max(feet.values()) + 0.075
# ---------------- limpadores ----------------
for (z0, z1) in ((0.40, -0.18), (-0.20, -0.68)):
    pts = []
    for k in range(12):
        z = z0 + (z1 - z0) * k / 11; x = 0.74 - 0.05 * k / 11
        pts.append((x, surf_y(x, z) + 0.012, z))
    P = np.array(pts); wv, wn, wf = [], [], []
    for i in range(11):
        a0, a1 = P[i], P[i + 1]; d = a1 - a0; d /= np.linalg.norm(d); up = np.array([0.25, 1, 0]); up -= d * (up @ d); up /= np.linalg.norm(up); sd = np.cross(d, up)
        base = len(wv)
        for (pt, q) in ((a0, 0), (a1, 1)):
            for (u_, s_) in ((0.007, 0.006), (0.007, -0.006), (-0.007, -0.006), (-0.007, 0.006)):
                wv.append(pt + up * u_ + sd * s_); wn.append(up * np.sign(u_) * 0.7 + sd * np.sign(s_) * 0.7)
        for k in range(4):
            k1 = (k + 1) % 4; wf += [(base + k, base + k1, base + 4 + k1), (base + k, base + 4 + k1, base + 4 + k)]
    wf = np.array(wf); wv = np.array(wv)
    # orienta as faces para fora do eixo da palheta
    part('wiper', 0, RUBBER, 0, (0.015, 0.015, 0.015), wv, wn, wf, twosided=True)
# ---------------- pinças de freio vermelhas (presas à carroceria) ----------------
for ax in (gs.AXF, gs.AXR):
    for s in (1, -1):
        c = bl_rbox('caliper', (0.11, 0.075, 0.05), 0.018, 3, loc=(ax - 0.085, 0.298 + 0.13, s * 0.655))
        c.rotation_euler = (0, math.radians(35), 0)
        bpy.context.view_layer.update(); P, N, T = blender_obj_to_arrays(c)
        # gira em torno do cubo da roda (o bloco fica atrás/acima do eixo)
        part('caliper', 0, GOL, 2, (0.62, 0.03, 0.025), P, N, T, corner=True)

# ---------------- roda definitiva (roda.py: desenho traçado na foto 11.26.27) ----------------
RW = 0.298
def lathe(profile, seg, mat, pa, col, name):
    """perfil [(z, r)] em torno do eixo Z (face externa +Z)"""
    pr = np.array(profile, float); m = len(pr); ang = np.linspace(0, 2 * np.pi, seg + 1)[:-1]; V, Nn, F = [], [], []
    for i, (z, r) in enumerate(pr):
        a_ = pr[max(i - 1, 0)]; b_ = pr[min(i + 1, m - 1)]; tz, tr = b_[0] - a_[0], b_[1] - a_[1]
        nr, nz = tz, -tr; l = math.hypot(nr, nz) or 1; nr /= l; nz /= l
        for t in ang: V.append((r * math.cos(t), r * math.sin(t), z)); Nn.append((nr * math.cos(t), nr * math.sin(t), nz))
    for i in range(m - 1):
        for j in range(seg):
            a0 = i * seg + j; a1 = i * seg + (j + 1) % seg; F += [(a0, a0 + seg, a1 + seg), (a0, a1 + seg, a1)]
    part(name, 2, mat, pa, col, V, Nn, F)
import roda
C_R = bpy.data.collections.new('roda'); bpy.context.scene.collection.children.link(C_R)
MAT_JOGO = {'Aluminio_usinado': (RIM, 0, (0.78, 0.79, 0.8)), 'Grafite_roda': (RIM, 1, (0.06, 0.064, 0.068)), 'Borracha_pneu': (TIRE, 0, (0.02, 0.02, 0.021)),
            'Aco_disco': (STEEL, 1, (0.18, 0.18, 0.19)), 'Cromado': (CHROME, 1, (0.35, 0.35, 0.36)), 'Calota_emblema_VW': (RIM, 3, (0.8, 0.8, 0.82))}
dg = bpy.context.evaluated_depsgraph_get()
for ob in roda.construir(C_R):
    if ob.name.startswith(('Roda_face', 'Roda_raios')):        # jogo: malha mais leve (o desenho fica, a densidade cai)
        dm = ob.modifiers.new('dec', 'DECIMATE'); dm.ratio = 0.22; dm.use_symmetry = False
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    e = ob.evaluated_get(dg); me = e.to_mesh(); me.calc_loop_triangles()
    co = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    nl = len(me.loops); cn = np.zeros(nl * 3); me.corner_normals.foreach_get('vector', cn); cn = cn.reshape(-1, 3)
    lv_ = np.zeros(nl, int); me.loops.foreach_get('vertex_index', lv_)
    tl = np.zeros(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('loops', tl); tl = tl.reshape(-1, 3)
    tm = np.zeros(len(me.loop_triangles), int); me.loop_triangles.foreach_get('material_index', tm)
    mw = np.array(ob.matrix_world); P = co[lv_] @ mw[:3, :3].T + mw[:3, 3]; N = cn @ np.linalg.inv(mw[:3, :3]); N /= np.linalg.norm(N, axis=1)[:, None] + 1e-12
    for mi, slot in enumerate(me.materials):
        sel = tm == mi
        if not sel.any() or slot is None: continue
        mat_, pa_, col_ = MAT_JOGO.get(slot.name, (RIM, 1, (0.1, 0.1, 0.1)))
        # roda em coordenadas próprias: X, Y no plano da roda, Z para fora (sem trocar eixos)
        part(ob.name, 2, mat_, pa_, col_, P, N, tl[sel], corner=True)
    e.to_mesh_clear()
# disco de borrão (raios girando): substitui os raios a partir de certa rotação
lathe([(0.087, 0.0), (0.087, 0.205)], 48, RIM, 2, (0.42, 0.43, 0.44), 'blur')
parts[-1]['dest'] = 3

def surf_x(y, z, front):
    D = np.load(os.path.join(W, 'sdf.npy'), mmap_mode='r'); X0, Y0, _, H = np.load(os.path.join(W, 'sdf_meta.npy'))
    j = int(round((y - Y0) / H)); k = int(round(abs(z) / H)); col = np.array(D[:, j, k]); ins = np.where(col < 0)[0]
    i = ins.max() if front else ins.min(); i2 = i + 1 if front else i - 1; t = col[i] / (col[i] - col[i2])
    x = X0 + (i + (t if front else -t)) * H
    # normal pelo gradiente
    g = np.array([(col[min(i + 1, len(col) - 1)] - col[max(i - 1, 0)]) / (2 * H),
                  (D[i, j + 1, k] - D[i, j - 1, k]) / (2 * H),
                  np.sign(z if z else 1) * (D[i, j, k + 1] - D[i, j, max(k - 1, 0)]) / (2 * H) if k > 0 else 0.0])
    g = g / np.linalg.norm(g); return [float(x), float(y), float(z)], g.tolist()
DEC = []
for (name, y, z, front, w, h, lift) in (('plateF', 0.425, 0.0, True, 0.40, 0.13, 0.012), ('plateR', 0.385, 0.0, False, 0.40, 0.13, 0.008),
                                         ('vwF', 0.718, 0.0, True, 0.15, 0.15, 0.008), ('vwR', 0.80, 0.0, False, 0.155, 0.155, 0.004),
                                         ('golR', 0.735, -0.43, False, 0.115, 0.04, 0.003), ('msiR', 0.70, 0.43, False, 0.095, 0.03, 0.003)):
    p, nn = surf_x(y, z, front); p = [p[0] + nn[0] * lift, p[1] + nn[1] * lift, p[2] + nn[2] * lift]
    DEC.append(dict(name=name, p=p, n=nn, w=w, h=h))
meta = dict(barY=float(BAR_Y), axf=gs.AXF, wheelR=RW, track=1.456, decals=DEC)
pass  # np.savez(os.path.join(W, 'gol_parts.npz'), parts=np.array([{**p, 'col': p['col'][:3], 'c': None} for p in parts], dtype=object))
json.dump(meta, open(os.path.join(W, 'gol_meta.json'), 'w'))
# ---------------- binário para o jogo ----------------
def oct16(N):
    N = N / (np.abs(N).sum(1)[:, None] + 1e-12); x, y, z = N[:, 0], N[:, 1], N[:, 2]
    ox = np.where(z < 0, (1 - np.abs(y)) * np.sign(x + 1e-12), x); oy = np.where(z < 0, (1 - np.abs(x)) * np.sign(y + 1e-12), y)
    return np.clip(np.round(np.stack([ox, oy], 1) * 32767), -32767, 32767).astype(np.int32)
def delta16(a):   # a: int array (n, k) -> deltas por coluna, embrulhados em 16 bits
    d = np.diff(np.concatenate([np.zeros((1, a.shape[1]), a.dtype), a]), axis=0)
    return (d & 0xFFFF).astype('<u2')
hdr = bytearray(struct.pack('<I', len(parts))); body = bytearray()
for p in parts:
    V = p['v']; Nn = p['n']; F = p['f']
    if p.get('corner'):
        idx = F.ravel(); V = V[idx]; Nn = Nn[idx]; F = np.arange(len(idx)).reshape(-1, 3)
    if p.get('twosided'):
        F = np.concatenate([F, F[:, ::-1]])
    c = [int(round(max(0, min(1, x)) * 255)) for x in p['col']]
    hcls = 1 if 'cls' in p else 0
    hdr += struct.pack('<BBBBBBBII', p['dest'], p['mat'], p['pa'], *c, hcls, len(V), F.size)
    q = np.clip(np.round(V * 8192), -32767, 32767).astype(np.int32)
    body += delta16(q).tobytes()
    body += delta16(oct16(Nn)).tobytes()
    body += delta16(F.reshape(-1, 1).astype(np.int64)).tobytes()
    if hcls: body += p['cls'].tobytes()
raw = bytes(hdr) + bytes(body); comp = zlib.compress(raw, 9)
open(os.path.join(W, 'gol_mesh.bin'), 'wb').write(comp)
pickle_parts = [{k: p[k] for k in p} for p in parts]
import pickle; pickle.dump(pickle_parts, open(os.path.join(W, 'gol_parts.pkl'), 'wb'))
print(json.dumps(dict(parts=len(parts), tris=int(sum(len(p['f']) for p in parts)), raw_kb=len(raw) // 1024, zlib_kb=len(comp) // 1024, **meta)))
