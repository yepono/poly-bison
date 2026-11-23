"""
Genera src/data/mapaFacultad.json a partir de los planos SVG de la Guía Bisonte
(https://laintegral.online/distribucion-facultad/).

Uso:
    ./scripts/mapa/descargar_svgs.sh          # baja los SVG a scripts/mapa/svg/
    python3 scripts/mapa/build_mapa.py        # escribe src/data/mapaFacultad.json

Notas de geometría
------------------
* Todo se expresa en el sistema de coordenadas del mapa general (general.svg,
  viewBox 1080x1620, norte hacia arriba).
* Los planos del Edificio 1 (PB, P1, P2) comparten marco y se alinean con el
  mapa general mediante una escala uniforme + traslación (PLAN_A_GENERAL).
* Los planos del Edificio 3 usan su propio marco; cada piso se ajusta al
  rectángulo del Edificio 3 en el mapa general.
* La escena 3D usa metros aproximados: 1 px del mapa general ≈ ESCALA_M m.
"""
import json
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SVG_DIR = AQUI / "svg"
SALIDA = AQUI.parent.parent / "src" / "data" / "mapaFacultad.json"

NS = "{http://www.w3.org/2000/svg}"
I = (1, 0, 0, 1, 0, 0)

DEBUG = "--debug" in sys.argv
ESCALA_M = 0.15  # metros por px del mapa general
# Plano (2896x4344) -> mapa general (1080x1620). Calibrado con la plaza,
# el ala oeste y la fila de aulas 101-105 (error < 1 px).
PLAN_S = 0.3383
PLAN_TX = 60.7
PLAN_TY = 101.9


# ----------------------------------------------------------------- SVG parse
def mul(a, b):
    return (a[0]*b[0] + a[2]*b[1], a[1]*b[0] + a[3]*b[1],
            a[0]*b[2] + a[2]*b[3], a[1]*b[2] + a[3]*b[3],
            a[0]*b[4] + a[2]*b[5] + a[4], a[1]*b[4] + a[3]*b[5] + a[5])


def parse_t(s):
    m = I
    for name, args in re.findall(r"(\w+)\(([^)]*)\)", s or ""):
        v = [float(x) for x in re.split(r"[ ,]+", args.strip())]
        if name == "matrix":
            t = tuple(v)
        elif name == "translate":
            t = (1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0)
        elif name == "scale":
            t = (v[0], 0, 0, v[1] if len(v) > 1 else v[0], 0, 0)
        else:
            raise ValueError(f"transform no soportado: {name}")
        m = mul(m, t)
    return m


def ap(m, x, y):
    return (m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5])


def num(s):
    # Algunos <tspan> traen una x por carácter ("1285 1292 ..."): usamos la primera.
    return float(re.sub(r"px", "", (s or "0")).split()[0] if (s or "").strip() else 0)


def estilo(el):
    d = {}
    for kv in (el.get("style") or "").split(";"):
        if ":" in kv:
            k, v = kv.split(":", 1)
            d[k.strip()] = v.strip()
    for k in ("fill", "stroke"):
        if el.get(k):
            d[k] = el.get(k)
    return d


def rgb(s):
    m = re.match(r"rgb\((\d+),(\d+),(\d+)\)", s or "")
    return tuple(int(x) for x in m.groups()) if m else None


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return [min(xs), min(ys), max(xs), max(ys)]


