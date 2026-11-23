import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import NeonBackground from "./NeonBackground";
import ConstelacionBisonte from "./ConstelacionBisonte";

const ICONO_ESTRELLA = <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0"><path d="M12 1.5 13.9 10.1 22.5 12 13.9 13.9 12 22.5 10.1 13.9 1.5 12 10.1 10.1Z" fill="currentColor" /></svg>;

// Hoja inferior con la constelación (celulares y tabletas, donde no cabe junto al formulario)
function HojaBisonte({ onCerrar }) {
    const hoja = useRef(null);
    const cerrarRef = useRef(onCerrar);
    useEffect(() => { cerrarRef.current = onCerrar; });

    useEffect(() => {
        const previo = document.activeElement;
        hoja.current?.querySelector("button")?.focus();
        const onKey = (e) => { if (e.key === "Escape") cerrarRef.current(); };
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-scrim backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
        >
            <motion.div
                ref={hoja}
                role="dialog"
                aria-modal="true"
                aria-label="Conoce al bisonte"
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                className="custom-scrollbar relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-canvas px-5 pb-6 pt-4 shadow-pop sm:px-8"
            >
                <div className="sticky top-0 z-10 -mx-5 mb-2 flex justify-end bg-canvas/90 px-3 sm:-mx-8">
                    <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-field hover:text-ink">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <ConstelacionBisonte />
            </motion.div>
        </motion.div>
    );
}

// Estructura común de Login, Registro y Recuperar: fondo animado, constelación del bisonte a la
// izquierda (pantallas grandes) o detrás de un botón "Conoce al bisonte" (pantallas chicas), y la
// tarjeta del formulario.
function PantallaAuth({ children }) {
    const reducido = useReducedMotion();
    const [hojaAbierta, setHojaAbierta] = useState(false);

    return (
        <div className="relative min-h-dvh bg-canvas">
            <NeonBackground />
            <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 p-4 sm:p-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-16 lg:p-12">
                <div className="relative hidden lg:block">
                    {/* Velo suave para que la red de nodos no compita con el texto y la constelación */}
                    <div aria-hidden="true" className="pointer-events-none absolute -inset-16 -z-10" style={{ background: "radial-gradient(closest-side, var(--canvas) 55%, transparent)" }} />
                    <ConstelacionBisonte />
                </div>
                {/* La tarjeta aparece con un desvanecido corto */}
                <motion.div
                    initial={reducido ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex flex-col items-center gap-4"
                >
                    {children}
                    <button
                        type="button"
                        onClick={() => setHojaAbierta(true)}
                        aria-haspopup="dialog"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent/40 bg-surface/85 px-5 text-sm font-semibold text-accent shadow-card transition-colors hover:bg-accent/10 lg:hidden"
                    >
                        {ICONO_ESTRELLA}
                        Conoce al bisonte
                    </button>
                </motion.div>
            </div>

            <AnimatePresence>
                {hojaAbierta && <HojaBisonte onCerrar={() => setHojaAbierta(false)} />}
            </AnimatePresence>
        </div>
    );
}

export default PantallaAuth;
