"""Ajusta curvatura e vedação do teto, fecha a calha do para-brisa e acrescenta antena."""
from pathlib import Path
import bpy,bmesh,math,numpy as np,json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[2];bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
col=bpy.data.collections['Gol recuperado do visualizador'];oy=(-1.0702612+1.4376315)/2
def world(x,y,z):return Vector((-z,oy-x,y))
skin=bpy.data.objects['PINTURA'];tree=BVHTree.FromPolygons([skin.matrix_world@v.co for v in skin.data.vertices],[list(p.vertices)for p in skin.data.polygons])
def height(x,z):
    hit=tree.ray_cast(world(x,2,z),Vector((0,0,-1)))[0]
    return hit.z if hit else None
def basis(x,z):return [1,x,z,x*x,x*z,z*z]
rows=[];ys=[]
for x in np.linspace(-.65,.26,21):
    for z in np.linspace(-.48,.48,21):
        y=height(x,z)
        if y and y>1.25:rows.append(basis(x,z));ys.append(y)
coef=np.linalg.lstsq(rows,ys,rcond=None)[0]
def roof(x,z):return float(np.dot(basis(x,z),coef))
def mesh(name,verts,faces,mat,smooth=True):
    old=bpy.data.objects.get(name)
    if old:bpy.data.objects.remove(old,do_unlink=True)
    me=bpy.data.meshes.new(name);me.from_pydata([world(*p)for p in verts],[],faces);me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
    for p in me.polygons:p.use_smooth=smooth
    ob=bpy.data.objects.new(name,me);col.objects.link(ob);me.materials.append(mat);return ob
black=bpy.data.materials['Plástico frontal · preto acetinado']
# Superfície óptica contínua: elimina a leitura dos triângulos da chapa original no reflexo.
glass=bpy.data.objects['Teto solar · vidro móvel'];inv=glass.matrix_world.inverted()
for v in glass.data.vertices:
    c=glass.matrix_world@v.co;x=oy-c.y;z=-c.x;c.z=roof(x,z)+.002;v.co=inv@c
glass.data.update()
def outline(hx,hz,r,n=24):
    pts=[]
    for x,z,a in [(hx-r,hz-r,0),(-hx+r,hz-r,math.pi/2),(-hx+r,-hz+r,math.pi),(hx-r,-hz+r,math.pi*1.5)]:
        for i in range(n):
            t=a+i/n*math.pi/2;pts.append((-.20+x+r*math.cos(t),z+r*math.sin(t)))
    return pts
outer=outline(.345,.403,.041);inner=outline(.338,.396,.034);N=len(outer)
verts=[(x,roof(x,z)+.0025,z)for contour in [outer,inner]for x,z in contour]
mesh('Moldura móvel do teto solar',verts,[(i+N,(i+1)%N+N,(i+1)%N,i)for i in range(N)],black)
seal=bpy.data.objects['Vedação fixa do teto solar']
for sp in seal.data.splines:
    for p in sp.points:
        x=oy-p.co.y;z=-p.co.x;p.co.z=roof(x,z)-.001
seal.data.bevel_depth=.0025
bpy.context.scene['sunroof_hinge_y']=roof(.145,0)+.002
# Calha preta contínua, encaixada sob o vidro e a borda traseira do capô.
for ob in list(col.objects):
    if ob.name.startswith(('Acabamento · calha','Antena tubarão ·')):bpy.data.objects.remove(ob,do_unlink=True)
win=bpy.data.objects['VIDRIOS'];edge={}
for v in win.data.vertices:
    c=win.matrix_world@v.co;x=oy-c.y;z=-c.x
    if .7<x<1.2 and .915<c.z<.92:edge[round(z,4)]=(x,c.z,z)
edge=sorted(edge.values(),key=lambda p:p[2]);assert len(edge)>=15
verts=[]
for k in range(5):
    t=k/4
    for x,y,z in edge:
        x0=x-.005;x1=x+.10;y1=height(x1,z) or y-.012
        verts.append((x0+(x1-x0)*t,y-.001+(y1-y-.001)*t-.008*math.sin(t*math.pi),z))
calha=black.copy();calha.name='Calha do para-brisa · acabamento externo'
n=len(edge);mesh('Acabamento · calha sob para-brisa',verts,[(k*n+i,k*n+i+1,(k+1)*n+i+1,(k+1)*n+i)for k in range(4)for i in range(n-1)],calha)
# Antena branca pequena no centro do teto, à frente do aerofólio e atrás do curso do vidro.
paint=bpy.data.materials['Para-choque · branco da carroceria']
cx=-1.14
# Secções elípticas em alturas progressivas; topo recuado como a peça fotografada.
profiles=[(0,.080,.034,0),(.006,.079,.033,0),(.020,.061,.024,-.008),(.048,.037,.014,-.020),(.078,.012,.004,-.027),(.084,.001,.001,-.027)]
verts=[];segments=48
for h,hx,hz,shift in profiles:
    for i in range(segments):
        t=i/segments*math.tau;x=cx+shift+hx*math.cos(t);z=hz*math.sin(t)
        verts.append((x,(height(x,z) or roof(x,z))+h+.001,z))
faces=[]
for k in range(len(profiles)-1):
    for i in range(segments):j=(i+1)%segments;faces.append((k*segments+i,k*segments+j,(k+1)*segments+j,(k+1)*segments+i))
mesh('Antena tubarão · branca central',verts,faces,paint)
report={'glass_surface':'quadrática contínua sobre a curvatura do teto','roof_fit_rms_mm':float(np.sqrt(np.mean((np.array(rows)@coef-ys)**2))*1000),'glass_offset_mm':2,'moving_frit_width_mm':7,'fixed_seal_radius_mm':2.5,'cowl_closed':True,'antenna_center_game_x':cx,'antenna_center_game_z':0,'antenna_dimensions_m':[.16,.084,.068],'glass_open_rear_x':-.20-.345-.47,'antenna_front_x':cx+.08}
(R/'modelo/gol-refinado/validacao-teto-e-calha.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'));print(json.dumps(report))
