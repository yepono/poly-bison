import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TechTag from "../components/TechTag";

const nivelesMapa = {
    general: {
        id: "general",
        titulo: "Vista General",
        nivel: "Panorámica",
        // Reemplaza con la ruta real de tu imagen (ej. "/assets/mapa-general.png")
        imagen: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7bIJ8w6Sr_s1wPEM388iCYHZpbQz_YqroRkjdMSFNH4THUn3zlkMPcYM&s=10",
        locaciones: [
            { id: 1, nombre: "Edificio 1", tipo: "Aulas" },
            { id: 2, nombre: "Plaza Cultural 'Ing. Rafael Serna'", tipo: "Área Común" },
            { id: 3, nombre: "Cancha de Fútbol", tipo: "Deportivo" },
            { id: 4, nombre: "CICFIM", tipo: "Investigación" },
            { id: 5, nombre: "Edificio 3", tipo: "Aulas" },
        ]
    },
    pb: {
        id: "pb",
        titulo: "Planta Baja",
        nivel: "Nivel 0",
        imagen: "https://images.unsplash.com/photo-1574958269340-fa927503f3dd?q=80&w=800&auto=format&fit=crop",
        locaciones: [
            { id: 1, nombre: "Aulas 101-105, 201-204", tipo: "Aulas" },
            { id: 2, nombre: "Laboratorio LSTI 1 y 2", tipo: "Laboratorio" },
            { id: 3, nombre: "Cafetería", tipo: "Área Común" },
            { id: 4, nombre: "Dirección", tipo: "Administrativo" },
            { id: 5, nombre: "Coordinación Becas", tipo: "Administrativo" },
        ]
    },
    p1: {
        id: "p1",
        titulo: "Primer Piso",
        nivel: "Nivel 1",
        imagen: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop",
        locaciones: [
            { id: 1, nombre: "Aulas 106-110, 205-208", tipo: "Aulas" },
            { id: 2, nombre: "Laboratorio de Videojuegos", tipo: "Laboratorio" },
            { id: 3, nombre: "Sociedad de Alumnos", tipo: "Área Común" },
            { id: 4, nombre: "Auditorio José Luis Comparán", tipo: "Auditorio" },
            { id: 5, nombre: "Departamento Escolar", tipo: "Administrativo" },
        ]
    },
    p2: {
        id: "p2",
        titulo: "Segundo Piso",
        nivel: "Nivel 2",
        imagen: "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=800&auto=format&fit=crop",
        locaciones: [
            { id: 1, nombre: "Aulas 111-121, 209-212", tipo: "Aulas" },
            { id: 2, nombre: "Estudio de Grabación", tipo: "Laboratorio" },
            { id: 3, nombre: "CICE / Biblioteca", tipo: "Área Común" },
            { id: 4, nombre: "Departamento de Astronomía", tipo: "Administrativo" },
            { id: 5, nombre: "Terraza", tipo: "Área Común" },
        ]
    }
};

function Mapa() {
    const [nivelActivo, setNivelActivo] = useState("general");
    const [busqueda, setBusqueda] = useState("");

    const datosActuales = nivelesMapa[nivelActivo];

    // Filtra las locaciones del piso actual según el buscador
    const locacionesFiltradas = datosActuales.locaciones.filter(loc =>
        loc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        loc.tipo.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)] min-h-[600px]">

            {/* PANEL IZQUIERDO: Directorio y Controles */}
            <div className="w-full lg:w-80 flex flex-col gap-6">

                {/* Selector de Niveles */}
                <div className="bg-surface-dark/20 backdrop-blur-md border border-border-dark rounded-2xl p-5 shadow-lg">
                    <h1 className="text-2xl font-bold text-text-title-dark drop-shadow-[0_0_8px_var(--color-neon-blue)] mb-4">
                        Navegación
                    </h1>
                    <div className="flex flex-col gap-2">
                        {Object.entries(nivelesMapa).map(([clave, datos]) => (
                            <button
                                key={clave}
                                onClick={() => setNivelActivo(clave)}
                                className={`flex justify-between items-center p-3 rounded-lg border transition-all font-semibold ${nivelActivo === clave
                                    ? 'bg-primary/20 border-neon-blue text-neon-blue shadow-[0_0_15px_rgba(0,191,255,0.2)]'
                                    : 'bg-transparent border-transparent text-text-body-dark hover:bg-surface-dark hover:text-text-title-dark'
                                    }`}
                            >
                                <span>{datos.titulo}</span>
                                {nivelActivo === clave && (
                                    <span className="w-2 h-2 rounded-full bg-neon-blue shadow-[0_0_5px_var(--color-neon-blue)]"></span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Directorio con Buscador */}
                <div className="bg-surface-dark/20 backdrop-blur-md border border-border-dark rounded-2xl p-5 shadow-lg flex-1 flex flex-col overflow-hidden">
                    <h2 className="text-lg font-bold text-text-title-dark mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neon-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Directorio
                    </h2>

                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Buscar aula, lab..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all text-sm"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-3.5 text-text-muted-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                        <AnimatePresence mode="popLayout">
                            {locacionesFiltradas.length > 0 ? (
                                locacionesFiltradas.map((loc) => (
                                    <motion.div
                                        key={loc.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="p-3 bg-bg-dark border border-border-dark rounded-lg hover:border-text-muted-dark transition-colors cursor-default"
                                    >
                                        <p className="font-bold text-text-title-dark text-sm mb-1">{loc.nombre}</p>
                                        <span className="text-[10px] uppercase tracking-wider text-neon-blue font-semibold bg-primary/10 px-2 py-0.5 rounded">
                                            {loc.tipo}
                                        </span>
                                    </motion.div>
                                ))
                            ) : (
                                <p className="text-text-muted-dark text-sm text-center mt-4">
                                    No se encontraron resultados en este nivel.
                                </p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO: Visor del Mapa */}
            <div className="flex-1 bg-surface-dark/20 backdrop-blur-md border border-border-dark rounded-2xl shadow-lg flex flex-col overflow-hidden relative">

                {/* Cabecera del Visor */}
                <div className="p-4 md:p-6 border-b border-border-dark flex justify-between items-center bg-surface-dark/50 z-10">
                    <div>
                        <TechTag etiqueta={datosActuales.nivel} />
                        <h2 className="text-2xl font-bold text-text-title-dark mt-2">{datosActuales.titulo}</h2>
                    </div>

                    {/* Indicador para móviles */}
                    <div className="lg:hidden flex flex-col items-end text-text-muted-dark">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] uppercase tracking-widest">Desliza para explorar</span>
                    </div>
                </div>

                {/* Área de la Imagen (Scrollable) */}
                <div className="flex-1 overflow-auto bg-bg-deep/50 p-4 md:p-8 custom-scrollbar relative flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={nivelActivo}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                            src={datosActuales.imagen}
                            alt={`Mapa de ${datosActuales.titulo}`}
                            // Min-width asegura que la imagen no se encoja en móviles, obligando al usuario a hacer scroll para ver detalles
                            className="min-w-[600px] md:min-w-full h-auto object-contain rounded-xl border border-border-dark shadow-2xl bg-surface-dark"
                        />
                    </AnimatePresence>
                </div>
            </div>

        </div>
    );
}

export default Mapa;