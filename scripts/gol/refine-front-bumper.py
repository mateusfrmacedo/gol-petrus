"""Reconstrói a frente inferior do Gol a partir da referência de 20/11/2026.

Os contornos são traçados na foto e projetados numa superfície curva em metros.
Grade, divisórias, recessos, lâminas e conjunto óptico são geometria separada.
Reexecutável a partir da cópia anterior à revisão; não opera sobre o Civic.
"""
from pathlib import Path
import bpy, bmesh, math, json
from mathutils import Vector
from mathutils.bvhtree import BVHTree

R = Path(__file__).resolve().parents[2]
SOURCE = R / '.local-backups/bumper-2026-11-20/gol-branco.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
COL = bpy.data.collections['Gol recuperado do visualizador']
OY = (-1.0702612 + 1.4376315) / 2

def world(x, y, z):
    return (-z, OY-x, y)

def material(name, color, rough=.4, metal=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*color, 1)
    return m

paint = material('Para-choque · branco da carroceria', (.74,.76,.78), .25)
black = material('Para-choque · ABS preto acetinado', (.009,.011,.013), .34)
deep = material('Para-choque · fundo dos recessos', (.003,.004,.005), .85)
edge = material('Para-choque · bordas das lâminas', (.018,.021,.024), .27)
reflector = material('Neblina · refletor facetado', (.70,.73,.76), .13, .95)
glass = material('Neblina · vidro incolor', (.63,.69,.72), .11, .20)
bulb = material('Neblina · bulbo e escudo', (.09,.11,.13), .17, .8)
skin=bpy.data.objects['PINTURA']
skin_tree=BVHTree.FromPolygons([skin.matrix_world@v.co for v in skin.data.vertices],
    [list(p.vertices)for p in skin.data.polygons])
def original_front(z,y):
    hit=skin_tree.ray_cast(Vector(world(2.4,y,z)),Vector((0,1,0)))[0]
    return OY-hit.y if hit is not None else 1.48

# Remove os detalhes anteriores e recorta apenas a frente inferior da base.
for ob in list(COL.objects):
    if ob.name.startswith('Frente ·'):
        bpy.data.objects.remove(ob, do_unlink=True)
