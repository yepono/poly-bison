import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FUENTE_MAPA, GRUPOS_NAVEGACION, LUGARES, LUGARES_POR_ID, TIPOS_LEYENDA, VISTAS_POR_ID,
    buscarLugares, colorPuntoLugar, estilosTipoLugar, lugaresDeVista,
} from "../utils/mapaDatos";

// three.js pesa: se carga sólo al entrar a esta página
const Mapa3D = lazy(() => import("../components/mapa/Mapa3D"));

const ETIQUETA_CORTA = { "Nivel 0": "PB", "Nivel 1": "Piso 1", "Nivel 2": "Piso 2" };
const MAX_RESULTADOS = 8;

// Clases comunes de los controles flotantes sobre el mapa
const FLOTANTE = "rounded-xl border border-line bg-surface/95 shadow-pop backdrop-blur-md";
const BOTON_ICONO = `${FLOTANTE} flex h-11 w-11 shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent`;

function Icono({ d, className = "h-5 w-5" }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    );
}
const ICONOS = {
    buscar: "M21 21l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
    lista: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
    capas: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
    cerrar: "M6 18 18 6M6 6l12 12",
    flecha: "m6 9 6 6 6-6",
    info: "M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
};

function CargandoMapa() {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-muted">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
            <span className="text-2xs uppercase tracking-widest">Construyendo mapa 3D…</span>
        </div>
    );
}

// Cierra un popover al hacer clic fuera o presionar Esc
function useCerrarFuera(abierto, ref, cerrar) {
    useEffect(() => {
        if (!abierto) return undefined;
        const fuera = (e) => { if (!ref.current?.contains(e.target)) cerrar(); };
        const esc = (e) => { if (e.key === "Escape") cerrar(); };
        document.addEventListener("pointerdown", fuera);
        document.addEventListener("keydown", esc);
        return () => {
            document.removeEventListener("pointerdown", fuera);
            document.removeEventListener("keydown", esc);
        };
    }, [abierto, ref, cerrar]);
}

function EtiquetaTipo({ tipo }) {
    return (
        <span className={`rounded border px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider ${estilosTipoLugar(tipo)}`}>
            {tipo}
        </span>
    );
}

