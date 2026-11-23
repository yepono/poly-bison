import { useEffect, useState } from "react";
import CustomSelect from "./CustomSelect";
import { useAppData } from "../context/AppDataContext";
import { api, validarImagen, youtubeId } from "../api/client";

const TITULO_MAX = 250;
const CONTENIDO_MAX = 600;

// Crear publicación, o editarla si recibe `post` (solo el autor).
// onDone(post) se llama al guardar correctamente.
function CreatePost({ post = null, onDone }) {
    const { createPost, updatePost } = useAppData();
    const editando = Boolean(post);
    const [etiquetas, setEtiquetas] = useState([]);
    const [titulo, setTitulo] = useState(post?.titulo ?? "");
    const [contenido, setContenido] = useState(post?.contenido ?? "");
    const [etiqueta, setEtiqueta] = useState(post?.idEtiqueta ? String(post.idEtiqueta) : "");
    const [previewURL, setPreviewURL] = useState(post?.imagen ?? null);
    const [imagenArchivo, setImagenArchivo] = useState(null);
    const [videoUrl, setVideoUrl] = useState(post?.videoUrl ?? "");
    const [mostrarVideo, setMostrarVideo] = useState(Boolean(post?.videoUrl));
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    // Catálogo de etiquetas (D6)
    useEffect(() => {
        let cancelled = false;
        api("publicaciones", "etiquetas")
            .then((response) => { if (!cancelled) setEtiquetas(response.etiquetas); })
            .catch((err) => { if (!cancelled) setError(err.message); });
        return () => { cancelled = true; };
    }, []);

    // Etiqueta por defecto al crear: la primera del catálogo (General)
    const etiquetaSeleccionada = etiqueta || (etiquetas[0] ? String(etiquetas[0].id_etiqueta) : "");

    const limpiar = () => {
        setTitulo("");
        setContenido("");
        setPreviewURL(null);
        setImagenArchivo(null);
        setVideoUrl("");
        setMostrarVideo(false);
        setEtiqueta("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const tituloLimpio = titulo.trim();
        const contenidoLimpio = contenido.trim();
        const videoLimpio = videoUrl.trim();

        // Validaciones (las mismas que publicaciones.php)
        if (!tituloLimpio) return setError("El título es obligatorio.");
        if (tituloLimpio.length > TITULO_MAX) return setError(`El título no puede tener más de ${TITULO_MAX} caracteres.`);
        if (!contenidoLimpio) return setError("El contenido es obligatorio.");
        if (contenidoLimpio.length > CONTENIDO_MAX) return setError(`El contenido no puede tener más de ${CONTENIDO_MAX} caracteres.`);
        if (!etiquetaSeleccionada) return setError("Selecciona una etiqueta.");
        if (videoLimpio && !youtubeId(videoLimpio)) return setError("El enlace debe ser un video de YouTube válido.");
        if (videoLimpio && previewURL) return setError("Solo puedes agregar una imagen o un video, no ambos.");

        const body = new FormData();
        body.append("titulo", tituloLimpio);
        body.append("descripcion", contenidoLimpio);
        body.append("id_etiqueta", etiquetaSeleccionada);

        if (!editando) {
            if (imagenArchivo) body.append("imagen", imagenArchivo);
            else if (videoLimpio) body.append("video_url", videoLimpio);
        } else {
            body.append("id_publicacion", post.id);
            const videoCambio = videoLimpio !== (post.videoUrl ?? "");
            if (imagenArchivo) body.append("imagen", imagenArchivo);
            else if (videoCambio && videoLimpio) body.append("video_url", videoLimpio);
            else if ((post.imagen && !previewURL) || (post.videoUrl && !videoLimpio)) body.append("quitar_multimedia", "1");
        }

        setEnviando(true);
        try {
            const guardado = editando ? await updatePost(body) : await createPost(body);
            if (!editando) limpiar();
            onDone?.(guardado);
        } catch (err) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    };

    const handleImagen = (e) => {
        const file = e.target.files[0];
        e.target.value = "";
        if (file) {
            const problema = validarImagen(file);
            if (problema) {
                setError(problema);
                return;
            }
            setError("");
            setImagenArchivo(file);
            setVideoUrl("");
            setMostrarVideo(false);
            const reader = new FileReader();
            reader.onload = () => setPreviewURL(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const removerImagen = () => {
        setPreviewURL(null);
        setImagenArchivo(null);
    };

    const alternarVideo = () => {
        if (mostrarVideo) setVideoUrl("");
        else removerImagen();
        setMostrarVideo(!mostrarVideo);
    };

    return (
        <div className="bg-surface/50 border border-line rounded-2xl p-6 shadow-card mb-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>


                <div className={`relative w-full rounded-xl overflow-hidden transition-all duration-300 ${previewURL ? 'h-64 sm:h-72' : 'h-auto border-b border-line'}`}>

                    {previewURL && (
                        <>
                            <img
                                src={previewURL}
                                alt="Vista previa"
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/30 to-transparent"></div>

                            <button
                                type="button"
                                onClick={removerImagen}
                                aria-label="Quitar imagen"
                                className="absolute top-3 right-3 bg-black/50 hover:bg-danger-solid/80 text-white rounded-full p-2 backdrop-blur-sm transition-colors z-20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </>
                    )}

                    <input
                        type="text"
                        placeholder="Título de la publicación"
                        value={titulo}
                        maxLength={TITULO_MAX}
                        required
                        aria-label="Título de la publicación"
                        onChange={(e) => setTitulo(e.target.value)}
                        className={`w-full bg-transparent font-bold focus:outline-none relative z-10 transition-all
                            ${previewURL
                                ? 'absolute top-4 left-4 right-4 text-2xl sm:text-3xl text-white placeholder-white/70 drop-shadow-md w-[calc(100%-2rem)]'
                                : 'p-2 text-xl sm:text-2xl text-ink placeholder-ink-muted'
                            }`}
                    />
                </div>

                <textarea
                    className="w-full min-h-20 p-2 bg-transparent text-ink placeholder-ink-muted focus:outline-none resize-none custom-scrollbar text-sm sm:text-base"
                    placeholder="¿Qué está pasando en la facultad?"
                    value={contenido}
                    maxLength={CONTENIDO_MAX}
                    required
                    aria-label="Contenido de la publicación"
                    onChange={(e) => setContenido(e.target.value)}
                ></textarea>

                {mostrarVideo && (
                    <input
                        type="url"
                        value={videoUrl}
                        maxLength={500}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Enlace de YouTube (https://www.youtube.com/watch?v=...)"
                        aria-label="Enlace de video de YouTube"
                        className="w-full p-2 bg-transparent border-b border-line text-ink placeholder-ink-muted focus:outline-none text-sm"
                    />
                )}

                {error && <p role="alert" className="text-sm text-danger">{error}</p>}

                <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-line">

                    <div className="flex items-center gap-4 w-full sm:w-auto">

                        <label className="cursor-pointer text-ink-soft hover:text-accent transition-colors flex items-center gap-2 p-2 rounded-lg hover:bg-brand/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-semibold hidden sm:inline">Añadir Foto</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagen} />
                        </label>

                        <button type="button" onClick={alternarVideo} aria-pressed={mostrarVideo} className="cursor-pointer text-ink-soft hover:text-accent transition-colors flex items-center gap-2 p-2 rounded-lg hover:bg-brand/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-semibold hidden sm:inline">{mostrarVideo ? "Quitar video" : "Añadir video"}</span>
                        </button>

                        <div className="w-36 sm:w-40 z-20">
                            <CustomSelect
                                value={etiquetaSeleccionada}
                                onChange={(val) => setEtiqueta(val)}
                                options={etiquetas.map((item) => ({ value: String(item.id_etiqueta), label: item.nombre }))}
                                placeholder="Etiqueta"
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={!contenido.trim() || !titulo.trim() || enviando} className="min-h-11 bg-linear-to-r from-brand to-danger-solid hover:from-brand-hover hover:to-danger-solid-hover text-on-brand font-bold py-2 px-6 rounded-lg transition-colors w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50">
                        {enviando ? "Guardando..." : editando ? "Guardar cambios" : "Publicar"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreatePost;
