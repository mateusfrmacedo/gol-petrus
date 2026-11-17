# grava source/js/30_car_a0_data.js com a malha compactada (base64) e as medidas do Gol
import os; W = os.path.dirname(os.path.abspath(__file__))   # pasta de trabalho = esta pasta
import base64, json, sys
out = sys.argv[1]
b = base64.b64encode(open(os.path.join(W, 'gol_mesh.bin'), 'rb').read()).decode()
meta = json.load(open(os.path.join(W, 'gol_meta.json')))
open(out, 'w').write('// Gerado por modelo/emit_js.py — não editar à mão.\n'
    f'const GOL_META = {json.dumps(meta, separators=(",", ":"))};\n'
    f"const GOL_B64 = '{b}';\n")
print(len(b) // 1024, 'KiB base64')
