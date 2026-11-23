import { useState } from "react";

// Foto de perfil con respaldo local de iniciales.
// Antes se usaba ui-avatars.com, que enviaba el nombre de cada usuario a un servicio externo.

function iniciales(nombre) {
    const partes = String(nombre || "?").trim().split(/[\s._-]+/).filter(Boolean);
    const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : (partes[0] || "?").slice(0, 2);
    return letras.toUpperCase();
}

/**
 * @param src       URL de la foto (vacía -> iniciales)
 * @param nombre    para las iniciales y el texto alternativo
 * @param className tamaño/borde (p. ej. "h-10 w-10 border border-line")
 * @param decorativo true si junto al avatar ya aparece el nombre (alt vacío)
 */
function Avatar({ src, nombre, className = "h-10 w-10", decorativo = false }) {
    // Si la foto falla (borrada, sin conexión) se cae a las iniciales
    const [fallo, setFallo] = useState(null);
    const alt = decorativo ? "" : `Foto de ${nombre}`;

    if (src && fallo !== src) {
        return <img src={src} alt={alt} onError={() => setFallo(src)} className={`shrink-0 rounded-full object-cover ${className}`} />;
    }
    return (
        <span
            role={decorativo ? undefined : "img"}
            aria-label={decorativo ? undefined : alt}
            aria-hidden={decorativo || undefined}
            className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-brand font-display font-semibold text-on-brand [container-type:size] ${className}`}
        >
            <span className="text-[40cqh] leading-none">{iniciales(nombre)}</span>
        </span>
    );
}

export default Avatar;
