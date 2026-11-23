// Colores por tipo de evento. Usan los tokens cal-* (themes.css), así que cambian con el tema.
// Las clases van completas (no se arman con plantillas) para que Tailwind las detecte.

// Etiqueta (chip): fondo suave + texto + borde del color del tipo
export function estilosTipoEvento(tipo) {
    switch (tipo) {
        case "Examen": return "bg-cal-examen/10 text-cal-examen border-cal-examen/40";
        case "Académico": return "bg-cal-academico/10 text-cal-academico border-cal-academico/40";
        case "Asueto": return "bg-cal-asueto/10 text-cal-asueto border-cal-asueto/40";
        case "Cultural": return "bg-cal-cultural/10 text-cal-cultural border-cal-cultural/40";
        case "Deportivo": return "bg-cal-deportivo/10 text-cal-deportivo border-cal-deportivo/40";
        default: return "bg-surface border-line text-ink-soft";
    }
}

// Punto con brillo
export function colorPuntoEvento(tipo) {
    switch (tipo) {
        case "Examen": return "bg-cal-examen shadow-[0_0_5px_var(--cal-examen)]";
        case "Académico": return "bg-cal-academico shadow-[0_0_5px_var(--cal-academico)]";
        case "Asueto": return "bg-cal-asueto shadow-[0_0_5px_var(--cal-asueto)]";
        case "Cultural": return "bg-cal-cultural shadow-[0_0_5px_var(--cal-cultural)]";
        case "Deportivo": return "bg-cal-deportivo shadow-[0_0_5px_var(--cal-deportivo)]";
        default: return "bg-ink-muted";
    }
}
