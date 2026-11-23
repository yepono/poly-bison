import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProductModal, { EstadoStock, ImagenProducto } from "../components/ProductModal";
import { api, mapProducto } from "../api/client";
import { TESORERIA, rutaMapaLugar } from "../utils/mapaDatos";
import PageHeader from "../components/PageHeader";
import CustomSelect from "../components/CustomSelect";
import { Esqueleto, EstadoError, EstadoVacio } from "../components/Estados";

const ORDENES = {
    recomendados: { etiqueta: "Recomendados", fn: null },
    precioAsc: { etiqueta: "Precio: menor a mayor", fn: (a, b) => a.precioValor - b.precioValor },
    precioDesc: { etiqueta: "Precio: mayor a menor", fn: (a, b) => b.precioValor - a.precioValor },
    nombre: { etiqueta: "Nombre (A-Z)", fn: (a, b) => a.titulo.localeCompare(b.titulo, "es") },
};

const normalizar = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Aviso de pago: la tienda sólo muestra el catálogo; el pago es presencial en Tesorería
function AvisoTesoreria() {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 sm:flex-row sm:items-center sm:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent" aria-hidden="true">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <rect x="3" y="6" width="18" height="13" rx="2" />
                    <path strokeLinecap="round" d="M3 10h18M7 15h3" />
                </svg>
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">Los productos se pagan en Tesorería</p>
                <p className="text-sm text-ink-soft">
                    Elige lo que te interesa aquí y realiza el pago directamente en Tesorería
                    {TESORERIA ? ` (${TESORERIA.detalle.replace("Edificio 1, 2 y 4", "Edificio 1")}).` : "."}
                </p>
            </div>
            <Link to={rutaMapaLugar(TESORERIA)} className="action-button shrink-0 gap-2 text-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                Cómo llegar
            </Link>
        </div>
    );
}

function TarjetaProducto({ producto, indice, onAbrir }) {
    return (
        <motion.button
            type="button"
            onClick={() => onAbrir(producto)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(indice, 8) * 0.04 }}
            className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/50 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
            <div className="relative aspect-square w-full overflow-hidden bg-field">
                <ImagenProducto producto={producto} className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
                {producto.stock === 0 && <div className="absolute inset-0 bg-canvas/50" aria-hidden="true" />}
                <div className="absolute left-2 top-2">
                    <EstadoStock stock={producto.stock} compacto />
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                <p className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">{producto.categoria}</p>
                <h2 className="line-clamp-2 text-sm font-bold leading-snug text-ink sm:text-base">{producto.titulo}</h2>
                <p className="mt-auto pt-1 text-base font-black text-accent sm:text-lg">{producto.precio}</p>
            </div>
        </motion.button>
    );
}

function TarjetaCargando() {
    return (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/50" aria-hidden="true">
            <Esqueleto className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-4">
                <Esqueleto className="h-2.5 w-1/3" />
                <Esqueleto className="h-4 w-4/5" />
                <Esqueleto className="h-5 w-1/2" />
            </div>
        </div>
    );
}

function Bisontstore() {
    // Catálogo desde la BD (productos.php?accion=listar -> vw_catalogo_productos)
    const [products, setProducts] = useState(null);
    const [error, setError] = useState("");
    const [intento, setIntento] = useState(0);
    const [busqueda, setBusqueda] = useState("");
    const [categoria, setCategoria] = useState("Todas");
    const [orden, setOrden] = useState("recomendados");
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api("productos", "listar")
            .then((response) => { if (!cancelled) { setProducts(response.productos.map(mapProducto)); setError(""); } })
            .catch((err) => { if (!cancelled) { setProducts([]); setError(err.message); } });
        return () => { cancelled = true; };
    }, [intento]);

    const categorias = useMemo(
        () => ["Todas", ...new Set((products ?? []).map((p) => p.categoria).filter(Boolean))],
        [products],
    );

    const visibles = useMemo(() => {
        const termino = normalizar(busqueda.trim());
        const lista = (products ?? []).filter((p) =>
            (categoria === "Todas" || p.categoria === categoria)
            && (!termino || normalizar(`${p.titulo} ${p.categoria} ${p.descripcionCorta}`).includes(termino)));
        const fn = ORDENES[orden].fn;
        // Los agotados van al final sin importar el orden elegido
        return [...lista].sort((a, b) => (a.stock === 0) - (b.stock === 0) || (fn ? fn(a, b) : 0));
    }, [products, busqueda, categoria, orden]);

    const hayFiltros = busqueda.trim() || categoria !== "Todas";

    return (
        <div className="pagina-ancha">
            <PageHeader titulo="Bisontstore" subtitulo="Mercancía oficial de la FCFM." />

            <AvisoTesoreria />

            {/* Herramientas: búsqueda, orden y categorías */}
            <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <input
                            type="search"
                            placeholder="Buscar productos…"
                            aria-label="Buscar productos"
                            maxLength={100}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="form-input pl-10"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <CustomSelect
                        ariaLabel="Ordenar productos"
                        className="sm:w-64"
                        value={orden}
                        onChange={setOrden}
                        options={Object.entries(ORDENES).map(([clave, o]) => ({ value: clave, label: o.etiqueta }))}
                    />
                </div>

                {categorias.length > 2 && (
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="group" aria-label="Filtrar por categoría">
                        {categorias.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCategoria(c)}
                                aria-pressed={categoria === c}
                                className={`min-h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${categoria === c
                                    ? "border-accent bg-accent/15 text-accent"
                                    : "border-line bg-surface/50 text-ink-soft hover:border-ink-muted hover:text-ink"
                                    }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {error && <div className="card"><EstadoError mensaje={error} onReintentar={() => { setProducts(null); setError(""); setIntento((n) => n + 1); }} /></div>}

            {products !== null && !error && (
                <p className="text-sm text-ink-muted" aria-live="polite">
                    {visibles.length} {visibles.length === 1 ? "producto" : "productos"}
                </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4" aria-busy={products === null || undefined}>
                {products === null && <span role="status" className="sr-only">Cargando productos…</span>}
                {products === null
                    ? Array.from({ length: 8 }, (_, i) => <TarjetaCargando key={i} />)
                    : visibles.map((producto, i) => (
                        <TarjetaProducto key={producto.id} producto={producto} indice={i} onAbrir={setProductoSeleccionado} />
                    ))}
            </div>

            {products !== null && !error && !visibles.length && (
                <div className="card">
                    {hayFiltros
                        ? <EstadoVacio icono="buscar" titulo="Sin resultados" detalle="Ningún producto coincide con tu búsqueda." accion={{ texto: "Limpiar filtros", onClick: () => { setBusqueda(""); setCategoria("Todas"); } }} />
                        : <EstadoVacio icono="tienda" titulo="Aún no hay productos" detalle="Vuelve pronto: el catálogo se está preparando." />}
                </div>
            )}

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
