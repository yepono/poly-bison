import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TechTag from "../components/TechTag";

// Datos simulados
const mockEventos = [
    {
        id_evento: 1,
        titulo: "Examen Medio Término",
        descripcion: "Examen parcial de Ecuaciones Diferenciales. Traer formulario impreso y calculadora no programable.",
        tipo: "Examen",
        fecha_inicio: "2026-09-18T10:00:00",
        fecha_fin: "2026-09-18T12:00:00",
        lugar: "Aula 105",
        id_creador: 1,
        fecha_publicacion: "2026-09-01T08:00:00",
        visible: true
    },
    {
        id_evento: 2,
        titulo: "Feria de Software FCFM",
        descripcion: "Presentación de proyectos finales de las carreras LMAD y LSTI.",
        tipo: "Académico",
        fecha_inicio: "2026-09-24T14:00:00",
        fecha_fin: "2026-09-24T18:00:00",
        lugar: "Explanada Principal",
        id_creador: 2,
        fecha_publicacion: "2026-09-10T09:00:00",
        visible: true
    },
    {
        id_evento: 3,
        titulo: "Torneo de Ajedrez",
        descripcion: "Torneo relámpago inter-facultades.",
        tipo: "Deportivo",
        fecha_inicio: "2026-09-24T10:00:00",
        fecha_fin: "2026-09-24T13:00:00",
        lugar: "Cafetería",
        id_creador: 3,
        fecha_publicacion: "2026-09-12T10:00:00",
        visible: true
    }
];

