"""Exporta o Gol editável para o formato compacto já usado pelo jogo.
Uso: python exportar_blender_jogo.py [arquivo.blend]
Requer bpy, numpy e Pillow. Texturas são extraídas dos recursos incorporados.
"""
from pathlib import Path
from io import BytesIO
import sys,json,math,struct,zlib,base64,hashlib
import bpy
import numpy as np
from PIL import Image

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else HERE/'blender/gol-branco.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE.resolve()))
bpy.context.view_layer.update()
origin_y=(-1.0702612+1.4376315)/2
tiles=[];tile_keys={};parts=[];details=[]
TILE=768;PAD=8;CELL=TILE+2*PAD;COLS=4

def principled(mat):
    return next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)

def linked_image(socket,depth=0):
    if depth>8 or not socket.is_linked:return None
    node=socket.links[0].from_node
    if node.type=='TEX_IMAGE':return node
    for inp in node.inputs:
        result=linked_image(inp,depth+1)
        if result is not None:return result
    return None

def image_bytes(image):
    if image.packed_file:return bytes(image.packed_file.data)
    return Path(bpy.path.abspath(image.filepath)).read_bytes()

def tile_for(mat):
    b=principled(mat)
    color=linked_image(b.inputs['Base Color']) if b else None
    normal=linked_image(b.inputs['Normal']) if b else None
    # Procedural bump is represented by geometry; only image tangent maps are retained.
    if normal and normal.image.name=='RodaGol.png':normal=None
    if not color and not normal:return None,False
    flip=False
    probe=color or normal
    if probe.inputs['Vector'].is_linked:
        n=probe.inputs['Vector'].links[0].from_node
        flip=n.type=='VECT_MATH' and n.operation=='MULTIPLY_ADD'
    invert=mat.name.startswith('VW traseiro')
    key=(color.image.name if color else '',normal.image.name if normal else '',flip,invert)
    if key in tile_keys:return tile_keys[key],flip
    if color:
        c=Image.open(BytesIO(image_bytes(color.image))).convert('RGBA').resize((TILE,TILE),Image.Resampling.LANCZOS)
        if invert:
            a=np.asarray(c).copy()
            grey=(a[:,:,:3]/255).mean(2)
            t=np.clip((grey-.08)/(.56-.08),0,1)
            a[:,:,:3]=np.round((.89*(1-t)+.004*t)[:,:,None]*255).astype('uint8')
            c=Image.fromarray(a)
    else:
        rgba=b.inputs['Base Color'].default_value
        # Material constants are linear; encode into the sRGB atlas.
        rgb=[round((12.92*v if v<=.0031308 else 1.055*v**(1/2.4)-.055)*255) for v in rgba[:3]]
        c=Image.new('RGBA',(TILE,TILE),(*rgb,255))
    n=Image.new('RGB',(TILE,TILE),(128,128,255))
    if normal:
        n=Image.open(BytesIO(image_bytes(normal.image))).convert('RGB').resize((TILE,TILE),Image.Resampling.LANCZOS)
        if flip:
            a=np.asarray(n).copy();a[:,:,1]=255-a[:,:,1];n=Image.fromarray(a)
    index=len(tiles);tile_keys[key]=index;tiles.append((c,n))
    return index,flip

def properties(mat):
    b=principled(mat)
    if not b:return (0.5,0.5,0.5),.5,0,1
    return tuple(b.inputs['Base Color'].default_value[:3]),float(b.inputs['Roughness'].default_value),float(b.inputs['Metallic'].default_value),float(b.inputs['Alpha'].default_value)

