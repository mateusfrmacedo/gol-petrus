"""Gol modular: geometria por peça, materiais, rig 0..1, revisão e exportação WebGPU.
Requer bpy, numpy e Pillow. Execute após node scripts/gol/capture-geometry.cjs.
"""
from pathlib import Path
import argparse,base64,hashlib,json,math,struct,zlib
import bpy,numpy as np
from mathutils import Matrix,Vector
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[2]; O=R/'modelo/gol-refinado'; SOURCE=O/'geometry-source.json'
args=argparse.ArgumentParser();args.add_argument('--render',action='store_true');opts=args.parse_args()
data=json.loads(SOURCE.read_text());bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
B=np.array([[1,0,0,0],[0,0,-1,0],[0,1,0,0],[0,0,0,1]],float)
def xyz(a):return np.asarray(a)@B[:3,:3].T
def coll(name):
 c=bpy.data.collections.new(name);sc.collection.children.link(c);return c
collections={n:coll(n)for n in ['Carroceria','Vidros separados','Painel e console','Portas e colunas','Bancos e assoalho','Volante articulado','Rodas','Referências','Revisão']}
# Atlas dos instrumentos: posição idêntica ao canvas usado pelo jogo; agulhas no repouso.
font=lambda n:ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',n)
im=Image.new('RGBA',(1024,512),(0,0,0,255));d=ImageDraw.Draw(im)
for dial in range(2):
 x,y=dial*128+64,448;d.ellipse((x-59,y-59,x+59,y+59),fill='#080b0f',outline='#62666b',width=2)
 for k in range(41):
  a=math.radians(140+k*6.5);major=k%5==0;ri=45 if major else 49
  d.line((x+math.cos(a)*ri,y+math.sin(a)*ri,x+math.cos(a)*54,y+math.sin(a)*54),fill='#c9cdd1',width=2 if major else 1)
  if major:d.text((x+math.cos(a)*36,y+math.sin(a)*36),str(k*5 if dial==0 else k//5),font=font(8),anchor='mm',fill='white')
 a=math.radians(140+(900/8000*260 if dial else 0));d.line((x,y,x+math.cos(a)*46,y+math.sin(a)*46),fill='#c23022',width=2)
 d.text((x,y+23),'km/h'if dial==0 else'rpm x 1000',font=font(7),anchor='mm',fill='#aab1b8')
d.rectangle((256,384,384,512),fill='#b51620');d.text((320,400),'21:05',font=font(15),anchor='mm',fill='white');d.text((345,449),'0',font=font(36),anchor='mm',fill='white')
im.save(O/'texturas/instrumentos.png')
atlas=Image.open(R/'assets/interior/cabine-real.webp');atlas.crop((0,1536,512,2048)).save(O/'texturas/plastico-cor.png');atlas.crop((512,1536,1024,2048)).save(O/'texturas/plastico-normal.png')
images={
 'foto':bpy.data.images.load(str(R/'assets/interior/cabine-real.webp')),
 'body':bpy.data.images.load(str(O/'texturas/carroceria.webp')),
 'panel':bpy.data.images.load(str(O/'texturas/instrumentos.png')),
 'grain':bpy.data.images.load(str(O/'texturas/plastico-cor.png')),
 'normal':bpy.data.images.load(str(O/'texturas/plastico-normal.png')),
}
materials={}
def material(g,glass=False,roof=False):
 key=(g['mat'],g['pa'],tuple(g['color']),glass,roof)
 if key in materials:return materials[key]
 mid,pa=g['mat'],g['pa'];m=bpy.data.materials.new(f'{mid:02}.{pa:03} · '+str(len(materials)))
 m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');ns=m.node_tree.nodes;links=m.node_tree.links
 bs.inputs['Base Color'].default_value=(*g['color'],1);bs.inputs['Roughness'].default_value=.85
 m['game_id']=mid;m['game_pa']=pa;m['game_color']=g['color']
 if glass:
  bs.inputs['Base Color'].default_value=(.08,.10,.11,1);bs.inputs['Transmission Weight'].default_value=.75;bs.inputs['Roughness'].default_value=.12;bs.inputs['Alpha'].default_value=.19
  m.diffuse_color=(.1,.12,.13,.19);m.surface_render_method='DITHERED'
  if roof:
   bs.inputs['Base Color'].default_value=(*g['color'],1);bs.inputs['Transmission Weight'].default_value=.2;bs.inputs['Alpha'].default_value=1;bs.inputs['Roughness'].default_value=.15
 elif mid in [20,24,25]:
  tex=ns.new('ShaderNodeTexImage');tex.image=images['body'if mid==20 else'panel'if mid==24 else'foto'];links.new(tex.outputs['Color'],bs.inputs['Base Color'])
  bs.inputs['Roughness'].default_value=.84 if mid in[24,25]else max(.07,(pa&15)/15)
  if mid==20:bs.inputs['Metallic'].default_value=(pa>>4)/15
  if mid==24:links.new(tex.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=.12
 elif mid==26:
  tex=ns.new('ShaderNodeTexImage');tex.image=images['grain'];tex.projection='BOX';tex.projection_blend=.25
  coord=ns.new('ShaderNodeTexCoord');mapping=ns.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=18
  links.new(coord.outputs['Object'],mapping.inputs[0]);links.new(mapping.outputs[0],tex.inputs['Vector'])
  mult=ns.new('ShaderNodeMixRGB');mult.blend_type='MULTIPLY';mult.inputs[0].default_value=1;mult.inputs[2].default_value=(*[v/.21586 for v in g['color']],1);links.new(tex.outputs['Color'],mult.inputs[1]);links.new(mult.outputs[0],bs.inputs['Base Color'])
  bump=ns.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.11;bump.inputs['Distance'].default_value=.0008;links.new(tex.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs[0],bs.inputs['Normal'])
  bs.inputs['Roughness'].default_value=.65 if pa else .88;bs.inputs['Metallic'].default_value=.22 if pa else 0
 elif mid==21:bs.inputs['Roughness'].default_value=max(.07,(pa&15)/15);bs.inputs['Metallic'].default_value=(pa>>4)/15
 elif mid in[6,7,10]:bs.inputs['Metallic'].default_value=.7;bs.inputs['Roughness'].default_value=.36
 elif mid==27:bs.inputs['Emission Color'].default_value=(*g['color'],1);bs.inputs['Emission Strength'].default_value=1.5
 m.diffuse_color=(*g['color'],1);materials[key]=m;return m
# Rig: base orientada como a coluna do volante, com comando normalizado 0..1.
root=bpy.data.objects.new('Gol · controles',None);collections['Volante articulado'].objects.link(root);root['direcao']=.5;root['teto_solar']=0.0
for prop in ['direcao','teto_solar']:root.id_properties_ui(prop).update(min=0,max=1,description='Controle normalizado 0..1')
base=bpy.data.objects.new('Volante · base da coluna',None);collections['Volante articulado'].objects.link(base);base.parent=root;base.matrix_world=Matrix((B@np.array(data['steerMatrix']).reshape((4,4),order='F')@B.T).tolist())
control=bpy.data.objects.new('Volante · giro',None);collections['Volante articulado'].objects.link(control);control.parent=base
f=control.driver_add('rotation_euler',0);f.driver.expression='(u-0.5)*16.8';v=f.driver.variables.new();v.name='u';v.targets[0].id=root;v.targets[0].data_path='["direcao"]'
objects=[]
def mesh_object(name,target,groups):
 vertices=[];faces=[];uv=[];normals=[];ids=[];mats=[]
 for g in groups:
  vv=np.array(g['vertices']).reshape((-1,8));offset=len(vertices);vertices.extend(xyz(vv[:,:3]).tolist());normals.extend(xyz(vv[:,3:6]).tolist());uv.extend(vv[:,6:8].tolist());ff=np.array(g['indices']).reshape((-1,3));faces.extend((ff+offset).tolist());ids.extend([len(mats)]*len(ff));mats.append(material(g,target in ['glass','roof-glass'],target=='roof-glass'))
 me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update()
 layer=me.uv_layers.new(name='UVMap')
 for loop in me.loops:u,v=uv[loop.vertex_index];layer.data[loop.index].uv=(u,1-v)
 for m in mats:me.materials.append(m)
 for face,mid in zip(me.polygons,ids):face.material_index=mid;face.use_smooth=True
 me.normals_split_custom_set([normals[l.vertex_index]for l in me.loops])
 ob=bpy.data.objects.new(name,me)
 cat='Volante articulado'if target=='steer'else'Vidros separados'if target in ['glass','roof','roof-glass','deflector']else'Carroceria'if name=='carroceria'else'Rodas'if target=='wheel'else'Portas e colunas'if name.startswith(('porta.','coluna.','teto.'))else'Bancos e assoalho'if name.startswith('interior.')else'Painel e console'
 collections[cat].objects.link(ob);ob['game_target']=target;ob['game_group']=name
 if target=='steer':ob.parent=control
 objects.append(ob);return ob
for item in data['meshes']:
 if item['target']=='glass':
  split={}
  for g in item['groups']:
   vv=np.array(g['vertices']).reshape((-1,8));ff=np.array(g['indices']).reshape((-1,3))
   for f in ff:
    p=vv[f,:3].mean(0);n=vv[f,3:6].mean(0)
    key='teto-solar'if p[1]>1.30 and abs(p[2])<.45 else'para-brisa'if p[0]>.2 and p[1]>.9 and abs(n[0])>.25 else'vigia'if p[0]<-1 and p[1]>.9 else'lateral.esquerdo'if p[1]>.9 and p[2]<0 else'lateral.direito'if p[1]>.9 else'lentes'
    k=(key,g['mat'],g['pa'],tuple(g['color']));out=split.setdefault(k,dict(mat=g['mat'],pa=g['pa'],color=g['color'],vertices=[],indices=[]));offset=len(out['vertices'])//8;out['vertices'].extend(vv[f].ravel().tolist());out['indices'].extend([offset,offset+1,offset+2])
  for key in sorted(set(k[0]for k in split)):mesh_object('vidros.'+key,'glass',[v for k,v in split.items()if k[0]==key])
 else:mesh_object(item['name'],item['target'],item['groups'])
# Quatro rodas instanciadas: a fonte usa o mesmo eixo Z e dimensões do jogo.
source=next(o for o in objects if o['game_target']=='wheel');source.hide_render=True;source.hide_set(True)
for i,h in enumerate(data['gol']['hubs']):
 ob=bpy.data.objects.new(('dianteira'if i<2 else'traseira')+('.esquerda'if i%2==0 else'.direita'),source.data);collections['Rodas'].objects.link(ob)
 a=math.pi if i%2==0 else 0;M=np.eye(4);M[:3,:3]=[[math.cos(a),0,math.sin(a)],[0,1,0],[-math.sin(a),0,math.cos(a)]];M[:3,3]=h;ob.matrix_world=Matrix((B@M@B.T).tolist())
# Mesmo conjunto articulado e mesmas fases de elevação/deslizamento usados pelo jogo.
cfg=data['gol']['sunroof'];slide="(max(0,min(1,(u-.2)/.8))**2*(3-2*max(0,min(1,(u-.2)/.8))))";lift="(min(1,max(0,u/.2))**2*(3-2*min(1,max(0,u/.2))))"
def roof_control(name,targets,angle,travel,elevation):
 pivot=bpy.data.objects.new(name,None);collections['Vidros separados'].objects.link(pivot)
 for ob in objects:
  if ob['game_target'] in targets:ob.parent=pivot
 px,py=cfg['frontX'],cfg['hingeY'];a=f'({angle})'
 expressions=[('rotation_euler',1,f'-{a}'),('location',0,f'{px}-cos({a})*{px}+sin({a})*{py}-({travel})'),('location',2,f'{py}-sin({a})*{px}-cos({a})*{py}+({elevation})')]
 for path,index,expression in expressions:
  f=pivot.driver_add(path,index);f.driver.expression=expression;v=f.driver.variables.new();v.name='u';v.targets[0].id=root;v.targets[0].data_path='["teto_solar"]'
 return pivot
roof_control('Teto · vidro e moldura móveis',['roof','roof-glass'],f"{cfg['angle']}*{slide}",f"{cfg['travel']}*{slide}",f"{cfg['lift']}*{lift}")
roof_control('Teto · defletor frontal',['deflector'],f'-.8*{lift}','0','0')
# Fotos são imagens de referência externas: não entram no GLB nem no jogo.
for name in ['20260416_141702.jpg','20260416_141817.jpg','20260416_141935.jpg']:
 path=Path('/Users/mateus/Downloads/Gol G6 PF')/name
 if path.exists():
  ob=bpy.data.objects.new('Foto · '+name,None);ob.empty_display_type='IMAGE';ob.data=bpy.data.images.load(str(path));ob.location=(0,0,-5);ob.hide_render=True;collections['Referências'].objects.link(ob);ob.hide_set(True)
# Câmeras e luz de estúdio para a revisão; só as fotos reais determinam os detalhes.
def camera(name,eye,target,fov):
 ca=bpy.data.cameras.new(name);ob=bpy.data.objects.new(name,ca);collections['Revisão'].objects.link(ob);ob.location=Vector(xyz([eye])[0]);aim=Vector(xyz([target])[0]);ob.rotation_euler=(aim-ob.location).to_track_quat('-Z','Y').to_euler();ca.sensor_fit='VERTICAL';ca.angle=fov;return ob
cams=[camera('Motorista',[-.22,1.16,-.36],[6,.46,-.36],1.20),camera('Interior completo',[-.74,1.18,.02],[.75,.78,.02],1.24),camera('Exterior frente',[4.8,2.1,-3.9],[0,.70,0],.65)]
world=bpy.data.worlds.new('Ambiente neutro');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.70,.78,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6;sc.world=world
for name,loc,power,size in [('Key',(1,-3,5),700,4),('Fill',(-2,2,3),400,3),('Cabine',(.3,0,2.6),35,1)]:
 light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size;ob=bpy.data.objects.new(name,light);collections['Revisão'].objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,.7))-ob.location).to_track_quat('-Z','Y').to_euler()
