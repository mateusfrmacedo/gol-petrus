"""Vídeo comparativo do capô original e amassado; mesmos materiais, escala e luz."""
from pathlib import Path
import bpy,math,json
from mathutils import Vector
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado/danos';F=O/'frames';F.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene
mat=bpy.data.materials.new('Pintura branca · comparação neutra');mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.5,.52,.55,1);bs.inputs['Metallic'].default_value=.08;bs.inputs['Roughness'].default_value=.25
for name,offset in [('capo-limpo',-.78),('capo-amassado',.78)]:
 with bpy.data.libraries.load(str(O/(name+'.blend')))as(src,dst):dst.objects=[n for n in src.objects if n.startswith('Capo_chapa')]
 for ob in dst.objects:
  sc.collection.objects.link(ob);bpy.context.view_layer.update();points=[ob.matrix_world@Vector(c)for c in ob.bound_box];center=(Vector([min(p[k]for p in points)for k in range(3)])+Vector([max(p[k]for p in points)for k in range(3)]))/2
  ob.data.transform(ob.matrix_world);
  for v in ob.data.vertices:v.co-=center
  ob.matrix_world.identity();ob.location=(offset,0,.15);ob.data.materials.clear();ob.data.materials.append(mat)
world=bpy.data.worlds.new('Fundo');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.12,.16,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4;sc.world=world
for pos,power,size in [((0,-2,3),550,2),((0,2,1),300,1)]:
 l=bpy.data.lights.new('Luz rasante','AREA');l.energy=power;l.shape='RECTANGLE';l.size=size;l.size_y=.4;o=bpy.data.objects.new('Luz',l);sc.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.15))-o.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.objects.new('Camera',bpy.data.cameras.new('Camera'));sc.collection.objects.link(cam);sc.camera=cam;cam.data.lens=42
sc.render.engine='CYCLES';sc.cycles.device='CPU';sc.cycles.samples=4;sc.cycles.use_denoising=True;sc.render.resolution_x=720;sc.render.resolution_y=405;sc.render.resolution_percentage=100;sc.view_settings.view_transform='AgX'
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',16)
for frame in range(24):
 a=frame/24*2*math.pi
 for ob in sc.objects:
  if ob.type=='MESH':ob.rotation_euler.z=a
 cam.location=(0,-3.2,2.35);cam.rotation_euler=(Vector((0,0,.15))-cam.location).to_track_quat('-Z','Y').to_euler();path=F/f'{frame:03}.png';sc.render.filepath=str(path);bpy.ops.render.render(write_still=True)
 im=Image.open(path).convert('RGB');d=ImageDraw.Draw(im);d.rectangle((0,371,720,405),fill=(12,15,20));d.text((115,389),'Capô de ensaio · limpo',font=font,fill='white',anchor='mm');d.text((535,389),'AnyWreck · ensaio',font=font,fill='white',anchor='mm');im.save(path)
report=json.loads((O/'anywreck-report.json').read_text());assert abs(report['area_ratio']-1)<.03;assert abs(report['output_area_ratio']-1)<.03;assert report['wear']['rust_cover']==0
print('Revisão e conservação de área aprovadas; imagens em',F)
