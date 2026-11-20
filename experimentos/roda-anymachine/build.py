"""Teste local com AnyMachine, sem alterar o Gol.

Peças: face usinada medida na foto, tambor, lábios, dez apoios grafite,
pneu, quatro alojamentos e parafusos, calota e emblema fotografado.
Eixo Z aponta para fora; origem no eixo. Dimensões estimadas, não para fabricação.
O módulo hs.py do AnyMachine constrói lathes, prismas, cilindros e toros.
Os vazados da face são contornos medidos, não uma textura da roda inteira.
"""
from pathlib import Path
import sys, math, json, argparse, hashlib
import bpy, bmesh, cv2, numpy as np
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE / 'vendor'))
import hs

parser = argparse.ArgumentParser()
parser.add_argument('--render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:])
OUT = HERE / 'resultado'; OUT.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.unit_settings.system = 'METRIC'
builder = hs.Build('RodaGol_AnyMachine')
R = .234

def material(key, rgb, metal, rough):
    m = builder.mat(key); m.diffuse_color = (*rgb, 1)
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    return m

silver = material('Aluminio usinado', (.72,.74,.77), 1, .20)
graphite = material('Grafite acetinado', (.027,.032,.038), .55, .31)
rubber = material('Borracha', (.004,.005,.006), 0, .86)
rubber.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.23
black = material('Preto recessos', (.006,.008,.010), .1, .44)
chrome = material('Cromo', (.8,.83,.88), 1, .15)
# Marcas finas de usinagem e borracha no arquivo editável; GLB usa materiais PBR simples.
for m, scale, strength, distance in [(silver,1800,.10,.00008),(rubber,240,.22,.00024)]:
    nt=m.node_tree; noise=nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value=scale
    bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=strength
    bump.inputs['Distance'].default_value=distance
    nt.links.new(noise.outputs['Fac'],bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'],nt.nodes['Principled BSDF'].inputs['Normal'])

def smooth(o):
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:]);bm.to_mesh(o.data);bm.free()
    hs._normals(o,38)
    return o

def lathe(name, profile, mat, n=192):
    return smooth(builder.lathe(name,profile,n=n,mat=mat,phase=0))

# Medição em pixels da referência frontal: centro e raios elípticos da borda.
im=cv2.imread(str(ROOT/'RodaGol.png'))
yy,xx=np.indices(im.shape[:2]); rr=np.hypot((xx-627)/510,(yy-639)/517)
gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
mask=((gray<110)&(rr<.975)&(rr>.27)).astype('uint8')*255
mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
_,lab,stats,_=cv2.connectedComponentsWithStats(mask)
windows=[]
overlay=im.copy()
for i,st in enumerate(stats):
    if not 25000<st[4]<80000:continue
    cs,_=cv2.findContours((lab==i).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    c=max(cs,key=cv2.contourArea)
    c=cv2.approxPolyDP(c,1.7,True).reshape(-1,2)
    cv2.polylines(overlay,[c],True,(50,210,255),3)
    windows.append([((float(x)-627)/510*R,(639-float(y))/517*R)for x,y in c])
assert len(windows)==10, f'Esperados dez vazados: {len(windows)}'
cv2.imwrite(str(HERE/'referencias'/'contornos-medidos.jpg'),overlay)

def circle(cx,cy,r,n=128):
    return [(cx+r*math.cos(i*math.tau/n),cy+r*math.sin(i*math.tau/n))for i in range(n)]

holes=list(windows)
bolts=[]
for k in range(4):
    a=math.radians(45+90*k); x,y=.05*math.cos(a),.05*math.sin(a)
    bolts.append((x,y));holes.append(circle(x,y,.0145,64))
holes.append(circle(0,0,.0275,96))
cu=bpy.data.curves.new('Face medida nas fotos','CURVE')
cu.dimensions='2D';cu.fill_mode='BOTH';cu.extrude=.010;cu.bevel_depth=.00085;cu.bevel_resolution=2
for outline in [circle(0,0,R,256)]+holes:
    s=cu.splines.new('POLY');s.points.add(len(outline)-1)
    for p,(x,y)in zip(s.points,outline):p.co=(x,y,0,1)
    s.use_cyclic_u=True
face=bpy.data.objects.new('Face usinada · dez vazados reais',cu);sc.collection.objects.link(face)
bpy.context.view_layer.objects.active=face;face.select_set(True)
bpy.ops.object.convert(target='MESH');face.select_set(False)
face.data.materials.append(silver);face.data.materials.append(graphite)
for p in face.data.polygons:p.material_index=0 if p.normal.z>.65 else 1
bm=bmesh.new();bm.from_mesh(face.data)
bmesh.ops.triangulate(bm,faces=bm.faces[:])
for _ in range(4):
    edges=[e for e in bm.edges if e.calc_length()>.022]
    if not edges:break
    bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=False)
    bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>3])
bm.to_mesh(face.data);bm.free()
for v in face.data.vertices:
    r=math.hypot(v.co.x,v.co.y)
    v.co.z+=.090-.015*max(0,1-r/R)**1.2
