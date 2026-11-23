import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

// Selector de fecha con un calendario pequeño en español. Recibe y entrega fechas "AAAA-MM-DD"

const DIAS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const deISO = (iso) => {
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d);
};
const sumarDias = (iso, n) => {
    const d = deISO(iso);
    d.setDate(d.getDate() + n);
    return aISO(d);
};
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// "lunes, 24 de noviembre de 2026"
// eslint-disable-next-line react-refresh/only-export-components
export function fechaLarga(iso) {
    if (!iso) return "";
    return deISO(iso).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function SelectorFecha({ id, value, onChange, min, placeholder = "Elige una fecha" }) {
    const [abierto, setAbierto] = useState(false);
    const hoy = aISO(new Date());
    const inicial = value || (min && min > hoy ? min : hoy);
    const [foco, setFoco] = useState(inicial); // día con el foco del teclado
    const contenedor = useRef(null);
    const rejilla = useRef(null);
    const boton = useRef(null);
    const popup = useRef(null);
    const idEtiqueta = useId();
    // Posición fija del calendario: se dibuja en un portal para que paneles con scroll no lo recorten
    const [pos, setPos] = useState(null);

    const fecha = deISO(foco);
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth();
    const nombreMes = capitalizar(new Date(anio, mes, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" }));
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    const inicio = new Date(anio, mes, 1).getDay();
    const deshabilitado = (iso) => Boolean(min && iso < min);
    const mesAnteriorBloqueado = Boolean(min && aISO(new Date(anio, mes, 0)) < min);

    const abrir = () => { setFoco(value || inicial); setAbierto(true); };
    const cerrar = (devolverFoco = true) => { setAbierto(false); setPos(null); if (devolverFoco) boton.current?.focus(); };
    const elegir = (iso) => {
        if (deshabilitado(iso)) return;
        onChange(iso);
        cerrar();
    };
    const cambiarMes = (delta) => {
        const d = new Date(anio, mes + delta, 1);
        const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        let iso = aISO(new Date(d.getFullYear(), d.getMonth(), Math.min(fecha.getDate(), ultimo)));
        if (deshabilitado(iso)) iso = min;
        setFoco(iso);
    };

    useLayoutEffect(() => {
        if (!abierto) return undefined;
        const ubicar = () => {
            const r = boton.current?.getBoundingClientRect();
            if (!r) return;
            const ALTO = 350;
            const arriba = window.innerHeight - r.bottom < ALTO + 8 && r.top > window.innerHeight - r.bottom;
            const left = Math.max(8, Math.min(r.left, window.innerWidth - 288 - 8));
            setPos({ left, top: arriba ? undefined : r.bottom + 8, bottom: arriba ? window.innerHeight - r.top + 8 : undefined });
        };
        ubicar();
        window.addEventListener("resize", ubicar);
        window.addEventListener("scroll", ubicar, true);
        return () => {
            window.removeEventListener("resize", ubicar);
            window.removeEventListener("scroll", ubicar, true);
        };
    }, [abierto]);

    // Clic fuera cierra
    useEffect(() => {
        if (!abierto) return undefined;
        const fuera = (e) => { if (!contenedor.current?.contains(e.target) && !popup.current?.contains(e.target)) { setAbierto(false); setPos(null); } };
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, [abierto]);

    // El foco sigue al día activo
    useEffect(() => {
        if (abierto && pos) rejilla.current?.querySelector(`[data-fecha="${foco}"]`)?.focus();
    }, [abierto, pos, foco]);

    const onTecla = (e) => {
        const pasos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (e.key in pasos) {
            e.preventDefault();
            const nuevo = sumarDias(foco, pasos[e.key]);
            if (!deshabilitado(nuevo)) setFoco(nuevo);
        } else if (e.key === "PageUp" || e.key === "PageDown") {
            e.preventDefault();
            cambiarMes(e.key === "PageUp" ? -1 : 1);
        }
    };

    const celdas = [
        ...Array.from({ length: inicio }, (_, i) => ({ vacia: true, key: `v${i}` })),
        ...Array.from({ length: diasMes }, (_, i) => {
            const iso = aISO(new Date(anio, mes, i + 1));
            return { iso, dia: i + 1, key: iso };
        }),
    ];

    return (
        <div ref={contenedor} className="relative">
            <button
                ref={boton}
                id={id}
                type="button"
                onClick={() => (abierto ? cerrar() : abrir())}
                onKeyDown={(e) => { if (e.key === "Escape" && abierto) { e.preventDefault(); cerrar(); } }}
                aria-haspopup="dialog"
                aria-expanded={abierto}
                className="form-input flex items-center gap-3 text-left"
            >
                <svg className="h-5 w-5 shrink-0 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                <span className={`min-w-0 flex-1 truncate ${value ? "text-ink" : "text-ink-muted"}`}>
                    {value ? <>
                        <span className="sm:hidden">{capitalizar(deISO(value).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(/\./g, ""))}</span>
                        <span className="hidden sm:inline">{capitalizar(fechaLarga(value))}</span>
                    </> : placeholder}
                </span>
                <svg className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${abierto ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {createPortal(<AnimatePresence>
                {abierto && pos && (
                    <motion.div
                        ref={popup}
                        style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom }}
                        role="dialog"
                        aria-modal="false"
                        aria-labelledby={idEtiqueta}
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } }}
                        className="z-[90] w-72 rounded-xl border border-line bg-surface p-3 shadow-pop"
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <button type="button" onClick={() => cambiarMes(-1)} disabled={mesAnteriorBloqueado} aria-label="Mes anterior"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-field hover:text-ink disabled:cursor-not-allowed disabled:opacity-30">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <p id={idEtiqueta} className="text-sm font-bold text-ink" aria-live="polite">{nombreMes}</p>
                            <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-field hover:text-ink">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-7 text-center text-2xs font-semibold uppercase text-ink-muted" aria-hidden="true">
                            {DIAS.map((d) => <span key={d} className="py-1">{d}</span>)}
                        </div>
                        <div ref={rejilla} role="grid" aria-labelledby={idEtiqueta} className="grid grid-cols-7 gap-0.5" onKeyDown={onTecla}>
                            {celdas.map((c) => {
                                if (c.vacia) return <span key={c.key} aria-hidden="true" />;
                                const bloqueado = deshabilitado(c.iso);
                                const elegido = c.iso === value;
                                const esHoy = c.iso === hoy;
                                return (
                                    <button
                                        key={c.key}
                                        type="button"
                                        role="gridcell"
                                        data-fecha={c.iso}
                                        tabIndex={c.iso === foco ? 0 : -1}
                                        disabled={bloqueado}
                                        aria-selected={elegido}
                                        aria-label={`${fechaLarga(c.iso)}${esHoy ? ", hoy" : ""}`}
                                        onClick={() => elegir(c.iso)}
                                        className={`flex h-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-accent ${elegido
                                            ? "bg-brand font-bold text-on-brand"
                                            : bloqueado
                                                ? "cursor-not-allowed text-ink-muted/40"
                                                : `text-ink hover:bg-field ${esHoy ? "font-bold text-accent ring-1 ring-inset ring-accent/50" : ""}`
                                            }`}
                                    >
                                        {c.dia}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-2 flex justify-between border-t border-line pt-2">
                            <button type="button" onClick={() => elegir(hoy)} disabled={deshabilitado(hoy)}
                                className="rounded-md px-2 py-1 text-sm font-semibold text-accent hover:bg-field disabled:opacity-40">
                                Hoy
                            </button>
                            <button type="button" onClick={() => elegir(sumarDias(hoy, 1))}
                                className="rounded-md px-2 py-1 text-sm font-semibold text-accent hover:bg-field">
                                Mañana
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>, document.body)}
        </div>
    );
}

export default SelectorFecha;
