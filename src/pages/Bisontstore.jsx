import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TechTag from "../components/TechTag";
import ProductModal from "../components/ProductModal";
import { useAppData } from "../context/AppDataContext";

function Bisontstore() {
    const { products } = useAppData();
    const [busqueda, setBusqueda] = useState("");
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);

    return (
        <div className="w-full max-w-3xl mx-auto">

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <h1 className="theme-glow text-3xl font-bold text-text-title-dark">
                    Bisontstore
                </h1>

                <div className="relative w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="Buscar mercancía oficial..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-border-dark rounded-lg bg-surface-dark text-text-title-dark focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-text-muted-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Cuadrícula de Productos con efecto Flip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((producto, index) => (
                    <motion.div
                        key={producto.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative h-80 w-full perspective-[1000px]"
                    >
                        {/* Contenedor que rota */}
                        <div className="relative h-full w-full transition-transform duration-700 transform-3d group-hover:transform-[rotateY(180deg)]">
                            
                            <div className="absolute inset-0 backface-hidden bg-surface-dark/50 border border-border-dark rounded-2xl overflow-hidden shadow-lg flex flex-col">
                                <TechTag etiqueta={producto.categoria} />
                                <div className="h-48 relative overflow-hidden bg-bg-dark">
                                    <img src={producto.imagen} alt={producto.titulo} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-5 flex flex-col flex-1 justify-between">
                                    <h2 className="text-lg font-bold text-text-title-dark line-clamp-1">
                                        {producto.titulo}
                                    </h2>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xl font-black text-neon-blue">
                                            {producto.precio}
                                        </span>
                                        
                                    </div>
                                </div>
                            </div>

                            <div className="absolute inset-0 backface-hidden transform-[rotateY(180deg)] bg-surface-dark border border-neon-blue/50 rounded-2xl p-6 shadow-[0_0_20px_rgba(0,191,255,0.15)] flex flex-col items-center justify-center text-center">
                                <h3 className="text-xl font-bold text-text-title-dark mb-4">{producto.titulo}</h3>
                                <p className="text-sm text-text-body-dark mb-6">
                                    {producto.descripcionCorta}
                                </p>

                                <button
                                    onClick={() => setProductoSeleccionado(producto)}
                                    className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-[0_0_10px_var(--color-primary)]"
                                >
                                    Ver detalles
                                </button>
                            </div>

                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {productoSeleccionado && (
                    <ProductModal
                        producto={productoSeleccionado}
                        onClose={() => setProductoSeleccionado(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default Bisontstore;