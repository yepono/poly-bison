import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import NeonBackground from "../components/NeonBackground";
import CustomSelect from "../components/CustomSelect";
import { api, CORREO_UANL, MATRICULA, validarImagen } from "../api/client";
import { getCareerName } from "../utils/careers";

// Paso del formulario donde está cada campo (para regresar al que tiene error)
const PASO_DE_CAMPO = { nombre: 1, alias: 1, correo: 1, matricula: 1, carrera: 2, semestre: 2, contrasenia: 2, foto: 3 };

function validarPaso(paso, datos) {
    if (paso === 1) {
        if (!datos.nombre.trim()) return "Escribe tu nombre completo.";
        if (datos.nombre.trim().length > 250) return "El nombre es demasiado largo.";
        if (!datos.alias.trim()) return "Escribe un alias.";
        if (datos.alias.trim().length > 50) return "El alias no puede tener más de 50 caracteres.";
        if (!CORREO_UANL.test(datos.correo.trim())) return "Usa tu correo institucional @uanl.edu.mx.";
        if (!MATRICULA.test(datos.matricula.trim())) return "La matrícula debe tener 7 dígitos.";
    }
    if (paso === 2) {
        if (!datos.carrera) return "Selecciona tu carrera.";
        const semestre = Number(datos.semestre);
        if (!Number.isInteger(semestre) || semestre < 1 || semestre > 10) return "Selecciona un semestre válido.";
        if (datos.contrasenia.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
        if (datos.contrasenia.length > 72) return "La contraseña no puede tener más de 72 caracteres.";
    }
    return "";
}

function Registro() {
    const [paso, setPaso] = useState(1);
    const [previewFoto, setPreviewFoto] = useState(null);
    const [carreras, setCarreras] = useState([]);
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nombre: "",
        alias: "",
        correo: "",
        matricula: "",
        contrasenia: "",
        carrera: "", // id_carrera de la BD
        semestre: "1",
        foto: null
    });

    // Catálogo de carreras desde la BD
    useEffect(() => {
        api("usuarios", "carreras", { skipAuthHandler: true })
            .then((response) => setCarreras(response.carreras))
            .catch(() => setError("No se pudieron cargar las carreras. Recarga la página."));
    }, []);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [id]: value
        }));
    };

    const handleCambioFoto = (e) => {
        const file = e.target.files[0];
        if (file) {
            const problema = validarImagen(file);
            if (problema) {
                setError(problema);
                e.target.value = "";
                setFormData(prev => ({ ...prev, foto: null }));
                setPreviewFoto(null);
                return;
            }
            setError("");
            setFormData(prev => ({ ...prev, foto: file }));
            const reader = new FileReader();
            reader.onload = () => setPreviewFoto(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSiguiente = (e) => {
        e.preventDefault();
        const problema = validarPaso(paso, formData);
        setError(problema);
        if (!problema) setPaso(prev => prev + 1);
    };

    const handleAnterior = () => {
        setError("");
        setPaso(prev => prev - 1);
    };

    const handleSubmitFinal = async (e) => {
        e.preventDefault();
        const problema = validarPaso(1, formData) || validarPaso(2, formData);
        if (problema) {
            setError(problema);
            return;
        }

        const body = new FormData();
        body.append("nombre", formData.nombre.trim());
        body.append("alias", formData.alias.trim());
        body.append("correo", formData.correo.trim().toLowerCase());
        body.append("matricula", formData.matricula.trim());
        body.append("contrasenia", formData.contrasenia);
        body.append("id_carrera", formData.carrera);
        body.append("semestre", formData.semestre);
        if (formData.foto) body.append("foto", formData.foto);

        setEnviando(true);
        setError("");
        try {
            const response = await api("usuarios", "registro", { method: "POST", body, skipAuthHandler: true });
            navigate("/login", { replace: true, state: { mensaje: response.message } });
        } catch (err) {
            setError(err.message);
            if (err.field && PASO_DE_CAMPO[err.field]) setPaso(PASO_DE_CAMPO[err.field]);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-deep p-4 relative">
            <NeonBackground />

            <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 1.5 }}
                className="relative z-10 flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl items-center justify-center py-4 sm:p-8 lg:justify-end lg:p-12"
            >
                <div className="relative z-20 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border-dark bg-surface-dark/20% p-5 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md custom-scrollbar sm:p-8">

                    <h1 className="text-3xl font-bold text-center text-text-title-dark mb-2">
                        Registro - Paso {paso} de 3
                    </h1>

                    <div className="flex items-center justify-center gap-2 mb-6 mt-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${paso >= 1 ? 'bg-primary text-white shadow-[0_0_10px_var(--color-primary)]' : 'bg-border-dark text-text-muted-dark'}`}>1</span>
                        <span className={`h-0.5 w-8 transition-colors ${paso >= 2 ? 'bg-primary' : 'bg-border-dark'}`}></span>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${paso >= 2 ? 'bg-primary text-white shadow-[0_0_10px_var(--color-primary)]' : 'bg-border-dark text-text-muted-dark'}`}>2</span>
                        <span className={`h-0.5 w-8 transition-colors ${paso >= 3 ? 'bg-primary' : 'bg-border-dark'}`}></span>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${paso >= 3 ? 'bg-primary text-white shadow-[0_0_10px_var(--color-primary)]' : 'bg-border-dark text-text-muted-dark'}`}>3</span>
                    </div>

                    {error && <p role="alert" className="mb-4 text-sm text-neon-red">{error}</p>}

                    {paso === 1 && (
                        <form className="flex flex-col gap-4" onSubmit={handleSiguiente} noValidate>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="nombre" className="text-sm font-semibold text-text-body-dark">Nombre Completo</label>
                                <input type="text" id="nombre" required maxLength={250} autoComplete="name" value={formData.nombre} onChange={handleChange} className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="alias" className="text-sm font-semibold text-text-body-dark">Alias</label>
                                <input type="text" id="alias" required maxLength={50} value={formData.alias} onChange={handleChange} className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="correo" className="text-sm font-semibold text-text-body-dark">Correo electrónico</label>
                                <input type="email" id="correo" required maxLength={150} placeholder="usuario@uanl.edu.mx" autoComplete="email" value={formData.correo} onChange={handleChange} className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="matricula" className="text-sm font-semibold text-text-body-dark">Matrícula</label>
                                <input type="text" id="matricula" required maxLength={7} inputMode="numeric" pattern="[0-9]{7}" value={formData.matricula} onChange={handleChange} className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                            </div>

                            <button type="submit" className="mt-4 w-full bg-primary hover:bg-primary-hover text-text-title-dark font-bold py-3 px-4 rounded-lg transition-colors">
                                Siguiente
                            </button>
                        </form>
                    )}

                    {paso === 2 && (
                        <form className="flex flex-col gap-4" onSubmit={handleSiguiente} noValidate>
                            <CustomSelect
                                label="Carrera"
                                value={formData.carrera}
                                onChange={(val) => setFormData((prev) => ({ ...prev, carrera: val }))}
                                options={carreras.map((carrera) => ({ value: String(carrera.id_carrera), label: getCareerName(carrera.nombre) }))}
                            />

                            <CustomSelect
                                label="Semestre"
                                value={formData.semestre}
                                onChange={(val) => setFormData((prev) => ({ ...prev, semestre: val }))}
                                options={[...Array(10)].map((_, i) => ({
                                    value: String(i + 1),
                                    label: `Semestre ${i + 1}`,
                                }))}
                            />
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="contrasenia" className="text-sm font-semibold text-text-body-dark">Contraseña</label>
                                <input type="password" id="contrasenia" required minLength={8} maxLength={72} autoComplete="new-password" value={formData.contrasenia} onChange={handleChange} className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                            </div>

                            <div className="flex gap-4 mt-4">
                                <button type="button" onClick={handleAnterior} className="flex-1 border border-border-dark text-text-body-dark font-bold py-3 px-4 rounded-lg hover:bg-bg-dark transition-colors">Atrás</button>
                                <button type="submit" className="flex-1 bg-primary hover:bg-primary-hover text-text-title-dark font-bold py-3 px-4 rounded-lg transition-colors">Siguiente</button>
                            </div>
                        </form>
                    )}

                    {/* PASO 3: Foto de Perfil */}
                    {paso === 3 && (
                        <form className="flex flex-col gap-4" onSubmit={handleSubmitFinal} noValidate>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="foto" className="text-sm font-semibold text-text-body-dark text-center">Sube tu Foto de Perfil</label>
                                <input type="file" id="foto" accept="image/jpeg,image/png,image/webp" onChange={handleCambioFoto} className="w-full p-2 border border-border-dark rounded-lg bg-bg-dark text-text-body-dark file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover transition-all" />
                            </div>

                            {previewFoto && (
                                <div className="mx-auto w-32 h-32 mt-4 rounded-full overflow-hidden border-4 border-neon-blue shadow-[0_0_15px_var(--color-neon-blue)]">
                                    <img src={previewFoto} alt="Previsualización" className="w-full h-full object-cover" />
                                </div>
                            )}

                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={handleAnterior} className="flex-1 border border-border-dark text-text-body-dark font-bold py-3 px-4 rounded-lg hover:bg-bg-dark transition-colors">Atrás</button>
                                <button type="submit" disabled={enviando} className="flex-1 bg-linear-to-r from-primary to-neon-blue hover:from-primary-hover text-text-title-dark font-bold py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50">{enviando ? "Enviando..." : "Finalizar"}</button>
                            </div>
                        </form>
                    )}
                    <p className="text-center text-sm text-text-muted-dark mt-6">
                        ¿Ya tienes cuenta?{" "}
                        <Link to="/login" className="text-neon-blue font-bold hover:underline transition-all">
                            Inicia Sesión
                        </Link>
                    </p>

                </div>
            </motion.div>
        </div>
    );
}

export default Registro;