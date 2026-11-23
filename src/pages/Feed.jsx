import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { useAppData } from "../context/AppDataContext";

function Feed() {
    const { posts, postsStatus, postsError, loadPosts } = useAppData();
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
                {postsStatus === "loading" && <p className="py-10 text-center text-ink-muted" aria-busy="true">Cargando publicaciones...</p>}
                {postsStatus === "error" && (
                    <div role="alert" className="py-10 text-center">
                        <p className="text-danger">{postsError}</p>
                        <button type="button" onClick={loadPosts} className="mt-3 text-accent underline">Reintentar</button>
                    </div>
                )}
                {postsStatus === "ready" && !posts.length && <p className="py-10 text-center text-ink-muted">Aún no hay publicaciones. ¡Sé el primero en publicar!</p>}
                {posts.map((post) => (
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
                        aria-label="Crear publicación"
                        className="fixed bottom-8 right-8 sm:bottom-12 sm:right-12 w-14 h-14 bg-linear-to-r from-brand to-accent rounded-full flex items-center justify-center text-on-brand z-40 hover:scale-110 transition-transform"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalAbierto && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className="w-full max-w-2xl relative"
                        >
                            <button
                                onClick={() => setModalAbierto(false)}
                                className="absolute -top-12 right-0 md:-right-12 md:top-0 text-ink-muted hover:text-ink bg-surface rounded-full p-2 transition-colors z-50 border border-line"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <CreatePost onDone={() => setModalAbierto(false)} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

export default Feed;