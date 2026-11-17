import numpy as np
from PIL import Image, ImageDraw
from skimage import measure
D=np.load('sdf.npy'); X0,Y0,_,H=np.load('sdf_meta.npy')
sil=D.min(axis=2)  # (x,y)
cs=measure.find_contours(sil,0.0)
im=Image.open('/mnt/user-data/uploads/Gol de corrida/photo_2026-11-17 11.26.25.jpeg').crop((310,560,660,700)).resize((1400,560),Image.LANCZOS)
d=ImageDraw.Draw(im)
def topx(x,y):
    if x>=1.2335: px=280-(x-1.2335)/0.003289
    elif x>=-1.2335: px=280+(1.2335-x)/0.002909
    else: px=1128+(-1.2335-x)/0.0033
    return px, 512-y/0.0031
for c in cs:
    pts=[topx(X0+i*H, Y0+j*H) for i,j in c]
    d.line(pts,fill=(255,0,0),width=2)
im.save('ov.png')