sc.render.engine='CYCLES';sc.cycles.device='CPU';sc.cycles.samples=12;sc.cycles.use_denoising=True;sc.render.resolution_x=960;sc.render.resolution_y=640;sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX';sc.camera=cams[1]
# Teste do comando 0..1: sentido correto, centro estável e extremos finitos.
rig_report=[]
for u in [0,.25,.5,.75,1]:
 root['direcao']=float(u);root.update_tag();sc.frame_set(sc.frame_current);bpy.context.view_layer.update();rig_report.append({'u':u,'angle':float(control.evaluated_get(bpy.context.evaluated_depsgraph_get()).rotation_euler.x)})
print('RIG',rig_report,flush=True);assert rig_report[0]['angle']<rig_report[-1]['angle'];root['direcao']=.5;bpy.context.view_layer.update()
# Exportação do interior a partir do Blender, em lotes compatíveis com o renderizador WebGPU.
payload=bytearray();parts=[];clean_objects=[o for o in objects if o['game_target']in['body','steer']and o['game_group']!='carroceria']
for ob in clean_objects:
 me=ob.data;me.calc_loop_triangles();normals=me.corner_normals
 for mi,m in enumerate(me.materials):
  triangles=[t for t in me.loop_triangles if t.material_index==mi]
  if not triangles:continue
  vertices=[];indices=[];lookup={}
  for t in triangles:
   points=[me.vertices[me.loops[li].vertex_index].co for li in t.loops]
   geometric=(points[1]-points[0]).cross(points[2]-points[0])
   if geometric.length<1e-12:continue
   geometric.normalize()
   for li in t.loops:
    loop=me.loops[li];p=me.vertices[loop.vertex_index].co;n=normals[li].vector.copy()
    if n.length<.01:n=geometric
    else:n.normalize()
    uv=me.uv_layers.active.data[li].uv
    v=(p.x,p.z,-p.y,n.x,n.z,-n.y,uv.x,1-uv.y)
    key=tuple(round(x,7)for x in v)
    if key not in lookup:lookup[key]=len(vertices);vertices.append(v)
    indices.append(lookup[key])
  if not vertices:continue
  offset=len(payload);payload.extend(np.array(vertices,dtype='<f4').tobytes());payload.extend(np.array(indices,dtype='<u4').tobytes())
  parts.append(dict(name=ob.name,target=ob['game_target'],offset=offset,nv=len(vertices),ni=len(indices),mat=int(m['game_id']),pa=int(m['game_pa']),color=list(m['game_color'])))
