// Secciones del panel de administración.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useDialogos } from "./Dialogos";
import CustomSelect from "./CustomSelect";
import PanelLateral from "./PanelLateral";
import MenuAcciones from "./MenuAcciones";
import Interruptor from "./Interruptor";
import CampoFechaHora from "./CampoFechaHora";
import { EsqueletoFilas, EstadoError, EstadoVacio } from "./Estados";
import { EstadoStock, ImagenProducto } from "./ProductModal";
import { colorPuntoEvento } from "../utils/eventStyles";
import { DonaEstados, RankingInteraccion, RankingUsuarios } from "./GraficasAdmin";
import { api, formatDia, formatFechaHora, formatHora, formatPrecio, formatRangoFechaHora, formatRangoHoras, mapProducto, toDateTimeLocal, validarImagen } from "../api/client";

const EVENT_TYPES = ["Académico", "Examen", "Asueto", "Cultural", "Deportivo"];

// Franja de cifras sencilla, con el mismo estilo que las cifras del perfil
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

// Color de cada estado de cuenta; siempre se muestra junto con su nombre y su cifra
const ESTADOS = [
    { campo: "usuarios_activos", estado: "Aprobado", nombre: "Aprobados", color: "var(--success)", punto: "bg-success" },
    { campo: "pendientes", estado: "Pendiente", nombre: "Pendientes", color: "var(--warning)", punto: "bg-warning" },
    { campo: "rechazados", estado: "Rechazado", nombre: "Rechazados", color: "var(--ink-muted)", punto: "bg-ink-muted" },
    { campo: "baneados", estado: "Baneado", nombre: "Baneados", color: "var(--danger)", punto: "bg-danger" },
];

// Resumen (solo administrador). Los datos vienen de reportes.php
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
    const valor = (campo) => (resumen ? r[campo] : "—");

    // Gráfica (R2-B): una sola serie -> un solo color, sin leyenda; etiqueta directa con el valor
    const porEstado = [
        { estado: "Aprobados", total: r.usuarios_activos ?? 0 },
        { estado: "Pendientes", total: r.pendientes ?? 0 },
        { estado: "Rechazados", total: r.rechazados ?? 0 },
        { estado: "Baneados", total: r.baneados ?? 0 },
    ];
    const totalUsuarios = porEstado.reduce((suma, item) => suma + item.total, 0);

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

        <Tarjeta titulo="Usuarios por estado" detalle={cargando ? " " : `${totalUsuarios} cuentas (sin incluir eliminadas)${onIrA ? " · toca un estado para ver esas cuentas" : ""}`}>
            {cargando ? <FilasCargando filas={2} /> : <DonaEstados datos={porEstado} />}
        </Tarjeta>

        <div className="grid gap-5 xl:grid-cols-2">
            <Tarjeta titulo="Usuarios más activos" detalle="Por número de publicaciones">
                {masActivos === null ? <FilasCargando /> : !masActivos.length
                    ? <EstadoVacio compacto icono="publicacion" titulo="Aún no hay actividad" />
                    : <RankingUsuarios usuarios={masActivos} />}
            </Tarjeta>
            <Tarjeta titulo="Publicaciones con mayor interacción" detalle="Me gusta y comentarios por publicación">
                {mayorInteraccion === null ? <FilasCargando /> : !mayorInteraccion.length
                    ? <EstadoVacio compacto icono="publicacion" titulo="Aún no hay publicaciones" />
                    : <RankingInteraccion publicaciones={mayorInteraccion} />}
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

