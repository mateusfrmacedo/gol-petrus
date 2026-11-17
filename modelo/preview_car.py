import os; W = os.path.dirname(os.path.abspath(__file__))   # pasta de trabalho = esta pasta
import numpy as np, pickle, sys, json
sys.path.insert(0, W); import regions as RG
P=pickle.load(open('gol_parts.pkl','rb')); meta=json.load(open('gol_meta.json'))
out=[]
MATC={1:(0.92,0.92,0.92),2:(0.03,0.03,0.03),3:(0.02,0.02,0.02),4:(0.03,0.03,0.03),6:(0.2,0.2,0.2),7:(0.6,0.6,0.6),8:(0.06,0.06,0.06),15:(0.5,0.55,0.6),19:(0.6,0.6,0.62)}
def add(name,v,n,f,col,rough=0.4,metal=0.0,c=None,alpha=1.0):
    out.append(dict(name=name,v=np.asarray(v,np.float32),n=np.asarray(n,np.float32),f=np.asarray(f),col=col,rough=rough,metal=metal,c=c,alpha=alpha))
for p in P:
    v,n,f=p['v'],p['n'],p['f']
    if 'cls' in p:
        cls=p['cls']; R=RG.regions(v[:,0],v[:,1],v[:,2],n[:,0],n[:,1],n[:,2])
        c=np.full((len(v),3),0.9)
        for k,col in {'dlo':(0.02,0.02,0.025),'ws':(0.02,0.02,0.025),'rg':(0.02,0.02,0.025),'hl':(0.2,0.21,0.23),'gr':(0.01,0.01,0.01),'gl':(0.015,0.015,0.015),'tl':(0.3,0.01,0.01),'dif':(0.03,0.03,0.03),'spo':(0.005,0.005,0.005),'sun':(0.0,0.0,0.0)}.items(): c[R[k]<0]=col
        add('body',v,n,f[(cls&1)>0],(1,1,1),0.25,c=c)
        def sub(bit,off,flip=False):
            ff=f[(cls&bit)>0]; u=np.unique(ff); m=-np.ones(len(v),int); m[u]=np.arange(len(u)); ff=m[ff]
            if flip: ff=ff[:,::-1]
            return v[u]+n[u]*off,(-n[u] if flip else n[u]),ff
        a=sub(2,-0.004); add('glass',*a,(0.05,0.05,0.06),0.05)
        a=sub(16,-0.028,True); add('lining',*a,(0.05,0.05,0.05),0.9)
        a=sub(32,-0.028,True); add('headliner',*a,(0.2,0.2,0.2),0.9)
        continue
    col=p['col']
    if p['dest']==3: continue
    if p['dest']==2:
        for (hx,s) in ((1.2335,1),(1.2335,-1),(-1.2335,1),(-1.2335,-1)):
            vv=v.copy(); nn=n.copy()
            if s<0: vv[:,0]*=-1; vv[:,2]*=-1; nn[:,0]*=-1; nn[:,2]*=-1
            vv[:,0]+=hx; vv[:,1]+=0.298; vv[:,2]+=s*0.728
            # eixo da roda: local Z -> lateral (já é Z do jogo); local X,Y no plano da roda
            add(p['name'],vv,nn,f,col,0.35,0.6 if p['mat']==19 else 0.0)
        continue
    add(p['name'],v,n,f,col,0.3,0.0)
np.savez('prev_car.npz',parts=np.array(out,dtype=object))
