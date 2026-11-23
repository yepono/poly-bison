import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ESTRELLAS, FUENTES, LINEAS } from "../utils/constelacionBisonte";

const ANCHO = 420;
const ALTO = 280;
const porId = Object.fromEntries(ESTRELLAS.map((e) => [e.id, e]));
const CLAVE = ESTRELLAS.filter((e) => e.dato); // estrellas que se pueden pulsar

// Constelación del bisonte de la FCFM. Las estrellas brillantes son botones: al pulsarlas se
// muestra lo que significa la mascota (texto en utils/constelacionBisonte.js).
function ConstelacionBisonte() {
    const reducido = useReducedMotion();
    const idTitulo = useId();
    const [activa, setActiva] = useState(null);       // id de la estrella elegida
    const [vistas, setVistas] = useState(() => new Set());

    const elegir = (id) => {
        setActiva(id);
        setVistas((v) => new Set(v).add(id));
    };
    const indice = CLAVE.findIndex((e) => e.id === activa);
    const mover = (delta) => elegir(CLAVE[(indice + delta + CLAVE.length) % CLAVE.length].id);
    const dato = activa ? porId[activa].dato : null;
    const conectada = (a, b) => activa && (a === activa || b === activa);

    return (
        <section aria-labelledby={idTitulo} className="mx-auto w-full max-w-xl select-none">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Facultad de Ciencias Físico Matemáticas</p>
            <h2 id={idTitulo} className="mt-1 text-3xl font-bold text-ink xl:text-4xl">La constelación del Bisonte</h2>
            <p className="mt-2 text-sm text-ink-muted">Pulsa las estrellas brillantes para descubrir qué significa nuestra mascota.</p>

            <div className="relative mt-6" style={{ aspectRatio: `${ANCHO} / ${ALTO}` }}>
                <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                    <defs>
                        <radialGradient id="brillo-estrella">
                            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {LINEAS.map(([a, b], i) => {
                        const p = porId[a], q = porId[b];
                        const largo = Math.hypot(q.x - p.x, q.y - p.y);
                        return (
                            <motion.line
                                key={`${a}-${b}`}
                                x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                                stroke="var(--accent)"
                                strokeLinecap="round"
                                strokeWidth={conectada(a, b) ? 1.6 : 1}
                                strokeDasharray={largo}
                                initial={reducido ? false : { strokeDashoffset: largo, opacity: 0 }}
                                animate={{ strokeDashoffset: 0, opacity: conectada(a, b) ? 0.95 : 0.4 }}
                                transition={{ strokeDashoffset: { delay: 0.3 + i * 0.07, duration: 0.6, ease: "easeOut" }, opacity: { duration: 0.3, delay: activa ? 0 : 0.3 + i * 0.07 } }}
                            />
                        );
                    })}

                    {/* Estrellas secundarias (decorativas) */}
                    {ESTRELLAS.filter((e) => !e.dato).map((e, i) => (
                        <circle
                            key={e.id}
                            cx={e.x} cy={e.y} r={2.2}
                            fill="var(--ink)"
                            className={reducido ? "opacity-70" : "estrella-titila"}
                            style={{ animationDelay: `${(i * 0.37) % 3}s` }}
                        />
                    ))}
                </svg>

                {/* Estrellas principales: botones encima del dibujo */}
                {CLAVE.map((e, i) => {
                    const elegida = e.id === activa;
                    const vista = vistas.has(e.id);
                    // La leyenda estudiantil va en rojo para distinguirla de los datos oficiales
                    const tono = e.dato.leyenda ? "var(--danger)" : "var(--accent)";
                    return (
                        <motion.button
                            key={e.id}
                            type="button"
                            onClick={() => elegir(e.id)}
                            aria-pressed={elegida}
                            aria-label={`${e.dato.titulo}${vista ? " (descubierta)" : ""}`}
                            title={e.dato.titulo}
                            initial={reducido ? false : { scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 1.2 + i * 0.12, type: "spring", stiffness: 260, damping: 18 }}
                            style={{ left: `${(e.x / ANCHO) * 100}%`, top: `${(e.y / ALTO) * 100}%` }}
                            className="group absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                            {!vista && !reducido && <span aria-hidden="true" className={`absolute inset-1.5 rounded-full border motion-safe:animate-ping ${e.dato.leyenda ? "border-danger/60" : "border-accent/60"}`} />}
                            <span aria-hidden="true" className={`absolute inset-0 rounded-full transition-opacity ${elegida ? "opacity-100" : "opacity-0 group-hover:opacity-70"}`} style={{ background: `radial-gradient(circle, color-mix(in srgb, ${tono} 45%, transparent), transparent 70%)` }} />
                            <svg aria-hidden="true" viewBox="0 0 24 24" className={`relative transition-transform duration-200 group-hover:scale-125 ${elegida ? "h-7 w-7 scale-110" : "h-5 w-5"}`}>
                                <path d="M12 1.5 13.9 10.1 22.5 12 13.9 13.9 12 22.5 10.1 13.9 1.5 12 10.1 10.1Z" fill={vista ? tono : "var(--ink)"} />
                            </svg>
                            <span aria-hidden="true" className={`pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wider transition-opacity ${elegida ? `${e.dato.leyenda ? "text-danger" : "text-accent"} opacity-100` : "text-ink-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
                                {e.dato.titulo}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Significado de la estrella elegida */}
            <div className="mt-4 min-h-40" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                    {dato ? (
                        <motion.article
                            key={activa}
                            initial={reducido ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="rounded-2xl border border-line bg-surface/85 p-5 shadow-card"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-2xs font-bold uppercase tracking-wider text-ink-muted">
                                        Estrella {indice + 1} de {CLAVE.length}
                                        {dato.leyenda && <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-danger/15 px-2 py-0.5 text-danger">Leyenda estudiantil</span>}
                                    </p>
                                    <h3 className={`mt-0.5 text-xl font-bold ${dato.leyenda ? "text-danger" : "text-accent"}`}>{dato.titulo}</h3>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <button type="button" onClick={() => mover(-1)} aria-label="Estrella anterior" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-field hover:text-ink">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button type="button" onClick={() => mover(1)} aria-label="Estrella siguiente" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-field hover:text-ink">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                            <p className="mt-2 leading-relaxed text-ink-soft">{dato.texto}</p>
                        </motion.article>
                    ) : (
                        <motion.p
                            key="pista"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 text-sm text-ink-muted"
                        >
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0"><path d="M12 1.5 13.9 10.1 22.5 12 13.9 13.9 12 22.5 10.1 13.9 1.5 12 10.1 10.1Z" fill="var(--accent)" /></svg>
                            {CLAVE.length} estrellas por descubrir
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            <p className="mt-2 text-2xs text-ink-muted">
                {vistas.size}/{CLAVE.length} descubiertas · Fuentes:{" "}
                {FUENTES.map((f, i) => (
                    <span key={f.url}>{i > 0 && ", "}<a href={f.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">{f.texto}</a></span>
                ))}
                {" "}· La maldición de la integral es folklore.
            </p>
        </section>
    );
}

export default ConstelacionBisonte;
