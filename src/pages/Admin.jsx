import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { api, CORREO_UANL, MATRICULA, formatFecha } from "../api/client";
import { CAREERS, getCareerName } from "../utils/careers";
import { AnimatePresence } from "framer-motion";
import { AdminBitacora, AdminEventos, AdminHorarios, AdminRentas, AdminResumen, AdminTienda, FranjaCifras, SeccionAdmin, TablaAdmin } from "../components/AdminSecciones";
import PanelLateral from "../components/PanelLateral";
import { useDialogos } from "../components/Dialogos";
import PageHeader from "../components/PageHeader";
import CustomSelect from "../components/CustomSelect";

// Fila de usuarios.php?accion=listar (vw_usuarios_admin) -> forma usada en el panel
function mapAdminUser(record) {
    return {
        id: record.id_usuario,
        nombre: record.nombre_completo,
        alias: record.alias,
        correo: record.correo,
        matricula: record.matricula,
        carrera: record.carrera,
        semestre: record.semestre,
        rol: record.rol,
        estado: record.estado,
        fechaRegistro: formatFecha(record.fecha_registro),
        posts: record.total_publicaciones,
        likes: record.total_likes,
    };
}

const emptyAccountForm = { nombre: "", alias: "", correo: "", matricula: "", id_carrera: "", semestre: "1" };

const allSections = ["Resumen", "Estudiantes", "Administradores", "Rentas", "Horarios", "Tienda", "Eventos", "Bitácora"];
// Solo Administrador: Resumen y Bitácora (reportes, D15), Horarios y Tienda (D15 y decisión 2 del Paso 2)
const soloAdministrador = ["Resumen", "Horarios", "Tienda", "Bitácora"];
const states = ["Pendiente", "Aprobado", "Rechazado", "Baneado"];

