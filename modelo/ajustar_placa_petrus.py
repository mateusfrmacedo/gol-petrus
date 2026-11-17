"""Aplica a placa fornecida e alinha o aplique ao rebaixo do para-choque."""
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent.parent
file=ROOT/'modelo/blender/gol-branco.blend'
bpy.ops.wm.open_mainfile(filepath=str(file))
collection=bpy.data.collections['Traseira · detalhes da foto']
body=bpy.data.objects['PINTURA']
bvh=BVHTree.FromPolygons([body.matrix_world@v.co for v in body.data.vertices],[tuple(p.vertices) for p in body.data.polygons])
# The silhouette follows the vertices of the molded recess, rather than a separate floating trapezoid.
left=[(-.448,.361),(-.416,.405),(-.375,.452),(-.340,.491),(-.305,.524),(-.272,.531)]
corners=left+[(-x,z) for x,z in reversed(left)]
outline=[tuple(np.array(a)*(1-t)+np.array(b)*t) for a,b in zip(corners,corners[1:]+corners[:1]) for t in np.linspace(0,1,12,endpoint=False)]
center=np.array([0,.441]);n=len(outline)
def surface(x,z):
 p=bvh.ray_cast(Vector((x,3,z)),Vector((0,-1,0)))[0]
 return (x,(p.y if p else 2.04)+.003,z)
pts=[surface(*center)]
for scale in np.linspace(.04,1,26):
 pts.extend(surface(*(center+scale*(np.array(p)-center))) for p in outline)
faces=[(0,1+i,1+(i+1)%n) for i in range(n)]
for ring in range(25):
 a=1+ring*n;b=a+n
 faces.extend((a+i,b+i,b+(i+1)%n,a+(i+1)%n) for i in range(n))
ob=bpy.data.objects['Aplique preto no nicho da placa']
me=bpy.data.meshes.new('Aplique alinhado à moldura');me.from_pydata(pts,[],faces);me.update();ob.data=me
black=bpy.data.materials.get('Aplique preto acetinado do para-choque')
if black is None:
 black=bpy.data.materials['Aerofólio e aplique · preto brilhante'].copy();black.name='Aplique preto acetinado do para-choque'
b=next(n for n in black.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
b.inputs['Base Color'].default_value=(.003,.003,.004,1)
b.inputs['Roughness'].default_value=.68;b.inputs['Metallic'].default_value=0;b.inputs['Coat Weight'].default_value=0
b.inputs['Specular IOR Level'].default_value=.18
me.materials.append(black)
if sum(p.normal.y for p in me.polygons)<0:
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.reverse_faces(bm,faces=bm.faces[:]);bm.to_mesh(me);bm.free()
for p in me.polygons:p.use_smooth=True
for name in ['Placa traseira branca','Faixa azul da placa','Caracteres da placa','Brasil na placa','Placa PETRUS traseira','Placa PETRUS dianteira']:
 if name in bpy.data.objects:bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)
# Remove only the old, isolated front plate from the source mesh.
o=bpy.data.objects['MISCELANEA'];bm=bmesh.new();bm.from_mesh(o.data)
remove=[v for v in bm.verts if abs((o.matrix_world@v.co).x)<.18 and (o.matrix_world@v.co).y<-1.825 and .36<(o.matrix_world@v.co).z<.505]
bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(o.data);bm.free()
mat=bpy.data.materials.get('Placa PETRUS · imagem original') or bpy.data.materials.new('Placa PETRUS · imagem original');mat.use_nodes=True
bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.38
img=bpy.data.images.load(str(ROOT/'assets/referencias/placa-petrus.png'),check_existing=True);img.pack()
node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=img;mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
def plate(name,width,z,y,rear):
 h=width*img.size[1]/img.size[0];w=width/2
 verts=[(-w,y,z-h/2),(w,y,z-h/2),(w,y,z+h/2),(-w,y,z+h/2)]
 face=(3,2,1,0) if rear else (0,1,2,3)
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],[face]);me.update();me.materials.append(mat)
 uv=me.uv_layers.new()
 for loop in me.loops:
  x,_,zz=verts[loop.vertex_index];u=(x+w)/width
  uv.data[loop.index].uv=(1-u if rear else u,(zz-z+h/2)/h)
 ob=bpy.data.objects.new(name,me);collection.objects.link(ob)
plate('Placa PETRUS traseira',.410,.437,2.076,True)
plate('Placa PETRUS dianteira',.350,.431,-1.833,False)
bpy.context.scene['Placa']='PETRUS: imagem original fornecida pelo proprietário, dianteira e traseira'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(file))
scene=bpy.context.scene;scene.camera=bpy.data.objects['Close traseiro'];scene.cycles.samples=24
scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'modelo/blender/traseira.png');bpy.ops.render.render(write_still=True)

scene.camera=bpy.data.objects['Camera'];scene.render.filepath=str(ROOT/'modelo/blender/dianteira.png');bpy.ops.render.render(write_still=True)
