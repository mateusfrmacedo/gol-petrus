"""Cena do Gol no Blender: peças, câmeras casadas com as fotos e renders.
uso: python3 cena.py <etapa> [vistas...]   etapa = 'bloco' (cinza) ou 'final'
Referencial do modelo (igual ao das medições): X frente, Y cima, Z direita. No Blender: X frente, Y esquerda, Z cima."""
import bpy, bmesh, numpy as np, json, math, sys, os, mathutils
W = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, W)
import regions as RG
ETAPA = sys.argv[1] if len(sys.argv) > 1 else 'bloco'
VISTAS = sys.argv[2:] or ['25', '26', '28', '29']
FOTO = '/mnt/user-data/uploads/Gol de corrida/photo_2026-11-17 11.26.%s.jpeg'
FG = json.load(open(os.path.join(W, 'fotogrametria.json')))
REF360 = '/mnt/user-data/uploads/gol-360-rodas-revisadas/'
NOMES360 = {'00': 'gol-00-frente.png', '06': 'gol-06-traseira.png', '03': 'gol-03-perfil-esquerdo.png'}
if os.path.exists(os.path.join(W, 'ref360_cams.json')):
    for k_, c_ in json.load(open(os.path.join(W, 'ref360_cams.json'))).items(): FG['cams']['r' + k_] = c_
PAR = json.load(open(os.path.join(W, 'parametros.json')))      # medidas usadas no modelo (rodas, bitola...)

