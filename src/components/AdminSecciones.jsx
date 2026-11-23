// Secciones del panel de administración conectadas a la API (Paso 5).
// Mismo marcado y clases que tenían en Admin.jsx; solo cambia el origen de datos.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDialogos } from "./Dialogos";
import CustomSelect from "./CustomSelect";
import { api, formatDia, formatFechaHora, formatHora, formatPrecio, formatRangoFechaHora, formatRangoHoras, mapProducto, toDateTimeLocal, validarImagen } from "../api/client";

const EVENT_TYPES = ["Académico", "Examen", "Asueto", "Cultural", "Deportivo"];

// Franja de cifras neutra (misma idea que las cifras del perfil). Reemplaza las tarjetas con
// borde de color, que no se usaban en ningún otro lugar de la app.
export function FranjaCifras({ cifras, cargando = false, etiqueta }) {
    return (
        <dl className="stat-strip" aria-label={etiqueta} aria-busy={cargando || undefined}>
            {cifras.map(({ etiqueta: nombre, valor, detalle }) => (
                <div key={nombre} title={detalle}>
                    <dt>{nombre}</dt>
                    <dd>{cargando ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-field align-middle" aria-hidden="true" /> : valor}</dd>
                </div>
            ))}
        </dl>
    );
}

function Tarjeta({ titulo, detalle, acciones, children }) {
    return (
        <section className="settings-section">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-ink">{titulo}</h2>
                    {detalle && <p className="mt-0.5 text-sm text-ink-muted">{detalle}</p>}
                </div>
                {acciones}
            </div>
            <div className="mt-5">{children}</div>
        </section>
    );
}

function FilasCargando({ filas = 4 }) {
    return (
        <div className="space-y-4" aria-hidden="true">
            {Array.from({ length: filas }, (_, i) => (
                <div key={i} className="space-y-2">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-field" />
                    <div className="h-3 animate-pulse rounded bg-field" style={{ width: `${85 - i * 15}%` }} />
                </div>
            ))}
        </div>
    );
}

// Estados de cuenta -> colores de estado (reservados para esto), siempre con etiqueta y cifra
const ESTADOS = [
    { campo: "usuarios_activos", nombre: "Aprobados", color: "bg-success" },
    { campo: "pendientes", nombre: "Pendientes", color: "bg-warning" },
    { campo: "rechazados", nombre: "Rechazados", color: "bg-ink-muted" },
    { campo: "baneados", nombre: "Baneados", color: "bg-danger" },
];

// Barra horizontal de una sola serie con etiqueta directa del valor
function BarraValor({ valor, maximo, texto }) {
    const ancho = maximo ? Math.max((valor / maximo) * 100, valor ? 2 : 0) : 0;
    return (
        <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 rounded-full bg-field">
                <div className="h-2.5 rounded-full bg-accent" style={{ width: `${ancho}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">{texto ?? valor}</span>
        </div>
    );
}

// ---------- Resumen / Dashboard (solo Administrador, Paso 6) ----------
// Datos: reportes.php -> vw_resumen_usuarios, vw_usuarios_mas_activos,
// vw_publicaciones_mayor_interaccion
export function AdminResumen({ setNotice, onIrA }) {
    const [resumen, setResumen] = useState(null);
    const [masActivos, setMasActivos] = useState(null);
    const [mayorInteraccion, setMayorInteraccion] = useState(null);
    const [fallo, setFallo] = useState(false);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            api("reportes", "resumen"),
            api("reportes", "mas_activos"),
            api("reportes", "mayor_interaccion"),
        ])
            .then(([r, activos, interaccion]) => {
                if (cancelled) return;
                setResumen(r.resumen);
                setMasActivos(activos.usuarios);
                setMayorInteraccion(interaccion.publicaciones);
            })
            .catch((err) => { if (!cancelled) { setFallo(true); setNotice(err.message); } });
        return () => { cancelled = true; };
    }, [setNotice]);

    if (fallo) {
        return <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">No se pudo cargar el resumen. Recarga la página para intentarlo de nuevo.</p>;
    }

    const cargando = resumen === null;
    const r = resumen ?? {};
    const num = (campo) => Number(r[campo]) || 0;

    const porEstado = ESTADOS.map((e) => ({ ...e, total: num(e.campo) }));
    const totalUsuarios = porEstado.reduce((suma, item) => suma + item.total, 0);
    const pct = (n) => (totalUsuarios ? Math.round((n / totalUsuarios) * 100) : 0);
    const maxPosts = Math.max(1, ...(masActivos ?? []).map((u) => Number(u.total_publicaciones) || 0));
    const interaccion = (p) => (Number(p.total_likes) || 0) + (Number(p.total_comentarios) || 0);
    const maxInteraccion = Math.max(1, ...(mayorInteraccion ?? []).map(interaccion));

    return <>
        <FranjaCifras etiqueta="Cifras generales" cargando={cargando} cifras={[
            { etiqueta: "Alumnos", valor: num("total_estudiantes"), detalle: "Cuentas estudiantiles" },
            { etiqueta: "Activos", valor: num("usuarios_activos"), detalle: "Estatus aprobado" },
            { etiqueta: "Pendientes", valor: num("pendientes"), detalle: "Requieren revisión" },
            { etiqueta: "Baneados", valor: num("baneados"), detalle: "Cuentas restringidas" },
            { etiqueta: "Staff", valor: num("administradores"), detalle: "Administradores y moderadores" },
            { etiqueta: "Publicaciones", valor: num("publicaciones_activas"), detalle: "Visibles en el feed" },
            { etiqueta: "Reservaciones", valor: num("reservaciones_activas"), detalle: "Aulas apartadas" },
        ]} />

        {!cargando && num("pendientes") > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
                <svg className="h-5 w-5 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <p className="flex-1 text-sm text-ink"><b>{num("pendientes")} {num("pendientes") === 1 ? "cuenta espera" : "cuentas esperan"} revisión.</b> Apruébalas o recházalas desde Estudiantes.</p>
                {onIrA && <button type="button" onClick={() => onIrA("Estudiantes", "Pendiente")} className="action-button text-sm">Revisar ahora</button>}
            </div>
        )}

        <Tarjeta titulo="Usuarios por estado" detalle={cargando ? "Cargando..." : `${totalUsuarios} cuentas (sin incluir eliminadas)`}>
            {cargando ? <FilasCargando filas={1} /> : <>
                {/* Barra 100% apilada: proporción de cada estado; separación de 2px entre tramos */}
                <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-field" aria-hidden="true">
                    {porEstado.filter((e) => e.total).map((e) => (
                        <div key={e.campo} className={`${e.color} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${pct(e.total)}%`, minWidth: 4 }} title={`${e.nombre}: ${e.total} (${pct(e.total)}%)`} />
                    ))}
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {porEstado.map((e) => (
                        <li key={e.campo} className="flex items-start gap-2">
                            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.color}`} aria-hidden="true" />
                            <span>
                                <span className="block text-sm text-ink-soft">{e.nombre}</span>
                                <span className="text-lg font-bold tabular-nums text-ink">{e.total}</span>
                                <span className="ml-1.5 text-xs text-ink-muted">{pct(e.total)}%</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </>}
        </Tarjeta>

        <div className="grid gap-5 xl:grid-cols-2">
            <Tarjeta titulo="Usuarios más activos" detalle="Por número de publicaciones">
                {masActivos === null ? <FilasCargando /> : !masActivos.length ? <p className="text-sm text-ink-muted">Aún no hay actividad.</p> : (
                    <ol className="space-y-4">
                        {masActivos.map((u, i) => (
                            <li key={u.id_usuario}>
                                <div className="mb-1 flex items-baseline gap-2 text-sm">
                                    <span className="w-5 shrink-0 tabular-nums text-ink-muted">{i + 1}.</span>
                                    <Link to={`/perfil/${u.id_usuario}`} className="min-w-0 truncate font-semibold text-ink hover:text-accent hover:underline">@{u.alias}</Link>
                                </div>
                                <div className="pl-7"><BarraValor valor={Number(u.total_publicaciones) || 0} maximo={maxPosts} texto={`${u.total_publicaciones} posts`} /></div>
                            </li>
                        ))}
                    </ol>
                )}
            </Tarjeta>
            <Tarjeta titulo="Publicaciones con mayor interacción" detalle="Me gusta + comentarios">
                {mayorInteraccion === null ? <FilasCargando /> : !mayorInteraccion.length ? <p className="text-sm text-ink-muted">Aún no hay publicaciones.</p> : (
                    <ol className="space-y-4">
                        {mayorInteraccion.map((p) => (
                            <li key={p.id_publicacion}>
                                <Link to={`/publicacion/${p.id_publicacion}`} className="line-clamp-1 text-sm font-semibold text-ink hover:text-accent hover:underline">{p.titulo}</Link>
                                <p className="mb-1 text-xs text-ink-muted">@{p.alias} · {p.total_likes} me gusta · {p.total_comentarios} comentarios</p>
                                <BarraValor valor={interaccion(p)} maximo={maxInteraccion} />
                            </li>
                        ))}
                    </ol>
                )}
            </Tarjeta>
        </div>
    </>;
}

// ---------- Bitácora (solo Administrador, D18) ----------
// Datos: reportes.php?accion=bitacora -> vw_bitacora (Event_Log que llenan los triggers)
export function AdminBitacora({ search, setSearch, setNotice }) {
    const [registros, setRegistros] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api("reportes", "bitacora")
            .then((response) => { if (!cancelled) setRegistros(response.registros); })
            .catch((err) => { if (!cancelled) { setRegistros([]); setNotice(err.message); } });
        return () => { cancelled = true; };
    }, [setNotice]);

    const lista = (registros ?? []).filter((item) => `${item.accion} ${item.detalle || ""} ${item.realizado_por}`.toLowerCase().includes(search.toLowerCase()));

    return <section className="settings-section"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-ink">Bitácora del sistema</h2><p className="mt-1 text-sm text-ink-muted">{registros === null ? "Cargando..." : `Últimos ${registros.length} movimientos registrados`}</p></div><label className="form-label w-full sm:max-w-sm">Buscar<input className="form-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Acción, detalle o usuario"/></label></div><div className="admin-table-wrap mt-4"><table className="admin-table"><thead><tr><th>Fecha</th><th>Acción</th><th>Detalle</th><th>Realizado por</th></tr></thead><tbody>{lista.map((item) => <tr key={item.id_log}><td className="whitespace-nowrap">{formatFechaHora(item.fecha)}</td><td>{item.accion}<small>{item.tabla_afectada}{item.id_registro_afectado ? ` #${item.id_registro_afectado}` : ""}</small></td><td>{item.detalle}</td><td>{item.realizado_por === "Sistema" ? "Sistema" : `@${item.realizado_por}`}</td></tr>)}</tbody></table>{registros !== null && !lista.length && <p className="p-6 text-center text-ink-muted">No hay movimientos que coincidan.</p>}</div></section>;
}
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRECIO = /^\d{1,6}(\.\d{1,2})?$/;

