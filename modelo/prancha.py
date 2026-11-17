import os
# Prancha de referências: recortes das fotos reais com legenda
from PIL import Image, ImageDraw, ImageFont
P = os.path.join(os.environ.get('FOTOS', 'fotos'), 'photo_2026-11-17 11.26.%s.jpeg')
C = [('25', (300, 548, 668, 706), 'Perfil quase lateral (lado esquerdo)', 'centros das rodas, soleira, arcos, vidros, teto e balanços'),
     ('26', (180, 790, 1440, 1630), 'Dianteira em três quartos (lado esquerdo)', 'capô, faróis, grade, neblinas, retrovisor, teto solar, pinça'),
     ('28', (20, 80, 1190, 960), 'Traseira em três quartos (lado direito)', 'lanternas, aerofólio, vigia, emblemas, placa, combustível'),
     ('29', (30, 105, 1100, 860), 'Dianteira em três quartos (lado direito)', 'faróis × grade × para-choque, neblinas, folga das rodas'),
     ('27', (0, 160, 720, 1180), 'Roda avulsa (referência da roda)', 'raios, faces usinadas, rebaixos, 4 furos, centro VW')]
W = 2400; cellw = (W - 3 * 30) // 2
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
ft = ImageFont.truetype(FB, 28); fs = ImageFont.truetype(F, 21); fh = ImageFont.truetype(FB, 44)
cells = []
for (k, box, t, s) in C:
    im = Image.open(P % k).convert('RGB').crop(box)
    sc = cellw / im.width if k != '27' else 700 / im.height
    cells.append((k, im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS), t, s))
rows = [cells[0:2], cells[2:4]]
H = 120 + sum(max(c[1].height for c in r) + 100 for r in rows) + cells[4][1].height + 130
B = Image.new('RGB', (W, H), (241, 240, 235)); d = ImageDraw.Draw(B)
d.rectangle([30, 30, W - 30, 36], fill=(45, 90, 70)); d.text((30, 50), 'Gol branco · referências', fill=(25, 35, 30), font=fh)
y = 120
for r in rows:
    x = 30; hmax = max(c[1].height for c in r)
    for (k, im, t, s) in r:
        B.paste(im, (x, y)); d.text((x, y + im.height + 10), f'{t}', fill=(25, 35, 30), font=ft)
        d.text((x + im.width - 150, y + im.height + 12), f'11.26.{k}', fill=(70, 90, 80), font=ft)
        d.text((x, y + im.height + 48), s, fill=(70, 80, 75), font=fs); x += cellw + 30
    y += hmax + 100
k, im, t, s = cells[4]; B.paste(im, (30, y)); d.text((60 + im.width, y + 10), t + '  ·  11.26.' + k, fill=(25, 35, 30), font=ft); d.text((60 + im.width, y + 50), s, fill=(70, 80, 75), font=fs)
d.text((60 + im.width, y + 110), 'Réguas: entre-eixos 2.466 mm e bitolas 1.429/1.417 mm (ficha técnica Gol G7 2017),', fill=(70, 80, 75), font=fs)
d.text((60 + im.width, y + 140), 'placa Mercosul 400 × 130 mm. Câmeras de cada foto resolvidas por pontos marcados.', fill=(70, 80, 75), font=fs)
B.save('prancha_referencias.png'); print(B.size)