// ---------- Horarios (solo Administrador, D9) ----------
export function AdminHorarios({ setNotice }) {
    const { avisar } = useDialogos();
    const { datos, error, recargar, reintentar } = useLista(cargarBloques);
    const [panel, setPanel] = useState(null); // datos del panel abierto, o null si está cerrado
    const [errorPanel, setErrorPanel] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [cambiando, setCambiando] = useState(null);

    const abrir = (bloque = null) => {
        setErrorPanel("");
        setPanel({ bloque, inicio: bloque ? formatHora(bloque.hora_inicio) : "07:00", fin: bloque ? formatHora(bloque.hora_fin) : "08:00" });
    };

    const guardar = async () => {
        const { bloque, inicio, fin } = panel;
        if (!HORA.test(inicio) || !HORA.test(fin) || fin <= inicio) return setErrorPanel("La hora de fin debe ser posterior a la de inicio.");
        if (bloque && inicio === formatHora(bloque.hora_inicio) && fin === formatHora(bloque.hora_fin)) return setPanel(null);
        setGuardando(true);
        try {
            await api("reservaciones", bloque ? "bloque_editar" : "bloque_crear", { method: "POST", body: { ...(bloque && { id_bloque: bloque.id_bloque }), hora_inicio: inicio, hora_fin: fin } });
            avisar(bloque ? "Horario actualizado." : "Horario agregado.", "exito");
            setPanel(null);
            await recargar();
        } catch (err) {
            setErrorPanel(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const alternarActivo = async (bloque, activo) => {
        setCambiando(bloque.id_bloque);
        try {
            await api("reservaciones", activo ? "bloque_activar" : "bloque_desactivar", { method: "POST", body: { id_bloque: bloque.id_bloque } });
            avisar(activo ? "Horario activado." : "Horario desactivado: ya no se ofrece en Reserva de aulas.", "exito");
            await recargar();
        } catch (err) {
            setNotice(err.message);
        } finally {
            setCambiando(null);
        }
    };

    const opcionesHora = (extra) => (extra && !HORAS_BLOQUE.includes(extra) ? [...HORAS_BLOQUE, extra].sort() : HORAS_BLOQUE).map((h) => ({ value: h, label: h }));
    const lista = datos ?? [];

    return (
        <SeccionAdmin
            titulo="Horarios disponibles"
            detalle="Los horarios activos se ofrecen en Reserva de aulas. Un horario con reservaciones no se puede editar: desactívalo y crea uno nuevo."
            accion={<button type="button" onClick={() => abrir()} className="action-button">+ Agregar horario</button>}
        >
            <TablaAdmin
                columnas={["Bloque", "Duración", "Activo", "Acciones"]}
                cargando={datos === null} error={error} onReintentar={reintentar} hayFilas={lista.length > 0}
                vacio={{ icono: "reloj", titulo: "Sin horarios", detalle: "Agrega el primer bloque para que se puedan reservar aulas.", accion: { texto: "Agregar horario", onClick: () => abrir() } }}
            >
                {lista.map((bloque) => {
                    const slot = formatRangoHoras(bloque.hora_inicio, bloque.hora_fin);
                    const [h1, m1] = formatHora(bloque.hora_inicio).split(":").map(Number);
                    const [h2, m2] = formatHora(bloque.hora_fin).split(":").map(Number);
                    const minutos = h2 * 60 + m2 - (h1 * 60 + m1);
                    return (
                        <tr key={bloque.id_bloque} className={bloque.activo ? "" : ATENUADA}>
                            <td className="whitespace-nowrap font-semibold text-ink">{slot}</td>
                            <td>{minutos >= 60 ? `${Math.floor(minutos / 60)} h${minutos % 60 ? ` ${minutos % 60} min` : ""}` : `${minutos} min`}</td>
                            <td><Interruptor activo={Boolean(bloque.activo)} etiqueta={`Horario ${slot} activo`} deshabilitado={cambiando === bloque.id_bloque} onCambiar={(v) => alternarActivo(bloque, v)} /></td>
                            <td><AccionesFila nombre={slot} onEditar={() => abrir(bloque)} /></td>
                        </tr>
                    );
                })}
            </TablaAdmin>

            <AnimatePresence>
                {panel && (
                    <PanelLateral
                        titulo={panel.bloque ? "Editar horario" : "Nuevo horario"}
                        subtitulo={panel.bloque ? formatRangoHoras(panel.bloque.hora_inicio, panel.bloque.hora_fin) : "Bloque que se podrá reservar"}
                        accion={panel.bloque ? "Guardar cambios" : "Agregar horario"}
                        onCerrar={() => setPanel(null)} onEnviar={guardar} guardando={guardando} error={errorPanel}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <CustomSelect label="Inicio" value={panel.inicio} onChange={(inicio) => { setPanel({ ...panel, inicio }); setErrorPanel(""); }} options={opcionesHora(panel.inicio)} />
                            <CustomSelect label="Fin" value={panel.fin} onChange={(fin) => { setPanel({ ...panel, fin }); setErrorPanel(""); }} options={opcionesHora(panel.fin)} />
                        </div>
                        <p className="text-sm text-ink-muted">Las reservaciones duran como máximo 1 hora.</p>
                    </PanelLateral>
                )}
            </AnimatePresence>
        </SeccionAdmin>
    );
}

// ---------- Tienda (solo Administrador, D10) ----------
const productoVacio = { titulo: "", precio: "", id_categoria: "", stock: "0", descripcionCorta: "" };
const cargarProductos = () => api("productos", "listar").then((r) => r.productos.map(mapProducto));
const cargarCategorias = () => api("productos", "categorias").then((r) => r.categorias);

// Mensaje de error de los campos de un producto, o ""
function validarProducto({ titulo, precio, stock, descripcionCorta, id_categoria }) {
    if (!titulo.trim() || titulo.trim().length > 200) return "El nombre es obligatorio (máximo 200 caracteres).";
    if (!id_categoria) return "Selecciona una categoría.";
    if (!PRECIO.test(String(precio).trim()) || Number(precio) > 999999.99) return "Escribe un precio válido (máximo 2 decimales).";
    if (!/^\d+$/.test(String(stock).trim()) || Number(stock) > 100000) return "El stock debe ser un número entero entre 0 y 100000.";
    if (descripcionCorta.trim().length > 500) return "La descripción no puede tener más de 500 caracteres.";
    return "";
}

export function AdminTienda({ setNotice }) {
    const [products, setProducts] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [productForm, setProductForm] = useState(productoVacio);
    const [imagen, setImagen] = useState(null);
    const [borradores, setBorradores] = useState({}); // ediciones por fila sin guardar
    const [guardando, setGuardando] = useState(false);

    const abrir = (producto = null) => {
        setErrorPanel("");
        setPanel({
            producto,
            imagen: null,
            vista: producto?.imagen ?? null,
            form: producto
                ? { titulo: producto.titulo, precio: String(producto.precioValor), id_categoria: String(producto.idCategoria ?? ""), stock: String(producto.stock), descripcionCorta: producto.descripcionCorta }
                : productoVacio,
        });
    };
    const campo = (nombre, valor) => { setPanel((p) => ({ ...p, form: { ...p.form, [nombre]: valor } })); setErrorPanel(""); };
    const elegirImagen = (file) => {
        if (!file) return;
        const problema = validarImagen(file);
        if (problema) return setErrorPanel(problema);
        setErrorPanel("");
        setPanel((p) => ({ ...p, imagen: file, vista: URL.createObjectURL(file) }));
    };

    const guardar = async () => {
        const { producto, form, imagen } = panel;
        const problema = validarProducto(form);
        if (problema) return setErrorPanel(problema);
        const body = new FormData();
        const original = producto && { titulo: producto.titulo, precio: String(producto.precioValor), id_categoria: String(producto.idCategoria ?? ""), stock: String(producto.stock), descripcionCorta: producto.descripcionCorta };
        const nombres = { titulo: "nombre", precio: "precio", id_categoria: "id_categoria", stock: "stock", descripcionCorta: "descripcion" };
        // Al editar solo se envían los campos que cambiaron
        Object.entries(nombres).forEach(([clave, api_]) => {
            const valor = String(form[clave]).trim();
            if (!producto || valor !== String(original[clave]).trim()) body.append(api_, valor);
        });
        if (imagen) body.append("imagen", imagen);
        if (producto) {
            if ([...body.keys()].length === 0) return setPanel(null);
            body.append("id_producto", producto.id);
        }
        setGuardando(true);
        try {
            await api("productos", producto ? "editar" : "crear", { method: "POST", body });
            avisar(producto ? "Producto actualizado." : "Artículo agregado al catálogo.", "exito");
            setPanel(null);
            await recargar();
        } catch (err) {
            setErrorPanel(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (producto) => {
        if (!(await confirmar({ titulo: "¿Eliminar del catálogo?", mensaje: `"${producto.titulo}" dejará de mostrarse en la Bisontstore.`, accion: "Eliminar", peligro: true }))) return;
        try {
            await api("productos", "desactivar", { method: "POST", body: { id_producto: producto.id } });
            avisar("Producto eliminado del catálogo.", "exito");
            await recargar();
        } catch (err) {
            avisar(err.message, "error");
        }
    };

    const lista = (datos ?? []).filter((p) => (!categoria || String(p.idCategoria) === categoria) && coincide(`${p.titulo} ${p.categoria} ${p.descripcionCorta}`, busqueda));
    const opcionesCategoria = (categorias ?? []).map((c) => ({ value: String(c.id_categoria), label: c.nombre }));

    return (
        <SeccionAdmin
            titulo="Catálogo de la Bisontstore"
            detalle={datos && !error ? `${datos.length} ${datos.length === 1 ? "artículo" : "artículos"}` : " "}
            busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar artículo"
            filtros={opcionesCategoria.length > 1 && <CustomSelect ariaLabel="Filtrar por categoría" className="w-48" value={categoria} onChange={setCategoria} options={[{ value: "", label: "Todas las categorías" }, ...opcionesCategoria]} />}
            accion={<button type="button" onClick={() => abrir()} className="action-button">+ Agregar artículo</button>}
        >
            <TablaAdmin
                columnas={["Artículo", "Categoría", "Precio", "Stock", "Acciones"]}
                cargando={datos === null} error={error} onReintentar={reintentar} hayFilas={lista.length > 0}
                vacio={busqueda || categoria ? vacioBusqueda(() => { setBusqueda(""); setCategoria(""); }) : { icono: "tienda", titulo: "El catálogo está vacío", detalle: "Agrega el primer artículo de la tienda.", accion: { texto: "Agregar artículo", onClick: () => abrir() } }}
            >
                {lista.map((p) => (
                    <tr key={p.id}>
                        <td>
                            <div className="flex items-center gap-3">
                                <ImagenProducto producto={p} className="h-10 w-10 shrink-0 rounded-lg" />
                                <div className="min-w-0">
                                    <strong className="block font-semibold text-ink">{p.titulo}</strong>
                                    {p.descripcionCorta && <small className="line-clamp-1 max-w-xs">{p.descripcionCorta}</small>}
                                </div>
                            </div>
                        </td>
                        <td>{p.categoria}</td>
                        <td className="whitespace-nowrap tabular-nums">{formatPrecio(p.precioValor)}</td>
                        <td className="whitespace-nowrap"><span className="tabular-nums">{p.stock}</span>{p.stock <= 5 && <span className="ml-2 align-middle"><EstadoStock stock={p.stock} compacto /></span>}</td>
                        <td><AccionesFila nombre={p.titulo} onEditar={() => abrir(p)} extra={[{ texto: "Ver en la tienda", onClick: () => window.open(`${import.meta.env.BASE_URL}bisontstore`, "_blank", "noopener") }, { texto: "Eliminar", peligro: true, onClick: () => eliminar(p) }]} /></td>
                    </tr>
                ))}
            </TablaAdmin>

            <AnimatePresence>
                {panel && (
                    <PanelLateral
                        titulo={panel.producto ? "Editar artículo" : "Nuevo artículo"}
                        subtitulo={panel.producto?.titulo}
                        accion={panel.producto ? "Guardar cambios" : "Agregar artículo"}
                        onCerrar={() => setPanel(null)} onEnviar={guardar} guardando={guardando} error={errorPanel}
                    >
                        <label className="form-label">Nombre<input maxLength={200} className="form-input" value={panel.form.titulo} onChange={(e) => campo("titulo", e.target.value)} /></label>
                        <CustomSelect label="Categoría" value={panel.form.id_categoria} onChange={(v) => campo("id_categoria", v)} placeholder="Selecciona una categoría" options={opcionesCategoria} />
                        <div className="grid grid-cols-2 gap-4">
                            <label className="form-label">Precio (MXN)<input inputMode="decimal" className="form-input" value={panel.form.precio} onChange={(e) => campo("precio", e.target.value)} placeholder="0.00" /></label>
                            <label className="form-label">Stock<input inputMode="numeric" className="form-input" value={panel.form.stock} onChange={(e) => campo("stock", e.target.value)} /></label>
                        </div>
                        <label className="form-label">Descripción<textarea maxLength={500} rows={3} className="form-input resize-y" value={panel.form.descripcionCorta} onChange={(e) => campo("descripcionCorta", e.target.value)} /></label>
                        <div className="form-label">
                            <span>Imagen</span>
                            <div className="flex items-center gap-4">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-field">
                                    {panel.vista ? <img src={panel.vista} alt="" className="h-full w-full object-cover" /> : <ImagenProducto producto={{ titulo: panel.form.titulo || "Artículo", categoria: "" }} className="h-full w-full" />}
                                </div>
                                <div className="text-sm font-normal text-ink-muted">
                                    <label className="action-button action-button-secondary action-button-sm cursor-pointer focus-within:outline-2 focus-within:outline-accent">
                                        {panel.vista ? "Cambiar imagen" : "Subir imagen"}
                                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { elegirImagen(e.target.files?.[0]); e.target.value = ""; }} />
                                    </label>
                                    <p className="mt-1.5">JPG, PNG o WebP, máx. 2 MB.</p>
                                </div>
                            </div>
                        </div>
                    </PanelLateral>
                )}
            </AnimatePresence>
        </SeccionAdmin>
    );
}

// ---------- Eventos (Administrador y Moderador, D15) ----------
const eventoVacio = { titulo: "", descripcion: "", tipo: "Académico", fecha_inicio: "", fecha_fin: "", lugar: "" };
const cargarEventos = () => api("eventos", "admin_listar").then((r) => r.eventos);

// Suma una hora a la fecha de inicio, sin pasar de las 23:45 del mismo día
function unaHoraDespues(valor) {
    const [fecha, hora] = valor.split("T");
    const [h, m] = hora.split(":").map(Number);
    const total = Math.min(h * 60 + m + 60, 23 * 60 + 45);
    return `${fecha}T${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function validarEvento(evento) {
    if (!evento.titulo.trim() || evento.titulo.trim().length > 200) return "El título es obligatorio (máximo 200 caracteres).";
    if (!evento.fecha_inicio) return "Indica la fecha y hora de inicio.";
    if (!evento.fecha_fin) return "Indica la fecha y hora de fin.";
    if (evento.fecha_fin < evento.fecha_inicio) return "El fin del evento debe ser posterior al inicio.";
    if (evento.lugar.trim().length > 150) return "El lugar no puede tener más de 150 caracteres.";
    if (evento.descripcion.trim().length > 1000) return "La descripción no puede tener más de 1000 caracteres.";
    return "";
}

export function AdminEventos() {
    const { confirmar, avisar } = useDialogos();
    const { datos, setDatos, error, recargar, reintentar } = useLista(cargarEventos);
    const [busqueda, setBusqueda] = useState("");
    const [tipo, setTipo] = useState("");
    const [panel, setPanel] = useState(null); // datos del panel abierto, o null si está cerrado
    const [errorPanel, setErrorPanel] = useState("");
    const [guardando, setGuardando] = useState(false);

    const desdeEvento = (e) => ({ titulo: e.titulo, descripcion: e.descripcion || "", tipo: e.tipo, fecha_inicio: toDateTimeLocal(e.fecha_inicio), fecha_fin: toDateTimeLocal(e.fecha_fin), lugar: e.lugar || "" });
    const abrir = (evento = null) => { setErrorPanel(""); setPanel({ evento, form: evento ? desdeEvento(evento) : eventoVacio }); };
    const campo = (nombre, valor) => { setPanel((p) => ({ ...p, form: { ...p.form, [nombre]: valor } })); setErrorPanel(""); };

    const guardar = async () => {
        const { evento, form } = panel;
        const problema = validarEvento(form);
        if (problema) return setErrorPanel(problema);
        const limpio = { ...form, titulo: form.titulo.trim(), descripcion: form.descripcion.trim(), lugar: form.lugar.trim() };
        let body = limpio;
        if (evento) {
            // Solo los campos que cambiaron
            const original = desdeEvento(evento);
            body = Object.fromEntries(Object.entries(limpio).filter(([k, v]) => v !== original[k]));
            if (!Object.keys(body).length) return setPanel(null);
            body.id_evento = evento.id_evento;
        }
        setGuardando(true);
        try {
            await api("eventos", evento ? "editar" : "crear", { method: "POST", body });
            avisar(evento ? "Evento actualizado." : "Evento agregado al calendario.", "exito");
            setPanel(null);
            await recargar();
        } catch (err) {
            setErrorPanel(err.message);
        } finally {
            setGuardando(false);
        }
    };

    // El interruptor de Visible se guarda al momento, sin esperar la respuesta del servidor
    const alternarVisible = async (item, visible) => {
        setDatos((lista) => lista.map((e) => (e.id_evento === item.id_evento ? { ...e, visible } : e)));
        try {
            await api("eventos", visible ? "mostrar" : "ocultar", { method: "POST", body: { id_evento: item.id_evento } });
            avisar(visible ? "El evento ya se ve en el calendario." : "Evento oculto del calendario.", "exito");
        } catch (err) {
            avisar(err.message, "error");
            recargar();
        }
    };

    const eliminar = async (item) => {
        if (!(await confirmar({ titulo: "¿Eliminar el evento?", mensaje: `"${item.titulo}" se quitará del calendario. Esta acción no se puede deshacer.`, accion: "Eliminar", peligro: true }))) return;
        try {
            await api("eventos", "eliminar", { method: "POST", body: { id_evento: item.id_evento } });
            avisar("Evento eliminado.", "exito");
            await recargar();
        } catch (err) {
            avisar(err.message, "error");
        }
    };

    const lista = (datos ?? []).filter((e) => (!tipo || e.tipo === tipo) && coincide(`${e.titulo} ${e.lugar || ""} ${e.descripcion || ""}`, busqueda));

    return (
        <SeccionAdmin
            titulo="Eventos del calendario"
            detalle={datos && !error ? `${datos.length} ${datos.length === 1 ? "evento" : "eventos"}` : " "}
            busqueda={busqueda} onBusqueda={setBusqueda} placeholder="Buscar evento"
            filtros={<CustomSelect ariaLabel="Filtrar por tipo" className="w-44" value={tipo} onChange={setTipo} options={[{ value: "", label: "Todos los tipos" }, ...EVENT_TYPES.map((t) => ({ value: t, label: t }))]} />}
            accion={<button type="button" onClick={() => abrir()} className="action-button">+ Publicar evento</button>}
        >
            <TablaAdmin
                columnas={["Evento", "Fecha", "Lugar", "Visible", "Acciones"]}
                cargando={datos === null} error={error} onReintentar={reintentar} hayFilas={lista.length > 0}
                vacio={busqueda || tipo ? vacioBusqueda(() => { setBusqueda(""); setTipo(""); }) : { icono: "calendario", titulo: "Aún no hay eventos", detalle: "Publica exámenes, asuetos y actividades para que aparezcan en el calendario.", accion: { texto: "Publicar evento", onClick: () => abrir() } }}
            >
                {lista.map((item) => (
                    <tr key={item.id_evento} className={item.visible ? "" : ATENUADA}>
                        <td>
                            <strong className="block font-semibold text-ink">{item.titulo}</strong>
                            <small className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${colorPuntoEvento(item.tipo)}`} />{item.tipo}</small>
                        </td>
                        <td className="whitespace-nowrap">{formatRangoFechaHora(item.fecha_inicio, item.fecha_fin)}</td>
                        <td>{item.lugar || "—"}</td>
                        <td><Interruptor activo={Boolean(item.visible)} etiqueta={`${item.titulo} visible en el calendario`} onCambiar={(v) => alternarVisible(item, v)} /></td>
                        <td><AccionesFila nombre={item.titulo} onEditar={() => abrir(item)} extra={[{ texto: "Eliminar", peligro: true, onClick: () => eliminar(item) }]} /></td>
                    </tr>
                ))}
            </TablaAdmin>

            <AnimatePresence>
                {panel && (
                    <PanelLateral
                        titulo={panel.evento ? "Editar evento" : "Nuevo evento"}
                        subtitulo={panel.evento?.titulo}
                        accion={panel.evento ? "Guardar cambios" : "Publicar evento"}
                        onCerrar={() => setPanel(null)} onEnviar={guardar} guardando={guardando} error={errorPanel}
                    >
                        <label className="form-label">Título<input maxLength={200} className="form-input" value={panel.form.titulo} onChange={(e) => campo("titulo", e.target.value)} /></label>
                        <CustomSelect label="Tipo" value={panel.form.tipo} onChange={(v) => campo("tipo", v)} options={EVENT_TYPES.map((t) => ({ value: t, label: t }))} />
                        <CampoFechaHora etiqueta="Inicio" valor={panel.form.fecha_inicio} onCambiar={(v) => { campo("fecha_inicio", v); if (!panel.form.fecha_fin || panel.form.fecha_fin < v) campo("fecha_fin", unaHoraDespues(v)); }} />
                        <CampoFechaHora etiqueta="Fin" valor={panel.form.fecha_fin} onCambiar={(v) => campo("fecha_fin", v)} horaInicial={panel.form.fecha_inicio.split("T")[1] || "10:00"} />
                        <label className="form-label">Lugar<input maxLength={150} className="form-input" value={panel.form.lugar} onChange={(e) => campo("lugar", e.target.value)} placeholder="Aula, auditorio, cancha…" /></label>
                        <label className="form-label">Descripción<textarea maxLength={1000} rows={4} className="form-input resize-y" value={panel.form.descripcion} onChange={(e) => campo("descripcion", e.target.value)} /></label>
                    </PanelLateral>
                )}
            </AnimatePresence>
        </SeccionAdmin>
    );
}
