import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import NeonBackground from "../components/NeonBackground";
import { api, CORREO_UANL } from "../api/client";

// "Olvidé mi contraseña" (R12): usuarios.php?accion=recuperar_contrasena envía una
// contraseña temporal con la API de Brevo. Mismo diseño que Login.
function Recuperar() {
    const [correo, setCorreo] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMensaje("");
        const valor = correo.trim().toLowerCase();
        if (!CORREO_UANL.test(valor)) {
            setError("Usa tu correo institucional @uanl.edu.mx.");
            return;
        }
        setEnviando(true);
        try {
            const response = await api("usuarios", "recuperar_contrasena", { method: "POST", body: { correo: valor }, skipAuthHandler: true });
            setMensaje(response.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-deep p-4 relative">

            <NeonBackground />

            <motion.div
                initial={{ scale: 0.5, x: -50 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ type: "spring", duration: 1.5 }}
                className="relative z-10 flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl items-center justify-center py-4 sm:p-8 lg:justify-end lg:p-12"
            >
                <div className="relative z-20 w-full max-w-md bg-surface-dark/20% backdrop-blur-md border border-border-dark rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-8">

                    <h1 className="text-3xl font-bold text-center text-text-title-dark mb-4">
                        Recuperar contraseña
                    </h1>
                    <p className="text-center text-sm text-text-muted-dark mb-8">
                        Te enviaremos una contraseña temporal a tu correo institucional. Vence en 30 minutos.
                    </p>

                    {mensaje && <p role="status" className="mb-5 text-sm text-neon-blue">{mensaje}</p>}
                    {error && <p role="alert" className="mb-5 text-sm text-neon-red">{error}</p>}

                    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="correo" className="text-sm font-semibold text-text-body-dark">
                                Correo Institucional
                            </label>
                            <input
                                type="email"
                                id="correo"
                                required
                                maxLength={150}
                                autoComplete="email"
                                placeholder="usuario@uanl.edu.mx"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                className="w-full p-3 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={enviando}
                            className="mt-4 w-full bg-linear-to-r from-primary to-neon-blue hover:from-primary-hover hover:to-primary text-text-title-dark font-bold py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {enviando ? "Enviando..." : "Enviar contraseña temporal"}
                        </button>
                    </form>
                    <p className="text-center text-sm text-text-muted-dark mt-6">
                        <Link to="/login" className="text-neon-blue font-bold hover:underline transition-all">
                            Volver a iniciar sesión
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default Recuperar;
