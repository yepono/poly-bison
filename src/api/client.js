// Cliente de la API PHP.
// La URL base sale de VITE_API_URL (.env.development / .env.production).
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
    constructor(message, status, field = null) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.field = field;
    }
}

// Se llama cuando la API responde 401 (sesión vencida o inválida)
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
    unauthorizedHandler = handler;
}

function buildUrl(seccion, accion, params) {
    const url = new URL(`${API_URL}/${seccion}.php`, window.location.origin);
    url.searchParams.set("accion", accion);
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
    return url;
}

// Llama a una acción de la API (<seccion>.php?accion=<accion>). Si el cuerpo es un FormData se
// envía como formulario con archivos; si no, como JSON. Si el servidor responde con un error,
// lanza un ApiError con su mensaje.
export async function api(seccion, accion, { method = "GET", params, body, skipAuthHandler = false } = {}) {
    const options = { method, credentials: "include", headers: {} };
    if (body instanceof FormData) {
        options.body = body;
    } else if (body !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(buildUrl(seccion, accion, params), options);
    } catch {
        throw new ApiError("No se pudo conectar con el servidor. Intenta de nuevo.", 0);
    }

    let data;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok || !data || data.success === false) {
        if (response.status === 401 && !skipAuthHandler && unauthorizedHandler) unauthorizedHandler();
        throw new ApiError(data?.message || "Ocurrió un error inesperado. Intenta de nuevo.", response.status, data?.field ?? null);
    }
    return data;
}

// URL de una imagen servida por la API (avatar, multimedia, producto)
export function fileUrl(seccion, accion, id, version) {
    return buildUrl(seccion, accion, { id, v: version }).toString();
}