def g2b(a):   # jogo -> Blender
    a = np.asarray(a, float); return np.stack([a[..., 0], -a[..., 2], a[..., 1]], -1)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def col(name):
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c
C_CAR = col('Gol'); C_CAM = col('Cameras_fotos'); C_LUZ = col('Luz')
def mat(name, base, rough=0.5, metal=0.0, coat=0.0, alpha=1.0, transm=0.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    if transm: b.inputs['Transmission Weight'].default_value = transm
    return m
CINZA = mat('Argila_cinza', (0.5, 0.5, 0.5), 0.6)
CINZA_ESC = mat('Argila_cinza_escuro', (0.12, 0.12, 0.13), 0.5)
def mesh_obj(name, V, F, N=None, material=CINZA, collection=C_CAR, smooth=True):
    me = bpy.data.meshes.new(name); me.from_pydata(g2b(V).tolist(), [], np.asarray(F).tolist()); me.update()
    for p in me.polygons: p.use_smooth = smooth
    if N is not None: me.normals_split_custom_set_from_vertices(g2b(N).tolist())
    me.materials.append(material); ob = bpy.data.objects.new(name, me); collection.objects.link(ob); return ob

# ---------------- carroceria ----------------
B = np.load(os.environ.get('CORPO', os.path.join(W, 'body.npz'))); v, n, f = B['v'], B['n'], B['f']
R = RG.regions(v[:, 0], v[:, 1], v[:, 2], n[:, 0], n[:, 1], n[:, 2])
gd = np.minimum(np.minimum(R['dlo'], R['ws']), R['rg'])
fc = gd[f]
mesh_obj('Carroceria', v, f[~(fc < -0.012).all(1)], n)
# vidros: painéis próprios com a borda exatamente na linha medida (vidros.py), 2 mm para fora da abertura
import vidros
for nome, Vg, Ng, Fg in ([] if ETAPA == 'inicial' else vidros.todos()):
    mesh_obj(nome, Vg, Fg, Ng, CINZA_ESC if ETAPA == 'bloco' else mat('Vidro_escuro', (0.02, 0.022, 0.024), 0.05))
# ---------------- caixas de roda (arcos) e rodas provisórias ----------------
AX = PAR['entre_eixos'] / 2; RW = PAR['raio_pneu']; ARCH_R = PAR['raio_arco']; ARCH_Y = PAR['centro_arco_y']
def lathe(profile, seg=48):
    pr = np.array(profile, float); m = len(pr); V = []; F = []
    for i, (zz, r) in enumerate(pr):
        for j in range(seg):
            t = 2 * math.pi * j / seg; V.append((r * math.cos(t), r * math.sin(t), zz))
    for i in range(m - 1):
        for j in range(seg):
            a0 = i * seg + j; a1 = i * seg + (j + 1) % seg; F.append((a0, a0 + seg, a1 + seg, a1))
    return np.array(V), F
def place(V, x, y, z, side):   # eixo local Z -> lateral do carro (face externa para fora)
    V = V.copy()
    if side < 0: V[:, 2] *= -1; V[:, 0] *= -1
    return V + np.array([x, y, z])
for ax, nome in ((AX, 'Diant'), (-AX, 'Tras')):
    for s, lado in ((1, 'Dir'), (-1, 'Esq')):
        zw = PAR['plano_roda_d'] if ax > 0 else PAR['plano_roda_t']
        if ETAPA == 'inicial': zw = 0.78
        # arco: casca cilíndrica (forro da caixa de roda), da face interna até a lateral
        Va, Fa = lathe([(-0.33, ARCH_R + 0.002), (0.0, ARCH_R + 0.002)], 64)
        Va = Va[:, [0, 1, 2]]
        Vp = place(Va, ax, ARCH_Y, s * 0.76, s)
        Fa2 = [q for q in Fa if all(Va[k][1] > 0.04 for k in q)]   # só a parte de cima do arco
        mesh_obj(f'Arco_{nome}_{lado}', Vp, [q[::-1] for q in Fa2], None, CINZA_ESC)
        if ETAPA in ('bloco', 'inicial'):
            hw = 0.1025
            Vt, Ft = lathe([(-hw, RW - 0.08), (-hw, RW - 0.02), (-hw * 0.8, RW), (hw * 0.8, RW), (hw, RW - 0.02), (hw, RW - 0.08)], 48)
            mesh_obj(f'Pneu_prov_{nome}_{lado}', place(Vt, ax, RW, s * (zw - 0.07), s), Ft, None, CINZA_ESC)
            Vr, Fr = lathe([(hw * 0.9, RW - 0.08), (hw * 0.75, 0.0)], 48)
            mesh_obj(f'Aro_prov_{nome}_{lado}', place(Vr, ax, RW, s * (zw - 0.07), s), [q[::-1] for q in Fr], None, CINZA)
# ---------------- roda definitiva (roda.py) montada nas 4 posições ----------------
if ETAPA in ('bloco_roda', 'final'):
    import roda
    C_RODA = bpy.data.collections.new('Roda_definitiva'); bpy.context.scene.collection.children.link(C_RODA)
    roda.construir(C_RODA); C_RODA.hide_render = False
    bpy.context.view_layer.layer_collection.children['Roda_definitiva'].exclude = True   # só a fonte das instâncias
    VERM = mat('Pinca_vermelha', (0.55, 0.02, 0.02), 0.35, 0.0, 0.5)
    for ax, nome in ((AX, 'Diant'), (-AX, 'Tras')):
        for s, lado in ((1, 'Dir'), (-1, 'Esq')):
            zc = (PAR['plano_roda_d'] if ax > 0 else PAR['plano_roda_t']) - 0.072      # plano do pneu = miolo medido − altura do miolo
            e = bpy.data.objects.new(f'Roda_{nome}_{lado}', None); e.instance_type = 'COLLECTION'; e.instance_collection = C_RODA
            e.location = tuple(g2b([ax, RW, s * zc]).tolist()); e.rotation_euler = (math.radians(90 if s > 0 else -90), math.radians(17 if ax > 0 else 51), 0)   # giro em torno do próprio eixo (sem esterço)
            C_CAR.objects.link(e)
            if ax > 0:   # pinça vermelha visível na foto 11.26.26, à frente do disco, na altura do cubo
                bpy.ops.mesh.primitive_cube_add(size=1); p = bpy.context.object; p.name = f'Pinca_{lado}'
                for c in p.users_collection: c.objects.unlink(p)
                C_CAR.objects.link(p); p.scale = (0.055, 0.045, 0.11)
                p.location = tuple(g2b([ax + 0.125, RW + 0.0, s * (zc - 0.02)]).tolist())
                bv = p.modifiers.new('bev', 'BEVEL'); bv.width = 0.012; bv.segments = 3; p.data.materials.append(VERM)
                for f_ in p.data.polygons: f_.use_smooth = True
# ---------------- câmeras casadas com as fotos ----------------
import cv2
def cam_from_cv(k):
    c = FG['cams'][k]; Rm, _ = cv2.Rodrigues(np.array(c['r'])); t = np.array(c['t']); C = -Rm.T @ t
    w, h = c['size']; cam = bpy.data.cameras.new('cam_' + k); ob = bpy.data.objects.new('Camera_foto_' + k, cam); C_CAM.objects.link(ob)
    cam.sensor_fit = 'HORIZONTAL' if w >= h else 'VERTICAL'; cam.sensor_width = cam.sensor_height = 36
    cam.lens = c['f'] * 36 / max(w, h)
    cam.shift_x = -c['c'][0] / max(w, h); cam.shift_y = c['c'][1] / max(w, h)
    M = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)   # jogo -> Blender (como matriz)
    xb, yb, zb = M @ Rm[0], M @ (-Rm[1]), M @ (-Rm[2])
    rot = mathutils.Matrix(np.stack([xb, yb, zb], 1).tolist())
    ob.matrix_world = mathutils.Matrix.Translation(mathutils.Vector(M @ C)) @ rot.to_4x4()
    img = bpy.data.images.load(REF360 + NOMES360[k[1:]] if k.startswith('r') else FOTO % k, check_existing=True); cam.show_background_images = True
    bg = cam.background_images.new(); bg.image = img; bg.alpha = 0.6; bg.frame_method = 'FIT'
    return ob, (w, h)
