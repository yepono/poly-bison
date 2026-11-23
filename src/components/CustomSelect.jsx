import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

// Lista desplegable de la app, que se usa en lugar de los <select> del navegador. Se dibuja
// encima de todo para que ninguna tabla o panel la recorte y se abre hacia arriba si no cabe
// abajo. Se puede usar por completo con el teclado (flechas, Enter, Esc y escribir letras para
// saltar a una opción) y con lectores de pantalla. El tamaño "compacto" es para tablas y barras.
function CustomSelect({
    label, ariaLabel, options, value, onChange, placeholder = "Selecciona una opción",
    id, disabled = false, tamano = "normal", className = "",
}) {
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(-1);
    const [posicion, setPosicion] = useState(null);
    const boton = useRef(null);
    const lista = useRef(null);
    const busqueda = useRef({ texto: "", hasta: 0 });
    const idAuto = useId();
    const idBoton = id || `select-${idAuto}`;
    const idEtiqueta = `${idBoton}-etiqueta`;
    const idLista = `${idBoton}-lista`;

    const indiceValor = options.findIndex((opt) => String(opt.value) === String(value));
    const seleccionada = options[indiceValor];

    const abrir = (indice = indiceValor) => {
        if (disabled) return;
        setActivo(indice >= 0 ? indice : 0);
        setAbierto(true);
    };
    const cerrar = useCallback((devolverFoco = true) => {
        setAbierto(false);
        setPosicion(null);
        if (devolverFoco) boton.current?.focus();
    }, []);
    const elegir = (indice) => {
        const opcion = options[indice];
        if (!opcion) return;
        if (String(opcion.value) !== String(value)) onChange(opcion.value);
        cerrar();
    };

    // Posición de la lista junto al botón (se recalcula con scroll y cambios de tamaño)
    useLayoutEffect(() => {
        if (!abierto) return undefined;
        const ubicar = () => {
            const r = boton.current?.getBoundingClientRect();
            if (!r) return;
            const alto = Math.min(256, options.length * 40 + 12);
            const abajo = window.innerHeight - r.bottom - 12;
            const encima = r.top - 12;
            // Hacia abajo salvo que no quepa ni una lista corta y arriba haya más espacio
            const arriba = abajo < Math.min(alto, 180) && encima > abajo;
            const maxAlto = Math.max(120, Math.min(alto, arriba ? encima : abajo));
            setPosicion({ left: r.left, width: r.width, top: arriba ? undefined : r.bottom + 6, bottom: arriba ? window.innerHeight - r.top + 6 : undefined, arriba, maxAlto });
        };
        ubicar();
        window.addEventListener("resize", ubicar);
        window.addEventListener("scroll", ubicar, true);
        return () => {
            window.removeEventListener("resize", ubicar);
            window.removeEventListener("scroll", ubicar, true);
        };
    }, [abierto, options.length]);

    // Clic fuera cierra (la lista vive en un portal, por eso se revisan los dos nodos)
    useEffect(() => {
        if (!abierto) return undefined;
        const fuera = (e) => {
            if (!boton.current?.contains(e.target) && !lista.current?.contains(e.target)) cerrar(false);
        };
        document.addEventListener("pointerdown", fuera);
        return () => document.removeEventListener("pointerdown", fuera);
    }, [abierto, cerrar]);

    // El foco pasa a la lista al abrir; la opción activa se mantiene visible
    const ubicada = posicion !== null;
    useEffect(() => { if (abierto && ubicada) lista.current?.focus({ preventScroll: true }); }, [abierto, ubicada]);
    useEffect(() => {
        if (abierto) lista.current?.querySelector(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" });
    }, [abierto, activo]);

    // Escribir letras salta a la primera opción que empieza con ese texto
    const saltarATexto = (tecla) => {
        const ahora = Date.now();
        const b = busqueda.current;
        b.texto = (ahora < b.hasta ? b.texto : "") + tecla.toLowerCase();
        b.hasta = ahora + 600;
        const i = options.findIndex((opt) => String(opt.label).toLowerCase().startsWith(b.texto));
        if (i >= 0) setActivo(i);
        return i;
    };

    const onTeclaBoton = (e) => {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            abrir(e.key === "ArrowUp" && indiceValor < 0 ? options.length - 1 : indiceValor);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const i = saltarATexto(e.key);
            if (i >= 0) abrir(i);
        }
    };

    const onTeclaLista = (e) => {
        const ultimo = options.length - 1;
        if (e.key === "ArrowDown") { e.preventDefault(); setActivo((i) => Math.min(i + 1, ultimo)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)); }
        else if (e.key === "Home") { e.preventDefault(); setActivo(0); }
        else if (e.key === "End") { e.preventDefault(); setActivo(ultimo); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(activo); }
        else if (e.key === "Escape") { e.preventDefault(); cerrar(); }
        else if (e.key === "Tab") { cerrar(false); }
        else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) saltarATexto(e.key);
    };

    const compacto = tamano === "compacto";

    return (
        <div className={`form-label relative ${className}`}>
            {label && <span id={idEtiqueta}>{label}</span>}

            <button
                ref={boton}
                id={idBoton}
                type="button"
                disabled={disabled}
                onClick={() => (abierto ? cerrar() : abrir())}
                onKeyDown={onTeclaBoton}
                aria-haspopup="listbox"
                aria-expanded={abierto}
                aria-controls={abierto ? idLista : undefined}
                aria-labelledby={label ? `${idEtiqueta} ${idBoton}` : undefined}
                aria-label={label ? undefined : ariaLabel}
                className={`form-input flex items-center justify-between gap-2 text-left font-normal disabled:cursor-not-allowed disabled:opacity-50 ${compacto ? "min-h-9 py-1.5 text-sm" : ""} ${abierto ? "ring-2 ring-accent" : ""}`}
            >
                <span className={`min-w-0 truncate ${seleccionada ? "text-ink" : "text-ink-muted"}`}>
                    {seleccionada ? seleccionada.label : placeholder}
                </span>
                <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${abierto ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {createPortal(
                <AnimatePresence>
                    {abierto && posicion && (
                        <motion.ul
                            ref={lista}
                            id={idLista}
                            role="listbox"
                            tabIndex={-1}
                            aria-labelledby={label ? idEtiqueta : undefined}
                            aria-label={label ? undefined : ariaLabel}
                            aria-activedescendant={activo >= 0 ? `${idLista}-${activo}` : undefined}
                            onKeyDown={onTeclaLista}
                            initial={{ opacity: 0, y: posicion.arriba ? 6 : -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: posicion.arriba ? 6 : -6 }}
                            transition={{ duration: 0.12 }}
                            style={{ position: "fixed", left: posicion.left, top: posicion.top, bottom: posicion.bottom, minWidth: posicion.width, maxHeight: posicion.maxAlto }}
                            className="custom-scrollbar z-[90] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-pop focus:outline-none"
                        >
                            {options.map((option, i) => {
                                const elegida = i === indiceValor;
                                return (
                                    <li
                                        key={option.value}
                                        id={`${idLista}-${i}`}
                                        data-indice={i}
                                        role="option"
                                        aria-selected={elegida}
                                        onPointerEnter={() => setActivo(i)}
                                        onClick={() => elegir(i)}
                                        className={`flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${i === activo ? "bg-accent/10 text-ink" : "text-ink-soft"} ${elegida ? "font-semibold text-accent" : ""}`}
                                    >
                                        <span>{option.label}</span>
                                        {elegida && (
                                            <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </li>
                                );
                            })}
                        </motion.ul>
                    )}
                </AnimatePresence>,
                document.body,
            )}
        </div>
    );
}

export default CustomSelect;
