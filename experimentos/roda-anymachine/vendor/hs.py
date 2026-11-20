# hs.py: hand hard-surface kit for the rig props.  Geometry builder (clean quads, real chamfers, weighted normals),
# a wear shader that follows form (edge chips, crevice rust and dirt, projected decals), a high-to-low bake
# (base colour, tangent normal, occlusion/roughness/metal) and GLB export.
#
# The game mesh ("lo") is built from separate parts.  The bake source ("hi") is the same surfaces plus detail-only
# parts (bolt heads, weld beads, plates), shaded with rounded edges (Bevel node) and bump, so the projection is exact.
import bpy, bmesh, math, os, random
import numpy as np
from mathutils import Vector, Matrix

V = Vector
AX = {"x": 0, "y": 1, "z": 2}


def _dirs(spec):
    out = []
    for t in spec.replace(" ", "").split(","):
        if t:
            v = [0, 0, 0]; v[AX[t[1]]] = 1 if t[0] == "+" else -1; out.append(V(v))
    return out


class Build:
    def __init__(s, name):
        s.name = name; s.lo = []; s.hi = []; s.matdb = {}; s.decals = []; s.sock = {}; s.rng = random.Random(7); s.tag = 0

    # ---------------------------------------------------------------- materials (placeholders, filled by wear())
    def mat(s, name):
        if name not in s.matdb:
            m = bpy.data.materials.new(f"{s.name}_{name}"); m.use_nodes = True; s.matdb[name] = m
        return s.matdb[name]

    def _obj(s, bm, name, mat, detail=False, xf=None):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
        me.materials.append(s.mat(mat))
        if xf is None: xf = getattr(s, "xf", None)
        if xf is not None: me.transform(xf)
        at = me.attributes.new("item", "INT", "FACE")
        for d in at.data: d.value = s.tag
        (s.hi if detail else s.lo).append(o)
        return o

    # ---------------------------------------------------------------- primitives
    def box(s, name, mn, mx, mat="paint", bev=0.0, skip="", detail=False, seg=1, flip=False, xf=None, bev_axes=None, bev_all=False):
        """Axis box.  bev: chamfer width on every edge whose two faces are kept.  skip: faces not built, e.g. '-z,+y'.
        bev_axes: only chamfer edges running along these axes, e.g. 'x'."""
        mn, mx = V(mn), V(mx); bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            v.co = V([mn[i] + (v.co[i] + 0.5) * (mx[i] - mn[i]) for i in range(3)])
        dirs = _dirs(skip)
        bm.normal_update()
        def skipped(f):
            return any(f.normal.dot(d) > 0.999 for d in dirs)
        if bev > 0:
            ed = [e for e in bm.edges if bev_all or not any(skipped(f) for f in e.link_faces)]
            if bev_axes:
                ed = [e for e in ed if any(abs((e.verts[0].co - e.verts[1].co).normalized()[AX[a]]) > 0.99 for a in bev_axes)]
            if ed:
                bmesh.ops.bevel(bm, geom=ed, offset=bev, offset_type="OFFSET", segments=seg, profile=0.5, affect="EDGES", clamp_overlap=True)
            bm.normal_update()
        dead = [f for f in bm.faces if skipped(f)]
        if dead: bmesh.ops.delete(bm, geom=dead, context="FACES")
        if flip:
            for f in bm.faces: f.normal_flip()
        return s._obj(bm, name, mat, detail, xf)

    def cyl(s, name, p0, p1, r, n=8, mat="paint", caps=(True, True), detail=False, r1=None, bev=0.0, phase=0.5):
        p0, p1 = V(p0), V(p1); ax = (p1 - p0).normalized()
        ex = ax.orthogonal().normalized(); ey = ax.cross(ex)
        if abs(ax.z) < 0.9:      # keep a flat facet pattern that is stable: ex horizontal
            ex = ax.cross(V((0, 0, 1))).normalized(); ey = ax.cross(ex)
        r1 = r if r1 is None else r1
        bm = bmesh.new()
        ring = lambda p, rr: [bm.verts.new(p + (ex * math.cos(2 * math.pi * (i + phase) / n) + ey * math.sin(2 * math.pi * (i + phase) / n)) * rr) for i in range(n)]
        a, b = ring(p0, r), ring(p1, r1)
        for i in range(n):
            j = (i + 1) % n; bm.faces.new((a[i], a[j], b[j], b[i]))
        if caps[0]: bm.faces.new(list(reversed(a)))
        if caps[1]: bm.faces.new(b)
        if bev > 0:
            ed = [e for e in bm.edges if len(e.link_faces) == 2 and any(len(f.verts) == n for f in e.link_faces)]
            bmesh.ops.bevel(bm, geom=ed, offset=bev, segments=1, affect="EDGES", clamp_overlap=True)
        _quad_caps(bm)
        return s._obj(bm, name, mat, detail)

    def lathe(s, name, profile, n=12, mat="paint", at=(0, 0, 0), detail=False, cap_top=False, cap_bot=False, phase=0.5):
        """Profile [(r, z), ...] going up the outside, spun round Z.  r = 0 at an end closes it with a fan."""
        bm = bmesh.new(); at = V(at); rings = []
        for r, z in profile:
            if r <= 1e-6: rings.append([bm.verts.new(at + V((0, 0, z)))])
            else: rings.append([bm.verts.new(at + V((r * math.cos(2 * math.pi * (i + phase) / n), r * math.sin(2 * math.pi * (i + phase) / n), z))) for i in range(n)])
        for a, b_ in zip(rings, rings[1:]):
            for i in range(n):
                j = (i + 1) % n
                if len(a) == 1 and len(b_) == 1: continue
                if len(a) == 1: bm.faces.new((a[0], b_[j], b_[i]))
                elif len(b_) == 1: bm.faces.new((a[i], a[j], b_[0]))
                else: bm.faces.new((a[i], a[j], b_[j], b_[i]))
        if cap_bot and len(rings[0]) > 1: bm.faces.new(list(reversed(rings[0])))
        if cap_top and len(rings[-1]) > 1: bm.faces.new(rings[-1])
        _quad_caps(bm)
        return s._obj(bm, name, mat, detail)

    def torus(s, name, c, R, r, n=14, m=6, mat="paint", detail=False, squash=1.0):
        prof = [(R - r * math.cos(2 * math.pi * k / m), -r * squash * math.sin(2 * math.pi * k / m)) for k in range(m + 1)]
        o = s.lathe(name, prof, n=n, mat=mat, at=c, detail=detail)
        return o

    def ring_plate(s, name, O, ex, ey, outer, inner, t0, t1, mat="paint", detail=False, skip_outer=(), bev=0.0, back=True, wall=True):
        """A plate with a hole: outer and inner outlines of equal count (counter-clockwise in ex,ey), all quads."""
        O, ex, ey = V(O), V(ex), V(ey); ez = ex.cross(ey); bm = bmesh.new(); N = len(outer)
        P = lambda p, t: O + ex * p[0] + ey * p[1] + ez * t
        vo0 = [bm.verts.new(P(p, t0)) for p in outer]; vo1 = [bm.verts.new(P(p, t1)) for p in outer]
        vi0 = [bm.verts.new(P(p, t0)) for p in inner]; vi1 = [bm.verts.new(P(p, t1)) for p in inner]
        for i in range(N):
            j = (i + 1) % N
            bm.faces.new((vo1[i], vo1[j], vi1[j], vi1[i]))
            if back: bm.faces.new((vo0[j], vo0[i], vi0[i], vi0[j]))
            if i not in skip_outer: bm.faces.new((vo0[i], vo0[j], vo1[j], vo1[i]))
            if wall: bm.faces.new((vi0[j], vi0[i], vi1[i], vi1[j]))
        if not back or not wall or skip_outer:
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        if bev > 0:
            bm.normal_update()
            ed = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > 1.2 and abs((e.verts[0].co - e.verts[1].co).normalized().dot(ez)) < 0.5]
            bmesh.ops.bevel(bm, geom=ed, offset=bev, segments=1, affect="EDGES", clamp_overlap=True)
        return s._obj(bm, name, mat, detail)

    def strip(s, name, O, U, eV, eN, profile, mat="paint", detail=False, closed=False, fix=True):
        """A cross-section polyline [(v, n), ...] swept along U (a vector with length).  Normal points to +eN."""
        O, U, eV, eN = V(O), V(U), V(eV), V(eN); bm = bmesh.new()
        a = [bm.verts.new(O + eV * p[0] + eN * p[1]) for p in profile]
        b = [bm.verts.new(O + U + eV * p[0] + eN * p[1]) for p in profile]
        n = len(profile)
        for i in range(n if closed else n - 1):
            j = (i + 1) % n; bm.faces.new((a[i], b[i], b[j], a[j]))
        bm.normal_update()
        # orient: first face normal should have a positive eN part, unless the profile is closed
        if fix and not closed and sum(f.normal.dot(eN) for f in bm.faces) < 0:
            for f in bm.faces: f.normal_flip()
        return s._obj(bm, name, mat, detail)

    def prism(s, name, O, ex, ey, outline, t0, t1, mat="paint", detail=False, caps=(True, True), bev=0.0, skip_side=()):
        """A convex outline (counter-clockwise in ex,ey) extruded along ex x ey from t0 to t1."""
        O, ex, ey = V(O), V(ex), V(ey); ez = ex.cross(ey); bm = bmesh.new(); N = len(outline)
        a = [bm.verts.new(O + ex * p[0] + ey * p[1] + ez * t0) for p in outline]
        b = [bm.verts.new(O + ex * p[0] + ey * p[1] + ez * t1) for p in outline]
        for i in range(N):
            if i in skip_side: continue
            j = (i + 1) % N; bm.faces.new((a[i], a[j], b[j], b[i]))
        if caps[0]: bm.faces.new(list(reversed(a)))
        if caps[1]: bm.faces.new(b)
        if bev > 0:
            bm.normal_update()
            ed = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > 0.6]
            bmesh.ops.bevel(bm, geom=ed, offset=bev, segments=1, affect="EDGES", clamp_overlap=True)
        _quad_caps(bm)
        return s._obj(bm, name, mat, detail)

    # ---------------------------------------------------------------- bake-only detail
    def bolt(s, p, n, r=0.011, h=0.006, mat="steel", hexa=True):
        p, n = V(p), V(n).normalized()
        s.cyl("d_bolt", p - n * 0.001, p + n * h, r, n=6 if hexa else 12, mat=mat, caps=(False, True), detail=True, bev=r * 0.18)
        s.cyl("d_washer", p - n * 0.001, p + n * 0.0018, r * 1.45, n=14, mat=mat, caps=(False, True), detail=True)

    def rivet(s, p, n, r=0.007, mat="paint"):
        p, n = V(p), V(n).normalized()
        s.cyl("d_rivet", p - n * 0.001, p + n * r * 0.45, r, n=10, mat=mat, caps=(False, True), detail=True, r1=r * 0.55, )

    def weld(s, p0, p1, r=0.0035, mat="paint", step=0.012):
        """A lumpy weld bead lying on a joint."""
        p0, p1 = V(p0), V(p1); L = (p1 - p0).length; ax = (p1 - p0) / L
        ex = ax.orthogonal().normalized(); ey = ax.cross(ex); bm = bmesh.new(); k = max(2, int(L / step)); rings = []
        for i in range(k + 1):
            rr = r * (0.75 + 0.5 * s.rng.random()); c = p0 + ax * (L * i / k)
            rings.append([bm.verts.new(c + (ex * math.cos(a * math.pi / 3) + ey * math.sin(a * math.pi / 3)) * rr) for a in range(6)])
        for i in range(k):
            for a in range(6):
                b = (a + 1) % 6; bm.faces.new((rings[i][a], rings[i][b], rings[i + 1][b], rings[i + 1][a]))
        return s._obj(bm, "d_weld", mat, True)

    # ---------------------------------------------------------------- decals (projected in the bake shader)
    def decal(s, img, center, normal, up, w, h=None, kind="paint", mats=("paint",), depth=0.03, strength=1.0):
        """kind: paint (stencil, chips eat it), label (sticker or plate on top of the paint), stain (multiplied)."""
        im = _image(img, "sRGB")
        if h is None: h = w * im.size[1] / im.size[0]
        n, u = V(normal).normalized(), V(up).normalized(); r = u.cross(n).normalized()
        e = bpy.data.objects.new("dec_" + os.path.basename(img), None); bpy.context.scene.collection.objects.link(e)
        m = Matrix.Identity(4)
        for i, c in enumerate((r * w, u * h, n)):
            for k in range(3): m[k][i] = c[k]
        for k in range(3): m[k][3] = V(center)[k]
        e.matrix_world = m; e.empty_display_size = 0.5
        s.decals.append(dict(e=e, im=im, kind=kind, mats=mats, depth=depth, strength=strength))

    # ---------------------------------------------------------------- assemble
    def finish(s, weld=0.0002):
        lo = _join(s.lo, s.name)
        if weld:
            bm = bmesh.new(); bm.from_mesh(lo.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld); bm.to_mesh(lo.data); bm.free()
        hi_base = lo.copy(); hi_base.data = lo.data.copy(); bpy.context.scene.collection.objects.link(hi_base)
        hi = _join([hi_base] + s.hi, "hi_" + s.name)
        for o in (lo, hi): _normals(o)
        s.lo_obj, s.hi_obj = lo, hi
        return lo, hi

    def stats(s, ref_min=None, ref_max=None):
        me = s.lo_obj.data; me.calc_loop_triangles()
        q = sum(1 for p in me.polygons if len(p.vertices) == 4); t = sum(1 for p in me.polygons if len(p.vertices) == 3)
        ng = sum(1 for p in me.polygons if len(p.vertices) > 4)
        co = np.array([v.co[:] for v in me.vertices]); mn, mx = co.min(0), co.max(0)
        r = dict(tris=len(me.loop_triangles), quads=q, tri_faces=t, ngons=ng, verts=len(me.vertices),
                 min=[round(float(x), 4) for x in mn], max=[round(float(x), 4) for x in mx])
        if ref_min is not None:
            r["bbox_err_mm"] = round(float(max(np.abs(mn - np.array(ref_min)).max(), np.abs(mx - np.array(ref_max)).max())) * 1000, 2)
        me2 = s.hi_obj.data; me2.calc_loop_triangles(); r["hi_tris"] = len(me2.loop_triangles)
        return r

    # ---------------------------------------------------------------- unwrap
    def unwrap(s, margin=0.004, angle=66, uv_scale=None):
        o = s.lo_obj
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.average_islands_scale()
        if uv_scale:      # shrink islands of unimportant materials (dark interiors) before packing
            bpy.ops.object.mode_set(mode="OBJECT"); L = o.data.uv_layers.active.data
            for p in o.data.polygons:
                f = uv_scale.get(o.data.materials[p.material_index].name[len(s.name) + 1:])
                if f:
                    for li in p.loop_indices: L[li].uv = L[li].uv * f
            bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        try:
            bpy.ops.uv.pack_islands(rotate=True, margin=margin, margin_method="FRACTION", shape_method="AABB")
        except TypeError:
            bpy.ops.uv.pack_islands(rotate=True, margin=margin)
        bpy.ops.object.mode_set(mode="OBJECT")
        uv = np.zeros(len(o.data.loops) * 2, np.float32); o.data.uv_layers.active.data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
        area = 0.0
        for p in o.data.polygons:
            pts = uv[p.loop_start:p.loop_start + p.loop_total]
            area += 0.5 * abs(sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))))
        surf = sum(p.area for p in o.data.polygons)
        return dict(uv_fill=round(float(area), 3), surface_m2=round(float(surf), 2), uv_min=float(uv.min()), uv_max=float(uv.max()))

    # ---------------------------------------------------------------- wear shader on the bake source
    def wear(s, name, sheet, under, tile=1.2, edge=1.0, bias=0.0, rust=0.5, dirt=0.5, rough=0.55, metal=0.0,
             tint=(1, 1, 1), chip_rough=0.8, chip_metal=0.25, bump=0.5, under_tile=0.9, low=0.5, top=0.25, sat=1.0, value=1.0, chip_dark=1.0, dent=1.0):
        m = s.mat(name); g = NT(m); g.clear()
        P = g.new("ShaderNodeTexCoord").outputs["Object"]
        geo = g.new("ShaderNodeNewGeometry")
        sep = g.new("ShaderNodeSeparateXYZ"); g.link(P, sep.inputs[0])
        paint = g.img(sheet, g.mapping(P, 1 / tile, (0.13, 0.37, 0.21)), "BOX")
        pcol = g.hsv(paint.outputs["Color"], sat, value)
        pcol = g.mix(1.0, pcol, tint + (1,), "MULTIPLY")
        rustc = g.img(under, g.mapping(P, 1 / under_tile, (0.4, 0.1, 0.7)), "BOX").outputs["Color"]
        n1 = g.noise(P, 16, 8, 0.62); n2 = g.noise(P, 75, 5, 0.6); nb = g.noise(P, 1.7, 3, 0.5); n3 = g.noise(P, 6, 6, 0.65)
        # convex edges: occlusion measured inside the solid
        aoi = g.new("ShaderNodeAmbientOcclusion", inside=True, only_local=True, samples=12); aoi.inputs["Distance"].default_value = 0.02
        convex = g.maprange(aoi.outputs["AO"], 0.96, 0.55, 0, 1)
        aoc = g.new("ShaderNodeAmbientOcclusion", inside=False, only_local=True, samples=12); aoc.inputs["Distance"].default_value = 0.07
        cav = g.maprange(aoc.outputs["AO"], 0.85, 0.25, 0, 1)
        ci = g.math("ADD", g.math("MULTIPLY", convex, 0.8 * edge), g.math("ADD", g.math("MULTIPLY", g.math("SUBTRACT", n1, 0.5), 1.0), g.math("MULTIPLY", g.math("SUBTRACT", n2, 0.5), 0.45)))
        ci = g.math("ADD", ci, g.math("ADD", bias, g.math("MULTIPLY", g.math("SUBTRACT", nb, 0.5), 0.3)))
        chip = g.maprange(ci, 0.40, 0.46, 0, 1, smooth=True)
        halo = g.maprange(ci, 0.26, 0.46, 0, 1, smooth=True)
        # uneven fading and grime over the whole coat, and faint vertical weeping on upright faces
        nsep = g.new("ShaderNodeSeparateXYZ"); g.link(geo.outputs["True Normal"], nsep.inputs[0])
        upright = g.math("SUBTRACT", 1.0, g.math("ABSOLUTE", nsep.outputs["Z"]))
        mpv = g.new("ShaderNodeMapping"); g.link(P, mpv.inputs[0]); mpv.inputs["Scale"].default_value = (38, 38, 1.6)
        nv = g.noise(mpv.outputs[0], 1.0, 5, 0.6)
        col = g.mix(g.maprange(n3, 0.3, 0.8, 0.0, 0.3 * dirt), pcol, g.mix(1.0, pcol, (0.5, 0.42, 0.34, 1), "MULTIPLY"))
        col = g.mix(g.math("MULTIPLY", g.maprange(nv, 0.5, 0.75, 0, 0.45 * dirt), upright), col, g.mix(1.0, col, (0.52, 0.4, 0.3, 1), "MULTIPLY"))
        # stencil paint goes under the chips
        lab_mask = None; lab_h = None
        for d in s.decals:
            if d["kind"] == "paint" and name in d["mats"]:
                c, a = g.decal(d); col = g.mix(g.math("MULTIPLY", a, d["strength"]), col, c)
        bare = g.mix(g.maprange(n3, 0.35, 0.7, 0, chip_dark), rustc, (0.09, 0.085, 0.08, 1))
        col = g.mix(g.math("MULTIPLY", g.math("SUBTRACT", halo, chip), 0.55), col, g.mix(1.0, col, (0.72, 0.42, 0.24, 1), "MULTIPLY"))
        col = g.mix(chip, col, bare)
        for d in s.decals:
            if d["kind"] == "label" and name in d["mats"]:
                c, a = g.decal(d); a = g.math("MULTIPLY", a, d["strength"]); col = g.mix(a, col, c)
                lab_mask = a if lab_mask is None else g.math("MAXIMUM", lab_mask, a)
        for d in s.decals:
            if d["kind"] == "stain" and name in d["mats"]:
                c, a = g.decal(d); col = g.mix(g.math("MULTIPLY", a, d["strength"]), col, g.mix(1.0, col, c, "MULTIPLY"))
        # rust and dirt gathering in crevices, splash near the floor, bleaching on top
        z = sep.outputs["Z"]
        lowm = g.math("MULTIPLY", g.maprange(z, 0.0, 0.32, 1, 0, smooth=True), g.maprange(nb, 0.3, 0.7, 0.4, 1))
        rm = g.maprange(g.math("ADD", g.math("ADD", cav, g.math("MULTIPLY", lowm, 0.35 * low)), g.math("MULTIPLY", g.math("SUBTRACT", n3, 0.5), 0.9)), 0.35, 0.8, 0, 1, smooth=True)
        col = g.mix(g.math("MULTIPLY", rm, rust), col, g.mix(0.6, g.mix(1.0, col, (0.62, 0.33, 0.17, 1), "MULTIPLY"), rustc))
        dm = g.maprange(g.math("ADD", cav, g.math("MULTIPLY", g.math("SUBTRACT", n1, 0.5), 0.5)), 0.25, 0.9, 0, 1, smooth=True)
        col = g.mix(g.math("MULTIPLY", dm, dirt), col, (0.05, 0.043, 0.036, 1))
        col = g.mix(g.math("MULTIPLY", lowm, 0.45 * low), col, g.mix(1.0, col, (0.6, 0.52, 0.44, 1), "MULTIPLY"))
        upm = g.math("MULTIPLY", g.maprange(nsep.outputs["Z"], 0.6, 0.95, 0, 1), g.maprange(n3, 0.3, 0.75, 0, 1))
        col = g.mix(g.math("MULTIPLY", upm, top), col, g.mix(0.5, col, (0.55, 0.53, 0.5, 1)))
        # roughness, metal
        r = g.math("ADD", rough, g.math("MULTIPLY", g.math("SUBTRACT", n2, 0.5), 0.22))
        r = g.math("ADD", r, g.math("MULTIPLY", g.math("SUBTRACT", g.lum(paint.outputs["Color"]), 0.5), -0.25))
        r = g.mixf(chip, r, chip_rough); r = g.mixf(g.math("MULTIPLY", rm, rust), r, 0.85); r = g.mixf(g.math("MULTIPLY", dm, dirt), r, 0.9)
        r = g.math("ADD", r, g.math("MULTIPLY", upm, 0.1))
        if lab_mask is not None: r = g.mixf(lab_mask, r, 0.42)
        r = g.maprange(r, 0, 1, 0.05, 1)
        mt = g.mixf(chip, metal, g.math("MULTIPLY", chip_metal, g.maprange(n3, 0.35, 0.7, 0, 1)))
        mt = g.mixf(g.math("MULTIPLY", rm, rust), mt, 0.0); mt = g.mixf(g.math("MULTIPLY", dm, dirt), mt, 0.0)
        if lab_mask is not None: mt = g.mixf(lab_mask, mt, 0.0)
        # height: chips are below the paint, the sheet gives fine relief
        hgt = g.math("ADD", g.math("MULTIPLY", g.lum(paint.outputs["Color"]), 0.6), g.math("MULTIPLY", n2, 0.12))
        hgt = g.math("SUBTRACT", hgt, g.math("MULTIPLY", chip, 0.9))
        hgt = g.math("ADD", hgt, g.math("MULTIPLY", n1, 0.5))       # thick, lumpy brushed paint
        hgt = g.math("ADD", hgt, g.math("MULTIPLY", g.math("SUBTRACT", nb, 0.5), 2.5 * bump * dent))    # shallow dents
        if lab_mask is not None: hgt = g.math("ADD", hgt, g.math("MULTIPLY", lab_mask, 0.5))
        bev = g.new("ShaderNodeBevel", samples=8); bev.inputs["Radius"].default_value = 0.005
        bmp = g.new("ShaderNodeBump"); bmp.inputs["Strength"].default_value = min(1.0, bump * 1.6); bmp.inputs["Distance"].default_value = 0.002
        g.set(bmp.inputs["Height"], hgt); g.link(bev.outputs["Normal"], bmp.inputs["Normal"])
        bsdf = g.new("ShaderNodeBsdfPrincipled")
        g.set(bsdf.inputs["Base Color"], col); g.set(bsdf.inputs["Roughness"], r); g.set(bsdf.inputs["Metallic"], mt)
        g.link(bmp.outputs["Normal"], bsdf.inputs["Normal"])
        # occlusion for the ORM map: wider reach
        aow = g.new("ShaderNodeAmbientOcclusion", inside=False, only_local=True, samples=16); aow.inputs["Distance"].default_value = 0.3
        orm = g.new("ShaderNodeCombineColor"); g.set(orm.inputs[0], aow.outputs["AO"]); g.set(orm.inputs[1], r); g.set(orm.inputs[2], mt)
        e_col = g.new("ShaderNodeEmission"); g.set(e_col.inputs[0], col)
        e_orm = g.new("ShaderNodeEmission"); g.set(e_orm.inputs[0], orm.outputs[0])
        dbg = g.new("ShaderNodeCombineColor"); g.set(dbg.inputs[0], convex); g.set(dbg.inputs[1], cav); g.set(dbg.inputs[2], chip)
        e_dbg = g.new("ShaderNodeEmission"); g.set(e_dbg.inputs[0], dbg.outputs[0])
        out = g.new("ShaderNodeOutputMaterial")
        s.sock[name] = dict(g=g, out=out, pbr=bsdf.outputs[0], color=e_col.outputs[0], orm=e_orm.outputs[0], debug=e_dbg.outputs[0])
        g.link(bsdf.outputs[0], out.inputs[0])

    def mode(s, which):
        for k, d in s.sock.items():
            for l in list(d["out"].inputs[0].links): d["g"].nt.links.remove(l)
            d["g"].link(d[which], d["out"].inputs[0])

    # ---------------------------------------------------------------- bake
    def bake(s, outdir, size=2048, samples=24, extrusion=0.006, passes=("color", "normal", "orm")):
        sc = bpy.context.scene; lo, hi = s.lo_obj, s.hi_obj
        sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = samples
        sc.cycles.use_adaptive_sampling = False; sc.cycles.use_denoising = False
        sc.render.threads_mode = "AUTO"
        bm = bpy.data.materials.new(s.name); bm.use_nodes = True
        lo.data.materials.clear(); lo.data.materials.append(bm)
        for p in lo.data.polygons: p.material_index = 0
        nt = bm.node_tree; tex = nt.nodes.new("ShaderNodeTexImage"); nt.nodes.active = tex
        os.makedirs(outdir, exist_ok=True); imgs = {}
        for ps in passes:
            im = bpy.data.images.new(f"{s.name}_{ps}", size, size, alpha=False)
            im.colorspace_settings.name = "sRGB" if ps == "color" else "Non-Color"
            tex.image = im; s.mode("pbr" if ps == "normal" else ps)
            bpy.ops.object.select_all(action="DESELECT"); hi.select_set(True); lo.select_set(True); bpy.context.view_layer.objects.active = lo
            bpy.ops.object.bake(type="NORMAL" if ps == "normal" else "EMIT", use_selected_to_active=True, cage_extrusion=extrusion,
                                max_ray_distance=extrusion * 2.5, margin=12, margin_type="EXTEND", normal_space="TANGENT", use_clear=True)
            im.filepath_raw = os.path.join(outdir, f"{s.name}_{ps}.png"); im.file_format = "PNG"; im.save(); imgs[ps] = im
            if ps == "debug": continue
            print("baked", ps, flush=True)
        s.mode("pbr")
        if "color" not in imgs: return imgs
        # game material
        nt.nodes.remove(tex); bsdf = nt.nodes["Principled BSDF"]
        def T(im, x):
            n = nt.nodes.new("ShaderNodeTexImage"); n.image = im; n.location = (-700, x); return n
        c = T(imgs["color"], 300); nt.links.new(c.outputs[0], bsdf.inputs["Base Color"])
        if "normal" in imgs:
            n = T(imgs["normal"], -300); nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(n.outputs[0], nm.inputs["Color"]); nt.links.new(nm.outputs[0], bsdf.inputs["Normal"])
        if "orm" in imgs:
            o = T(imgs["orm"], 0); sp = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(o.outputs[0], sp.inputs[0])
            nt.links.new(sp.outputs[1], bsdf.inputs["Roughness"]); nt.links.new(sp.outputs[2], bsdf.inputs["Metallic"])
            grp = bpy.data.node_groups.get("glTF Material Output") or bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
            if not grp.interface.items_tree: grp.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
            gn = nt.nodes.new("ShaderNodeGroup"); gn.node_tree = grp; nt.links.new(sp.outputs[0], gn.inputs[0])
        bm.use_backface_culling = True
        return imgs

    def split(s, names):
        """After the bake: one object per item tag (1..n), sharing the baked material.  Returns the objects."""
        lo = s.lo_obj; ids = [d.value for d in lo.data.attributes["item"].data]; out = []; lo.name = lo.data.name = "_bake_lo"
        for i, name in enumerate(names, 1):
            o = lo.copy(); o.data = lo.data.copy(); o.name = o.data.name = name; bpy.context.scene.collection.objects.link(o)
            me = o.data
            for v in me.vertices: v.select = False
            for e in me.edges: e.select = False
            for p, t in zip(me.polygons, ids): p.select = (t != i)
            bpy.ops.object.select_all(action="DESELECT"); bpy.context.view_layer.objects.active = o
            bpy.ops.object.mode_set(mode="EDIT"); bpy.context.tool_settings.mesh_select_mode = (False, False, True)
            bpy.ops.mesh.delete(type="FACE"); bpy.ops.object.mode_set(mode="OBJECT"); out.append(o)
        bpy.data.objects.remove(lo); bpy.data.objects.remove(s.hi_obj)
        for e in [o for o in bpy.data.objects if o.type == "EMPTY"]: bpy.data.objects.remove(e)
        return out

    def export(s, outdir):
        lo = s.lo_obj
        bpy.ops.object.select_all(action="DESELECT"); lo.select_set(True); bpy.context.view_layer.objects.active = lo
        bpy.ops.export_scene.gltf(filepath=os.path.join(outdir, s.name + ".glb"), export_format="GLB", use_selection=True,
                                  export_tangents=True, export_apply=True, export_yup=True)
        for im in bpy.data.images:
            if im.filepath_raw and os.path.exists(bpy.path.abspath(im.filepath_raw)):
                try: im.filepath = bpy.path.relpath(im.filepath_raw, start=outdir)
                except Exception: pass
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir, s.name + ".blend"))


