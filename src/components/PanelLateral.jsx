import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Panel lateral con formulario (crear y editar usan el mismo). Se desliza desde la derecha en
 * escritorio y desde abajo en celular. Va dentro de <AnimatePresence>.
 *
 * @param titulo     encabezado ("Nuevo artículo", "Editar evento")
 * @param subtitulo  línea opcional bajo el título
 * @param onEnviar   submit del formulario
 * @param accion     texto del botón principal ("Guardar", "Agregar")
 * @param guardando  deshabilita y cambia el texto a "Guardando…"
 * @param error      mensaje de validación (se muestra arriba de los botones)
 */
function PanelLateral({ titulo, subtitulo, onCerrar, onEnviar, accion = "Guardar", guardando = false, error = "", children }) {
    const panel = useRef(null);
    // Celular: entra desde abajo; escritorio: desde la derecha
    const [movil] = useState(() => window.matchMedia("(max-width: 639px)").matches);
    const fuera = movil ? { y: "100%" } : { x: "100%" };
    const cerrarRef = useRef(onCerrar);
    useEffect(() => { cerrarRef.current = onCerrar; });

    // Foco en el primer campo, Esc para cerrar, sin scroll del fondo, y foco de vuelta al cerrar
    useEffect(() => {
        const previo = document.activeElement;
        panel.current?.querySelector("input, textarea, button[aria-haspopup], select")?.focus();
        const onKey = (e) => { if (e.key === "Escape" && !e.defaultPrevented) cerrarRef.current(); };
        window.addEventListener("keydown", onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
            previo?.focus?.();
        };
    }, []);

    return (
        <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-end bg-scrim backdrop-blur-sm sm:items-stretch"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
        >
            <motion.form
                ref={panel}
                onSubmit={(e) => { e.preventDefault(); if (!guardando) onEnviar(e); }}
                noValidate
                role="dialog"
                aria-modal="true"
                aria-labelledby="panel-titulo"
                initial={fuera} animate={{ x: 0, y: 0 }} exit={fuera}
                transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
                className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-pop sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-2xl"
            >
                <header className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
                    <div className="min-w-0">
                        <h2 id="panel-titulo" className="text-lg font-bold text-ink">{titulo}</h2>
                        {subtitulo && <p className="mt-0.5 truncate text-sm text-ink-muted">{subtitulo}</p>}
                    </div>
                    <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-field hover:text-ink">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    {children}
                </div>

                <footer className="border-t border-line px-6 py-4">
                    {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onCerrar} className="action-button action-button-secondary">Cancelar</button>
                        <button type="submit" disabled={guardando} className="action-button">{guardando ? "Guardando…" : accion}</button>
                    </div>
                </footer>
            </motion.form>
        </motion.div>
    );
}

export default PanelLateral;
