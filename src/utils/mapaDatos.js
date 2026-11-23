// Datos del mapa 3D de la FCFM.
// La geometría sale de scripts/mapa/build_mapa.py (planos SVG de la Guía Bisonte).
// Coordenadas en metros aprox.: x = este, y = sur (como en el plano). En la escena 3D
// el plano (x, y) se vuelve (x, z) y la altura es el eje y.
import datos from "../data/mapaFacultad.json";

export const ALTURA_PISO = datos.alturaPiso;
export const FUENTE_MAPA = datos.fuente;

// ---------------------------------------------------------------- geometría
function bboxDe(puntos) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of puntos) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
    }
    return [x0, y0, x1, y1];
}

// Centroide por área (cae dentro de los cuartos en L mejor que el centro del bbox)
function centroide(poly) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < poly.length; i++) {
        const [x0, y0] = poly[i];
        const [x1, y1] = poly[(i + 1) % poly.length];
        const f = x0 * y1 - x1 * y0;
        a += f;
        cx += (x0 + x1) * f;
        cy += (y0 + y1) * f;
    }
    if (Math.abs(a) < 1e-6) {
        const [bx0, by0, bx1, by1] = bboxDe(poly);
        return [(bx0 + bx1) / 2, (by0 + by1) / 2];
    }
    return [cx / (3 * a), cy / (3 * a)];
}

const BBOX_CAMPUS = bboxDe(datos.campus.flatMap((e) => e.poly));
const CENTRO = [(BBOX_CAMPUS[0] + BBOX_CAMPUS[2]) / 2, (BBOX_CAMPUS[1] + BBOX_CAMPUS[3]) / 2];

// Punto del plano -> [x, z] de la escena (centrada en el campus)
export function aEscena([x, y]) {
    return [x - CENTRO[0], y - CENTRO[1]];
}

export const TAMANO_CAMPUS = Math.max(BBOX_CAMPUS[2] - BBOX_CAMPUS[0], BBOX_CAMPUS[3] - BBOX_CAMPUS[1]);

// ---------------------------------------------------------------- tipos
// Cada tipo usa un token de color del tema (themes.css), así cambia con el tema.
export const TIPOS = {
    "Aulas": "--cal-academico",
    "Laboratorio": "--cal-cultural",
    "Administrativo": "--cal-asueto",
    "Área Común": "--cal-deportivo",
    "Auditorio": "--cal-examen",
    "Asesorías": "--accent",
    "Investigación": "--cal-cultural",
    "Servicios": "--cal-asueto",
    "Deportivo": "--cal-deportivo",
    "Servicio": "--ink-muted",
};

export const TIPOS_LEYENDA = ["Aulas", "Laboratorio", "Administrativo", "Área Común", "Auditorio", "Asesorías"];

// Clases completas (no plantillas) para que Tailwind las detecte.
export function estilosTipoLugar(tipo) {
    switch (tipo) {
        case "Aulas": return "bg-cal-academico/10 text-cal-academico border-cal-academico/40";
        case "Laboratorio":
        case "Investigación": return "bg-cal-cultural/10 text-cal-cultural border-cal-cultural/40";
        case "Administrativo":
        case "Servicios": return "bg-cal-asueto/10 text-cal-asueto border-cal-asueto/40";
        case "Área Común":
        case "Deportivo": return "bg-cal-deportivo/10 text-cal-deportivo border-cal-deportivo/40";
        case "Auditorio": return "bg-cal-examen/10 text-cal-examen border-cal-examen/40";
        case "Asesorías": return "bg-accent/10 text-accent border-accent/40";
        default: return "bg-surface border-line text-ink-muted";
    }
}

export function colorPuntoLugar(tipo) {
    switch (tipo) {
        case "Aulas": return "bg-cal-academico";
        case "Laboratorio":
        case "Investigación": return "bg-cal-cultural";
        case "Administrativo":
        case "Servicios": return "bg-cal-asueto";
        case "Área Común":
        case "Deportivo": return "bg-cal-deportivo";
        case "Auditorio": return "bg-cal-examen";
        case "Asesorías": return "bg-accent";
        default: return "bg-ink-muted";
    }
}

// ---------------------------------------------------------------- campus
export const CAMPUS = datos.campus.map((e) => ({
    ...e,
    centro: centroide(e.poly),
    bbox: bboxDe(e.poly),
    altura: e.forma === "suelo" ? 0.12 : e.pisos * ALTURA_PISO,
}));

// ---------------------------------------------------------------- edificios con planos
export const EDIFICIOS = Object.values(datos.edificios).map((ed) => ({
    ...ed,
    // Huella para las losas de cada piso: los polígonos del mapa general de este edificio
    huella: CAMPUS.filter((c) => c.planos === ed.id).map((c) => c.poly),
    pisos: ed.pisos.map((p, i) => ({
        ...p,
        indice: i,
        edificio: ed.id,
        cuartos: p.cuartos.map((c) => ({
            ...c,
            vista: p.id,
            edificio: ed.id,
            piso: i,
            centro: centroide(c.poly),
            bbox: bboxDe(c.poly),
        })),
    })),
}));

