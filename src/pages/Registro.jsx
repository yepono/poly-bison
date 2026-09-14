import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import NeonBackground from "../components/NeonBackground";
import CustomSelect from "../components/CustomSelect";

function Registro() {
    const [paso, setPaso] = useState(1);
    const [previewFoto, setPreviewFoto] = useState(null);

    const [formData, setFormData] = useState({
        nombre: "",
        alias: "",
        matricula: "",
        contrasenia: "",
        carrera: "",
        semestre: "1",
        foto: null
    });

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
            setFormData(prev => ({ ...prev, foto: file }));
            setPreviewFoto(URL.createObjectURL(file));
        }
    };

    const handleSiguiente = (e) => {
        e.preventDefault();
        setPaso(prev => prev + 1);
    };

    const handleAnterior = () => {
        setPaso(prev => prev - 1);
    };

    const handleSubmitFinal = (e) => {
        e.preventDefault();
        console.log('Datos de Registro Final:', formData);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-deep p-4 relative">
            <NeonBackground />

            <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 1.5 }}
                className="relative z-10 w-full max-w-5xl h-165 flex items-center justify-end p-8 lg:p-12"
            >
                <div className="relative z-20 w-full max-w-md bg-surface-dark/20% backdrop-blur-md border border-border-dark rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-8 overflow-y-auto max-h-full custom-scrollbar">

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


                    {paso === 1 && (
                        <form className="flex flex-col gap-4" onSubmit={handleSiguiente}>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="nombre" className="text-sm font-semibold text-text-body-dark">Nombre Completo</label>
                                <input type="text" id="nombre" required value={formData.nombre} onChange={handleChange} className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="alias" className="text-sm font-semibold text-text-body-dark">Alias</label>
                                <input type="text" id="alias" required value={formData.alias} onChange={handleChange} className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="matricula" className="text-sm font-semibold text-text-body-dark">Matrícula</label>
                                <input type="text" id="matricula" required value={formData.matricula} onChange={handleChange} className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                            </div>

                            <button type="submit" className="mt-4 w-full bg-primary hover:bg-primary-hover text-text-title-dark font-bold py-3 px-4 rounded-lg transition-colors">
                                Siguiente
                            </button>
                        </form>
                    )}

                    {paso === 2 && (
                        <form className="flex flex-col gap-4" onSubmit={handleSiguiente}>
                            <CustomSelect
                                label="Carrera"
                                value={formData.carrera}
                                onChange={(val) => setFormData((prev) => ({ ...prev, carrera: val }))}
                                options={[
                                    { value: "LSTI", label: "LSTI" },
                                    { value: "LMAD", label: "LMAD" },
                                    { value: "LCC", label: "LCC" },
                                    { value: "LF", label: "LF" },
                                    { value: "LA", label: "LA" },
                                    { value: "LM", label: "LM" },
                                ]}
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
                                <input type="password" id="contrasenia" required value={formData.contrasenia} onChange={handleChange} className="w-full p-2.5 border border-border-dark rounded-lg bg-bg-dark text-text-title-dark focus:outline-none focus:ring-2 focus:ring-neon-blue" />
                            </div>

                            <div className="flex gap-4 mt-4">
                                <button type="button" onClick={handleAnterior} className="flex-1 border border-border-dark text-text-body-dark font-bold py-3 px-4 rounded-lg hover:bg-bg-dark transition-colors">Atrás</button>
                                <button type="submit" className="flex-1 bg-primary hover:bg-primary-hover text-text-title-dark font-bold py-3 px-4 rounded-lg transition-colors">Siguiente</button>
                            </div>
                        </form>
                    )}

                    {/* PASO 3: Foto de Perfil */}
                    {paso === 3 && (
                        <form className="flex flex-col gap-4" onSubmit={handleSubmitFinal}>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="foto" className="text-sm font-semibold text-text-body-dark text-center">Sube tu Foto de Perfil</label>
                                <input type="file" id="foto" accept="image/*" onChange={handleCambioFoto} className="w-full p-2 border border-border-dark rounded-lg bg-bg-dark text-text-body-dark file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover transition-all" />
                            </div>

                            {previewFoto && (
                                <div className="mx-auto w-32 h-32 mt-4 rounded-full overflow-hidden border-4 border-neon-blue shadow-[0_0_15px_var(--color-neon-blue)]">
                                    <img src={previewFoto} alt="Previsualización" className="w-full h-full object-cover" />
                                </div>
                            )}

                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={handleAnterior} className="flex-1 border border-border-dark text-text-body-dark font-bold py-3 px-4 rounded-lg hover:bg-bg-dark transition-colors">Atrás</button>
                                <button type="submit" className="flex-1 bg-linear-to-r from-primary to-neon-blue hover:from-primary-hover text-text-title-dark font-bold py-3 px-4 rounded-lg transition-colors">Finalizar</button>
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