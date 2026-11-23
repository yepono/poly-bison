// Secciones del panel de administración conectadas a la API (Paso 5).
// Mismo marcado y clases que tenían en Admin.jsx; solo cambia el origen de datos.
import { useCallback, useEffect, useState } from "react";
import { api, formatPrecio, mapProducto, parseFechaMySQL, toDateTimeLocal, validarImagen } from "../api/client";

const EVENT_TYPES = ["Académico", "Examen", "Asueto", "Cultural", "Deportivo"];

function Metric({ label, value, detail, tone = "blue" }) {
    return <article className={`admin-metric admin-metric-${tone}`}><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>;
}

// ---------- Resumen / Dashboard ----------
// Datos: reportes.php -> vw_resumen_usuarios, vw_usuarios_mas_activos,
// vw_publicaciones_mayor_interaccion
export function AdminResumen({ setNotice }) {
    const [resumen, setResumen] = useState(null);
    const [masActivos, setMasActivos] = useState([]);
    const [mayorInteraccion, setMayorInteraccion] = useState([]);

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
            .catch((err) => { if (!cancelled) setNotice(err.message); });
        return () => { cancelled = true; };
    }, [setNotice]);

    const r = resumen ?? {};
    const valor = (campo) => (resumen ? r[campo] : "—");

    // Gráfica: una sola serie -> un solo color, sin leyenda; etiqueta directa con el valor
    const porEstado = [
        { estado: "Aprobados", total: r.usuarios_activos ?? 0 },
        { estado: "Pendientes", total: r.pendientes ?? 0 },
        { estado: "Rechazados", total: r.rechazados ?? 0 },
        { estado: "Baneados", total: r.baneados ?? 0 },
    ];
    const totalUsuarios = porEstado.reduce((suma, item) => suma + item.total, 0);
    const maximo = Math.max(1, ...porEstado.map((item) => item.total));

    return <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Alumnos registrados" value={valor("total_estudiantes")} detail="Cuentas estudiantiles" />
            <Metric label="Usuarios activos" value={valor("usuarios_activos")} detail="Estatus aprobado" tone="green" />
            <Metric label="Pendientes" value={valor("pendientes")} detail="Requieren revisión" tone="amber" />
            <Metric label="Baneados" value={valor("baneados")} detail="Cuentas restringidas" tone="red" />
            <Metric label="Administradores" value={valor("administradores")} detail="Admin y moderación" tone="dark" />
            <Metric label="Publicaciones activas" value={valor("publicaciones_activas")} detail="Visibles en el feed" />
            <Metric label="Reservaciones activas" value={valor("reservaciones_activas")} detail="Aulas apartadas" />
        </div>

        <section className="settings-section">
            <h2 className="text-lg font-bold text-text-title-dark">Usuarios por estado</h2>
            <p className="mt-1 text-sm text-text-muted-dark">{totalUsuarios} cuentas (sin incluir eliminadas)</p>
            <div className="mt-5 flex flex-col gap-3" aria-hidden="true">
                {porEstado.map((item) => {
                    const porcentaje = totalUsuarios ? Math.round((item.total / totalUsuarios) * 100) : 0;
                    return (
                        <div key={item.estado} className="group flex items-center gap-3" title={`${item.estado}: ${item.total} (${porcentaje}%)`}>
                            <span className="w-24 shrink-0 text-sm text-text-body-dark">{item.estado}</span>
                            <div className="relative h-4 flex-1">
                                <div
                                    className="h-4 rounded-r bg-neon-blue transition-opacity group-hover:opacity-80"
                                    style={{ width: item.total ? `max(${(item.total / maximo) * 100}%, 4px)` : 0 }}
                                />
                            </div>
                            <span className="w-16 shrink-0 text-right text-sm font-semibold text-text-title-dark">{item.total}<span className="ml-1 text-xs font-normal text-text-muted-dark">{porcentaje}%</span></span>
                        </div>
                    );
                })}
            </div>
            {/* Vista de tabla para lectores de pantalla */}
            <table className="sr-only">
                <caption>Usuarios por estado</caption>
                <thead><tr><th>Estado</th><th>Usuarios</th><th>Porcentaje</th></tr></thead>
                <tbody>{porEstado.map((item) => <tr key={item.estado}><td>{item.estado}</td><td>{item.total}</td><td>{totalUsuarios ? Math.round((item.total / totalUsuarios) * 100) : 0}%</td></tr>)}</tbody>
            </table>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
            <section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Usuarios más activos</h2><div className="mt-4 divide-y divide-border-dark">{masActivos.map((record, index) => <div key={record.id_usuario} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0 truncate text-text-title-dark"><b className="mr-3 text-neon-blue">0{index + 1}</b>{record.alias}</span><span className="shrink-0 font-bold text-text-title-dark">{record.total_publicaciones} posts</span></div>)}{!masActivos.length && <p className="py-3 text-sm text-text-muted-dark">Aún no hay actividad.</p>}</div></section>
            <section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Publicaciones con mayor interacción</h2><div className="mt-4 divide-y divide-border-dark">{mayorInteraccion.map((post) => <div key={post.id_publicacion} className="py-3"><p className="line-clamp-1 font-semibold text-text-title-dark">{post.titulo}</p><p className="mt-1 text-sm text-text-muted-dark">@{post.alias} · {post.total_likes} likes · {post.total_comentarios} comentarios</p></div>)}{!mayorInteraccion.length && <p className="py-3 text-sm text-text-muted-dark">Aún no hay publicaciones.</p>}</div></section>
        </div>
    </>;
}

// ---------- Bitácora ----------
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

    return <section className="settings-section"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-text-title-dark">Bitácora del sistema</h2><p className="mt-1 text-sm text-text-muted-dark">{registros === null ? "Cargando..." : `Últimos ${registros.length} movimientos registrados`}</p></div><label className="form-label w-full sm:max-w-sm">Buscar<input className="form-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Acción, detalle o usuario"/></label></div><div className="admin-table-wrap mt-4"><table className="admin-table"><thead><tr><th>Fecha</th><th>Acción</th><th>Detalle</th><th>Realizado por</th></tr></thead><tbody>{lista.map((item) => <tr key={item.id_log}><td>{parseFechaMySQL(item.fecha).toLocaleString("es-MX")}</td><td>{item.accion}<small>{item.tabla_afectada}{item.id_registro_afectado ? ` #${item.id_registro_afectado}` : ""}</small></td><td>{item.detalle}</td><td>{item.realizado_por === "Sistema" ? "Sistema" : `@${item.realizado_por}`}</td></tr>)}</tbody></table>{registros !== null && !lista.length && <p className="p-6 text-center text-text-muted-dark">No hay movimientos que coincidan.</p>}</div></section>;
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

    return <section className="settings-section"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-text-title-dark">Historial global de rentas de aulas</h2><p className="mt-1 text-sm text-text-muted-dark">{reservations === null ? "Cargando..." : `${reservations.length} reservaciones registradas`}</p></div><label className="form-label w-full sm:max-w-sm">Buscar usuario, aula o ticket<input className="form-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Alias, matrícula, aula o ticket"/></label></div><div className="admin-table-wrap mt-4"><table className="admin-table"><thead><tr><th>Aula</th><th>Usuario</th><th>Matrícula</th><th>Fecha</th><th>Horario</th><th>Ticket</th><th>Estado</th></tr></thead><tbody>{lista.map((item) => <tr key={item.id_reservacion}><td>{item.aula}<small>{item.total_asistentes} asistente(s)</small></td><td>@{item.alias}</td><td>{item.matricula || "-"}</td><td>{item.fecha_reserva}</td><td>{item.hora_inicio} - {item.hora_fin}</td><td className="font-mono">{item.codigo_ticket}</td><td>{item.estado}</td></tr>)}</tbody></table>{reservations !== null && !lista.length && <p className="p-6 text-center text-text-muted-dark">No hay reservaciones que coincidan.</p>}</div></section>;
}

