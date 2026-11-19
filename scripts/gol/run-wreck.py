"""Executa o AnyWreck original com bpy instalado, sem exigir o executável gráfico do Blender."""
from pathlib import Path
import runpy,sys
import bpy
R=Path(__file__).resolve().parents[2];O=R/'modelo/gol-refinado/danos'
sys.argv=['wreck.py','--','--input',str(O/'capo-limpo.blend'),'--output',str(O/'capo-amassado.blend'),'--output',str(O/'capo-amassado.glb'),'--report',str(O/'anywreck-report.json'),'--profile',str(O/'perfil-gol.json'),'--hits',str(O/'impacto.json'),'--severity','.22','--wear','0','--seed','7','--res','128','--smooth','12','--detail','80','--no-floor']
runpy.run_path(str(R/'.tools/anywreck/pipeline/wreck.py'),run_name='__main__')
