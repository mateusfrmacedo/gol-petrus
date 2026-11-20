"""Atualiza somente carroceria e vidros da cena modular, preservando o interior editado.
Execute após exportar_blender_jogo.py e capture-geometry.cjs.
"""
from pathlib import Path
import bpy,json,numpy as np

R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado'
data=json.loads((O/'geometry-source.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(O/'gol-modular.blend'))
for ob in list(bpy.context.scene.objects):
    if ob.get('game_group')=='carroceria' or ob.get('game_target')=='glass':
        bpy.data.objects.remove(ob,do_unlink=True)
atlas=bpy.data.images.load(str(O/'texturas/carroceria.webp'),check_existing=False);atlas.pack()
# As rodas e outras peças texturizadas também usam o atlas da carroceria.
for m in bpy.data.materials:
    if m.get('game_id')==20 and m.use_nodes:
        for node in m.node_tree.nodes:
            if node.type=='TEX_IMAGE':node.image=atlas
materials={}
def material(g,glass=False):
    mid,pa=g['mat'],g['pa'];key=(mid,pa,tuple(g['color']),glass)
    if key in materials:return materials[key]
    m=bpy.data.materials.new(f'Exterior revisado · {len(materials)}');m.use_nodes=True
    m['game_id']=mid;m['game_pa']=pa;m['game_color']=g['color']
    b=m.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=(*g['color'],1)
    b.inputs['Roughness'].default_value=max(.07,(pa&15)/15);b.inputs['Metallic'].default_value=(pa>>4)/15
    if mid==20:
        t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=atlas
        m.node_tree.links.new(t.outputs['Color'],b.inputs['Base Color'])
    if mid==2:b.inputs['Roughness'].default_value=.86;b.inputs['Metallic'].default_value=0
    if mid==30:b.inputs['Roughness'].default_value=.24;b.inputs['Metallic'].default_value=0
    if glass:
        b.inputs['Transmission Weight'].default_value=.75;b.inputs['Roughness'].default_value=.12
        b.inputs['Alpha'].default_value=.19;m.diffuse_color=(*g['color'],.19);m.surface_render_method='DITHERED'
    materials[key]=m;return m

def mesh_object(name,target,groups):
    vertices=[];faces=[];uv=[];normals=[];ids=[]
    for mi,g in enumerate(groups):
        vv=np.array(g['vertices']).reshape((-1,8));offset=len(vertices)
        vertices.extend(vv[:,[0,2,1]]*[1,-1,1]);normals.extend(vv[:,[3,5,4]]*[1,-1,1]);uv.extend(vv[:,6:8])
        ff=np.array(g['indices']).reshape((-1,3));faces.extend((ff+offset).tolist());ids.extend([mi]*len(ff))
    me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update();layer=me.uv_layers.new(name='UVMap')
    for loop in me.loops:u,v=uv[loop.vertex_index];layer.data[loop.index].uv=(u,1-v)
    for g in groups:me.materials.append(material(g,target=='glass'))
    for p,mi in zip(me.polygons,ids):p.material_index=mi;p.use_smooth=True
    me.normals_split_custom_set([normals[l.vertex_index]for l in me.loops])
    ob=next((o for o in bpy.context.scene.objects if o.get('game_group')==name and o.get('game_target')==target),None)
    if ob:
        old=ob.data;ob.data=me
        if target=='wheel':
            for instance in bpy.context.scene.objects:
                if instance.type=='MESH' and instance.data==old:instance.data=me
    else:
        ob=bpy.data.objects.new(name,me);bpy.data.collections['Carroceria'if target=='body'else'Vidros separados'].objects.link(ob)
    ob['game_target']=target;ob['game_group']=name

for item in data['meshes']:
    if item['name']=='carroceria':mesh_object('carroceria','body',item['groups'])
    elif item['target']in ['roof','roof-glass','deflector','wheel']:mesh_object(item['name'],item['target'],item['groups'])
    elif item['target']=='glass':
        split={}
        for g in item['groups']:
            vv=np.array(g['vertices']).reshape((-1,8));ff=np.array(g['indices']).reshape((-1,3))
            for f in ff:
                p=vv[f,:3].mean(0);n=vv[f,3:6].mean(0)
                key='teto-solar'if p[1]>1.30 and abs(p[2])<.45 else'para-brisa'if p[0]>.2 and p[1]>.9 and abs(n[0])>.25 else'vigia'if p[0]<-1 and p[1]>.9 else'lateral.esquerdo'if p[1]>.9 and p[2]<0 else'lateral.direito'if p[1]>.9 else'lentes'
                k=(key,g['mat'],g['pa'],tuple(g['color']));out=split.setdefault(k,dict(mat=g['mat'],pa=g['pa'],color=g['color'],vertices=[],indices=[]))
                offset=len(out['vertices'])//8;out['vertices'].extend(vv[f].ravel().tolist());out['indices'].extend([offset,offset+1,offset+2])
        for key in sorted(set(k[0]for k in split)):mesh_object('vidros.'+key,'glass',[v for k,v in split.items()if k[0]==key])
# O ajuste da curvatura altera a altura de articulação. Atualiza os pivôs sem
# reconstruir o interior, mantendo Blender e jogo com as mesmas matrizes.
cfg=data['gol']['sunroof'];root=bpy.data.objects['Gol · controles']
slide='(max(0,min(1,(u-.2)/.8))**2*(3-2*max(0,min(1,(u-.2)/.8))))'
lift='(min(1,max(0,u/.2))**2*(3-2*min(1,max(0,u/.2))))'
for name,angle,travel,elevation in [
    ('Teto · vidro e moldura móveis',f"{cfg['angle']}*{slide}",f"{cfg['travel']}*{slide}",f"{cfg['lift']}*{lift}"),
    ('Teto · defletor frontal',f'-.8*{lift}','0','0')]:
    pivot=bpy.data.objects[name];px,py=cfg['frontX'],cfg['hingeY'];a=f'({angle})'
    for path,index,expression in [('rotation_euler',1,f'-{a}'),('location',0,f'{px}-cos({a})*{px}+sin({a})*{py}-({travel})'),('location',2,f'{py}-sin({a})*{px}-cos({a})*{py}+({elevation})')]:
        f=pivot.driver_add(path,index);f.driver.expression=expression
        while len(f.driver.variables):f.driver.variables.remove(f.driver.variables[0])
        v=f.driver.variables.new();v.name='u';v.targets[0].id=root;v.targets[0].data_path='["teto_solar"]'
bpy.context.view_layer.update()
bpy.context.scene['front_bumper_revision']=3
bpy.ops.wm.save_as_mainfile(filepath=str(O/'gol-modular.blend'))
print('Carroceria e vidros atualizados; interior, volante, rodas e controles preservados.')
