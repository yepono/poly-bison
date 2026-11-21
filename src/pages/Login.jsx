import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import NeonBackground from "../components/NeonBackground";
import { useAppData } from "../context/AppDataContext";



function Login() {
    const [correo, setCorreo] = useState("");
    const [dbStatus, setDbStatus] = useState(null); // { ok: boolean, message: string }
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);
    const location = useLocation();
    const registroExitoso = location.state?.registroExitoso;

    useEffect(() => {
        let cancelled = false;

        fetch("http://localhost/api/connect.php")
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setDbStatus({ ok: data.connected, message: data.message });
            })
            .catch(() => {
                if (!cancelled) setDbStatus({ ok: false, message: "Could not reach the server" });
            });

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!dbStatus) return;
        const timer = setTimeout(() => setDbStatus(null), 4000);
        return () => clearTimeout(timer);
    }, [dbStatus]);

    const [contrasenia, setContrasenia] = useState("");

    const navigate = useNavigate();
    const { updateUser } = useAppData();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setEnviando(true);

        try {
            const res = await fetch("http://localhost/api/login.php", {
                method: "POST",
                credentials: "include", // required so the session cookie is saved
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo, contrasenia }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.message || "No se pudo iniciar sesión");
                return;
            }

            const u = data.user;
            updateUser({
                correo: u.correo,
                nombre: u.nombre_completo,
                alias: u.alias,
                carrera: u.carrera,
                semestre: String(u.semestre),
                avatar: u.tiene_foto ? `http://localhost/api/foto.php?id=${u.id_usuario}` : "",
                fechaRegistro: new Date(u.fecha_registro.replace(" ", "T")).toLocaleDateString("es-MX", {
                    year: "numeric", month: "long", day: "numeric",
                }),
            });
            navigate("/feed");
        } catch {
            setError("No se pudo conectar con el servidor");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-deep p-4 relative">

            <NeonBackground />

            <AnimatePresence>
                {dbStatus && (
                    <motion.div
                        key="db-toast"
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 font-semibold shadow-lg backdrop-blur-md ${dbStatus.ok
                            ? "border-green-500 bg-green-500/20 text-green-300"
                            : "border-red-500 bg-red-500/20 text-red-300"
                            }`}
                    >
                        <span>{dbStatus.ok ? "✅" : "❌"}</span>
                        <span>{dbStatus.message}</span>
                        <button
                            type="button"
                            onClick={() => setDbStatus(null)}
                            className="ml-2 opacity-70 hover:opacity-100"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ scale: 0.5, x: -50 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ type: "spring", duration: 1.5 }}
                className="relative z-10 flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl items-center justify-center py-4 sm:p-8 lg:justify-end lg:p-12"
            >
                <div className="relative z-20 w-full max-w-md bg-surface-dark/20% backdrop-blur-md border border-border-dark rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-8">

                    <h1 className="text-3xl font-bold text-center text-text-title-dark mb-8">
                        Bienvenido
                    </h1>
                    {registroExitoso && (
                        <p className="mb-6 rounded-lg border border-green-500 bg-green-500/20 p-3 text-center text-sm text-green-300">
                            Registro exitoso. Tu cuenta está pendiente de aprobación.
                        </p>
                    )}

                    {error && (
                        <p className="mb-4 rounded-lg border border-red-500 bg-red-500/20 p-3 text-center text-sm text-red-300">
                            {error}
                        </p>
                    )}

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="correo" className="text-sm font-semibold text-text-body-dark">
                                Correo Institucional
                            </label>
                            <input
                                type="email"
                                id="correo"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                className="w-full p-3 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="contrasenia" className="text-sm font-semibold text-text-body-dark">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                id="contrasenia"
                                value={contrasenia}
                                onChange={(e) => setContrasenia(e.target.value)}
                                className="w-full p-3 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={enviando}
                            className="mt-4 w-full bg-linear-to-r from-primary to-neon-blue hover:from-primary-hover hover:to-primary text-text-title-dark font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-60"
                        >
                            {enviando ? "Entrando..." : "Iniciar Sesión"}
                        </button>
                    </form>
                    <p className="text-center text-sm text-text-muted-dark mt-6">
                        ¿No tienes cuenta?{" "}
                        <Link to="/registro" className="text-neon-blue font-bold hover:underline transition-all">
                            Regístrate aquí
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default Login;