smooth(face)

lathe('Tambor grafite',[(.222,.089),(.213,.066),(.205,.035),(.205,-.084),(.217,-.096),(.224,-.094),(.215,-.080),(.214,.032),(.224,.080),(.222,.089)],'Grafite acetinado')
lathe('Labio frontal polido',[(.228,.089),(.234,.091),(.236,.089),(.236,.084),(.233,.081),(.228,.083),(.228,.089)],'Aluminio usinado')
lathe('Labio traseiro',[(.214,-.096),(.234,-.097),(.235,-.090),(.224,-.088),(.214,-.096)],'Grafite acetinado')

# Dois apoios estreitos em cada janela triangular, rebaixados atrás da face.
for k in range(5):
    a=math.radians(54+72*k)
    for sg in (-1,1):
        start=Vector((.105*math.cos(a),.105*math.sin(a)))
        end=Vector((.221*math.cos(a+sg*math.radians(14)),.221*math.sin(a+sg*math.radians(14))))
        d=(end-start).normalized();n=Vector((-d.y,d.x))
        poly=[start-n*.0038,end-n*.0065,end+n*.0065,start+n*.0038]
        o=builder.prism(f'Apoio grafite {k+1}.{sg}',(0,0,0),(1,0,0),(0,1,0),poly,.040,.071,mat='Grafite acetinado',bev=.0012)
        smooth(o)

profile=[(.234,-.087),(.243,-.101),(.261,-.106),(.276,-.094),(.282,-.078)]
for z in [-.060,-.020,.020,.060]:
    profile += [(.283,z-.005),(.279,z-.003),(.279,z+.003),(.283,z+.005)]
profile +=[(.282,.078),(.276,.094),(.261,.106),(.243,.101),(.234,.087),(.231,.070),(.231,-.070),(.234,-.087)]
lathe('Pneu · perfil e sulcos',profile,'Borracha',256)
for sg in (-1,1):
    for r,z in [(.244,.103),(.269,.101)]:
        smooth(builder.torus('Friso lateral pneu',(0,0,z*sg),r,.00065,n=192,m=6,mat='Borracha'))

for i,(x,y) in enumerate(bolts):
    # O fundo é rebaixado, preservando o aspecto escuro da fotografia.
    o=lathe(f'Alojamento parafuso {i+1}',[(.0138,.080),(.0125,.071),(.0098,.046),(.007,.045),(.007,.040),(.014,.040),(.014,.080),(.0138,.080)],'Preto recessos',64)
    o.location=(x,y,0)
    o=builder.cyl(f'Parafuso sextavado {i+1}',(x,y,.038),(x,y,.050),.0076,n=6,mat='Grafite acetinado',bev=.0006)
    smooth(o)

lathe('Calota preta',[(0,.062),(.027,.062),(.028,.077),(.027,.081),(0,.081)],'Preto recessos',96)
smooth(builder.torus('Aro emblema',(0,0,.082),.0268,.0011,n=128,m=8,mat='Cromo'))
# Somente o emblema é uma textura fotográfica; raios, vazados e pneu são geometria.
logo=Image.open(ROOT/'RodaGol.png').convert('RGB').crop((575,588,679,692))
logo.save(OUT/'emblema.png')
m=material('Emblema fotografico',(.8,.8,.8),.5,.23)
tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=bpy.data.images.load(str(OUT/'emblema.png'));tx.image.pack()
m.node_tree.links.new(tx.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
verts=[(0,0,.0825)]+[(.0257*math.cos(a),.0257*math.sin(a),.0825)for a in np.linspace(0,math.tau,129)[:-1]]
me=bpy.data.meshes.new('Disco UV emblema');me.from_pydata(verts,[],[(0,1+i,1+(i+1)%128)for i in range(128)])
uv=me.uv_layers.new(name='UVMap')
for l in me.loops:
    v=me.vertices[l.vertex_index].co;uv.data[l.index].uv=(v.x/.0514+.5,v.y/.0514+.5)
logo_ob=bpy.data.objects.new('Emblema VW',me);sc.collection.objects.link(logo_ob);me.materials.append(m)

parts=[o for o in sc.objects if o.type=='MESH']
root=bpy.data.objects.new('Roda · controle giro 0 a 1',None);sc.collection.objects.link(root)
root['giro']=0.;root.id_properties_ui('giro').update(min=0,max=1,description='Uma volta completa; eixo Z local')
spin=bpy.data.objects.new('Eixo de rotacao',None);sc.collection.objects.link(spin);spin.parent=root
for ob in parts:ob.parent=spin
for f,v in [(1,0.),(121,1.)]:
    root['giro']=v;root.keyframe_insert(data_path='["giro"]',frame=f)
    spin.rotation_euler.z=v*math.tau;spin.keyframe_insert(data_path='rotation_euler',index=2,frame=f)
for ob in [root,spin]:
    for fc in ob.animation_data.action.fcurves if hasattr(ob.animation_data.action,'fcurves') else []:
        for k in fc.keyframe_points:k.interpolation='LINEAR'
drv=spin.driver_add('rotation_euler',2).driver
drv.expression='giro * 6.283185307179586'
v=drv.variables.new();v.name='giro';v.targets[0].id=root;v.targets[0].data_path='["giro"]'
sc.frame_start=1;sc.frame_end=121;sc.render.fps=30;sc.frame_set(1)

# Estúdio isolado em coleção separada.
studio=bpy.data.collections.new('Estudio · fora da exportacao');sc.collection.children.link(studio)
def move_to_studio(ob):
    for c in list(ob.users_collection):c.objects.unlink(ob)
    studio.objects.link(ob)
def camera(name,loc,target=(0,0,0),scale=.68):
    data=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,data);studio.objects.link(ob)
    ob.location=loc;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO';data.ortho_scale=scale;return ob
