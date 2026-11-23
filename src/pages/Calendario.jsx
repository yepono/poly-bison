import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TechTag from "../components/TechTag";
import { api, parseFechaMySQL } from "../api/client";

const NOMBRE_MES = (anio, mes) => new Date(anio, mes, 1).toLocaleDateString("es-MX", { month: "long" });
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function Calendario() {
    const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
    // Mes mostrado (D11): inicia en el mes actual
    const [mesActual, setMesActual] = useState(() => {
        const hoy = new Date();
        return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
    });
    // { clave: "AAAA-MM", lista } eventos visibles del mes (eventos.php?accion=listar)
    const [eventosMes, setEventosMes] = useState(null);
    const [error, setError] = useState("");

    const claveMes = `${mesActual.anio}-${String(mesActual.mes + 1).padStart(2, "0")}`;
    const events = eventosMes?.clave === claveMes ? eventosMes.lista : [];

    useEffect(() => {
        let cancelled = false;
        api("eventos", "listar", { params: { mes: claveMes } })
            .then((response) => { if (!cancelled) { setEventosMes({ clave: claveMes, lista: response.eventos }); setError(""); } })
            .catch((err) => { if (!cancelled) setError(err.message); });
        return () => { cancelled = true; };
    }, [claveMes]);

    const diasMes = new Date(mesActual.anio, mesActual.mes + 1, 0).getDate();
    const diaInicio = new Date(mesActual.anio, mesActual.mes, 1).getDay(); // 0 = domingo
    const nombreMes = capitalizar(NOMBRE_MES(mesActual.anio, mesActual.mes));

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

    // Eventos del día seleccionado para el Panel[cite: 9]
    const eventosDelDia = fechaSeleccionada ? eventosDelDiaDe(fechaSeleccionada) : [];

    // Estilos dinámicos para las etiquetas de eventos[cite: 9]
    const getEstilosPorTipo = (tipo) => {
        switch (tipo) {
            case 'Examen': return 'bg-cal-examen/10 text-cal-examen border-cal-examen/40';
            case 'Académico': return 'bg-cal-academico/10 text-cal-academico border-cal-academico/40';
            case 'Asueto': return 'bg-cal-asueto/10 text-cal-asueto border-cal-asueto/40';
            case 'Cultural': return 'bg-cal-cultural/10 text-cal-cultural border-cal-cultural/40';
            case 'Deportivo': return 'bg-cal-deportivo/10 text-cal-deportivo border-cal-deportivo/40';
            default: return 'bg-surface border-line text-ink-soft';
        }
    };

    // Estilos para los puntitos (cuando está contraído)[cite: 9]
    const getColorPunto = (tipo) => {
        switch (tipo) {
            case 'Examen': return 'bg-cal-examen shadow-[0_0_5px_var(--cal-examen)]';
            case 'Académico': return 'bg-cal-academico shadow-[0_0_5px_var(--cal-academico)]';
            case 'Asueto': return 'bg-cal-asueto shadow-[0_0_5px_var(--cal-asueto)]';
            case 'Cultural': return 'bg-cal-cultural shadow-[0_0_5px_var(--cal-cultural)]';
            case 'Deportivo': return 'bg-cal-deportivo shadow-[0_0_5px_var(--cal-deportivo)]';
            default: return 'bg-ink-muted';
        }
    };

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
        <div className="w-full flex flex-col relative gap-6">
            <motion.div
                layout
                className="w-full bg-surface/20 backdrop-blur-md border border-line rounded-2xl p-6 md:p-8 shadow-lg overflow-hidden"
            >
                {/* Header del Calendario */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                    <h1 className="theme-glow text-2xl font-bold text-ink sm:text-3xl">
                        {nombreMes} {mesActual.anio}
                    </h1>
                    {!fechaSeleccionada && (
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => cambiarMes(-1)} className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface sm:px-4 sm:text-base">
                                &lt; Anterior
                            </button>
                            <button type="button" onClick={() => cambiarMes(1)} className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface sm:px-4 sm:text-base">
                                Siguiente &gt;
                            </button>
                        </div>
                    )}
                    {fechaSeleccionada && (
                        <button onClick={() => setFechaSeleccionada(null)} className="text-ink-muted hover:text-ink font-bold text-sm underline transition-colors">
                            Ver mes completo
                        </button>
                    )}
                </div>

                {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}

                <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4 text-center text-sm font-bold text-ink-muted uppercase tracking-wider">
                    <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
                </div>

                <motion.div layout className="grid grid-cols-7 gap-2 md:gap-4">
                    {celdasRenderizadas.map((celda) => {
                        if (celda.tipo === 'vacio') {
                            return <div key={celda.key} className="min-h-[100px] md:min-h-[140px] rounded-xl bg-transparent border border-transparent"></div>;
                        }

                        const dia = celda.dia;
                        const esSeleccionado = dia === fechaSeleccionada;
                        const eventosHoy = eventosDelDiaDe(dia);

                        return (
                            <motion.div
                                layout
                                key={celda.key}
                                onClick={() => toggleDia(dia)}
                                className={`min-h-[100px] md:min-h-[140px] rounded-xl border p-2 md:p-3 cursor-pointer transition-colors flex flex-col relative overflow-hidden group shadow-sm hover:shadow-glow
                                    ${esSeleccionado
                                        ? 'border-cal-selected bg-cal-selected/10 shadow-glow'
                                        : 'border-cal-grid bg-cal-cell/40 hover:bg-cal-cell-hover hover:border-cal-selected/50'
                                    }`}
                            >
                                <span className={`text-sm font-bold mb-2 transition-colors ${esSeleccionado ? 'text-cal-selected' : 'text-ink-soft group-hover:text-cal-selected'}`}>
                                    {dia}
                                </span>

                                {/* Lógica condicional: Puntitos o Etiquetas */}
                                <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 mt-auto">
                                    {fechaSeleccionada ? (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {eventosHoy.map((evento, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`w-2.5 h-2.5 rounded-full ${getColorPunto(evento.tipo)}`}
                                                    title={evento.titulo}
                                                ></div>
                                            ))}
                                        </div>
                                    ) : (
                                        eventosHoy.map((evento, idx) => (
                                            <div
                                                key={idx}
                                                className={`text-[10px] md:text-xs font-semibold px-2 py-1 rounded border truncate ${getEstilosPorTipo(evento.tipo)}`}
                                                title={evento.titulo}
                                            >
                                                {evento.titulo}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
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
                        <div className="w-full h-full bg-surface/20 backdrop-blur-md border border-line rounded-2xl p-6 md:p-8 shadow-lg flex flex-col">

                            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                                <h2 className="flex min-w-0 items-center gap-3 text-xl font-bold text-ink sm:text-2xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Eventos del {fechaSeleccionada} de {nombreMes}
                                </h2>
                                <button onClick={() => setFechaSeleccionada(null)} className="text-ink-muted hover:text-ink transition-colors bg-field rounded-full p-2 border border-line">
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
                                                    {parseFechaMySQL(evento.fecha_inicio).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })} - {parseFechaMySQL(evento.fecha_fin).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <strong className="text-ink-soft">Lugar:</strong>
                                                    {evento.lugar || "Por definir"}
                                                </p>
                                            </div>

                                            <p className="text-sm text-ink-soft leading-relaxed bg-surface/50 p-3 rounded-lg border border-line/50">
                                                {evento.descripcion}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-10 bg-field border border-line rounded-xl">
                                        <p className="text-ink-muted text-lg">No hay eventos programados para este día.</p>
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