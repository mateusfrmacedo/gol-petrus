"""Referência traseira real: adesivo Borghi, lentes fumê e duas luzes de placa."""
from pathlib import Path
import bpy,bmesh,math,json,cv2,numpy as np
from PIL import Image,ImageOps
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[2];asset=R/'assets/vehicles/gol/adesivo-borghi-traseiro.png'
photo=ImageOps.exif_transpose(Image.open('/Users/mateus/Downloads/Gol G6 PF/20260416_141312.jpg'))
# Retifica a elipse da foto para um círculo; evita o recorte diagonal da lataria.
patch=np.array(photo.crop((716,2984,844,3080)).convert('RGB'))
gray=cv2.GaussianBlur(cv2.cvtColor(patch,cv2.COLOR_RGB2GRAY),(3,3),.6)
center_guess=np.array([66.,40.]);a=math.radians(20)
orientation=np.array([[math.cos(a),-math.sin(a)],[math.sin(a),math.cos(a)]])
edge_points=[]
for theta in np.linspace(0,math.tau,120,endpoint=False):
    direction=orientation@np.array([43*math.cos(theta),25*math.sin(theta)])
    scales=np.linspace(.84,1.16,65);xy=center_guess+scales[:,None]*direction
    values=cv2.remap(gray,xy[:,0].astype('float32')[None,:],xy[:,1].astype('float32')[None,:],cv2.INTER_LINEAR)[0].astype(float)
    k=int(np.argmax(np.diff(values)-.08*abs(scales[:-1]-1)))
    edge_points.append((xy[k]+xy[k+1])/2)
(ecx,ecy),(ew,eh),angle=cv2.fitEllipse(np.array(edge_points,dtype='float32'))
a=math.radians(angle);rotation=np.array([[math.cos(a),-math.sin(a)],[math.sin(a),math.cos(a)]])
linear=rotation@np.diag([256/ew,256/eh])@rotation.T
matrix=np.column_stack((linear,np.array([127.5,127.5])-linear@np.array([ecx,ecy])))
round_image=cv2.warpAffine(patch,matrix,(256,256),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)
Image.fromarray(round_image).save(asset)
bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
col=bpy.data.collections['Traseira · detalhes da foto'];oy=(-1.0702612+1.4376315)/2
for ob in list(col.objects):
    if ob.name.startswith(('Adesivo redondo Borghi','Luz de placa ·')):bpy.data.objects.remove(ob,do_unlink=True)
def world(x,y,z):return Vector((-z,oy-x,y))
skin=bpy.data.objects['PINTURA'];tree=BVHTree.FromPolygons([skin.matrix_world@v.co for v in skin.data.vertices],[list(p.vertices)for p in skin.data.polygons])
def rear(y,z):
    hit=tree.ray_cast(world(-2.4,y,z),Vector((0,-1,0)))[0];assert hit is not None
    return oy-hit.y-.0018
mat=bpy.data.materials.new('Adesivo Borghi · recorte da foto real');mat.use_nodes=True
bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Roughness'].default_value=.42
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(asset));tex.image.pack();mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
verts=[];uv=[];cy=.641;cz=-.47;r=.025
center=world(rear(cy,cz)+.0018,cy,cz)
normal=tree.ray_cast(world(-2.4,cy,cz),Vector((0,-1,0)))[1]
if normal.y<0:normal=-normal
center+=normal*.0008
tangent=Vector((-1,0,0));tangent=(tangent-normal*tangent.dot(normal)).normalized()
up=normal.cross(tangent).normalized()
if up.z<0:up=-up
for k in range(65):
    a=k/64*math.tau;surface=center+tangent*(r*math.cos(a))+up*(r*math.sin(a))
    verts.append(surface);uv.append((.5+.5*math.cos(a),.5+.5*math.sin(a)))
verts.append(center);uv.append((.5,.5));me=bpy.data.meshes.new('Disco do adesivo');me.from_pydata(verts,[],[(65,i,i+1)for i in range(64)]);me.update()
layer=me.uv_layers.new(name='UVMap')
for loop in me.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
bm=bmesh.new();bm.from_mesh(me)
if sum(f.normal.y for f in bm.faces)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
bm.to_mesh(me);bm.free();me.materials.append(mat);ob=bpy.data.objects.new('Adesivo redondo Borghi · abaixo de GOL',me);col.objects.link(ob)
led=bpy.data.materials.new('LED branco da placa · comando independente');led.use_nodes=True
bs=led.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.9,.95,1,1);bs.inputs['Roughness'].default_value=.2
bs.inputs['Emission Color'].default_value=(.9,.95,1,1);bs.inputs['Emission Strength'].default_value=0
for side in [-1,1]:
    bpy.ops.mesh.primitive_cube_add(size=1,location=world(-1.887,.504,side*.14));ob=bpy.context.object
    for c in list(ob.users_collection):c.objects.unlink(ob)
    col.objects.link(ob);ob.name=f'Luz de placa · LED {side}';ob.dimensions=(.035,.012,.004);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(led)
    mod=ob.modifiers.new('Lente arredondada','BEVEL');mod.width=.0015;mod.segments=3
smoke=bpy.data.materials.get('Lentes traseiras fumê')
if smoke:
    bs=smoke.node_tree.nodes.get('Principled BSDF')
    if bs:
        for link in list(bs.inputs['Base Color'].links):smoke.node_tree.links.remove(link)
        bs.inputs['Base Color'].default_value=(.012,.014,.017,1);bs.inputs['Roughness'].default_value=.17
        bs.inputs['Transmission Weight'].default_value=0
        bs.inputs['Alpha'].default_value=1;smoke.diffuse_color=(.012,.014,.017,1)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
(R/'modelo/gol-refinado/validacao-traseira.json').write_text(json.dumps({'sticker':'recorte da foto 20260416_141312.jpg','sticker_shape':'círculo na superfície tangente, textura retificada da elipse da foto','photo_ellipse':{'center':[ecx,ecy],'axes':[ew,eh],'angle':angle},'sticker_diameter_m':r*2,'sticker_center':[cy,cz],'plate_leds':2,'plate_light_independent':True,'smoked_lenses':True},ensure_ascii=False,indent=2)+'\n')
