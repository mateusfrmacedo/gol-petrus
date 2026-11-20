"""Roda definitiva (foto 11.26.27, retificada): desenho 2D da face em metros -> curvas -> extrusão com bevel no Blender.
Medidas: aro 17" com borda externa R = 0,234 m; 4 furos a 0,050 m (4x100); 5 pares de braços paralelos (janela em U)
e 5 janelas em V com 2 raios finos grafite rebaixados cada. Pneu 205/40 R17 (hipótese conferida na fotogrametria).
Uso como módulo: roda.construir(colecao) devolve a lista de objetos da roda (eixo local Z para fora)."""
import numpy as np, cv2, math, bpy, bmesh
R = 0.234                          # borda externa do aro (lábio)
PSI0 = 60.0                        # ângulo do primeiro par (graus, na foto retificada)
PX = 4000; ESC = PX / (2 * 0.25)   # raster: 0,25 m de raio em 4000 px
def _grid():
    c = (np.arange(PX) + 0.5) / ESC - 0.25; X, Y = np.meshgrid(c, c); return X, Y
TH0 = 16.0     # ângulo do primeiro tronco (graus, na foto retificada; y para baixo)
def mascaras():
    """desenho medido anel a anel na foto retificada (setor de cima, o mais limpo) e repetido 5 vezes"""
    X, Y = _grid(); r = np.hypot(X, Y)
    face = ((r >= 0.93 * R) & (r < R)) | (r < 0.33 * R)                # lábio e miolo
    fino = np.zeros_like(face)
    for k in range(5):
        p = math.radians(TH0 + 72 * k); a = X * math.cos(p) + Y * math.sin(p); b = -X * math.sin(p) + Y * math.cos(p)
        face |= (np.abs(b) < 0.444 * a) & (a < 0.47 * R)                # tronco (±24° perto do cubo; ajuste por IoU com a foto)
        for sg in (-1, 1):
            bc = sg * (0.13 * R + 0.61 * (a - 0.44 * R))                # braços retos abrindo ~31° do eixo
            face |= (np.abs(b - bc) < 0.0647 * R) & (a > 0.36 * R) & (r < 0.95 * R)
            bf = sg * (0.13 * R + 0.61 * (a - 0.44 * R) - 0.118 * R)   # raio fino grafite, paralelo ao braço, mais para dentro
            fino |= (np.abs(b - bf) < 0.022 * R) & (a > 0.46 * R) & (r < 0.95 * R)
    for k in range(4):                                                   # furos 4x100
        t = math.radians(39 + 90 * k); face &= ~(np.hypot(X - 0.05 * math.cos(t), Y - 0.05 * math.sin(t)) < 0.0125)
    face &= ~(r < 0.029)
    fino &= ~face
    m = lambda z: (z * 255).astype(np.uint8)
    k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(0.006 * ESC), int(0.006 * ESC)))
    F = cv2.morphologyEx(cv2.morphologyEx(m(face), cv2.MORPH_OPEN, k3), cv2.MORPH_CLOSE, k3)
    G = cv2.morphologyEx(m(fino), cv2.MORPH_OPEN, k3)
    return F, G
def contornos(mask, eps=0.0004):
    cs, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        c = cv2.approxPolyDP(c, eps * ESC, True).reshape(-1, 2).astype(float)
        if len(c) < 3: continue
        out.append(np.stack([(c[:, 0] + 0.5) / ESC - 0.25, -((c[:, 1] + 0.5) / ESC - 0.25)], 1))   # y para cima
    return out
def curva(nome, polys, extr, bevel, col):
    cu = bpy.data.curves.new(nome, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.extrude = extr; cu.bevel_depth = bevel; cu.bevel_resolution = 2
    for P in polys:
        sp = cu.splines.new('POLY'); sp.points.add(len(P) - 1)
        for i, (x, y) in enumerate(P): sp.points[i].co = (x, y, 0, 1)
        sp.use_cyclic_u = True
    ob = bpy.data.objects.new(nome, cu); col.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); ob.select_set(False)
    return ob
def material(nome, base, rough, metal, coat=0.0, aniso=0.0):
    m = bpy.data.materials.get(nome)
    if m: return m
    m = bpy.data.materials.new(nome); b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    if aniso: b.inputs['Anisotropic'].default_value = aniso
    return m
