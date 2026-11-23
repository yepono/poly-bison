import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Editor para recortar la foto de perfil: arrastrar para mover, rueda/pellizco o
// deslizador para hacer zoom, botón para girar 90°. Entrega un File cuadrado
// (SALIDA_PX x SALIDA_PX) en WebP, o JPEG si el navegador no codifica WebP.

const SALIDA_PX = 512;
const ZOOM_MAX = 4;
const PASO_TECLADO = 12; // px por pulsación de flecha

async function decodificar(file) {
    // createImageBitmap respeta la orientación EXIF (fotos de celular)
    if ("createImageBitmap" in window) {
        try {
            return await createImageBitmap(file, { imageOrientation: "from-image" });
        } catch { /* si falla, se usa el método con <img> */ }
    }
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
    } finally {
        URL.revokeObjectURL(url);
    }
}

const anchoDe = (fuente) => fuente.naturalWidth ?? fuente.width;
const altoDe = (fuente) => fuente.naturalHeight ?? fuente.height;

function rotar90(fuente) {
    const w = anchoDe(fuente), h = altoDe(fuente);
    const lienzo = document.createElement("canvas");
    lienzo.width = h;
    lienzo.height = w;
    const ctx = lienzo.getContext("2d");
    ctx.translate(h, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(fuente, 0, 0);
    return lienzo;
}

// Mantiene la imagen cubriendo todo el recorte (sin huecos en los bordes)
function limitar(pos, fuente, escala, lado) {
    const maxX = Math.max(0, (anchoDe(fuente) * escala - lado) / 2);
    const maxY = Math.max(0, (altoDe(fuente) * escala - lado) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, pos.x)), y: Math.min(maxY, Math.max(-maxY, pos.y)) };
}

function dibujar(ctx, fuente, lado, escala, pos) {
    const w = anchoDe(fuente) * escala;
    const h = altoDe(fuente) * escala;
    ctx.drawImage(fuente, lado / 2 - w / 2 + pos.x, lado / 2 - h / 2 + pos.y, w, h);
}

const aBlob = (lienzo, tipo) => new Promise((resolve) => lienzo.toBlob(resolve, tipo, 0.9));

