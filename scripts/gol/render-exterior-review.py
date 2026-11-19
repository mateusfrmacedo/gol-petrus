"""Atualiza as prévias geradas, sem alterar o .blend nem o GLB já validados."""
from pathlib import Path
import bpy,shutil
from mathutils import Vector
R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado/revisao';bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/gol-refinado/gol-modular.blend'));sc=bpy.context.scene
sc.render.resolution_x=960;sc.render.resolution_y=640;sc.cycles.samples=16
cam=bpy.data.objects['Exterior frente'];sc.camera=cam
for filename,eye,target in [('exterior-frente.png',(4.8,2.1,-3.9),(0,.7,0)),('exterior-traseira.png',(-4.8,1.8,3.4),(0,.7,0))]:
 cam.location=(eye[0],-eye[2],eye[1]);t=Vector((target[0],-target[2],target[1]));cam.rotation_euler=(t-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.angle=.65;sc.render.filepath=str(O/filename);bpy.ops.render.render(write_still=True)
sc.camera=bpy.data.objects['Motorista']
for ob in sc.objects:
 if ob.get('game_target')=='glass' and ob.name=='vidros.para-brisa':ob.visible_camera=False
sc.render.filepath=str(O/'motorista.png');bpy.ops.render.render(write_still=True)
shutil.copy2(O/'exterior-frente.png',R/'modelo/blender/dianteira.png');shutil.copy2(O/'exterior-traseira.png',R/'modelo/blender/traseira.png');shutil.copy2(O/'roda-face-plana.png',R/'modelo/blender/roda.png')
