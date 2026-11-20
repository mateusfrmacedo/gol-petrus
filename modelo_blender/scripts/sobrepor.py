"""Sobrepõe o render (mesma câmera) à foto: contorno do modelo em vermelho, vidros em ciano, render translúcido.
uso: python3 sobrepor.py <etapa> [vistas]"""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W = os.path.dirname(os.path.abspath(__file__))
etapa = sys.argv[1]; vistas = sys.argv[2:] or ['25', '26', '28', '29']
FOTO = '/mnt/user-data/uploads/Gol de corrida/photo_2026-11-17 11.26.%s.jpeg'
CROP = {'r00': (60, 40, 1480, 1000), 'r06': (60, 30, 1320, 1150), 'r03': (20, 90, 1774, 887), '25': (300, 548, 668, 706), '26': (180, 790, 1440, 1630), '28': (20, 80, 1190, 960), '29': (30, 105, 1100, 860)}
NOME = {'r00': 'gol-00 frente (vista gerada)', 'r06': 'gol-06 traseira (vista gerada)', 'r03': 'gol-03 perfil esq. (vista gerada)', '25': 'perfil', '26': 'dianteira 3/4 esq.', '28': 'traseira 3/4 dir.', '29': 'dianteira 3/4 dir.'}
FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
def edge(mask):
    m = Image.fromarray((mask * 255).astype(np.uint8)); e = np.array(m.filter(ImageFilter.FIND_EDGES)) > 60
    return np.array(Image.fromarray(e).filter(ImageFilter.MaxFilter(3))) > 0
tiles = []
for k in vistas:
    if k.startswith('r'):
        src = Image.open('/mnt/user-data/uploads/gol-360-rodas-revisadas/' + {'r00': 'gol-00-frente.png', 'r06': 'gol-06-traseira.png', 'r03': 'gol-03-perfil-esquerdo.png'}[k]).convert('RGBA')
        ph = Image.alpha_composite(Image.new('RGBA', src.size, (200, 200, 200, 255)), src).convert('RGB')
    else: ph = Image.open(FOTO % k).convert('RGB')
    r = Image.open(os.path.join(W, 'renders', f'{etapa}_{k}.png')).convert('RGBA').resize(ph.size, Image.LANCZOS)
    ra = np.array(r).astype(float) / 255; a = ra[..., 3]; lum = ra[..., :3].mean(-1)
    sil = edge(a > 0.5)
    gp = os.path.join(W, 'renders', f'{etapa}_{k}_vidros.png')
    if os.path.exists(gp):
        gm = np.array(Image.open(gp).convert('RGBA').resize(ph.size, Image.NEAREST)).astype(float) / 255
        glass = edge((gm[..., 3] > 0.5) & (gm[..., :3].mean(-1) > 0.5))
    else: glass = np.zeros_like(sil)
    P = np.array(ph).astype(float)
    blend = P * (1 - 0.45 * a[..., None]) + ra[..., :3] * 255 * 0.45 * a[..., None]
    for img in (P, blend):
        img[sil] = (255, 30, 30); img[glass] = (0, 230, 255)
    x0, y0, x1, y1 = CROP[k]
    A = Image.fromarray(P.astype(np.uint8)).crop(CROP[k]); Bm = Image.fromarray(blend.astype(np.uint8)).crop(CROP[k])
    s = 900 / A.width; A = A.resize((900, int(A.height * s)), Image.LANCZOS); Bm = Bm.resize(A.size, Image.LANCZOS)
    T = Image.new('RGB', (1830, A.height + 50), (241, 240, 235)); T.paste(A, (0, 50)); T.paste(Bm, (930, 50))
    ImageDraw.Draw(T).text((0, 10), f'{k if k.startswith("r") else "11.26." + k} · {NOME[k]} · contorno do modelo (vermelho) e vidros (ciano)', fill=(25, 35, 30), font=FT)
    tiles.append(T)
H = sum(t.height + 20 for t in tiles); O = Image.new('RGB', (1830, H), (241, 240, 235)); y = 0
for t in tiles: O.paste(t, (0, y)); y += t.height + 20
O.save(os.path.join(W, f'sobreposicao_{etapa}.png')); print(O.size)
