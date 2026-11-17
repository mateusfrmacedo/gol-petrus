"""Renderiza a malha do Gol no Blender (Cycles CPU) em vistas fixas para comparar com as fotos.
uso: python3 render.py malha.npz saida_prefixo [vistas...]"""
import bpy, numpy as np, sys, math, mathutils
src, out = sys.argv[1], sys.argv[2]
views = sys.argv[3:] or ['side', 'q34', 'rear34', 'front']
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
data = np.load(src, allow_pickle=True)

_NRM = None
def add_mesh(name, v, f, col, rough=0.3, metal=0.0, alpha=1.0, emit=None):
    me = bpy.data.meshes.new(name)
    # jogo: X frente, Y cima, Z direita  ->  Blender: X frente, Y esquerda(-Z), Z cima
    vb = np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1)
    me.from_pydata(vb.tolist(), [], f.tolist()); me.update()
    for p in me.polygons: p.use_smooth = True
    if _NRM is not None:
        nb = np.stack([_NRM[:, 0], -_NRM[:, 2], _NRM[:, 1]], 1)
        me.normals_split_custom_set_from_vertices(nb.tolist())
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    m = bpy.data.materials.new(name); nt = m.node_tree
    b = [n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'][0]
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = 3
    me.materials.append(m)
    return ob, b, nt, me

def add_part(p):
    global _NRM
    _NRM = p.get('n')
    ob, b, nt, me = add_mesh(p['name'], p['v'], p['f'], p['col'], p.get('rough', 0.4), p.get('metal', 0.0), p.get('alpha', 1.0), p.get('emit'))
    if p.get('c') is not None:
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        c = np.concatenate([p['c'], np.ones((len(p['c']), 1))], 1).astype(np.float32)
        ca.data.foreach_set('color', c.ravel())
        an = nt.nodes.new('ShaderNodeVertexColor'); an.layer_name = 'Col'
        nt.links.new(an.outputs['Color'], b.inputs['Base Color'])
    return ob

parts = data['parts'] if 'parts' in data.files else None
if parts is None:
    add_mesh('body', data['v'], data['f'], (0.85, 0.85, 0.85), 0.25)
else:
    for p in parts:
        p = p.item() if hasattr(p, 'item') else p
        add_part(p)
# chão, céu, sol
bpy.ops.mesh.primitive_plane_add(size=40); g = bpy.context.object
gm = bpy.data.materials.new('g'); gb = [n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'][0]; gb.inputs['Base Color'].default_value = (0.12, 0.12, 0.12, 1); g.data.materials.append(gm)
w = bpy.data.worlds.new('w'); sc.world = w; bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.55, 0.65, 0.8, 1); bg.inputs[1].default_value = 0.9
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(40), 0, math.radians(30))
sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
sc.render.resolution_x, sc.render.resolution_y = 1400, 700
sc.view_settings.view_transform = 'Standard'
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
V = {
    'side': dict(loc=(0.0, 12.0, 0.75), tgt=(0.03, 0, 0.72), ortho=4.3),
    'top': dict(loc=(0.0, 0.0, 12.0), tgt=(0.0, 0, 0), ortho=4.3),
    'q34': dict(loc=(5.2, 3.6, 2.3), tgt=(0.1, 0, 0.6), lens=45),     # dianteira esquerda, de cima (foto 26)
    'front34': dict(loc=(5.6, -3.0, 1.5), tgt=(0.2, 0, 0.6), lens=45),   # dianteira direita (foto 29)
    'rear34': dict(loc=(-5.6, -2.8, 2.0), tgt=(-0.2, 0, 0.7), lens=45),  # traseira direita (foto 28)
    'front': dict(loc=(12, 0, 0.75), tgt=(0, 0, 0.72), ortho=2.2),
    'rear': dict(loc=(-12, 0, 0.75), tgt=(0, 0, 0.72), ortho=2.2),
}
for name in views:
    c = V[name]
    if 'ortho' in c: cam.data.type = 'ORTHO'; cam.data.ortho_scale = c['ortho']
    else: cam.data.type = 'PERSP'; cam.data.lens = c['lens']
    cam.location = c['loc']
    d = mathutils.Vector(c['tgt']) - mathutils.Vector(c['loc']); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_y = 700 if name in ('side', 'top') else 900 if 'ortho' in c else 1000
    sc.render.resolution_x = 1400 if name in ('side', 'top') else 1000 if 'ortho' in c else 1300
    sc.render.filepath = f'{out}_{name}.png'
    bpy.ops.render.render(write_still=True)
print('ok')
