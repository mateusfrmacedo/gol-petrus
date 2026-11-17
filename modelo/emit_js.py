# grava source/js/30_car_a0_data.js com a malha compactada (base64) e as medidas do Gol
import base64, json, sys, os
W = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1]
b = base64.b64encode(open(os.path.join(W, 'gol_mesh.bin'), 'rb').read()).decode()
meta = json.load(open(os.path.join(W, 'gol_meta.json')))
open(out, 'w').write('// Gerado por modelo/emit_js.py — não editar à mão.\n'
    f'const GOL_META = {json.dumps(meta, separators=(",", ":"))};\n'
    f"const GOL_B64 = '{b}';\n"
    f"const GOL_FOTO_WEBP = '{base64.b64encode(open(os.path.join(W, 'gol_atlas.webp'), 'rb').read()).decode()}';   // insertos fotográficos da frente e da traseira\n")
print(len(b) // 1024, 'KiB base64')