const EDIFICIO_POR_ID = Object.fromEntries(EDIFICIOS.map((e) => [e.id, e]));

// ---------------------------------------------------------------- vistas
export const VISTA_GENERAL = {
    id: "general", titulo: "Vista General", nivel: "Panorámica", edificio: null, piso: null,
    subtitulo: "Campus FCFM",
};

export const VISTAS = [
    VISTA_GENERAL,
    ...EDIFICIOS.flatMap((ed) => ed.pisos.map((p) => ({
        id: p.id, titulo: p.titulo, nivel: p.nivel, edificio: ed.id, piso: p.indice, subtitulo: ed.nombre,
    }))),
];

export const VISTAS_POR_ID = Object.fromEntries(VISTAS.map((v) => [v.id, v]));

export const GRUPOS_NAVEGACION = [
    { titulo: "Campus", vistas: [VISTA_GENERAL] },
    ...EDIFICIOS.map((ed) => ({
        titulo: ed.nombre,
        vistas: ed.pisos.map((p) => VISTAS_POR_ID[p.id]),
    })),
];

export function pisoDeVista(vista) {
    if (!vista.edificio) return null;
    return EDIFICIO_POR_ID[vista.edificio].pisos[vista.piso];
}

export function edificioDeVista(vista) {
    return vista.edificio ? EDIFICIO_POR_ID[vista.edificio] : null;
}

// ---------------------------------------------------------------- directorio
// Un "lugar" es lo que aparece en el directorio: un cuarto con nombre o un edificio del campus.
const LUGARES_CUARTOS = EDIFICIOS.flatMap((ed) => ed.pisos.flatMap((p) =>
    p.cuartos.filter((c) => c.nombre).map((c) => ({
        id: c.id,
        nombre: c.nombre,
        tipo: c.tipo,
        vista: p.id,
        detalle: `${ed.nombre} · ${p.titulo}`,
        centro: c.centro,
        bbox: c.bbox,
        y: p.indice * ALTURA_PISO,
    }))
));

const LUGARES_CAMPUS = CAMPUS
    .filter((c) => c.id !== "basquet-a" && c.id !== "basquet-b" && c.id !== "e1-oeste")
    .map((c) => ({
        id: `campus:${c.id}`,
        nombre: c.nombre,
        tipo: c.tipo,
        vista: "general",
        detalle: c.forma === "suelo" ? "Exterior" : `${c.pisos} ${c.pisos === 1 ? "piso" : "pisos"}`,
        planos: c.planos,
        centro: c.centro,
        bbox: c.bbox,
        y: 0,
    }));

export const LUGARES = [...LUGARES_CAMPUS, ...LUGARES_CUARTOS];
export const LUGARES_POR_ID = Object.fromEntries(LUGARES.map((l) => [l.id, l]));

// Ordena lugares de servicio (baños, escaleras) al final
const PESO_TIPO = (t) => (t === "Servicio" ? 1 : 0);

export function lugaresDeVista(vistaId) {
    return LUGARES
        .filter((l) => l.vista === vistaId)
        .sort((a, b) => PESO_TIPO(a.tipo) - PESO_TIPO(b.tipo) || a.nombre.localeCompare(b.nombre, "es", { numeric: true }));
}

const normalizar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buscarLugares(texto) {
    const q = normalizar(texto.trim());
    if (!q) return [];
    return LUGARES
        .filter((l) => normalizar(`${l.nombre} ${l.tipo} ${l.detalle}`).includes(q))
        .sort((a, b) => PESO_TIPO(a.tipo) - PESO_TIPO(b.tipo) || a.nombre.localeCompare(b.nombre, "es", { numeric: true }));
}

// ---------------------------------------------------------------- encuadres de cámara
// La cámara mira desde el sur (z+) hacia el norte, un poco elevada.
function encuadre(bbox, y, minimo = 20) {
    const [x0, z0] = aEscena([bbox[0], bbox[1]]);
    const [x1, z1] = aEscena([bbox[2], bbox[3]]);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const tam = Math.max(x1 - x0, z1 - z0, minimo);
    return {
        objetivo: [cx, y, cz],
        posicion: [cx + tam * 0.18, y + tam * 1.05, cz + tam * 1.0],
    };
}

export function encuadreVista(vista) {
    if (!vista.edificio) return encuadre(BBOX_CAMPUS, 0, 40);
    const piso = pisoDeVista(vista);
    const bb = bboxDe(piso.cuartos.flatMap((c) => c.poly));
    return encuadre(bb, piso.indice * ALTURA_PISO, 50);
}

export function encuadreLugar(lugar) {
    return encuadre(lugar.bbox, lugar.y, 40);
}
