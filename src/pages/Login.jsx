import { useState } from "react";
import { motion } from "framer-motion";
import NeonBackground from "../components/NeonBackground";

function Login() {
    const [correo, setCorreo] = useState("");
    const [contrasenia, setContrasenia] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Submited Data:', { correo, contrasenia });
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-deep p-4 relative">

            <NeonBackground />

            <motion.div
                initial={{ scale: 0.5, x: -50 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ type: "spring", duration: 1.5 }}
                className="relative z-10 w-full max-w-5xl h-150 flex items-center justify-end p-8 lg:p-12"
            >
                <div className="relative z-20 w-full max-w-md bg-surface-dark/20% backdrop-blur-md border border-border-dark rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-8">

                    <h1 className="text-3xl font-bold text-center text-text-title-dark mb-8">
                        Bienvenido
                    </h1>

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
                            className="mt-4 w-full bg-linear-to-r from-primary to-neon-blue hover:from-primary-hover hover:to-primary text-text-title-dark font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            Iniciar Sesión
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

export default Login;