front=camera('Frente ortografica',(0,0,2),scale=.66)
three=camera('Tres quartos',(.85,.48,1.55),scale=.72)
side=camera('Perfil',(1.8,0,.12),scale=.68)
for name,loc,power,size,color in [('Softbox esquerdo',(-.7,.7,1.2),45,.9,(.85,.92,1)),('Softbox direito',(.8,.1,.8),30,.7,(1,.92,.82)),('Faixa superior',(.1,1.1,.3),45,.55,(1,1,1)),('Softbox frontal',(0,0,1.2),22,1.0,(1,1,1))]:
    ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.shape='DISK';ld.size=size;ld.color=color
    ob=bpy.data.objects.new(name,ld);studio.objects.link(ob);ob.location=loc
    ob.rotation_euler=(-ob.location).to_track_quat('-Z','Y').to_euler()
sc.world=bpy.data.worlds.new('Estudio neutro');sc.world.use_nodes=True
sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.15,.19,1)
sc.world.node_tree.nodes['Background'].inputs[1].default_value=.45
sc.render.engine='CYCLES';sc.cycles.samples=40;sc.cycles.use_denoising=True
sc.render.threads_mode='FIXED';sc.render.threads=6
sc.render.resolution_x=1100;sc.render.resolution_y=1100;sc.render.resolution_percentage=100
sc.render.film_transparent=True;sc.render.image_settings.file_format='PNG'
sc.view_settings.view_transform='AgX';sc.camera=three

# O formato atual de Actions usa slots/layers; ajusta a interpolação também neles.
for ob in [root,spin]:
    ac=ob.animation_data.action
    for layer in ac.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in bag.fcurves:
                    for k in fc.keyframe_points:k.interpolation='LINEAR'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'roda-gol-anymachine.blend'))
# O GLB recebe animação explícita de transformação, sem depender de driver Blender.
spin.driver_remove('rotation_euler',2)
bpy.ops.object.select_all(action='DESELECT')
for ob in parts+[root,spin]:ob.select_set(True)
bpy.context.view_layer.objects.active=spin
bpy.ops.export_scene.gltf(filepath=str(OUT/'roda-gol-anymachine.glb'),export_format='GLB',use_selection=True,export_animations=True,export_force_sampling=True,export_frame_range=True,export_apply=True,export_extras=True)
triangles=0
for ob in parts:ob.data.calc_loop_triangles();triangles+=len(ob.data.loop_triangles)
report={'source':'https://github.com/apekshik/anymachine','commit':'d5e8889eef0b33e0bbe62ddca6f713f94b154b68','helper':'hardsurface/dugout_blender/props_hand/_common/hs.py','meshes':len(parts),'triangles_before_export':triangles,'windows_measured':len(windows),'bolt_holes':4,'rim_diameter_estimate_m':2*R,'tire_diameter_estimate_m':.566,'tire_width_estimate_m':.212,'notes':['Escala e profundidade estimadas; não é projeto de fabricação.','Somente o emblema usa recorte da fotografia.','Shaders procedurais de microtextura ficam no Blender; GLB usa PBR simples.','Verso inferido, sulcos simplificados, sem marcações laterais do pneu.']}
(OUT/'stats.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
if args.render:
    for cam,name in [(front,'frente'),(three,'tres-quartos'),(side,'perfil')]:
        sc.camera=cam;sc.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
    bg=Image.new('RGB',(1600,900),'#151b24');d=ImageDraw.Draw(bg)
    font='/System/Library/Fonts/Supplemental/Arial.ttf'
    d.text((48,30),'REFERENCIA',font=ImageFont.truetype(font,23),fill='#abb7c8')
    d.text((848,30),'TESTE 3D · ANYMACHINE',font=ImageFont.truetype(font,23),fill='#abb7c8')
    for path,x in [(ROOT/'RodaGol.png',30),(OUT/'frente.png',830)]:
        img=Image.open(path).convert('RGBA');img.thumbnail((740,740));bg.paste(img,(x+(740-img.width)//2,95+(740-img.height)//2),img)
    d.text((48,851),'Modelo local · medidas e profundidade aproximadas',font=ImageFont.truetype(font,19),fill='#abb7c8')
    bg.save(OUT/'comparacao.jpg',quality=94)
print(json.dumps(report,ensure_ascii=False),flush=True)