def emit_object(ob,dest):
    dg=bpy.context.evaluated_depsgraph_get()
    evaluated=ob.evaluated_get(dg)
    me=evaluated.to_mesh(preserve_all_data_layers=True,depsgraph=dg)
    if not me:return
    me.calc_loop_triangles()
    mw=np.array(ob.matrix_world)
    co=np.array([v.co[:] for v in me.vertices],dtype=np.float64)
    corners=np.array([n.vector[:] for n in me.corner_normals],dtype=np.float64)
    loops=np.array([loop.vertex_index for loop in me.loops],dtype=np.int32)
    tri=np.array([t.loops[:] for t in me.loop_triangles],dtype=np.int32)
    material_ids=np.array([t.material_index for t in me.loop_triangles])
    if not len(tri):
        evaluated.to_mesh_clear();return
    position=co[loops]@mw[:3,:3].T+mw[:3,3]
    normals=corners@np.linalg.inv(mw[:3,:3])
    normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-8)
    uv=np.array([v.uv[:] for v in me.uv_layers.active.data]) if me.uv_layers else np.zeros((len(loops),2))
    if dest==2:
        # Wheel source is already X/Y in its face plane and Z outward.
        p=position;n=normals
    else:
        p=np.stack([origin_y-position[:,1],position[:,2],-position[:,0]],axis=1)
        n=np.stack([-normals[:,1],normals[:,2],-normals[:,0]],axis=1)
    for mi,mat in enumerate(me.materials):
        selected=np.flatnonzero(material_ids==mi)
        if not len(selected) or mat is None:continue
        color,rough,metal,alpha=properties(mat)
        tile,flip=tile_for(mat)
        target=dest
        material=20 if tile is not None else 21
        param=round(max(.07,min(1,rough))*15)|(round(max(0,min(1,metal))*15)<<4)
        if dest==0 and alpha<.999:
            target=1;material=0;param=0
            color=tuple(min(.45,max(.025,c)) for c in color)
        if mat.name.startswith(('Desenho vermelho','Refletores')):
            material=22
        groups=[(selected,color,material,tile)]
        if ob.name=='PINTURA':
            centers=position[tri[selected]].mean(1)
            black=(centers[:,1]>1.535)&(centers[:,2]>1.24)
            groups=[(selected[~black],color,material,tile),(selected[black],(.006,.007,.010),21,None)]
        for chosen,col,mid,tex in groups:
            # A 16-bit index block can address at most 65,535 unique corners.
            for begin in range(0,len(chosen),16000):
                ff=tri[chosen[begin:begin+16000]]
                if not len(ff):continue
                used=np.unique(ff)
                lookup=np.full(len(loops),-1,np.int32);lookup[used]=np.arange(len(used))
                U=uv[used].copy()
                if tex is not None:
                    if flip:U[:,1]=1-U[:,1]
                    # Atlas rows run top-to-bottom; Blender UV V runs bottom-to-top.
                    U[:,1]=1-U[:,1]
                    U=np.clip(U,0,1)
                part=dict(name=ob.name,mat=mid,pa=param,dest=target,col=col,
                          p=p[used],n=n[used],f=lookup[ff],uv=U if tex is not None else None,tile=tex)
                parts.append(part)
    details.append({'name':ob.name,'source_triangles':len(tri),'dest':dest})
    evaluated.to_mesh_clear()

body=bpy.data.collections['Gol recuperado do visualizador']
rear=bpy.data.collections['Traseira · detalhes da foto']
wheel=bpy.data.collections['Roda 17 · fonte editável']
for ob in list(body.objects)+list(rear.objects):
    if ob.type in ['MESH','CURVE','FONT']:emit_object(ob,0)
# Reduce invisible/high-density mechanical surfaces for the real-time renderer.
for ob in wheel.objects:
    if ob.type!='MESH':continue
    if ob.name=='Pneu de perfil baixo':
        modifier=ob.modifiers.new('Jogo · redução da banda','DECIMATE');modifier.ratio=.40
    if ob.name.startswith(('Liga ·','Nervuras')):
        modifier=ob.modifiers.new('Jogo · redução dos chanfros','DECIMATE');modifier.ratio=.45
    emit_object(ob,2)