def leer_svg(path):
    out = {"shapes": [], "texts": []}

    def walk(el, m):
        m = mul(m, parse_t(el.get("transform")))
        tag = el.tag.replace(NS, "")
        st = estilo(el)
        if tag == "rect":
            x, y, w, h = (num(el.get(k)) for k in ("x", "y", "width", "height"))
            pts = [ap(m, x, y), ap(m, x+w, y), ap(m, x+w, y+h), ap(m, x, y+h)]
            out["shapes"].append({"fill": rgb(st.get("fill")), "stroke": rgb(st.get("stroke")), "bb": bbox(pts), "poly": pts})
        elif tag == "path":
            # Los SVG sólo usan comandos absolutos M/L/C/Z. Para el polígono tomamos
            # los vértices de M/L y el punto final de cada C (las esquinas
            # redondeadas quedan biseladas, suficiente para extruir cajas).
            todos, poly, subpaths = [], [], 0
            for cmd, args in re.findall(r"([MLCZ])([^MLCZ]*)", el.get("d", "")):
                v = [float(n) for n in re.findall(r"-?\d*\.?\d+(?:e-?\d+)?", args)]
                pares = [ap(m, v[i], v[i+1]) for i in range(0, len(v) - 1, 2)]
                todos += pares
                if cmd == "M":
                    subpaths += 1
                if cmd in "ML":
                    poly += pares
                elif cmd == "C":
                    poly += pares[2::3]
            if todos:
                out["shapes"].append({"fill": rgb(st.get("fill")), "stroke": rgb(st.get("stroke")),
                                      "bb": bbox(todos), "poly": poly if subpaths == 1 else None})
        elif tag == "text":
            fs = num(st.get("font-size")) * math.hypot(m[0], m[1])
            # Serif parte los textos en <tspan> con x propia: cada tramo es una etiqueta.
            tramos = [(num(el.get("x")), num(el.get("y")), el.text or "")]
            for ts in el:
                tramos.append((num(ts.get("x")), num(ts.get("y")), (ts.text or "") + (ts.tail or "")))
            # Une tramos que no empiezan con espacio previo (p.ej. "1" + "03 ")
            etiquetas = []
            for x, y, t in tramos:
                if etiquetas and not etiquetas[-1][2].endswith(" ") and t and not t.startswith(" "):
                    px, py, pt = etiquetas[-1]
                    etiquetas[-1] = (px, py, pt + t)
                else:
                    etiquetas.append((x, y, t))
            for x, y, t in etiquetas:
                for i, tok in enumerate(t.split()):
                    if i == 0:
                        p = ap(m, x, y)
                    else:  # tokens extra en el mismo tramo: posición aproximada
                        p = ap(m, x + i * fs * 2.7 / max(abs(m[0]), 1e-9), y)
                    out["texts"].append({"t": tok, "p": p, "fs": fs})
            full = "".join(el.itertext()).strip()
            out["texts_full"] = out.get("texts_full", []) + [{"t": full, "p": ap(m, num(el.get("x")), num(el.get("y"))), "fs": fs}]
            return
        for c in el:
            walk(c, m)

    walk(ET.parse(path).getroot(), I)
    return out


# ----------------------------------------------------------------- helpers
def _gris(c):
    return c is not None and all(168 <= v <= 186 for v in c) and max(c) - min(c) <= 4


def es_gris_cuarto(s):
    """Edificio 1: cada cuarto es un rect/path con relleno gris."""
    return _gris(s["fill"])


def contiene(bb, p, margen=0):
    return bb[0] - margen <= p[0] <= bb[2] + margen and bb[1] - margen <= p[1] <= bb[3] + margen


def area(bb):
    return (bb[2] - bb[0]) * (bb[3] - bb[1])


def dist_rect(bb, p):
    dx = max(bb[0] - p[0], 0, p[0] - bb[2])
    dy = max(bb[1] - p[1], 0, p[1] - bb[3])
    return math.hypot(dx, dy)


def limpiar_poly(pts):
    """Quita puntos duplicados consecutivos y el cierre repetido."""
    res = []
    for p in pts:
        if not res or math.hypot(p[0] - res[-1][0], p[1] - res[-1][1]) > 0.5:
            res.append(p)
    if len(res) > 1 and math.hypot(res[0][0] - res[-1][0], res[0][1] - res[-1][1]) <= 0.5:
        res.pop()
    return res


def a_metros(pts, tf):
    return [[round(tf(p)[0] * ESCALA_M, 2), round(tf(p)[1] * ESCALA_M, 2)] for p in pts]


def plan_a_general(p):
    return (p[0] * PLAN_S + PLAN_TX, p[1] * PLAN_S + PLAN_TY)


