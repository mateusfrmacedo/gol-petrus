"""Capô de ensaio: superfície amostrada no Gol e contorno limpo, com chapa fechada."""
from pathlib import Path
import bpy,bmesh,json,hashlib,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado/danos';O.mkdir(exist_ok=True)
source=R/'modelo/blender/gol-branco.blend';bpy.ops.wm.open_mainfile(filepath=str(source))
original=bpy.data.objects['PINTURA'];mesh=original.data;world=[original.matrix_world@v.co for v in mesh.vertices];tree=BVHTree.FromPolygons(world,[list(f.vertices)for f in mesh.polygons])
origin=(-1.0702612+1.4376315)/2;vertices=[];faces=[];nu,nv=49,49
for i in range(nu):
 t=i/(nu-1);x=.86+t*.92;width=.62-.06*t
 for j in range(nv):
  u=j/(nv-1);z=(u*2-1)*width;hit=tree.ray_cast(Vector((-z,origin-x,3)),Vector((0,0,-1)))[0]
  y=hit.z if hit is not None else .90-.09*t
  vertices.append((-z,origin-x,y))
# Ajuste suave: remove descontinuidades da amostragem na borda do para-lama.
# Trata-se de uma chapa aproximada de ensaio, sem alegação dimensional de fábrica.
a=np.asarray(vertices);x=a[:,0];y=a[:,1];design=np.column_stack([np.ones(len(a)),x,y,x*x,x*y,y*y]);keep=np.ones(len(a),bool)
for _ in range(4):
 fit=np.linalg.lstsq(design[keep],a[keep,2],rcond=None)[0];error=np.abs(design@fit-a[:,2]);keep=error<max(.018,float(np.quantile(error,.8)))
a[:,2]=design@fit;vertices=a.tolist()
for i in range(nu-1):
 for j in range(nv-1):a=i*nv+j;faces.append((a,a+1,a+nv+1,a+nv))
bpy.ops.wm.read_factory_settings(use_empty=True);me=bpy.data.meshes.new('Capo_chapa');me.from_pydata(vertices,[],faces);me.update()
uv=me.uv_layers.new(name='UVMap')
for loop in me.loops:i,j=divmod(loop.vertex_index,nv);uv.data[loop.index].uv=(j/(nv-1),i/(nu-1))
for f in me.polygons:f.use_smooth=True
ob=bpy.data.objects.new('Capo_chapa',me);bpy.context.scene.collection.objects.link(ob);bpy.context.view_layer.objects.active=ob;ob.select_set(True)
mat=bpy.data.materials.new('Pintura branca');mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.55,.56,.57,1);bs.inputs['Roughness'].default_value=.25;me.materials.append(mat)
solid=ob.modifiers.new('Espessura de ensaio · 30 mm · proxy fechado','SOLIDIFY');solid.thickness=.03;solid.use_rim=True;bpy.ops.object.modifier_apply(modifier=solid.name)
bm=bmesh.new();bm.from_mesh(ob.data);assert all(e.is_manifold for e in bm.edges);bm.free()
bpy.ops.wm.save_as_mainfile(filepath=str(O/'capo-limpo.blend'))
points=[v.co for v in ob.data.vertices];x=(min(p.x for p in points)+max(p.x for p in points))/2;y=(min(p.y for p in points)+max(p.y for p in points))/2;z=max(p.z for p in points)
(O/'impacto.json').write_text(json.dumps([{'type':'dent','point':[x+.13,y-.02,z],'dir':[0,0,-1],'radius':.14,'depth':.012,'shape':'ball'}],indent=2))
profile={'object':'Capô de ensaio de VW Gol G6 branco, superfície amostrada no modelo original','understanding':['A chapa do capô recebe uma depressão leve e localizada. Rodas, vidros, interior e rig ficam fora da simulação.','O contorno do ensaio é simplificado e fechado; não representa uma simulação estrutural de acidente automotivo.','Pintura branca conservada: não adicionar ferrugem, sujeira ou peças soltas.'],'proxy_thickness_m':.03,'material':'sheet','hits':{'dent':1,'crush':0,'axial':0,'bend':0},'depth':.25,'wear':{'rust':0,'grime':0,'edge_wear':0},'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
(O/'perfil-gol.json').write_text(json.dumps(profile,ensure_ascii=False,indent=2)+'\n');print('Capô fechado:',len(ob.data.polygons),'faces; UV definido e preservado no ensaio')
