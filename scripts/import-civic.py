"""Converte a captura do Civic em GLB e nos recursos autocontidos do jogo.

Uso: python scripts/import-civic.py captura.json pasta-das-texturas
Requer numpy; a roda da referência também usa OpenCV e mapbox-earcut.
Não simplifica a carroceria nem recomprime as texturas PNG.
"""
from pathlib import Path
import base64, collections, copy, json, struct, sys, zlib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = Path(sys.argv[1])
ORIGINAL = Path(sys.argv[2])
OUT = ROOT / 'assets/vehicles/civic'
OUT.mkdir(parents=True, exist_ok=True)
model = json.loads((ORIGINAL / 'model.json').read_text())
materials = [m for m in model['options']['materials'].values() if isinstance(m, dict)]
textures = json.loads((ORIGINAL / 'textures.json').read_text())['results']
tex_names = {t['uid']: Path(t['name']).stem + '.png' for t in textures}
texture_files = ['console.png', 'plate0.png', 'Tire_01_DM.png', 'Brakes_01_DM.png', 'console_center.png', 'Tire_01_NM.png']
for name in texture_files:
    (OUT / name).write_bytes((ORIGINAL / name).read_bytes())
rim_parts, rim_spec = None, None
if (OUT / 'wheel-17/reference.webp').exists():
    from civic_wheel17 import build_reference_wheel
    rim_parts, rim_spec = build_reference_wheel(OUT / 'wheel-17/reference.webp', OUT / 'wheel-17')
    face = copy.deepcopy(next(m for m in materials if m['name'] == 'body'))
    face['id'] = 'civic-g10-17-face'; face['name'] = 'Civic G10 aro17 grafite face'
    c = face['channels']
    c['AlbedoPBR'] = {'enable': True, 'factor': 1, 'color': [1,1,1], 'texture': {'uid': 'civic-g10-17-photo'}}
    c['RoughnessPBR']['factor'] = .27; c['MetalnessPBR']['factor'] = .62
    c['ClearCoat']['enable'] = True; c['ClearCoat']['factor'] = .35
    c['Opacity']['enable'] = False
    side = copy.deepcopy(face); side['id'] = 'civic-g10-17-side'; side['name'] = 'Civic G10 aro17 grafite laterais'
    side['channels']['AlbedoPBR'] = {'enable': True, 'factor': 1, 'color': [.046,.047,.045]}
    side['channels']['RoughnessPBR']['factor'] = .33
    materials.extend([face,side])
    texture_files.append('wheel-17/face.png'); tex_names['civic-g10-17-photo'] = 'wheel-17/face.png'
mat_ids = {m['name']: i for i, m in enumerate(materials)}
grille_chrome = copy.deepcopy(next(m for m in materials if m['name'] == 'chrome'))
grille_chrome['id'] = 'civic-front-grilles-chrome'; grille_chrome['name'] = 'Grades frontais cromadas'
grille_chrome['channels']['AlbedoPBR'] = {'enable':True,'factor':1,'color':[.72,.74,.76]}
grille_chrome['channels']['MetalnessPBR']['factor'] = 1
grille_chrome['channels']['RoughnessPBR']['factor'] = .12
materials.append(grille_chrome)
mat_ids[grille_chrome['name']] = len(materials)-1
chrome_grille_meshes = {
    'black_m_06_black_m_0','gum_29_gum_0','body_11_body_0',
    'gum_20_gum_0','gum_30_gum_0','gum_31_gum_0','gum_32_gum_0',
    'gum_34_gum_0','gum_35_gum_0','gum_36_gum_0','gum_01_gum_0',
    'chrome_27_chrome_0','chrome_15_chrome_0',
}
if (ORIGINAL / 'decoded-textures.json').exists():
    (OUT / 'texture-sources.json').write_bytes((ORIGINAL / 'decoded-textures.json').read_bytes())
