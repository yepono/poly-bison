import { useEffect, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import PostCard from "../components/PostCard";
import { getCareerName } from "../utils/careers";
import { api, mapPost, mapUser } from "../api/client";
import { Link, useParams } from "react-router-dom";

function Perfil() {
    const { user: currentUser } = useAppData();
    const { userId } = useParams();
    const esOtroUsuario = Boolean(userId) && String(currentUser.id) !== userId;
    // { id, user } del perfil consultado; user null = no encontrado
    const [perfilConsultado, setPerfilConsultado] = useState(null);
    // { id, lista } publicaciones del perfil (publicaciones.php?accion=por_usuario)
    const [publicaciones, setPublicaciones] = useState(null);
    const perfilId = String(esOtroUsuario ? userId : currentUser.id);

    useEffect(() => {
        let cancelled = false;
        api("publicaciones", "por_usuario", { params: { id: perfilId } })
            .then((response) => { if (!cancelled) setPublicaciones({ id: perfilId, lista: response.publicaciones.map(mapPost) }); })
            .catch(() => { if (!cancelled) setPublicaciones({ id: perfilId, lista: [] }); });
        return () => { cancelled = true; };
    }, [perfilId]);

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
    if (cargando) return <section className="settings-section mx-auto max-w-xl text-center" aria-busy="true"><p className="text-text-muted-dark">Cargando perfil...</p></section>;
    const user = esOtroUsuario ? perfilConsultado.user : currentUser;
    if (!user) return <section className="settings-section mx-auto max-w-xl text-center"><h1 className="text-2xl font-bold text-text-title-dark">Perfil no encontrado</h1><Link to="/admin" className="action-button mt-5">Volver al panel</Link></section>;
    const ownPosts = publicaciones?.id === perfilId ? publicaciones.lista : [];
    const totalLikes = ownPosts.reduce((total, post) => total + post.likes, 0);
    const careerName = getCareerName(user.carrera);
    const isLsti = careerName === "Lic. en Seguridad y Tecnologías de la Información";
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.alias || user.nombre)}&background=003366&color=fff`;

    return (
        <section className="mx-auto w-full max-w-4xl">
            <header className="profile-hero">
                <img src={avatar} alt={`Foto de ${user.alias || user.nombre}`} className="h-24 w-24 rounded-full border-4 border-white/70 object-cover shadow-lg sm:h-28 sm:w-28" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold uppercase tracking-wider text-white/80">Comunidad PolyBison</p>
                    <h1 className="mt-2 break-words text-3xl font-bold text-white">{user.alias || "Sin alias"}</h1>
                    <p className="mt-1 text-lg text-white/90">{user.nombre}</p>
                </div>
                <span className="profile-joined">Desde {user.fechaRegistro || "fecha no disponible"}</span>
            </header>

            <dl className="profile-metrics">
                <div className="profile-metric profile-career">
                    <dt>Carrera</dt>
                    <dd className="flex items-start gap-3">
                        {isLsti && <span className="career-icon" role="img" aria-label="Tecnologías de la información"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path strokeLinecap="round" d="M8 21h8m-4-4v4m-5-9 2-2 2 2 3-4 2 2"/></svg></span>}
                        <span>{careerName}</span>
                    </dd>
                </div>
                <div className="profile-metric"><dt>Semestre</dt><dd className="profile-number">{user.semestre || "-"}<span>°</span></dd><p>en curso</p></div>
                <div className="profile-metric"><dt>Publicaciones</dt><dd className="profile-number">{ownPosts.length}</dd><p>compartidas</p></div>
                <div className="profile-metric"><dt>Me gusta</dt><dd className="profile-number">{totalLikes}</dd><p>recibidos</p></div>
            </dl>

            <div className="mt-10 flex items-baseline justify-between gap-4 border-b border-border-dark pb-3">
                <h2 className="text-xl font-bold text-text-title-dark">Publicaciones</h2>
                <p className="text-sm text-text-muted-dark">{totalLikes} likes en total</p>
            </div>
            {ownPosts.length ? (
                <div className="mt-5 flex flex-col gap-2">{ownPosts.map((post) => <PostCard key={post.id} post={post} onPostChange={actualizarPublicacion} onPostDeleted={quitarPublicacion} />)}</div>
            ) : (
                <p className="py-10 text-center text-text-muted-dark">Todavía no has publicado. Tus publicaciones aparecerán aquí.</p>
            )}
        </section>
    );
}

export default Perfil;
