"""Reconstrói os pixels das texturas com a permutação do visualizador.

Uso: python scripts/decode-civic-textures.py pasta-originais pasta-saida
Requer numpy e Pillow. Usa as mesmas variantes de dimensões potência de dois
selecionadas pelo userscript; salva os pixels em PNG, sem recompressão com perdas.
"""
from pathlib import Path
import json, shutil, subprocess, sys
import numpy as np
from PIL import Image

source, out = map(Path, sys.argv[1:3])
out.mkdir(parents=True, exist_ok=True)
textures = json.loads((source / 'textures.json').read_text())['results']
cache = out / 'encoded'
cache.mkdir(exist_ok=True)
manifest = []
for texture in textures:
    def power2(n): return n > 0 and (n & (n - 1)) == 0
    images = [i for i in texture['images'] if power2(i['width']) and power2(i['height'])]
    image = max(images, key=lambda i: (i['width'] * i['height'], i['size']))
    original = cache / texture['name']
    subprocess.run(['curl', '-fLsS', '--max-time', '60', image['url'], '-o', str(original)], check=True)
    pixels = np.array(Image.open(original).convert('RGB'))
    height, width = pixels.shape[:2]
    pk = image.get('pk')
    if pk:
        # Same diagonal tile order and four orientations as osg.Texture's shader.
        tw, th = width // 8, height // 8
        small, large = min(tw, th), max(tw, th)
        order = np.empty(width * height, dtype=np.int64)
        yy, xx = np.mgrid[:8, :8]
        for ty in range(th):
            for tx in range(tw):
                diagonal = tx + ty
                if diagonal < small:
                    before = diagonal * (diagonal + 1) // 2
                    offset = diagonal - ty if diagonal % 2 == 0 else ty
                elif diagonal < large:
                    before = small * (small + 1) // 2 + small * (diagonal - small)
                    pos = th - ty - 1
                    if tw < th: pos = small - (tw - tx)
                    offset = pos if diagonal % 2 == 0 else small - pos - 1
                else:
                    r = diagonal - large
                    before = small * (small + 1) // 2 + small * (large - small) + (small - 1) * r - (r - 1) * r // 2
                    pos = th - ty - 1
                    length = small + large - diagonal - 1
                    offset = pos if diagonal % 2 == 0 else length - pos - 1
                tile = before + offset
                mode = tile % 4
                if mode == 0: px, py = xx, yy
                elif mode == 1: px, py = 7 - xx, yy
                elif mode == 2: px, py = yy, xx
                else: px, py = 7 - yy, xx
                indices = tile * 64 + (py * 8 + px).reshape(-1)
                order[indices] = ((ty * 8 + yy) * width + tx * 8 + xx).reshape(-1)
        assert np.unique(order).size == width * height
        flat = pixels.reshape(-1, 3)
        decoded = np.empty_like(flat)
        decoded[order] = np.roll(flat[order], (pk * 64) % len(flat), axis=0)
        pixels = decoded.reshape(height, width, 3)
    name = Path(texture['name']).stem + '.png'
    Image.fromarray(pixels).save(out / name)
    manifest.append({'uid': texture['uid'], 'name': name, 'width': width, 'height': height, 'source': image['url'], 'viewerPermutation': pk})
    print(name, width, height, flush=True)
for name in ['model.json', 'textures.json']:
    shutil.copyfile(source / name, out / name)
(out / 'decoded-textures.json').write_text(json.dumps(manifest, indent=2) + '\n')