removed = {}
for ob in list(COL.objects):
    if ob.type != 'MESH':
        continue
    bm = bmesh.new(); bm.from_mesh(ob.data)
    inv = ob.matrix_world.inverted()
    cut_x=1.65 if ob.name=='PINTURA' else 1.48
    # Os dois cortes mantêm as UVs das superfícies originais preservadas.
    for pos, normal in [(world(cut_x,0,0),(0,-1,0)), (world(0,.53,0),(0,0,1))]:
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
            plane_co=inv@Vector(pos), plane_no=ob.matrix_world.to_3x3().transposed()@Vector(normal),
            dist=.000001, clear_inner=False, clear_outer=False)
    cut = [f for f in bm.faces if (OY-(ob.matrix_world@f.calc_center_median()).y)>cut_x+.00001
           and (ob.matrix_world@f.calc_center_median()).z<.529999]
    if ob.name in ['NEGRO','MISCELANEA']:
        cut+= [f for f in bm.faces if f not in cut
            and OY-(ob.matrix_world@f.calc_center_median()).y>1.55
            and (ob.matrix_world@f.calc_center_median()).z<.24
            and abs((ob.matrix_world@f.calc_center_median()).x)>.77]
    if cut:
        removed[ob.name] = len(cut)
        bmesh.ops.delete(bm, geom=cut, context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(ob.data); ob.data.update()
    bm.free()

def halfwidth(y):
    hit=skin_tree.ray_cast(Vector(world(1.65,max(.215,min(.53,y)),1)),Vector((1,0,0)))[0]
    return -hit.x if hit is not None else .82

def front(z, y):
    # Frente convexa: acompanha a largura real da carroceria e retorna nas quinas.
    if y>=.49:
        return original_front(z,y)
    hw=halfwidth(y)
    delta=-.045*((y-.49)/.30)**2
    base=original_front(z,.49)+delta
    return base+(1.65-original_front(hw,.49)-delta)*(abs(z)/hw)**8

def point(u, v, depth=0):
    y = .195+(700-v)*.00075
    z = (u-1086)/1066*halfwidth(y)
    return (front(z,y)+depth, y, z)

def mesh(name, verts, faces, mat, smooth=False, bevel=0):
    me = bpy.data.meshes.new(name)
    me.from_pydata([world(*p) for p in verts], [], faces); me.update()
    ob = bpy.data.objects.new('Frente · '+name, me); COL.objects.link(ob)
    me.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
    for p in me.polygons: p.use_smooth=smooth
    if bevel:
        b=ob.modifiers.new('Arestas moldadas','BEVEL');b.width=bevel;b.segments=3
        n=ob.modifiers.new('Normais das superfícies','WEIGHTED_NORMAL');n.keep_sharp=True
    return ob

def strip(name, a, b, mat, depth=0, back=.007):
    """Faixa curva sólida entre duas linhas de contorno com amostragem igual."""
    n=len(a); verts=[point(*p,depth+d) for d in [0,-back] for line in [a,b] for p in line]
    faces=[]
    for i in range(n-1):
        faces.extend([(i,i+1,n+i+1,n+i),(2*n+i,3*n+i,3*n+i+1,2*n+i+1),
                      (i,2*n+i,2*n+i+1,i+1),(n+i,n+i+1,3*n+i+1,3*n+i)])
    faces.extend([(0,n,3*n,2*n),(n-1,3*n-1,4*n-1,2*n-1)])
    ob=mesh(name,verts,faces,mat,False)
    for i in range(n-1): ob.data.polygons[i*4].use_smooth=True
    return ob

def line(points, count=100):
    # Interpolação por comprimento em pixels, sem mudar os pontos traçados.
    lengths=[0]
    for a,b in zip(points,points[1:]):lengths.append(lengths[-1]+math.dist(a,b))
    result=[]
    for k in range(count):
        d=lengths[-1]*k/(count-1)
        i=next((i for i in range(len(lengths)-1) if lengths[i+1]>=d),len(points)-2)
        t=(d-lengths[i])/max(1e-9,lengths[i+1]-lengths[i])
        result.append(tuple(a+(b-a)*t for a,b in zip(points[i],points[i+1])))
    return result

# A banda branca original acima de 0,53 m continua casada com a carroceria.
upper=line([(20,253.333333),(2152,253.333333)])
trimtop=line([(20,347),(75,340),(310,376),(755,388),(1417,388),(1862,376),(2097,340),(2152,347)])
rows=14; n=len(upper)
verts=[point(a[0]+(b[0]-a[0])*k/rows,a[1]+(b[1]-a[1])*k/rows)
       for k in range(rows+1)for a,b in zip(upper,trimtop)]
mesh('ombro branco contínuo',verts,[(k*n+i,k*n+i+1,(k+1)*n+i+1,(k+1)*n+i)
    for k in range(rows)for i in range(n-1)],paint,True)

# Moldura preta larga sobre as três aberturas, com o relevo da faixa central.
trimlow=line([(38,402),(90,392),(327,424),(757,435),(1415,435),(1845,424),(2082,392),(2134,402)])
blacktop=line([(75,347),(310,376),(755,388),(1417,388),(1862,376),(2097,347)])
blackbottom=line([(65,402),(327,424),(757,435),(1415,435),(1845,424),(2107,402)])
strip('faixa preta superior contínua',blacktop,blackbottom,black,.001,.016)
for side in [-1,1]:
    def mirror(points): return [(1086+side*(u-1086),v) for u,v in points]
    strip(f'canto branco superior {side}',line(mirror([(20,330),(20,414)]),24),
          line(mirror([(92,330),(49,414)]),24),paint,.004,.010)
    # Contornos da tomada de ar: grande trapézio central e recessos laterais.
    outer=[(20,344),(20,411),(20,559),(20,613),(25,647),(45,665),(290,687),(425,691),(1086,697)]
    inner=[(65,392),(46,421),(48,553),(51,596),(63,614),(91,624),(273,646),(432,650),(1086,655)]
    strip(f'contorno inferior branco {side}',line(mirror(outer)),line(mirror(inner)),paint,.001,.018)
    # Divisória branca inclinada: larga no topo e estreita no pé, como na foto.
    a=line(mirror([(265,417),(291,464),(320,517),(348,570),(359,608),(349,628),(319,637)]),50)
    b=line(mirror([(328,423),(351,471),(378,522),(405,573),(425,616),(446,638),(468,644)]),50)
    strip(f'divisória branca inclinada {side}',a,b,paint,.003,.022)
    # Recesso preto do neblina: parede com profundidade e fundo fechado.
    perimeter=mirror([(69,393),(135,395),(262,414),(292,462),(319,512),(343,565),(354,606),(340,624),(280,637),(106,617),(59,601),(48,558),(47,429)])
    perimeter=line(perimeter+[perimeter[0]],80)[:-1]
    center=(sum(p[0] for p in perimeter)/len(perimeter),sum(p[1] for p in perimeter)/len(perimeter))
    rim=[point(u,v,.001) for u,v in perimeter]; recessed=[point(center[0]+(u-center[0])*.98,center[1]+(v-center[1])*.98,-.038) for u,v in perimeter]
    n=len(rim);verts=rim+recessed+[point(*center,-.041)]
    faces=[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)]+[(2*n,n+i,n+(i+1)%n)for i in range(n)]
    mesh(f'cavidade lateral preta {side}',verts,faces,black,True)
    # Três lâminas horizontais cruzam o alojamento, inclusive atrás da lente.
    for k,(u0,v0,u1,v1) in enumerate([(82,432,315,463),(55,482,356,523),(63,550,376,578)]):
        top=line(mirror([(u0,v0),(u1,v1)]),36)
        bottom=[(u,v+10)for u,v in top]
        strip(f'lâmina lateral {side} {k+1}',top,bottom,black,.009,.025)
    # As laterais e os recortes das caixas de roda originais são preservados.