meta=dict(schema=1,units='metres',source='Blender · Gol modular',sourceGeometrySha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),steerMatrix=data['steerMatrix'],parts=parts,triangles=sum(p['ni']//3 for p in parts),rig=rig_report)
assert meta['triangles']<120000,meta['triangles']
encoded=base64.b64encode(zlib.compress(payload,9)).decode();target=R/'source/js/30_car_b1_refined_data.js';target.write_text('// Gerado por scripts/gol/build-blender.py.\nconst GOL_REFINED_META='+json.dumps(meta,separators=(',',':'))+';\nconst GOL_REFINED_B64='+json.dumps(encoded)+';\n')
(O/'validacao.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
# Empacota apenas as texturas necessárias ao modelo, sem incorporar as fotos inteiras.
for image in images.values():image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(O/'gol-modular.blend'))
if opts.render:
 for cam in cams:
  sc.camera=cam
  for ob in objects:
   if ob['game_target']=='glass':ob.visible_camera=cam.name=='Exterior frente' or not ob.name in ['vidros.para-brisa','vidros.teto-solar']
  sc.render.filepath=str(O/'revisao'/(cam.name.lower().replace(' ','-')+'.png'));bpy.ops.render.render(write_still=True)
 for ob in objects:ob.visible_camera=True
print(json.dumps({'blend':str(O/'gol-modular.blend'),'parts':len(parts),'triangles':meta['triangles'],'compressed_bytes':len(encoded)*3//4},ensure_ascii=False))