(OUT / 'source.json').write_text(json.dumps({'url': model['viewerUrl'], 'author': model['user']['displayName'], 'license': model['license'], 'materials': materials, 'customWheel':rim_spec}, indent=2) + '\n')
meshes = json.loads(CAPTURE.read_text())['models']
# The second geometry of each pair is the inspector wireframe, not another surface.
meshes = [m for m in meshes if 'Normal' in m['attributes']]
AXIS = np.array([[0, 1, 0], [0, 0, -1], [-1, 0, 0]], dtype=float)

def source_positions(m):
    p = np.asarray(m['attributes']['Vertex']['elements']).reshape(-1, 3)
    w = np.asarray(m['worldMatrices'][0]).reshape(4, 4).T
    return p @ w[:3, :3].T + w[:3, 3], w

tire_bounds = []
for m in meshes:
    if m['name'].startswith('tire_mat1_'):
        p, _ = source_positions(m)
        tire_bounds.append((p.min(0), p.max(0)))
assert len(tire_bounds) == 4
source_hubs = np.array([(lo + hi) / 2 for lo, hi in tire_bounds])
origin_y = (source_hubs[:, 1].max() + source_hubs[:, 1].min()) / 2
ground_z = max(hi[2] for lo, hi in tire_bounds)
origin = np.array([0, origin_y, ground_z])
hubs = (source_hubs - origin) @ AXIS.T / 100
order = sorted(range(4), key=lambda i: (-round(hubs[i, 0], 2), hubs[i, 2]))
hubs = hubs[order]
source_hubs = source_hubs[order]
wheel_r = float(np.mean([(hi[2] - lo[2]) / 200 for lo, hi in tire_bounds]))
groups = collections.defaultdict(list)
full_bounds = []
source_tris = 0
original_tris = 0
replaced = []
names = []
fixed_wheel_parts = {'gum_23', 'gum_24', 'gum_25', 'gum_26', 'gum_46', 'gum_47', 'gum_04', 'gum_05', 'gum_06', 'gum_07', 'gum_08', 'gum_09'}
for m in meshes:
    p, w = source_positions(m)
    n = np.asarray(m['attributes']['Normal']['elements']).reshape(-1, 3) @ np.linalg.inv(w[:3, :3])
    n = n @ AXIS.T
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    tangent = np.asarray(m['attributes'].get('Tangent', {}).get('elements', np.zeros(len(p) * 4))).reshape(-1, 4).copy()
    tangent[:, :3] = tangent[:, :3] @ w[:3, :3].T @ AXIS.T
    tangent[:, :3] -= np.sum(tangent[:, :3] * n, axis=1)[:, None] * n
    length = np.linalg.norm(tangent[:, :3], axis=1)
    missing = length < 1e-8
    fallback_axis = np.tile([0., 1., 0.], (missing.sum(), 1))
    fallback_axis[np.abs(n[missing, 1]) > .9] = [1., 0., 0.]
    tangent[missing, :3] = np.cross(fallback_axis, n[missing])
    tangent[:, :3] /= np.maximum(np.linalg.norm(tangent[:, :3], axis=1, keepdims=True), 1e-12)
    tangent[:, 3] = np.where(tangent[:, 3] < 0, 1, -1)  # V changes direction in glTF.
    pg = (p - origin) @ AXIS.T / 100
    full_bounds.append((pg.min(0), pg.max(0)))
    uv = np.asarray(m['attributes'].get('TexCoord0', {}).get('elements', np.zeros(len(p) * 2))).reshape(-1, 2)
    uv[:, 1] = 1 - uv[:, 1]
    triangles = []
    for primitive in m['primitives']:
        idx = np.asarray(primitive['indices'], dtype=np.uint32)
        if primitive['mode'] == 4:
            tri = idx.reshape(-1, 3)
        elif primitive['mode'] == 5:
            tri = np.stack([idx[:-2], idx[1:-1], idx[2:]], axis=1)
            tri[1::2, :2] = tri[1::2, 1::-1]
            tri = tri[(tri[:, 0] != tri[:, 1]) & (tri[:, 1] != tri[:, 2]) & (tri[:, 0] != tri[:, 2])]
        else:
            continue
        triangles.append(tri)
    idx = np.concatenate(triangles).reshape(-1)
    assert idx.max() < len(p)
    original_tris += len(idx) // 3
    state = m['node'].get('stateset', {})
    mat_name = next(a['_object']['_name'] for a in state['_attributeArray'] if a and a.get('_object', {}).get('_name') in mat_ids)
    if m['name'] in chrome_grille_meshes:
        mat_name = grille_chrome['name']
    material = mat_ids[mat_name]
    center = (p.min(0) + p.max(0)) / 2
    wi = int(np.argmin(np.linalg.norm(source_hubs - center, axis=1)))
    radial = np.linalg.norm(p[:, 1:] - source_hubs[wi, 1:], axis=1).max()
    dest = 0
    if np.abs(p[:, 0]).min() > 65 and radial < 33.5:
        # Calipers and pads steer with the wheel; discs, rims, valves and tires spin.
        prefix = '_'.join(m['name'].split('_')[:2])
        fixed = mat_name == 'silver_d' or prefix in fixed_wheel_parts
        dest = (5 if fixed else 1) + wi
        pg -= hubs[wi]
        if wi % 2 == 0:
            pg[:, [0, 2]] *= -1
            n[:, [0, 2]] *= -1
            tangent[:, [0, 2]] *= -1
    if rim_parts and 1 <= dest <= 4 and mat_name not in {'tire_mat1', 'brakes1'}:
        replaced.append(m['name'])
        continue
    if rim_parts and mat_name == 'tire_mat1':
        radial = np.linalg.norm(pg[:,:2],axis=1)
        old_bead, outer = radial.min(), radial.max()
        factor = (outer-rim_spec['beadRadius'])/(outer-old_bead)
        new_radius = outer-(outer-radial)*factor
        scale = new_radius/radial
        unit = pg[:,:2]/radial[:,None]
        nr = np.sum(n[:,:2]*unit,axis=1)[:,None]
        n[:,:2] = nr*unit/factor+(n[:,:2]-nr*unit)/scale[:,None]
        n /= np.linalg.norm(n,axis=1)[:,None]
        tr = np.sum(tangent[:,:2]*unit,axis=1)[:,None]
        tangent[:,:2] = tr*unit*factor+(tangent[:,:2]-tr*unit)*scale[:,None]
        tangent[:,:3] -= np.sum(tangent[:,:3]*n,axis=1)[:,None]*n
        tangent[:,:3] /= np.maximum(np.linalg.norm(tangent[:,:3],axis=1)[:,None],1e-12)
        pg[:,:2] *= scale[:,None]
    source_tris += len(idx) // 3
    groups[(dest, material)].append((np.hstack([pg, n, uv, tangent]).astype('<f4'), idx))
    names.append({'name': m['name'], 'material': mat_name, 'destination': dest, 'triangles': len(idx) // 3})

if rim_parts:
    rim_materials = {'face':mat_ids['Civic G10 aro17 grafite face'],'side':mat_ids['Civic G10 aro17 grafite laterais'],'chrome':mat_ids['chrome']}
    for wi in range(4):
        for name, vertices, indices in rim_parts:
            groups[(wi+1,rim_materials[name])].append((vertices,indices))
            source_tris += len(indices)//3
            names.append({'name':'Honda G10 aro17 '+name+' '+str(wi),'material':materials[rim_materials[name]]['name'],'destination':wi+1,'triangles':len(indices)//3})

parts = []
data = bytearray()
for (dest, material), entries in sorted(groups.items()):
    verts, indices, base = [], [], 0
    for vertices, index in entries:
        verts.append(vertices)
        indices.append(index + base)
        base += len(vertices)
    vertices = np.concatenate(verts)
    indices = np.concatenate(indices).astype('<u4')
    # Weld only byte-identical attributes. This changes no surface, UV or normal.
    vertices, remap = np.unique(vertices, axis=0, return_inverse=True)
    indices = remap[indices].astype('<u4')
    part = {'dest': dest, 'mat': material, 'nv': len(vertices), 'ni': len(indices), 'offset': len(data)}
    parts.append((part, vertices, indices))
    data.extend(vertices[:, :8].astype('<f4').tobytes())
    data.extend(indices.tobytes())
lo = np.min([b[0] for b in full_bounds], axis=0)
hi = np.max([b[1] for b in full_bounds], axis=0)
meta = {'name': 'Honda Civic', 'author': 'SQUIR3D', 'source': model['viewerUrl'], 'meshes': len(names), 'originalSourceMeshes':len(meshes),'originalSourceTriangles':original_tris,'wheelStyle':rim_spec,'replacedRimMeshes':replaced,'chromeGrilleMeshes':sorted(chrome_grille_meshes),'triangles': source_tris, 'vertices': sum(p['nv'] for p, _, _ in parts), 'hubs': hubs.tolist(), 'wheelR': wheel_r, 'wheelbase': float(hubs[0, 0] - hubs[2, 0]), 'track': float(abs(hubs[0, 2] - hubs[1, 2])), 'bounds': [lo.tolist(), hi.tolist()], 'parts': [p for p, _, _ in parts]}
(OUT / 'manifest.json').write_text(json.dumps({**meta, 'sourceMeshes': names}, indent=2) + '\n')
resource = '// Gerado por scripts/import-civic.py; carroceria original e rodas da referência.\n'
resource += 'const CIVIC_META = ' + json.dumps(meta, separators=(',', ':')) + ';\n'
resource += 'const CIVIC_B64 = ' + json.dumps(base64.b64encode(zlib.compress(bytes(data), 9)).decode()) + ';\n'
resource += 'const CIVIC_IMAGES = ' + json.dumps([{'name': name, 'normal': name == 'Tire_01_NM.png', 'data': base64.b64encode((OUT / name).read_bytes()).decode()} for name in texture_files], separators=(',', ':')) + ';\n'
(ROOT / 'source/js/30_car_e0_civic_data.js').write_text(resource)

# The material values are the actual viewer settings, in linear RGB.
def vec(values):
    return 'vec4f(' + ','.join(format(float(v), '.10g') if float(v) % 1 else format(float(v), '.1f') for v in values) + ')'
colors, pbr, alpha = [], [], []
for m in materials:
    c = m['channels']
    color = [v * c['AlbedoPBR'].get('factor', 1) for v in c['AlbedoPBR'].get('color', [1, 1, 1])]
    colors.append(vec([*color, c['EmitColor'].get('factor', 0) if c['EmitColor'].get('enable') else 0]))
    pbr.append(vec([c['RoughnessPBR']['factor'], c['MetalnessPBR']['factor'], c['ClearCoat'].get('factor', 0) if c['ClearCoat'].get('enable') else 0, 0]))
    alpha.append(vec([c['Opacity']['factor'] if c['Opacity']['enable'] else 1, c['Opacity'].get('ior', 1.5), 0, 0]))
wg = '// Gerado dos 21 materiais publicados por SQUIR3D.\n'
for name, values in [('CIVIC_COLOR', colors), ('CIVIC_PBR', pbr), ('CIVIC_ALPHA', alpha)]:
    wg += 'const ' + name + ' = array<vec4f,' + str(len(materials)) + '>(\n' + ',\n'.join(values) + '\n);\n'
(ROOT / 'source/wgsl/civic_materials.wgsl').write_text(wg)
(OUT / 'materials.json').write_text(json.dumps({'materials': materials, 'textures': texture_files}, indent=2) + '\n')

# A portable GLB with the same mesh data and all six decoded PNGs embedded.
gltf = {'asset': {'version': '2.0', 'generator': 'Gol Petrus Civic importer', 'copyright': 'Model: SQUIR3D; see source.json for source and license metadata'}, 'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'materials': [], 'accessors': [], 'bufferViews': [], 'buffers': [], 'images': [], 'textures': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}], 'extensionsUsed': ['KHR_materials_ior', 'KHR_materials_clearcoat']}
blob = bytearray()
def view(raw, target=None, stride=None):
    while len(blob) % 4: blob.append(0)
    index = len(gltf['bufferViews'])
    v = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(raw)}
    if target: v['target'] = target
    if stride: v['byteStride'] = stride
    gltf['bufferViews'].append(v)
    blob.extend(raw)
    return index
for name in texture_files:
    i = len(gltf['images'])
    gltf['images'].append({'name': name, 'mimeType': 'image/png', 'bufferView': view((OUT / name).read_bytes())})
    gltf['textures'].append({'source': i, 'sampler': 0})
for m in materials:
    c = m['channels']
    color = [v * c['AlbedoPBR'].get('factor', 1) for v in c['AlbedoPBR'].get('color', [1, 1, 1])]
    opacity = c['Opacity']['factor'] if c['Opacity']['enable'] else 1
    pbr = {'baseColorFactor': [*color, opacity], 'metallicFactor': c['MetalnessPBR']['factor'], 'roughnessFactor': c['RoughnessPBR']['factor']}
    if c['AlbedoPBR'].get('texture'):
        pbr['baseColorTexture'] = {'index': texture_files.index(tex_names[c['AlbedoPBR']['texture']['uid']])}
    mat = {'name': m['name'], 'pbrMetallicRoughness': pbr, 'doubleSided': True, 'alphaMode': 'BLEND' if opacity < 1 else 'OPAQUE', 'extensions': {'KHR_materials_ior': {'ior': c['Opacity'].get('ior', 1.5)}, 'KHR_materials_clearcoat': {'clearcoatFactor': c['ClearCoat'].get('factor', 0) if c['ClearCoat'].get('enable') else 0, 'clearcoatRoughnessFactor': c['ClearCoatRoughness'].get('factor', .04)}}}
    if c['NormalMap'].get('enable') and c['NormalMap'].get('texture'):
        mat['normalTexture'] = {'index': 5, 'scale': c['NormalMap'].get('factor', 1)}
    gltf['materials'].append(mat)
for part, vertices, indices in parts:
    vi = view(vertices.tobytes(), 34962, 48)
    attrs = {}
    for name, offset, shape, columns in [('POSITION', 0, 'VEC3', slice(0, 3)), ('NORMAL', 12, 'VEC3', slice(3, 6)), ('TEXCOORD_0', 24, 'VEC2', slice(6, 8)), ('TANGENT', 32, 'VEC4', slice(8, 12))]:
        accessor = {'bufferView': vi, 'byteOffset': offset, 'componentType': 5126, 'count': len(vertices), 'type': shape}
        if name == 'POSITION':
            accessor.update(min=vertices[:, columns].min(0).tolist(), max=vertices[:, columns].max(0).tolist())
        attrs[name] = len(gltf['accessors'])
        gltf['accessors'].append(accessor)
    ii = len(gltf['accessors'])
    gltf['accessors'].append({'bufferView': view(indices.tobytes(), 34963), 'componentType': 5125, 'count': len(indices), 'type': 'SCALAR'})
    mi = len(gltf['meshes'])
    gltf['meshes'].append({'name': f"{part['dest']}_{materials[part['mat']]['name']}", 'primitives': [{'attributes': attrs, 'indices': ii, 'material': part['mat']}]})
    node = {'name': gltf['meshes'][-1]['name'], 'mesh': mi}
    if part['dest']:
        wi = (part['dest'] - 1) % 4
        node['translation'] = hubs[wi].tolist()
        if wi % 2 == 0: node['rotation'] = [0, 1, 0, 0]
    gltf['scenes'][0]['nodes'].append(len(gltf['nodes']))
    gltf['nodes'].append(node)
while len(blob) % 4: blob.append(0)
gltf['buffers'] = [{'byteLength': len(blob)}]
js = json.dumps(gltf, separators=(',', ':')).encode()
js += b' ' * (-len(js) % 4)
glb = struct.pack('<III', 0x46546c67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4e4f534a) + js + struct.pack('<II', len(blob), 0x004e4942) + blob
(OUT / 'honda-civic-2019.glb').write_bytes(glb)
print(json.dumps({'meshes': len(meshes), 'drawGroups': len(parts), 'triangles': source_tris, 'vertices': meta['vertices'], 'GLB_MB': round(len(glb) / 1e6, 2), 'game_MB': round(len(resource) / 1e6, 2), 'hubs': hubs.tolist()}))
