"""Gradi SVG varijante logoa iz originalnog Illustrator PDF-a.
Upotreba: python -I build_brand.py <ulaz.pdf> <izlazni_folder>
"""
import sys, re, os, json, pymupdf

sys.stdout.reconfigure(encoding="utf-8")
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
doc = pymupdf.open(src)
page = doc[0]


# ---------- 1. Gradijenti iz shading funkcija ----------
def obj(x):
    return doc.xref_object(x)


def refs(s, key):
    m = re.search(r"/%s\s*\[([^\]]*)\]" % key, s)
    return [int(a) for a in re.findall(r"(\d+)\s+0\s+R", m.group(1))] if m else []


def nums(s, key):
    m = re.search(r"/%s\s*\[([^\]]*)\]" % key, s)
    return [float(v) for v in m.group(1).split()]


def cmyk_to_rgb(samples):
    """CMYK 0..1 -> '#rrggbb' preko MuPDF konverzije (ista kao pri renderovanju PDF-a)."""
    data = bytes(int(round(v * 255)) for s in samples for v in s)
    pc = pymupdf.Pixmap(pymupdf.csCMYK, len(samples), 1, data, False)
    pr = pymupdf.Pixmap(pymupdf.csRGB, pc)
    return ["#%02x%02x%02x" % pr.pixel(i, 0)[:3] for i in range(len(samples))]


def sampled(xref):
    raw = doc.xref_stream(xref)
    n = int(nums(obj(xref), "Size")[0])
    return [tuple(raw[i * 4 + c] / 255 for c in range(4)) for i in range(n)]


def eval_sampled(table, x):
    e = x * (len(table) - 1)
    i = min(int(e), len(table) - 2)
    f = e - i
    return tuple(table[i][c] * (1 - f) + table[i + 1][c] * f for c in range(4))


def gradient_stops(shading_xref, steps=48):
    sh = obj(shading_xref)
    fs = obj(int(re.search(r"/Function\s+(\d+)\s+0\s+R", sh).group(1)))
    subs = [sampled(x) for x in refs(fs, "Functions")]
    bounds = [0.0] + nums(fs, "Bounds") + [1.0]
    enc = nums(fs, "Encode")
    pts = []
    for k in range(steps + 1):
        t = k / steps
        i = next(j for j in range(len(subs)) if t <= bounds[j + 1] or j == len(subs) - 1)
        lo, hi = bounds[i], bounds[i + 1]
        u = 0 if hi == lo else (t - lo) / (hi - lo)
        e0, e1 = enc[2 * i], enc[2 * i + 1]
        pts.append((t, eval_sampled(subs[i], e0 + u * (e1 - e0))))
    cols = cmyk_to_rgb([c for _, c in pts])
    return [(t, c) for (t, _), c in zip(pts, cols)]


res = obj(page.xref)
sh_map = {m.group(1): int(m.group(2)) for m in re.finditer(r"/(Sh\d)\s+(\d+)\s+0\s+R", res)}
STOPS = {k: gradient_stops(v) for k, v in sh_map.items()}

# redosled 'sh' poziva u sadržaju strane -> (shading, x početak, širina)
content = b"".join(doc.xref_stream(x) for x in page.get_contents()).decode("latin-1")
calls = [(m.group(5), float(m.group(3)), float(m.group(1)))
         for m in re.finditer(r"([\d.]+) 0 0 -([\d.]+) ([\d.]+) ([\d.]+) cm\s*\nBX /(Sh\d) sh", content)]

# ---------- 2. SVG sa putanjama ----------
svg = page.get_svg_image(text_as_path=True)
groups = list(re.finditer(r'<g clip-path="url\(#(clip_\d+)\)">\s*<image [^>]*/>\s*</g>', svg))
assert len(groups) == len(calls), (len(groups), len(calls))

ROLE = {}
for g, (shn, x0, w) in zip(groups, calls):
    cid = g.group(1)
    n = int(cid.split("_")[1])
    ROLE[cid] = ("letters" if n <= 8 else "car" if n == 10 else "arc" if n == 11 else
                 "red" if shn == "Sh1" else "blue")


