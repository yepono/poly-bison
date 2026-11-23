import { useEffect, useRef } from "react";

// Fondo animado de las pantallas de acceso (red de nodos + rejilla en perspectiva).
//
// Optimizaciones respecto a la versión anterior:
//  - Sin `filter: drop-shadow` en el <canvas>: el navegador re-filtraba toda la pantalla en
//    cada cuadro. El brillo de cada nodo es ahora un sprite pre-dibujado (drawImage).
//  - Conexiones con una rejilla espacial (solo se comparan nodos de celdas vecinas) en lugar
//    de comparar todos contra todos (O(n²)).
//  - Las líneas se agrupan por opacidad: unos pocos stroke() por cuadro en lugar de uno por línea.
//  - Número de nodos con tope, canvas nítido en pantallas HiDPI (DPR máx. 2), movimiento por
//    tiempo (igual de rápido a 60 o 144 Hz), pausa con la pestaña oculta y un cuadro estático
//    si el usuario prefiere menos movimiento.

const DISTANCIA = 120;          // distancia máxima de conexión (px CSS)
const RADIO_MOUSE = 150;
const AREA_POR_NODO = 11000;    // px² por nodo
const MAX_NODOS = 150;
const VELOCIDAD = 40;           // px por segundo (máx. por eje)
const NIVELES = 4;              // grupos de opacidad para las líneas

// Colores del tema actual (variables CSS de themes.css)
function leerColores() {
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--accent").trim() || "#00bfff";
    const danger = css.getPropertyValue("--danger").trim() || "#ff4d4d";
    return { accent, danger };
}