// Recibe la imagen elegida, una función para cancelar y otra que recibe el recorte terminado
// (si regresa una promesa, el botón dice "Guardando…" mientras termina).
function AvatarCropper({ file, onCancel, onConfirm }) {
    const contenedor = useRef(null);
    const lienzo = useRef(null);
    const punteros = useRef(new Map());
    const pellizco = useRef(null);

    const [fuente, setFuente] = useState(null);
    const [error, setError] = useState("");
    const [lado, setLado] = useState(0);         // tamaño en px CSS del área de recorte
    const [zoom, setZoom] = useState(1);         // 1 = la imagen apenas cubre el recorte
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [guardando, setGuardando] = useState(false);

    const escalaBase = fuente && lado ? Math.max(lado / anchoDe(fuente), lado / altoDe(fuente)) : 1;
    const escala = escalaBase * zoom;

    // Decodificar la imagen
    useEffect(() => {
        let cancelado = false;
        decodificar(file)
            .then((img) => { if (!cancelado) setFuente(img); })
            .catch(() => { if (!cancelado) setError("No se pudo leer la imagen. Prueba con otra."); });
        return () => { cancelado = true; };
    }, [file]);

    // Tamaño responsivo del área de recorte
    useEffect(() => {
        const el = contenedor.current;
        if (!el) return undefined;
        const obs = new ResizeObserver(([entrada]) => setLado(Math.round(entrada.contentRect.width)));
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // Redibujar la vista previa
    useEffect(() => {
        const c = lienzo.current;
        if (!c || !fuente || !lado) return;
        const dpr = window.devicePixelRatio || 1;
        c.width = lado * dpr;
        c.height = lado * dpr;
        const ctx = c.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingQuality = "high";
        ctx.clearRect(0, 0, lado, lado);
        dibujar(ctx, fuente, lado, escala, limitar(pos, fuente, escala, lado));
    }, [fuente, lado, escala, pos]);

    // Cambia el zoom manteniendo fijo el punto (px, py) del recorte (relativo al centro)
    const aplicarZoom = useCallback((nuevoZoom, px = 0, py = 0) => {
        if (!fuente || !lado) return;
        const z = Math.min(ZOOM_MAX, Math.max(1, nuevoZoom));
        const factor = z / zoom;
        setZoom(z);
        setPos((p) => limitar({ x: px - (px - p.x) * factor, y: py - (py - p.y) * factor }, fuente, escalaBase * z, lado));
    }, [fuente, lado, zoom, escalaBase]);

    const mover = (dx, dy) => setPos((p) => limitar({ x: p.x + dx, y: p.y + dy }, fuente, escala, lado));

    // Con un dedo o el ratón se mueve la imagen; con dos dedos se hace zoom
    const relativo = (e) => {
        const r = lienzo.current.getBoundingClientRect();
        return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
    };

    const onPointerDown = (e) => {
        if (!fuente) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        punteros.current.set(e.pointerId, relativo(e));
        if (punteros.current.size === 2) {
            const [a, b] = [...punteros.current.values()];
            pellizco.current = { distancia: Math.hypot(a.x - b.x, a.y - b.y), zoom };
        }
    };

    const onPointerMove = (e) => {
        const anterior = punteros.current.get(e.pointerId);
        if (!anterior) return;
        const actual = relativo(e);
        punteros.current.set(e.pointerId, actual);
        if (punteros.current.size === 2 && pellizco.current) {
            const [a, b] = [...punteros.current.values()];
            const distancia = Math.hypot(a.x - b.x, a.y - b.y);
            aplicarZoom(pellizco.current.zoom * (distancia / pellizco.current.distancia), (a.x + b.x) / 2, (a.y + b.y) / 2);
        } else if (punteros.current.size === 1) {
            mover(actual.x - anterior.x, actual.y - anterior.y);
        }
    };

    const onPointerUp = (e) => {
        punteros.current.delete(e.pointerId);
        if (punteros.current.size < 2) pellizco.current = null;
    };

    // Rueda: se registra a mano porque React la añade como pasiva y no deja preventDefault
    useEffect(() => {
        const c = lienzo.current;
        if (!c) return undefined;
        const onWheel = (e) => {
            e.preventDefault();
            const r = c.getBoundingClientRect();
            aplicarZoom(zoom * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
        };
        c.addEventListener("wheel", onWheel, { passive: false });
        return () => c.removeEventListener("wheel", onWheel);
    }, [aplicarZoom, zoom]);

    // Teclado: Esc cierra; flechas mueven; +/- zoom
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && !guardando) onCancel();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onCancel, guardando]);

    // Evita que la página de fondo se desplace mientras el modal está abierto
    useEffect(() => {
        const previo = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previo; };
    }, []);

    const onKeyDownLienzo = (e) => {
        const teclas = {
            ArrowLeft: () => mover(PASO_TECLADO, 0),
            ArrowRight: () => mover(-PASO_TECLADO, 0),
            ArrowUp: () => mover(0, PASO_TECLADO),
            ArrowDown: () => mover(0, -PASO_TECLADO),
            "+": () => aplicarZoom(zoom + 0.1),
            "=": () => aplicarZoom(zoom + 0.1),
            "-": () => aplicarZoom(zoom - 0.1),
        };
        if (teclas[e.key]) {
            e.preventDefault();
            teclas[e.key]();
        }
    };

    const girar = () => {
        setFuente((f) => rotar90(f));
        setZoom(1);
        setPos({ x: 0, y: 0 });
    };

    const reiniciar = () => {
        setZoom(1);
        setPos({ x: 0, y: 0 });
    };

    const confirmar = async () => {
        if (!fuente || !lado) return;
        setGuardando(true);
        setError("");
        try {
            const salida = document.createElement("canvas");
            salida.width = SALIDA_PX;
            salida.height = SALIDA_PX;
            const ctx = salida.getContext("2d");
            ctx.imageSmoothingQuality = "high";
            const k = SALIDA_PX / lado;
            ctx.scale(k, k);
            dibujar(ctx, fuente, lado, escala, limitar(pos, fuente, escala, lado));

            let blob = await aBlob(salida, "image/webp");
            if (!blob || blob.type !== "image/webp") {
                // Safari antiguo no codifica WebP: JPEG con fondo blanco (sin transparencia)
                const jpeg = document.createElement("canvas");
                jpeg.width = SALIDA_PX;
                jpeg.height = SALIDA_PX;
                const j = jpeg.getContext("2d");
                j.fillStyle = "#ffffff";
                j.fillRect(0, 0, SALIDA_PX, SALIDA_PX);
                j.drawImage(salida, 0, 0);
                blob = await aBlob(jpeg, "image/jpeg");
            }
            if (!blob) throw new Error("No se pudo procesar la imagen.");
            const extension = blob.type === "image/webp" ? "webp" : "jpg";
            await onConfirm(new File([blob], `avatar.${extension}`, { type: blob.type }));
        } catch (err) {
            setError(err.message || "No se pudo guardar la foto.");
            setGuardando(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[120] flex items-end justify-center bg-scrim p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) onCancel(); }}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cropper-titulo"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-pop sm:rounded-2xl"
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 id="cropper-titulo" className="text-lg font-bold text-ink">Ajusta tu foto</h2>
                        <p className="text-sm text-ink-muted">Arrastra para encuadrar y usa el zoom.</p>
                    </div>
                    <button type="button" onClick={onCancel} disabled={guardando} aria-label="Cancelar" className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-50">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Área de recorte: cuadrado con máscara circular (así se verá el avatar) */}
                <div ref={contenedor} className="relative mx-auto aspect-square w-full max-w-80 overflow-hidden rounded-xl bg-field">
                    <canvas
                        ref={lienzo}
                        tabIndex={0}
                        aria-label="Vista previa del recorte. Usa las flechas para mover y + / - para el zoom."
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        onKeyDown={onKeyDownLienzo}
                        className="absolute inset-0 h-full w-full cursor-grab touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full"
                        style={{ boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)", outline: "2px solid rgb(255 255 255 / 0.85)", outlineOffset: "-2px" }}
                    />
                    {!fuente && !error && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
                        </div>
                    )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <button type="button" onClick={() => aplicarZoom(zoom - 0.25)} disabled={!fuente || zoom <= 1} aria-label="Alejar" className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-field hover:text-ink disabled:opacity-40">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeWidth={2} d="M5 12h14" /></svg>
                    </button>
                    <input
                        type="range"
                        min={1}
                        max={ZOOM_MAX}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => aplicarZoom(Number(e.target.value))}
                        disabled={!fuente}
                        aria-label="Zoom"
                        className="flex-1 accent-accent"
                    />
                    <button type="button" onClick={() => aplicarZoom(zoom + 0.25)} disabled={!fuente || zoom >= ZOOM_MAX} aria-label="Acercar" className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-field hover:text-ink disabled:opacity-40">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeWidth={2} d="M12 5v14M5 12h14" /></svg>
                    </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                    <button type="button" onClick={girar} disabled={!fuente || guardando} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-field hover:text-ink disabled:opacity-40">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M5.1 15a7 7 0 1 0 1.4-7.6L4 9" /></svg>
                        Girar
                    </button>
                    <button type="button" onClick={reiniciar} disabled={!fuente || guardando} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-field hover:text-ink disabled:opacity-40">
                        Restablecer
                    </button>
                </div>

                {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} disabled={guardando} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-field hover:text-ink disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={confirmar} disabled={!fuente || guardando} className="action-button">
                        {guardando ? "Guardando…" : "Guardar foto"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default AvatarCropper;
