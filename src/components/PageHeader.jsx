// Encabezado común de todas las páginas internas: mismo tamaño de título, subtítulo y
// lugar para acciones a la derecha. Anchos estándar en index.css: .pagina-angosta (3xl),
// .pagina-media (5xl) y .pagina-ancha (6xl).
function PageHeader({ titulo, subtitulo, acciones, children }) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
                <h1 className="theme-glow text-2xl font-bold text-ink sm:text-3xl">{titulo}</h1>
                {subtitulo && <p className="mt-1 text-ink-muted">{subtitulo}</p>}
            </div>
            {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
            {children}
        </header>
    );
}

export default PageHeader;