// ---------- Rentas: historial global (Administrador y Moderador) ----------
export function AdminRentas({ search, setSearch, setNotice }) {
    const [reservations, setReservations] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api("reservaciones", "historial")
            .then((response) => { if (!cancelled) setReservations(response.reservaciones); })
            .catch((err) => { if (!cancelled) { setReservations([]); setNotice(err.message); } });
        return () => { cancelled = true; };
    }, [setNotice]);

    const lista = (reservations ?? []).filter((item) => `${item.aula} ${item.alias} ${item.matricula || ""} ${item.codigo_ticket}`.toLowerCase().includes(search.toLowerCase()));

    return <section className="settings-section"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-ink">Historial global de rentas de aulas</h2><p className="mt-1 text-sm text-ink-muted">{reservations === null ? "Cargando..." : `${reservations.length} reservaciones registradas`}</p></div><label className="form-label w-full sm:max-w-sm">Buscar usuario, aula o ticket<input className="form-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Alias, matrícula, aula o ticket"/></label></div><div className="admin-table-wrap mt-4"><table className="admin-table"><thead><tr><th>Aula</th><th>Usuario</th><th>Matrícula</th><th>Fecha</th><th>Horario</th><th>Ticket</th><th>Estado</th></tr></thead><tbody>{lista.map((item) => <tr key={item.id_reservacion}><td>{item.aula}<small>{item.total_asistentes} asistente(s)</small></td><td>@{item.alias}</td><td>{item.matricula || "-"}</td><td className="whitespace-nowrap">{formatDia(item.fecha_reserva)}</td><td className="whitespace-nowrap">{formatRangoHoras(item.hora_inicio, item.hora_fin)}</td><td className="font-mono">{item.codigo_ticket}</td><td>{item.estado}</td></tr>)}</tbody></table>{reservations !== null && !lista.length && <p className="p-6 text-center text-ink-muted">No hay reservaciones que coincidan.</p>}</div></section>;
}

