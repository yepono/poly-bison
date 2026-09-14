import { Outlet, Link } from "react-router-dom";

function Layout() {
    return (
        <div className="flex min-h-screen bg-bg-deep text-text-body-dark relative">

            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[5%] left-[-10%] w-125 h-125 bg-neon-blue/15 rounded-full blur-[150px]"></div>
                <div className="absolute top-[20%] right-[-5%] w-112.5 h-112.5 bg-secondary/20 rounded-full blur-[120px]"></div>
                <div className="absolute top-[40%] left-[10%] w-150 h-150 bg-primary/20 rounded-full blur-[150px]"></div>
                <div className="absolute top-[65%] right-[10%] w-125 h-125 bg-neon-red/10 rounded-full blur-[120px]"></div>
                <div className="absolute top-[85%] left-[-10%] w-137.5 h-137.5 bg-neon-blue/15 rounded-full blur-[140px]"></div>
            </div>

            <aside className="w-64 bg-surface-deep/90 backdrop-blur-md border-r border-border-dark flex flex-col p-6 sticky top-0 h-screen z-20 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
                <h1 className="text-2xl font-bold  mb-10 bg-linear-to-r from-red-500 to-pink-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_var(--color-secondary)]">
                    PolyBison
                </h1>

                <nav className="flex flex-col gap-4">
                    <Link to="/feed" className="p-3 rounded-lg bg-transparent hover:bg-surface-dark/80 hover:shadow-lg hover:text-neon-blue transition-all font-semibold text-text-title-dark border border-transparent hover:border-border-dark">
                        Feed Global
                    </Link>
                    <Link to="/aulas" className="p-3 rounded-lg bg-transparent hover:bg-surface-dark/80 hover:shadow-lg hover:text-neon-blue transition-all font-semibold text-text-title-dark border border-transparent hover:border-border-dark">
                        Aulas
                    </Link>
                    <Link to="/bisontstore" className="p-3 rounded-lg bg-transparent hover:bg-surface-dark/80 hover:shadow-lg hover:text-neon-blue transition-all font-semibold text-text-title-dark border border-transparent hover:border-border-dark">
                        Bisontstore
                    </Link>
                    <Link to="/calendario" className="p-3 rounded-lg bg-transparent hover:bg-surface-dark/80 hover:shadow-lg hover:text-neon-blue transition-all font-semibold text-text-title-dark border border-transparent hover:border-border-dark">
                        Calendario
                    </Link>
                </nav>

                <div className="mt-auto">
                    <Link to="/login" className="flex items-center justify-center p-3 w-full rounded-lg text-neon-red font-semibold bg-transparent hover:bg-secondary/30 border border-transparent hover:border-secondary/50 transition-all">
                        Cerrar Sesión
                    </Link>
                </div>
            </aside>

            {/* Contenedor principal de vistas */}
            <main className="flex-1 flex justify-center relative z-10">
                <div className="w-full max-w-3xl p-8">
                    <Outlet />
                </div>
            </main>

        </div>
    );
}

export default Layout;