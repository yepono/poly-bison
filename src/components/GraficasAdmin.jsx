import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Avatar from "./Avatar";

// Gráficas del Resumen del panel. Reglas de diseño:
//  - Barras finas (10 px) que crecen desde una base, punta redondeada de 4 px, base recta.
//  - El valor va en la punta de la barra; el texto nunca usa el color de la serie.
//  - Dos series -> leyenda siempre visible. Colores de serie: --viz-1 / --viz-2 (validados
//    para daltonismo y contraste en los tres temas). Los colores de estado solo para estados.

// Barra horizontal que crece al montarse. `tramos`: [{ valor, clase }] (uno o varios apilados)
function BarraApilada({ tramos, maximo, etiqueta, descripcion, reservaEtiqueta = "4.5rem" }) {
    const reducido = useReducedMotion();
    const total = tramos.reduce((s, t) => s + t.valor, 0);
    const fraccion = maximo ? total / maximo : 0;
    return (
        <div className="flex items-center gap-2" role="img" aria-label={descripcion}>
            <motion.div
                className="flex h-2.5 min-w-1 gap-0.5 overflow-hidden rounded-r"
                initial={reducido ? false : { width: 0 }}
                animate={{ width: `calc((100% - ${reservaEtiqueta}) * ${fraccion})` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
            >
                {tramos.filter((t) => t.valor > 0).map((t, i) => (
                    <span key={i} className={`h-full ${t.clase}`} style={{ flexGrow: t.valor, flexBasis: 0 }} />
                ))}
            </motion.div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-ink" aria-hidden="true">{etiqueta ?? total}</span>
        </div>
    );
}

// ---------- Dona: usuarios por estado ----------
const RADIO = 60;
const GROSOR = 18;
const CIRC = 2 * Math.PI * RADIO;
const HUECO = 3; // separación entre tramos (px de arco)

/** @param datos [{ clave, nombre, total, color: "var(--success)", punto: "bg-success" }] */
export function DonaEstados({ datos }) {
    const reducido = useReducedMotion();
    const [activo, setActivo] = useState(null);
    const total = datos.reduce((s, d) => s + d.total, 0);
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    const visibles = datos.filter((d) => d.total > 0);
    const conHueco = visibles.length > 1;

    const largos = visibles.map((d) => (d.total / total) * CIRC);
    const tramos = visibles.map((d, i) => ({
        ...d,
        inicio: largos.slice(0, i).reduce((x, y) => x + y, 0),
        largo: Math.max(largos[i] - (conHueco ? HUECO : 0), 1.5),
    }));
    const enfoque = datos.find((d) => d.clave === activo);

    return (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
            <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" role="img" aria-label={`Usuarios por estado: ${datos.map((d) => `${d.nombre} ${d.total}`).join(", ")}`}>
                    <circle cx="80" cy="80" r={RADIO} fill="none" stroke="var(--field)" strokeWidth={GROSOR} />
                    {tramos.map((t, i) => (
                        <motion.circle
                            key={t.clave}
                            cx="80" cy="80" r={RADIO}
                            fill="none"
                            stroke={t.color}
                            strokeWidth={activo === t.clave ? GROSOR + 4 : GROSOR}
                            strokeDasharray={`${t.largo} ${CIRC}`}
                            initial={reducido ? false : { strokeDashoffset: -t.inicio + t.largo, opacity: 0 }}
                            animate={{ strokeDashoffset: -t.inicio, opacity: activo && activo !== t.clave ? 0.35 : 1 }}
                            transition={{ strokeDashoffset: { duration: 0.6, delay: i * 0.12, ease: "easeOut" }, opacity: { duration: 0.15 } }}
                            onMouseEnter={() => setActivo(t.clave)}
                            onMouseLeave={() => setActivo(null)}
                            className="cursor-pointer"
                        />
                    ))}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
                    <span className="text-3xl font-bold tabular-nums text-ink">{enfoque ? enfoque.total : total}</span>
                    <span className="text-xs text-ink-muted">{enfoque ? `${enfoque.nombre} · ${pct(enfoque.total)}%` : "cuentas"}</span>
                </div>
            </div>

            <ul className="grid w-full grid-cols-2 gap-2 lg:grid-cols-4">
                {datos.map((d) => (
                    <li key={d.clave}>
                        <button
                            type="button"
                            onMouseEnter={() => setActivo(d.clave)} onMouseLeave={() => setActivo(null)}
                            onFocus={() => setActivo(d.clave)} onBlur={() => setActivo(null)}
                            onClick={d.onClick}
                            className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${activo === d.clave ? "border-line bg-field" : "border-transparent"} ${d.onClick ? "hover:bg-field" : "cursor-default"}`}
                        >
                            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${d.punto}`} aria-hidden="true" />
                            <span className="min-w-0">
                                <span className="block text-sm text-ink-soft">{d.nombre}</span>
                                <span className="text-xl font-bold tabular-nums text-ink">{d.total}</span>
                                <span className="ml-1.5 text-xs tabular-nums text-ink-muted">{pct(d.total)}%</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ---------- Ranking de usuarios (publicaciones) ----------
export function RankingUsuarios({ usuarios }) {
    const maximo = Math.max(1, ...usuarios.map((u) => Number(u.total_publicaciones) || 0));
    return (
        <ol className="space-y-4">
            {usuarios.map((u, i) => {
                const posts = Number(u.total_publicaciones) || 0;
                return (
                    <li key={u.id_usuario} className="flex items-center gap-3">
                        <span className={`w-5 shrink-0 text-center text-sm font-bold tabular-nums ${i === 0 ? "text-ink" : "text-ink-muted"}`}>{i + 1}</span>
                        <Avatar nombre={u.alias || u.nombre_completo} decorativo className="h-9 w-9 shrink-0 border border-line text-xs" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                                <Link to={`/perfil/${u.id_usuario}`} className="truncate text-sm font-semibold text-ink hover:text-accent hover:underline">@{u.alias}</Link>
                                <span className="shrink-0 text-2xs text-ink-muted">{u.total_likes ?? 0} me gusta · {u.total_comentarios ?? 0} coment.</span>
                            </div>
                            <div className="mt-1">
                                <BarraApilada
                                    tramos={[{ valor: posts, clase: "bg-viz-1" }]}
                                    maximo={maximo}
                                    etiqueta={posts}
                                    reservaEtiqueta="2rem"
                                    descripcion={`@${u.alias}: ${posts} publicaciones`}
                                />
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// ---------- Publicaciones con mayor interacción (me gusta + comentarios apilados) ----------
export function RankingInteraccion({ publicaciones }) {
    const valor = (p) => ({ likes: Number(p.total_likes) || 0, comentarios: Number(p.total_comentarios) || 0 });
    const maximo = Math.max(1, ...publicaciones.map((p) => { const v = valor(p); return v.likes + v.comentarios; }));
    return <>
        <ul className="mb-4 flex gap-4 text-xs text-ink-soft" aria-label="Leyenda">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-viz-1" aria-hidden="true" />Me gusta</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-viz-2" aria-hidden="true" />Comentarios</li>
        </ul>
        <ol className="space-y-4">
            {publicaciones.map((p) => {
                const v = valor(p);
                return (
                    <li key={p.id_publicacion}>
                        <div className="flex items-baseline justify-between gap-2">
                            <Link to={`/publicacion/${p.id_publicacion}`} className="truncate text-sm font-semibold text-ink hover:text-accent hover:underline">{p.titulo}</Link>
                            <span className="shrink-0 text-2xs text-ink-muted">@{p.alias}</span>
                        </div>
                        <div className="mt-1" title={`${v.likes} me gusta · ${v.comentarios} comentarios`}>
                            <BarraApilada
                                tramos={[{ valor: v.likes, clase: "bg-viz-1" }, { valor: v.comentarios, clase: "bg-viz-2" }]}
                                maximo={maximo}
                                reservaEtiqueta="2.5rem"
                                descripcion={`${p.titulo}: ${v.likes} me gusta y ${v.comentarios} comentarios`}
                            />
                        </div>
                        <p className="mt-0.5 text-2xs tabular-nums text-ink-muted">{v.likes} me gusta · {v.comentarios} comentarios</p>
                    </li>
                );
            })}
        </ol>
    </>;
}
