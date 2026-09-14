import { motion } from "framer-motion";
import TechTag from "./TechTag";

function PostCard({ post }) {
    const { autor, avatar, fecha, titulo, contenido, imagen, etiqueta, likes, comentarios } = post;


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
                            src={avatar || "https://ui-avatars.com/api/?name=" + autor + "&background=003366&color=fff"}
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

                <div className="flex items-center gap-6 pt-4 border-t border-border-dark">
                    <button className="flex items-center gap-2 text-text-muted-dark hover:text-neon-blue transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-sm font-semibold">{likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-text-muted-dark hover:text-neon-blue transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm font-semibold">{comentarios}</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export default PostCard;