// ---------- Horarios (solo Administrador, D9) ----------
export function AdminHorarios({ setNotice }) {
    const { pedirTexto } = useDialogos();
    const [bloques, setBloques] = useState([]);

    const cargar = useCallback(() => {
        return api("reservaciones", "bloques", { params: { todos: 1 } })
            .then((response) => setBloques(response.bloques))
            .catch((err) => setNotice(err.message));
    }, [setNotice]);

    useEffect(() => { cargar(); }, [cargar]);

    const ejecutar = async (accion, body, mensaje) => {
        try {
            await api("reservaciones", accion, { method: "POST", body });
            setNotice(mensaje);
            await cargar();
        } catch (err) {
            setNotice(err.message);
        }
    };

    const agregar = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const start = form.elements.start.value;
        const end = form.elements.end.value;
        if (!HORA.test(start) || !HORA.test(end) || end <= start) {
            setNotice("La hora de fin debe ser posterior a la de inicio.");
            return;
        }
        ejecutar("bloque_crear", { hora_inicio: start, hora_fin: end }, "Horario agregado.").then(() => form.reset());
    };

    const editar = async (bloque) => {
        const actual = `${formatHora(bloque.hora_inicio)} - ${formatHora(bloque.hora_fin)}`;
        const replacement = await pedirTexto({
            titulo: "Editar horario",
            etiqueta: "Bloque (HH:MM - HH:MM)",
            valor: actual,
            maxLength: 13,
            validar: (texto) => {
                const match = texto.match(/^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/);
                if (!match) return "Formato no válido. Usa HH:MM - HH:MM, por ejemplo 07:00 - 08:00.";
                const [inicio, fin] = texto.split(" - ");
                return fin <= inicio ? "La hora de fin debe ser posterior a la de inicio." : "";
            },
        });
        if (replacement === null || replacement === actual) return;
        const [inicio, fin] = replacement.split(" - ");
        ejecutar("bloque_editar", { id_bloque: bloque.id_bloque, hora_inicio: inicio, hora_fin: fin }, "Horario actualizado.");
    };

    return <section className="settings-section"><h2 className="text-lg font-bold text-ink">Editar horarios disponibles</h2><p className="mt-1 text-sm text-ink-muted">Los horarios activos se ofrecen en Reserva de Aulas. Un horario con reservaciones no se puede editar: desactívalo y crea uno nuevo.</p><form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={agregar}><label className="form-label">Agregar bloque<input required name="start" type="time" className="form-input"/></label><label className="form-label">Fin<input required name="end" type="time" className="form-input"/></label><button className="action-button">Agregar horario</button></form><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{bloques.map((bloque) => { const slot = formatRangoHoras(bloque.hora_inicio, bloque.hora_fin); return <div key={bloque.id_bloque} className={`flex items-center justify-between gap-3 rounded-lg border border-line bg-field p-3 ${bloque.activo ? "" : "opacity-60"}`}><span className="font-semibold text-ink">{slot}{!bloque.activo && <small className="block text-xs font-normal text-ink-muted">Inactivo</small>}</span><div><button type="button" onClick={() => editar(bloque)} aria-label={`Editar ${slot}`} className="min-h-11 rounded-md px-3 text-accent hover:bg-brand/10">Editar</button>{bloque.activo ? <button type="button" onClick={() => ejecutar("bloque_desactivar", { id_bloque: bloque.id_bloque }, "Horario desactivado.")} aria-label={`Desactivar ${slot}`} className="min-h-11 rounded-md px-3 text-danger hover:bg-danger/10">Desactivar</button> : <button type="button" onClick={() => ejecutar("bloque_activar", { id_bloque: bloque.id_bloque }, "Horario activado.")} aria-label={`Activar ${slot}`} className="min-h-11 rounded-md px-3 text-accent hover:bg-brand/10">Activar</button>}</div></div>; })}</div></section>;
}

