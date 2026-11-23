// Estados estándar de cualquier lista o página:
//   cargando  -> esqueletos con la forma del contenido (nunca "Cargando..." en texto)
//   error     -> <EstadoError> con mensaje y "Reintentar"
//   vacío     -> <EstadoVacio> con ícono, una línea y una acción si existe
//   guardando -> el propio botón dice "Guardando…" y se deshabilita; el resultado va en un aviso

const ICONOS = {
    vacio: "M20 13V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6m16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4m16 0h-4l-1.5 2h-5L8 13H4",
    buscar: "M21 21l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
    error: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
    calendario: "M8 3v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
    publicacion: "M7 8h10M7 12h10M7 16h6M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z",
    comentario: "M8 10h8M8 14h5m-9 6 3-3h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14Z",
    tienda: "M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2",
    reloj: "M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
};

function Icono({ nombre, className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ICONOS[nombre] ?? ICONOS.vacio} />
        </svg>
    );
}

// Bloque gris animado; el tamaño lo da className (p. ej. "h-4 w-1/2")
export function Esqueleto({ className = "h-4 w-full", redondo = false }) {
    return <span aria-hidden="true" className={`block animate-pulse bg-line motion-reduce:animate-none ${redondo ? "rounded-full" : "rounded-md"} ${className}`} />;
}

// Filas falsas de una tabla .admin-table (van dentro de <tbody>)
export function EsqueletoFilas({ filas = 5, columnas = 4 }) {
    return Array.from({ length: filas }, (_, f) => (
        <tr key={f} aria-hidden="true">
            {Array.from({ length: columnas }, (_, c) => (
                <td key={c}>
                    <Esqueleto className={`h-3.5 ${c === 0 ? "w-3/4" : c === columnas - 1 ? "w-12" : "w-1/2"}`} />
                    {c === 0 && <Esqueleto className="mt-2 h-2.5 w-1/2" />}
                </td>
            ))}
        </tr>
    ));
}

// Renglones de una lista (reservaciones, comentarios...)
export function EsqueletoLista({ filas = 3, avatar = false }) {
    return (
        <div className="flex flex-col gap-3" aria-hidden="true">
            {Array.from({ length: filas }, (_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-field/40 p-4">
                    {avatar && <Esqueleto redondo className="h-9 w-9 shrink-0" />}
                    <div className="flex-1 space-y-2">
                        <Esqueleto className={`h-3.5 ${i % 2 ? "w-2/5" : "w-3/5"}`} />
                        <Esqueleto className="h-2.5 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Contenedor accesible para cualquier esqueleto: anuncia "Cargando ..." a lectores de pantalla
export function Cargando({ etiqueta = "Cargando", children }) {
    return (
        <div role="status" aria-busy="true" aria-live="polite">
            <span className="sr-only">{etiqueta}…</span>
            {children}
        </div>
    );
}

export function EstadoError({ mensaje = "No se pudo cargar la información.", onReintentar, compacto = false }) {
    return (
        <div role="alert" className={`flex flex-col items-center text-center ${compacto ? "gap-2 py-6" : "gap-3 py-10"}`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger">
                <Icono nombre="error" className="h-6 w-6" />
            </span>
            <p className="max-w-sm text-sm text-ink-soft">{mensaje}</p>
            {onReintentar && (
                <button type="button" onClick={onReintentar} className="action-button action-button-secondary action-button-sm">
                    Reintentar
                </button>
            )}
        </div>
    );
}

/**
 * @param icono   vacio | buscar | calendario | publicacion | comentario | tienda | reloj
 * @param accion  { texto, onClick } o un elemento (p. ej. un <Link>)
 */
export function EstadoVacio({ icono = "vacio", titulo, detalle, accion, compacto = false }) {
    return (
        <div className={`flex flex-col items-center text-center ${compacto ? "gap-2 py-6" : "gap-3 py-10"}`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-field text-ink-muted">
                <Icono nombre={icono} className="h-6 w-6" />
            </span>
            <div>
                <p className="font-semibold text-ink">{titulo}</p>
                {detalle && <p className="mt-0.5 max-w-sm text-sm text-ink-muted">{detalle}</p>}
            </div>
            {accion && (accion.texto
                ? <button type="button" onClick={accion.onClick} className="action-button action-button-sm mt-1">{accion.texto}</button>
                : accion)}
        </div>
    );
}
