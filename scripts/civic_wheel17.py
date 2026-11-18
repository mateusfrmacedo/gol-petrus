"""Roda G10 aro 17: contornos da referência, raios extrudados e barril aberto.

A face usa a fotografia retificada; os espaços entre raios e os cinco furos
são recortados na malha. Unidades em metros, eixo Z apontando para fora.
"""
from pathlib import Path
import json, math
import cv2
import mapbox_earcut
import numpy as np


def build_reference_wheel(reference, out, diameter_inches=19):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    image = cv2.imread(str(reference))
    white = (image.min(2) > 243).astype('uint8')
    count, labels, stats, centers = cv2.connectedComponentsWithStats(white)
    contours, _ = cv2.findContours(1-white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    ellipse = cv2.fitEllipse(max(contours, key=cv2.contourArea))
    center, axes, angle = ellipse
    theta = math.radians(angle)
    rotate = np.array([[math.cos(theta), -math.sin(theta)], [math.sin(theta), math.cos(theta)]])
    affine = rotate @ np.diag(2 / np.array(axes)) @ rotate.T
    h = np.eye(3); h[:2, :2] = affine; h[:2, 2] = -affine @ center
    # A disk-preserving projective transform centers the Honda cap while keeping
    # the fitted outer ellipse circular. The photograph is slightly oblique.
    cap = np.array([535., 625.])
    a = affine @ (cap-center)
    length = np.linalg.norm(a)
    gamma = 1 / math.sqrt(1-length*length)
    boost = np.eye(3)
    boost[:2, :2] += (gamma-1) * np.outer(a, a) / (length*length)
    boost[:2, 2] = -gamma*a; boost[2, :2] = -gamma*a; boost[2, 2] = gamma
    to_photo = np.array([[500., 0., 512.], [0., 500., 512.], [0., 0., 1.]])
    warp = to_photo @ boost @ h
    rectified = cv2.warpPerspective(image, warp, (1024,1024), flags=cv2.INTER_LANCZOS4, borderValue=(255,255,255))
    cv2.imwrite(str(out/'face.png'), rectified)
    radius = .2255

    def transform(points):
        pixels = cv2.perspectiveTransform(np.asarray(points, dtype='float32').reshape(-1,1,2), warp).reshape(-1,2)
        xy = (pixels-512) * (radius/500)
        xy[:,1] *= -1
        return xy.astype(float)

    openings, lug_centers = [], []
    for k in range(1, count):
        area = stats[k, cv2.CC_STAT_AREA]
        distance = np.linalg.norm(centers[k]-cap)
        is_opening = 5000 < area < 40000 and distance < 450
        is_lug = 400 < area < 1000 and distance < 150
        if not (is_opening or is_lug): continue
        cs, _ = cv2.findContours((labels==k).astype('uint8'), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        contour = max(cs, key=cv2.contourArea)
        if is_opening:
            poly = cv2.approxPolyDP(contour, 1.2, True)[:,0,:]
        else:
            lug_centers.append(transform([centers[k]])[0])
            poly = cv2.approxPolyDP(contour, .65, True)[:,0,:]
        openings.append(transform(poly))
    assert len(openings) == 15, 'Esperados dez espaços entre raios e cinco furos'
    assert len(lug_centers) == 5

    def area(p): return np.sum(p[:,0]*np.roll(p[:,1],-1)-p[:,1]*np.roll(p[:,0],-1))/2
    angles = np.arange(256)*2*np.pi/256
    outer = np.stack([np.cos(angles),np.sin(angles)],axis=1)*radius*.988
    rings = [outer]+[p[::-1] if area(p)>0 else p for p in openings]

    def inset(p, distance):
        edges = np.roll(p,-1,axis=0)-p
        edges /= np.linalg.norm(edges,axis=1)[:,None]
        left = np.stack([-edges[:,1],edges[:,0]],axis=1)
        bisect = left+np.roll(left,1,axis=0)
        bisect /= np.maximum(np.linalg.norm(bisect,axis=1)[:,None],1e-10)
        dot = np.sum(bisect*left,axis=1)
        return p+bisect*(distance/np.maximum(dot,.35))[:,None]
    front_rings = [inset(p,.00125) for p in rings]

    def profile(x,y):
        r = math.hypot(x,y)
        t = np.clip((r-.035)/.19,0,1)
        z = .078+.038*(t*t*(3-2*t))
        dz = .038*6*t*(1-t)/.19 if 0 < t < 1 else 0
        normal = np.array([-dz*x/max(r,1e-12),-dz*y/max(r,1e-12),1.])
        normal /= np.linalg.norm(normal)
        return z, normal

    builders = {name: [[],[]] for name in ['face','side','chrome']}
    def vertex(name, p, n, photographic=False):
        n = np.asarray(n,dtype=float)
        uv = [p[0]/(2*radius)+.5, .5-p[1]/(2*radius)]
        # Normalized image radius is 500/1024; retain the six-pixel border.
        uv = [.5+(uv[0]-.5)*1000/1024,.5+(uv[1]-.5)*1000/1024]
        tangent = np.array([1.,0.,0.]); tangent-=np.dot(tangent,n)*n
        if np.linalg.norm(tangent)<1e-8: tangent=np.cross([0,1,0],n)
        tangent/=max(np.linalg.norm(tangent),1e-12)
        verts=builders[name][0]; index=len(verts)
        verts.append([*p,*n,*uv,*tangent,-1.])
        return index
    def triangle(name, points, normals):
        b=builders[name]; ids=[vertex(name,p,n) for p,n in zip(points,normals)]
        b[1].extend(ids)
    def quad(name, points, normals):
        triangle(name,points[:3],normals[:3]);triangle(name,[points[0],points[2],points[3]],[normals[0],normals[2],normals[3]])
    def surface_triangle(points, back=False, depth=0):
        lengths=[np.linalg.norm(points[i]-points[(i+1)%3]) for i in range(3)]
        if max(lengths)>.024 and depth<12:
            edge=int(np.argmax(lengths));a=points[edge];b=points[(edge+1)%3];c=points[(edge+2)%3];mid=(a+b)/2
            for t in [[a,mid,c],[mid,b,c]]:surface_triangle(np.array(t),back,depth+1)
            return
        coords=[];normals=[]
        for x,y in points:
            z,n=profile(x,y);coords.append([x,y,z-(.027 if back else 0)]);normals.append(-n if back else n)
        if back:coords.reverse();normals.reverse()
        triangle('side' if back else 'face',coords,normals)

    for contour_set, back in [(front_rings,False),(rings,True)]:
        xy=np.concatenate(contour_set)
        ends=np.cumsum([len(p) for p in contour_set]).astype('uint32')
        indices=mapbox_earcut.triangulate_float64(xy,ends).reshape(-1,3)
        for tri in indices:
            pts=xy[tri]
            if area(pts)<0:pts=pts[::-1]
            surface_triangle(pts,back)
    for p,front in zip(rings,front_rings):
        for i in range(len(p)):
            j=(i+1)%len(p); a,b=p[i],p[j]; fa,fb=front[i],front[j]
            edge=b-a; outward=np.array([edge[1],-edge[0],0.]);outward/=np.linalg.norm(outward)
            za,na=profile(*a);zb,nb=profile(*b);zfa,nfa=profile(*fa);zfb,nfb=profile(*fb)
            ca=(na+outward);ca/=np.linalg.norm(ca)
            cb=(nb+outward);cb/=np.linalg.norm(cb)
            quad('side',[[*a,za-.002],[*b,zb-.002],[*fb,zfb],[*fa,zfa]],[ca,cb,cb,ca])
            quad('side',[[*a,za-.027],[*b,zb-.027],[*b,zb-.002],[*a,za-.002]],[outward]*4)

    def lathe(name, profile_points, segments=160, center=(0.,0.)):
        for j in range(len(profile_points)-1):
            r0,z0=profile_points[j];r1,z1=profile_points[j+1]
            length=math.hypot(r1-r0,z1-z0)
            nr=(z1-z0)/length;nz=-(r1-r0)/length
            for i in range(segments):
                a=i*2*np.pi/segments;b=(i+1)*2*np.pi/segments
                pts=[];ns=[]
                for angle,r,z in [(a,r0,z0),(b,r0,z0),(b,r1,z1),(a,r1,z1)]:
                    cs,sn=math.cos(angle),math.sin(angle)
                    pts.append([center[0]+r*cs,center[1]+r*sn,z]);ns.append([nr*cs,nr*sn,nz])
                quad(name,pts,ns)
    # Seven-inch barrel, rolled front lip and separate center cap.
    lathe('side',[(.210,.110),(.208,.098),(.208,-.065),(.217,-.065),(.222,-.059),(.222,.102),(.2255,.110),(.2255,.116),(.2235,.118),(.220,.116)])
    lathe('chrome',[(.031,.079),(.032,.0805),(.032,.082),(.031,.083)])
    segments=96
    for i in range(segments):
        a=i*2*np.pi/segments;b=(i+1)*2*np.pi/segments
        triangle('face',[[0,0,.083],[.031*math.cos(a),.031*math.sin(a),.083],[.031*math.cos(b),.031*math.sin(b),.083]],[[0,0,1]]*3)
    for x,y in lug_centers:
        z,_=profile(x,y)
        lathe('side',[(.0062,z-.002),(.0062,z-.013),(.0048,z-.013)],32,(x,y))
        lathe('chrome',[(.0047,z-.013),(.0052,z-.010),(.0052,z-.006),(.0046,z-.005)],6,(x,y))
        for i in range(6):
            a=i*2*np.pi/6;b=(i+1)*2*np.pi/6
            triangle('chrome',[[x,y,z-.005],[x+.0046*math.cos(a),y+.0046*math.sin(a),z-.005],[x+.0046*math.cos(b),y+.0046*math.sin(b),z-.005]],[[0,0,1]]*3)
    parts=[]
    for name,(vertices,indices) in builders.items():
        vertices=np.asarray(vertices,dtype='<f4');indices=np.asarray(indices,dtype='<u4')
        scale = diameter_inches/17
        vertices[:,:2] *= scale
        vertices[:,3:5] /= scale
        vertices[:,3:6] /= np.linalg.norm(vertices[:,3:6],axis=1)[:,None]
        vertices[:,8:10] *= scale
        vertices[:,8:11] -= np.sum(vertices[:,8:11]*vertices[:,3:6],axis=1)[:,None]*vertices[:,3:6]
        vertices[:,8:11] /= np.linalg.norm(vertices[:,8:11],axis=1)[:,None]
        parts.append((name,vertices,indices))
    spec={'name':f'Honda Civic G10 grafite ampliada para aro {diameter_inches}','referenceDiameterInches':17,'diameterInches':diameter_inches,'nominalDiameter':diameter_inches*.0254,'beadRadius':diameter_inches*.0254/2,'width':7*.0254,'outerLipRadius':radius*diameter_inches/17,'spokes':10,'spokePairs':5,'lugHoles':5,'openings':10,'reference':'reference.webp','faceTexture':'face.png','trianglesPerWheel':sum(len(i)//3 for _,v,i in parts)}
    (out/'spec.json').write_text(json.dumps(spec,indent=2)+'\n')
    return parts,spec


if __name__=='__main__':
    import sys
    p,s=build_reference_wheel(sys.argv[1],sys.argv[2])
    print(json.dumps(s))
