import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { youtubeId } from "../api/client";
import CreatePost from "./CreatePost";

// onPostChange / onPostDeleted: para listas que no son el feed (perfil, detalle)
function PostCard({ post, onPostChange, onPostDeleted }) {
    const { autor, avatar, fecha, titulo, contenido, imagen, videoUrl, likes, comentarios, liked } = post;
    const { toggleLike, deletePost, user } = useAppData();
    const location = useLocation();
    const navigate = useNavigate();
    const [editando, setEditando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const esAutor = user.id === post.authorId;
    const esStaff = user.rol === "Administrador" || user.rol === "Moderador";
    const videoId = youtubeId(videoUrl);

    const handleLike = async () => {
        if (procesando) return;
        setProcesando(true);
        try {
            const resultado = await toggleLike(post.id);
            onPostChange?.({ ...post, ...resultado });
        } catch (err) {
            window.alert(err.message);
        } finally {
            setProcesando(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("¿Eliminar esta publicación?")) return;
        try {
            await deletePost(post.id);
            onPostDeleted?.(post.id);
            if (location.pathname.startsWith("/publicacion/")) navigate("/feed", { replace: true });
        } catch (err) {
            window.alert(err.message);
        }
    };

    const handleEdited = (actualizado) => {
        setEditando(false);
        onPostChange?.(actualizado);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-dark/50 border border-border-dark rounded-2xl shadow-[0_5px_15px_rgba(0,0,0,0.3)] mb-6 overflow-hidden"
        >
            {imagen && (
                <div className="relative w-full h-64 sm:h-72">
                    <img
                        src={imagen}
                        alt="Contenido de la publicación"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-bg-deep/90 via-bg-deep/30 to-transparent"></div>

                    {titulo && (
                        <h2 className="absolute top-4 left-6 right-6 text-2xl sm:text-3xl font-bold text-white drop-shadow-md">
                            {titulo}
                        </h2>
                    )}
                </div>
            )}

            <div className="p-6">
                {!imagen && titulo && (
                    <h2 className="text-2xl sm:text-3xl font-bold text-text-title-dark mb-4">
                        {titulo}
                    </h2>
                )}

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <img
                            src={avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(autor) + "&background=003366&color=fff"}
                            alt={autor}
                            className="w-10 h-10 rounded-full object-cover border border-border-dark"
                        />
                        <div>
                            <h3 className="text-sm font-bold text-text-title-dark">{autor}</h3>
                            <p className="text-xs text-text-muted-dark">{fecha}</p>
                        </div>
                    </div>

                </div>

                <p className="text-text-body-dark text-sm sm:text-base whitespace-pre-wrap mb-6">
                    {contenido}
                </p>

                {videoId && (
                    <div className="relative mb-6 w-full overflow-hidden rounded-xl border border-border-dark pt-[56.25%]">
                        <iframe
                            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                            title={`Video de ${titulo || autor}`}
                            className="absolute inset-0 h-full w-full"
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                        />
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-4 border-t border-border-dark pt-4">
                    <button type="button" disabled={procesando} aria-label={liked ? "Quitar me gusta" : "Dar me gusta"} aria-pressed={Boolean(liked)} onClick={handleLike} className={`flex min-h-11 items-center gap-2 transition-colors ${liked ? "text-neon-red" : "text-text-muted-dark hover:text-neon-blue"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-sm font-semibold">{likes}</span>
                    </button>
                    <Link to={`/publicacion/${post.id}`} state={{ backgroundLocation: location }} aria-label={`Ver ${comentarios ?? 0} comentarios`} className="flex min-h-11 items-center gap-2 text-text-muted-dark transition-colors hover:text-neon-blue">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm font-semibold">{comentarios ?? 0}</span>
                    </Link>
                    {esAutor && <button type="button" onClick={() => setEditando(true)} className="ml-auto min-h-11 rounded-lg px-3 text-sm font-semibold text-neon-blue transition-colors hover:bg-primary/10" aria-label={`Editar publicación ${titulo || ""}`}>Editar</button>}
                    {(esAutor || esStaff) && <button type="button" onClick={handleDelete} className={`${esAutor ? "" : "ml-auto "}min-h-11 rounded-lg px-3 text-sm font-semibold text-neon-red transition-colors hover:bg-secondary/10`} aria-label={`Eliminar publicación de ${autor}`}>Eliminar publicación</button>}
                </div>
            </div>

            {/* Portal: la tarjeta tiene transform/overflow que atraparían un modal fixed */}
            {createPortal(<AnimatePresence>
                {editando && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className="w-full max-w-2xl relative"
                        >
                            <button
                                type="button"
                                onClick={() => setEditando(false)}
                                aria-label="Cerrar edición"
                                className="absolute -top-12 right-0 md:-right-12 md:top-0 text-text-muted-dark hover:text-white bg-surface-dark rounded-full p-2 transition-colors z-50 border border-border-dark"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <CreatePost post={post} onDone={handleEdited} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>, document.body)}
        </motion.div>
    );
}

export default PostCard;
