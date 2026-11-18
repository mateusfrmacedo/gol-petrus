"""Recorta as fotos reais do proprietário para o atlas das superfícies 3D da cabine.
Execute com Python + Pillow, numpy e opencv-python; não altera as fotos originais.
"""
from pathlib import Path
import base64, json
import cv2
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
photo=Image.open(ROOT/'assets/interior/volante-real.jpeg').convert('RGB')
wheel=photo.crop((395,880,1570,2030)).resize((1024,1024),Image.Resampling.LANCZOS)
# Mantém os detalhes da foto e reduz o clarão de flash que não pertence à luz do jogo.
a=np.asarray(wheel,dtype=np.float32)/255
luma=a.mean(2); illumination=cv2.GaussianBlur(luma,(0,0),48)
gain=np.clip(.26/np.maximum(illumination,.12),.55,1.35)
a=np.clip(a*gain[:,:,None],0,1)
wheel=Image.fromarray(np.round(a*255).astype('uint8'))
atlas=Image.new('RGB',(1024,2048),(14,15,17));atlas.paste(wheel,(0,0))
source=np.asarray(Image.open(ROOT/'assets/interior/painel-real.jpeg').convert('RGB'))
def tile(corners,target):
 width,height=target[2:]
 matrix=cv2.getPerspectiveTransform(np.float32(corners),np.float32([[0,0],[width-1,0],[width-1,height-1],[0,height-1]]))
 result=cv2.warpPerspective(source,matrix,(width,height),flags=cv2.INTER_CUBIC)
 atlas.paste(Image.fromarray(result),(target[0],target[1]))
tile([(852,1752),(1125,1739),(1124,1819),(856,1833)],(0,1024,512,256))
tile([(836,1875),(1133,1859),(1137,1952),(842,1972)],(512,1024,512,256))
tile([(814,1684),(1154,1667),(1151,1718),(816,1734)],(0,1280,512,128))
# Plástico granulado da nova referência: remove apenas o gradiente de iluminação.
reference=Image.open(ROOT/'assets/interior/painel-detalhes.png').convert('RGB')
patch=np.asarray(reference.crop((1320,600,1400,680)),dtype=np.float32)/255
luma=patch.mean(2)
micro=cv2.GaussianBlur(luma,(0,0),.55)-cv2.GaussianBlur(luma,(0,0),2.2)
grain=micro/max(float(micro.std()),.001)
# Espelhamento nas bordas dá continuidade ao padrão, sem linhas de emenda.
grain=np.concatenate([grain,grain[:,::-1]],axis=1)
grain=np.concatenate([grain,grain[::-1,:]],axis=0)
grain=cv2.resize(grain,(512,512),interpolation=cv2.INTER_CUBIC)
albedo=np.clip(128+grain*3.5,90,165).astype('uint8')
atlas.paste(Image.fromarray(np.repeat(albedo[:,:,None],3,axis=2)),(0,1536))
height=cv2.GaussianBlur(grain,(0,0),.7)
dy,dx=np.gradient(height); normal=np.stack([-dx*.32,-dy*.32,np.ones_like(dx)],axis=2)
normal/=np.linalg.norm(normal,axis=2,keepdims=True)
normal=np.clip(np.round((normal*.5+.5)*255),0,255).astype('uint8')
atlas.paste(Image.fromarray(normal),(512,1536))
out=ROOT/'assets/interior/cabine-real.webp';atlas.save(out,'WEBP',quality=94,method=6)
code='''// Gerado por scripts/build-cabin-textures.py a partir das fotos reais fornecidas.
const CABIN_IMAGES = { texture: null };
const CABIN_REAL_WEBP = '%s';
BUILD.push(async () => {
  const bin = Uint8Array.from(atob(CABIN_REAL_WEBP), c => c.charCodeAt(0));
  const bmp = await createImageBitmap(new Blob([bin], { type: 'image/webp' }), { colorSpaceConversion: 'none' });
  const tex = mkTex(bmp.width, bmp.height, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: 6 });
  G.dev.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex }, [bmp.width, bmp.height]);
  genMips(tex, 'rgba8unorm-srgb'); CABIN_IMAGES.texture = tex; bmp.close();
});
'''%base64.b64encode(out.read_bytes()).decode()
(ROOT/'source/js/30_car_b0_cabin_assets.js').write_text(code)
print('Atlas real:',len(out.read_bytes()),'bytes')
