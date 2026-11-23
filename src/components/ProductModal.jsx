import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import TechTag from "./TechTag";
import { TESORERIA, rutaMapaLugar } from "../utils/mapaDatos";

const POCAS_PIEZAS = 5;

// Foto del producto o, si no tiene, un marcador local
export function ImagenProducto({ producto, className = "" }) {
    if (producto.imagen) {
        return <img src={producto.imagen} alt={producto.titulo} loading="lazy" className={`object-cover ${className}`} />;
    }
    return (
        <div role="img" aria-label={`${producto.titulo} (sin foto)`} className={`flex items-center justify-center bg-linear-to-br from-brand/80 to-brand text-on-brand/80 ${className}`}>
            <svg className="h-1/4 w-1/4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
                <path strokeLinejoin="round" d="M5 8h14l-1 12H6L5 8Z" />
                <path strokeLinecap="round" d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
        </div>
    );
}

// Disponibilidad: agotado / últimas piezas / disponible
export function EstadoStock({ stock, compacto = false }) {
    if (stock === null || stock === undefined) return null;
    let texto, clases;
    if (stock <= 0) {
        texto = "Agotado";
        clases = "border-danger/50 bg-danger/15 text-danger";
    } else if (stock <= POCAS_PIEZAS) {
        texto = stock === 1 ? "Última pieza" : `Últimas ${stock}`;
        clases = "border-warning/50 bg-warning/15 text-warning";
    } else {
        if (compacto) return null; // en la tarjeta sólo se avisa cuando importa
        texto = `Disponible · ${stock} en existencia`;
        clases = "border-success/40 bg-success/10 text-success";
    }
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider backdrop-blur-sm ${clases}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {texto}
        </span>
    );
}

function ProductModal({ producto, onClose }) {
    const cerrar = useRef(null);

    // Esc para cerrar, foco inicial en el botón de cerrar y sin scroll del fondo
    useEffect(() => {
        cerrar.current?.focus();
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        const previo = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previo;
        };
    }, [onClose]);

    if (!producto) return null;
    const agotado = producto.stock === 0;
    const ubicacion = TESORERIA ? TESORERIA.detalle.replace("Edificio 1, 2 y 4", "Edificio 1") : "FCFM";

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-scrim backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="producto-titulo"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-2xl md:flex-row"
            >
                <button
                    ref={cerrar}
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="absolute right-3 top-3 z-20 rounded-full border border-line bg-surface/90 p-2 text-ink-muted backdrop-blur-sm transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-field md:aspect-auto md:w-1/2">
                    <ImagenProducto producto={producto} className="h-full w-full" />
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-2 pr-10">
                        <TechTag etiqueta={producto.categoria} />
                        <EstadoStock stock={producto.stock} />
                    </div>
                    <div>
                        <h2 id="producto-titulo" className="text-2xl font-bold text-ink">{producto.titulo}</h2>
                        <p className="mt-1 text-2xl font-black text-accent">{producto.precio}</p>
                    </div>
                    {producto.descripcionLarga && (
                        <p className="text-sm leading-relaxed text-ink-soft">{producto.descripcionLarga}</p>
                    )}

                    {/* Cómo comprar: el pago es presencial en Tesorería */}
                    <div className="mt-auto rounded-xl border border-line bg-field p-4">
                        <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent" aria-hidden="true">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <rect x="3" y="6" width="18" height="13" rx="2" />
                                    <path strokeLinecap="round" d="M3 10h18M7 15h3" />
                                </svg>
                            </span>
                            <div className="min-w-0">
                                <p className="font-bold text-ink">Se paga en Tesorería</p>
                                <p className="text-sm text-ink-muted">{ubicacion}</p>
                                <p className="mt-1 text-sm text-ink-soft">
                                    {agotado
                                        ? "Por ahora está agotado. Pregunta en Tesorería cuándo volverá a estar disponible."
                                        : "Acude a Tesorería para realizar el pago de este producto."}
                                </p>
                            </div>
                        </div>
                        <Link
                            to={rutaMapaLugar(TESORERIA)}
                            className="action-button mt-4 w-full"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
                                <circle cx="12" cy="9.5" r="2.5" />
                            </svg>
                            Ver Tesorería en el mapa
                        </Link>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default ProductModal;