export function formatFecha(fecha) {
    if (!fecha) return "";
    const date = new Date(String(fecha).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
}

// Adapta el usuario de la API a la forma que usan los componentes
export function mapUser(apiUser, avatarVersion) {
    if (!apiUser) return null;
    return {
        id: apiUser.id_usuario,
        nombre: apiUser.nombre_completo,
        alias: apiUser.alias,
        correo: apiUser.correo ?? "",
        carrera: apiUser.carrera ?? "",
        semestre: apiUser.semestre ?? "",
        rol: apiUser.rol,
        estado: apiUser.estado,
        fechaRegistro: formatFecha(apiUser.fecha_registro),
        debeCambiarContrasena: Boolean(apiUser.debe_cambiar_contrasena),
        avatar: apiUser.tiene_foto ? fileUrl("usuarios", "foto", apiUser.id_usuario, avatarVersion) : "",
    };
}

export function formatFechaHora(fecha) {
    if (!fecha) return "";
    const date = new Date(String(fecha).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// Formatos de fecha y hora
// Toda la app usa estos formatos en español de México, por ejemplo:
//   formatFecha       "20 de noviembre de 2026"     (registro, perfil)
//   formatFechaHora   "20 nov 2026, 9:30 a.m."      (publicaciones, bitácora, eventos)
//   formatDia         "jue, 26 de nov de 2026"      (reservaciones: fecha sin hora)
//   formatHora        "09:00"                       (bloques de horario; quita los segundos)

// Convierte "AAAA-MM-DD" en algo como "jue, 26 nov 2026"
export function formatDia(iso) {
    if (!iso) return "";
    const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    const fecha = new Date(a, m - 1, d);
    if (Number.isNaN(fecha.getTime())) return String(iso);
    return fecha.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
}

// Quita los segundos: "09:00:00" queda como "09:00"
export function formatHora(hora) {
    const m = String(hora ?? "").match(/^(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, "0")}:${m[2]}` : String(hora ?? "");
}

export const formatRangoHoras = (inicio, fin) => `${formatHora(inicio)} – ${formatHora(fin)}`;

// Inicio y fin de un evento: si es el mismo día no repite la fecha
export function formatRangoFechaHora(inicio, fin) {
    const a = new Date(String(inicio).replace(" ", "T"));
    const b = new Date(String(fin).replace(" ", "T"));
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
    const hora = (d) => d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
    if (a.toDateString() === b.toDateString()) return `${formatFechaHora(inicio)} – ${hora(b)}`;
    return `${formatFechaHora(inicio)} – ${formatFechaHora(fin)}`;
}

// Adapta una publicación de la API a la forma que usan PostCard y Feed
export function mapPost(p) {
    return {
        id: p.id_publicacion,
        authorId: p.id_usuario,
        autor: p.alias,
        avatar: p.autor_tiene_foto ? fileUrl("usuarios", "foto", p.id_usuario) : "",
        fecha: formatFechaHora(p.fecha_creacion),
        titulo: p.titulo,
        contenido: p.descripcion,
        idEtiqueta: p.id_etiqueta,
        etiqueta: p.etiqueta,
        etiquetaColor: p.etiqueta_color,
        imagen: p.id_imagen ? fileUrl("multimedia", "ver", p.id_imagen) : null,
        videoUrl: p.video_url || null,
        likes: p.total_likes,
        liked: p.liked,
        comentarios: p.total_comentarios, // número de comentarios
    };
}

// Adapta un comentario de la API a la forma que usa la página de la publicación
export function mapComentario(c) {
    return {
        id: c.id_comentario,
        authorId: c.id_usuario,
        alias: c.alias,
        autor: c.alias,
        avatar: c.autor_tiene_foto ? fileUrl("usuarios", "foto", c.id_usuario) : "",
        texto: c.contenido,
        fecha: formatFechaHora(c.fecha_creacion),
    };
}

export function formatPrecio(precio) {
    const valor = Number(precio);
    if (Number.isNaN(valor)) return "";
    return `$${valor.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

// Adapta un producto de la API a la forma que usan la tienda y su ventana de detalle
export function mapProducto(p) {
    return {
        id: p.id_producto,
        titulo: p.nombre,
        precioValor: p.precio,
        precio: formatPrecio(p.precio),
        stock: p.stock,
        idCategoria: p.id_categoria,
        categoria: p.categoria,
        // Si no tiene foto queda en null y la tienda dibuja su propio marcador
        imagen: p.tiene_foto ? fileUrl("productos", "foto", p.id_producto) : null,
        tieneFoto: p.tiene_foto,
        descripcionCorta: p.descripcion || "",
        descripcionLarga: p.descripcion || "",
    };
}

// Fecha local de hoy en formato AAAA-MM-DD
export function hoyISO() {
    return new Date().toLocaleDateString("en-CA");
}

// Convierte una fecha de MySQL en un Date con la hora local
export function parseFechaMySQL(fecha) {
    return new Date(String(fecha).replace(" ", "T"));
}

// Convierte una fecha de MySQL al formato "AAAA-MM-DDTHH:MM" de los formularios
export function toDateTimeLocal(fecha) {
    return fecha ? String(fecha).replace(" ", "T").slice(0, 16) : "";
}

// Saca el ID de un enlace de YouTube (normal, corto, shorts o embed); null si no es válido
export function youtubeId(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        const host = parsed.hostname.replace(/^(www\.|m\.)/, "");
        let id = null;
        if (host === "youtu.be") id = parsed.pathname.slice(1);
        else if (host === "youtube.com" || host === "youtube-nocookie.com") {
            if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
            else id = parsed.pathname.match(/^\/(shorts|embed)\/([^/?]+)/)?.[2] ?? null;
        }
        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    } catch {
        return null;
    }
}

// Validaciones compartidas (mismas reglas que el PHP)
export const CORREO_UANL = /^[a-z0-9._%+-]+@uanl\.edu\.mx$/i;
export const MATRICULA = /^\d{7}$/;
export const IMAGEN_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGEN_TIPOS = ["image/jpeg", "image/png", "image/webp"];

// Regresa un mensaje de error o "" si la imagen es válida
export function validarImagen(file) {
    if (!file) return "";
    if (!IMAGEN_TIPOS.includes(file.type)) return "La imagen debe ser JPG, PNG o WebP.";
    if (file.size > IMAGEN_MAX_BYTES) return "La imagen no puede pesar más de 2 MB.";
    return "";
}