// ---------- Horarios (solo Administrador) ----------
export function AdminHorarios({ setNotice }) {
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

    const editar = (bloque) => {
        const actual = `${bloque.hora_inicio} - ${bloque.hora_fin}`;
        const replacement = window.prompt("Escribe el bloque en formato HH:MM - HH:MM", actual);
        if (replacement === null || replacement.trim() === actual) return;
        const match = replacement.trim().match(/^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/);
        if (!match) {
            setNotice("Formato no válido. Usa HH:MM - HH:MM.");
            return;
        }
        const [inicio, fin] = replacement.trim().split(" - ");
        if (fin <= inicio) {
            setNotice("La hora de fin debe ser posterior a la de inicio.");
            return;
        }
        ejecutar("bloque_editar", { id_bloque: bloque.id_bloque, hora_inicio: inicio, hora_fin: fin }, "Horario actualizado.");
    };

    return <section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Editar horarios disponibles</h2><p className="mt-1 text-sm text-text-muted-dark">Los horarios activos se ofrecen en Reserva de Aulas. Un horario con reservaciones no se puede editar: desactívalo y crea uno nuevo.</p><form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={agregar}><label className="form-label">Agregar bloque<input required name="start" type="time" className="form-input"/></label><label className="form-label">Fin<input required name="end" type="time" className="form-input"/></label><button className="action-button">Agregar horario</button></form><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{bloques.map((bloque) => { const slot = `${bloque.hora_inicio} - ${bloque.hora_fin}`; return <div key={bloque.id_bloque} className={`flex items-center justify-between gap-3 rounded-lg border border-border-dark bg-bg-dark p-3 ${bloque.activo ? "" : "opacity-60"}`}><span className="font-semibold text-text-title-dark">{slot}{!bloque.activo && <small className="block text-xs font-normal text-text-muted-dark">Inactivo</small>}</span><div><button type="button" onClick={() => editar(bloque)} aria-label={`Editar ${slot}`} className="min-h-11 rounded-md px-3 text-neon-blue hover:bg-primary/10">Editar</button>{bloque.activo ? <button type="button" onClick={() => ejecutar("bloque_desactivar", { id_bloque: bloque.id_bloque }, "Horario desactivado.")} aria-label={`Desactivar ${slot}`} className="min-h-11 rounded-md px-3 text-neon-red hover:bg-secondary/10">Desactivar</button> : <button type="button" onClick={() => ejecutar("bloque_activar", { id_bloque: bloque.id_bloque }, "Horario activado.")} aria-label={`Activar ${slot}`} className="min-h-11 rounded-md px-3 text-neon-blue hover:bg-primary/10">Activar</button>}</div></div>; })}</div></section>;
}

