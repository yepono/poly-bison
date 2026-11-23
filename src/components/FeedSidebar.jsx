import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, parseFechaMySQL } from "../api/client";
import { colorPuntoEvento } from "../utils/eventStyles";

const ACCESOS = [
    ["/aulas", "Reservar aula", "Aulas y horarios disponibles"],
    ["/bisontstore", "Bisontstore", "Mercancía oficial"],
    ["/mapa", "Mapa", "Encuentra tu edificio"],
];

// Columna derecha del feed: próximos eventos y accesos rápidos
function FeedSidebar() {
    const [eventos, setEventos] = useState(null); // null = cargando

    useEffect(() => {
        let cancelled = false;
        const hoy = new Date();
        const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
        api("eventos", "listar", { params: { mes } })
            .then((response) => {
                if (cancelled) return;
                const ahora = new Date();
                setEventos(response.eventos
                    .filter((evento) => parseFechaMySQL(evento.fecha_fin) >= ahora)
                    .sort((a, b) => parseFechaMySQL(a.fecha_inicio) - parseFechaMySQL(b.fecha_inicio))
                    .slice(0, 4));
            })
            .catch(() => { if (!cancelled) setEventos([]); });
        return () => { cancelled = true; };
    }, []);

    return (
        <aside aria-label="Panel lateral" className="hidden flex-col gap-4 lg:sticky lg:top-8 lg:flex lg:self-start">
            <section className="rounded-2xl border border-line bg-surface/50 p-5 shadow-card">
                <h2 className="text-lg font-bold text-ink">Próximos eventos</h2>
                {eventos === null && <p className="mt-3 text-sm text-ink-muted" aria-busy="true">Cargando...</p>}
                {eventos !== null && !eventos.length && <p className="mt-3 text-sm text-ink-muted">No hay eventos próximos este mes.</p>}
                <ul className="mt-3 flex flex-col gap-3">
                    {(eventos ?? []).map((evento) => {
                        const inicio = parseFechaMySQL(evento.fecha_inicio);
                        return (
                            <li key={evento.id_evento} className="flex items-start gap-3">
                                <div className="w-11 shrink-0 rounded-lg border border-line bg-field py-1 text-center">
                                    <span className="block text-lg font-bold leading-none text-ink">{inicio.getDate()}</span>
                                    <span className="block text-2xs uppercase text-ink-muted">{inicio.toLocaleDateString("es-MX", { month: "short" })}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-ink">{evento.titulo}</p>
                                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                                        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${colorPuntoEvento(evento.tipo)}`} />
                                        {evento.tipo}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
                <Link to="/calendario" className="mt-4 block text-sm font-semibold text-accent hover:underline">Ver calendario completo</Link>
            </section>

            <nav aria-label="Accesos rápidos" className="rounded-2xl border border-line bg-surface/50 p-3 shadow-card">
                <h2 className="px-2 pb-2 pt-1 text-lg font-bold text-ink">Accesos rápidos</h2>
                {ACCESOS.map(([to, titulo, detalle]) => (
                    <Link key={to} to={to} className="block rounded-lg px-2 py-2 transition-colors hover:bg-field">
                        <span className="block text-sm font-semibold text-ink">{titulo}</span>
                        <span className="block text-xs text-ink-muted">{detalle}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
}

export default FeedSidebar;