function Admin() {
    const { user } = useAppData();
    const esStaff = user.rol === "Administrador" || user.rol === "Moderador";
    const esAdministrador = user.rol === "Administrador";
    const { avisar, pedirTexto } = useDialogos();
    const [users, setUsers] = useState(null); // null = cargando
    const [errorUsuarios, setErrorUsuarios] = useState("");
    // Resumen solo para Administrador; el Moderador entra a Estudiantes (R1-A)
    const [section, setSection] = useState(esAdministrador ? "Resumen" : "Estudiantes");
    const [search, setSearch] = useState("");
    const [careerFilter, setCareerFilter] = useState("");
    const [semesterFilter, setSemesterFilter] = useState("");
    const [postFilter, setPostFilter] = useState("");
    const [likeFilter, setLikeFilter] = useState("");
    const [stateFilter, setStateFilter] = useState("");
    // Los avisos del panel ahora son notificaciones flotantes (antes, una franja fija arriba)
    const setNotice = useCallback((mensaje) => { if (mensaje) avisar(mensaje); }, [avisar]);
    const [accountForm, setAccountForm] = useState(null); // null = panel cerrado
    const [errorAlta, setErrorAlta] = useState("");
    const [creatingAccount, setCreatingAccount] = useState(false);
    const [carreras, setCarreras] = useState([]);
    const sections = allSections.filter((item) => esAdministrador || !soloAdministrador.includes(item));

    // Carreras para el alta de moderador (solo Administrador)
    useEffect(() => {
        if (!esAdministrador) return undefined;
        let cancelled = false;
        api("usuarios", "carreras")
            .then((response) => { if (!cancelled) setCarreras(response.carreras); })
            .catch((err) => { if (!cancelled) setNotice(err.message); });
        return () => { cancelled = true; };
    }, [esAdministrador, setNotice]);

    // Usuarios desde la BD (vw_usuarios_admin); la API valida el rol en el servidor
    const cargarUsuarios = useCallback(() => api("usuarios", "listar")
        .then((response) => { setUsers(response.usuarios.map(mapAdminUser)); setErrorUsuarios(""); })
        .catch((err) => { setUsers((actual) => actual ?? []); setErrorUsuarios(err.message); }), []);
    useEffect(() => { if (esStaff) cargarUsuarios(); }, [esStaff, cargarUsuarios]);
    const reintentarUsuarios = () => { setUsers(null); setErrorUsuarios(""); cargarUsuarios(); };

    // Conteos calculados en la BD (total_publicaciones / total_likes)
    const getPostCounts = (record) => ({ posts: record.posts, likes: record.likes });
    const cargandoUsuarios = users === null;
    const students = (users ?? []).filter((record) => record.rol === "Estudiante");
    const admins = (users ?? []).filter((record) => record.rol === "Administrador" || record.rol === "Moderador");
    const pendingUsers = students.filter((record) => record.estado === "Pendiente");
    const bannedUsers = students.filter((record) => record.estado === "Baneado");

    const filteredStudents = students.filter((record) => {
        const counts = getPostCounts(record);
        const query = search.trim().toLowerCase();
        return (!query || `${record.nombre} ${record.alias} ${record.correo} ${record.matricula || ""}`.toLowerCase().includes(query))
            && (!careerFilter || getCareerName(record.carrera) === careerFilter || record.carrera === careerFilter)
            && (!semesterFilter || String(record.semestre) === semesterFilter)
            && (!stateFilter || record.estado === stateFilter)
            && (postFilter === "" || counts.posts >= Number(postFilter))
            && (likeFilter === "" || counts.likes >= Number(likeFilter));
    });

    const hayFiltros = Boolean(search || careerFilter || semesterFilter || stateFilter || postFilter || likeFilter);
    const limpiarFiltros = () => { setSearch(""); setCareerFilter(""); setSemesterFilter(""); setStateFilter(""); setPostFilter(""); setLikeFilter(""); };
    const adminsFiltrados = admins.filter((record) => `${record.nombre} ${record.alias}`.toLowerCase().includes(search.trim().toLowerCase()));

    if (!esStaff) {
        return <section className="settings-section mx-auto max-w-xl text-center"><h1 className="text-2xl font-bold text-ink">Acceso restringido</h1><p className="mt-2 text-ink-muted">Esta sección solo está disponible para administradores.</p><Link to="/feed" className="action-button mt-5">Volver al feed</Link></section>;
    }

    // Alta de moderador (solo Administrador, D14). La clave temporal la genera el servidor.
    const createAccount = async () => {
        const setNotice = setErrorAlta; // los errores de validación se muestran dentro del panel
        const form = {
            nombre: accountForm.nombre.trim(),
            alias: accountForm.alias.trim(),
            correo: accountForm.correo.trim().toLowerCase(),
            matricula: accountForm.matricula.trim(),
            id_carrera: Number(accountForm.id_carrera),
            semestre: Number(accountForm.semestre),
        };
        if (!form.nombre || !form.alias || !form.correo || !form.matricula) {
            setNotice("Completa nombre, alias, correo y matrícula.");
            return;
        }
        if (form.nombre.length > 250 || form.alias.length > 50) {
            setNotice("El nombre o el alias son demasiado largos.");
            return;
        }
        if (!CORREO_UANL.test(form.correo)) {
            setNotice("Usa un correo institucional @uanl.edu.mx.");
            return;
        }
        if (!MATRICULA.test(form.matricula)) {
            setNotice("La matrícula debe tener 7 dígitos.");
            return;
        }
        if (!form.id_carrera) {
            setNotice("Selecciona la carrera.");
            return;
        }
        if (!Number.isInteger(form.semestre) || form.semestre < 1 || form.semestre > 10) {
            setNotice("Selecciona un semestre válido.");
            return;
        }
        setCreatingAccount(true);
        try {
            const response = await api("usuarios", "crear_moderador", { method: "POST", body: form });
            setAccountForm(null);
            avisar(response.message, "exito");
            await cargarUsuarios();
        } catch (err) {
            setNotice(err.message);
        } finally {
            setCreatingAccount(false);
        }
    };

    // Aprobar / rechazar / banear (Administrador y Moderador, D15)
    const changeStatus = async (record, estado) => {
        if (estado === record.estado) return;
        let motivo = "";
        if (estado === "Rechazado" || estado === "Baneado") {
            const respuesta = await pedirTexto({
                titulo: `${estado === "Baneado" ? "Banear" : "Rechazar"} a @${record.alias}`,
                mensaje: "El motivo se incluye en el correo que recibe el usuario.",
                etiqueta: "Motivo (opcional)",
                multilinea: true,
                maxLength: 300,
                accion: estado === "Baneado" ? "Banear" : "Rechazar",
                peligro: true,
            });
            if (respuesta === null) return;
            motivo = respuesta.slice(0, 300);
        }
        try {
            await api("usuarios", "cambiar_estado", { method: "POST", body: { id_usuario: record.id, estado, motivo } });
            setUsers((current) => current.map((item) => item.id === record.id ? { ...item, estado } : item));
            avisar(`Estado de @${record.alias} actualizado a ${estado}.`, "exito");
        } catch (err) {
            avisar(err.message, "error");
        }
    };

    // Desde el resumen: abre una sección con un filtro de estado ya aplicado
    const irA = (destino, estado = "") => { setSection(destino); setSearch(""); setStateFilter(estado); };

    return (
        <section className="pagina-ancha">
            <PageHeader titulo="Panel de control" subtitulo={`Sesión: ${user.alias || user.nombre} · ${user.rol}`} />

            <nav aria-label="Secciones administrativas" className="custom-scrollbar flex gap-2 overflow-x-auto border-b border-line pb-2">
                {sections.map((item) => <button key={item} type="button" onClick={() => { setSection(item); setSearch(""); }} aria-current={section === item ? "page" : undefined} className={`min-h-11 shrink-0 rounded-lg px-4 font-semibold transition-colors ${section === item ? "bg-brand text-on-brand" : "text-ink-soft hover:bg-surface"}`}>{item}</button>)}
            </nav>

            {section === "Resumen" && esAdministrador && <AdminResumen setNotice={setNotice} onIrA={irA} />}

            {section === "Bitácora" && esAdministrador && <AdminBitacora search={search} setSearch={setSearch} />}

            {section === "Estudiantes" && <section className="space-y-5">
                <FranjaCifras etiqueta="Resumen de estudiantes" cargando={cargandoUsuarios} cifras={[
                    { etiqueta: "Registrados", valor: students.length, detalle: "Total de alumnos" },
                    { etiqueta: "Pendientes", valor: pendingUsers.length, detalle: "Estado Pendiente" },
                    { etiqueta: "Baneados", valor: bannedUsers.length, detalle: "Estado Baneado" },
                ]} />
                <SeccionAdmin
                    titulo="Estudiantes"
                    detalle={cargandoUsuarios || errorUsuarios ? " " : `${filteredStudents.length} de ${students.length} alumnos`}
                    busqueda={search} onBusqueda={setSearch} placeholder="Nombre, alias, correo o matrícula"
                    filtros={<>
                        <CustomSelect ariaLabel="Filtrar por carrera" className="w-56" value={careerFilter} onChange={setCareerFilter} options={[{ value: "", label: "Todas las carreras" }, ...CAREERS.map((career) => ({ value: career, label: career }))]} />
                        <CustomSelect ariaLabel="Filtrar por semestre" className="w-48" value={semesterFilter} onChange={setSemesterFilter} options={[{ value: "", label: "Todos los semestres" }, ...Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: `Semestre ${index + 1}` }))]} />
                        <CustomSelect ariaLabel="Filtrar por estado" className="w-44" value={stateFilter} onChange={setStateFilter} options={[{ value: "", label: "Todos los estados" }, ...states.map((status) => ({ value: status, label: status }))]} />
                        <input aria-label="Mínimo de publicaciones" placeholder="Mín. publicaciones" className="form-input sin-flechas w-44" type="number" min="0" value={postFilter} onChange={(event) => setPostFilter(event.target.value)} />
                        <input aria-label="Mínimo de me gusta" placeholder="Mín. me gusta" className="form-input sin-flechas w-40" type="number" min="0" value={likeFilter} onChange={(event) => setLikeFilter(event.target.value)} />
                    </>}
                >
                    <TablaAdmin
                        columnas={["Alumno", "Carrera / sem.", "Publicaciones", "Me gusta", "Estado", "Acciones"]}
                        cargando={cargandoUsuarios} error={errorUsuarios} onReintentar={reintentarUsuarios} hayFilas={filteredStudents.length > 0}
                        vacio={hayFiltros
                            ? { icono: "buscar", titulo: "Sin resultados", detalle: "Ningún alumno coincide con esos filtros.", accion: { texto: "Limpiar filtros", onClick: limpiarFiltros } }
                            : { icono: "vacio", titulo: "Aún no hay alumnos registrados" }}
                    >
                        {filteredStudents.map((record) => { const counts = getPostCounts(record); return <tr key={record.id}><td><strong className="block font-semibold text-ink">{record.nombre}</strong><small>@{record.alias} · {record.correo}</small></td><td>{getCareerName(record.carrera)}<small>Semestre {record.semestre}</small></td><td className="tabular-nums">{counts.posts}</td><td className="tabular-nums">{counts.likes}</td><td><CustomSelect tamano="compacto" className="min-w-36" ariaLabel={`Estado de ${record.alias}`} value={record.estado} onChange={(estado) => changeStatus(record, estado)} options={states.map((status) => ({ value: status, label: status }))} /></td><td className="text-right"><Link className="inline-flex min-h-9 items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-accent hover:bg-accent/10" to={`/perfil/${record.id}`}>Ver perfil</Link></td></tr>; })}
                    </TablaAdmin>
                </SeccionAdmin>
            </section>}

            {section === "Administradores" && <SeccionAdmin
                titulo="Administradores y moderadores"
                detalle={cargandoUsuarios || errorUsuarios ? " " : `${admins.length} ${admins.length === 1 ? "cuenta" : "cuentas"} con permisos elevados`}
                busqueda={search} onBusqueda={setSearch} placeholder="Nombre o alias"
                accion={esAdministrador && <button type="button" onClick={() => { setErrorAlta(""); setAccountForm(emptyAccountForm); }} className="action-button">+ Dar de alta moderador</button>}
            >
                <TablaAdmin
                    columnas={["Nombre", "Alias", "Correo", "Rol"]}
                    cargando={cargandoUsuarios} error={errorUsuarios} onReintentar={reintentarUsuarios} hayFilas={adminsFiltrados.length > 0}
                    vacio={{ icono: "buscar", titulo: "Sin resultados", detalle: "Prueba con otro nombre o alias.", accion: { texto: "Limpiar búsqueda", onClick: () => setSearch("") } }}
                >
                    {adminsFiltrados.map((record) => <tr key={record.id}><td className="font-semibold text-ink">{record.nombre}</td><td>@{record.alias}</td><td>{record.correo}</td><td>{record.rol}</td></tr>)}
                </TablaAdmin>

                <AnimatePresence>
                    {accountForm && (
                        <PanelLateral
                            titulo="Nuevo moderador"
                            subtitulo="La cuenta queda aprobada al crearla"
                            accion="Crear moderador"
                            onCerrar={() => setAccountForm(null)} onEnviar={createAccount} guardando={creatingAccount} error={errorAlta}
                        >
                            <label className="form-label">Nombre completo<input maxLength={250} className="form-input" value={accountForm.nombre} onChange={(event) => { setAccountForm({ ...accountForm, nombre: event.target.value }); setErrorAlta(""); }}/></label>
                            <label className="form-label">Alias<input maxLength={50} className="form-input" value={accountForm.alias} onChange={(event) => { setAccountForm({ ...accountForm, alias: event.target.value }); setErrorAlta(""); }}/></label>
                            <label className="form-label">Correo institucional<input type="email" maxLength={150} placeholder="usuario@uanl.edu.mx" className="form-input" value={accountForm.correo} onChange={(event) => { setAccountForm({ ...accountForm, correo: event.target.value }); setErrorAlta(""); }}/></label>
                            <label className="form-label">Matrícula<input maxLength={7} inputMode="numeric" className="form-input" value={accountForm.matricula} onChange={(event) => { setAccountForm({ ...accountForm, matricula: event.target.value }); setErrorAlta(""); }}/></label>
                            <CustomSelect label="Carrera" value={accountForm.id_carrera} onChange={(id_carrera) => { setAccountForm({ ...accountForm, id_carrera }); setErrorAlta(""); }} placeholder="Selecciona la carrera" options={carreras.map((carrera) => ({ value: String(carrera.id_carrera), label: getCareerName(carrera.nombre) }))} />
                            <CustomSelect label="Semestre" value={accountForm.semestre} onChange={(semestre) => setAccountForm({ ...accountForm, semestre })} options={Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: `Semestre ${index + 1}` }))} />
                            <p className="rounded-lg bg-field p-3 text-sm text-ink-muted">La contraseña temporal se envía al correo del moderador; nadie más la ve.</p>
                        </PanelLateral>
                    )}
                </AnimatePresence>
            </SeccionAdmin>}

            {section === "Rentas" && <AdminRentas search={search} setSearch={setSearch} />}

            {section === "Horarios" && esAdministrador && <AdminHorarios setNotice={setNotice} />}

            {section === "Tienda" && esAdministrador && <AdminTienda />}

            {section === "Eventos" && <AdminEventos />}
        </section>
    );
}

export default Admin;