cams = {k: cam_from_cv(k) for k in FG['cams']}
# ---------------- luz e render ----------------
w_ = bpy.data.worlds.new('Ceu'); sc.world = w_; bgn = w_.node_tree.nodes['Background']; bgn.inputs[0].default_value = (0.75, 0.8, 0.9, 1); bgn.inputs[1].default_value = 0.8
sol = bpy.data.objects.new('Sol', bpy.data.lights.new('Sol', 'SUN')); sol.data.energy = 3.0; sol.data.angle = math.radians(3); C_LUZ.objects.link(sol)
sol.rotation_euler = (math.radians(40), math.radians(10), math.radians(60))
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'
out = os.path.join(W, 'renders'); os.makedirs(out, exist_ok=True)
for k in VISTAS:
    ob, (w, h) = cams[k]; sc.camera = ob
    s_ = 1000 / max(w, h); sc.render.resolution_x = int(round(w * s_)); sc.render.resolution_y = int(round(h * s_))
    sc.render.filepath = os.path.join(out, f'{ETAPA}_{k}.png'); bpy.ops.render.render(write_still=True)
# passe de máscara dos vidros (para o contorno ciano das sobreposições)
if ETAPA in ('bloco', 'bloco_roda', 'final'):
    em_p = bpy.data.materials.new('mask_preto'); em_p.use_nodes = True; nt = em_p.node_tree; nt.nodes.clear()
    o_ = nt.nodes.new('ShaderNodeOutputMaterial'); e_ = nt.nodes.new('ShaderNodeEmission'); e_.inputs[0].default_value = (0, 0, 0, 1); nt.links.new(e_.outputs[0], o_.inputs[0])
    em_b = em_p.copy(); em_b.name = 'mask_branco'; em_b.node_tree.nodes['Emission'].inputs[0].default_value = (1, 1, 1, 1)
    guard = {}
    for ob in C_CAR.all_objects:
        if ob.type != 'MESH': continue
        guard[ob.name] = [s_.material for s_ in ob.material_slots]
        for s_ in ob.material_slots: s_.material = em_b if ob.name.startswith(('Vidros', 'Para_brisa', 'Vigia')) else em_p
    sc.cycles.samples = 4
    for k in VISTAS:
        ob, (w, h) = cams[k]; sc.camera = ob; s_ = 1000 / max(w, h); sc.render.resolution_x = int(round(w * s_)); sc.render.resolution_y = int(round(h * s_))
        sc.render.filepath = os.path.join(out, f'{ETAPA}_{k}_vidros.png'); bpy.ops.render.render(write_still=True)
    for ob in C_CAR.all_objects:
        if ob.name in guard:
            for s_, m in zip(ob.material_slots, guard[ob.name]): s_.material = m
    sc.cycles.samples = 24
# QA: projeção de um ponto medido pelo Blender (confere a conversão da câmera)
from bpy_extras.object_utils import world_to_camera_view
qa = {}
for k in FG['cams']:
    ob, (w, h) = cams[k]; sc.camera = ob; s_ = 1000 / max(w, h); sc.render.resolution_x = int(round(w * s_)); sc.render.resolution_y = int(round(h * s_))
    p = FG['lm']['VWF'] if k in ('26', '29') else FG['lm']['VWR'] if k == '28' else None
    if p is None: continue
    co = world_to_camera_view(sc, ob, mathutils.Vector(g2b([p[0], p[1], 0.0]).tolist()))
    qa[k] = (round(co.x * w, 1), round((1 - co.y) * h, 1))
print('QA projecao emblema (Blender):', qa)
bpy.ops.file.pack_all()      # fotos de fundo e textura do emblema embutidas no .blend
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W, f'gol_{ETAPA}.blend'))
