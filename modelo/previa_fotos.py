"""Monta no Blender as peças exatamente como vão para o jogo (gol_parts.pkl + atlas) e renderiza pelas câmeras das fotos.
uso: python3 previa_fotos.py <prefixo> [vistas...]  (vistas: 25 26 28 29 r00 r06)"""
import bpy, numpy as np, pickle, json, math, sys, os, mathutils, cv2
W = os.path.dirname(os.path.abspath(__file__)); G = W
pref = sys.argv[1]; vistas = sys.argv[2:] or ['26', '29', '28']
sys.path.insert(0, W); import regions as RG
P = pickle.load(open(f'{W}/gol_parts.pkl', 'rb'))
FG = json.load(open(f'{G}/fotogrametria.json'))['cams']
for k, c in json.load(open(f'{G}/ref360_cams.json')).items(): FG['r' + k] = c
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
g2b = lambda a: np.stack([a[..., 0], -a[..., 2], a[..., 1]], -1)
img = bpy.data.images.load(f'{W}/gol_atlas.webp')
def mat(nome, cor, rough=0.4, metal=0.0, coat=0.0, tex=False):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*cor, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal; b.inputs['Coat Weight'].default_value = coat
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[6].default_value = (*cor, 1)
        nt.links.new(t.outputs['Alpha'], mx.inputs[0]); nt.links.new(t.outputs['Color'], mx.inputs[7]); nt.links.new(mx.outputs[2], b.inputs['Base Color'])
    return m
PINT = mat('Pintura_branca', (0.80, 0.81, 0.81), 0.18, 0.0, 1.0); PRETO = mat('Plastico_preto', (0.01, 0.01, 0.011), 0.12, 0, 0.8)
VID = mat('Vidro_escuro', (0.015, 0.017, 0.018), 0.04, 0, 1.0); INS = mat('Inserto_foto', (0.80, 0.81, 0.81), 0.2, 0, 0.8, tex=True)
def obj(nome, V, F, N=None, m=PINT, uv=None, cols=None):
    me = bpy.data.meshes.new(nome); me.from_pydata(g2b(V).tolist(), [], np.asarray(F).tolist()); me.update()
    for p in me.polygons: p.use_smooth = True
    if N is not None and len(N) == len(V): me.normals_split_custom_set_from_vertices(g2b(N).tolist())
    if uv is not None:
        ul = me.uv_layers.new(); lv = np.zeros(len(me.loops), int); me.loops.foreach_get('vertex_index', lv)
        U = uv[lv].copy(); U[:, 1] = 1 - U[:, 1]; ul.data.foreach_set('uv', U.ravel())
    me.materials.append(m)
    if cols is not None:
        me.materials.append(PRETO)
        for p, c in zip(me.polygons, cols): p.material_index = int(c)
    o = bpy.data.objects.new(nome, me); sc.collection.objects.link(o); return o
AX = 1.2335
for p in P:
    V, N, F = p['v'], p['n'], p['f']
    if p.get('corner'): idx = F.ravel(); V = V[idx]; N = N[idx]; F = np.arange(len(idx)).reshape(-1, 3)
    if 'cls' in p:
        sel = (p['cls'] & 1) > 0; Fb = F[sel]
        # pretos que o shader desenha no jogo: molduras dos vidros, aerofólio, teto solar
        R = RG.regions(V[:, 0], V[:, 1], V[:, 2], N[:, 0], N[:, 1], N[:, 2])
        gd = np.minimum(np.minimum(R['dlo'], R['ws']), R['rg']); blk = (gd < 0.009) | (R['spo'] < 0) | (R['sun'] < 0)
        obj('Carroceria', V, Fb, N, PINT, cols=blk[Fb].mean(1) > 0.5); continue
    if p['dest'] == 3: continue
    if p.get('uv') is not None: obj(p['name'], V, F, N, INS, uv=p['uv']); continue
    if p['dest'] == 1: obj(p['name'], V, F, N, VID); continue
    if p['dest'] == 2:
        for (hx, s) in ((AX, 1), (AX, -1), (-AX, 1), (-AX, -1)):
            vv = V.copy(); nn = N.copy()
            if s < 0: vv[:, 0] *= -1; vv[:, 2] *= -1; nn[:, 0] *= -1; nn[:, 2] *= -1
            vv = vv + np.array([hx, 0.298, s * 0.728])
            mm = mat('roda_%d_%d' % (p['mat'], p['pa']), p['col'], 0.3 if p['mat'] != 4 else 0.85, 0.8 if p['mat'] == 19 and p['pa'] == 0 else 0.0)
            obj(p['name'], vv, F, nn, mm)
        continue
    cor = p['col']; m = PINT if p['mat'] == 18 and p['pa'] != 2 else mat('peca_%d_%d' % (p['mat'], p['pa']), cor, 0.35)
    obj(p['name'], V, F, N, m)
w_ = bpy.data.worlds.new('w'); sc.world = w_; bg = w_.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.7, 0.75, 0.82, 1); bg.inputs[1].default_value = 1.0
sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sol.data.energy = 2.5; sc.collection.objects.link(sol); sol.rotation_euler = (math.radians(45), 0, math.radians(40))
sc.render.engine = 'CYCLES'; sc.cycles.samples = 32; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
sc.render.film_transparent = True; sc.view_settings.view_transform = 'AgX'
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
M = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
for k in vistas:
    c = FG[k]; Rm, _ = cv2.Rodrigues(np.array(c['r'])); t = np.array(c['t']); C = -Rm.T @ t; w, h = c['size']
    cam.data.sensor_fit = 'HORIZONTAL' if w >= h else 'VERTICAL'; cam.data.sensor_width = cam.data.sensor_height = 36
    cam.data.lens = c['f'] * 36 / max(w, h); cc = c.get('c', [0, 0]); cam.data.shift_x = -cc[0] / max(w, h); cam.data.shift_y = cc[1] / max(w, h)
    rot = mathutils.Matrix(np.stack([M @ Rm[0], M @ (-Rm[1]), M @ (-Rm[2])], 1).tolist())
    cam.matrix_world = mathutils.Matrix.Translation(mathutils.Vector(M @ C)) @ rot.to_4x4()
    s_ = 1000 / max(w, h); sc.render.resolution_x = int(round(w * s_)); sc.render.resolution_y = int(round(h * s_))
    sc.render.filepath = f'{W}/renders/{pref}_{k}.png'; bpy.ops.render.render(write_still=True)
bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=f'{W}/{pref}.blend')