// Selector de edificio y piso
function SelectorVista({ vista, vistaId, onElegir }) {
    const [abierto, setAbierto] = useState(false);
    const ref = useRef(null);
    useCerrarFuera(abierto, ref, () => setAbierto(false));

    return (
        <div ref={ref} className="relative min-w-0">
            <button
                type="button"
                onClick={() => setAbierto((a) => !a)}
                aria-haspopup="dialog"
                aria-expanded={abierto}
                className={`${FLOTANTE} flex h-11 min-w-0 max-w-full items-center gap-2.5 pl-3 pr-2.5 text-left transition-colors hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-accent`}
            >
                <Icono d={ICONOS.capas} className="h-5 w-5 shrink-0 text-accent" />
                <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-bold text-ink">{vista.edificio ? vista.subtitulo : vista.titulo}</span>
                    <span className="block truncate text-2xs text-ink-muted">{vista.edificio ? vista.titulo : "Campus FCFM"}</span>
                </span>
                <Icono d={ICONOS.flecha} className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${abierto ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {abierto && (
                    <motion.div
                        role="dialog"
                        aria-label="Elegir edificio y piso"
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.12 }}
                        className={`${FLOTANTE} absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] p-3`}
                    >
                        {GRUPOS_NAVEGACION.map((grupo) => (
                            <div key={grupo.titulo} className="mb-3 last:mb-0">
                                <p className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-widest text-ink-muted">{grupo.titulo}</p>
                                <div className="flex gap-1 rounded-lg border border-line bg-field p-1">
                                    {grupo.vistas.map((v) => {
                                        const activo = vistaId === v.id;
                                        return (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => { onElegir(v.id); setAbierto(false); }}
                                                aria-pressed={activo}
                                                title={v.edificio ? `${grupo.titulo} · ${v.titulo}` : v.titulo}
                                                className={`min-h-9 flex-1 rounded-md px-2 text-sm font-semibold transition-colors ${activo ? "bg-accent/15 text-accent" : "text-ink-soft hover:bg-surface hover:text-ink"}`}
                                            >
                                                {v.edificio ? (ETIQUETA_CORTA[v.nivel] ?? v.titulo) : v.titulo}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Buscador (ícono que se despliega)
function Buscador({ onElegir }) {
    const [abierto, setAbierto] = useState(false);
    const [texto, setTexto] = useState("");
    const [activo, setActivo] = useState(0);
    const ref = useRef(null);
    const campo = useRef(null);
    const cerrar = () => { setAbierto(false); setTexto(""); };
    useCerrarFuera(abierto, ref, cerrar);

    const resultados = useMemo(() => buscarLugares(texto), [texto]);
    const visibles = resultados.slice(0, MAX_RESULTADOS);

    // "/" abre el buscador desde cualquier parte de la página
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "/" && !e.target.closest?.("input, textarea, [contenteditable]")) {
                e.preventDefault();
                setAbierto(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => { if (abierto) campo.current?.focus(); }, [abierto]);

    const elegir = (lugar) => { onElegir(lugar); cerrar(); };
    const onTecla = (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActivo((i) => Math.min(i + 1, visibles.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)); }
        else if (e.key === "Enter" && visibles[activo]) { e.preventDefault(); elegir(visibles[activo]); }
    };

    if (!abierto) {
        return (
            <button type="button" onClick={() => setAbierto(true)} aria-label="Buscar lugar" title="Buscar (tecla /)" className={BOTON_ICONO}>
                <Icono d={ICONOS.buscar} />
            </button>
        );
    }

    return (
        <div ref={ref} className="relative w-full sm:w-80">
            <motion.div
                initial={{ opacity: 0, scaleX: 0.85 }} animate={{ opacity: 1, scaleX: 1 }}
                style={{ transformOrigin: "right" }}
                className={`${FLOTANTE} flex h-11 items-center gap-2 pl-3 pr-1`}
            >
                <Icono d={ICONOS.buscar} className="h-5 w-5 shrink-0 text-ink-muted" />
                <input
                    ref={campo}
                    type="search"
                    role="combobox"
                    aria-label="Buscar aula, laboratorio u oficina"
                    aria-expanded={Boolean(texto.trim())}
                    aria-controls="resultados-mapa"
                    aria-activedescendant={visibles[activo] ? `res-${visibles[activo].id}` : undefined}
                    placeholder="Buscar aula, lab, oficina…"
                    value={texto}
                    maxLength={80}
                    onChange={(e) => { setTexto(e.target.value); setActivo(0); }}
                    onKeyDown={onTecla}
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                <button type="button" onClick={cerrar} aria-label="Cerrar búsqueda" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-field hover:text-ink">
                    <Icono d={ICONOS.cerrar} className="h-4 w-4" />
                </button>
            </motion.div>

            {texto.trim() && (
                <ul id="resultados-mapa" role="listbox" aria-label="Resultados" className={`${FLOTANTE} custom-scrollbar absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto p-1.5`}>
                    {visibles.map((lugar, i) => (
                        <li
                            key={lugar.id}
                            id={`res-${lugar.id}`}
                            role="option"
                            aria-selected={i === activo}
                            onPointerEnter={() => setActivo(i)}
                            onClick={() => elegir(lugar)}
                            className={`cursor-pointer rounded-lg px-3 py-2 ${i === activo ? "bg-accent/10" : ""}`}
                        >
                            <p className="truncate text-sm font-semibold text-ink">{lugar.nombre}</p>
                            <p className="mt-0.5 flex items-center gap-2 text-2xs text-ink-muted">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${colorPuntoLugar(lugar.tipo)}`} />
                                <span className="truncate">{lugar.tipo} · {lugar.detalle}</span>
                            </p>
                        </li>
                    ))}
                    {!visibles.length && <li className="px-3 py-4 text-center text-sm text-ink-muted">Sin resultados para “{texto.trim()}”.</li>}
                    {resultados.length > MAX_RESULTADOS && (
                        <li className="px-3 pb-1 pt-2 text-2xs text-ink-muted">Mostrando {MAX_RESULTADOS} de {resultados.length}. Escribe más para afinar.</li>
                    )}
                </ul>
            )}
        </div>
    );
}

// Lista de lugares (panel que se oculta)
function PanelLugares({ vista, vistaId, seleccionId, onElegir, onCerrar }) {
    const [alcance, setAlcance] = useState("vista"); // muestra solo la vista actual o todos los lugares
    const [tipo, setTipo] = useState("Todos");

    const base = useMemo(
        () => (alcance === "vista" ? lugaresDeVista(vistaId) : [...LUGARES].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true }))),
        [alcance, vistaId],
    );
    const tipos = useMemo(() => ["Todos", ...new Set(base.map((l) => l.tipo))], [base]);
    const tipoActivo = tipos.includes(tipo) ? tipo : "Todos";
    const lista = tipoActivo === "Todos" ? base : base.filter((l) => l.tipo === tipoActivo);

    // Agrupados por tipo (Aulas, Laboratorio, ...) en el orden de la leyenda
    const grupos = useMemo(() => {
        const porTipo = new Map();
        lista.forEach((l) => porTipo.set(l.tipo, [...(porTipo.get(l.tipo) ?? []), l]));
        const orden = (t) => { const i = TIPOS_LEYENDA.indexOf(t); return i === -1 ? 99 : i; };
        return [...porTipo.entries()].sort(([a], [b]) => orden(a) - orden(b) || a.localeCompare(b, "es"));
    }, [lista]);

    return (
        <motion.aside
            aria-label="Lista de lugares"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className={`${FLOTANTE} absolute inset-x-3 bottom-3 top-auto z-20 flex max-h-[55%] flex-col overflow-hidden sm:inset-x-auto sm:bottom-3 sm:left-3 sm:top-[4.25rem] sm:max-h-none sm:w-80`}
        >
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <h2 className="text-sm font-bold text-ink">Lugares</h2>
                <button type="button" onClick={onCerrar} aria-label="Ocultar lista" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-field hover:text-ink">
                    <Icono d={ICONOS.cerrar} className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-2 border-b border-line px-4 py-3">
                <div className="flex rounded-lg border border-line bg-field p-0.5 text-xs font-semibold" role="group" aria-label="Alcance">
                    {[["vista", vista.edificio ? `${ETIQUETA_CORTA[vista.nivel] ?? vista.titulo} · ${vista.subtitulo.replace("Edificio ", "Ed. ")}` : "Campus"], ["todo", "Toda la facultad"]].map(([valor, texto]) => (
                        <button key={valor} type="button" onClick={() => setAlcance(valor)} aria-pressed={alcance === valor}
                            className={`min-h-8 flex-1 truncate rounded-md px-2 transition-colors ${alcance === valor ? "bg-accent/15 text-accent" : "text-ink-soft hover:text-ink"}`}>
                            {texto}
                        </button>
                    ))}
                </div>
                {tipos.length > 2 && (
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
                        {tipos.map((t) => (
                            <button key={t} type="button" onClick={() => setTipo(t)} aria-pressed={tipoActivo === t}
                                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-semibold transition-colors ${tipoActivo === t ? "border-accent bg-accent/15 text-accent" : "border-line text-ink-soft hover:text-ink"}`}>
                                {t !== "Todos" && <span className={`h-1.5 w-1.5 rounded-full ${colorPuntoLugar(t)}`} aria-hidden="true" />}
                                {t}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {grupos.map(([nombreTipo, lugares]) => (
                    <section key={nombreTipo} className="mb-2">
                        <h3 className="sticky top-0 z-10 flex items-center gap-2 bg-surface/95 px-2 py-1.5 text-2xs font-semibold uppercase tracking-widest text-ink-muted backdrop-blur">
                            <span className={`h-2 w-2 rounded-full ${colorPuntoLugar(nombreTipo)}`} aria-hidden="true" />
                            {nombreTipo} <span className="font-normal">({lugares.length})</span>
                        </h3>
                        <ul>
                            {lugares.map((lugar) => (
                                <li key={lugar.id}>
                                    <button
                                        type="button"
                                        onClick={() => onElegir(lugar)}
                                        aria-current={seleccionId === lugar.id || undefined}
                                        className={`w-full rounded-lg px-2 py-2 text-left transition-colors ${seleccionId === lugar.id ? "bg-accent/10 text-accent" : "text-ink hover:bg-field"}`}
                                    >
                                        <span className="block truncate text-sm font-semibold">{lugar.nombre}</span>
                                        {alcance === "todo" && <span className="block truncate text-2xs text-ink-muted">{lugar.detalle}</span>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
                {!grupos.length && <p className="px-2 py-6 text-center text-sm text-ink-muted">No hay lugares con nombre aquí.</p>}
            </div>
        </motion.aside>
    );
}

// Página
function Mapa() {
    // Si la dirección trae ?lugar=, el mapa abre enfocado en ese lugar (por ejemplo, Tesorería desde la tienda)
    const [searchParams] = useSearchParams();
    const [lugarInicial] = useState(() => LUGARES_POR_ID[searchParams.get("lugar")] ?? null);

    const [vistaId, setVistaId] = useState(lugarInicial?.vista ?? "general");
    const [seleccionId, setSeleccionId] = useState(lugarInicial?.id ?? null);
    // Cada objeto nuevo hace volar la cámara. Solo lo cambian la navegación, la lista y el buscador.
    const [enfoque, setEnfoque] = useState(lugarInicial ? { lugarId: lugarInicial.id } : null);
    const [listaAbierta, setListaAbierta] = useState(false);
    const [ayuda, setAyuda] = useState(false);

    const vista = VISTAS_POR_ID[vistaId];
    const seleccion = seleccionId ? LUGARES_POR_ID[seleccionId] : null;

    const irAVista = (id) => {
        setVistaId(id);
        setSeleccionId(null);
        setEnfoque({});
    };

    const irALugar = (lugar) => {
        setVistaId(lugar.vista);
        setSeleccionId(lugar.id);
        setEnfoque({ lugarId: lugar.id });
        // En celular la lista tapa el mapa: se oculta al elegir
        if (window.matchMedia("(max-width: 639px)").matches) setListaAbierta(false);
    };

    return (
        // Ocupa todo el alto disponible (resta el encabezado móvil y el relleno del layout)
        <div className="relative h-[calc(100dvh-5.5rem)] min-h-[26rem] overflow-hidden rounded-2xl border border-line bg-canvas/50 shadow-lg sm:h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-4rem)]">
            <h1 className="sr-only">Mapa de la facultad</h1>

            {/* isolate: las etiquetas del mapa no se salen por encima de los paneles */}
            <div className="absolute inset-0 isolate z-0">
                <Suspense fallback={<CargandoMapa />}>
                    <Mapa3D
                        vistaId={vistaId}
                        seleccionId={seleccionId}
                        enfoque={enfoque}
                        onSeleccionar={setSeleccionId}
                        onAbrirVista={irAVista}
                    />
                </Suspense>
            </div>

            {/* Barra superior flotante: lista + edificio/piso a la izquierda, buscador a la derecha */}
            <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
                <div className="pointer-events-auto flex min-w-0 items-start gap-2">
                    <button
                        type="button"
                        onClick={() => setListaAbierta((a) => !a)}
                        aria-expanded={listaAbierta}
                        aria-label={listaAbierta ? "Ocultar lista de lugares" : "Mostrar lista de lugares"}
                        title="Lista de lugares"
                        className={`${BOTON_ICONO} ${listaAbierta ? "border-accent/60 text-accent" : ""}`}
                    >
                        <Icono d={ICONOS.lista} />
                    </button>
                    <SelectorVista vista={vista} vistaId={vistaId} onElegir={irAVista} />
                </div>
                <div className="pointer-events-auto flex shrink-0 justify-end max-sm:has-[input]:absolute max-sm:has-[input]:inset-x-0 max-sm:has-[input]:z-30">
                    <Buscador onElegir={irALugar} />
                </div>
            </div>

            <AnimatePresence>
                {listaAbierta && (
                    <PanelLugares
                        key="lista"
                        vista={vista}
                        vistaId={vistaId}
                        seleccionId={seleccionId}
                        onElegir={irALugar}
                        onCerrar={() => setListaAbierta(false)}
                    />
                )}
            </AnimatePresence>

            {/* Leyenda (vistas de piso) */}
            {vista.edificio && !listaAbierta && (
                <div className={`${FLOTANTE} pointer-events-none absolute bottom-3 left-3 z-10 hidden max-w-[50%] flex-wrap gap-x-3 gap-y-1 px-3 py-2 sm:flex`}>
                    {TIPOS_LEYENDA.map((tipo) => (
                        <span key={tipo} className="flex items-center gap-1.5 text-2xs text-ink-soft">
                            <span className={`h-2 w-2 rounded-full ${colorPuntoLugar(tipo)}`} />
                            {tipo}
                        </span>
                    ))}
                </div>
            )}

            {/* Tarjeta del lugar seleccionado */}
            <AnimatePresence>
                {seleccion && (
                    <motion.div
                        key={seleccion.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className={`${FLOTANTE} absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-3 border-accent/50 p-4 sm:left-auto sm:w-96 ${listaAbierta ? "max-sm:hidden" : ""}`}
                    >
                        <div className="min-w-0">
                            <p className="truncate font-bold text-ink" title={seleccion.nombre}>{seleccion.nombre}</p>
                            <div className="mt-1 flex items-center gap-2">
                                <EtiquetaTipo tipo={seleccion.tipo} />
                                <span className="truncate text-2xs text-ink-muted">{seleccion.detalle}</span>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {seleccion.planos && (
                                <button
                                    type="button"
                                    onClick={() => irAVista(`${seleccion.planos}-pb`)}
                                    className="action-button action-button-sm"
                                >
                                    Ver pisos
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setSeleccionId(null)}
                                aria-label="Quitar selección"
                                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-field hover:text-ink"
                            >
                                <Icono d={ICONOS.cerrar} className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ayuda de controles y créditos (esquina inferior derecha, se apartan si hay selección) */}
            {!seleccion && (
                <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2">
                    <AnimatePresence>
                        {ayuda && (
                            <motion.div
                                id="ayuda-mapa"
                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                className={`${FLOTANTE} px-3 py-2 text-xs text-ink-soft`}
                            >
                                <p><b className="text-ink">Arrastra</b> para girar</p>
                                <p><b className="text-ink">Rueda / pellizca</b> para acercar</p>
                                <p><b className="text-ink">Clic derecho / dos dedos</b> para mover</p>
                                <p><b className="text-ink">/</b> para buscar</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="flex items-center gap-2">
                        <a href={FUENTE_MAPA} target="_blank" rel="noreferrer" className="rounded-md bg-surface/70 px-2 py-1 text-2xs text-ink-muted backdrop-blur transition-colors hover:text-accent">
                            Planos: Guía Bisonte · La Integral
                        </a>
                        <button type="button" onClick={() => setAyuda((a) => !a)} aria-expanded={ayuda} aria-controls="ayuda-mapa" aria-label="Cómo usar el mapa" className={`${BOTON_ICONO} h-9 w-9`}>
                            <Icono d={ICONOS.info} className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Mapa;
