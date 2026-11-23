import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { api, CORREO_UANL, MATRICULA, formatFecha } from "../api/client";
import { CAREERS, getCareerName } from "../utils/careers";
import { AdminBitacora, AdminEventos, AdminHorarios, AdminRentas, AdminResumen, AdminTienda } from "../components/AdminSecciones";

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

function Metric({ label, value, detail, tone = "blue" }) {
    return <article className={`admin-metric admin-metric-${tone}`}><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>;
}

function Admin() {
    const { user } = useAppData();
    const esStaff = user.rol === "Administrador" || user.rol === "Moderador";
    const esAdministrador = user.rol === "Administrador";
    const [users, setUsers] = useState([]);
    // Resumen solo para Administrador; el Moderador entra a Estudiantes (R1-A)
    const [section, setSection] = useState(esAdministrador ? "Resumen" : "Estudiantes");
    const [search, setSearch] = useState("");
    const [careerFilter, setCareerFilter] = useState("");
    const [semesterFilter, setSemesterFilter] = useState("");
    const [postFilter, setPostFilter] = useState("");
    const [likeFilter, setLikeFilter] = useState("");
    const [notice, setNotice] = useState("");
    const [accountForm, setAccountForm] = useState(emptyAccountForm);
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
    }, [esAdministrador]);

    // Usuarios desde la BD (vw_usuarios_admin); la API valida el rol en el servidor
    useEffect(() => {
        if (!esStaff) return undefined;
        let cancelled = false;
        api("usuarios", "listar")
            .then((response) => { if (!cancelled) setUsers(response.usuarios.map(mapAdminUser)); })
            .catch((err) => { if (!cancelled) setNotice(err.message); });
        return () => { cancelled = true; };
    }, [esStaff]);

    // Conteos calculados en la BD (total_publicaciones / total_likes)
    const getPostCounts = (record) => ({ posts: record.posts, likes: record.likes });
    const students = users.filter((record) => record.rol === "Estudiante");
    const admins = users.filter((record) => record.rol === "Administrador" || record.rol === "Moderador");
    const pendingUsers = users.filter((record) => record.estado === "Pendiente");
    const bannedUsers = users.filter((record) => record.estado === "Baneado");

    const filteredStudents = students.filter((record) => {
        const counts = getPostCounts(record);
        const query = search.trim().toLowerCase();
        return (!query || `${record.nombre} ${record.alias} ${record.correo} ${record.matricula || ""}`.toLowerCase().includes(query))
            && (!careerFilter || getCareerName(record.carrera) === careerFilter || record.carrera === careerFilter)
            && (!semesterFilter || String(record.semestre) === semesterFilter)
            && (postFilter === "" || counts.posts >= Number(postFilter))
            && (likeFilter === "" || counts.likes >= Number(likeFilter));
    });

    if (!esStaff) {
        return <section className="settings-section mx-auto max-w-xl text-center"><h1 className="text-2xl font-bold text-ink">Acceso restringido</h1><p className="mt-2 text-ink-muted">Esta sección solo está disponible para administradores.</p><Link to="/feed" className="action-button mt-5">Volver al feed</Link></section>;
    }

    // Alta de moderador (solo Administrador, D14). La clave temporal la genera el servidor.
    const createAccount = async (event) => {
        event.preventDefault();
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
            setAccountForm(emptyAccountForm);
            setNotice(response.message);
            const lista = await api("usuarios", "listar");
            setUsers(lista.usuarios.map(mapAdminUser));
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
            const respuesta = window.prompt(`Motivo (opcional) para ${estado === "Baneado" ? "banear" : "rechazar"} a @${record.alias}:`, "");
            if (respuesta === null) return;
            motivo = respuesta.trim().slice(0, 300);
        }
        try {
            await api("usuarios", "cambiar_estado", { method: "POST", body: { id_usuario: record.id, estado, motivo } });
            setUsers((current) => current.map((item) => item.id === record.id ? { ...item, estado } : item));
            setNotice(`Estado de @${record.alias} actualizado a ${estado}.`);
        } catch (err) {
            setNotice(err.message);
        }
    };

    return (
        <section className="mx-auto w-full max-w-6xl space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
                <div><p className="text-sm font-bold uppercase text-accent">Administración</p><h1 className="mt-1 text-3xl font-bold text-ink">Panel de control</h1><p className="mt-2 text-ink-muted">Sesión: {user.alias || user.nombre} · {user.rol}</p></div>
            </header>

            <nav aria-label="Secciones administrativas" className="flex gap-2 overflow-x-auto border-b border-line pb-2">
                {sections.map((item) => <button key={item} type="button" onClick={() => { setSection(item); setSearch(""); setNotice(""); }} aria-current={section === item ? "page" : undefined} className={`min-h-11 shrink-0 rounded-lg px-4 font-semibold transition-colors ${section === item ? "bg-brand text-on-brand" : "text-ink-soft hover:bg-surface"}`}>{item}</button>)}
            </nav>

            {notice && <p role="status" className="rounded-lg border border-accent/30 bg-brand/10 p-3 text-sm text-ink-soft">{notice}</p>}

            {section === "Resumen" && esAdministrador && <AdminResumen setNotice={setNotice} />}

            {section === "Bitácora" && esAdministrador && <AdminBitacora search={search} setSearch={setSearch} setNotice={setNotice} />}

            {section === "Estudiantes" && <section className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3"><Metric label="Registrados" value={students.length} detail="Total de alumnos"/><Metric label="Pendientes" value={pendingUsers.length} detail="Estado Pendiente" tone="amber"/><Metric label="Baneados" value={bannedUsers.length} detail="Estado Baneado" tone="red"/></div>
                <section className="settings-section">
                    <h2 className="text-lg font-bold text-ink">Buscar y filtrar estudiantes</h2>
                    <div className="admin-filters mt-4">
                        <label className="form-label sm:col-span-2">Buscar por nombre, alias, correo o matrícula<input className="form-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar alumno..." /></label>
                        <label className="form-label">Carrera<select className="form-input" value={careerFilter} onChange={(event) => setCareerFilter(event.target.value)}><option value="">Todas</option>{CAREERS.map((career) => <option key={career} value={career}>{career}</option>)}</select></label>
                        <label className="form-label">Semestre<select className="form-input" value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}><option value="">Todos</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
                        <label className="form-label">Mín. publicaciones<input className="form-input" type="number" min="0" value={postFilter} onChange={(event) => setPostFilter(event.target.value)} /></label>
                        <label className="form-label">Mín. me gusta<input className="form-input" type="number" min="0" value={likeFilter} onChange={(event) => setLikeFilter(event.target.value)} /></label>
                    </div>
                </section>
                <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Alumno</th><th>Carrera / Sem.</th><th>Posts</th><th>Likes</th><th>Estado</th><th>Perfil</th></tr></thead><tbody>{filteredStudents.map((record) => { const counts = getPostCounts(record); return <tr key={record.id}><td><strong>{record.nombre}</strong><small>@{record.alias} · {record.correo}</small></td><td>{getCareerName(record.carrera)}<small>Semestre {record.semestre}</small></td><td>{counts.posts}</td><td>{counts.likes}</td><td><select aria-label={`Estado de ${record.alias}`} className="form-input min-w-36" value={record.estado} onChange={(event) => changeStatus(record, event.target.value)}>{states.map((status) => <option key={status}>{status}</option>)}</select></td><td><Link className="text-accent underline" to={`/perfil/${record.id}`}>Ver perfil</Link></td></tr>; })}</tbody></table>{!filteredStudents.length && <p className="p-6 text-center text-ink-muted">No hay alumnos que coincidan con esos filtros.</p>}</div>
            </section>}

            {section === "Administradores" && <section className="space-y-5">
                {esAdministrador && <section className="settings-section"><h2 className="text-lg font-bold text-ink">Dar de alta un moderador</h2><p className="mt-1 text-sm text-ink-muted">Solo un administrador puede dar de alta moderadores. La cuenta queda aprobada y su contraseña temporal se envía a su correo (nadie más la ve).</p>
                    <form onSubmit={createAccount} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
                        <label className="form-label">Nombre completo<input required maxLength={250} className="form-input" value={accountForm.nombre} onChange={(event) => setAccountForm({ ...accountForm, nombre: event.target.value })}/></label>
                        <label className="form-label">Alias / usuario<input required maxLength={50} className="form-input" value={accountForm.alias} onChange={(event) => setAccountForm({ ...accountForm, alias: event.target.value })}/></label>
                        <label className="form-label">Correo<input required type="email" maxLength={150} placeholder="usuario@uanl.edu.mx" className="form-input" value={accountForm.correo} onChange={(event) => setAccountForm({ ...accountForm, correo: event.target.value })}/></label>
                        <label className="form-label">Rol<input className="form-input" value="Moderador" readOnly /></label>
                        <label className="form-label">Matrícula<input required maxLength={7} inputMode="numeric" pattern="[0-9]{7}" className="form-input" value={accountForm.matricula} onChange={(event) => setAccountForm({ ...accountForm, matricula: event.target.value })}/></label>
                        <label className="form-label">Carrera<select className="form-input" value={accountForm.id_carrera} onChange={(event) => setAccountForm({ ...accountForm, id_carrera: event.target.value })}><option value="">Selecciona la carrera</option>{carreras.map((carrera) => <option key={carrera.id_carrera} value={String(carrera.id_carrera)}>{getCareerName(carrera.nombre)}</option>)}</select></label>
                        <label className="form-label">Semestre<select className="form-input" value={accountForm.semestre} onChange={(event) => setAccountForm({ ...accountForm, semestre: event.target.value })}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Semestre {index + 1}</option>)}</select></label>
                        <button disabled={creatingAccount} className="action-button sm:col-span-2 sm:justify-self-start disabled:cursor-not-allowed disabled:opacity-50">{creatingAccount ? "Creando..." : "Crear moderador"}</button>
                    </form>
                </section>}
                <section className="settings-section"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-ink">Administradores dados de alta</h2><p className="mt-1 text-sm text-ink-muted">{admins.length} cuentas con permisos elevados.</p></div><label className="form-label w-full sm:max-w-sm">Buscar por nombre<input className="form-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o alias"/></label></div><div className="admin-table-wrap mt-4"><table className="admin-table"><thead><tr><th>Nombre</th><th>Alias</th><th>Correo</th><th>Rol</th></tr></thead><tbody>{admins.filter((record) => `${record.nombre} ${record.alias}`.toLowerCase().includes(search.toLowerCase())).map((record) => <tr key={record.id}><td>{record.nombre}</td><td>@{record.alias}</td><td>{record.correo}</td><td>{record.rol}</td></tr>)}</tbody></table></div></section>
            </section>}

            {section === "Rentas" && <AdminRentas search={search} setSearch={setSearch} setNotice={setNotice} />}

            {section === "Horarios" && esAdministrador && <AdminHorarios setNotice={setNotice} />}

            {section === "Tienda" && esAdministrador && <AdminTienda setNotice={setNotice} />}

            {section === "Eventos" && <AdminEventos setNotice={setNotice} />}
        </section>
    );
}

export default Admin;
