import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppData } from "../context/AppDataContext";
import { api, hoyISO, MATRICULA } from "../api/client";

const ICONOS_AULA = [
    "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
];

const reservaVacia = { aula: null, fecha: "", bloque: null };

function Aulas() {
    const { user } = useAppData();
    const [paso, setPaso] = useState(1);
    const [aulas, setAulas] = useState([]);
    const [reserva, setReserva] = useState(reservaVacia);
    // Horarios del aula/fecha elegidos: { clave, bloques }
    const [disponibilidad, setDisponibilidad] = useState(null);
    // Acompañantes (el titular se agrega solo en el servidor)
    const [asistentes, setAsistentes] = useState([]);
    const [ticket, setTicket] = useState(null);
    const [misReservaciones, setMisReservaciones] = useState(null);
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    const aulaSeleccionada = aulas.find((aula) => aula.id_aula === reserva.aula);
    const claveDisponibilidad = reserva.aula && reserva.fecha ? `${reserva.aula}|${reserva.fecha}` : null;
    const horarios = disponibilidad?.clave === claveDisponibilidad ? disponibilidad.bloques : [];
    const bloqueSeleccionado = horarios.find((bloque) => bloque.id_bloque === reserva.bloque);
    const maxAcompanantes = aulaSeleccionada ? aulaSeleccionada.capacidad - 1 : 0;

    useEffect(() => {
        api("reservaciones", "aulas")
            .then((response) => setAulas(response.aulas))
            .catch((err) => setError(err.message));
    }, []);

    const cargarMisReservaciones = useCallback(() => {
        api("reservaciones", "mis_reservaciones")
            .then((response) => setMisReservaciones(response.reservaciones))
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => { cargarMisReservaciones(); }, [cargarMisReservaciones]);

    const cargarDisponibilidad = useCallback((idAula, fecha) => {
        const clave = `${idAula}|${fecha}`;
        return api("reservaciones", "disponibilidad", { params: { id_aula: idAula, fecha } })
            .then((response) => setDisponibilidad({ clave, bloques: response.bloques }))
            .catch((err) => setError(err.message));
    }, []);

    // Horarios disponibles cada vez que cambian aula o fecha
    useEffect(() => {
        if (!reserva.aula || !reserva.fecha) return;
        cargarDisponibilidad(reserva.aula, reserva.fecha);
    }, [reserva.aula, reserva.fecha, cargarDisponibilidad]);

    const handleAulaSelect = (aulaId) => {
        setReserva(prev => ({ ...prev, aula: aulaId, bloque: null }));
        setError("");
    };

    const handleAsistenteChange = (index, field, value) => {
        setAsistentes((actuales) => actuales.map((asistente, i) => i === index ? { ...asistente, [field]: value } : asistente));
    };

    const agregarAsistente = () => {
        if (asistentes.length >= maxAcompanantes) {
            setError(`El aula tiene capacidad para ${aulaSeleccionada?.capacidad ?? 0} personas (incluyéndote).`);
            return;
        }
        setAsistentes([...asistentes, { nombre: "", matricula: "" }]);
    };

    const removerAsistente = (index) => setAsistentes(asistentes.filter((_, i) => i !== index));

    const continuar = () => {
        setError("");
        if (!reserva.aula || !reserva.fecha || !reserva.bloque) return;
        if (reserva.fecha < hoyISO()) {
            setError("No puedes reservar en una fecha pasada.");
            return;
        }
        if (!bloqueSeleccionado?.disponible) {
            setError("Ese horario ya no está disponible.");
            return;
        }
        if (asistentes.length > maxAcompanantes) setAsistentes(asistentes.slice(0, maxAcompanantes));
        setPaso(2);
    };

    const validarAsistentes = () => {
        const vistas = new Set();
        for (const [index, asistente] of asistentes.entries()) {
            const n = index + 1;
            if (!asistente.nombre.trim()) return `Escribe el nombre del acompañante ${n}.`;
            if (asistente.nombre.trim().length > 250) return `El nombre del acompañante ${n} es demasiado largo.`;
            if (!MATRICULA.test(asistente.matricula.trim())) return `La matrícula del acompañante ${n} debe tener 7 dígitos.`;
            if (vistas.has(asistente.matricula.trim())) return `La matrícula ${asistente.matricula.trim()} está repetida.`;
            vistas.add(asistente.matricula.trim());
        }
        return "";
    };

    const generarTicket = async () => {
        const problema = validarAsistentes();
        setError(problema);
        if (problema) return;
        setEnviando(true);
        try {
            const response = await api("reservaciones", "crear", {
                method: "POST",
                body: {
                    id_aula: reserva.aula,
                    fecha: reserva.fecha,
                    id_bloque: reserva.bloque,
                    asistentes: asistentes.map((a) => ({ nombre: a.nombre.trim(), matricula: a.matricula.trim() })),
                },
            });
            setTicket(response);
            setPaso(3);
            cargarMisReservaciones();
        } catch (err) {
            setError(err.message);
            // Si el horario se ocupó mientras tanto, regresa a elegir otro
            if (err.status === 409 && /horario|día/i.test(err.message)) {
                cargarDisponibilidad(reserva.aula, reserva.fecha);
                setReserva((prev) => ({ ...prev, bloque: null }));
                setPaso(1);
            }
        } finally {
            setEnviando(false);
        }
    };

    const nuevaReserva = () => {
        setPaso(1);
        setReserva(reservaVacia);
        setAsistentes([]);
        setTicket(null);
        setError("");
    };

    const cancelarReservacion = async (item) => {
        if (!window.confirm(`¿Cancelar la reservación de ${item.aula} el ${item.fecha_reserva} (${item.hora_inicio} - ${item.hora_fin})?`)) return;
        try {
            await api("reservaciones", "cancelar", { method: "POST", body: { id_reservacion: item.id_reservacion } });
            cargarMisReservaciones();
            if (reserva.aula && reserva.fecha) cargarDisponibilidad(reserva.aula, reserva.fecha);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto">


            <div className="mb-8 text-center">
                <h1 className="theme-glow mb-4 text-3xl font-bold text-text-title-dark">
                    Reserva de Aulas
                </h1>

                <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3].map((num) => (
                        <div key={num} className="flex items-center gap-2">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${paso >= num ? 'bg-primary text-white shadow-[0_0_10px_var(--color-primary)]' : 'bg-surface-dark border border-border-dark text-text-muted-dark'}`}>
                                {num}
                            </span>
                            {num < 3 && <span className={`h-0.5 w-8 transition-colors ${paso > num ? 'bg-primary' : 'bg-border-dark'}`}></span>}
                        </div>
                    ))}
                </div>
            </div>

            {error && <p role="alert" className="mb-4 text-center text-sm text-neon-red">{error}</p>}

            <AnimatePresence mode="wait">

                {paso === 1 && (
                    <motion.div key="paso1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                        <div className="bg-surface-dark/50 border border-border-dark rounded-2xl p-6 shadow-lg mb-6">

                            <h2 className="text-xl font-bold text-text-title-dark mb-4">1. Selecciona un Aula</h2>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                {aulas.map((aula, index) => (
                                    <button
                                        key={aula.id_aula}
                                        type="button"
                                        onClick={() => handleAulaSelect(aula.id_aula)}
                                        aria-pressed={reserva.aula === aula.id_aula}
                                        className={`relative p-6 flex flex-col items-center text-center gap-3 rounded-xl border transition-all ${reserva.aula === aula.id_aula ? 'bg-primary/20 border-neon-blue shadow-[0_0_15px_rgba(0,191,255,0.3)]' : 'bg-bg-dark border-border-dark hover:border-text-muted-dark'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${reserva.aula === aula.id_aula ? 'text-neon-blue' : 'text-text-muted-dark'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={ICONOS_AULA[index % ICONOS_AULA.length]} />
                                        </svg>
                                        <span className={`font-bold ${reserva.aula === aula.id_aula ? 'text-neon-blue' : 'text-text-body-dark'}`}>{aula.nombre}</span>
                                        <span className="text-xs text-text-muted-dark">Capacidad: {aula.capacidad} personas</span>
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="fecha-reserva" className="text-sm font-semibold text-text-body-dark mb-1.5 block">Fecha</label>
                                    <input
                                        id="fecha-reserva"
                                        type="date"
                                        min={hoyISO()}
                                        value={reserva.fecha}
                                        onChange={(e) => { setReserva({ ...reserva, fecha: e.target.value, bloque: null }); setError(""); }}
                                        className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-text-body-dark mb-1.5 block">Horario (Max 1 hora)</label>
                                    {!claveDisponibilidad && <p className="text-sm text-text-muted-dark">Selecciona un aula y una fecha para ver los horarios.</p>}
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                        {horarios.map(bloque => (
                                            <button
                                                key={bloque.id_bloque}
                                                type="button"
                                                disabled={!bloque.disponible}
                                                title={bloque.disponible ? undefined : "No disponible"}
                                                onClick={() => setReserva({ ...reserva, bloque: bloque.id_bloque })}
                                                className={`py-2 text-sm rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${reserva.bloque === bloque.id_bloque ? 'bg-neon-blue text-bg-deep font-bold border-neon-blue' : 'bg-bg-dark border-border-dark text-text-body-dark hover:border-text-muted-dark'}`}
                                            >
                                                {bloque.hora_inicio} - {bloque.hora_fin}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={!reserva.aula || !reserva.fecha || !reserva.bloque}
                                onClick={continuar}
                                className="mt-8 w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continuar
                            </button>
                        </div>
                    </motion.div>
                )}


                {paso === 2 && (
                    <motion.div key="paso2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                        <div className="bg-surface-dark/50 border border-border-dark rounded-2xl p-6 shadow-lg mb-6">
                            <h2 className="text-xl font-bold text-text-title-dark mb-2">2. Asistentes</h2>
                            <p className="text-text-muted-dark text-sm mb-6">Tú quedas registrado como titular. Agrega a los estudiantes que te acompañarán (máximo {maxAcompanantes}).</p>

                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row gap-4 items-end bg-bg-dark p-4 rounded-lg border border-neon-blue/40">
                                    <div className="flex-1 w-full">
                                        <p className="text-xs font-semibold text-text-body-dark mb-1 block">Titular</p>
                                        <p className="w-full p-2.5 border border-border-dark rounded-lg bg-surface-dark text-text-title-dark">{user.nombre}</p>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <p className="text-xs font-semibold text-text-body-dark mb-1 block">Matrícula</p>
                                        <p className="w-full p-2.5 border border-border-dark rounded-lg bg-surface-dark text-text-muted-dark">Registrada en tu cuenta</p>
                                    </div>
                                </div>
                                {asistentes.map((asistente, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row gap-4 items-end bg-bg-dark p-4 rounded-lg border border-border-dark">
                                        <div className="flex-1 w-full">
                                            <label htmlFor={`asistente-nombre-${index}`} className="text-xs font-semibold text-text-body-dark mb-1 block">Nombre Completo</label>
                                            <input
                                                id={`asistente-nombre-${index}`}
                                                type="text"
                                                maxLength={250}
                                                value={asistente.nombre}
                                                onChange={(e) => handleAsistenteChange(index, "nombre", e.target.value)}
                                                className="w-full p-2.5 border border-border-dark rounded-lg bg-surface-dark text-text-title-dark focus:outline-none focus:ring-1 focus:ring-neon-blue"
                                            />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label htmlFor={`asistente-matricula-${index}`} className="text-xs font-semibold text-text-body-dark mb-1 block">Matrícula</label>
                                            <input
                                                id={`asistente-matricula-${index}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={7}
                                                value={asistente.matricula}
                                                onChange={(e) => handleAsistenteChange(index, "matricula", e.target.value)}
                                                className="w-full p-2.5 border border-border-dark rounded-lg bg-surface-dark text-text-title-dark focus:outline-none focus:ring-1 focus:ring-neon-blue"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removerAsistente(index)} className="p-2.5 bg-secondary/20 text-neon-red rounded-lg hover:bg-secondary/40 transition-colors">
                                            Quitar
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {asistentes.length < maxAcompanantes && (
                                <button type="button" onClick={agregarAsistente} className="mt-4 text-sm text-neon-blue font-bold hover:underline flex items-center gap-1">
                                    <span>+</span> Añadir acompañante
                                </button>
                            )}

                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => { setError(""); setPaso(1); }} className="flex-1 border border-border-dark text-text-body-dark font-bold py-3 px-4 rounded-lg hover:bg-bg-dark transition-colors">Atrás</button>
                                <button type="button" disabled={enviando} onClick={generarTicket} className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{enviando ? "Reservando..." : "Generar Ticket"}</button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {paso === 3 && ticket && (
                    <motion.div key="paso3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="bg-surface-dark/50 border border-neon-blue/50 rounded-2xl p-0 shadow-[0_0_20px_rgba(0,191,255,0.15)] mb-6 overflow-hidden relative">

                            <div className="bg-linear-to-r from-primary to-neon-blue p-6 text-center">
                                <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Ticket de Acceso</h2>
                                <p className="text-white/80 text-sm">Reserva Confirmada · <span className="font-mono font-bold">{ticket.reservacion.codigo_ticket}</span></p>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-6 border-b border-border-dark pb-6">
                                    <div>
                                        <p className="text-text-muted-dark text-xs uppercase tracking-wider">Aula</p>
                                        <p className="text-text-title-dark font-bold text-lg">{ticket.reservacion.aula}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-text-muted-dark text-xs uppercase tracking-wider">Fecha y Hora</p>
                                        <p className="text-text-title-dark font-bold text-lg">{ticket.reservacion.fecha_reserva}</p>
                                        <p className="text-neon-blue font-bold">{ticket.reservacion.hora_inicio} - {ticket.reservacion.hora_fin}</p>
                                    </div>
                                </div>

                                <div className="mb-6 border-b border-border-dark pb-6">
                                    <p className="text-text-muted-dark text-xs uppercase tracking-wider mb-3">Asistentes Autorizados</p>
                                    <div className="space-y-2">
                                        {ticket.asistentes.map((asistente) => (
                                            <div key={asistente.matricula} className="flex justify-between items-center bg-bg-dark p-3 rounded-lg border border-border-dark">
                                                <span className="text-text-title-dark font-bold text-sm">
                                                    {asistente.nombre}
                                                </span>
                                                <span className="text-neon-blue font-mono text-sm bg-primary/20 px-2 py-1 rounded">
                                                    {asistente.matricula}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <p className="text-text-muted-dark text-xs uppercase tracking-wider mb-2">Instrucciones</p>
                                    <p className="text-text-body-dark text-sm bg-bg-dark p-3 rounded-lg border border-border-dark">
                                        Presenta tu credencial universitaria en prefectura para recoger la llave. Deberás entregar el aula exactamente al finalizar tu bloque de 1 hora.
                                    </p>
                                </div>

                                <div>
                                    <p className="text-text-muted-dark text-xs uppercase tracking-wider mb-2">Reglas del Aula</p>
                                    <ul className="list-disc list-inside text-sm text-text-body-dark space-y-1">
                                        <li>Prohibido introducir alimentos y bebidas.</li>
                                        <li>Mantener el tono de voz moderado.</li>
                                        <li>Apagar el equipo y el aire acondicionado al salir.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <button type="button" onClick={nuevaReserva} className="text-text-muted-dark hover:text-neon-blue transition-colors text-sm font-bold underline">
                                Realizar nueva reserva
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mis reservaciones (Q2-A) */}
            <section className="bg-surface-dark/50 border border-border-dark rounded-2xl p-6 shadow-lg mt-8">
                <h2 className="text-xl font-bold text-text-title-dark mb-4">Mis reservaciones</h2>
                {misReservaciones === null && <p className="text-sm text-text-muted-dark" aria-busy="true">Cargando...</p>}
                {misReservaciones?.length === 0 && <p className="text-sm text-text-muted-dark">Aún no tienes reservaciones.</p>}
                <div className="flex flex-col gap-3">
                    {misReservaciones?.map((item) => {
                        const cancelable = item.estado === "Activa" && item.fecha_reserva >= hoyISO();
                        return (
                            <div key={item.id_reservacion} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-dark p-4 rounded-lg border border-border-dark">
                                <div>
                                    <p className="font-bold text-text-title-dark">{item.aula} · {item.fecha_reserva} · {item.hora_inicio} - {item.hora_fin}</p>
                                    <p className="text-xs text-text-muted-dark">Ticket <span className="font-mono">{item.codigo_ticket}</span> · {item.total_asistentes} asistente(s) · {item.estado}</p>
                                </div>
                                {cancelable && (
                                    <button type="button" onClick={() => cancelarReservacion(item)} className="p-2.5 bg-secondary/20 text-neon-red rounded-lg hover:bg-secondary/40 transition-colors text-sm font-semibold">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

export default Aulas;