def ajustar_a(bb_origen, bb_destino):
    """Transformación uniforme que centra bb_origen dentro de bb_destino."""
    sw = (bb_destino[2] - bb_destino[0]) / (bb_origen[2] - bb_origen[0])
    sh = (bb_destino[3] - bb_destino[1]) / (bb_origen[3] - bb_origen[1])
    s = min(sw, sh)
    cx_o = (bb_origen[0] + bb_origen[2]) / 2
    cy_o = (bb_origen[1] + bb_origen[3]) / 2
    cx_d = (bb_destino[0] + bb_destino[2]) / 2
    cy_d = (bb_destino[1] + bb_destino[3]) / 2
    return lambda p: ((p[0] - cx_o) * s + cx_d, (p[1] - cy_o) * s + cy_d)


# ----------------------------------------------------------------- pisos
def leyenda(data):
    """Leyenda: números pequeños a la izquierda + texto largo en la misma línea."""
    largos = [t for t in data["texts_full"] if len(t["t"]) > 3 and not re.fullmatch(r"[\d ]+", t["t"])]
    if not largos:
        return {}
    fs_ley = max(t["fs"] for t in largos)
    largos = [t for t in largos if abs(t["fs"] - fs_ley) < 1]
    nums = [t for t in data["texts"] if re.fullmatch(r"\d{1,2}", t["t"]) and t["fs"] < fs_ley * 0.8]
    res = {}
    for n in nums:
        cand = [l for l in largos if abs(l["p"][1] - n["p"][1]) < fs_ley * 0.6 and 0 < l["p"][0] - n["p"][0] < fs_ley * 2]
        if cand:
            res[int(n["t"])] = cand[0]["t"].replace("ﬁ", "fi").replace("“", '"').replace("”", '"').strip()
    return res


PLAZA_PLANO = (1528, 3414)  # centro del patio central en los planos del Edificio 1


def extraer_piso(data, y_min_plano):
    """Devuelve cuartos (polígono en coords del plano) y pines numerados."""
    cuartos = []
    vistos = set()
    for s in data["shapes"]:
        if not es_gris_cuarto(s):
            continue
        bb = s["bb"]
        if bb[1] < y_min_plano or area(bb) < 400:
            continue
        # El patio central no es un cuarto.
        if area(bb) > 300000 and contiene(bb, PLAZA_PLANO):
            continue
        clave = tuple(round(v) for v in bb)
        if clave in vistos:
            continue
        vistos.add(clave)
        poly = limpiar_poly(s["poly"]) if s["poly"] else None
        if not poly or len(poly) < 3:
            poly = [(bb[0], bb[1]), (bb[2], bb[1]), (bb[2], bb[3]), (bb[0], bb[3])]
        cuartos.append({"bb": bb, "poly": poly, "numero": None, "marcadores": []})

    # Números de aula (3 dígitos) dentro del cuarto; preferimos el cuarto más pequeño.
    for t in data["texts"]:
        if t["p"][1] > y_min_plano and re.fullmatch(r"\d{3}", t["t"]):
            dentro = [c for c in cuartos if contiene(c["bb"], t["p"], 4)]
            if dentro:
                c = min(dentro, key=lambda c: area(c["bb"]))
                c["numero"] = c["numero"] or t["t"]

    # Pines: elementos <text> que son sólo un número de 1-2 dígitos, dentro del plano.
    pines = [t for t in data["texts_full"]
             if t["p"][1] > y_min_plano - 150 and re.fullmatch(r"\d{1,2}", t["t"].replace(" ", ""))]
    for t in pines:
        t["t"] = t["t"].replace(" ", "")
    return cuartos, pines


def asignar_pines(cuartos, pines, ley, manual):
    """
    1. Ajuste manual {pin: índice de cuarto | None} si existe.
    2. Si la leyenda dice "... / 204", va al cuarto con número 204.
    3. Si no, el cuarto más cercano a la punta del pin.
    """
    por_numero = {c["numero"]: c for c in cuartos if c["numero"]}
    hechos = set()
    for n, idx in manual.items():
        if idx is not None:
            cuartos[idx]["marcadores"].append(n)
        hechos.add(n)
    for n, nombre in ley.items():
        m = re.search(r"/\s*(\d{3})$", nombre)
        if n not in hechos and m and m.group(1) in por_numero:
            por_numero[m.group(1)]["marcadores"].append(n)
            hechos.add(n)
    for pin in pines:
        n = int(pin["t"])
        if n in hechos or n not in ley:
            continue
        punta = (pin["p"][0], pin["p"][1] + pin["fs"] * 0.9)
        c = min(cuartos, key=lambda c: dist_rect(c["bb"], punta) + 1e-6 * area(c["bb"]))
        c["marcadores"].append(n)


