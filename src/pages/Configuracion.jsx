import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { CAREERS, getCareerName } from "../utils/careers";

function Configuracion() {
    const { user, preferences, updateUser, updatePreferences, deleteAccount } = useAppData();
    const navigate = useNavigate();
    const fileInput = useRef(null);
    const [correo, setCorreo] = useState(user.correo);
    const [carrera, setCarrera] = useState(getCareerName(user.carrera));
    const [contrasenia, setContrasenia] = useState("");
    const [editandoCuenta, setEditandoCuenta] = useState(false);
    const [mensaje, setMensaje] = useState("");

    const saveEmail = (event) => {
        event.preventDefault();
        const correoCambio = correo !== user.correo;
        const carreraCambio = carrera !== getCareerName(user.carrera);
        const contraseniaCambio = Boolean(contrasenia.trim());
        if (!correoCambio && !carreraCambio && !contraseniaCambio) {
            setEditandoCuenta(false);
            setMensaje("No hubo cambios en los datos de cuenta.");
            return;
        }

        const cambios = [
            correoCambio && "correo",
            carreraCambio && "carrera",
            contraseniaCambio && "contraseña",
        ].filter(Boolean).join(", ");
        if (!window.confirm(`¿Confirmas que deseas cambiar ${cambios}?`)) return;

        updateUser({ correo, carrera });
        setContrasenia("");
        setEditandoCuenta(false);
        setMensaje(contraseniaCambio
            ? "Correo y carrera actualizados. La contraseña requiere autenticación de servidor y no se modificó."
            : "Cambios guardados en este dispositivo.");
    };

    const changeAvatar = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => updateUser({ avatar: reader.result });
        reader.readAsDataURL(file);
    };

    const removeAccount = () => {
        if (!window.confirm("¿Seguro que quieres eliminar tu cuenta y los datos guardados en este dispositivo? Esta acción no se puede deshacer.")) return;
        deleteAccount();
        navigate("/registro", { replace: true });
    };

    return (
        <section className="mx-auto w-full max-w-3xl space-y-8">
            <header>
                <p className="text-sm font-semibold uppercase tracking-wider text-neon-blue">Tu cuenta</p>
                <h1 className="mt-2 text-3xl font-bold text-text-title-dark">Configuración</h1>
                <p className="mt-2 text-text-muted-dark">Personaliza tu perfil y la forma en que usas PolyBison.</p>
            </header>

            <section className="settings-section">
                <h2 className="text-lg font-bold text-text-title-dark">Foto de perfil</h2>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                    <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.alias || user.nombre)}&background=003366&color=fff`} alt="Foto de perfil actual" className="h-16 w-16 rounded-full border border-border-dark object-cover" />
                    <input ref={fileInput} type="file" accept="image/*" onChange={changeAvatar} disabled={!editandoCuenta} className="sr-only" aria-label="Seleccionar foto de perfil" />
                    <button type="button" onClick={() => fileInput.current?.click()} disabled={!editandoCuenta} className="action-button disabled:cursor-not-allowed disabled:opacity-50">Cambiar foto</button>
                </div>
            </section>

            <section className="settings-section">
                <h2 className="text-lg font-bold text-text-title-dark">Datos de cuenta</h2>
                <form onSubmit={saveEmail} className="mt-4 flex flex-col gap-4">
                    <label className="form-label">Correo electrónico
                        <input type="email" value={correo} onChange={(event) => setCorreo(event.target.value)} placeholder="usuario@universidad.edu.mx" readOnly={!editandoCuenta} className={`form-input ${!editandoCuenta ? "cursor-default opacity-75" : ""}`} />
                    </label>
                    <label className="form-label">Carrera
                        <select value={carrera} onChange={(event) => setCarrera(event.target.value)} disabled={!editandoCuenta} className="form-input disabled:cursor-default disabled:opacity-75">
                            {CAREERS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                    </label>
                    {editandoCuenta && <label className="form-label">Nueva contraseña
                        <input type="password" value={contrasenia} onChange={(event) => setContrasenia(event.target.value)} autoComplete="new-password" placeholder="No se guardará sin autenticación de servidor" className="form-input" />
                    </label>}
                    <div className="flex flex-wrap gap-3">
                        {!editandoCuenta ? (
                            <button type="button" onClick={() => { setCorreo(user.correo); setCarrera(getCareerName(user.carrera)); setEditandoCuenta(true); }} className="action-button">Editar datos de cuenta</button>
                        ) : (
                            <>
                                <button type="submit" className="action-button">Guardar cambios</button>
                                <button type="button" onClick={() => { setCorreo(user.correo); setCarrera(getCareerName(user.carrera)); setContrasenia(""); setEditandoCuenta(false); }} className="action-button action-button-secondary">Cancelar</button>
                            </>
                        )}
                    </div>
                </form>
                <p className="mt-3 text-sm text-text-muted-dark">Cambiar contraseña requiere autenticación de servidor. Esta demo no almacena contraseñas.</p>
                {mensaje && <p role="status" className="mt-3 text-sm text-neon-blue">{mensaje}</p>}
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
                <button type="button" onClick={() => navigate("/login", { replace: true })} className="action-button action-button-danger">Cerrar sesión</button>
            </section>

            <section className="settings-section border-secondary/50">
                <h2 className="text-lg font-bold text-neon-red">Zona de peligro</h2>
                <p className="mt-1 text-sm text-text-muted-dark">Eliminará el perfil y los datos almacenados localmente en este dispositivo.</p>
                <button type="button" onClick={removeAccount} className="action-button action-button-danger mt-4">Eliminar cuenta</button>
            </section>
        </section>
    );
}

export default Configuracion;
