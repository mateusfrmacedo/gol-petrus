"""Insertos fotográficos da frente e da traseira: tudo o que não é pintura branca nas vistas gol-00 e gol-06
(faróis, grade, emblema, neblinas, grade inferior, placa, lanternas, nicho da placa, refletores, aerofólio)
vira textura projetada pela câmera resolvida da vista. Gera insertos/<vista>_rgba.png e a máscara de conferência."""
import numpy as np, cv2, os
from PIL import Image
W = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(W, 'insertos'), exist_ok=True)
SRC = {'00': 'gol-00-frente.png', '06': 'gol-06-traseira.png'}
REF = os.environ.get('REF360', '/mnt/user-data/uploads/gol-360-rodas-revisadas')
def mascara(k):
    a = np.array(Image.open(os.path.join(REF, SRC[k])).convert('RGBA')); rgb = a[..., :3]; car = a[..., 3] > 200
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV); s = hsv[..., 1].astype(float); v = hsv[..., 2].astype(float)
    nao_branco = (v < 150) | (s > 70)                       # escuro ou colorido (lanternas, faixa azul da placa)
    m = (nao_branco & car).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    # placa e emblemas são claros por dentro: preenche buracos fechados
    ff = m.copy(); h, w = m.shape; cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 255); m = m | cv2.bitwise_not(ff)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] > 60: keep[lab == i] = 255                # descarta pontinhos
    m = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    m = cv2.GaussianBlur(m, (0, 0), 2.0)                       # borda suave (mistura com a pintura)
    return rgb, m
if __name__ == '__main__':
    for k in SRC:
        rgb, m = mascara(k)
        Image.fromarray(np.dstack([rgb, m])).save(os.path.join(W, 'insertos', f'{k}_rgba.png'))
        v = rgb.copy(); v[m < 40] = (v[m < 40] * 0.25 + np.array([255, 0, 255]) * 0.75).astype(np.uint8)
        Image.fromarray(v).resize((v.shape[1] // 2, v.shape[0] // 2)).save(os.path.join(W, 'insertos', f'{k}_conferencia.png'))
    print('ok')
