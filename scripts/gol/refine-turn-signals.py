"""Setas âmbar independentes nos faróis, células traseiras e retrovisores do Gol."""
from pathlib import Path
import bpy,bmesh,math,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[2];bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
col=bpy.data.collections['Gol recuperado do visualizador'];oy=(-1.0702612+1.4376315)/2
def world(x,y,z):return Vector((-z,oy-x,y))
for ob in list(col.objects):
    if ob.name.startswith('Seta ·'):bpy.data.objects.remove(ob,do_unlink=True)
vertices=[];faces=[]
for name in ['PINTURA','MISCELANEA','VIDRIOS','CROMO','NEGRO']:
    ob=bpy.data.objects[name];offset=len(vertices);vertices.extend(ob.matrix_world@v.co for v in ob.data.vertices)
    faces.extend([offset+i for i in p.vertices]for p in ob.data.polygons)
tree=BVHTree.FromPolygons(vertices,faces)
def surface(y,z):
    hit=tree.ray_cast(world(2.4,y,z),Vector((0,1,0)))[0]
    assert hit is not None,(y,z)
    return oy-hit.y
materials={}
for side in [-1,1]:
    mat=bpy.data.materials.new('Indicador de direção · '+('esquerdo'if side<0 else'direito'))
    mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.075,.085,.095,1)
    bs.inputs['Roughness'].default_value=.24;bs.inputs['Metallic'].default_value=0
    mat.diffuse_color=(.075,.085,.095,1);mat['signal_side']=side;materials[side]=mat

def strip(name,side,zmin,zmax,center_y,half_height,n=48):
    verts=[];faces=[]
    for depth in [.0028,-.0005]:
        for row in [-1,0,1]:
            for j in range(n):
                t=j/(n-1);z=side*(zmin+(zmax-zmin)*t)
                # Pontas arredondadas e lente estreita, assentada no invólucro.
                end=min(t,1-t)/.05
                round_end=math.sqrt(max(0,1-(1-end)**2)) if end<1 else 1
                y=center_y+row*half_height*max(.25,round_end)
                verts.append(world(surface(y,z)+depth,y,z))
    for i in range(n-1):
        for row in range(2):
            a=row*n+i;b=3*n+a
            faces.extend([(a,a+n,a+n+1,a+1),(b,b+1,b+n+1,b+n)])
        faces.extend([(i,i+1,3*n+i+1,3*n+i),(2*n+i,5*n+i,5*n+i+1,2*n+i+1)])
    for row in range(2):
        a=row*n;b=(row+1)*n-1
        faces.extend([(a,a+3*n,a+4*n,a+n),(b,b+n,b+4*n,b+3*n)])
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
    uv=me.uv_layers.new(name='UVMap')
    for loop in me.loops:
        idx=loop.vertex_index;uv.data[loop.index].uv=((idx%n)/(n-1),((idx//n)%3)/2)
    for p in me.polygons:p.use_smooth=True
    me.materials.append(materials[side]);ob=bpy.data.objects.new(name,me);col.objects.link(ob)
    ob['signal_side']=side;return ob

for side in [-1,1]:
    label='esquerdo'if side<0 else'direito'
    strip('Seta · farol '+label,side,.707,.760,.590,.006)
    strip('Seta · retrovisor '+label,side,.808,.963,.914,.0055)
rear=[]
for ob in bpy.data.collections['Traseira · detalhes da foto'].objects:
    if not ob.name.startswith('Segmento superior vermelho'):continue
    side=-1 if sum((ob.matrix_world@Vector(c)).x for c in ob.bound_box)>0 else 1
    ob.data.materials.clear();ob.data.materials.append(materials[side]);ob['signal_side']=side;rear.append(ob.name)
assert len(rear)==18,len(rear)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
(R/'modelo/gol-refinado/validacao-setas.json').write_text(json.dumps({'front':2,'mirror_repeaters':2,'rear_cells':len(rear),'color':'âmbar','synchronized_by_side':True,'reverse_light_independent':True,'mirror_lens_center_height_m':.914},ensure_ascii=False,indent=2)+'\n')