def concavo(ob, z0, prof):
    """face côncava: o centro fica 'prof' metros mais fundo que o aro.
    Antes de curvar, as tampas (n-gons planos) viram triângulos pequenos para não empenar; depois, suaviza por ângulo."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY')
    for _ in range(3):
        longas = [e for e in bm.edges if e.calc_length() > 0.012]
        if not longas: break
        bmesh.ops.subdivide_edges(bm, edges=longas, cuts=1, use_grid_fill=False)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    bm.to_mesh(ob.data); bm.free()
    for v in ob.data.vertices:
        r = math.hypot(v.co.x, v.co.y); v.co.z += z0 - prof * max(0.0, 1 - r / (0.93 * R)) ** 1.3
    ob.data.update()
    for p in ob.data.polygons: p.use_smooth = True
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35)); ob.select_set(False)
    wn = ob.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL'); wn.mode = 'FACE_AREA'; wn.keep_sharp = True; wn.weight = 50
def lathe(nome, perfil, seg, mat, col, smooth=True):
    me = bpy.data.meshes.new(nome); bm = bmesh.new(); rings = []
    for (z, r) in perfil:
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * j / seg), r * math.sin(2 * math.pi * j / seg), z)) for j in range(seg)])
    for a, b in zip(rings[:-1], rings[1:]):
        for j in range(seg):
            bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    me.materials.append(mat); ob = bpy.data.objects.new(nome, me); col.objects.link(ob); return ob
def imagem_logo(caminho, px=512):
    """emblema VW (aro + V + W) cromado sobre preto, gerado aqui mesmo e embutido no .blend"""
    from PIL import Image, ImageDraw
    im = Image.new('L', (px, px), 0); d = ImageDraw.Draw(im); c = px / 2; u = px / 2 / 0.0285
    P = lambda x, y: (c + x * u, c - y * u); lw = int(0.0027 * u)
    d.ellipse([P(-0.0262, 0.0262), P(0.0262, -0.0262)], outline=255, width=lw)
    d.line([P(-0.0118, 0.0222), P(0.0, -0.0015), P(0.0118, 0.0222)], fill=255, width=lw, joint='curve')
    d.line([P(-0.0228, 0.0105), P(-0.0112, -0.0222), P(0.0, 0.0020), P(0.0112, -0.0222), P(0.0228, 0.0105)], fill=255, width=lw, joint='curve')
    im.save(caminho); return caminho
def logo_vw(col, z, mat_logo, mat_fundo):
    import os
    rc = 0.0285
    ob = lathe('Calota_VW', [(z - 0.006, rc), (z, rc), (z + 0.002, rc * 0.95), (z + 0.003, rc * 0.5), (z + 0.003, 0.0)], 64, mat_fundo, col)
    caminho = imagem_logo(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logo_vw_calota.png'))
    m = bpy.data.materials.new('Calota_emblema_VW'); nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = bpy.data.images.load(caminho); tx.extension = 'CLIP'
    mp.inputs['Scale'].default_value = (1 / (2 * rc), 1 / (2 * rc), 1); mp.inputs['Location'].default_value = (0.5, 0.5, 0)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], tx.inputs['Vector'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[6].default_value = (0.01, 0.01, 0.011, 1); mx.inputs[7].default_value = (0.92, 0.92, 0.94, 1)
    nt.links.new(tx.outputs['Color'], mx.inputs[0]); nt.links.new(mx.outputs[2], b.inputs['Base Color'])
    nt.links.new(tx.outputs['Color'], b.inputs['Metallic'])
    rr = nt.nodes.new('ShaderNodeMapRange'); rr.inputs[3].default_value = 0.2; rr.inputs[4].default_value = 0.08
    nt.links.new(tx.outputs['Color'], rr.inputs[0]); nt.links.new(rr.outputs[0], b.inputs['Roughness']); b.inputs['Coat Weight'].default_value = 0.8
    ob.data.materials.clear(); ob.data.materials.append(m)
    return [ob]
def construir(col):
    ALU = material('Aluminio_usinado', (0.80, 0.81, 0.82), 0.17, 1.0, 0.3)
    GRA = material('Grafite_roda', (0.05, 0.053, 0.057), 0.42, 0.45, 0.6)
    BOR = material('Borracha_pneu', (0.018, 0.018, 0.019), 0.85, 0.0)
    ACO = material('Aco_disco', (0.32, 0.32, 0.33), 0.45, 1.0)
    CRO = material('Cromado', (0.9, 0.9, 0.92), 0.08, 1.0)
    PRE = material('Plastico_preto_brilhante', (0.01, 0.01, 0.011), 0.15, 0.0, 0.8)
    F, G = mascaras(); objs = []
    face = curva('Roda_face', contornos(F), 0.014, 0.0015, col)
    concavo(face, 0.074, 0.018)
    face.data.materials.clear(); face.data.materials.append(ALU); face.data.materials.append(GRA)
    for p in face.data.polygons: p.material_index = 0 if p.normal.z > 0.6 else 1      # topo usinado, laterais grafite
    objs.append(face)
    fino = curva('Roda_raios_finos', contornos(G), 0.008, 0.001, col)
    concavo(fino, 0.052, 0.012); fino.data.materials.clear(); fino.data.materials.append(GRA); objs.append(fino)
    # tambor do aro, flange e pneu 205/40 R17
    objs.append(lathe('Roda_tambor', [(0.086, 0.93 * R), (0.07, 0.205), (0.03, 0.198), (-0.09, 0.198), (-0.095, 0.216)], 64, GRA, col))
    objs.append(lathe('Roda_flange', [(0.088, R), (0.084, R + 0.004), (0.075, R + 0.002)], 96, ALU, col))
    pf = [(-0.075, R + 0.001), (-0.093, 0.236), (-0.101, 0.262), (-0.097, 0.284), (-0.086, 0.294), (-0.070, 0.2985)]
    gz = (-0.04, 0.0, 0.04)
    for z_ in gz: pf += [(z_ - 0.005, 0.2985), (z_ - 0.004, 0.294), (z_ + 0.004, 0.294), (z_ + 0.005, 0.2985)]
    pf += [(0.070, 0.2985), (0.086, 0.294), (0.097, 0.284), (0.101, 0.262), (0.093, 0.236), (0.075, R + 0.001)]
    objs.append(lathe('Pneu_205_40_R17', pf, 128, BOR, col))
    objs.append(lathe('Disco_freio', [(-0.01, 0.075), (-0.01, 0.142), (-0.035, 0.142), (-0.035, 0.075)], 64, ACO, col))
    objs.append(lathe('Cubo', [(0.0, 0.0), (0.0, 0.07), (0.048, 0.07), (0.05, 0.03)], 40, GRA, col))
    for k in range(4):   # parafusos nos furos
        t = math.radians(39 + 90 * k)
        o = lathe('Parafuso', [(0.040, 0.0), (0.040, 0.0085), (0.052, 0.0085), (0.054, 0.006), (0.055, 0.0)], 6, CRO, col, smooth=False)
        o.location = (0.05 * math.cos(t), -0.05 * math.sin(t), 0); objs.append(o)
    objs += logo_vw(col, 0.068, CRO, PRE)
    return objs
