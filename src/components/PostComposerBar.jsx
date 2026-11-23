import { useAppData } from "../context/AppDataContext";

// Barra de una línea que abre el formulario de publicación (en un modal).
// Sustituye al formulario completo que antes ocupaba la parte superior del feed.
function PostComposerBar({ onOpen }) {
    const { user } = useAppData();
    const nombre = user.alias || user.nombre;
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=003366&color=fff`;

    return (
        <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface/50 p-4 text-left shadow-card transition-colors hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
            <img src={avatar} alt="" className="h-10 w-10 shrink-0 rounded-full border border-line object-cover" />
            <span className="min-w-0 flex-1 truncate rounded-full border border-line bg-field px-4 py-2.5 text-ink-muted">
                ¿Qué quieres compartir, {nombre}?
            </span>
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </button>
    );
}

export default PostComposerBar;
