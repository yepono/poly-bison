import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { api, CORREO_UANL } from "../api/client";
import { useCambioFoto } from "../components/useCambioFoto";
import Avatar from "../components/Avatar";
import CustomSelect from "../components/CustomSelect";
import PageHeader from "../components/PageHeader";
import { useDialogos } from "../components/Dialogos";
import { getCareerName } from "../utils/careers";

function Configuracion() {
    const { user, preferences, updatePreferences, setSessionUser, logout, clearSession } = useAppData();
    const navigate = useNavigate();
    const { confirmar } = useDialogos();
    const foto = useCambioFoto();
    const [carreras, setCarreras] = useState([]);
    // Valores editados; null = sin tocar (se muestra el valor actual del usuario)
    const [correo, setCorreo] = useState(null);
    const [carrera, setCarrera] = useState(null);    // id_carrera como texto
    const [semestre, setSemestre] = useState(null);
    const [contraseniaActual, setContraseniaActual] = useState("");
    const [contrasenia, setContrasenia] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [guardandoContrasenia, setGuardandoContrasenia] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [mensajeContrasenia, setMensajeContrasenia] = useState("");
    const [errorContrasenia, setErrorContrasenia] = useState("");

    // Catálogo de carreras (todos los usuarios son estudiantes de la FCFM)
    useEffect(() => {
        if (user.debeCambiarContrasena) return; // con clave temporal la API solo permite cambiarla
        api("usuarios", "carreras")
            .then((response) => setCarreras(response.carreras))
            .catch(() => setError("No se pudieron cargar las carreras."));
    }, [user.debeCambiarContrasena]);

    const idCarreraActual = String(carreras.find((item) => item.nombre === user.carrera)?.id_carrera ?? "");
    const semestreActual = String(user.semestre || "");

    // Valores que se muestran en el formulario
    const correoForm = correo ?? user.correo;
    const carreraForm = carrera ?? idCarreraActual;
    const semestreForm = semestre ?? semestreActual;

    const correoLimpio = correoForm.trim().toLowerCase();
    const correoCambio = correoLimpio !== user.correo;
    const carreraCambio = carreraForm !== "" && carreraForm !== idCarreraActual;
    const semestreCambio = semestreForm !== "" && semestreForm !== semestreActual;
    const hayCambios = correoCambio || carreraCambio || semestreCambio;

    const reiniciarFormulario = () => {
        setCorreo(null);
        setCarrera(null);
        setSemestre(null);
    };

    const saveEmail = async (event) => {
        event.preventDefault();
        setMensaje("");
        setError("");

        if (!hayCambios) {
            setMensaje("No hubo cambios en los datos de cuenta.");
            return;
        }

        // Validaciones (las mismas que aplica usuarios.php)
        if (correoCambio && !CORREO_UANL.test(correoLimpio)) {
            setError("Usa tu correo institucional @uanl.edu.mx.");
            return;
        }
        if (semestreCambio && (Number(semestreForm) < 1 || Number(semestreForm) > 10)) {
            setError("Selecciona un semestre válido.");
            return;
        }
        const cambios = [
            correoCambio && "correo",
            carreraCambio && "carrera",
            semestreCambio && "semestre",
        ].filter(Boolean).join(", ");
        if (!(await confirmar({ titulo: "¿Guardar los cambios?", mensaje: `Se actualizará: ${cambios}.`, accion: "Guardar" }))) return;

        setGuardando(true);
        try {
            const body = {};
            if (correoCambio) body.correo = correoLimpio;
            if (carreraCambio) body.id_carrera = Number(carreraForm);
            if (semestreCambio) body.semestre = Number(semestreForm);
            const response = await api("usuarios", "actualizar_perfil", { method: "POST", body });
            setSessionUser(response.user);
            reiniciarFormulario();
            setMensaje("Cambios guardados.");
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    // Cambio de contraseña: sección propia, siempre visible
    const savePassword = async (event) => {
        event.preventDefault();
        setMensajeContrasenia("");
        setErrorContrasenia("");
        if (!contraseniaActual) {
            setErrorContrasenia("Escribe tu contraseña actual.");
            return;
        }
        if (contrasenia.length < 8) {
            setErrorContrasenia("La nueva contraseña debe tener al menos 8 caracteres.");
            return;
        }
        if (contrasenia.length > 72) {
            setErrorContrasenia("La nueva contraseña no puede tener más de 72 caracteres.");
            return;
        }
        if (contrasenia !== confirmacion) {
            setErrorContrasenia("La confirmación no coincide con la nueva contraseña.");
            return;
        }
        if (contrasenia === contraseniaActual) {
            setErrorContrasenia("La nueva contraseña debe ser diferente a la actual.");
            return;
        }
        setGuardandoContrasenia(true);
        try {
            const response = await api("usuarios", "cambiar_contrasena", { method: "POST", body: { actual: contraseniaActual, nueva: contrasenia } });
            setSessionUser(response.user); // quita la marca de clave temporal
            setContraseniaActual("");
            setContrasenia("");
            setConfirmacion("");
            setMensajeContrasenia("Contraseña actualizada.");
        } catch (err) {
            setErrorContrasenia(err.message);
        } finally {
            setGuardandoContrasenia(false);
        }
    };

    const removeAccount = async () => {
        const ok = await confirmar({
            titulo: "¿Eliminar tu cuenta?",
            mensaje: "Tus publicaciones y comentarios se ocultarán y tus reservaciones futuras se cancelarán. Esta acción no se puede deshacer.",
            accion: "Eliminar mi cuenta",
            peligro: true,
        });
        if (!ok) return;
        setError("");
        try {
            await api("usuarios", "eliminar_cuenta", { method: "POST" });
            clearSession();
            navigate("/registro", { replace: true });
        } catch (err) {
            setError(err.message);
        }
    };

    const cerrarSesion = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    return (
        <section className="pagina-angosta">
            <PageHeader titulo="Configuración" subtitulo="Personaliza tu perfil y la forma en que usas PolyBison." />

            {user.debeCambiarContrasena && <p role="alert" className="rounded-lg border border-danger/50 bg-danger/10 p-4 text-sm font-semibold text-danger">Estás usando una contraseña temporal. Cámbiala en la sección «Contraseña» (escribe la temporal como «Contraseña actual») para poder usar el resto de PolyBison.</p>}

            <section className="settings-section">
                <h2 className="text-lg font-bold text-ink">Foto de perfil</h2>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                    <Avatar src={user.avatar} nombre={user.alias || user.nombre} className="h-16 w-16 border border-line" />
                    <button type="button" onClick={foto.seleccionar} className="action-button">{user.avatar ? "Cambiar foto" : "Agregar foto"}</button>
                    {foto.elementos}
                </div>
                <p className="mt-3 text-sm text-ink-muted">JPG, PNG o WebP. Podrás recortarla antes de guardarla.</p>
                {foto.mensaje && <p role="status" className="mt-3 text-sm text-accent">{foto.mensaje}</p>}
                {foto.error && <p role="alert" className="mt-3 text-sm text-danger">{foto.error}</p>}
            </section>

            <section className="settings-section">
                <h2 className="text-lg font-bold text-ink">Datos de cuenta</h2>
                <form onSubmit={saveEmail} className="mt-4 flex flex-col gap-4" noValidate>
                    <label className="form-label">Correo electrónico
                        <input type="email" value={correoForm} onChange={(event) => setCorreo(event.target.value)} maxLength={150} placeholder="usuario@uanl.edu.mx" autoComplete="email" className="form-input" />
                    </label>
                    <CustomSelect
                        label="Carrera"
                        value={carreraForm}
                        onChange={setCarrera}
                        placeholder={user.carrera ? getCareerName(user.carrera) : "Selecciona tu carrera"}
                        options={carreras.map((option) => ({ value: String(option.id_carrera), label: getCareerName(option.nombre) }))}
                    />
                    <CustomSelect
                        label="Semestre"
                        value={semestreForm}
                        onChange={setSemestre}
                        placeholder="Selecciona tu semestre"
                        options={Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: `Semestre ${index + 1}` }))}
                    />
                    <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={guardando || !hayCambios} className="action-button">{guardando ? "Guardando..." : "Guardar cambios"}</button>
                        {hayCambios && <button type="button" onClick={() => { reiniciarFormulario(); setError(""); setMensaje(""); }} className="action-button action-button-secondary">Cancelar</button>}
                    </div>
                </form>
                {mensaje && <p role="status" className="mt-3 text-sm text-accent">{mensaje}</p>}
                {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
            </section>

            <section className="settings-section">
                <h2 className="text-lg font-bold text-ink">Contraseña</h2>
                <form onSubmit={savePassword} className="mt-4 flex flex-col gap-4" noValidate>
                    <label className="form-label">Contraseña actual
                        <input type="password" value={contraseniaActual} onChange={(event) => setContraseniaActual(event.target.value)} autoComplete="current-password" className="form-input" />
                    </label>
                    <label className="form-label">Nueva contraseña
                        <input type="password" value={contrasenia} onChange={(event) => setContrasenia(event.target.value)} maxLength={72} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="form-input" />
                    </label>
                    <label className="form-label">Confirmar nueva contraseña
                        <input type="password" value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} maxLength={72} autoComplete="new-password" className="form-input" />
                    </label>
                    <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={guardandoContrasenia} className="action-button">{guardandoContrasenia ? "Guardando..." : "Cambiar contraseña"}</button>
                    </div>
                </form>
                {mensajeContrasenia && <p role="status" className="mt-3 text-sm text-accent">{mensajeContrasenia}</p>}
                {errorContrasenia && <p role="alert" className="mt-3 text-sm text-danger">{errorContrasenia}</p>}
            </section>

            <section className="settings-section">
                <h2 className="text-lg font-bold text-ink">Apariencia</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <CustomSelect
                        label="Tema"
                        value={preferences.theme}
                        onChange={(theme) => updatePreferences({ theme })}
                        options={[{ value: "dark", label: "Oscuro" }, { value: "gray", label: "Gris oscuro" }, { value: "light", label: "Claro" }]}
                    />
                    <CustomSelect
                        label="Tamaño de fuente"
                        value={preferences.fontSize}
                        onChange={(fontSize) => updatePreferences({ fontSize })}
                        options={[{ value: "small", label: "Pequeña" }, { value: "normal", label: "Normal" }, { value: "large", label: "Grande" }]}
                    />
                </div>
            </section>

            <section className="settings-section flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-ink">Sesión</h2>
                    <p className="mt-1 text-sm text-ink-muted">Cierra la sesión en este dispositivo.</p>
                </div>
                <button type="button" onClick={cerrarSesion} className="action-button action-button-danger">Cerrar sesión</button>
            </section>

            {user.rol !== "Administrador" && <section className="settings-section border-danger/50">
                <h2 className="text-lg font-bold text-danger">Zona de peligro</h2>
                <p className="mt-1 text-sm text-ink-muted">Eliminará tu cuenta; tus publicaciones y comentarios dejarán de mostrarse.</p>
                <button type="button" onClick={removeAccount} className="action-button action-button-danger mt-4">Eliminar cuenta</button>
            </section>}
        </section>
    );
}

export default Configuracion;
