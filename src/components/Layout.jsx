import { Outlet, Link } from "react-router-dom";

function Layout() {
    return (
        <div className="flex min-h-screen bg-bg-deep text-text-body-dark">

            <aside className="w-64 bg-surface-dark border-r border-border-dark flex flex-col p-6 sticky top-0 h-screen">
                <h1 className="text-2xl font-bold text-neon-blue mb-10 drop-shadow-[0_0_8px_var(--color-neon-blue)]">
                    PolyBison
                </h1>

                <nav className="flex flex-col gap-4">
                    <Link to="/feed" className="p-3 rounded-lg hover:bg-primary/40 hover:text-neon-blue transition-colors font-semibold text-text-title-dark">
                        Feed Global
                    </Link>
                    <Link to="/aulas" className="p-3 rounded-lg hover:bg-primary/40 hover:text-neon-blue transition-colors font-semibold text-text-title-dark">
                        Aulas
                    </Link>
                    <Link to="/bisontstore" className="p-3 rounded-lg hover:bg-primary/40 hover:text-neon-blue transition-colors font-semibold text-text-title-dark">
                        Bisontstore
                    </Link>
                    <Link to="/calendario" className="p-3 rounded-lg hover:bg-primary/40 hover:text-neon-blue transition-colors font-semibold text-text-title-dark">
                        Calendario
                    </Link>
                </nav>

                <div className="mt-auto">
                    <Link to="/login" className="flex items-center justify-center p-3 w-full rounded-lg text-neon-red font-semibold bg-secondary/5 hover:bg-secondary/20 border border-transparent hover:border-secondary/30 transition-all">
                        Cerrar Sesión
                    </Link>
                </div>
            </aside>

            <main className="flex-1 flex justify-center relative overflow-hidden">
                <div className="absolute top-0 right-[-10%] w-125 h-125 bg-secondary/15 rounded-full blur-[120px] pointer-events-none z-0"></div>
                <div className="w-full max-w-3xl p-8 relative z-10">
                    <Outlet />
                </div>
            </main>

        </div>
    );
}

export default Layout;