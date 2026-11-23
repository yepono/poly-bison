import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import PostComposerBar from "../components/PostComposerBar";
import PostSkeleton from "../components/PostSkeleton";
import FeedSidebar from "../components/FeedSidebar";
import PageHeader from "../components/PageHeader";
import { useAppData } from "../context/AppDataContext";

// Formulario de publicación en un modal (lo abren la barra superior y el botón flotante)
function ModalPublicar({ onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        const previo = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previo; };
    }, [onClose]);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-scrim backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-publicar"
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.2 }}
                className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-canvas sm:rounded-2xl"
            >
                <div className="flex items-center justify-between border-b border-line bg-surface/50 px-6 py-4">
                    <h2 id="titulo-publicar" className="text-lg font-bold text-ink">Crear publicación</h2>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full border border-line p-2 text-ink-muted transition-colors hover:text-ink">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <CreatePost enModal autoFocus onDone={onClose} />
            </motion.div>
        </motion.div>
    );
}

function Feed() {
    const { posts, postsStatus, postsError, loadPosts } = useAppData();
    const [mostrarBotonFlotante, setMostrarBotonFlotante] = useState(false);
    const [modalAbierto, setModalAbierto] = useState(false);
    const cerrarModal = useCallback(() => setModalAbierto(false), []);

    useEffect(() => {
        const manejarScroll = () => setMostrarBotonFlotante(window.scrollY > 300);
        window.addEventListener("scroll", manejarScroll, { passive: true });
        return () => window.removeEventListener("scroll", manejarScroll);
    }, []);

    return (
        <div className="pagina-ancha">
            <PageHeader titulo="Feed global" subtitulo="Lo que está pasando en la facultad." />

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                    <PostComposerBar onOpen={() => setModalAbierto(true)} />

                    {postsStatus === "loading" && (
                        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando publicaciones">
                            <PostSkeleton />
                            <PostSkeleton />
                        </div>
                    )}
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

                <FeedSidebar />
            </div>

            <AnimatePresence>
                {mostrarBotonFlotante && !modalAbierto && (
                    <motion.button
                        type="button"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setModalAbierto(true)}
                        aria-label="Crear publicación"
                        className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-on-brand shadow-pop hover:bg-brand-hover transition-transform hover:scale-110 sm:bottom-12 sm:right-12"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalAbierto && <ModalPublicar onClose={cerrarModal} />}
            </AnimatePresence>
        </div>
    );
}

export default Feed;