// ---------- Tienda (solo Administrador) ----------
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
    const [products, setProducts] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [productForm, setProductForm] = useState(productoVacio);
    const [imagen, setImagen] = useState(null);
    const [borradores, setBorradores] = useState({});
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
        if (!window.confirm(`¿Eliminar "${product.titulo}" del catálogo?`)) return;
        try {
            await api("productos", "desactivar", { method: "POST", body: { id_producto: product.id } });
            setNotice("Producto eliminado del catálogo.");
            await cargar();
        } catch (err) {
            setNotice(err.message);
        }
    };

    return <section className="space-y-5"><section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Agregar artículo</h2><form onSubmit={createProduct} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate><label className="form-label">Nombre<input required maxLength={200} className="form-input" value={productForm.titulo} onChange={(event) => setProductForm({ ...productForm, titulo: event.target.value })}/></label><label className="form-label">Precio<input required type="number" min="0" max="999999.99" step="0.01" className="form-input" value={productForm.precio} onChange={(event) => setProductForm({ ...productForm, precio: event.target.value })}/></label><label className="form-label">Categoría<select required className="form-input" value={productForm.id_categoria} onChange={(event) => setProductForm({ ...productForm, id_categoria: event.target.value })}><option value="">Selecciona una categoría</option>{categorias.map((categoria) => <option key={categoria.id_categoria} value={String(categoria.id_categoria)}>{categoria.nombre}</option>)}</select></label><label className="form-label">Stock<input required type="number" min="0" max="100000" step="1" className="form-input" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })}/></label><label className="form-label">Descripción breve<input maxLength={500} className="form-input" value={productForm.descripcionCorta} onChange={(event) => setProductForm({ ...productForm, descripcionCorta: event.target.value })}/></label><label className="form-label">Imagen (JPG, PNG o WebP, máx. 2 MB)<input type="file" accept="image/jpeg,image/png,image/webp" className="form-input" onChange={(event) => setImagen(event.target.files?.[0] ?? null)}/></label><button disabled={guardando} className="action-button sm:col-span-2 sm:justify-self-start disabled:cursor-not-allowed disabled:opacity-50">{guardando ? "Guardando..." : "Agregar artículo"}</button></form></section><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio / Stock</th><th>Acción</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><input aria-label={`Nombre ${product.titulo}`} maxLength={200} className="form-input min-w-44" value={valor(product, "titulo")} onChange={(event) => cambiar(product, "titulo", event.target.value)}/><input aria-label={`Descripción ${product.titulo}`} maxLength={500} className="form-input mt-2 min-w-44" value={valor(product, "descripcionCorta")} onChange={(event) => cambiar(product, "descripcionCorta", event.target.value)}/></td><td>{product.categoria}<small>{product.tieneFoto ? "Con imagen" : "Sin imagen"}</small></td><td><input aria-label={`Precio ${product.titulo}`} type="number" min="0" step="0.01" className="form-input min-w-28" value={valor(product, "precio")} onChange={(event) => cambiar(product, "precio", event.target.value)}/><small>{formatPrecio(product.precioValor)}</small><input aria-label={`Stock ${product.titulo}`} type="number" min="0" step="1" className="form-input mt-2 min-w-28" value={valor(product, "stock")} onChange={(event) => cambiar(product, "stock", event.target.value)}/></td><td><div className="flex flex-col gap-2"><button type="button" disabled={!borradores[product.id]} className="min-h-11 px-3 text-neon-blue disabled:opacity-40" onClick={() => guardarFila(product)}>Guardar</button><label className="min-h-11 cursor-pointer px-3 py-2.5 text-center text-neon-blue">Imagen<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { cambiarImagen(product, event.target.files?.[0]); event.target.value = ""; }}/></label><button type="button" className="min-h-11 px-3 text-neon-red" onClick={() => desactivar(product)}>Eliminar</button></div></td></tr>)}</tbody></table>{!products.length && <p className="p-6 text-center text-text-muted-dark">Aún no hay productos.</p>}</div></section>;
}