// "#rrggbb" (o "#rgb") -> "rgba(r, g, b, a)"
function conAlfa(hex, a) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    if (Number.isNaN(n)) return `rgba(0, 191, 255, ${a})`;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Círculo con halo dibujado una sola vez; luego se copia con drawImage
function crearSprite(color, radio, dpr) {
    const halo = radio * 3;
    const lado = Math.ceil(halo * 2 * dpr);
    const c = document.createElement("canvas");
    c.width = c.height = lado;
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    const grad = g.createRadialGradient(halo, halo, 0, halo, halo, halo);
    grad.addColorStop(0, color);
    grad.addColorStop(radio / halo, color);
    grad.addColorStop(radio / halo + 0.05, conAlfa(color, 0.35));
    grad.addColorStop(1, conAlfa(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, halo * 2, halo * 2);
    return { img: c, halo };
}

function NeonBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: true });
        const reducido = window.matchMedia("(prefers-reduced-motion: reduce)");
        let ancho = 0, alto = 0, dpr = 1;
        let nodos = [];
        let sprites = [];
        let colores = leerColores();
        let raf = 0;
        let ultimo = 0;
        const mouse = { x: null, y: null };

        const prepararSprites = () => {
            sprites = [colores.accent, colores.danger].map((color) => [2, 3, 4].map((r) => crearSprite(color, r, dpr)));
        };

        const crearNodo = () => ({
            x: Math.random() * ancho,
            y: Math.random() * alto,
            vx: (Math.random() - 0.5) * 2 * VELOCIDAD,
            vy: (Math.random() - 0.5) * 2 * VELOCIDAD,
            color: Math.random() < 0.5 ? 0 : 1,
            tam: Math.floor(Math.random() * 3),
        });

        const ajustarTamano = () => {
            const anterior = { ancho, alto };
            ancho = window.innerWidth;
            alto = window.innerHeight;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(ancho * dpr);
            canvas.height = Math.round(alto * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            prepararSprites();

            // Conserva los nodos (reescalados) y solo agrega o quita los necesarios
            const objetivo = Math.min(MAX_NODOS, Math.round((ancho * alto) / AREA_POR_NODO));
            if (anterior.ancho) {
                const sx = ancho / anterior.ancho, sy = alto / anterior.alto;
                nodos.forEach((n) => { n.x *= sx; n.y *= sy; });
            }
            while (nodos.length < objetivo) nodos.push(crearNodo());
            nodos.length = objetivo;
        };

        const mover = (dt) => {
            for (const n of nodos) {
                n.x += n.vx * dt;
                n.y += n.vy * dt;
                if (n.x < 0) { n.x = 0; n.vx = Math.abs(n.vx); } else if (n.x > ancho) { n.x = ancho; n.vx = -Math.abs(n.vx); }
                if (n.y < 0) { n.y = 0; n.vy = Math.abs(n.vy); } else if (n.y > alto) { n.y = alto; n.vy = -Math.abs(n.vy); }
            }
        };

        const dibujar = () => {
            ctx.clearRect(0, 0, ancho, alto);

            // Rejilla espacial: celda = distancia de conexión
            const columnas = Math.ceil(ancho / DISTANCIA) + 1;
            const celdas = new Map();
            nodos.forEach((n, i) => {
                const k = Math.floor(n.y / DISTANCIA) * columnas + Math.floor(n.x / DISTANCIA);
                const celda = celdas.get(k);
                if (celda) celda.push(i); else celdas.set(k, [i]);
            });

            // Un trazo por nivel de opacidad
            const trazos = Array.from({ length: NIVELES }, () => new Path2D());
            const D2 = DISTANCIA * DISTANCIA;
            for (let i = 0; i < nodos.length; i++) {
                const a = nodos[i];
                const cx = Math.floor(a.x / DISTANCIA), cy = Math.floor(a.y / DISTANCIA);
                for (let oy = 0; oy <= 1; oy++) {
                    for (let ox = -1; ox <= 1; ox++) {
                        if (oy === 0 && ox < 0) continue; // cada par de celdas una sola vez
                        const celda = celdas.get((cy + oy) * columnas + cx + ox);
                        if (!celda) continue;
                        for (const j of celda) {
                            if (oy === 0 && ox === 0 && j <= i) continue;
                            const b = nodos[j];
                            const dx = a.x - b.x, dy = a.y - b.y;
                            const d2 = dx * dx + dy * dy;
                            if (d2 >= D2) continue;
                            const nivel = Math.min(NIVELES - 1, Math.floor((Math.sqrt(d2) / DISTANCIA) * NIVELES));
                            trazos[nivel].moveTo(a.x, a.y);
                            trazos[nivel].lineTo(b.x, b.y);
                        }
                    }
                }
            }
            ctx.lineWidth = 1;
            ctx.strokeStyle = colores.accent;
            trazos.forEach((trazo, nivel) => {
                ctx.globalAlpha = 0.5 * (1 - (nivel + 0.5) / NIVELES);
                ctx.stroke(trazo);
            });

            // Conexiones con el puntero
            if (mouse.x !== null) {
                const lineas = new Path2D();
                const R2 = RADIO_MOUSE * RADIO_MOUSE;
                for (const n of nodos) {
                    const dx = n.x - mouse.x, dy = n.y - mouse.y;
                    if (dx * dx + dy * dy < R2) { lineas.moveTo(n.x, n.y); lineas.lineTo(mouse.x, mouse.y); }
                }
                ctx.globalAlpha = 0.6;
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = colores.danger;
                ctx.stroke(lineas);
            }

            ctx.globalAlpha = 1;
            for (const n of nodos) {
                const { img, halo } = sprites[n.color][n.tam];
                ctx.drawImage(img, n.x - halo, n.y - halo, halo * 2, halo * 2);
            }
        };

        const cuadro = (ahora) => {
            const dt = Math.min((ahora - ultimo) / 1000, 0.05); // tras una pausa no "salta"
            ultimo = ahora;
            mover(dt);
            dibujar();
            raf = requestAnimationFrame(cuadro);
        };

        const iniciar = () => {
            cancelAnimationFrame(raf);
            if (reducido.matches || document.hidden) { dibujar(); return; }
            ultimo = performance.now();
            raf = requestAnimationFrame(cuadro);
        };

        let esperaResize = 0;
        const onResize = () => {
            clearTimeout(esperaResize);
            esperaResize = setTimeout(() => { ajustarTamano(); if (reducido.matches) dibujar(); }, 120);
        };
        const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
        const onSalir = () => { mouse.x = null; mouse.y = null; };
        const onVisible = () => iniciar();

        // Cambio de tema (html[data-theme]): nuevos colores y sprites
        const observador = new MutationObserver(() => {
            colores = leerColores();
            prepararSprites();
            if (reducido.matches) dibujar();
        });
        observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

        window.addEventListener("resize", onResize);
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onSalir);
        document.addEventListener("visibilitychange", onVisible);
        reducido.addEventListener("change", iniciar);

        ajustarTamano();
        iniciar();

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(esperaResize);
            observador.disconnect();
            window.removeEventListener("resize", onResize);
            window.removeEventListener("pointermove", onMove);
            document.documentElement.removeEventListener("pointerleave", onSalir);
            document.removeEventListener("visibilitychange", onVisible);
            reducido.removeEventListener("change", iniciar);
        };
    }, []);

    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-canvas" aria-hidden="true">
            <div
                className="absolute bottom-0 left-0 h-[40%] w-full opacity-20"
                style={{ backgroundImage: "linear-gradient(transparent 95%, var(--accent) 100%), linear-gradient(90deg, transparent 95%, var(--accent) 100%)", backgroundSize: "40px 40px", transform: "perspective(500px) rotateX(60deg)" }}
            />
            <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
    );
}

export default NeonBackground;
