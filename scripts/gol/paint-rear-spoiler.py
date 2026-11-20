"""Pinta o aerofólio inteiro; divide a malha na emenda para evitar degraus entre triângulos."""
from pathlib import Path
import bpy,bmesh,json
from mathutils import Vector
R=Path(__file__).resolve().parents[2];bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
oy=(-1.0702612+1.4376315)/2;ob=bpy.data.objects['PINTURA'];bm=bmesh.new();bm.from_mesh(ob.data)
inv=ob.matrix_world.inverted()
for v in bm.verts:
    c=ob.matrix_world@v.co;c.y+=.14*(c.x/.75)**2;v.co=inv@c
for co,no in [((0,oy+1.24,0),(0,1,0)),((0,0,1.22),(0,0,1))]:
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=inv@Vector(co),plane_no=ob.matrix_world.to_3x3().transposed()@Vector(no),dist=.000001)
for v in bm.verts:
    c=ob.matrix_world@v.co;c.y-=.14*(c.x/.75)**2;v.co=inv@c
mat=bpy.data.materials.new('Aerofólio · preto integral');mat.use_nodes=True
bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.006,.007,.010,1);bs.inputs['Roughness'].default_value=.28;bs.inputs['Metallic'].default_value=0
mat.diffuse_color=(.006,.007,.010,1);ob.data.materials.append(mat);mi=len(ob.data.materials)-1
faces=[]
for f in bm.faces:
    c=ob.matrix_world@f.calc_center_median()
    if oy-c.y<-1.240001+.14*(c.x/.75)**2 and c.z>1.220001:
        f.material_index=mi;faces.append(f)
assert len(faces)>50,len(faces)
bm.to_mesh(ob.data);bm.free();ob.data.update();bpy.context.scene['spoiler_full_black']=True
bpy.ops.wm.save_as_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
(R/'modelo/gol-refinado/validacao-aerofolio.json').write_text(json.dumps({'black_faces':len(faces),'front_seam_game_x':-1.24,'lower_boundary_m':1.22,'full_black':True,'centroid_mask_replaced':True},indent=2)+'\n')
