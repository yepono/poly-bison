import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { CAREERS, getCareerName } from "../utils/careers";

const sections = ["Resumen", "Estudiantes", "Administradores", "Rentas", "Horarios", "Tienda", "Eventos"];
const states = ["Pendiente", "Aprobado", "Rechazado", "Baneado"];
const eventTypes = ["Académico", "Examen", "Asueto", "Cultural", "Deportivo"];

function Metric({ label, value, detail, tone = "blue" }) {
    return <article className={`admin-metric admin-metric-${tone}`}><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>;
}

function Admin() {
    const {
        user, users, posts, reservations, schedules, products, events,
        addManagedUser, updateManagedUser, updateSchedules, updateProducts, updateEvents,
    } = useAppData();
    const [section, setSection] = useState("Resumen");
    const [search, setSearch] = useState("");
    const [careerFilter, setCareerFilter] = useState("");
    const [semesterFilter, setSemesterFilter] = useState("");
    const [postFilter, setPostFilter] = useState("");
    const [likeFilter, setLikeFilter] = useState("");
    const [notice, setNotice] = useState("");
    const [productForm, setProductForm] = useState({ titulo: "", precio: "", categoria: "", descripcionCorta: "" });
    const [eventForm, setEventForm] = useState({ titulo: "", descripcion: "", tipo: "Académico", fecha_inicio: "", fecha_fin: "", lugar: "" });
    const [accountForm, setAccountForm] = useState({ nombre: "", alias: "", correo: "", matricula: "", rol: "Administrador", carrera: CAREERS[0], semestre: "1" });
    const [temporaryPassword, setTemporaryPassword] = useState("");

    const getPostCounts = (record) => {
        const ownPosts = posts.filter((post) => post.authorId === record.id || post.autor === record.alias || post.autor === record.nombre);
        return { posts: ownPosts.length, likes: ownPosts.reduce((total, post) => total + Number(post.likes || 0), 0) };
    };
    const students = users.filter((record) => record.rol === "Estudiante");
    const admins = users.filter((record) => record.rol === "Administrador" || record.rol === "Moderador");
    const activeUsers = users.filter((record) => record.estado === "Aprobado");
    const pendingUsers = users.filter((record) => record.estado === "Pendiente");
    const bannedUsers = users.filter((record) => record.estado === "Baneado");
    const mostActive = [...students].sort((a, b) => getPostCounts(b).posts - getPostCounts(a).posts).slice(0, 5);
    const mostInteracted = [...posts].sort((a, b) => b.likes + (b.comentarios?.length || 0) - (a.likes + (a.comentarios?.length || 0))).slice(0, 5);

    const filteredStudents = students.filter((record) => {
        const counts = getPostCounts(record);
        const query = search.trim().toLowerCase();
        return (!query || `${record.nombre} ${record.alias} ${record.correo} ${record.matricula || ""}`.toLowerCase().includes(query))
            && (!careerFilter || getCareerName(record.carrera) === careerFilter || record.carrera === careerFilter)
            && (!semesterFilter || String(record.semestre) === semesterFilter)
            && (postFilter === "" || counts.posts >= Number(postFilter))
            && (likeFilter === "" || counts.likes >= Number(likeFilter));
    });

    if (user.rol !== "Administrador" && user.rol !== "Moderador") {
        return <section className="settings-section mx-auto max-w-xl text-center"><h1 className="text-2xl font-bold text-text-title-dark">Acceso restringido</h1><p className="mt-2 text-text-muted-dark">Esta sección solo está disponible para administradores.</p><Link to="/feed" className="action-button mt-5">Volver al feed</Link></section>;
    }

    const createAccount = (event) => {
        event.preventDefault();
        const duplicate = users.some((record) => record.correo.toLowerCase() === accountForm.correo.trim().toLowerCase() || record.alias.toLowerCase() === accountForm.alias.trim().toLowerCase() || (accountForm.matricula && record.matricula === accountForm.matricula.trim()));
        if (duplicate) {
            setNotice("Ya existe una cuenta con ese correo o alias.");
            setTemporaryPassword("");
            return;
        }
        const generatedPassword = globalThis.crypto?.getRandomValues
            ? Array.from(crypto.getRandomValues(new Uint8Array(9)), (byte) => (byte % 36).toString(36)).join("")
            : Math.random().toString(36).slice(2, 11);
        addManagedUser({ ...accountForm, semestre: Number(accountForm.semestre), estado: "Aprobado" });
        setTemporaryPassword(generatedPassword);
        setAccountForm({ nombre: "", alias: "", correo: "", matricula: "", rol: "Administrador", carrera: CAREERS[0], semestre: "1" });
        setNotice("La cuenta local se creó. En producción la clave debe generarse y guardarse con hash en PHP.");
    };

    const removeSlot = (slot) => updateSchedules(schedules.filter((item) => item !== slot));
    const createProduct = (event) => {
        event.preventDefault();
        if (!productForm.titulo.trim()) return;
        updateProducts([{ ...productForm, id: Date.now(), precio: productForm.precio.startsWith("$") ? productForm.precio : `$${productForm.precio} MXN`, imagen: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop", descripcionLarga: productForm.descripcionCorta }, ...products]);
        setProductForm({ titulo: "", precio: "", categoria: "", descripcionCorta: "" });
        setNotice("Artículo agregado al catálogo local.");
    };
    const createEvent = (event) => {
        event.preventDefault();
        if (new Date(eventForm.fecha_fin) < new Date(eventForm.fecha_inicio)) {
            setNotice("La fecha de fin del evento debe ser posterior a la fecha de inicio.");
            return;
        }
        updateEvents([{ ...eventForm, id_evento: Date.now(), visible: true }, ...events]);
        setEventForm({ titulo: "", descripcion: "", tipo: "Académico", fecha_inicio: "", fecha_fin: "", lugar: "" });
        setNotice("Evento agregado al calendario local.");
    };

    const editEventSchedule = (item) => {
        const start = window.prompt("Inicio (AAAA-MM-DDTHH:mm)", item.fecha_inicio.slice(0, 16));
        if (start === null) return;
        const end = window.prompt("Fin (AAAA-MM-DDTHH:mm)", item.fecha_fin.slice(0, 16));
        if (end === null || new Date(end) < new Date(start)) {
            setNotice("La fecha de fin debe ser posterior a la fecha de inicio.");
            return;
        }
        const lugar = window.prompt("Lugar del evento", item.lugar || "");
        if (lugar === null) return;
        updateEvents(events.map((event) => event.id_evento === item.id_evento
            ? { ...event, fecha_inicio: start, fecha_fin: end, lugar }
            : event));
    };

    return (
        <section className="mx-auto w-full max-w-6xl space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border-dark pb-5">
                <div><p className="text-sm font-bold uppercase text-neon-blue">Administración</p><h1 className="mt-1 text-3xl font-bold text-text-title-dark">Panel de control</h1><p className="mt-2 text-text-muted-dark">Sesión: {user.alias || user.nombre} · {user.rol}</p></div>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">Modo local de demostración</span>
            </header>

            <nav aria-label="Secciones administrativas" className="flex gap-2 overflow-x-auto border-b border-border-dark pb-2">
                {sections.map((item) => <button key={item} type="button" onClick={() => { setSection(item); setSearch(""); setNotice(""); }} aria-current={section === item ? "page" : undefined} className={`min-h-11 shrink-0 rounded-lg px-4 font-semibold transition-colors ${section === item ? "bg-primary text-white" : "text-text-body-dark hover:bg-surface-dark"}`}>{item}</button>)}
            </nav>

            {notice && <p role="status" className="rounded-lg border border-neon-blue/30 bg-primary/10 p-3 text-sm text-text-body-dark">{notice}</p>}

            {section === "Resumen" && <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <Metric label="Alumnos registrados" value={students.length} detail="Cuentas estudiantiles" />
                    <Metric label="Usuarios activos" value={activeUsers.length} detail="Estatus aprobado" tone="green" />
                    <Metric label="Pendientes" value={pendingUsers.length} detail="Requieren revisión" tone="amber" />
                    <Metric label="Baneados" value={bannedUsers.length} detail="Cuentas restringidas" tone="red" />
                    <Metric label="Administradores" value={admins.length} detail="Admin y moderación" tone="dark" />
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                    <section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Usuarios más activos</h2><div className="mt-4 divide-y divide-border-dark">{mostActive.map((record, index) => <div key={record.id} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0 truncate text-text-title-dark"><b className="mr-3 text-neon-blue">0{index + 1}</b>{record.alias}</span><span className="shrink-0 font-bold text-text-title-dark">{getPostCounts(record).posts} posts</span></div>)}</div></section>
                    <section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Publicaciones con mayor interacción</h2><div className="mt-4 divide-y divide-border-dark">{mostInteracted.map((post) => <div key={post.id} className="py-3"><p className="line-clamp-1 font-semibold text-text-title-dark">{post.titulo || post.contenido}</p><p className="mt-1 text-sm text-text-muted-dark">{post.autor} · {post.likes} likes · {post.comentarios?.length || 0} comentarios</p></div>)}</div></section>
                </div>
            </>}

            {section === "Estudiantes" && <section className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3"><Metric label="Registrados" value={students.length} detail="Total de alumnos"/><Metric label="Pendientes" value={pendingUsers.length} detail="Estado Pendiente" tone="amber"/><Metric label="Baneados" value={bannedUsers.length} detail="Estado Baneado" tone="red"/></div>
                <section className="settings-section">
                    <h2 className="text-lg font-bold text-text-title-dark">Buscar y filtrar estudiantes</h2>
                    <div className="admin-filters mt-4">
                        <label className="form-label sm:col-span-2">Buscar por nombre, alias, correo o matrícula<input className="form-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar alumno..." /></label>
                        <label className="form-label">Carrera<select className="form-input" value={careerFilter} onChange={(event) => setCareerFilter(event.target.value)}><option value="">Todas</option>{CAREERS.map((career) => <option key={career} value={career}>{career}</option>)}</select></label>
                        <label className="form-label">Semestre<select className="form-input" value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}><option value="">Todos</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
                        <label className="form-label">Mín. publicaciones<input className="form-input" type="number" min="0" value={postFilter} onChange={(event) => setPostFilter(event.target.value)} /></label>
                        <label className="form-label">Mín. me gusta<input className="form-input" type="number" min="0" value={likeFilter} onChange={(event) => setLikeFilter(event.target.value)} /></label>
                    </div>
                </section>
                <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Alumno</th><th>Carrera / Sem.</th><th>Posts</th><th>Likes</th><th>Estado</th><th>Perfil</th></tr></thead><tbody>{filteredStudents.map((record) => { const counts = getPostCounts(record); return <tr key={record.id}><td><strong>{record.nombre}</strong><small>@{record.alias} · {record.correo}</small></td><td>{getCareerName(record.carrera)}<small>Semestre {record.semestre}</small></td><td>{counts.posts}</td><td>{counts.likes}</td><td><select aria-label={`Estado de ${record.alias}`} className="form-input min-w-36" value={record.estado} onChange={(event) => updateManagedUser(record.id, { estado: event.target.value, id_revisor: user.id })}>{states.map((status) => <option key={status}>{status}</option>)}</select></td><td><Link className="text-neon-blue underline" to={`/perfil/${record.id}`}>Ver perfil</Link></td></tr>; })}</tbody></table>{!filteredStudents.length && <p className="p-6 text-center text-text-muted-dark">No hay alumnos que coincidan con esos filtros.</p>}</div>
            </section>}

            {section === "Administradores" && <section className="space-y-5">
                <section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Dar de alta una cuenta</h2><p className="mt-1 text-sm text-text-muted-dark">Elige el rol. Solo un administrador puede dar de alta a otro administrador.</p>
                    <form onSubmit={createAccount} className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="form-label">Nombre completo<input required className="form-input" value={accountForm.nombre} onChange={(event) => setAccountForm({ ...accountForm, nombre: event.target.value })}/></label>
                        <label className="form-label">Alias / usuario<input required className="form-input" value={accountForm.alias} onChange={(event) => setAccountForm({ ...accountForm, alias: event.target.value })}/></label>
                        <label className="form-label">Correo<input required type="email" className="form-input" value={accountForm.correo} onChange={(event) => setAccountForm({ ...accountForm, correo: event.target.value })}/></label>
                        <label className="form-label">Rol<select className="form-input" value={accountForm.rol} onChange={(event) => setAccountForm({ ...accountForm, rol: event.target.value })}><option>Administrador</option><option>Moderador</option><option>Estudiante</option></select></label>
                        {accountForm.rol === "Estudiante" && <><label className="form-label">Matrícula<input required className="form-input" maxLength="10" value={accountForm.matricula} onChange={(event) => setAccountForm({ ...accountForm, matricula: event.target.value })}/></label><label className="form-label">Carrera<select className="form-input" value={accountForm.carrera} onChange={(event) => setAccountForm({ ...accountForm, carrera: event.target.value })}>{CAREERS.map((career) => <option key={career}>{career}</option>)}</select></label><label className="form-label">Semestre<input className="form-input" type="number" min="1" max="12" value={accountForm.semestre} onChange={(event) => setAccountForm({ ...accountForm, semestre: event.target.value })}/></label></>}
                        <button className="action-button sm:col-span-2 sm:justify-self-start">Crear cuenta local</button>
                    </form>
                    {temporaryPassword && <div className="mt-5 rounded-lg border border-green-600/30 bg-green-500/10 p-4"><p className="font-bold text-text-title-dark">Clave temporal de demostración</p><code className="mt-2 block select-all font-mono text-lg text-neon-blue">{temporaryPassword}</code><p className="mt-2 text-sm text-text-muted-dark">Se muestra solo en esta sesión y no se guarda. El login todavía no valida credenciales.</p></div>}
                </section>
                <section className="settings-section"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-text-title-dark">Administradores dados de alta</h2><p className="mt-1 text-sm text-text-muted-dark">{admins.length} cuentas con permisos elevados.</p></div><label className="form-label w-full sm:max-w-sm">Buscar por nombre<input className="form-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o alias"/></label></div><div className="admin-table-wrap mt-4"><table className="admin-table"><thead><tr><th>Nombre</th><th>Alias</th><th>Correo</th><th>Rol</th></tr></thead><tbody>{admins.filter((record) => `${record.nombre} ${record.alias}`.toLowerCase().includes(search.toLowerCase())).map((record) => <tr key={record.id}><td>{record.nombre}</td><td>@{record.alias}</td><td>{record.correo}</td><td>{record.rol}</td></tr>)}</tbody></table></div></section>
            </section>}

            {section === "Rentas" && <section className="settings-section"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-text-title-dark">Historial global de rentas de aulas</h2><p className="mt-1 text-sm text-text-muted-dark">{reservations.length} reservas de demostración</p></div><label className="form-label w-full sm:max-w-sm">Buscar usuario o aula<input className="form-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Alias, matrícula o aula"/></label></div><div className="admin-table-wrap mt-4"><table className="admin-table"><thead><tr><th>Aula</th><th>Usuario</th><th>Matrícula</th><th>Fecha</th><th>Horario</th><th>Estado</th></tr></thead><tbody>{reservations.filter((item) => `${item.aula} ${item.alias} ${item.matricula}`.toLowerCase().includes(search.toLowerCase())).map((item) => <tr key={item.id}><td>{item.aula}</td><td>@{item.alias}</td><td>{item.matricula}</td><td>{item.fecha}</td><td>{item.hora}</td><td>{item.estado}</td></tr>)}</tbody></table></div></section>}

            {section === "Horarios" && <section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Editar horarios disponibles</h2><p className="mt-1 text-sm text-text-muted-dark">Los horarios editados se reflejan en Reserva de Aulas.</p><form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); const start = event.currentTarget.elements.start.value; const end = event.currentTarget.elements.end.value; const value = `${start} - ${end}`; if (start && end && end > start && !schedules.includes(value)) updateSchedules([...schedules, value].sort()); event.currentTarget.reset(); }}><label className="form-label">Agregar bloque<input required name="start" type="time" className="form-input"/></label><label className="form-label">Fin<input required name="end" type="time" className="form-input"/></label><button className="action-button">Agregar horario</button></form><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{schedules.map((slot) => <div key={slot} className="flex items-center justify-between gap-3 rounded-lg border border-border-dark bg-bg-dark p-3"><span className="font-semibold text-text-title-dark">{slot}</span><div><button type="button" onClick={() => { const replacement = window.prompt("Escribe el bloque en formato HH:MM - HH:MM", slot); if (replacement?.match(/^([01]\\d|2[0-3]):[0-5]\\d - ([01]\\d|2[0-3]):[0-5]\\d$/)) updateSchedules(schedules.map((item) => item === slot ? replacement : item).sort()); }} aria-label={`Editar ${slot}`} className="min-h-11 rounded-md px-3 text-neon-blue hover:bg-primary/10">Editar</button><button type="button" onClick={() => removeSlot(slot)} aria-label={`Eliminar ${slot}`} className="min-h-11 rounded-md px-3 text-neon-red hover:bg-secondary/10">Eliminar</button></div></div>)}</div></section>}

            {section === "Tienda" && <section className="space-y-5"><section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Agregar artículo</h2><form onSubmit={createProduct} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="form-label">Nombre<input required className="form-input" value={productForm.titulo} onChange={(event) => setProductForm({ ...productForm, titulo: event.target.value })}/></label><label className="form-label">Precio<input required type="number" min="0" step="0.01" className="form-input" value={productForm.precio} onChange={(event) => setProductForm({ ...productForm, precio: event.target.value })}/></label><label className="form-label">Categoría<input required className="form-input" value={productForm.categoria} onChange={(event) => setProductForm({ ...productForm, categoria: event.target.value })}/></label><label className="form-label">Descripción breve<input className="form-input" value={productForm.descripcionCorta} onChange={(event) => setProductForm({ ...productForm, descripcionCorta: event.target.value })}/></label><button className="action-button sm:col-span-2 sm:justify-self-start">Agregar artículo</button></form></section><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Acción</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><input aria-label={`Nombre ${product.titulo}`} className="form-input min-w-44" value={product.titulo} onChange={(event) => updateProducts(products.map((item) => item.id === product.id ? { ...item, titulo: event.target.value } : item))}/><input aria-label={`Descripción ${product.titulo}`} className="form-input mt-2 min-w-44" value={product.descripcionCorta || ""} onChange={(event) => updateProducts(products.map((item) => item.id === product.id ? { ...item, descripcionCorta: event.target.value, descripcionLarga: event.target.value } : item))}/></td><td>{product.categoria}</td><td><input aria-label={`Precio ${product.titulo}`} className="form-input min-w-28" value={product.precio} onChange={(event) => updateProducts(products.map((item) => item.id === product.id ? { ...item, precio: event.target.value } : item))}/></td><td><button type="button" className="min-h-11 px-3 text-neon-red" onClick={() => updateProducts(products.filter((item) => item.id !== product.id))}>Eliminar</button></td></tr>)}</tbody></table></div></section>}

            {section === "Eventos" && <section className="space-y-5"><section className="settings-section"><h2 className="text-lg font-bold text-text-title-dark">Publicar evento</h2><form onSubmit={createEvent} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="form-label">Título<input required className="form-input" value={eventForm.titulo} onChange={(event) => setEventForm({ ...eventForm, titulo: event.target.value })}/></label><label className="form-label">Tipo<select className="form-input" value={eventForm.tipo} onChange={(event) => setEventForm({ ...eventForm, tipo: event.target.value })}>{eventTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="form-label">Inicio<input required type="datetime-local" className="form-input" value={eventForm.fecha_inicio} onChange={(event) => setEventForm({ ...eventForm, fecha_inicio: event.target.value })}/></label><label className="form-label">Fin<input required type="datetime-local" className="form-input" value={eventForm.fecha_fin} onChange={(event) => setEventForm({ ...eventForm, fecha_fin: event.target.value })}/></label><label className="form-label">Lugar<input className="form-input" value={eventForm.lugar} onChange={(event) => setEventForm({ ...eventForm, lugar: event.target.value })}/></label><label className="form-label">Descripción<input className="form-input" value={eventForm.descripcion} onChange={(event) => setEventForm({ ...eventForm, descripcion: event.target.value })}/></label><button className="action-button sm:col-span-2 sm:justify-self-start">Agregar evento</button></form></section><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Evento</th><th>Fecha</th><th>Lugar</th><th>Visible</th><th>Acción</th></tr></thead><tbody>{events.map((item) => <tr key={item.id_evento}><td><input aria-label={`Título ${item.titulo}`} className="form-input min-w-44" value={item.titulo} onChange={(event) => updateEvents(events.map((current) => current.id_evento === item.id_evento ? { ...current, titulo: event.target.value } : current))}/><small>{item.tipo}</small><input aria-label={`Descripción ${item.titulo}`} className="form-input mt-2 min-w-44" value={item.descripcion || ""} onChange={(event) => updateEvents(events.map((current) => current.id_evento === item.id_evento ? { ...current, descripcion: event.target.value } : current))}/></td><td>{new Date(item.fecha_inicio).toLocaleString("es-MX")}</td><td>{item.lugar}</td><td>{item.visible ? "Sí" : "No"}</td><td><div className="flex flex-col gap-2"><button type="button" className="min-h-11 px-2 text-neon-blue" onClick={() => updateEvents(events.map((event) => event.id_evento === item.id_evento ? { ...event, visible: !event.visible } : event))}>{item.visible ? "Ocultar" : "Mostrar"}</button><button type="button" className="min-h-11 px-2 text-neon-red" onClick={() => updateEvents(events.filter((event) => event.id_evento !== item.id_evento))}>Eliminar</button><button type="button" className="min-h-11 px-2 text-neon-blue" onClick={() => editEventSchedule(item)}>Editar fecha/lugar</button></div></td></tr>)}</tbody></table></div></section>}
        </section>
    );
}

export default Admin;
