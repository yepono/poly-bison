import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Menú "⋯" de una fila con las acciones secundarias (ocultar, desactivar, eliminar...). Se dibuja
// encima de todo para que las tablas con scroll no lo recorten.
function MenuAcciones({ etiqueta, acciones }) {
    const visibles = acciones.filter((a) => !a.oculto);
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(0);
    const [pos, setPos] = useState(null);
    const boton = useRef(null);
    const menu = useRef(null);

    const cerrar = (devolverFoco = true) => {
        setAbierto(false);
        setPos(null);
        if (devolverFoco) boton.current?.focus();
    };

    useLayoutEffect(() => {
        if (!abierto) return undefined;
        const ubicar = () => {
            const r = boton.current?.getBoundingClientRect();
            if (!r) return;
            const alto = visibles.length * 40 + 8;
            const arriba = window.innerHeight - r.bottom < alto + 12;
            setPos({ right: window.innerWidth - r.right, top: arriba ? undefined : r.bottom + 4, bottom: arriba ? window.innerHeight - r.top + 4 : undefined });
        };
        ubicar();
        window.addEventListener("resize", ubicar);
        window.addEventListener("scroll", ubicar, true);
        return () => {
            window.removeEventListener("resize", ubicar);
            window.removeEventListener("scroll", ubicar, true);
        };
    }, [abierto, visibles.length]);

    useEffect(() => {
        if (!abierto) return undefined;
        const fuera = (e) => { if (!boton.current?.contains(e.target) && !menu.current?.contains(e.target)) { setAbierto(false); setPos(null); } };
        document.addEventListener("pointerdown", fuera);
        return () => document.removeEventListener("pointerdown", fuera);
    }, [abierto]);

    useEffect(() => {
        if (abierto && pos) menu.current?.querySelectorAll('[role="menuitem"]')[activo]?.focus();
    }, [abierto, pos, activo]);

    const onTecla = (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActivo((i) => (i + 1) % visibles.length); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => (i - 1 + visibles.length) % visibles.length); }
        else if (e.key === "Home") { e.preventDefault(); setActivo(0); }
        else if (e.key === "End") { e.preventDefault(); setActivo(visibles.length - 1); }
        else if (e.key === "Escape") { e.preventDefault(); cerrar(); }
        else if (e.key === "Tab") cerrar(false);
    };

    if (!visibles.length) return null;

    return (
        <>
            <button
                ref={boton}
                type="button"
                onClick={() => { if (abierto) cerrar(); else { setActivo(0); setAbierto(true); } }}
                onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setActivo(0); setAbierto(true); } }}
                aria-haspopup="menu"
                aria-expanded={abierto}
                aria-label={etiqueta}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-field hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${abierto ? "bg-field text-ink" : ""}`}
            >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
                </svg>
            </button>
            {abierto && pos && createPortal(
                <div
                    ref={menu}
                    role="menu"
                    aria-label={etiqueta}
                    onKeyDown={onTecla}
                    style={{ position: "fixed", right: pos.right, top: pos.top, bottom: pos.bottom }}
                    className="z-[90] min-w-44 rounded-xl border border-line bg-surface p-1 shadow-pop"
                >
                    {visibles.map((accion, i) => (
                        <button
                            key={accion.texto}
                            type="button"
                            role="menuitem"
                            tabIndex={i === activo ? 0 : -1}
                            onPointerEnter={() => setActivo(i)}
                            onClick={() => { cerrar(); accion.onClick(); }}
                            className={`flex min-h-9 w-full items-center rounded-lg px-3 text-left text-sm font-medium focus:outline-none ${accion.peligro ? "text-danger focus:bg-danger/10" : "text-ink focus:bg-field"}`}
                        >
                            {accion.texto}
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </>
    );
}

export default MenuAcciones;