TIPOS = [
    (r"^aulas?\b", "Aulas"),
    (r"escaleras|baños|vest[ií]bulo", "Servicio"),
    (r"laboratorio|estudio|sala de c[oó]mputo|computadoras|site|soporte", "Laboratorio"),
    (r"auditorio|sala polivalente|sala de", "Auditorio"),
    (r"cafeter|terraza|sociedad|biblioteca|cice|caadi|copiado|club", "Área Común"),
    (r"cub[ií]culo|asesor", "Asesorías"),
    (r"coordinaci|subdirecci|direcci|oficina|tesorer|recursos|departamento|escolar|prefectura|servicio|recepci|becas|innovaci|afi|psico|enfermer", "Administrativo"),
]


def tipo_de(nombre):
    n = nombre.lower()
    for pat, tipo in TIPOS:
        if re.search(pat, n):
            return tipo
    return "Otro"


def construir_piso(nombre_svg, piso_id, titulo, nivel, tf, y_min, ajustes):
    data = leer_svg(SVG_DIR / f"{nombre_svg}.svg")
    ley = leyenda(data)
    cuartos, pines = extraer_piso(data, y_min)
    for idx, numero in ajustes.get("numeros", {}).items():
        cuartos[idx]["numero"] = numero
    asignar_pines(cuartos, pines, ley, ajustes.get("pines", {}))
    extra_nombres = ajustes.get("nombres", {})
    if DEBUG:
        for i, c in enumerate(cuartos):
            print(f"    [{piso_id}] {i:2d} num={c['numero']} pines={c['marcadores']} bb={[round(v) for v in c['bb']]}")

    salida = []
    for i, c in enumerate(cuartos):
        nombres = [ley[n] for n in sorted(c["marcadores"]) if n in ley and not ley[n].lower().startswith("aulas")]
        if i in extra_nombres:
            nombres.append(extra_nombres[i])
        if nombres:
            nombre = " · ".join(dict.fromkeys(nombres))
        elif c["numero"]:
            nombre = f"Aula {c['numero']}"
        else:
            nombre = None
        # Si tiene número y nombre, el número ya aparece en el nombre de la leyenda
        # (p.ej. "Laboratorio LSTI 1 / 204"); si no, lo añadimos.
        if nombre and c["numero"] and c["numero"] not in nombre:
            nombre = f"{nombre} / {c['numero']}"
        salida.append({
            "id": f"{piso_id}-{i}",
            "numero": c["numero"],
            "nombre": nombre,
            "tipo": tipo_de(nombre) if nombre else "Servicio",
            "poly": a_metros(c["poly"], tf),
        })
    return {"id": piso_id, "titulo": titulo, "nivel": nivel, "cuartos": salida}


