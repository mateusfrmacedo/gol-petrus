"""Silhueta do carro em cada foto (GrabCut iniciado pela projeção do modelo atual) e nas vistas geradas (canal alfa).
Salva silhuetas/<vista>.png (255 = carro) e uma prancha de conferência."""
import numpy as np, cv2, os, json
from PIL import Image
W = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(W, 'silhuetas'), exist_ok=True)
FOTO = '/mnt/user-data/uploads/Gol de corrida/photo_2026-11-17 11.26.%s.jpeg'
R360 = {'r00': 'gol-00-frente.png', 'r06': 'gol-06-traseira.png'}
tiles = []
for k in ('25', '26', '28', '29', 'r00', 'r06'):
    if k in R360:
        a = np.array(Image.open('/mnt/user-data/uploads/gol-360-rodas-revisadas/' + R360[k]).convert('RGBA'))
        m = (a[..., 3] > 128).astype(np.uint8) * 255; img = a[..., :3][..., ::-1].copy()
    else:
        img = cv2.imread(FOTO % k); h, w = img.shape[:2]
        rm = np.array(Image.open(os.path.join(W, 'renders', f'bloco_{k}.png')).convert('RGBA').resize((w, h)))[..., 3] > 128
        s = max(w, h) / 1000
        dil = cv2.dilate(rm.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(60 * s) | 1,) * 2))
        ero = cv2.erode(rm.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(40 * s) | 1,) * 2))
        gm = np.full((h, w), cv2.GC_BGD, np.uint8); gm[dil > 0] = cv2.GC_PR_BGD; gm[rm] = cv2.GC_PR_FGD; gm[ero > 0] = cv2.GC_FGD
        bg = np.zeros((1, 65)); fg = np.zeros((1, 65))
        cv2.grabCut(img, gm, None, bg, fg, 8, cv2.GC_INIT_WITH_MASK)
        m = np.where((gm == cv2.GC_FGD) | (gm == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        # maior componente + preenche buracos
        n, lab, st, _ = cv2.connectedComponentsWithStats(m); i = 1 + np.argmax(st[1:, 4]); m = (lab == i).astype(np.uint8) * 255
        ff = m.copy(); cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 255); m = m | cv2.bitwise_not(ff)
    cv2.imwrite(os.path.join(W, 'silhuetas', f'{k}.png'), m)
    v = img.copy(); cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(v, cs, -1, (0, 0, 255), max(2, img.shape[1] // 500))
    t = Image.fromarray(v[..., ::-1]); t = t.resize((700, int(700 * t.height / t.width))); tiles.append(t)
H = max(t.height for t in tiles); O = Image.new('RGB', (2100, 2 * H), 'white')
for i, t in enumerate(tiles): O.paste(t, ((i % 3) * 700, (i // 3) * H))
O.save(os.path.join(W, 'silhuetas', 'conferencia.png')); print('ok')
