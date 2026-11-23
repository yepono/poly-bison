import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Confirmaciones, preguntas y avisos con el estilo de la app, en lugar de las ventanas del
// navegador. Se usan con useDialogos(): confirmar y pedirTexto esperan la respuesta del usuario
// (pedirTexto da null si cancela) y avisar muestra una notificación de éxito, error o información.

const DialogosContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useDialogos() {
    const ctx = useContext(DialogosContext);
    if (!ctx) throw new Error("useDialogos debe usarse dentro de <DialogosProvider>");
    return ctx;
}

function Dialogo({ dialogo, onCerrar }) {
    const { tipo, titulo, mensaje, accion, cancelar = "Cancelar", peligro, etiqueta, valor = "", placeholder, maxLength = 300, multilinea, validar } = dialogo;
    const [texto, setTexto] = useState(valor);
    const [error, setError] = useState("");
    const campo = useRef(null);
    const botonCancelar = useRef(null);

    useEffect(() => {
        (tipo === "texto" ? campo : botonCancelar).current?.focus();
        const onKey = (e) => { if (e.key === "Escape") onCerrar(tipo === "texto" ? null : false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [tipo, onCerrar]);

    const aceptar = (e) => {
        e.preventDefault();
        if (tipo !== "texto") return onCerrar(true);
        const problema = validar?.(texto.trim());
        if (problema) return setError(problema);
        onCerrar(texto.trim());
    };

    const Campo = multilinea ? "textarea" : "input";

    return (
        <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-scrim p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(tipo === "texto" ? null : false); }}
        >
            <motion.form
                onSubmit={aceptar}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="dialogo-titulo"
                aria-describedby={mensaje ? "dialogo-mensaje" : undefined}
                initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-pop"
            >
                <h2 id="dialogo-titulo" className="text-lg font-bold text-ink">{titulo}</h2>
                {mensaje && <p id="dialogo-mensaje" className="mt-2 text-sm leading-relaxed text-ink-soft">{mensaje}</p>}
                {tipo === "texto" && (
                    <label className="form-label mt-4">
                        {etiqueta}
                        <Campo
                            ref={campo}
                            className={`form-input ${multilinea ? "min-h-24 resize-y" : ""}`}
                            value={texto}
                            maxLength={maxLength}
                            placeholder={placeholder}
                            onChange={(e) => { setTexto(e.target.value); setError(""); }}
                            aria-invalid={Boolean(error)}
                        />
                    </label>
                )}
                {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button ref={botonCancelar} type="button" onClick={() => onCerrar(tipo === "texto" ? null : false)}
                        className="action-button action-button-secondary">
                        {cancelar}
                    </button>
                    <button type="submit"
                        className={`action-button ${peligro ? "action-button-danger" : ""}`}>
                        {accion || "Aceptar"}
                    </button>
                </div>
            </motion.form>
        </motion.div>
    );
}

const ESTILO_AVISO = {
    exito: { clases: "border-success/40", icono: "M5 13l4 4L19 7", color: "text-success" },
    error: { clases: "border-danger/40", icono: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z", color: "text-danger" },
    info: { clases: "border-accent/40", icono: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", color: "text-accent" },
};

export function DialogosProvider({ children }) {
    const [dialogo, setDialogo] = useState(null);
    const [avisos, setAvisos] = useState([]);
    const resolver = useRef(null);
    const siguienteId = useRef(0);

    const abrir = useCallback((config) => new Promise((resolve) => {
        resolver.current?.(config.tipo === "texto" ? null : false); // un diálogo a la vez
        resolver.current = resolve;
        setDialogo({ ...config, id: ++siguienteId.current });
    }), []);

    const cerrar = useCallback((resultado) => {
        resolver.current?.(resultado);
        resolver.current = null;
        setDialogo(null);
    }, []);

    const confirmar = useCallback((config) => abrir({ ...config, tipo: "confirmar" }), [abrir]);
    const pedirTexto = useCallback((config) => abrir({ ...config, tipo: "texto" }), [abrir]);

    const quitarAviso = useCallback((id) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);
    const avisar = useCallback((mensaje, tipo = "info") => {
        const id = ++siguienteId.current;
        setAvisos((lista) => [...lista.slice(-2), { id, mensaje, tipo }]);
        setTimeout(() => quitarAviso(id), tipo === "error" ? 6000 : 4000);
    }, [quitarAviso]);

    return (
        <DialogosContext.Provider value={{ confirmar, pedirTexto, avisar }}>
            {children}
            <AnimatePresence>
                {dialogo && <Dialogo key={dialogo.id} dialogo={dialogo} onCerrar={cerrar} />}
            </AnimatePresence>
            <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end" aria-live="polite">
                <AnimatePresence>
                    {avisos.map((aviso) => {
                        const estilo = ESTILO_AVISO[aviso.tipo] ?? ESTILO_AVISO.info;
                        return (
                            <motion.div
                                key={aviso.id}
                                layout
                                role={aviso.tipo === "error" ? "alert" : "status"}
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }}
                                className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface p-3 pr-2 shadow-pop ${estilo.clases}`}
                            >
                                <svg className={`mt-0.5 h-5 w-5 shrink-0 ${estilo.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={estilo.icono} />
                                </svg>
                                <p className="min-w-0 flex-1 text-sm text-ink">{aviso.mensaje}</p>
                                <button type="button" onClick={() => quitarAviso(aviso.id)} aria-label="Cerrar aviso" className="rounded p-1 text-ink-muted hover:text-ink">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </DialogosContext.Provider>
    );
}
