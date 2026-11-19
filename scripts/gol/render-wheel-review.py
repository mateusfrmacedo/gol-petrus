"""Conferência da face plana da roda no mesmo modelo exportado para o jogo."""
from pathlib import Path
import bpy
from mathutils import Vector
R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado/revisao'
bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/gol-refinado/gol-modular.blend'));sc=bpy.context.scene
cam=bpy.data.objects['Exterior frente'];cam.location=Vector((1.98,2.0,.63));target=Vector((1.254,.745,.278));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.angle=.43;sc.camera=cam
sc.render.resolution_x=900;sc.render.resolution_y=700;sc.cycles.samples=20;sc.render.filepath=str(O/'roda-face-plana.png');bpy.ops.render.render(write_still=True)
