import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import NeonBackground from "../components/NeonBackground";
import { useAppData } from "../context/AppDataContext";
import { CORREO_UANL } from "../api/client";

function Login() {
    const [correo, setCorreo] = useState("");
    const [contrasenia, setContrasenia] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login, authStatus } = useAppData();
    const avisoRegistro = location.state?.mensaje;

    if (authStatus === "authenticated") return <Navigate to="/feed" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!correo.trim() || !contrasenia) {
            setError("Ingresa tu correo y contraseña.");
            return;
        }
        if (!CORREO_UANL.test(correo.trim())) {
            setError("Usa tu correo institucional @uanl.edu.mx.");
            return;
        }
        setCargando(true);
        try {
            const sessionUser = await login(correo.trim(), contrasenia);
            if (sessionUser.debeCambiarContrasena) {
                window.alert("Estás usando una contraseña temporal. Debes cambiarla antes de continuar.");
                navigate("/configuracion", { replace: true });
                return;
            }
            navigate(location.state?.from?.pathname || "/feed", { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-canvas p-4 relative">

            <NeonBackground />

            <motion.div
                initial={{ scale: 0.5, x: -50 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ type: "spring", duration: 1.5 }}
                className="relative z-10 flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl items-center justify-center py-4 sm:p-8 lg:justify-end lg:p-12"
            >
                <div className="relative z-20 w-full max-w-md bg-surface/20 backdrop-blur-md border border-line rounded-2xl shadow-pop p-8">

                    <h1 className="text-3xl font-bold text-center text-ink mb-8">
                        Bienvenido
                    </h1>

                    {avisoRegistro && !error && <p role="status" className="mb-5 text-sm text-accent">{avisoRegistro}</p>}
                    {error && <p role="alert" className="mb-5 text-sm text-danger">{error}</p>}

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="correo" className="text-sm font-semibold text-ink-soft">
                                Correo Institucional
                            </label>
                            <input
                                type="email"
                                id="correo"
                                required
                                maxLength={150}
                                autoComplete="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                className="w-full p-3 border border-line rounded-lg bg-field text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="contrasenia" className="text-sm font-semibold text-ink-soft">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                id="contrasenia"
                                required
                                autoComplete="current-password"
                                value={contrasenia}
                                onChange={(e) => setContrasenia(e.target.value)}
                                className="w-full p-3 border border-line rounded-lg bg-field text-ink focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={cargando}
                            className="mt-4 w-full bg-linear-to-r from-brand to-accent hover:from-brand-hover hover:to-brand text-ink font-bold py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {cargando ? "Ingresando..." : "Iniciar Sesión"}
                        </button>
                    </form>
                    <p className="text-center text-sm mt-4">
                        <Link to="/recuperar" className="text-accent hover:underline transition-all">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </p>
                    <p className="text-center text-sm text-ink-muted mt-6">
                        ¿No tienes cuenta?{" "}
                        <Link to="/registro" className="text-accent font-bold hover:underline transition-all">
                            Regístrate aquí
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default Login;