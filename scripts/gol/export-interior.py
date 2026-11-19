"""Exporta o interior do .blend editado para os lotes WebGPU do jogo.
A carroceria e os vidros originais continuam no arquivo base do jogo.
"""
from pathlib import Path
import argparse,base64,hashlib,json,zlib
import bpy,numpy as np
R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado';SOURCE=O/'geometry-source.json'
p=argparse.ArgumentParser();p.add_argument('--blend',type=Path,default=O/'gol-modular.blend');p.add_argument('--output',type=Path,default=R/'source/js/30_car_b1_refined_data.js');p.add_argument('--report',type=Path,default=O/'validacao.json');opts=p.parse_args()
bpy.ops.wm.open_mainfile(filepath=str(opts.blend))
data=json.loads(SOURCE.read_text());previous=json.loads((O/'validacao.json').read_text());rig_report=previous['rig']
root=bpy.data.objects['Gol · controles'];root['direcao']=.5;root.update_tag();bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
# Exportação do interior a partir do Blender, em lotes compatíveis com o renderizador WebGPU.
payload=bytearray();parts=[];clean_objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('game_target') in ['body','steer'] and o.get('game_group')!='carroceria']
for ob in clean_objects:
 transform=ob.matrix_world.copy()
 if ob['game_target']=='steer':transform=bpy.data.objects['Volante · base da coluna'].matrix_world.inverted()@transform
 evaluated=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());me=evaluated.to_mesh();me.calc_loop_triangles();normals=me.corner_normals
 normal_matrix=transform.to_3x3().inverted().transposed()
 for mi,m in enumerate(me.materials):
  triangles=[t for t in me.loop_triangles if t.material_index==mi]
  if not triangles:continue
  vertices=[];indices=[];lookup={}
  for t in triangles:
   points=[transform@me.vertices[me.loops[li].vertex_index].co for li in t.loops]
   geometric=(points[1]-points[0]).cross(points[2]-points[0])
   if geometric.length<1e-12:continue
   geometric.normalize()
   for li in t.loops:
    loop=me.loops[li];p=transform@me.vertices[loop.vertex_index].co;n=normal_matrix@normals[li].vector
    if n.length<.01:n=geometric
    else:n.normalize()
    uv=me.uv_layers.active.data[li].uv
    v=(p.x,p.z,-p.y,n.x,n.z,-n.y,uv.x,1-uv.y)
    key=tuple(round(x,7)for x in v)
    if key not in lookup:lookup[key]=len(vertices);vertices.append(v)
    indices.append(lookup[key])
  if not vertices:continue
  offset=len(payload);payload.extend(np.array(vertices,dtype='<f4').tobytes());payload.extend(np.array(indices,dtype='<u4').tobytes())
  parts.append(dict(name=ob.name,target=ob['game_target'],offset=offset,nv=len(vertices),ni=len(indices),mat=int(m['game_id']),pa=int(m['game_pa']),color=list(m['game_color'])))
 evaluated.to_mesh_clear()
meta=dict(schema=1,units='metres',source='Blender · Gol modular',sourceGeometrySha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),steerMatrix=data['steerMatrix'],parts=parts,triangles=sum(p['ni']//3 for p in parts),rig=rig_report)
assert meta['triangles']<120000,meta['triangles']
encoded=base64.b64encode(zlib.compress(payload,9)).decode();target=opts.output;target.write_text('// Gerado do Blender por scripts/gol/export-interior.py.\nconst GOL_REFINED_META='+json.dumps(meta,separators=(',',':'))+';\nconst GOL_REFINED_B64='+json.dumps(encoded)+';\n')
opts.report.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'parts':len(parts),'triangles':meta['triangles']},ensure_ascii=False))