# ----------------------------------------------------------------- campus
def construir_campus():
    data = leer_svg(SVG_DIR / "general.svg")
    shapes = data["shapes"]

    def buscar(color, bb_aprox, tol=6):
        for s in shapes:
            if s["fill"] == color and all(abs(a - b) <= tol for a, b in zip(s["bb"], bb_aprox)):
                return s
        raise LookupError(f"no encontré {color} {bb_aprox}")

    def poly_de(s):
        p = limpiar_poly(s["poly"]) if s["poly"] else None
        if not p or len(p) < 3:
            b = s["bb"]
            p = [(b[0], b[1]), (b[2], b[1]), (b[2], b[3]), (b[0], b[3])]
        return a_metros(p, lambda q: q)

    ROJO, AZUL_OSC, AZUL_E2, AZUL_E3, CELESTE = (183, 58, 64), (30, 40, 90), (52, 75, 132), (85, 129, 180), (129, 194, 233)
    GRIS_OSC, GRIS_CLARO = (111, 112, 114), (176, 177, 179)

    defs = [
        # id, nombre, tipo, color svg, bbox aprox, pisos, forma ("edificio"|"suelo"), edificioPlanos
        ("e1", "Edificio 1", "Aulas", AZUL_OSC, [75.8, 954.4, 896.4, 1553.8], 3, "edificio", "e1"),
        ("e1-oeste", "Edificio 1 · Ala Oeste", "Aulas", AZUL_OSC, [318.5, 1089.2, 399.7, 1425.2], 3, "edificio", "e1"),
        ("e2", "Edificio 2", "Aulas", AZUL_E2, [75.8, 1089.2, 291.5, 1168.5], 3, "edificio", "e1"),
        ("e4", "Edificio 4", "Aulas", CELESTE, [826.3, 873.4, 1004.2, 1226.8], 3, "edificio", "e1"),
        ("e3", "Edificio 3", "Aulas", AZUL_E3, [791.4, 611.3, 996.7, 747.8], 2, "edificio", "e3"),
        ("cicfim", "CICFIM", "Investigación", ROJO, [538.6, 611.3, 837.2, 835.0], 2, "edificio", None),
        ("usit", "US-IT", "Servicios", ROJO, [75.8, 1311.4, 276.6, 1553.8], 2, "edificio", None),
        ("gimnasio", "Gimnasio", "Deportivo", GRIS_OSC, [791.4, 447.9, 996.7, 584.4], 2, "edificio", None),
        ("plaza", "Plaza Cultural \"Ing. Rafael Serna Treviño\"", "Área Común", ROJO, [453.3, 1089.2, 702.4, 1425.2], 0, "suelo", None),
        ("futbol", "Cancha de Fútbol", "Deportivo", GRIS_OSC, [537.5, 70.4, 992.0, 325.4], 0, "suelo", None),
        ("basquet-a", "Cancha de Básquetbol", "Deportivo", GRIS_CLARO, [538.6, 351.9, 763.9, 584.4], 0, "suelo", None),
        ("basquet-b", "Explanada deportiva", "Deportivo", GRIS_CLARO, [757.2, 351.9, 992.0, 416.4], 0, "suelo", None),
        ("basquet", "Cancha de Básquetbol", "Deportivo", GRIS_OSC, [582.7, 371.4, 719.8, 564.9], 0, "suelo", None),
    ]
    edificios = []
    for id_, nombre, tipo, color, bb, pisos, forma, planos in defs:
        s = buscar(color, bb)
        edificios.append({
            "id": id_, "nombre": nombre, "tipo": tipo, "pisos": pisos, "forma": forma,
            "planos": planos, "poly": poly_de(s),
        })
    return edificios, [v * ESCALA_M for v in (0, 0, 1080, 1620)]


