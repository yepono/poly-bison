import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { estilosTipoEvento, colorPuntoEvento } from "../utils/eventStyles";
import TechTag from "../components/TechTag";
import PageHeader from "../components/PageHeader";
import { api, formatRangoFechaHora, parseFechaMySQL } from "../api/client";
import { EstadoVacio } from "../components/Estados";

const NOMBRE_MES = (anio, mes) => new Date(anio, mes, 1).toLocaleDateString("es-MX", { month: "long" });
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function Calendario() {
    const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
    // Mes que se muestra; empieza en el mes actual
    const [mesActual, setMesActual] = useState(() => {
        const hoy = new Date();
        return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
    });
    // Eventos visibles del mes que se muestra
    const [eventosMes, setEventosMes] = useState(null);
    const [error, setError] = useState("");
    const [intento, setIntento] = useState(0);

    const claveMes = `${mesActual.anio}-${String(mesActual.mes + 1).padStart(2, "0")}`;
    const events = eventosMes?.clave === claveMes ? eventosMes.lista : [];

    useEffect(() => {
        let cancelled = false;
        api("eventos", "listar", { params: { mes: claveMes } })
            .then((response) => { if (!cancelled) { setEventosMes({ clave: claveMes, lista: response.eventos }); setError(""); } })
            .catch((err) => { if (!cancelled) setError(err.message); });
        return () => { cancelled = true; };
    }, [claveMes, intento]);

    const diasMes = new Date(mesActual.anio, mesActual.mes + 1, 0).getDate();
    const diaInicio = new Date(mesActual.anio, mesActual.mes, 1).getDay(); // el 0 es domingo
    const nombreMes = capitalizar(NOMBRE_MES(mesActual.anio, mesActual.mes));
    const hoy = new Date();
    const esMesActual = hoy.getFullYear() === mesActual.anio && hoy.getMonth() === mesActual.mes;

    const irAHoy = () => {
        setFechaSeleccionada(null);
        setMesActual({ anio: hoy.getFullYear(), mes: hoy.getMonth() });
    };

    const cambiarMes = (delta) => {
        setFechaSeleccionada(null);
        setMesActual(({ anio, mes }) => {
            const fecha = new Date(anio, mes + delta, 1);
            return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
        });
    };

    // Eventos que ocurren en un día del mes (incluye los de varios días)
    const eventosDelDiaDe = (dia) => {
        const inicioDia = new Date(mesActual.anio, mesActual.mes, dia, 0, 0, 0);
        const finDia = new Date(mesActual.anio, mesActual.mes, dia, 23, 59, 59);
        return events.filter((evento) => parseFechaMySQL(evento.fecha_inicio) <= finDia && parseFechaMySQL(evento.fecha_fin) >= inicioDia);
    };

    // Abre el panel inferior o lo cierra si se da clic en el mismo día
    const toggleDia = (dia) => {
        if (fechaSeleccionada === dia) {
            setFechaSeleccionada(null);
        } else {
            setFechaSeleccionada(dia);
        }
    };

    // Eventos del día seleccionado para el panel inferior
    const eventosDelDia = fechaSeleccionada ? eventosDelDiaDe(fechaSeleccionada) : [];

    // Lógica para estructurar la cuadrícula y aislar la semana seleccionada
    const obtenerCeldas = () => {
        const celdas = [];
        // Llenar espacios vacíos iniciales
        for (let i = 0; i < diaInicio; i++) {
            celdas.push({ tipo: 'vacio', key: `empty-${i}` });
        }
        // Llenar los días del mes
        for (let i = 1; i <= diasMes; i++) {
            celdas.push({ tipo: 'dia', dia: i, key: `dia-${i}` });
        }
        return celdas;
    };

    const todasLasCeldas = obtenerCeldas();

    // Si hay un día seleccionado, calculamos en qué fila está y mostramos solo esos 7 elementos
    const filaSeleccionada = fechaSeleccionada
        ? Math.floor((diaInicio + fechaSeleccionada - 1) / 7)
        : null;

    const celdasRenderizadas = fechaSeleccionada
        ? todasLasCeldas.slice(filaSeleccionada * 7, filaSeleccionada * 7 + 7)
        : todasLasCeldas;

    return (
        <div className="pagina-ancha relative flex flex-col">
            <PageHeader titulo="Calendario" subtitulo="Exámenes, asuetos y eventos de la facultad." />
            <motion.div
                layout
                className="card w-full overflow-hidden"
            >
                {/* Encabezado del calendario */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                    <h2 className="text-xl font-bold text-ink sm:text-2xl" aria-live="polite">
                        {nombreMes} {mesActual.anio}
                    </h2>
                    {!fechaSeleccionada && (
                        <div className="flex items-center gap-2">
                            {!esMesActual && (
                                <button type="button" onClick={irAHoy} className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface">
                                    Hoy
                                </button>
                            )}
                            <button type="button" onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-surface">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button type="button" onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-surface">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    )}
                    {fechaSeleccionada && (
                        <button type="button" onClick={() => setFechaSeleccionada(null)} className="min-h-11 text-ink-muted hover:text-ink font-bold text-sm underline transition-colors">
                            Ver mes completo
                        </button>
                    )}
                </div>

                {error && (
                    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
                        <span>No se pudieron cargar los eventos del mes.</span>
                        <button type="button" onClick={() => { setError(""); setIntento((n) => n + 1); }} className="action-button action-button-secondary action-button-sm">Reintentar</button>
                    </div>
                )}

                <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4 text-center text-sm font-bold text-ink-muted uppercase tracking-wider">
                    <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
                </div>

                <motion.div layout className="grid grid-cols-7 gap-2 md:gap-4">
                    {celdasRenderizadas.map((celda) => {
                        if (celda.tipo === 'vacio') {
                            return <div key={celda.key} aria-hidden="true" className="min-h-16 md:min-h-[140px] rounded-xl bg-transparent border border-transparent"></div>;
                        }

                        const dia = celda.dia;
                        const esSeleccionado = dia === fechaSeleccionada;
                        const eventosHoy = eventosDelDiaDe(dia);
                        const esHoy = esMesActual && dia === hoy.getDate();
                        const totalEventos = eventosHoy.length;

                        return (
                            <motion.button
                                type="button"
                                layout
                                key={celda.key}
                                onClick={() => toggleDia(dia)}
                                aria-pressed={esSeleccionado}
                                aria-label={`${dia} de ${nombreMes}${esHoy ? ", hoy" : ""}: ${totalEventos ? `${totalEventos} ${totalEventos === 1 ? "evento" : "eventos"}` : "sin eventos"}`}
                                className={`min-h-16 md:min-h-[140px] rounded-xl border p-1.5 md:p-3 text-left cursor-pointer transition-colors flex flex-col relative overflow-hidden group shadow-sm hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
                                    ${esSeleccionado
                                        ? 'border-cal-selected bg-cal-selected/10 shadow-glow'
                                        : esHoy
                                            ? 'border-cal-today/60 bg-cal-cell/40 hover:bg-cal-cell-hover'
                                            : 'border-cal-grid bg-cal-cell/40 hover:bg-cal-cell-hover hover:border-cal-selected/50'
                                    }`}
                            >
                                <span className={`mb-1 md:mb-2 inline-flex h-6 min-w-6 items-center justify-center self-start rounded-full px-1 text-sm font-bold transition-colors ${esHoy
                                    ? 'bg-cal-today text-on-accent'
                                    : esSeleccionado ? 'text-cal-selected' : 'text-ink-soft group-hover:text-cal-selected'}`}>
                                    {dia}
                                </span>

                                {/* Vista de semana o celular: puntitos. Mes completo en pantallas medianas: etiquetas */}
                                <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 mt-auto">
                                    {!fechaSeleccionada && totalEventos > 0 && (
                                        <div className="flex flex-wrap gap-1 md:hidden" aria-hidden="true">
                                            {eventosHoy.map((evento) => (
                                                <span key={evento.id_evento} className={`h-2 w-2 rounded-full ${colorPuntoEvento(evento.tipo)}`} />
                                            ))}
                                        </div>
                                    )}
                                    {fechaSeleccionada ? (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {eventosHoy.map((evento, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`w-2.5 h-2.5 rounded-full ${colorPuntoEvento(evento.tipo)}`}
                                                    title={evento.titulo}
                                                ></div>
                                            ))}
                                        </div>
                                    ) : (
                                        eventosHoy.map((evento, idx) => (
                                            <div
                                                key={idx}
                                                className={`hidden md:block text-xs font-semibold px-2 py-1 rounded border truncate ${estilosTipoEvento(evento.tipo)}`}
                                                title={evento.titulo}
                                            >
                                                {evento.titulo}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {fechaSeleccionada && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, y: 20 }}
                        animate={{ height: "auto", opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: 20 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="w-full overflow-hidden"
                    >
                        <div className="card flex h-full w-full flex-col">

                            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                                <h2 className="flex min-w-0 items-center gap-3 text-xl font-bold text-ink sm:text-2xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Eventos del {fechaSeleccionada} de {nombreMes.toLowerCase()}
                                </h2>
                                <button type="button" onClick={() => setFechaSeleccionada(null)} aria-label="Cerrar eventos del día" className="text-ink-muted hover:text-ink transition-colors bg-field rounded-full p-2 border border-line">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Contenedor de la lista de eventos */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
                                {eventosDelDia.length > 0 ? (
                                    eventosDelDia.map((evento) => (
                                        <div key={evento.id_evento} className="bg-field border border-line rounded-xl p-5 hover:border-accent/50 transition-colors flex flex-col">
                                            <div className="flex justify-between items-start mb-3">
                                                <TechTag etiqueta={evento.tipo} />
                                            </div>
                                            <h3 className="font-bold text-ink text-xl mb-2">{evento.titulo}</h3>

                                            <div className="text-sm text-ink-muted mb-4 space-y-1.5 border-l-2 border-line pl-3 flex-1">
                                                <p className="flex items-center gap-2">
                                                    <strong className="text-ink-soft">Horario:</strong>
                                                    {formatRangoFechaHora(evento.fecha_inicio, evento.fecha_fin)}
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <strong className="text-ink-soft">Lugar:</strong>
                                                    {evento.lugar || "Por definir"}
                                                </p>
                                            </div>

                                            {evento.descripcion && (
                                                <p className="text-sm text-ink-soft leading-relaxed bg-surface/50 p-3 rounded-lg border border-line/50">
                                                    {evento.descripcion}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full rounded-xl border border-line bg-field/40">
                                        <EstadoVacio compacto icono="calendario" titulo="Sin eventos este día" detalle="No hay exámenes, asuetos ni actividades programadas." />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

export default Calendario;