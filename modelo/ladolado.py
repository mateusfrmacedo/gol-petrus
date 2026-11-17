"""foto ao lado do render (mesma câmera), recortados no carro. uso: ladolado.py etapa saida vistas..."""
import sys, numpy as np
from PIL import Image
etapa, out = sys.argv[1], sys.argv[2]; vs = sys.argv[3:]
FOTO = '/mnt/user-data/uploads/Gol de corrida/photo_2026-11-17 11.26.%s.jpeg'
R360 = {'r00': 'gol-00-frente.png', 'r06': 'gol-06-traseira.png'}
CROP = {'25': (300, 548, 668, 706), '26': (180, 790, 1440, 1630), '28': (20, 80, 1190, 960), '29': (30, 105, 1100, 860), 'r00': (60, 40, 1480, 1000), 'r06': (60, 30, 1320, 1150)}
tiles = []
for k in vs:
    if k in R360:
        s = Image.open('/mnt/user-data/uploads/gol-360-rodas-revisadas/' + R360[k]).convert('RGBA'); ph = Image.alpha_composite(Image.new('RGBA', s.size, (190, 190, 190, 255)), s).convert('RGB')
    else: ph = Image.open(FOTO % k).convert('RGB')
    r = Image.open(f'renders/{etapa}_{k}.png').convert('RGBA').resize(ph.size, Image.LANCZOS)
    comp = Image.alpha_composite(Image.new('RGBA', ph.size, (190, 190, 190, 255)), r).convert('RGB')
    a = ph.crop(CROP[k]); b = comp.crop(CROP[k]); s = 760 / a.width; a = a.resize((760, int(a.height * s))); b = b.resize(a.size)
    t = Image.new('RGB', (1530, a.height), 'white'); t.paste(a, (0, 0)); t.paste(b, (770, 0)); tiles.append(t)
O = Image.new('RGB', (1530, sum(t.height + 8 for t in tiles)), 'white'); y = 0
for t in tiles: O.paste(t, (0, y)); y += t.height + 8
O.save(out)
