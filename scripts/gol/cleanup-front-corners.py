"""Remove fragmentos da grade antiga atrás das pontas da nova capa branca."""
from pathlib import Path
import bpy,bmesh
from mathutils import Vector
R=Path(__file__).resolve().parents[2];bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'));oy=(-1.0702612+1.4376315)/2
for name in ['CROMO','MISCELANEA','NEGRO','VIDRIOS']:
    ob=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(ob.data);inv=ob.matrix_world.inverted()
    for co,no in [((0,oy-1.48,0),(0,-1,0)),((0,0,.53),(0,0,1))]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=inv@Vector(co),plane_no=ob.matrix_world.to_3x3().transposed()@Vector(no),dist=.000001)
    faces=[f for f in bm.faces if oy-(ob.matrix_world@f.calc_center_median()).y>1.480001 and (ob.matrix_world@f.calc_center_median()).z<.529999]
    bmesh.ops.delete(bm,geom=faces,context='FACES');bm.to_mesh(ob.data);bm.free();ob.data.update()
bpy.ops.wm.save_as_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