# Entrada central real, sem placa opaca na frente das lâminas.
outline=[(344,433),(1828,433),(1809,484),(1783,538),(1758,591),(1727,626),(1685,638),(487,638),(445,626),(414,591),(389,538),(363,484)]
outline=line(outline+[outline[0]],140)[:-1]
n=len(outline);verts=[point(u,v,d)for d in [-.004,-.060]for u,v in outline]
mesh('paredes da entrada central',verts,[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)],black,True)
# O radiador fica recuado; aberturas mantêm relevo e sombra próprios.
verts=[point(u,v,-.065)for u,v in outline]+[point(1086,535,-.065)]
mesh('radiador recuado',verts,[(n,i,(i+1)%n)for i in range(n)],deep)
for k,(v,left,right)in enumerate([(472,374,1798),(525,401,1771),(578,428,1744)]):
    top=line([(left,v),(right,v)],100);bottom=[(u,v+6)for u,v in top]
    strip(f'lâmina central horizontal {k+1}',top,bottom,black,.003,.035)
    strip(f'aresta da lâmina central {k+1}',top,[(u,v+1.5)for u,v in top],edge,.0035,.002)
for k,u in enumerate([506,696,886,1086,1286,1476,1666]):
    top=line([(u,438),(u,630)],35)
    strip(f'nervura vertical interna {k+1}',top,[(u+5,v)for u,v in top],black,-.024,.022)

# Neblinas circulares: eixo acompanha a curvatura, lente e refletor separados.
for side in [-1,1]:
    u=1086+side*(2006-1086);v=501
    center=Vector(point(u,v,.009))
    z=center.z
    normal=Vector((1,0,side*.45)).normalized()
    up=Vector((0,1,0));across=normal.cross(up)
    def revolve(name, profile, mat, smooth=True, seg=72):
        verts=[];faces=[]
        for d,r in profile:
            for j in range(seg):
                a=j*math.tau/seg
                verts.append(center+normal*d+up*(r*math.cos(a))+across*(r*math.sin(a)))
        for i in range(len(profile)-1):
            for j in range(seg):
                k=(j+1)%seg;faces.append((i*seg+j,i*seg+k,(i+1)*seg+k,(i+1)*seg+j))
        return mesh(f'{name} {side}',verts,faces,mat,smooth)
    revolve('neblina · aro preto externo',[(-.026,.057),(-.006,.063),(.003,.062),(.007,.057),(.001,.053)],black)
    revolve('neblina · filete metálico',[(.001,.055),(.004,.056),(.006,.054),(.004,.052)],reflector)
    revolve('neblina · refletor óptico facetado',[(-.022,.009),(-.021,.019),(-.016,.032),(-.006,.047),(.002,.052)],reflector,False,40)
    # Pequenas facetas longitudinais fazem parte da geometria do refletor.
    for j in range(18):
        a=j*math.tau/18
        verts=[]
        for d,r in [(-.020,.014),(-.016,.030),(-.004,.049)]:
            for da in [-.018,.018]:
                verts.append(center+normal*d+up*(r*math.cos(a+da))+across*(r*math.sin(a+da)))
        mesh(f'neblina · prisma {side} {j}',verts,[(0,1,3,2),(2,3,5,4)],glass)
    revolve('neblina · bulbo central',[(-.016,.0),(-.010,.011),(-.003,.013),(.001,.008)],bulb)
    # Vidro transparente no .blend. O jogo usa a superfície sutil do mesmo material.
    lens=glass.copy();lens.name=f'Neblina · lente transparente {side}'
    bs=lens.node_tree.nodes['Principled BSDF'];bs.inputs['Transmission Weight'].default_value=.85
    bs.inputs['Alpha'].default_value=.18;lens.diffuse_color=(.7,.76,.8,.18)
    revolve('neblina · lente curva',[(.004,.051),(.007,.043),(.010,.027),(.011,.0)],lens)

bpy.context.scene['front_bumper_reference']='Para-choque dianteiro branco com grade preta.png · 20/11/2026'
bpy.context.scene['exterior_reference_revision']=3
bpy.context.view_layer.update()
report={'revision':3,'reference':'Para-choque dianteiro branco com grade preta.png',
    'construction':'contornos traçados na foto e projetados em superfície convexa',
    'removed_faces':removed,'central_horizontal_blades':3,'lateral_blades_per_side':3,
    'fog_lamps':2,'fog_lamp_diameter_m':.104,'width_m':1.666,
    'new_objects':len([o for o in COL.objects if o.name.startswith('Frente ·')]),
    'limitations':'Reconstrução visual com uma foto frontal; profundidades ajustadas à carroceria existente.'}
(R/'modelo/gol-refinado/validacao-parachoque.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
print(json.dumps(report,ensure_ascii=False))
