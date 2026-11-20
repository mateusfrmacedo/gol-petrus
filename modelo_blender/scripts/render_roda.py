"""Close da roda de frente (ortográfica) para comparar com a foto 11.26.27 retificada."""
import bpy, math, os, sys
W = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, W)
import roda
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; col = bpy.data.collections.new('Roda'); sc.collection.children.link(col)
objs = roda.construir(col)
# o desenho 2D já foi gerado com y para cima, então a vista de frente reproduz a orientação da foto retificada
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1000 / 440 * roda.R   # mesma escala da foto retificada (R = 440 px)
cam.location = (0, 0, 2); cam.rotation_euler = (0, 0, 0)

w = bpy.data.worlds.new('w'); sc.world = w; bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.5, 0.52, 0.55, 1); bg.inputs[1].default_value = 0.35
for (rx, rz, e) in ((40, 30, 1.6), (65, 200, 0.5)):
    l = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); l.data.energy = e; sc.collection.objects.link(l); l.rotation_euler = (math.radians(rx), 0, math.radians(rz))
fl = bpy.data.objects.new('area', bpy.data.lights.new('area', 'AREA')); fl.data.energy = 18; fl.data.size = 1.5; fl.location = (0.4, 0.6, 1.2); sc.collection.objects.link(fl)
fl.rotation_euler = (math.radians(-25), math.radians(15), 0)
plano = bpy.ops.mesh.primitive_plane_add(size=3, location=(0, 0, -0.11))
pm = bpy.data.materials.new('chao'); pm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.35, 0.34, 0.32, 1); bpy.context.object.data.materials.append(pm)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.cycles.use_denoising = False
sc.render.resolution_x = sc.render.resolution_y = 1000; sc.view_settings.view_transform = 'AgX'
sc.render.filepath = os.path.join(W, 'renders', 'roda_frente.png'); bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W, 'roda.blend'))
