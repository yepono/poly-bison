import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";

function Layout() {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const { user } = useAppData();
    const navigate = useNavigate();
    const links = [
        ["/feed", "Feed Global"],
        ["/aulas", "Aulas"],
        ["/mapa", "Mapa"],
        ["/bisontstore", "Bisontstore"],
        ["/calendario", "Calendario"],
        ["/perfil", "Mi perfil"],
        ["/configuracion", "Configuración"],
        ...((user.rol === "Administrador" || user.rol === "Moderador") ? [["/admin", "Administración"]] : []),
    ];
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.alias || user.nombre)}&background=003366&color=fff`;
    const navigation = (
        <>
            <h1 className="mb-8 text-2xl font-bold bg-linear-to-r from-red-500 to-pink-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_var(--color-secondary)]">PolyBison</h1>
            <Link to="/perfil" onClick={() => setMenuAbierto(false)} className="mb-6 flex items-center gap-3 rounded-lg p-2 hover:bg-surface-dark/80">
                <img src={avatar} alt="" className="h-10 w-10 rounded-full border border-border-dark object-cover" />
                <span className="min-w-0"><strong className="block truncate text-sm text-text-title-dark">{user.alias || user.nombre}</strong><span className="text-xs text-text-muted-dark">Ver perfil</span></span>
            </Link>
            <nav aria-label="Navegación principal" className="min-h-0 flex-1 overflow-y-auto flex flex-col gap-2">
                {links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setMenuAbierto(false)} className={({ isActive }) => `min-h-11 rounded-lg border px-3 py-2.5 font-semibold transition-colors ${isActive ? "border-neon-blue/40 bg-primary/40 text-neon-blue" : "border-transparent text-text-title-dark hover:border-border-dark hover:bg-surface-dark/80 hover:text-neon-blue"}`}>{label}</NavLink>)}
            </nav>
            <div className="mt-auto pt-6">
                <button type="button" onClick={() => { setMenuAbierto(false); navigate("/login"); }} className="min-h-11 w-full rounded-lg border border-transparent p-3 text-left font-semibold text-neon-red transition-colors hover:border-secondary/50 hover:bg-secondary/20">Cerrar sesión</button>
            </div>
        </>
    );

    return (
        <div className="relative flex min-h-screen bg-bg-deep text-text-body-dark">

            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[5%] left-[-10%] w-125 h-125 bg-neon-blue/15 rounded-full blur-[150px]"></div>
                <div className="absolute top-[20%] right-[-5%] w-112.5 h-112.5 bg-secondary/20 rounded-full blur-[120px]"></div>
                <div className="absolute top-[40%] left-[10%] w-150 h-150 bg-primary/20 rounded-full blur-[150px]"></div>
                <div className="absolute top-[65%] right-[10%] w-125 h-125 bg-neon-red/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-[85%] left-[-10%] w-137.5 h-137.5 bg-neon-blue/15 rounded-full blur-[140px]"></div>
            </div>

            <aside className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col border-r border-border-dark bg-surface-deep/90 p-6 shadow-[5px_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md lg:flex">
                {navigation}
            </aside>

            <div className="relative z-10 flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border-dark bg-bg-deep/90 px-4 backdrop-blur-md lg:hidden">
                    <Link to="/feed" className="text-lg font-bold text-text-title-dark">PolyBison</Link>
                    <button type="button" aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuAbierto} aria-controls="mobile-navigation" onClick={() => setMenuAbierto(!menuAbierto)} className="flex h-11 w-11 items-center justify-center rounded-lg text-text-title-dark hover:bg-surface-dark focus-visible:outline-2 focus-visible:outline-neon-blue">
                        <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d={menuAbierto ? "M6 6l12 12M18 6L6 18" : "M4 6h16M4 12h16M4 18h16"} /></svg>
                    </button>
                </header>
                {menuAbierto && <button type="button" aria-label="Cerrar menú" onClick={() => setMenuAbierto(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
                <aside id="mobile-navigation" aria-label="Menú móvil" className={`fixed inset-y-0 left-0 z-40 flex w-[min(19rem,85vw)] flex-col border-r border-border-dark bg-bg-deep p-5 shadow-2xl transition-transform duration-200 lg:hidden ${menuAbierto ? "translate-x-0" : "-translate-x-full"}`}>
                    <button type="button" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú" className="mb-3 flex h-11 w-11 items-center justify-center self-end rounded-lg text-text-title-dark hover:bg-surface-dark focus-visible:outline-2 focus-visible:outline-neon-blue"><span aria-hidden="true" className="text-2xl">&times;</span></button>
                    {navigation}
                </aside>
                <main className="flex min-w-0 flex-1 justify-center">
                    <div className="w-full p-4 sm:p-6 lg:p-8">
                    <Outlet />
                    </div>
                </main>
            </div>

        </div>
    );
}

export default Layout;