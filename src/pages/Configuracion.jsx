import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { api, CORREO_UANL, validarImagen } from "../api/client";
import { getCareerName } from "../utils/careers";

function Configuracion() {
    const { user, preferences, updatePreferences, setSessionUser, logout, clearSession } = useAppData();
    const navigate = useNavigate();
    const fileInput = useRef(null);
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
    const [mensajeFoto, setMensajeFoto] = useState("");
    const [errorFoto, setErrorFoto] = useState("");
    const [mensajeContrasenia, setMensajeContrasenia] = useState("");
    const [errorContrasenia, setErrorContrasenia] = useState("");

    // Catálogo de carreras
    useEffect(() => {
        if (user.debeCambiarContrasena) return; 
        api("usuarios", "carreras")
            .then((response) => setCarreras(response.carreras))
            .catch(() => setError("No se pudieron cargar las carreras."));
    }, [user.debeCambiarContrasena]);

    const idCarreraActual = String(carreras.find((item) => item.nombre === user.carrera)?.id_carrera ?? "");
    const semestreActual = String(user.semestre || "");

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
        if (!window.confirm(`¿Confirmas que deseas cambiar ${cambios}?`)) return;

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

    const changeAvatar = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setMensajeFoto("");
        const problema = validarImagen(file);
        if (problema) {
            setErrorFoto(problema);
            return;
        }
        setErrorFoto("");
        const body = new FormData();
        body.append("foto", file);
        try {
            const response = await api("usuarios", "actualizar_foto", { method: "POST", body });
            setSessionUser(response.user, Date.now());
            setMensajeFoto("Foto de perfil actualizada.");
        } catch (err) {
            setErrorFoto(err.message);
        }
    };

    const removeAccount = async () => {
        if (!window.confirm("¿Seguro que quieres eliminar tu cuenta? Tus publicaciones y comentarios se ocultarán y tus reservaciones futuras se cancelarán. Esta acción no se puede deshacer.")) return;
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
        <section className="mx-auto w-full max-w-3xl space-y-8">
            <header>
                <p className="text-sm font-semibold uppercase tracking-wider text-neon-blue">Tu cuenta</p>
                <h1 className="mt-2 text-3xl font-bold text-text-title-dark">Configuración</h1>
                <p className="mt-2 text-text-muted-dark">Personaliza tu perfil y la forma en que usas PolyBison.</p>
            </header>

            {user.debeCambiarContrasena && <p role="alert" className="rounded-lg border border-secondary/50 bg-secondary/10 p-4 text-sm font-semibold text-neon-red">Estás usando una contraseña temporal. Cámbiala en la sección «Contraseña» (escribe la temporal como «Contraseña actual») para poder usar el resto de PolyBison.</p>}

            <section className="settings-section">
                <h2 className="text-lg font-bold text-text-title-dark">Foto de perfil</h2>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                    <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.alias || user.nombre)}&background=003366&color=fff`} alt="Foto de perfil actual" className="h-16 w-16 rounded-full border border-border-dark object-cover" />
                    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeAvatar} className="sr-only" aria-label="Seleccionar foto de perfil" />
                    <button type="button" onClick={() => fileInput.current?.click()} className="action-button">Cambiar foto</button>
                </div>
                <p className="mt-3 text-sm text-text-muted-dark">JPG, PNG o WebP de máximo 2 MB.</p>
                {mensajeFoto && <p role="status" className="mt-3 text-sm text-neon-blue">{mensajeFoto}</p>}
                {errorFoto && <p role="alert" className="mt-3 text-sm text-neon-red">{errorFoto}</p>}
            </section>

            <section className="settings-section">
                <h2 className="text-lg font-bold text-text-title-dark">Datos de cuenta</h2>
                <form onSubmit={saveEmail} className="mt-4 flex flex-col gap-4" noValidate>
                    <label className="form-label">Correo electrónico
                        <input type="email" value={correoForm} onChange={(event) => setCorreo(event.target.value)} maxLength={150} placeholder="usuario@uanl.edu.mx" autoComplete="email" className="form-input" />
                    </label>
                    <label className="form-label">Carrera
                        <select value={carreraForm} onChange={(event) => setCarrera(event.target.value)} className="form-input">
                            {!idCarreraActual && <option value="">{user.carrera ? getCareerName(user.carrera) : "Selecciona tu carrera"}</option>}
                            {carreras.map((option) => <option key={option.id_carrera} value={String(option.id_carrera)}>{getCareerName(option.nombre)}</option>)}
                        </select>
                    </label>
                    <label className="form-label">Semestre
                        <select value={semestreForm} onChange={(event) => setSemestre(event.target.value)} className="form-input">
                            {!semestreActual && <option value="">Selecciona tu semestre</option>}
                            {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Semestre {index + 1}</option>)}
                        </select>
                    </label>
                    <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={guardando || !hayCambios} className="action-button disabled:cursor-not-allowed disabled:opacity-50">{guardando ? "Guardando..." : "Guardar cambios"}</button>
                        {hayCambios && <button type="button" onClick={() => { reiniciarFormulario(); setError(""); setMensaje(""); }} className="action-button action-button-secondary">Cancelar</button>}
                    </div>
                </form>
                {mensaje && <p role="status" className="mt-3 text-sm text-neon-blue">{mensaje}</p>}
                {error && <p role="alert" className="mt-3 text-sm text-neon-red">{error}</p>}
            </section>

            <section className="settings-section">
                <h2 className="text-lg font-bold text-text-title-dark">Contraseña</h2>
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
                        <button type="submit" disabled={guardandoContrasenia} className="action-button disabled:cursor-not-allowed disabled:opacity-50">{guardandoContrasenia ? "Guardando..." : "Cambiar contraseña"}</button>
                    </div>
                </form>
                {mensajeContrasenia && <p role="status" className="mt-3 text-sm text-neon-blue">{mensajeContrasenia}</p>}
                {errorContrasenia && <p role="alert" className="mt-3 text-sm text-neon-red">{errorContrasenia}</p>}
            </section>

            <section className="settings-section">
                <h2 className="text-lg font-bold text-text-title-dark">Apariencia</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <label className="form-label">Tema
                        <select value={preferences.theme} onChange={(event) => updatePreferences({ theme: event.target.value })} className="form-input">
                            <option value="dark">Oscuro</option>
                            <option value="light">Claro</option>
                        </select>
                    </label>
                    <label className="form-label">Tamaño de fuente
                        <select value={preferences.fontSize} onChange={(event) => updatePreferences({ fontSize: event.target.value })} className="form-input">
                            <option value="small">Pequeña</option>
                            <option value="normal">Normal</option>
                            <option value="large">Grande</option>
                        </select>
                    </label>
                </div>
            </section>

            <section className="settings-section flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-text-title-dark">Sesión</h2>
                    <p className="mt-1 text-sm text-text-muted-dark">Cierra la sesión en este dispositivo.</p>
                </div>
                <button type="button" onClick={cerrarSesion} className="action-button action-button-danger">Cerrar sesión</button>
            </section>

            {user.rol !== "Administrador" && <section className="settings-section border-secondary/50">
                <h2 className="text-lg font-bold text-neon-red">Zona de peligro</h2>
                <p className="mt-1 text-sm text-text-muted-dark">Eliminará tu cuenta; tus publicaciones y comentarios dejarán de mostrarse.</p>
                <button type="button" onClick={removeAccount} className="action-button action-button-danger mt-4">Eliminar cuenta</button>
            </section>}
        </section>
    );
}

export default Configuracion;