def grad_def(gid, shn, x0, w, recolor=None):
    stops = "".join('<stop offset="%.4f" stop-color="%s"/>' % (t, recolor(c) if recolor else c)
                    for t, c in STOPS[shn])
    return ('<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="%.3f" y1="0" x2="%.3f" y2="0">%s</linearGradient>'
            % (gid, x0, x0 + w, stops))


def hex2rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def rgb2hex(r):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(v))) for v in r)


def to_gray(h, lo, hi):
    r, g, b = hex2rgb(h)
    lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    v = lo + (hi - lo) * lum
    return rgb2hex((v, v, v))


def fix_subtitle(s):
    """'AUTOMEHANIČARKSA RADNJA' -> 'AUTOMEHANIČARSKA RADNJA' zamenom glifova K i S."""
    uses = list(re.finditer(
        r'<use data-text="([^"]*)" xlink:href="(#font_\d+_\d+)" transform="matrix\(([^)]*)\)"', s))
    txt = "".join(u.group(1).replace("&#x010c;", "Č") for u in uses)
    assert txt == "AUTOMEHANIČARKSA RADNJA", txt
    i = txt.index("KSA")
    uk, us, ua = uses[i], uses[i + 1], uses[i + 2]
    mk, ms, ma = [list(map(float, u.group(3).split(","))) for u in (uk, us, ua)]
    xk, xs, xa = mk[4], ms[4], ma[4]
    kern = 15 / 1000 * mk[0]  # TJ kerning između K i S u originalu
    new_s_x = xk
    new_k_x = xk + (xa - xs) - kern

    def rebuild(u, x, letter, href):
        m = list(map(float, u.group(3).split(",")))
        m[4] = x
        return '<use data-text="%s" xlink:href="%s" transform="matrix(%s)"' % (
            letter, href, ",".join("%g" % v for v in m))

    s = s.replace(uk.group(0), "@@K@@", 1).replace(us.group(0), "@@S@@", 1)
    s = s.replace("@@K@@", rebuild(uk, new_s_x, "S", us.group(2)))
    s = s.replace("@@S@@", rebuild(us, new_k_x, "K", uk.group(2)))
    return s


# Naziv radnje je „Automehaničar Janković“ (29.10.2026): podnaslov se skraćuje na prvu reč.
SUBTITLE = "AUTOMEHANIČAR"
USE_RE = r'<use data-text="([^"]*)" xlink:href="(#font_\d+_\d+)" transform="matrix\(([^)]*)\)"[^>]*/>\n?'


def shorten_subtitle(s, keep):
    """Zadržava prvih len(keep) slova podnaslova i centrira ih tamo gde je bio ceo podnaslov."""
    uses = list(re.finditer(USE_RE, s))
    letters = [u.group(1).replace("&#x010c;", "Č") for u in uses]
    full = "".join(letters)
    assert full.startswith(keep) and len(letters) == len(full), full
    n = len(keep)
    xs = [list(map(float, u.group(3).split(",")))[4] for u in uses]
    i = full.index("AN")  # širina slova A (sa razmakom) iz para „AN“ u istom tekstu
    old_end = xs[-1] + (xs[i + 1] - xs[i])
    new_end = xs[n]  # početak prvog izbačenog slova
    shift = (old_end - new_end) / 2
    for k, u in enumerate(uses):
        if k >= n:
            s = s.replace(u.group(0), "", 1)
            continue
        m = list(map(float, u.group(3).split(",")))
        m[4] += shift
        new = u.group(0).replace("matrix(%s)" % u.group(3), "matrix(%s)" % ",".join("%g" % v for v in m), 1)
        s = s.replace(u.group(0), new, 1)
    return s


BASE = shorten_subtitle(fix_subtitle(svg), SUBTITLE)
BASE = BASE.replace(' xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"', "")
BASE = BASE.replace(' inkscape:groupmode="layer" inkscape:label="Layer 1"', "")
BG_RE = r'<path transform="matrix\(1,0,0,-1,0,1700.79\)" d="M0 0H5244V1700.787H0Z" fill="#3e3e3f"/>\n'


