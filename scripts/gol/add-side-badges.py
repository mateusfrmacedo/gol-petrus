"""Emblemas laterais pequenos, divididos na folga porta/para-lama e sem texto espelhado."""
from pathlib import Path
import bpy,bmesh,cv2,numpy as np,json
from PIL import Image
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado'
ref=Path('/Users/mateus/Downloads/Emblema automotivo GOL em preto e cromado.png')
asset=R/'assets/vehicles/gol/emblema-lateral.png';asset.parent.mkdir(parents=True,exist_ok=True)
im=Image.open(ref).convert('RGBA');bounds=im.getchannel('A').getbbox();im=im.crop(bounds);im.save(asset)
a=np.array(im);contours,_=cv2.findContours((a[:,:,3]>128).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
contours=sorted([cv2.approxPolyDP(c,1.5,True)[:,0,:] for c in contours if cv2.contourArea(c)>20000],key=lambda c:c[:,0].mean())
assert len(contours)==2,len(contours)
bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
col=bpy.data.collections['Gol recuperado do visualizador'];oy=(-1.0702612+1.4376315)/2
for ob in list(col.objects):
    if ob.name.startswith('Emblema lateral ·'):bpy.data.objects.remove(ob,do_unlink=True)
skin=bpy.data.objects['PINTURA'];tree=BVHTree.FromPolygons([skin.matrix_world@v.co for v in skin.data.vertices],[list(p.vertices)for p in skin.data.polygons])
mat=bpy.data.materials.new('Emblema GOL lateral · foto fornecida');mat.use_nodes=True
bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Roughness'].default_value=.30;bs.inputs['Metallic'].default_value=.25
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(asset));tex.image.pack();mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
left=im.copy();box=(815-bounds[0],290-bounds[1],1285-bounds[0],390-bounds[1])
left.paste(left.crop(box).transpose(Image.Transpose.FLIP_LEFT_RIGHT),box)
left_asset=asset.with_name('emblema-lateral-esquerdo.png');left.save(left_asset)
left_mat=mat.copy();left_mat.name='Emblema GOL lateral esquerdo · leitura correta'
left_tex=next(n for n in left_mat.node_tree.nodes if n.type=='TEX_IMAGE');left_tex.image=bpy.data.images.load(str(left_asset));left_tex.image.pack()
w,h=im.size;seam=(1346-bounds[0])/w;door_x=.79
# Aumenta em 20% a distância vertical a partir da base do retrovisor (0,91 m).
previous_y=.722;mirror_base_y=.910;badge_y=mirror_base_y-(mirror_base_y-previous_y)*1.20
for side in [-1,1]:
    for part,contour in enumerate(contours):
        coords=[];uv=[]
        for u,v in contour:
            # A peça maior fica sobre a porta; a curta acompanha o para-lama.
            x=door_x+(u/w-seam)*.225;y=badge_y+(0.5-v/h)*.027
            hit=tree.ray_cast(Vector((-side*1.2,oy-x,y)),Vector((side,0,0)))[0]
            assert hit is not None,(x,y,side)
            coords.append((hit.x-side*.0017,oy-x,y));uv.append((u/w,1-v/h))
        me=bpy.data.meshes.new('Adesivo contornado');me.from_pydata(coords,[],[list(range(len(coords)))]);me.update()
        layer=me.uv_layers.new(name='UVMap')
        for loop in me.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
        bm=bmesh.new();bm.from_mesh(me);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
        # Frente da textura orientada para fora em ambos os lados.
        if sum(f.normal.x for f in bm.faces)*(-side)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
        bm.to_mesh(me);bm.free();me.materials.append(left_mat if side<0 else mat)
        ob=bpy.data.objects.new(f'Emblema lateral · {"direito"if side>0 else"esquerdo"} · {part+1}',me);col.objects.link(ob)
        ob['reference']='Emblema automotivo GOL em preto e cromado.png';ob['door_seam_x']=door_x
bpy.ops.wm.save_as_mainfile(filepath=str(R/'modelo/blender/gol-branco.blend'))
(O/'validacao-emblemas-laterais.json').write_text(json.dumps({'sides':2,'pieces_per_side':2,'total_width_m':.225,'height_m':.027,'door_seam_x_m':door_x,'center_height_m':badge_y,'previous_center_height_m':previous_y,'mirror_base_height_m':mirror_base_y,'gap_increase_percent':20,'texture_mirrored':False,'reference':ref.name},indent=2)+'\n')
