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

/**
 * Llama a <seccion>.php?accion=<accion>.
 * - body FormData -> multipart (archivos); cualquier otro objeto -> JSON.
 * - Lanza ApiError con el mensaje del servidor si la respuesta no es exitosa.
 */
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

// Usuario de la API -> forma que ya usan los componentes
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

// Publicación de la API (vw_feed_publicaciones) -> forma que usan PostCard y Feed
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

// Comentario de la API (vw_comentarios_activos) -> forma que usa Publicacion
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

// Producto de la API (vw_catalogo_productos) -> forma que usan Bisontstore y ProductModal
export function mapProducto(p) {
    return {
        id: p.id_producto,
        titulo: p.nombre,
        precioValor: p.precio,
        precio: formatPrecio(p.precio),
        stock: p.stock,
        idCategoria: p.id_categoria,
        categoria: p.categoria,
        imagen: p.tiene_foto
            ? fileUrl("productos", "foto", p.id_producto)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nombre)}&size=512&background=003366&color=fff`,
        tieneFoto: p.tiene_foto,
        descripcionCorta: p.descripcion || "",
        descripcionLarga: p.descripcion || "",
    };
}

// Fecha local de hoy en formato AAAA-MM-DD
export function hoyISO() {
    return new Date().toLocaleDateString("en-CA");
}

// "AAAA-MM-DD HH:MM:SS" (MySQL) -> Date local
export function parseFechaMySQL(fecha) {
    return new Date(String(fecha).replace(" ", "T"));
}

// "AAAA-MM-DD HH:MM:SS" -> "AAAA-MM-DDTHH:MM" (input datetime-local)
export function toDateTimeLocal(fecha) {
    return fecha ? String(fecha).replace(" ", "T").slice(0, 16) : "";
}

// ID de 11 caracteres de un enlace de YouTube (watch, youtu.be, shorts, embed) o null
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
