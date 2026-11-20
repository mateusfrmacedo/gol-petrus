"""Conferência geométrica: vão real, roda plana, volumes frontais e teto no Blender/jogo."""
from pathlib import Path
import bpy,bmesh,numpy as np,json,math,re
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];oy=(-1.0702612+1.4376315)/2
bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
for name in ['PINTURA','NEGRO']:
 ob=bpy.data.objects[name];dg=bpy.context.evaluated_depsgraph_get();ev=ob.evaluated_get(dg);me=ev.to_mesh();tree=BVHTree.FromPolygons([ob.matrix_world@v.co for v in me.vertices],[list(f.vertices)for f in me.polygons])
 for x in [-.45,-.20,.08]:
  for z in [-.25,0,.25]:
   hit=tree.ray_cast(Vector((-z,oy-x,2)),Vector((0,0,-1)))[0]
   assert hit is None or hit.z<1.20,(name,x,z,hit)
 ev.to_mesh_clear()
me=bpy.data.objects['Liga · raios e quatro furos traçados'].data
faces=[p for p in me.polygons if p.material_index==0 and p.normal.z>.97 and p.area>1e-7]
error=math.sqrt(np.average([(p.center.z-.095)**2 for p in faces],weights=[p.area for p in faces]));assert error<.0007,error
front=bpy.data.materials['VW frontal · preto sobre branco'].node_tree.nodes.get('Principled BSDF');assert front.inputs['Metallic'].default_value==0
front_parts=bpy.data.collections['Gol recuperado do visualizador'].objects
central=[o for o in front_parts if o.name.startswith('Frente · lâmina central horizontal')]
lateral=[o for o in front_parts if o.name.startswith('Frente · lâmina lateral')]
dividers=[o for o in front_parts if o.name.startswith('Frente · divisória branca inclinada')]
assert len(central)==3 and len(lateral)==6 and len(dividers)==2
for o in central+lateral+dividers:
 bm=bmesh.new();bm.from_mesh(o.data);assert all(e.is_manifold for e in bm.edges);bm.free();assert min(o.dimensions)>.003
shell=[]
for name in ['PINTURA','VIDRIOS']:
 ob=bpy.data.objects[name];ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();shell.append(BVHTree.FromPolygons([ob.matrix_world@v.co for v in me.vertices],[list(f.vertices)for f in me.polygons]));ev.to_mesh_clear()
bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/gol-refinado/gol-modular.blend'))
for ob in bpy.context.scene.objects:
 if ob.type!='MESH' or ob.get('game_target')!='body' or not ob.name.startswith('teto.'):continue
 for v in ob.data.vertices:
  p=ob.matrix_world@v.co;hits=[t.ray_cast(Vector((p.y,oy-p.x,2)),Vector((0,0,-1)))[0]for t in shell];heights=[h.z for h in hits if h is not None]
  assert not heights or p.z<=max(heights)+.003,(ob.name,tuple(p),max(heights))

source=json.loads((R/'modelo/gol-refinado/geometry-source.json').read_text());cfg=source['gol']['sunroof'];root=bpy.data.objects['Gol · controles'];B=np.array([[1,0,0,0],[0,0,-1,0],[0,1,0,0],[0,0,0,1]])
def smooth(t):return t*t*(3-2*t)
for u in [0,.1,.2,.5,1]:
 root['teto_solar']=float(u);root.update_tag();bpy.context.scene.frame_set(1);bpy.context.view_layer.update();s=smooth(max(0,min(1,(u-.2)/.8)));h=smooth(max(0,min(1,u/.2)))
 for name,angle,travel,lift in [('Teto · vidro e moldura móveis',cfg['angle']*s,cfg['travel']*s,cfg['lift']*h),('Teto · defletor frontal',-.8*h,0,0)]:
  px,py=cfg['frontX'],cfg['hingeY'];c=math.cos(angle);sn=math.sin(angle);m=np.eye(4);m[:2,:2]=[[c,-sn],[sn,c]];m[0,3]=px-c*px+sn*py-travel;m[1,3]=py-sn*px-c*py+lift
  ob=bpy.data.objects[name].evaluated_get(bpy.context.evaluated_depsgraph_get());err=np.max(np.abs(np.array(ob.matrix_world)-B@m@B.T));assert err<2e-6,(name,u,err)
print(f'PASS: roof has no hidden floor, three central/six lateral blades and two solid dividers, nonmetallic front badge, wheel face RMS {error*1000:.3f} mm and Blender/game sunroof poses match.')
