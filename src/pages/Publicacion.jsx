import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";
import { useAppData } from "../context/AppDataContext";
import { api, mapComentario, mapPost } from "../api/client";
import { useDialogos } from "../components/Dialogos";
import PostSkeleton from "../components/PostSkeleton";
import { Cargando, EsqueletoLista, EstadoError, EstadoVacio } from "../components/Estados";

const COMENTARIO_MAX = 500;

function Publicacion({ modal = false }) {
    const { postId } = useParams();
    const { confirmar } = useDialogos();
    const { user, posts, setPostCommentCount } = useAppData();
    const [comment, setComment] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [errorComentario, setErrorComentario] = useState("");
    const [detalle, setDetalle] = useState(null);
    const [comentarios, setComentarios] = useState(null);
    const [intento, setIntento] = useState(0); // "Reintentar" en los comentarios
    const navigate = useNavigate();
    const esStaff = user.rol === "Administrador" || user.rol === "Moderador";

    const postDelFeed = posts.find((item) => String(item.id) === postId);
    const post = postDelFeed ?? (detalle?.id === postId ? detalle.post : undefined);
    const cargandoPost = !postDelFeed && detalle?.id !== postId;

    useEffect(() => {
        if (!modal) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") navigate(-1);
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [modal, navigate]);

    // Publicación (si no está en el feed cargado)
    useEffect(() => {
        if (postDelFeed) return undefined;
        let cancelled = false;
        api("publicaciones", "detalle", { params: { id: postId } })
            .then((response) => { if (!cancelled) setDetalle({ id: postId, post: mapPost(response.publicacion) }); })
            .catch(() => { if (!cancelled) setDetalle({ id: postId, post: null }); });
        return () => { cancelled = true; };
    }, [postId, postDelFeed]);

    // Comentarios
    useEffect(() => {
        let cancelled = false;
        api("comentarios", "listar", { params: { id_publicacion: postId } })
            .then((response) => { if (!cancelled) setComentarios({ id: postId, lista: response.comentarios.map(mapComentario), error: "" }); })
            .catch((err) => { if (!cancelled) setComentarios({ id: postId, lista: [], error: err.message }); });
        return () => { cancelled = true; };
    }, [postId, intento]);

    const comentariosListos = comentarios?.id === postId;
    const listaComentarios = comentariosListos ? comentarios.lista : [];

    if (cargandoPost) {
        return (
            <section className="mx-auto w-full max-w-3xl">
                <Cargando etiqueta="Cargando publicación">
                    <PostSkeleton />
                    <div className="card mt-6"><EsqueletoLista filas={2} avatar /></div>
                </Cargando>
            </section>
        );
    }

    if (!post) {
        return (
            <section className="mx-auto max-w-2xl py-12 text-center">
                <h1 className="text-2xl font-bold text-ink">Publicación no encontrada</h1>
                <Link to="/feed" className="mt-4 inline-block text-accent hover:underline">Volver al feed</Link>
            </section>
        );
    }

    // Mantiene sincronizados el detalle local y el conteo del feed
    const actualizarConteo = (total) => {
        setPostCommentCount(post.id, total);
        if (!postDelFeed) setDetalle({ id: postId, post: { ...post, comentarios: total } });
    };

    const submitComment = async (event) => {
        event.preventDefault();
        setErrorComentario("");
        const value = comment.trim();
        if (!value) return;
        if (value.length > COMENTARIO_MAX) {
            setErrorComentario(`El comentario no puede tener más de ${COMENTARIO_MAX} caracteres.`);
            return;
        }
        setEnviando(true);
        try {
            const response = await api("comentarios", "crear", { method: "POST", body: { id_publicacion: post.id, contenido: value } });
            const lista = [...listaComentarios, mapComentario(response.comentario)];
            setComentarios({ id: postId, lista, error: "" });
            actualizarConteo(lista.length);
            setComment("");
        } catch (err) {
            setErrorComentario(err.message);
        } finally {
            setEnviando(false);
        }
    };

    const deleteComment = async (item) => {
        if (!(await confirmar({ titulo: "¿Eliminar este comentario?", accion: "Eliminar", peligro: true }))) return;
        try {
            await api("comentarios", "eliminar", { method: "POST", body: { id_comentario: item.id } });
            const lista = listaComentarios.filter((comentario) => comentario.id !== item.id);
            setComentarios({ id: postId, lista, error: "" });
            actualizarConteo(lista.length);
        } catch (err) {
            setErrorComentario(err.message);
        }
    };

    const close = () => {
        if (modal) navigate(-1);
        else navigate("/feed");
    };

    const containerClass = modal
        ? "fixed inset-0 z-[100] flex items-end justify-center bg-scrim p-0 backdrop-blur-sm sm:items-center sm:p-5"
        : "mx-auto w-full max-w-3xl";
    const panelClass = modal
        ? "relative flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-line bg-canvas shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl"
        : "w-full";

    return (
        <div className={containerClass} onMouseDown={modal ? (event) => { if (event.target === event.currentTarget) close(); } : undefined}>
        <section role={modal ? "dialog" : undefined} aria-modal={modal || undefined} aria-labelledby="publication-title" className={panelClass}>
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
                <button type="button" onClick={close} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent/50 bg-brand/20 px-4 font-bold text-accent transition hover:bg-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                    <span aria-hidden="true">&larr;</span>{modal ? "Volver al feed" : "Regresar al feed"}
                </button>
                {modal && <button type="button" onClick={close} aria-label="Cerrar publicación" className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"><span aria-hidden="true" className="text-2xl">&times;</span></button>}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <h1 id="publication-title" className="sr-only">Publicación de {post.autor}</h1>
            <PostCard post={post} onPostChange={postDelFeed ? undefined : (actualizado) => setDetalle({ id: postId, post: actualizado })} />
            <section className="settings-section mt-6">
                <h2 className="text-xl font-bold text-ink">Comentarios {comentariosListos && <span className="text-ink-muted">({listaComentarios.length})</span>}</h2>
                <form onSubmit={submitComment} className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <label htmlFor="comment-input" className="sr-only">Escribe un comentario</label>
                    <textarea id="comment-input" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={COMENTARIO_MAX} rows={2} placeholder="Escribe un comentario..." className="form-input min-h-12 flex-1 resize-y" />
                    <button type="submit" disabled={!comment.trim() || enviando} className="action-button">{enviando ? "Enviando..." : "Comentar"}</button>
                </form>
                {errorComentario && <p role="alert" className="mt-3 text-sm text-danger">{errorComentario}</p>}
                <div className="mt-6 divide-y divide-line">
                    {!comentariosListos ? <Cargando etiqueta="Cargando comentarios"><EsqueletoLista filas={2} avatar /></Cargando>
                    : comentarios.error ? <EstadoError compacto mensaje="No se pudieron cargar los comentarios." onReintentar={() => { setComentarios(null); setIntento((n) => n + 1); }} />
                    : listaComentarios.length ? listaComentarios.map((item) => (
                        <article key={item.id} className="flex gap-3 py-4 first:pt-0">
                            <Avatar src={item.avatar} nombre={item.alias || item.autor} decorativo className="h-10 w-10 border border-line" />
                            <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="font-semibold text-ink">@{item.alias || item.autor}</h2>
                                <time className="text-xs text-ink-muted">{item.fecha}</time>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-ink-soft">{item.texto}</p>
                            {(item.authorId === user.id || esStaff) && <button type="button" onClick={() => deleteComment(item)} className="mt-2 text-xs font-semibold text-danger hover:underline" aria-label={`Eliminar comentario de ${item.alias}`}>Eliminar</button>}
                            </div>
                        </article>
                    )) : <EstadoVacio compacto icono="comentario" titulo="Aún no hay comentarios" detalle="Inicia la conversación." />}
                </div>
            </section>
            </div>
        </section>
        </div>
    );
}

export default Publicacion;