// ---------- Tienda (solo Administrador, D10) ----------
const productoVacio = { titulo: "", precio: "", id_categoria: "", stock: "0", descripcionCorta: "" };

// Mensaje de error de los campos de un producto, o ""
function validarProducto({ titulo, precio, stock, descripcionCorta }) {
    if (titulo !== undefined && (!titulo.trim() || titulo.trim().length > 200)) return "El nombre es obligatorio (máximo 200 caracteres).";
    if (precio !== undefined && (!PRECIO.test(String(precio).trim()) || Number(precio) > 999999.99)) return "Escribe un precio válido (máximo 2 decimales).";
    if (stock !== undefined && (!/^\d+$/.test(String(stock).trim()) || Number(stock) > 100000)) return "El stock debe ser un número entero entre 0 y 100000.";
    if (descripcionCorta !== undefined && descripcionCorta.trim().length > 500) return "La descripción no puede tener más de 500 caracteres.";
    return "";
}

export function AdminTienda({ setNotice }) {
    const { confirmar } = useDialogos();
    const [products, setProducts] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [productForm, setProductForm] = useState(productoVacio);
    const [imagen, setImagen] = useState(null);
    const [borradores, setBorradores] = useState({}); // ediciones por fila sin guardar
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(() => {
        return api("productos", "listar")
            .then((response) => setProducts(response.productos.map(mapProducto)))
            .catch((err) => setNotice(err.message));
    }, [setNotice]);

    useEffect(() => {
        cargar();
        api("productos", "categorias")
            .then((response) => setCategorias(response.categorias))
            .catch((err) => setNotice(err.message));
    }, [cargar, setNotice]);

    const createProduct = async (event) => {
        event.preventDefault();
        const problema = validarProducto(productForm) || (!productForm.id_categoria ? "Selecciona una categoría." : "") || validarImagen(imagen);
        if (problema) {
            setNotice(problema);
            return;
        }
        const body = new FormData();
        body.append("nombre", productForm.titulo.trim());
        body.append("precio", productForm.precio.trim());
        body.append("id_categoria", productForm.id_categoria);
        body.append("stock", productForm.stock.trim());
        body.append("descripcion", productForm.descripcionCorta.trim());
        if (imagen) body.append("imagen", imagen);
        setGuardando(true);
        try {
            await api("productos", "crear", { method: "POST", body });
            setProductForm(productoVacio);
            setImagen(null);
            event.target.reset();
            setNotice("Artículo agregado al catálogo.");
            await cargar();
        } catch (err) {
            setNotice(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const valor = (product, campo) => borradores[product.id]?.[campo] ?? ({
        titulo: product.titulo,
        descripcionCorta: product.descripcionCorta,
        precio: product.precioValor,
        stock: String(product.stock),
    })[campo];

    const cambiar = (product, campo, nuevo) => setBorradores((current) => ({ ...current, [product.id]: { ...current[product.id], [campo]: nuevo } }));

    const guardarFila = async (product) => {
        const cambios = borradores[product.id] || {};
        const problema = validarProducto(cambios);
        if (problema) {
            setNotice(problema);
            return;
        }
        const body = new FormData();
        body.append("id_producto", product.id);
        if (cambios.titulo !== undefined) body.append("nombre", cambios.titulo.trim());
        if (cambios.descripcionCorta !== undefined) body.append("descripcion", cambios.descripcionCorta.trim());
        if (cambios.precio !== undefined) body.append("precio", String(cambios.precio).trim());
        if (cambios.stock !== undefined) body.append("stock", String(cambios.stock).trim());
        try {
            await api("productos", "editar", { method: "POST", body });
            setBorradores((current) => { const resto = { ...current }; delete resto[product.id]; return resto; });
            setNotice("Producto actualizado.");
            await cargar();
        } catch (err) {
            setNotice(err.message);
        }
    };

    const cambiarImagen = async (product, file) => {
        const problema = validarImagen(file);
        if (!file || problema) {
            if (problema) setNotice(problema);
            return;
        }
        const body = new FormData();
        body.append("id_producto", product.id);
        body.append("imagen", file);
        try {
            await api("productos", "editar", { method: "POST", body });
            setNotice("Imagen actualizada.");
            await cargar();
        } catch (err) {
            setNotice(err.message);
        }
    };

    const desactivar = async (product) => {
        if (!(await confirmar({ titulo: "¿Eliminar del catálogo?", mensaje: `"${product.titulo}" dejará de mostrarse en la Bisontstore.`, accion: "Eliminar", peligro: true }))) return;
        try {
            await api("productos", "desactivar", { method: "POST", body: { id_producto: product.id } });
            setNotice("Producto eliminado del catálogo.");
            await cargar();
        } catch (err) {
            setNotice(err.message);
        }
    };

    return <section className="space-y-5"><section className="settings-section"><h2 className="text-lg font-bold text-ink">Agregar artículo</h2><form onSubmit={createProduct} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate><label className="form-label">Nombre<input required maxLength={200} className="form-input" value={productForm.titulo} onChange={(event) => setProductForm({ ...productForm, titulo: event.target.value })}/></label><label className="form-label">Precio<input required type="number" min="0" max="999999.99" step="0.01" className="form-input" value={productForm.precio} onChange={(event) => setProductForm({ ...productForm, precio: event.target.value })}/></label><CustomSelect label="Categoría" value={productForm.id_categoria} onChange={(id_categoria) => setProductForm({ ...productForm, id_categoria })} placeholder="Selecciona una categoría" options={categorias.map((categoria) => ({ value: String(categoria.id_categoria), label: categoria.nombre }))} /><label className="form-label">Stock<input required type="number" min="0" max="100000" step="1" className="form-input" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })}/></label><label className="form-label">Descripción breve<input maxLength={500} className="form-input" value={productForm.descripcionCorta} onChange={(event) => setProductForm({ ...productForm, descripcionCorta: event.target.value })}/></label><label className="form-label">Imagen (JPG, PNG o WebP, máx. 2 MB)<input type="file" accept="image/jpeg,image/png,image/webp" className="form-input" onChange={(event) => setImagen(event.target.files?.[0] ?? null)}/></label><button disabled={guardando} className="action-button sm:col-span-2 sm:justify-self-start">{guardando ? "Guardando..." : "Agregar artículo"}</button></form></section><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio / Stock</th><th>Acción</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><input aria-label={`Nombre ${product.titulo}`} maxLength={200} className="form-input min-w-44" value={valor(product, "titulo")} onChange={(event) => cambiar(product, "titulo", event.target.value)}/><input aria-label={`Descripción ${product.titulo}`} maxLength={500} className="form-input mt-2 min-w-44" value={valor(product, "descripcionCorta")} onChange={(event) => cambiar(product, "descripcionCorta", event.target.value)}/></td><td>{product.categoria}<small>{product.tieneFoto ? "Con imagen" : "Sin imagen"}</small></td><td><input aria-label={`Precio ${product.titulo}`} type="number" min="0" step="0.01" className="form-input min-w-28" value={valor(product, "precio")} onChange={(event) => cambiar(product, "precio", event.target.value)}/><small>{formatPrecio(product.precioValor)}</small><input aria-label={`Stock ${product.titulo}`} type="number" min="0" step="1" className="form-input mt-2 min-w-28" value={valor(product, "stock")} onChange={(event) => cambiar(product, "stock", event.target.value)}/></td><td><div className="flex flex-col gap-2"><button type="button" disabled={!borradores[product.id]} className="min-h-11 px-3 text-accent disabled:opacity-40" onClick={() => guardarFila(product)}>Guardar</button><label className="min-h-11 cursor-pointer px-3 py-2.5 text-center text-accent">Imagen<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { cambiarImagen(product, event.target.files?.[0]); event.target.value = ""; }}/></label><button type="button" className="min-h-11 px-3 text-danger" onClick={() => desactivar(product)}>Eliminar</button></div></td></tr>)}</tbody></table>{!products.length && <p className="p-6 text-center text-ink-muted">Aún no hay productos.</p>}</div></section>;
}

