import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { useAppData } from "../context/AppDataContext";

function Publicacion({ modal = false }) {
    const { postId } = useParams();
    const { posts, addComment } = useAppData();
    const [comment, setComment] = useState("");
    const navigate = useNavigate();
    const post = posts.find((item) => String(item.id) === postId);

    useEffect(() => {
        if (!modal) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") navigate(-1);
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [modal, navigate]);

    if (!post) {
        return (
            <section className="mx-auto max-w-2xl py-12 text-center">
                <h1 className="text-2xl font-bold text-text-title-dark">Publicación no encontrada</h1>
                <Link to="/feed" className="mt-4 inline-block text-neon-blue hover:underline">Volver al feed</Link>
            </section>
        );
    }

    const submitComment = (event) => {
        event.preventDefault();
        const value = comment.trim();
        if (!value) return;
        addComment(post.id, value);
        setComment("");
    };

    const close = () => {
        if (modal) navigate(-1);
        else navigate("/feed");
    };

    const containerClass = modal
        ? "fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
        : "mx-auto w-full max-w-3xl";
    const panelClass = modal
        ? "relative flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border-dark bg-bg-deep shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl"
        : "w-full";

    return (
        <div className={containerClass} onMouseDown={modal ? (event) => { if (event.target === event.currentTarget) close(); } : undefined}>
        <section role={modal ? "dialog" : undefined} aria-modal={modal || undefined} aria-labelledby="publication-title" className={panelClass}>
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border-dark px-4 py-3 sm:px-6">
                <button type="button" onClick={close} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neon-blue/50 bg-primary/20 px-4 font-bold text-neon-blue transition hover:bg-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-blue">
                    <span aria-hidden="true">&larr;</span>{modal ? "Volver al feed" : "Regresar al feed"}
                </button>
                {modal && <button type="button" onClick={close} aria-label="Cerrar publicación" className="flex h-11 w-11 items-center justify-center rounded-lg text-text-muted-dark hover:bg-surface-dark hover:text-text-title-dark focus-visible:outline-2 focus-visible:outline-neon-blue"><span aria-hidden="true" className="text-2xl">&times;</span></button>}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <h1 id="publication-title" className="sr-only">Publicación de {post.autor}</h1>
            <PostCard post={post} />
            <section className="settings-section mt-6">
                <h1 className="text-xl font-bold text-text-title-dark">Comentarios <span className="text-text-muted-dark">({post.comentarios?.length || 0})</span></h1>
                <form onSubmit={submitComment} className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <label htmlFor="comment-input" className="sr-only">Escribe un comentario</label>
                    <textarea id="comment-input" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={2} placeholder="Escribe un comentario..." className="form-input min-h-12 flex-1 resize-y" />
                    <button type="submit" disabled={!comment.trim()} className="action-button disabled:cursor-not-allowed disabled:opacity-50">Comentar</button>
                </form>
                <div className="mt-6 divide-y divide-border-dark">
                    {post.comentarios?.length ? post.comentarios.map((item) => (
                        <article key={item.id} className="flex gap-3 py-4 first:pt-0">
                            <img src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.alias || item.autor)}&background=003366&color=fff`} alt="" className="h-10 w-10 shrink-0 rounded-full border border-border-dark object-cover" />
                            <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="font-semibold text-text-title-dark">@{item.alias || item.autor}</h2>
                                <time className="text-xs text-text-muted-dark">{item.fecha}</time>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-text-body-dark">{item.texto}</p>
                            </div>
                        </article>
                    )) : <p className="py-6 text-text-muted-dark">Aún no hay comentarios. Inicia la conversación.</p>}
                </div>
            </section>
            </div>
        </section>
        </div>
    );
}

export default Publicacion;
