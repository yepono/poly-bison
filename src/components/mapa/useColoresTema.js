import { useEffect, useState } from "react";
import { TIPOS } from "../../utils/mapaDatos";

const TOKENS_BASE = ["--canvas", "--surface", "--field", "--line", "--ink", "--ink-soft", "--ink-muted", "--brand", "--accent"];

function leerColores() {
    const cs = getComputedStyle(document.documentElement);
    const leer = (token) => cs.getPropertyValue(token).trim() || "#888888";
    const base = Object.fromEntries(TOKENS_BASE.map((t) => [t, leer(t)]));
    const tipos = Object.fromEntries(Object.entries(TIPOS).map(([tipo, token]) => [tipo, leer(token)]));
    return { ...base, tipos, tema: document.documentElement.dataset.theme || "dark" };
}

// Lee los tokens de color del tema actual (themes.css) y se actualiza al cambiar data-theme.
// three.js no entiende var(--x), así que pasamos los valores ya resueltos.
export function useColoresTema() {
    const [colores, setColores] = useState(leerColores);

    useEffect(() => {
        const obs = new MutationObserver(() => setColores(leerColores()));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
        return () => obs.disconnect();
    }, []);

    return colores;
}
