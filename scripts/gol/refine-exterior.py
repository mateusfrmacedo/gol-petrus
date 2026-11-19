"""Corrige teto, face plana da roda, emblema frontal e detalhes do para-choque.
Parte da cópia-base preservada; não executa operações no Civic.
"""
from pathlib import Path
import bpy,bmesh,numpy as np,math,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[2];source=R/'.local-backups/exterior-2026-11-19/gol-branco.blend';out=R/'modelo/blender/gol-branco.blend'
bpy.ops.wm.open_mainfile(filepath=str(source));col=bpy.data.collections['Gol recuperado do visualizador'];oy=(-1.0702612+1.4376315)/2
B=np.array([[0,0,-1],[-1,0,0],[0,1,0]],float)
def world(v):x,y,z=v;return Vector((-z,oy-x,y))
def material(name,color,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;m.diffuse_color=(*color,1);return m
black=material('Plástico frontal · preto acetinado',(.009,.011,.013),.48)
paint=material('Branco do para-choque · aletas',(.74,.76,.78),.23)
chrome=material('Refletor do neblina',(.3,.33,.35),.22,.6)
lens=material('Lente neblina · branca',(.70,.80,.82),.12,.15)
def tree_for(ob):
 e=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());me=e.to_mesh();t=BVHTree.FromPolygons([ob.matrix_world@v.co for v in me.vertices],[list(p.vertices)for p in me.polygons]);e.to_mesh_clear();return t
roof_tree=tree_for(bpy.data.objects['PINTURA'])
def roof_y(x,z):
 hit=roof_tree.ray_cast(world((x,2,z)),Vector((0,0,-1)))[0]
 if hit is None:raise RuntimeError('Amostra do teto sem superfície')
 return hit.z
# Rounded rectangle in game X/Z: same outline for the real hole, moving glass and fixed seal.
# Correct orientation by constructing an ordinary rounded perimeter with x=cos, z=sin.
def outline(hx,hz,r,n=12,cx=-.20):
 pts=[]
 for x,z,a in [(hx-r,hz-r,0),(-hx+r,hz-r,math.pi/2),(-hx+r,-hz+r,math.pi),(hx-r,-hz+r,math.pi*1.5)]:
  # centres ordered from +X,+Z anticlockwise; angle spans each outward corner.
  for i in range(n):
   t=a+i/n*math.pi/2;pts.append((cx+x+r*math.cos(t),z+r*math.sin(t)))
 return pts
