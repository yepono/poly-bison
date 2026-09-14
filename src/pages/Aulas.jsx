import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function Aulas() {
    const [paso, setPaso] = useState(1);
    const [reserva, setReserva] = useState({ aula: null, fecha: "", hora: "" });
    const [asistentes, setAsistentes] = useState([{ nombre: "", matricula: "" }]);

    // Datos simulados
    const horarios = ["10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "14:00 - 15:00", "15:00 - 16:00"];

    const handleAulaSelect = (aulaId) => setReserva(prev => ({ ...prev, aula: aulaId }));

    const handleAsistenteChange = (index, field, value) => {
        const nuevosAsistentes = [...asistentes];
        nuevosAsistentes[index][field] = value;
        setAsistentes(nuevosAsistentes);
    };

    const agregarAsistente = () => setAsistentes([...asistentes, { nombre: "", matricula: "" }]);
    
    const removerAsistente = (index) => {
        if (asistentes.length > 1) {
            setAsistentes(asistentes.filter((_, i) => i !== index));
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            
            
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-text-title-dark drop-shadow-[0_0_8px_var(--color-neon-blue)] mb-4">
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

            <AnimatePresence mode="wait">
                
                {paso === 1 && (
                    <motion.div key="paso1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                        <div className="bg-surface-dark/50 border border-border-dark rounded-2xl p-6 shadow-lg mb-6">
                            
                            <h2 className="text-xl font-bold text-text-title-dark mb-4">1. Selecciona un Aula</h2>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                {[
                                    { id: "A1", nombre: "Sala de Estudio A", icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" },
                                    { id: "A2", nombre: "Sala de Estudio B", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
                                    { id: "A3", nombre: "Laboratorio Web", icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" }
                                ].map((aula) => (
                                    <button
                                        key={aula.id}
                                        onClick={() => handleAulaSelect(aula.id)}
                                        className={`relative p-6 flex flex-col items-center text-center gap-3 rounded-xl border transition-all ${reserva.aula === aula.id ? 'bg-primary/20 border-neon-blue shadow-[0_0_15px_rgba(0,191,255,0.3)]' : 'bg-bg-dark border-border-dark hover:border-text-muted-dark'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${reserva.aula === aula.id ? 'text-neon-blue' : 'text-text-muted-dark'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={aula.icon} />
                                        </svg>
                                        <span className={`font-bold ${reserva.aula === aula.id ? 'text-neon-blue' : 'text-text-body-dark'}`}>{aula.nombre}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-semibold text-text-body-dark mb-1.5 block">Fecha</label>
                                    <input 
                                        type="date" 
                                        value={reserva.fecha} 
                                        onChange={(e) => setReserva({...reserva, fecha: e.target.value})}
                                        className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-text-body-dark mb-1.5 block">Horario (Max 1 hora)</label>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                        {horarios.map(hora => (
                                            <button 
                                                key={hora}
                                                onClick={() => setReserva({...reserva, hora})}
                                                className={`py-2 text-sm rounded-lg border transition-colors ${reserva.hora === hora ? 'bg-neon-blue text-bg-deep font-bold border-neon-blue' : 'bg-bg-dark border-border-dark text-text-body-dark hover:border-text-muted-dark'}`}
                                            >
                                                {hora}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                disabled={!reserva.aula || !reserva.fecha || !reserva.hora}
                                onClick={() => setPaso(2)} 
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
                            <p className="text-text-muted-dark text-sm mb-6">Ingresa los datos de los estudiantes que ocuparán el aula.</p>
                            
                            <div className="flex flex-col gap-4">
                                {asistentes.map((asistente, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row gap-4 items-end bg-bg-dark p-4 rounded-lg border border-border-dark">
                                        <div className="flex-1 w-full">
                                            <label className="text-xs font-semibold text-text-body-dark mb-1 block">Nombre Completo</label>
                                            <input 
                                                type="text" 
                                                value={asistente.nombre} 
                                                onChange={(e) => handleAsistenteChange(index, "nombre", e.target.value)}
                                                className="w-full p-2.5 border border-border-dark rounded-lg bg-surface-dark text-text-title-dark focus:outline-none focus:ring-1 focus:ring-neon-blue"
                                            />
                                        </div>
                                        <div className="flex-1 w-full">
                                            <label className="text-xs font-semibold text-text-body-dark mb-1 block">Matrícula</label>
                                            <input 
                                                type="text" 
                                                value={asistente.matricula} 
                                                onChange={(e) => handleAsistenteChange(index, "matricula", e.target.value)}
                                                className="w-full p-2.5 border border-border-dark rounded-lg bg-surface-dark text-text-title-dark focus:outline-none focus:ring-1 focus:ring-neon-blue"
                                            />
                                        </div>
                                        {asistentes.length > 1 && (
                                            <button onClick={() => removerAsistente(index)} className="p-2.5 bg-secondary/20 text-neon-red rounded-lg hover:bg-secondary/40 transition-colors">
                                                Quitar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <button onClick={agregarAsistente} className="mt-4 text-sm text-neon-blue font-bold hover:underline flex items-center gap-1">
                                <span>+</span> Añadir otro asistente
                            </button>

                            <div className="flex gap-4 mt-8">
                                <button onClick={() => setPaso(1)} className="flex-1 border border-border-dark text-text-body-dark font-bold py-3 px-4 rounded-lg hover:bg-bg-dark transition-colors">Atrás</button>
                                <button onClick={() => setPaso(3)} className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors">Generar Ticket</button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {paso === 3 && (
                    <motion.div key="paso3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="bg-surface-dark/50 border border-neon-blue/50 rounded-2xl p-0 shadow-[0_0_20px_rgba(0,191,255,0.15)] mb-6 overflow-hidden relative">
                            
                            <div className="bg-linear-to-r from-primary to-neon-blue p-6 text-center">
                                <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Ticket de Acceso</h2>
                                <p className="text-white/80 text-sm">Reserva Confirmada</p>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-6 border-b border-border-dark pb-6">
                                    <div>
                                        <p className="text-text-muted-dark text-xs uppercase tracking-wider">Aula</p>
                                        <p className="text-text-title-dark font-bold text-lg">{reserva.aula}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-text-muted-dark text-xs uppercase tracking-wider">Fecha y Hora</p>
                                        <p className="text-text-title-dark font-bold text-lg">{reserva.fecha}</p>
                                        <p className="text-neon-blue font-bold">{reserva.hora}</p>
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
                            <button onClick={() => { setPaso(1); setReserva({ aula: null, fecha: "", hora: "" }); setAsistentes([{ nombre: "", matricula: "" }]); }} className="text-text-muted-dark hover:text-neon-blue transition-colors text-sm font-bold underline">
                                Realizar nueva reserva
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Aulas;