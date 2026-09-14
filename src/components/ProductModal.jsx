import { useState } from "react";
import { motion } from "framer-motion";
import TechTag from "./TechTag";

function ProductModal({ producto, onClose }) {
    
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);

    const handleMouseMove = (e) => {
        const card = e.currentTarget;
        const box = card.getBoundingClientRect();
        const x = e.clientX - box.left;
        const y = e.clientY - box.top;

        const centerX = box.width / 2;
        const centerY = box.height / 2;

        
        const rotateXValue = ((y - centerY) / centerY) * -15;
        const rotateYValue = ((x - centerX) / centerX) * 15;

        setRotateX(rotateXValue);
        setRotateY(rotateYValue);
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
    };

    if (!producto) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface-dark border border-border-dark rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-full max-w-2xl overflow-hidden relative"
            >
                {/* Botón Cerrar */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-text-muted-dark hover:text-white bg-bg-dark rounded-full p-2 transition-colors z-20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex flex-col md:flex-row h-full">
                    {/* Contenedor de la Imagen con Perspectiva 3D */}
                    <div
                        className="md:w-1/2 h-64 md:h-auto relative perspective-[1000px] cursor-crosshair overflow-hidden"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    >
                        <motion.img
                            src={producto.imagen}
                            alt={producto.titulo}
                            animate={{ rotateX, rotateY }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="w-full h-full object-cover scale-110"
                            style={{ transformOrigin: "center center" }}
                        />
                        {/* Gradiente para móviles (legibilidad) */}
                        <div className="absolute inset-0 bg-linear-to-t from-bg-deep/80 to-transparent md:hidden pointer-events-none"></div>
                    </div>

                    <div className="md:w-1/2 p-8 flex flex-col justify-center bg-surface-dark z-10">
                        <TechTag etiqueta={producto.categoria} />
                        <h2 className="text-2xl font-bold text-text-title-dark mt-4 mb-2">
                            {producto.titulo}
                        </h2>
                        <p className="text-2xl font-black text-neon-blue mb-6">
                            {producto.precio}
                        </p>
                        <p className="text-text-body-dark text-sm leading-relaxed mb-8">
                            {producto.descripcionLarga}
                        </p>
                        <button
                            className="w-full bg-linear-to-r from-primary to-neon-blue hover:from-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            Adquirir en Dirección
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default ProductModal;