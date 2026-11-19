"""Valida que uma edição de objeto no Blender chega ao buffer do jogo."""
from pathlib import Path
import bpy,base64,json,re,runpy,sys,tempfile,zlib
import numpy as np
R=Path(__file__).resolve().parents[1]
def load(path):
 text=path.read_text();meta=json.loads(re.search(r'const GOL_REFINED_META=(.*);',text)[1]);encoded=json.loads(re.search(r'const GOL_REFINED_B64=(.*);',text)[1]);return meta,zlib.decompress(base64.b64decode(encoded))
baseline,raw=load(R/'source/js/30_car_b1_refined_data.js')
with tempfile.TemporaryDirectory(prefix='gol-export-') as folder:
 folder=Path(folder);blend=folder/'edicao.blend';out=folder/'interior.js'
 bpy.ops.wm.open_mainfile(filepath=str(R/'modelo/gol-refinado/gol-modular.blend'))
 ob=bpy.data.objects['painel.casca'];ob.location.x+=.02
 bpy.ops.wm.save_as_mainfile(filepath=str(blend))
 sys.argv=['export-interior.py','--blend',str(blend),'--output',str(out),'--report',str(folder/'report.json')]
 runpy.run_path(str(R/'scripts/gol/export-interior.py'),run_name='__main__');edited,edited_raw=load(out)
 for before,after in zip(baseline['parts'],edited['parts']):
  assert before['name']==after['name'] and before['nv']==after['nv']
  a=np.frombuffer(raw,dtype='<f4',count=before['nv']*8,offset=before['offset']).reshape((-1,8))
  b=np.frombuffer(edited_raw,dtype='<f4',count=after['nv']*8,offset=after['offset']).reshape((-1,8))
  expected=np.zeros_like(a)
  if before['name']=='painel.casca':expected[:,0]=.02
  assert np.allclose(b-a,expected,atol=2e-6),before['name']
 print('PASS: edição de 20 mm aplicada ao painel; demais peças, UVs e normais preservados.')
