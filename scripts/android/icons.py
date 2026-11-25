"""Exporta a arte aprovada em densidades Android, recorte redondo e camada adaptável."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'assets/android'
RES = ROOT / 'android/app/src/main/res'
source = Image.open(ART / 'gta-na-master.png').convert('RGBA')

def rounded(image):
    image = image.copy()
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).ellipse((0, 0, image.width - 1, image.height - 1), fill=255)
    image.putalpha(mask)
    return image

# O primeiro plano ocupa 72 dos 108 dp; letras e carro cabem no círculo central.
foreground = Image.new('RGBA', (432, 432))
foreground.alpha_composite(source.resize((288, 288), Image.Resampling.LANCZOS), (72, 72))
(RES / 'drawable-nodpi').mkdir(parents=True, exist_ok=True)
foreground.save(RES / 'drawable-nodpi/ic_launcher_foreground.png')
for density, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
    dest = RES / ('mipmap-' + density)
    dest.mkdir(parents=True, exist_ok=True)
    icon = source.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(dest / 'ic_launcher.png')
    rounded(icon).save(dest / 'ic_launcher_round.png')
rounded(source.resize((512, 512), Image.Resampling.LANCZOS)).save(ART / 'gta-na-redondo.png')
source.resize((512, 512), Image.Resampling.LANCZOS).save(ART / 'gta-na-quadrado.png')

# Ícone temático do Nothing OS: apenas as letras aprovadas, com alfa monocromático.
w, h = source.size
letters = source.crop((int(w*.325), int(h*.106), int(w*.673), int(h*.456)))
mask = letters.convert('RGB').point(lambda value: 255 if value > 230 else 0)
r, g, b = mask.split()
from PIL import ImageChops
alpha = ImageChops.darker(ImageChops.darker(r, g), b)
glyph = Image.new('RGBA', letters.size, 'white'); glyph.putalpha(alpha)
glyph.thumbnail((228, 228), Image.Resampling.LANCZOS)
mono = Image.new('RGBA', (432, 432)); mono.alpha_composite(glyph, ((432-glyph.width)//2, (432-glyph.height)//2))
mono.save(RES / 'drawable-nodpi/ic_launcher_monochrome.png')
for name in ['ic_launcher', 'ic_launcher_round']:
    target = RES / 'mipmap-anydpi-v26'
    target.mkdir(parents=True, exist_ok=True)
    (target / (name + '.xml')).write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/icon_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
''')
(RES / 'values').mkdir(parents=True, exist_ok=True)
(RES / 'values/colors.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources><color name="icon_background">#101419</color></resources>
''')
print('Ícones quadrado, redondo, adaptável e monocromático exportados.')