def variant(name, palette, background=None, viewbox=None, keep=None, out_w=None, keep_clips=None, grad_override=None):
    s = BASE
    defs = []
    for k, (g, (shn, x0, w)) in enumerate(zip(groups, calls)):
        cid = g.group(1)
        role = ROLE[cid]
        if (keep and role not in keep) or (keep_clips and cid not in keep_clips):
            s = s.replace(g.group(0), "")
            continue
        if grad_override and cid in grad_override:
            x0, w = grad_override[cid]
        kind, val = palette(role)
        if kind == "grad":
            gid = "g%d" % k
            defs.append(grad_def(gid, shn, x0, w, val))
            fill = "url(#%s)" % gid
        else:
            fill = val
        s = s.replace(g.group(0), '<g clip-path="url(#%s)"><rect x="0" y="0" width="5244.09" height="1700.79" fill="%s"/></g>' % (cid, fill))
    s = s.replace("<defs>", "<defs>" + "".join(defs), 1)
    if (keep and "subtitle" not in keep) or keep_clips:
        s = re.sub(r'<use data-text="[^"]*"[^>]*/>\n', "", s)
    s = s.replace('fill="#f9f9fa"', 'fill="%s"' % palette("subtitle")[1])
    if (keep and "needle" not in keep) or (keep_clips and "needle" not in keep_clips):
        s = re.sub(r'<g clip-path="url\(#clip_19\)">\s*<path [^>]*fill="#e7232f"/>\s*</g>', "", s)
    s = s.replace('fill="#e7232f"', 'fill="%s"' % palette("needle")[1])
    x, y, w, h = viewbox
    bg = ('<rect x="%g" y="%g" width="%g" height="%g" fill="%s"/>\n' % (x, y, w, h, background)) if background else ""
    s = re.sub(BG_RE, bg, s)
    ow = out_w or w / 4
    s = s.replace('width="5244.09" height="1700.79" viewBox="0 0 5244.09 1700.79"',
                  'width="%g" height="%g" viewBox="%g %g %g %g"' % (ow, ow * h / w, x, y, w, h), 1)
    s = re.sub(r"\n\s*\n", "\n", s)
    path = os.path.join(out, name + ".svg")
    open(path, "w", encoding="utf-8").write(s)
    return path


CHARCOAL = "#3e3e3f"
RED = "#e7232f"
PAD = 90
VB = (711 - PAD, 189 - PAD, (4513 - 711) + 2 * PAD, (1512 - 189) + 2 * PAD)


def orig(role):
    if role == "subtitle":
        return ("flat", "#f9f9fa")
    if role == "needle":
        return ("flat", RED)
    return ("grad", None)


def light(role):
    if role in ("letters", "car", "arc"):
        return ("flat", CHARCOAL)
    if role == "subtitle":
        return ("flat", "#555557")
    if role == "needle":
        return ("flat", RED)
    return ("grad", None)


def mono(role):
    if role in ("red", "blue"):
        return ("grad", lambda c: to_gray(c, 30, 150))
    return ("flat", "#1a1a1a")


variant("logo-dark", orig, background=CHARCOAL, viewbox=VB)
variant("logo-on-dark", orig, viewbox=VB)
variant("logo-light", light, viewbox=VB)
variant("logo-mono", mono, viewbox=VB)

# ikonica: brzinomer (luk, segmenti, igla) na kvadratu, centriran
mark = (1031, 189, 2706, 853)
side = (mark[2] - mark[0]) * 1.22
cx, cy = (mark[0] + mark[2]) / 2, (mark[1] + mark[3]) / 2
ICON_VB = (cx - side / 2, cy - side / 2, side, side)
variant("icon", orig, background=CHARCOAL, viewbox=ICON_VB, keep={"arc", "red", "blue", "needle"}, out_w=512)

# ikonica: slovo J iz logoa, srebrni gradijent preko sopstvene širine
jb = (1793, 968, 2098, 1312)
jside = (jb[3] - jb[1]) * 1.55
jcx, jcy = (jb[0] + jb[2]) / 2, (jb[1] + jb[3]) / 2
variant("icon-j", orig, background=CHARCOAL, viewbox=(jcx - jside / 2, jcy - jside / 2, jside, jside),
        keep_clips={"clip_1"}, grad_override={"clip_1": (jb[0] - 60, (jb[2] - jb[0]) * 2.2)}, out_w=512)

json.dump({k: [c for _, c in st] for k, st in STOPS.items()},
          open(os.path.join(out, "_gradients.json"), "w"), indent=0)
for k, st in STOPS.items():
    print(k, " ".join(c for _, c in st[::4]))
print("roles", sorted(set(ROLE.values())))
