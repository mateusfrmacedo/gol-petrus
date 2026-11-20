"""Prévias da revisão do para-choque aplicadas ao mesmo modelo exportado."""
from pathlib import Path
import bpy,math,argparse
from mathutils import Vector
R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado/revisao'
bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/gol-refinado/gol-modular.blend'))
p=argparse.ArgumentParser();p.add_argument('--views',nargs='*');p.add_argument('--samples',type=int,default=24);p.add_argument('--signals',choices=['left','right','off'],default='off');args=p.parse_args()
for m in bpy.data.materials:
    if m.get('game_id')==30 and args.signals!='off' and m.get('game_pa')==(0 if args.signals=='left'else 1):
        b=m.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=(1,.20,.003,1)
        b.inputs['Emission Color'].default_value=(1,.20,.003,1);b.inputs['Emission Strength'].default_value=2.5
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=args.samples;s.cycles.use_denoising=True
s.render.resolution_x=1500;s.render.resolution_y=1000;s.render.resolution_percentage=100
s.render.film_transparent=False
cam=bpy.data.objects['Exterior frente'];s.camera=cam
views=[
    ('parachoque-frente.png',(6,.78,0),(.5,.70,0),'ORTHO',2.2),
    ('parachoque-detalhe.png',(6,.56,0),(1.9,.43,0),'ORTHO',1.86),
    ('parachoque-perspectiva.png',(4.6,1.7,-3.7),(0,.69,0),'PERSP',.65),
    ('emblema-lateral-esquerdo.png',(.79,.80,-3),(.79,.72,-.78),'ORTHO',.56),
    ('emblema-lateral-direito.png',(.79,.80,3),(.79,.72,.78),'ORTHO',.56),
    ('aerofolio-preto.png',(-3.7,2.9,3),(-1.0,1.15,0),'PERSP',.65),
    ('teto-e-antena.png',(2.4,4,-2.7),(-.3,1.1,0),'PERSP',.65),
    ('traseira-revisada.png',(-4.6,1.6,-3),(-.45,.74,0),'PERSP',.65),
    ('seta-retrovisor-esquerdo.png',(2.2,1.25,-3),(.62,.84,-.83),'PERSP',.32),
    ('seta-retrovisor-direito.png',(2.2,1.25,3),(.62,.84,.83),'PERSP',.32),
    ('adesivo-traseiro-redondo.png',(-3,.85,-.65),(-1.80,.66,-.47),'PERSP',.32),
]
for ob in s.objects:
    if ob.get('game_target')=='deflector':ob.hide_render=True
for filename,eye,target,mode,scale in views:
    if args.views and filename not in args.views:continue
    cam.location=(eye[0],-eye[2],eye[1]);t=Vector((target[0],-target[2],target[1]))
    cam.rotation_euler=(t-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type=mode
    if mode=='ORTHO':cam.data.ortho_scale=scale
    else:cam.data.angle=scale
    s.render.filepath=str(O/filename);bpy.ops.render.render(write_still=True)
