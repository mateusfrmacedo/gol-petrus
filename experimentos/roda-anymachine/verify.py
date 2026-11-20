"""Reimporta o GLB em cena vazia e confere geometria, escala e giro."""
from pathlib import Path
import json, math, struct
import bpy
from mathutils import Vector

out=Path(__file__).resolve().parent/'resultado'
path=out/'roda-gol-anymachine.glb'
raw=path.read_bytes();size,kind=struct.unpack_from('<II',raw,12)
doc=json.loads(raw[20:20+size])
assert raw[:4]==b'glTF' and len(raw)==struct.unpack_from('<I',raw,8)[0]
assert doc.get('animations'),'Exportação sem giro'
assert not any('uri' in i for i in doc.get('images',[])),'Textura não embutida'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(path))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
stats=json.loads((out/'stats.json').read_text())
assert len(meshes)==stats['meshes'],(len(meshes),stats['meshes'])
sc=bpy.context.scene;sc.frame_set(1)
verts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
mn=Vector([min(v[i]for v in verts)for i in range(3)])
mx=Vector([max(v[i]for v in verts)for i in range(3)])
dims=sorted(mx-mn)
assert abs(dims[0]-.2133)<.006 and all(abs(d-.566)<.006 for d in dims[1:]),dims
spin=bpy.data.objects.get('Eixo de rotacao')
assert spin
q1=spin.matrix_world.to_quaternion()
sc.frame_set(49) # importador usa 24 fps; 2 segundos = meia volta
q2=spin.matrix_world.to_quaternion()
angle=q1.rotation_difference(q2).angle
assert abs(angle-math.pi)<.08,angle
assert all(math.isfinite(v)for o in meshes for p in o.data.vertices for v in p.co)
report={'passed':True,'meshes_reimported':len(meshes),'dimensions_m':[round(x,5)for x in mx-mn],'animations':len(doc['animations']),'half_turn_rad':angle,'embedded_images':len(doc.get('images',[]))}
(out/'validacao.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