# -------------------------------------------------------------------- helpers
def _quad_caps(bm):
    ng = [f for f in bm.faces if len(f.verts) > 4]
    if ng:
        r = bmesh.ops.triangulate(bm, faces=ng, quad_method="BEAUTY", ngon_method="BEAUTY")
        bmesh.ops.join_triangles(bm, faces=r["faces"], angle_face_threshold=0.01, angle_shape_threshold=3.14)


def _join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name; o.data.name = name
    return o


def _normals(o, angle=50):
    me = o.data
    bm = bmesh.new(); bm.from_mesh(me); _quad_caps(bm); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(angle))
    m = o.modifiers.new("wn", "WEIGHTED_NORMAL"); m.keep_sharp = True; m.weight = 60; m.mode = "FACE_AREA"
    with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
        bpy.ops.object.modifier_apply(modifier=m.name)


_IMG = {}
def _image(path, cs="sRGB"):
    path = os.path.abspath(path)
    if path not in _IMG:
        im = bpy.data.images.load(path); im.colorspace_settings.name = cs; _IMG[path] = im
    return _IMG[path]


class NT:
    def __init__(s, m): s.nt = m.node_tree
    def clear(s): s.nt.nodes.clear()
    def new(s, t, **kw):
        n = s.nt.nodes.new(t)
        for k, v in kw.items(): setattr(n, k, v)
        return n
    def link(s, a, b): s.nt.links.new(a, b)
    def set(s, sock, v):
        if isinstance(v, bpy.types.NodeSocket): s.nt.links.new(v, sock)
        else:
            try: sock.default_value = v
            except Exception: sock.default_value = tuple(v)[:len(sock.default_value)]
    def math(s, op, a, b=None, clamp=False):
        n = s.new("ShaderNodeMath", operation=op, use_clamp=clamp); s.set(n.inputs[0], a)
        if b is not None: s.set(n.inputs[1], b)
        return n.outputs[0]
    def mix(s, f, a, b, blend="MIX"):
        n = s.new("ShaderNodeMix", data_type="RGBA", blend_type=blend); n.clamp_factor = True
        s.set(n.inputs[0], f); s.set(n.inputs[6], a if isinstance(a, bpy.types.NodeSocket) else tuple(a)); s.set(n.inputs[7], b if isinstance(b, bpy.types.NodeSocket) else tuple(b))
        return n.outputs[2]
    def mixf(s, f, a, b):
        n = s.new("ShaderNodeMix", data_type="FLOAT"); n.clamp_factor = True
        s.set(n.inputs[0], f); s.set(n.inputs[2], a); s.set(n.inputs[3], b); return n.outputs[0]
    def maprange(s, x, a, b, c, d, smooth=False):
        n = s.new("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP" if smooth else "LINEAR"); n.clamp = True
        s.set(n.inputs[0], x)
        for i, v in enumerate((a, b, c, d)): n.inputs[1 + i].default_value = v
        return n.outputs[0]
    def noise(s, vec, scale, detail=4, rough=0.5):
        n = s.new("ShaderNodeTexNoise"); s.link(vec, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail; n.inputs["Roughness"].default_value = rough
        return n.outputs[0]
    def mapping(s, vec, scale, off=(0, 0, 0)):
        n = s.new("ShaderNodeMapping"); s.link(vec, n.inputs[0]); n.inputs["Scale"].default_value = (scale,) * 3; n.inputs["Location"].default_value = off
        return n.outputs[0]
    def img(s, path, vec, proj="FLAT", ext="REPEAT", cs="sRGB"):
        n = s.new("ShaderNodeTexImage"); n.image = _image(path, cs); n.projection = proj; n.extension = ext
        if proj == "BOX": n.projection_blend = 0.2
        s.link(vec, n.inputs[0]); return n
    def lum(s, c):
        n = s.new("ShaderNodeRGBToBW"); s.link(c, n.inputs[0]); return n.outputs[0]
    def hsv(s, c, sat, val):
        if sat == 1.0 and val == 1.0: return c
        n = s.new("ShaderNodeHueSaturation"); n.inputs["Saturation"].default_value = sat; n.inputs["Value"].default_value = val; s.link(c, n.inputs["Color"])
        return n.outputs[0]
    def decal(s, d):
        tc = s.new("ShaderNodeTexCoord"); tc.object = d["e"]
        mp = s.new("ShaderNodeMapping"); s.link(tc.outputs["Object"], mp.inputs[0]); mp.inputs["Location"].default_value = (0.5, 0.5, 0)
        im = s.new("ShaderNodeTexImage"); im.image = d["im"]; im.extension = "CLIP"; s.link(mp.outputs[0], im.inputs[0])
        sp = s.new("ShaderNodeSeparateXYZ"); s.link(tc.outputs["Object"], sp.inputs[0])
        zin = s.math("LESS_THAN", s.math("ABSOLUTE", sp.outputs[2]), d["depth"])
        return im.outputs["Color"], s.math("MULTIPLY", im.outputs["Alpha"], zin)
