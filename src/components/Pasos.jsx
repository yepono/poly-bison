// Indicador de pasos (1 — 2 — 3) compartido por Registro y Reserva de aulas
function Pasos({ actual, total = 3, className = "" }) {
    return (
        <ol className={`flex items-center gap-2 ${className}`} aria-label={`Paso ${actual} de ${total}`}>
            {Array.from({ length: total }, (_, i) => i + 1).map((num) => (
                <li key={num} className="flex items-center gap-2" aria-current={actual === num ? "step" : undefined}>
                    <span
                        aria-hidden="true"
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${actual >= num ? "bg-brand text-on-brand shadow-glow-brand" : "border border-line bg-surface text-ink-muted"}`}
                    >
                        {num}
                    </span>
                    {num < total && <span aria-hidden="true" className={`h-0.5 w-8 transition-colors ${actual > num ? "bg-brand" : "bg-line"}`} />}
                </li>
            ))}
        </ol>
    );
}

export default Pasos;
