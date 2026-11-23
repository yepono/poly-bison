// Interruptor sí/no para cambios de un solo valor que se guardan al momento (p. ej. "Visible")
function Interruptor({ activo, onCambiar, etiqueta, deshabilitado = false }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={activo}
            aria-label={etiqueta}
            disabled={deshabilitado}
            onClick={() => onCambiar(!activo)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60 ${activo ? "border-accent bg-accent" : "border-line bg-field"}`}
        >
            <span
                aria-hidden="true"
                className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${activo ? "translate-x-5.5" : "translate-x-0.5"}`}
            />
        </button>
    );
}

export default Interruptor;