opening=outline(.333,.390,.036)
verts=[world((x,y,z))for y in [1.28,1.56]for x,z in opening];n=len(opening)
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)]
me=bpy.data.meshes.new('Vão real do teto');me.from_pydata(verts,[],faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free();cutter=bpy.data.objects.new('Corte temporário do teto',me);col.objects.link(cutter)
for name in ['PINTURA','NEGRO']:
 ob=bpy.data.objects[name];bpy.context.view_layer.objects.active=ob;mod=ob.modifiers.new('Abertura real do teto solar','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.use_hole_tolerant=True;mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name)
 # The imported shell is open underneath; Boolean can cap the cut at its lower plane.
 # Delete that generated floor: an opening must reveal the cabin rather than another white sheet.
 bm=bmesh.new();bm.from_mesh(ob.data)
 caps=[f for f in bm.faces if all(abs((ob.matrix_world@v.co).z-1.28)<1e-5 for v in f.verts)]
 bmesh.ops.delete(bm,geom=caps,context='FACES');bm.to_mesh(ob.data);bm.free();ob.data.update()
 t=tree_for(ob);hit=t.ray_cast(world((-.20,2,0)),Vector((0,0,-1)))[0];assert hit is None or hit.z<1.20,(name,hit)
bpy.data.objects.remove(cutter,do_unlink=True)
for name in ['Teto solar basculado','Vedação do teto solar']:
 bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)
glass=material('Vidro escuro do teto solar',(.075,.095,.11),.12);glass.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=.45
# Dense curved patch follows the actual roof before its opening was cut.
edge=outline(.345,.403,.041,n=16);verts=[world((-.20,roof_y(-.20,0)+.004,0))];faces=[]
# Concentric rings preserve curvature without a flat fan over the roof crown.
for ring in range(1,13):
 f=ring/12
 for x,z in edge:
  xx=-.20+(x+.20)*f;zz=z*f;verts.append(world((xx,roof_y(xx,zz)+.004,zz)))
N=len(edge)
for j in range(N):faces.append((0,1+j,1+(j+1)%N))
for ring in range(1,12):
 a=1+(ring-1)*N;b=a+N
 for j in range(N):k=(j+1)%N;faces.append((a+j,b+j,b+k,a+k))
me=bpy.data.meshes.new('Vidro curvo · chapa de 4 mm');me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new('Teto solar · vidro móvel',me);col.objects.link(ob);me.materials.append(glass)
# Ensure outward normals and a thin sealed edge.
import bmesh
bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
if sum(p.normal.z for p in me.polygons)<0:
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.reverse_faces(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
for p in me.polygons:p.use_smooth=True
solid=ob.modifiers.new('Espessura do vidro','SOLIDIFY');solid.thickness=.004;solid.offset=-1

def seal(name,hx,hz,r,height,tube):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=tube;cu.bevel_resolution=2;s=cu.splines.new('POLY');pts=outline(hx,hz,r,n=20);s.points.add(len(pts)-1)
 for p,(x,z)in zip(s.points,pts):p.co=(*world((x,roof_y(x,z)+height,z)),1)
 s.use_cyclic_u=True;ob=bpy.data.objects.new(name,cu);col.objects.link(ob);cu.materials.append(black)
seal('Vedação fixa do teto solar',.344,.402,.041,.0005,.004)
seal('Moldura móvel do teto solar',.340,.398,.039,.006,.0025)
# Flatten the existing spoke face, preserving holes, side thickness and bevels.
main=bpy.data.objects['Liga · raios e quatro furos traçados'].data
ff=[p for p in main.polygons if p.normal.z>.95 and p.area>1e-7 and p.material_index==0];power=1.6
A=np.array([[1,np.mean([math.hypot(main.vertices[i].co.x,main.vertices[i].co.y)**power for i in p.vertices])]for p in ff]);z=np.array([p.center.z for p in ff]);w=np.array([p.area for p in ff]);coef=np.linalg.lstsq(A*w[:,None]**.5,z*w**.5,rcond=None)[0]
plane=.095
for name in ['Liga · raios e quatro furos traçados','Nervuras e rebaixos grafite']:
 me=bpy.data.objects[name].data
 for v in me.vertices:v.co.z+=plane-coef[0]-coef[1]*math.hypot(v.co.x,v.co.y)**power
 me.normals_split_custom_set([(0,0,0)]*len(me.loops));me.update()
cap=bpy.data.objects['Calota VW'];cap.location.z+=plane-max(v.co.z for v in cap.data.vertices)
for ob in bpy.data.collections['Roda 17 · fonte editável'].objects:
 if ob.name.startswith('Parafuso recuado'):
  # Holes are in the same plane as the flattened centre; preserve bolt geometry.
  coords=[v.co for v in ob.data.vertices];r=np.mean([math.hypot(v.x,v.y)for v in coords]);ob.location.z+=plane-coef[0]-coef[1]*r**power
# Front emblem uses the same black-on-white inversion already used on the rear badge.
logos=bpy.data.objects['LOGOS'];m=logos.data.materials[0].copy();m.name='VW frontal · preto sobre branco';b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Metallic'].default_value=0;b.inputs['Roughness'].default_value=.40
if b.inputs['Base Color'].is_linked:
 old=b.inputs['Base Color'].links[0].from_socket;inv=m.node_tree.nodes.new('ShaderNodeInvert');inv.inputs[0].default_value=1;m.node_tree.links.new(old,inv.inputs['Color']);m.node_tree.links.new(inv.outputs['Color'],b.inputs['Base Color'])
logos.data.materials.append(m);mi=len(logos.data.materials)-1
for p in logos.data.polygons:
 center=logos.matrix_world@p.center
 if oy-center.y>1.85:p.material_index=mi
# Satin black lower grille, instead of the old metallic blue reflection.
for name in ['CROMO','MISCELANEA','NEGRO']:
 ob=bpy.data.objects[name];ob.data.materials.append(black);mi=len(ob.data.materials)-1
 for p in ob.data.polygons:
  c=ob.matrix_world@p.center;x=oy-c.y
  if x>1.65 and .23<c.z<.49:p.material_index=mi
# Real volumes for the white tapered fins and recessed round fog lamps; no black rectangular overlays.
def mesh(name,points,faces,mat):
 me=bpy.data.meshes.new(name);me.from_pydata([world(p)for p in points],[],faces);me.update();ob=bpy.data.objects.new(name,me);col.objects.link(ob);me.materials.append(mat);return ob
# Stable front skin: match the upper/lower rim around the recess, not its deep background.
paint_tree=tree_for(bpy.data.objects['PINTURA'])
def frontx(y,z):
 hit=paint_tree.ray_cast(world((2.3,y,z)),Vector((0,1,0)))[0]
 return oy-hit.y if hit is not None else 1.9
for sg in [-1,1]:
 for k in range(3):
  y=.281+k*.047;z0=.506;z1=.624-k*.004
  profile=[(y-.006,z0),(y+.006,z0),(y+.002,z1),(y-.002,z1)]
  points=[]
  for off in [-.012,.004]:
   for yy,zz in profile:
    x=max(frontx(.24,sg*zz),frontx(.43,sg*zz));points.append((x+off,yy,sg*zz))
  ob=mesh(f'Frente · aleta {sg} {k}',points,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],paint)
  b=ob.modifiers.new('Arestas arredondadas','BEVEL');b.width=.0015;b.segments=3
 # Profile along the lamp axis, including the reflector cup and domed lens.
 center=np.array([1.817,.338,sg*.681]);normal=np.array([1,0,sg*.8]);normal/=np.linalg.norm(normal);u=np.array([0,1,0]);v=np.cross(normal,u)
 def revolve(name,profile,mat):
  points=[];faces=[];segments=64
  for depth,radius in profile:
   for j in range(segments):
    a=j/segments*math.tau;points.append((center+normal*depth+u*(math.cos(a)*radius)+v*(math.sin(a)*radius)).tolist())
  for i in range(len(profile)-1):
   for j in range(segments):k=(j+1)%segments;faces.append((i*segments+j,i*segments+k,(i+1)*segments+k,(i+1)*segments+j))
  ob=mesh(f'Frente · {name} {sg}',points,faces,mat)
  for p in ob.data.polygons:p.use_smooth=True
 revolve('moldura neblina',[(-.035,.054),(-.005,.063),(.0,.063),(.003,.055),(-.008,.052)],black)
 revolve('refletor neblina',[(-.025,.012),(-.018,.033),(-.005,.050),(.002,.053)],chrome)
 revolve('lente neblina',[(.002,.048),(.005,.041),(.008,.027),(.009,.001)],lens)
# Scene metadata used by the exporter and opening animation.
bpy.context.scene['exterior_reference_revision']=2;bpy.context.scene['sunroof_hinge_y']=roof_y(.145,0)+.004
report={'roof_opening_m':[.666,.780],'roof_glass_m':[.690,.806],'roof_sheet_removed':True,'wheel_face_plane_m':plane,'wheel_fit_power':power,'wheel_fit_coefficients':coef.tolist(),'wheel_planarity_rms_mm':float(np.sqrt(np.average((A@coef-z)**2,weights=w))*1000),'front_badge':'black on white','front_bumper':'recessed fog lamps and tapered solid white fins'}
(R/'modelo/gol-refinado/validacao-exterior.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(out));print(json.dumps(report))
