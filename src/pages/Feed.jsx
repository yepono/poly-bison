import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";

const mockPosts = [
    {
        id: 1,
        autor: "Admin FCFM",
        avatar: "https://ui-avatars.com/api/?name=Admin+FCFM&background=cc0000&color=fff",
        fecha: "Hace 2 horas",
        titulo: "Suspensión de clases por mantenimiento",
        contenido: "Se les informa que el día de mañana no habrá clases en el edificio 2 debido a labores de mantenimiento en la red eléctrica. Favor de revisar sus correos universitarios para más detalles.",
        imagen: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1000&auto=format&fit=crop",
        etiqueta: "Aviso",
        likes: 124,
        comentarios: 45
    },
    {
        id: 2,
        autor: "Juan Pérez",
        avatar: "",
        fecha: "Hace 5 horas",
        titulo: "¿Alguien entiende Grafos?",
        contenido: "Llevo tres días intentando resolver la tarea de matemáticas discretas y no logro implementar el algoritmo de Dijkstra. Si alguien tiene un buen tutorial o me puede explicar, invito los tacos.",
        imagen: null,
        etiqueta: "Ayuda",
        likes: 12,
        comentarios: 8
    },
    {
        id: 3,
        autor: "Sociedad de Alumnos",
        avatar: "https://ui-avatars.com/api/?name=SA&background=003366&color=fff",
        fecha: "Ayer a las 14:30",
        titulo: "Torneo de Super Smash Bros",
        contenido: "¡Bizontes! Ya están abiertas las inscripciones para el torneo de aniversario. El primer lugar se lleva una tarjeta de regalo de $500 y mercancía oficial de la facultad. Registros en la explanada principal.",
        imagen: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000&auto=format&fit=crop",
        etiqueta: "General",
        likes: 89,
        comentarios: 21
    },
    {
        id: 4,
        autor: "María González",
        avatar: "",
        fecha: "Ayer a las 16:00",
        titulo: null,
        contenido: "Acabo de encontrar una memoria USB negra de 64GB en el laboratorio 3 de LSTI. La dejé con el guardia de la entrada por si alguien la busca.",
        imagen: null,
        etiqueta: "General",
        likes: 5,
        comentarios: 1
    }
];

function Feed() {
    const [mostrarBotonFlotante, setMostrarBotonFlotante] = useState(false);
    const [modalAbierto, setModalAbierto] = useState(false);

    useEffect(() => {
        const manejarScroll = () => {
            if (window.scrollY > 300) {
                setMostrarBotonFlotante(true);
            } else {
                setMostrarBotonFlotante(false);
            }
        };

        window.addEventListener("scroll", manejarScroll);
        return () => window.removeEventListener("scroll", manejarScroll);
    }, []);

    return (
        <div className="w-full max-w-3xl mx-auto relative">

            <CreatePost />

            <div className="flex flex-col gap-2 mt-4">
                {mockPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>

            <AnimatePresence>
                {mostrarBotonFlotante && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setModalAbierto(true)}
                        className="fixed bottom-8 right-8 sm:bottom-12 sm:right-12 w-14 h-14 bg-linear-to-r from-primary to-neon-blue rounded-full flex items-center justify-center text-white z-40 hover:scale-110 transition-transform"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalAbierto && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className="w-full max-w-2xl relative"
                        >
                            <button
                                onClick={() => setModalAbierto(false)}
                                className="absolute -top-12 right-0 md:-right-12 md:top-0 text-text-muted-dark hover:text-white bg-surface-dark rounded-full p-2 transition-colors z-50 border border-border-dark"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <CreatePost />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

export default Feed;