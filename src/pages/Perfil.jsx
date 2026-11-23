import { useEffect, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import PostCard from "../components/PostCard";
import { getCareerName } from "../utils/careers";
import { api, mapPost, mapUser } from "../api/client";
import { Link, useParams } from "react-router-dom";
import { useCambioFoto } from "../components/useCambioFoto";
import Avatar from "../components/Avatar";
import PostSkeleton from "../components/PostSkeleton";
import { Cargando, Esqueleto, EstadoError, EstadoVacio } from "../components/Estados";

// Esqueleto de la página completa mientras llega el perfil de otro usuario
function PerfilCargando() {
    return (
        <section className="pagina-media">
            <Cargando etiqueta="Cargando perfil">
                <div className="rounded-2xl border border-line bg-surface/50 p-6 shadow-card">
                    <div className="flex items-center gap-5">
                        <Esqueleto redondo className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
                        <div className="flex-1 space-y-2.5">
                            <Esqueleto className="h-2.5 w-32" />
                            <Esqueleto className="h-6 w-48" />
                            <Esqueleto className="h-3.5 w-40" />
                        </div>
                    </div>
                    <div className="mt-6 flex gap-2"><Esqueleto className="h-8 w-56 rounded-full" /><Esqueleto className="h-8 w-36 rounded-full" /></div>
                    <div className="mt-6 grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <Esqueleto key={i} className="h-14" />)}</div>
                </div>
                <div className="mt-8 flex flex-col gap-4"><PostSkeleton /><PostSkeleton /></div>
            </Cargando>
        </section>
    );
}

const ICONO_LSTI = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path strokeLinecap="round" d="M8 21h8m-4-4v4m-5-9 2-2 2 2 3-4 2 2"/></svg>;
const ICONO_CARRERA = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinejoin="round" d="m3 9 9-5 9 5-9 5-9-5Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V16c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5v-4.5M21 9v5"/></svg>;
const ICONO_CALENDARIO = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path strokeLinecap="round" d="M3.5 10h17M8 3v4m8-4v4"/></svg>;

function Perfil() {
    const { user: currentUser } = useAppData();
    const { userId } = useParams();
    const esOtroUsuario = Boolean(userId) && String(currentUser.id) !== userId;
    // { id, user } del perfil consultado; user null = no encontrado
    const [perfilConsultado, setPerfilConsultado] = useState(null);
    // { id, lista } publicaciones del perfil (publicaciones.php?accion=por_usuario)
    const [publicaciones, setPublicaciones] = useState(null);
    const [intento, setIntento] = useState(0); // "Reintentar" vuelve a pedir las publicaciones
    const perfilId = String(esOtroUsuario ? userId : currentUser.id);
    const foto = useCambioFoto();

    useEffect(() => {
        let cancelled = false;
        api("publicaciones", "por_usuario", { params: { id: perfilId } })
            .then((response) => { if (!cancelled) setPublicaciones({ id: perfilId, lista: response.publicaciones.map(mapPost), error: "" }); })
            .catch((err) => { if (!cancelled) setPublicaciones({ id: perfilId, lista: [], error: err.message }); });
        return () => { cancelled = true; };
    }, [perfilId, intento]);

    const actualizarPublicacion = (actualizada) => setPublicaciones((current) => ({
        ...current,
        lista: current.lista.map((item) => item.id === actualizada.id ? actualizada : item),
    }));
    const quitarPublicacion = (id) => setPublicaciones((current) => ({
        ...current,
        lista: current.lista.filter((item) => item.id !== id),
    }));

    useEffect(() => {
        if (!esOtroUsuario) return undefined;
        let cancelled = false;
        api("usuarios", "perfil", { params: { id: userId } })
            .then((response) => { if (!cancelled) setPerfilConsultado({ id: userId, user: mapUser(response.user) }); })
            .catch(() => { if (!cancelled) setPerfilConsultado({ id: userId, user: null }); });
        return () => { cancelled = true; };
    }, [esOtroUsuario, userId]);

    const cargando = esOtroUsuario && perfilConsultado?.id !== userId;
    if (cargando) return <PerfilCargando />;
    const user = esOtroUsuario ? perfilConsultado.user : currentUser;
    if (!user) return <section className="settings-section mx-auto max-w-xl text-center"><h1 className="text-2xl font-bold text-ink">Perfil no encontrado</h1><Link to="/admin" className="action-button mt-5">Volver al panel</Link></section>;
    const postsListos = publicaciones?.id === perfilId;
    const ownPosts = postsListos ? publicaciones.lista : [];
    const cifrasListas = postsListos && !publicaciones.error;
    const totalLikes = ownPosts.reduce((total, post) => total + (Number(post.likes) || 0), 0);
    const careerName = getCareerName(user.carrera);
    const isLsti = careerName === "Lic. en Seguridad y Tecnologías de la Información";

    const nombreVisible = user.alias || user.nombre;

    return (
        <section className="pagina-media">
            <header className="profile-hero">
                <div className="flex items-center gap-4 sm:gap-5">
                    <div className="relative shrink-0">
                        <Avatar src={user.avatar} nombre={nombreVisible} className="h-20 w-20 border-4 border-on-brand/70 shadow-lg sm:h-24 sm:w-24" />
                        {!esOtroUsuario && (
                            <button type="button" onClick={foto.seleccionar} className="profile-avatar-edit" aria-label={user.avatar ? "Cambiar foto de perfil" : "Agregar foto de perfil"} title={user.avatar ? "Cambiar foto" : "Agregar foto"}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
                                    <circle cx="12" cy="12.5" r="3.5" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-2xs font-bold uppercase tracking-wider text-on-brand/75 sm:text-xs">Comunidad PolyBison</p>
                        <h1 className="mt-1 break-words text-2xl font-bold leading-tight text-on-brand sm:text-3xl">{user.alias || "Sin alias"}</h1>
                        <p className="truncate text-on-brand/90">{user.nombre}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <span className="profile-chip" title={careerName}>
                        {isLsti ? ICONO_LSTI : ICONO_CARRERA}
                        <span>{careerName}</span>
                    </span>
                    <span className="profile-chip">
                        {ICONO_CALENDARIO}
                        Desde {user.fechaRegistro || "fecha no disponible"}
                    </span>
                </div>

                <dl className="profile-stats">
                    <div className="profile-stat"><dt>Semestre</dt><dd>{user.semestre ? `${user.semestre}°` : "—"}</dd></div>
                    <div className="profile-stat"><dt>Publicaciones</dt><dd>{cifrasListas ? ownPosts.length : "—"}</dd></div>
                    <div className="profile-stat"><dt>Me gusta</dt><dd>{cifrasListas ? totalLikes : "—"}</dd></div>
                </dl>
            </header>

            {!esOtroUsuario && foto.elementos}
            {foto.mensaje && <p role="status" className="mt-3 text-sm text-accent">{foto.mensaje}</p>}
            {foto.error && <p role="alert" className="mt-3 text-sm text-danger">{foto.error}</p>}

            <div className="mt-8 border-b border-line pb-3">
                <h2 className="text-xl font-bold text-ink">Publicaciones</h2>
            </div>
            {!postsListos ? (
                <Cargando etiqueta="Cargando publicaciones"><div className="mt-5 flex flex-col gap-4"><PostSkeleton /><PostSkeleton /></div></Cargando>
            ) : publicaciones.error ? (
                <EstadoError mensaje="No se pudieron cargar las publicaciones." onReintentar={() => { setPublicaciones(null); setIntento((n) => n + 1); }} />
            ) : ownPosts.length ? (
                <div className="mt-5 flex flex-col gap-4">{ownPosts.map((post) => <PostCard key={post.id} post={post} onPostChange={actualizarPublicacion} onPostDeleted={quitarPublicacion} />)}</div>
            ) : (
                <EstadoVacio
                    icono="publicacion"
                    titulo={esOtroUsuario ? "Todavía no hay publicaciones" : "Todavía no has publicado"}
                    detalle={esOtroUsuario ? "Cuando este usuario publique algo aparecerá aquí." : "Tus publicaciones aparecerán aquí."}
                    accion={!esOtroUsuario && <Link to="/feed?publicar=1" className="action-button action-button-sm mt-1">Crear publicación</Link>}
                />
            )}
        </section>
    );
}

export default Perfil;