rows=math.ceil(max(1,len(tiles))/COLS)
width=COLS*CELL;half=rows*CELL;height=half*2
atlas=Image.new('RGBA',(width,height),(255,255,255,255))
for i,(color,normal) in enumerate(tiles):
    x=(i%COLS)*CELL+PAD;y=(i//COLS)*CELL+PAD
    # Extend tile edges into the gutter to keep mip levels independent.
    for img,yy in [(color,y),(normal.convert('RGBA'),y+half)]:
        atlas.paste(img,(x,yy))
        atlas.paste(img.crop((0,0,TILE,1)).resize((TILE,PAD)),(x,yy-PAD))
        atlas.paste(img.crop((0,TILE-1,TILE,TILE)).resize((TILE,PAD)),(x,yy+TILE))
        atlas.paste(img.crop((0,0,1,TILE)).resize((PAD,TILE)),(x-PAD,yy))
        atlas.paste(img.crop((TILE-1,0,TILE,TILE)).resize((PAD,TILE)),(x+TILE,yy))
for part in parts:
    if part['tile'] is not None:
        i=part['tile'];u=part['uv']
        u[:,0]=(u[:,0]*TILE+(i%COLS)*CELL+PAD)/width
        u[:,1]=(u[:,1]*TILE+(i//COLS)*CELL+PAD)/height
atlas_path=HERE/'gol_atlas.webp'
atlas.save(atlas_path,'WEBP',quality=92,method=6)
def delta16(a):
    return (np.diff(np.concatenate([np.zeros((1,a.shape[1]),a.dtype),a]),axis=0)&65535).astype('<u2').tobytes()
def oct16(n):
    q=n/(np.abs(n).sum(1,keepdims=True)+1e-12)
    x,y,z=q.T
    return np.clip(np.round(np.stack([np.where(z<0,(1-np.abs(y))*np.sign(x+1e-12),x),
                                    np.where(z<0,(1-np.abs(x))*np.sign(y+1e-12),y)],axis=1)*32767),-32767,32767).astype(np.int64)
header=bytearray(struct.pack('<I',len(parts)));payload=bytearray()
for p in parts:
    color=[round(max(0,min(1,v))*255) for v in p['col']]
    flag=2 if p['uv'] is not None else 0
    header+=struct.pack('<BBBBBBBII',p['dest'],p['mat'],p['pa'],*color,flag,len(p['p']),p['f'].size)
    q=np.round(p['p']*8192).astype(np.int64)
    assert abs(q).max()<32767 and len(p['p'])<65536
    payload+=delta16(q)+delta16(oct16(p['n']))+delta16(p['f'].reshape(-1,1).astype(np.int64))
    if flag:payload+=delta16(np.round(p['uv']*65535).astype(np.int64))
compressed=zlib.compress(bytes(header)+bytes(payload),9)
# Usa as instâncias aprovadas no Blender para preservar bitola, altura e centros das rodas.
instances=list(bpy.data.collections['Quatro rodas 17'].objects)
assert len(instances)==4, 'O modelo precisa de quatro instâncias de roda'
hubs=sorted([[origin_y-o.matrix_world.translation.y,o.matrix_world.translation.z,-o.matrix_world.translation.x] for o in instances],key=lambda p:(-p[0],p[2]))
track=(hubs[1][2]-hubs[0][2]+hubs[3][2]-hubs[2][2])/2
body_drop=float(bpy.context.scene.get('body_drop_m',0))
tyre=bpy.data.objects['Pneu de perfil baixo']
meta={'version':'blender-2026-11-17','blender':True,'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
      'barY':1.42-body_drop,'bodyDrop':body_drop,'axf':(hubs[0][0]-hubs[2][0])/2,
      'wheelR':float(tyre.dimensions.x/2),'tyreWidth':float(tyre.dimensions.z),'track':track,
      'hubs':hubs,'decals':[],'parts':len(parts),'trianglesBody':sum(len(p['f']) for p in parts if p['dest']!=2),
      'trianglesWheel':sum(len(p['f']) for p in parts if p['dest']==2)}
target=ROOT/'source/js/30_car_a0_data.js'
target.write_text('// Gerado por modelo/exportar_blender_jogo.py.\nconst GOL_META = '+json.dumps(meta,separators=(',',':'))+
                  ";\nconst GOL_B64 = '"+base64.b64encode(compressed).decode()+"';\nconst GOL_FOTO_WEBP = '"+
                  base64.b64encode(atlas_path.read_bytes()).decode()+"';\n")
print(json.dumps({'meta':meta,'atlas':[width,height],'compressed_bytes':len(compressed),'objects':details},ensure_ascii=False))