function Calendario() {
    const [fechaSeleccionada, setFechaSeleccionada] = useState(null);

    const diasMes = 30; // Septiembre tiene 30 días[cite: 9]
    const diaInicio = 2; // Septiembre 2026 empieza en Martes (0=Dom, 1=Lun, 2=Mar)[cite: 9]

    // Abre el panel inferior o lo cierra si se da clic en el mismo día
    const toggleDia = (dia) => {
        if (fechaSeleccionada === dia) {
            setFechaSeleccionada(null);
        } else {
            setFechaSeleccionada(dia);
        }
    };

    // Eventos del día seleccionado para el Panel[cite: 9]
    const eventosDelDia = fechaSeleccionada
        ? mockEventos.filter(evento => new Date(evento.fecha_inicio).getDate() === fechaSeleccionada)
        : [];

    // Estilos dinámicos para las etiquetas de eventos[cite: 9]
    const getEstilosPorTipo = (tipo) => {
        switch (tipo) {
            case 'Examen': return 'bg-neon-red/10 text-neon-red border-neon-red/40';
            case 'Académico': return 'bg-neon-blue/10 text-neon-blue border-neon-blue/40';
            case 'Asueto': return 'bg-secondary/10 text-secondary border-secondary/40';
            case 'Cultural': return 'bg-purple-500/10 text-purple-400 border-purple-500/40';
            case 'Deportivo': return 'bg-green-500/10 text-green-400 border-green-500/40';
            default: return 'bg-surface-dark border-border-dark text-text-body-dark';
        }
    };

    // Estilos para los puntitos (cuando está contraído)[cite: 9]
    const getColorPunto = (tipo) => {
        switch (tipo) {
            case 'Examen': return 'bg-neon-red shadow-[0_0_5px_rgba(255,77,77,0.8)]';
            case 'Académico': return 'bg-neon-blue shadow-[0_0_5px_rgba(0,191,255,0.8)]';
            case 'Asueto': return 'bg-secondary shadow-[0_0_5px_rgba(204,0,0,0.8)]';
            case 'Cultural': return 'bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.8)]';
            case 'Deportivo': return 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]';
            default: return 'bg-text-muted-dark';
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
                className="w-full bg-surface-dark/20 backdrop-blur-md border border-border-dark rounded-2xl p-6 md:p-8 shadow-lg overflow-hidden"
            >
                {/* Header del Calendario */}
                <div className="flex justify-between items-center mb-6 border-b border-border-dark pb-4">
                    <h1 className="text-3xl font-bold text-text-title-dark drop-shadow-[0_0_8px_var(--color-neon-blue)]">
                        Septiembre 2026
                    </h1>
                    {!fechaSeleccionada && (
                        <div className="flex gap-2">
                            <button className="p-2 px-4 border border-border-dark rounded-lg hover:bg-surface-dark transition-colors text-text-title-dark font-bold">
                                &lt; Anterior
                            </button>
                            <button className="p-2 px-4 border border-border-dark rounded-lg hover:bg-surface-dark transition-colors text-text-title-dark font-bold">
                                Siguiente &gt;
                            </button>
                        </div>
                    )}
                    {fechaSeleccionada && (
                        <button onClick={() => setFechaSeleccionada(null)} className="text-text-muted-dark hover:text-white font-bold text-sm underline transition-colors">
                            Ver mes completo
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4 text-center text-sm font-bold text-text-muted-dark uppercase tracking-wider">
                    <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
                </div>

                <motion.div layout className="grid grid-cols-7 gap-2 md:gap-4">
                    {celdasRenderizadas.map((celda) => {
                        if (celda.tipo === 'vacio') {
                            return <div key={celda.key} className="min-h-[100px] md:min-h-[140px] rounded-xl bg-transparent border border-transparent"></div>;
                        }

                        const dia = celda.dia;
                        const esSeleccionado = dia === fechaSeleccionada;
                        const eventosHoy = mockEventos.filter(e => new Date(e.fecha_inicio).getDate() === dia);

                        return (
                            <motion.div
                                layout
                                key={celda.key}
                                onClick={() => toggleDia(dia)}
                                className={`min-h-[100px] md:min-h-[140px] rounded-xl border p-2 md:p-3 cursor-pointer transition-colors flex flex-col relative overflow-hidden group shadow-sm hover:shadow-[0_0_15px_rgba(0,191,255,0.15)]
                                    ${esSeleccionado
                                        ? 'border-neon-blue bg-primary/10 shadow-[0_0_15px_rgba(0,191,255,0.2)]'
                                        : 'border-border-dark bg-surface-dark/40 hover:bg-surface-dark hover:border-neon-blue/50'
                                    }`}
                            >
                                <span className={`text-sm font-bold mb-2 transition-colors ${esSeleccionado ? 'text-neon-blue' : 'text-text-body-dark group-hover:text-neon-blue'}`}>
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
                        <div className="w-full h-full bg-surface-dark/20 backdrop-blur-md border border-border-dark rounded-2xl p-6 md:p-8 shadow-lg flex flex-col">

                            <div className="flex justify-between items-center border-b border-border-dark pb-4 mb-6">
                                <h2 className="text-2xl font-bold text-text-title-dark flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Eventos del {fechaSeleccionada} de Sept.
                                </h2>
                                <button onClick={() => setFechaSeleccionada(null)} className="text-text-muted-dark hover:text-white transition-colors bg-bg-dark rounded-full p-2 border border-border-dark">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Contenedor de la lista de eventos */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
                                {eventosDelDia.length > 0 ? (
                                    eventosDelDia.map((evento) => (
                                        <div key={evento.id_evento} className="bg-bg-dark border border-border-dark rounded-xl p-5 hover:border-neon-blue/50 transition-colors flex flex-col">
                                            <div className="flex justify-between items-start mb-3">
                                                <TechTag etiqueta={evento.tipo} />
                                            </div>
                                            <h3 className="font-bold text-text-title-dark text-xl mb-2">{evento.titulo}</h3>

                                            <div className="text-sm text-text-muted-dark mb-4 space-y-1.5 border-l-2 border-border-dark pl-3 flex-1">
                                                <p className="flex items-center gap-2">
                                                    <strong className="text-text-body-dark">Horario:</strong>
                                                    {new Date(evento.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(evento.fecha_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <strong className="text-text-body-dark">Lugar:</strong>
                                                    {evento.lugar}
                                                </p>
                                            </div>

                                            <p className="text-sm text-text-body-dark leading-relaxed bg-surface-dark/50 p-3 rounded-lg border border-border-dark/50">
                                                {evento.descripcion}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-10 bg-bg-dark border border-border-dark rounded-xl">
                                        <p className="text-text-muted-dark text-lg">No hay eventos programados para este día.</p>
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