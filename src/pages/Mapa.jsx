import { Suspense, lazy, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TechTag from "../components/TechTag";
import {
    FUENTE_MAPA, GRUPOS_NAVEGACION, LUGARES_POR_ID, TIPOS_LEYENDA, VISTAS_POR_ID,
    buscarLugares, colorPuntoLugar, estilosTipoLugar, lugaresDeVista,
} from "../utils/mapaDatos";

// three.js pesa: se carga sólo al entrar a esta página
const Mapa3D = lazy(() => import("../components/mapa/Mapa3D"));

const ETIQUETA_CORTA = { "Nivel 0": "PB", "Nivel 1": "1", "Nivel 2": "2" };

function CargandoMapa() {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-muted">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
            <span className="text-2xs uppercase tracking-widest">Construyendo mapa 3D…</span>
        </div>
    );
}

function Mapa() {
    const [vistaId, setVistaId] = useState("general");
    const [seleccionId, setSeleccionId] = useState(null);
    // Objeto nuevo = la cámara vuela. Sólo lo cambian la navegación y el directorio.
    const [enfoque, setEnfoque] = useState(null);
    const [busqueda, setBusqueda] = useState("");

    const vista = VISTAS_POR_ID[vistaId];
    const seleccion = seleccionId ? LUGARES_POR_ID[seleccionId] : null;

    const resultados = useMemo(
        () => (busqueda.trim() ? buscarLugares(busqueda) : lugaresDeVista(vistaId)),
        [busqueda, vistaId],
    );

    const irAVista = (id) => {
        setVistaId(id);
        setSeleccionId(null);
        setEnfoque({});
    };

    const irALugar = (lugar) => {
        setVistaId(lugar.vista);
        setSeleccionId(lugar.id);
        setEnfoque({ lugarId: lugar.id });
    };

    return (
        <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-6xl flex-col gap-6 lg:h-[calc(100dvh-6rem)] lg:min-h-[600px] lg:flex-row">

            {/* PANEL IZQUIERDO: Navegación y directorio */}
            <div className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">

                <div className="rounded-2xl border border-line bg-surface/20 p-5 shadow-lg backdrop-blur-md">
                    <h1 className="theme-glow mb-4 text-2xl font-bold text-ink">Navegación</h1>
                    <div className="flex flex-col gap-4">
                        {GRUPOS_NAVEGACION.map((grupo) => (
                            <div key={grupo.titulo}>
                                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-widest text-ink-muted">
                                    {grupo.titulo}
                                </p>
                                {grupo.vistas.length === 1 ? (
                                    <button
                                        onClick={() => irAVista(grupo.vistas[0].id)}
                                        className={`flex w-full items-center justify-between rounded-lg border p-3 font-semibold transition-all ${vistaId === grupo.vistas[0].id
                                            ? "border-accent bg-brand/20 text-accent shadow-glow"
                                            : "border-transparent bg-transparent text-ink-soft hover:bg-surface hover:text-ink"
                                            }`}
                                    >
                                        <span>{grupo.vistas[0].titulo}</span>
                                        {vistaId === grupo.vistas[0].id && <span className="h-2 w-2 rounded-full bg-accent shadow-glow" />}
                                    </button>
                                ) : (
                                    <div className="flex gap-1 rounded-lg border border-line bg-field p-1">
                                        {grupo.vistas.map((v) => (
                                            <button
                                                key={v.id}
                                                onClick={() => irAVista(v.id)}
                                                title={v.titulo}
                                                className={`flex-1 rounded-md px-2 py-2 text-sm font-semibold transition-all ${vistaId === v.id
                                                    ? "bg-brand/30 text-accent shadow-glow"
                                                    : "text-ink-soft hover:bg-surface hover:text-ink"
                                                    }`}
                                            >
                                                {ETIQUETA_CORTA[v.nivel] ?? v.nivel}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Directorio con buscador */}
                <div className="flex max-h-[32rem] flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface/20 p-5 shadow-lg backdrop-blur-md lg:max-h-none">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Directorio
                    </h2>

                    <div className="relative mb-2">
                        <input
                            type="text"
                            placeholder="Buscar aula, lab, oficina…"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full rounded-lg border border-line bg-field py-2.5 pl-10 pr-4 text-sm text-ink transition-all focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3.5 h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <p className="mb-3 text-2xs uppercase tracking-wider text-ink-muted">
                        {busqueda.trim() ? `${resultados.length} resultados en toda la facultad` : `En ${vista.titulo.toLowerCase()}`}
                    </p>

                    <div className="custom-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto pr-2">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {resultados.length > 0 ? (
                                resultados.map((lugar) => (
                                    <motion.button
                                        layout="position"
                                        key={lugar.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => irALugar(lugar)}
                                        className={`rounded-lg border p-3 text-left transition-colors ${seleccionId === lugar.id
                                            ? "border-accent bg-brand/15"
                                            : "border-line bg-field hover:border-ink-muted"
                                            }`}
                                    >
                                        <p className="mb-1 text-sm font-bold text-ink">{lugar.nombre}</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider ${estilosTipoLugar(lugar.tipo)}`}>
                                                {lugar.tipo}
                                            </span>
                                            {busqueda.trim() && <span className="text-2xs text-ink-muted">{lugar.detalle}</span>}
                                        </div>
                                    </motion.button>
                                ))
                            ) : (
                                <p className="mt-4 text-center text-sm text-ink-muted">
                                    No se encontraron resultados.
                                </p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO: visor 3D */}
            <div className="relative flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface/20 shadow-lg backdrop-blur-md lg:min-h-0">

                <div className="z-10 flex items-center justify-between gap-4 border-b border-line bg-surface/50 p-4 md:p-6">
                    <div>
                        <TechTag etiqueta={vista.nivel} />
                        <h2 className="mt-2 text-2xl font-bold text-ink">{vista.titulo}</h2>
                        <p className="text-sm text-ink-muted">{vista.subtitulo}</p>
                    </div>
                    <div className="hidden text-right text-2xs uppercase tracking-widest text-ink-muted sm:block">
                        <p>Arrastra para girar</p>
                        <p>Rueda / pellizca para zoom</p>
                        <p>Clic derecho para mover</p>
                    </div>
                </div>

                <div className="relative flex-1 bg-canvas/50">
                    <div className="absolute inset-0">
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

                    {/* Leyenda */}
                    {vista.edificio && (
                        <div className="pointer-events-none absolute left-3 top-3 flex max-w-[60%] flex-wrap gap-x-3 gap-y-1 rounded-lg border border-line bg-surface/80 px-3 py-2 backdrop-blur-md">
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
                                className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-xl border border-accent/50 bg-surface/90 p-4 shadow-glow backdrop-blur-md sm:left-auto sm:w-96"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-ink" title={seleccion.nombre}>{seleccion.nombre}</p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className={`rounded border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider ${estilosTipoLugar(seleccion.tipo)}`}>
                                            {seleccion.tipo}
                                        </span>
                                        <span className="truncate text-2xs text-ink-muted">{seleccion.detalle}</span>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {seleccion.planos && (
                                        <button
                                            onClick={() => irAVista(`${seleccion.planos}-pb`)}
                                            className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand transition-colors hover:bg-brand-hover"
                                        >
                                            Ver pisos
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSeleccionId(null)}
                                        aria-label="Cerrar"
                                        className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-field hover:text-ink"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <a
                        href={FUENTE_MAPA}
                        target="_blank"
                        rel="noreferrer"
                        className={`absolute right-3 text-2xs text-ink-muted transition-colors hover:text-accent ${seleccion ? "top-3" : "bottom-3"}`}
                    >
                        Planos: Guía Bisonte · La Integral
                    </a>
                </div>
            </div>
        </div>
    );
}

export default Mapa;