// ---------- Eventos (Administrador y Moderador, D15) ----------
const eventoVacio = { titulo: "", descripcion: "", tipo: "Académico", fecha_inicio: "", fecha_fin: "", lugar: "" };

function validarEvento(evento) {
    if (evento.titulo !== undefined && (!evento.titulo.trim() || evento.titulo.trim().length > 200)) return "El título es obligatorio (máximo 200 caracteres).";
    if (evento.descripcion !== undefined && evento.descripcion.trim().length > 1000) return "La descripción no puede tener más de 1000 caracteres.";
    if (evento.lugar !== undefined && evento.lugar.trim().length > 150) return "El lugar no puede tener más de 150 caracteres.";
    if (evento.fecha_inicio !== undefined && !evento.fecha_inicio) return "Indica la fecha de inicio.";
    if (evento.fecha_fin !== undefined && !evento.fecha_fin) return "Indica la fecha de fin.";
    if (evento.fecha_inicio && evento.fecha_fin && evento.fecha_fin < evento.fecha_inicio) return "La fecha de fin del evento debe ser posterior a la fecha de inicio.";
    return "";
}

// Editar inicio, fin y lugar de un evento en un solo formulario (antes eran tres window.prompt)
function DialogoFechaEvento({ evento, onGuardar, onCerrar }) {
    const [inicio, setInicio] = useState(toDateTimeLocal(evento.fecha_inicio));
    const [fin, setFin] = useState(toDateTimeLocal(evento.fecha_fin));
    const [lugar, setLugar] = useState(evento.lugar || "");
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onCerrar(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onCerrar]);

    const enviar = async (e) => {
        e.preventDefault();
        if (!inicio || !fin) return setError("Indica el inicio y el fin.");
        if (fin < inicio) return setError("La fecha de fin debe ser posterior a la fecha de inicio.");
        setGuardando(true);
        await onGuardar({ inicio, fin, lugar });
        setGuardando(false);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-scrim p-4 backdrop-blur-sm sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
            <form onSubmit={enviar} role="dialog" aria-modal="true" aria-labelledby="fecha-evento-titulo" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-pop" noValidate>
                <h2 id="fecha-evento-titulo" className="text-lg font-bold text-ink">Fecha y lugar</h2>
                <p className="mt-1 line-clamp-1 text-sm text-ink-muted">{evento.titulo}</p>
                <div className="mt-4 grid gap-4">
                    <label className="form-label">Inicio<input autoFocus type="datetime-local" className="form-input" value={inicio} onChange={(e) => { setInicio(e.target.value); setError(""); }} /></label>
                    <label className="form-label">Fin<input type="datetime-local" min={inicio || undefined} className="form-input" value={fin} onChange={(e) => { setFin(e.target.value); setError(""); }} /></label>
                    <label className="form-label">Lugar<input maxLength={150} className="form-input" value={lugar} onChange={(e) => setLugar(e.target.value)} /></label>
                </div>
                {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onCerrar} className="action-button action-button-secondary">Cancelar</button>
                    <button disabled={guardando} className="action-button">{guardando ? "Guardando..." : "Guardar"}</button>
                </div>
            </form>
        </div>
    );
}