// ---------- Eventos (Administrador y Moderador) ----------
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

export function AdminEventos({ setNotice }) {
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

    const editEventSchedule = (item) => {
        const start = window.prompt("Inicio (AAAA-MM-DDTHH:mm)", toDateTimeLocal(item.fecha_inicio));
        if (start === null) return;
        const end = window.prompt("Fin (AAAA-MM-DDTHH:mm)", toDateTimeLocal(item.fecha_fin));
        if (end === null) return;
        const formato = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
        if (!formato.test(start.trim()) || !formato.test(end.trim())) {
            setNotice("Formato no válido. Usa AAAA-MM-DDTHH:mm.");
            return;
        }
        if (end.trim() < start.trim()) {
            setNotice("La fecha de fin debe ser posterior a la fecha de inicio.");
            return;
        }
        const lugar = window.prompt("Lugar del evento", item.lugar || "");
        if (lugar === null) return;
        if (lugar.trim().length > 150) {
            setNotice("El lugar no puede tener más de 150 caracteres.");
            return;
        }
        ejecutar("editar", { id_evento: item.id_evento, fecha_inicio: start.trim(), fecha_fin: end.trim(), lugar: lugar.trim() }, "Evento actualizado.");
    };

    const eliminar = (item) => {
        if (!window.confirm(`¿Eliminar el evento "${item.titulo}"? Esta acción no se puede deshacer.`)) return;
        ejecutar("eliminar", { id_evento: item.id_evento }, "Evento eliminado.");
    };

    return <section className="space-y-5"><section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Publicar evento</h2><form onSubmit={createEvent} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate><label className="form-label">Título<input required maxLength={200} className="form-input" value={eventForm.titulo} onChange={(event) => setEventForm({ ...eventForm, titulo: event.target.value })}/></label><label className="form-label">Tipo<select className="form-input" value={eventForm.tipo} onChange={(event) => setEventForm({ ...eventForm, tipo: event.target.value })}>{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="form-label">Inicio<input required type="datetime-local" className="form-input" value={eventForm.fecha_inicio} onChange={(event) => setEventForm({ ...eventForm, fecha_inicio: event.target.value })}/></label><label className="form-label">Fin<input required type="datetime-local" min={eventForm.fecha_inicio || undefined} className="form-input" value={eventForm.fecha_fin} onChange={(event) => setEventForm({ ...eventForm, fecha_fin: event.target.value })}/></label><label className="form-label">Lugar<input maxLength={150} className="form-input" value={eventForm.lugar} onChange={(event) => setEventForm({ ...eventForm, lugar: event.target.value })}/></label><label className="form-label">Descripción<input maxLength={1000} className="form-input" value={eventForm.descripcion} onChange={(event) => setEventForm({ ...eventForm, descripcion: event.target.value })}/></label><button disabled={guardando} className="action-button sm:col-span-2 sm:justify-self-start disabled:cursor-not-allowed disabled:opacity-50">{guardando ? "Guardando..." : "Agregar evento"}</button></form></section><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Evento</th><th>Fecha</th><th>Lugar</th><th>Visible</th><th>Acción</th></tr></thead><tbody>{events.map((item) => <tr key={item.id_evento}><td><input aria-label={`Título ${item.titulo}`} maxLength={200} className="form-input min-w-44" value={valor(item, "titulo")} onChange={(event) => cambiar(item, "titulo", event.target.value)}/><small>{item.tipo}</small><input aria-label={`Descripción ${item.titulo}`} maxLength={1000} className="form-input mt-2 min-w-44" value={valor(item, "descripcion")} onChange={(event) => cambiar(item, "descripcion", event.target.value)}/></td><td>{parseFechaMySQL(item.fecha_inicio).toLocaleString("es-MX")}</td><td>{item.lugar}</td><td>{item.visible ? "Sí" : "No"}</td><td><div className="flex flex-col gap-2"><button type="button" disabled={!borradores[item.id_evento]} className="min-h-11 px-2 text-neon-blue disabled:opacity-40" onClick={() => guardarFila(item)}>Guardar</button><button type="button" className="min-h-11 px-2 text-neon-blue" onClick={() => ejecutar(item.visible ? "ocultar" : "mostrar", { id_evento: item.id_evento }, item.visible ? "Evento oculto." : "Evento visible.")}>{item.visible ? "Ocultar" : "Mostrar"}</button><button type="button" className="min-h-11 px-2 text-neon-red" onClick={() => eliminar(item)}>Eliminar</button><button type="button" className="min-h-11 px-2 text-neon-blue" onClick={() => editEventSchedule(item)}>Editar fecha/lugar</button></div></td></tr>)}</tbody></table>{!events.length && <p className="p-6 text-center text-text-muted-dark">Aún no hay eventos.</p>}</div></section>;
}
