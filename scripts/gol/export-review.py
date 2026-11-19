"""Exporta GLB com animação de revisão e testa a reimportação num cenário vazio."""
from pathlib import Path
import bpy,json,math,struct,hashlib
from mathutils import Vector
R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado'
bpy.ops.wm.open_mainfile(filepath=str(O/'gol-modular.blend'))
sc=bpy.context.scene;control=bpy.data.objects['Volante · giro'];base=control.parent
review=bpy.data.objects.get('Volante · animacao de revisao')
if review is None:
 review=bpy.data.objects.new('Volante · animacao de revisao',None);control.users_collection[0].objects.link(review);review.parent=base;control.parent=review
else:
 review.animation_data_clear()
for frame,angle in [(1,0),(9,.55),(17,-.55),(25,0)]:review.rotation_euler.x=angle;review.keyframe_insert(data_path='rotation_euler',index=0,frame=frame)
sc.frame_start=1;sc.frame_end=25;sc.frame_set(1);bpy.context.view_layer.update()
selected=[]
for ob in sc.objects:
 allowed=not ob.hide_render and not any(c.name in['Referências','Revisão']for c in ob.users_collection)
 ob.select_set(allowed)
 if allowed:selected.append(ob)
def bounds(objects):
 p=[ob.matrix_world@Vector(c)for ob in objects if ob.type=='MESH'for c in ob.bound_box]
 return [[min(v[k]for v in p),max(v[k]for v in p)]for k in range(3)]
original=bounds(selected);bpy.ops.wm.save_as_mainfile(filepath=str(O/'gol-modular.blend'))
params=dict(filepath=str(O/'gol-modular.glb'),export_format='GLB',use_selection=True,export_animations=True,export_force_sampling=True,export_bake_animation=True,export_extras=True)
allowed=bpy.ops.export_scene.gltf.get_rna_type().properties.keys();bpy.ops.export_scene.gltf(**{k:v for k,v in params.items()if k in allowed})
blob=(O/'gol-modular.glb').read_bytes();length=struct.unpack_from('<I',blob,12)[0];doc=json.loads(blob[20:20+length])
animated=[doc['nodes'][c['target']['node']].get('name','')for a in doc.get('animations',[])for c in a['channels']if c['target']['path']=='rotation']
assert any('Volante' in name for name in animated),animated
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(O/'gol-modular.glb'));bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
restored=bounds(bpy.context.scene.objects);error=max(abs(a-b)for before,after in zip(original,restored)for a,b in zip(before,after));assert error<.003,error
report={'glb_bytes':len(blob),'animations':len(doc.get('animations',[])),'animated_nodes':sorted(set(animated)),'bounds_error_mm':round(error*1000,4),'meshes':len(doc['meshes']),'materials':len(doc['materials']),'blend_sha256':hashlib.sha256((O/'gol-modular.blend').read_bytes()).hexdigest(),'glb_sha256':hashlib.sha256(blob).hexdigest()}
(O/'validacao-glb.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