export function AdminEventos({ setNotice }) {
    const { confirmar } = useDialogos();
    const [editandoFecha, setEditandoFecha] = useState(null); // evento cuyo horario/lugar se edita
    const [events, setEvents] = useState([]);
    const [eventForm, setEventForm] = useState(eventoVacio);
    const [borradores, setBorradores] = useState({});
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(() => {
        return api("eventos", "admin_listar")
            .then((response) => setEvents(response.eventos))
            .catch((err) => setNotice(err.message));
    }, [setNotice]);

    useEffect(() => { cargar(); }, [cargar]);

    const ejecutar = async (accion, body, mensaje) => {
        try {
            await api("eventos", accion, { method: "POST", body });
            setNotice(mensaje);
            await cargar();
            return true;
        } catch (err) {
            setNotice(err.message);
            return false;
        }
    };

    const createEvent = async (event) => {
        event.preventDefault();
        const problema = validarEvento(eventForm);
        if (problema) {
            setNotice(problema);
            return;
        }
        setGuardando(true);
        const ok = await ejecutar("crear", {
            titulo: eventForm.titulo.trim(),
            descripcion: eventForm.descripcion.trim(),
            tipo: eventForm.tipo,
            fecha_inicio: eventForm.fecha_inicio,
            fecha_fin: eventForm.fecha_fin,
            lugar: eventForm.lugar.trim(),
        }, "Evento agregado al calendario.");
        if (ok) setEventForm(eventoVacio);
        setGuardando(false);
    };

    const valor = (item, campo) => borradores[item.id_evento]?.[campo] ?? item[campo] ?? "";
    const cambiar = (item, campo, nuevo) => setBorradores((current) => ({ ...current, [item.id_evento]: { ...current[item.id_evento], [campo]: nuevo } }));

    const guardarFila = async (item) => {
        const cambios = borradores[item.id_evento] || {};
        const problema = validarEvento(cambios);
        if (problema) {
            setNotice(problema);
            return;
        }
        const body = { id_evento: item.id_evento };
        if (cambios.titulo !== undefined) body.titulo = cambios.titulo.trim();
        if (cambios.descripcion !== undefined) body.descripcion = cambios.descripcion.trim();
        if (await ejecutar("editar", body, "Evento actualizado.")) {
            setBorradores((current) => { const resto = { ...current }; delete resto[item.id_evento]; return resto; });
        }
    };

    const guardarFechaLugar = async ({ inicio, fin, lugar }) => {
        const item = editandoFecha;
        if (await ejecutar("editar", { id_evento: item.id_evento, fecha_inicio: inicio, fecha_fin: fin, lugar: lugar.trim() }, "Evento actualizado.")) setEditandoFecha(null);
    };

    const eliminar = async (item) => {
        if (!(await confirmar({ titulo: "¿Eliminar el evento?", mensaje: `"${item.titulo}" se quitará del calendario. Esta acción no se puede deshacer.`, accion: "Eliminar", peligro: true }))) return;
        ejecutar("eliminar", { id_evento: item.id_evento }, "Evento eliminado.");
    };

    return <section className="space-y-5"><section className="settings-section"><h2 className="text-lg font-bold text-ink">Publicar evento</h2><form onSubmit={createEvent} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate><label className="form-label">Título<input required maxLength={200} className="form-input" value={eventForm.titulo} onChange={(event) => setEventForm({ ...eventForm, titulo: event.target.value })}/></label><CustomSelect label="Tipo" value={eventForm.tipo} onChange={(tipo) => setEventForm({ ...eventForm, tipo })} options={EVENT_TYPES.map((type) => ({ value: type, label: type }))} /><label className="form-label">Inicio<input required type="datetime-local" className="form-input" value={eventForm.fecha_inicio} onChange={(event) => setEventForm({ ...eventForm, fecha_inicio: event.target.value })}/></label><label className="form-label">Fin<input required type="datetime-local" min={eventForm.fecha_inicio || undefined} className="form-input" value={eventForm.fecha_fin} onChange={(event) => setEventForm({ ...eventForm, fecha_fin: event.target.value })}/></label><label className="form-label">Lugar<input maxLength={150} className="form-input" value={eventForm.lugar} onChange={(event) => setEventForm({ ...eventForm, lugar: event.target.value })}/></label><label className="form-label">Descripción<input maxLength={1000} className="form-input" value={eventForm.descripcion} onChange={(event) => setEventForm({ ...eventForm, descripcion: event.target.value })}/></label><button disabled={guardando} className="action-button sm:col-span-2 sm:justify-self-start">{guardando ? "Guardando..." : "Agregar evento"}</button></form></section><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Evento</th><th>Fecha</th><th>Lugar</th><th>Visible</th><th>Acción</th></tr></thead><tbody>{events.map((item) => <tr key={item.id_evento}><td><input aria-label={`Título ${item.titulo}`} maxLength={200} className="form-input min-w-44" value={valor(item, "titulo")} onChange={(event) => cambiar(item, "titulo", event.target.value)}/><small>{item.tipo}</small><input aria-label={`Descripción ${item.titulo}`} maxLength={1000} className="form-input mt-2 min-w-44" value={valor(item, "descripcion")} onChange={(event) => cambiar(item, "descripcion", event.target.value)}/></td><td className="whitespace-nowrap">{formatRangoFechaHora(item.fecha_inicio, item.fecha_fin)}</td><td>{item.lugar}</td><td>{item.visible ? "Sí" : "No"}</td><td><div className="flex flex-col gap-2"><button type="button" disabled={!borradores[item.id_evento]} className="min-h-11 px-2 text-accent disabled:opacity-40" onClick={() => guardarFila(item)}>Guardar</button><button type="button" className="min-h-11 px-2 text-accent" onClick={() => ejecutar(item.visible ? "ocultar" : "mostrar", { id_evento: item.id_evento }, item.visible ? "Evento oculto." : "Evento visible.")}>{item.visible ? "Ocultar" : "Mostrar"}</button><button type="button" className="min-h-11 px-2 text-danger" onClick={() => eliminar(item)}>Eliminar</button><button type="button" className="min-h-11 px-2 text-accent" onClick={() => setEditandoFecha(item)}>Editar fecha/lugar</button></div></td></tr>)}</tbody></table>{!events.length && <p className="p-6 text-center text-ink-muted">Aún no hay eventos.</p>}</div>{editandoFecha && <DialogoFechaEvento evento={editandoFecha} onGuardar={guardarFechaLugar} onCerrar={() => setEditandoFecha(null)} />}</section>;
}