# ----------------------------------------------------------------- Edificio 3
# Los SVG del Edificio 3 dibujan los cuartos como segmentos sueltos, así que
# los cuartos se capturaron a mano sobre el render a 700 px de ancho
# (rsvg-convert -w 700). Cada piso se ajusta al rectángulo del Edificio 3
# del mapa general.
def R(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


EDIFICIO3 = [
    ("e3-pb", "Planta Baja", "Nivel 0", [
        ("Cubículo de Asesorías 4", R(90, 590, 198, 650)),
        ("Cubículo de Asesorías 3", R(203, 590, 308, 650)),
        ("Cubículo de Asesorías 2", R(315, 590, 420, 650)),
        ("Cubículo de Asesorías 1", R(427, 590, 528, 650)),
        ("Cubículo de Asesorías 5", R(90, 685, 198, 745)),
        ("Cubículo de Asesorías 6", R(203, 685, 308, 745)),
        ("Biblioteca", R(315, 685, 420, 745)),
        ("Recepción", R(455, 683, 527, 741)),
        ("Baños", R(533, 683, 618, 752)),
        ("Coordinación del departamento de Asesorías", R(315, 752, 420, 810)),
        ("Coordinación AFI", R(315, 818, 420, 877)),
        ("Coordinación de Psicopedagogía", R(315, 884, 420, 943)),
        (None, R(315, 950, 420, 1010)),
        (None, R(533, 758, 618, 828)),
        ("Enfermería", R(533, 835, 618, 903)),
        ("Escaleras", R(530, 952, 618, 1032)),
    ]),
    ("e3-p1", "Primer Piso", "Nivel 1", [
        ("Aula 306", R(33, 590, 147, 735)),
        ("Aula 305", R(152, 590, 276, 735)),
        ("Aula 303", R(282, 590, 406, 735)),
        ("Aula 301", R(410, 590, 535, 735)),
        ("Baños", R(543, 590, 662, 730)),
        ("Oficina", [(35, 740), (125, 740), (125, 780), (165, 780), (165, 860), (35, 860)]),
        ("Laboratorio de Comunicaciones", R(35, 867, 195, 1012)),
        ("Aula 304", R(203, 867, 392, 1012)),
        ("Aula 302", R(397, 867, 573, 1012)),
        ("Escaleras", R(577, 952, 662, 1032)),
    ]),
]


def construir_piso_manual(piso_id, titulo, nivel, cuartos, destino_bb):
    origen = bbox([p for _, poly in cuartos for p in poly])
    tf = ajustar_a(origen, destino_bb)
    salida = []
    for i, (nombre, poly) in enumerate(cuartos):
        m = re.match(r"Aula (\d{3})$", nombre or "")
        salida.append({
            "id": f"{piso_id}-{i}",
            "numero": m.group(1) if m else None,
            "nombre": nombre,
            "tipo": tipo_de(nombre) if nombre else "Servicio",
            "poly": a_metros(poly, tf),
        })
    return {"id": piso_id, "titulo": titulo, "nivel": nivel, "cuartos": salida}


# ----------------------------------------------------------------- main
def main():
    if not SVG_DIR.exists():
        sys.exit(f"Faltan los SVG en {SVG_DIR}. Corre descargar_svgs.sh primero.")

    campus, limites = construir_campus()

    # Ajustes donde la heurística falla (índices = orden de extracción; ver --debug).
    #   pines:   {número de pin: índice de cuarto | None para ignorar}
    #   numeros: {índice: "119"} número de aula que el SVG no trae separado
    #   nombres: {índice: "Escaleras"} nombres que no vienen en la leyenda
    AJ_PB = {
        "pines": {5: 8, 12: 12, 18: 42, 19: 41, 20: 37},
        "nombres": {34: "Escaleras", 33: "Escaleras", 32: "Escaleras", 31: "Vestíbulo de acceso"},
    }
    AJ_P1 = {
        "pines": {13: 11, 15: 2, 16: 3, 17: 38, 20: 27, 21: 26, 22: 28},
        "nombres": {31: "Escaleras", 30: "Escaleras", 29: "Escaleras", 23: "Baños", 24: "Baños"},
    }
    AJ_P2 = {
        "pines": {9: 25, 10: 32},
        "numeros": {23: "119"},
        "nombres": {44: "Escaleras", 43: "Escaleras", 42: "Escaleras", 29: "Baños", 30: "Baños", 40: "Baños", 41: "Baños"},
    }

    e1 = [
        construir_piso("plantabaja", "e1-pb", "Planta Baja", "Nivel 0", plan_a_general, 2200, AJ_PB),
        construir_piso("primerpiso", "e1-p1", "Primer Piso", "Nivel 1", plan_a_general, 2200, AJ_P1),
        construir_piso("segundopiso", "e1-p2", "Segundo Piso", "Nivel 2", plan_a_general, 2200, AJ_P2),
    ]

    e3_destino = next(e["poly"] for e in campus if e["id"] == "e3")
    e3_bb = bbox([(x / ESCALA_M, y / ESCALA_M) for x, y in e3_destino])
    e3 = [construir_piso_manual(pid, titulo, nivel, cuartos, e3_bb) for pid, titulo, nivel, cuartos in EDIFICIO3]

    out = {
        "fuente": "https://laintegral.online/distribucion-facultad/",
        "escalaMetrosPorPx": ESCALA_M,
        "limites": limites,
        "alturaPiso": 3.6,
        "campus": campus,
        "edificios": {
            "e1": {"id": "e1", "nombre": "Edificio 1, 2 y 4", "pisos": e1},
            "e3": {"id": "e3", "nombre": "Edificio 3", "pisos": e3},
        },
    }
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"OK -> {SALIDA}")
    for ed in out["edificios"].values():
        for p in ed["pisos"]:
            print(f"  {p['id']}: {len(p['cuartos'])} cuartos, {sum(1 for c in p['cuartos'] if c['nombre'])} con nombre")


if __name__ == "__main__":
    main()
