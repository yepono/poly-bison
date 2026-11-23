import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, mapPost, mapUser, setUnauthorizedHandler } from "../api/client";

const STORAGE_KEY = "polybison-app-data";

// Solo las preferencias (tema y tamaño de letra) se guardan en localStorage.
// Usuario, publicaciones, reservaciones, eventos y productos salen de la API.
const initialData = {
    preferences: { theme: "dark", fontSize: "normal" },
};

const AppDataContext = createContext(null);

function readStoredData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return initialData;
        const parsed = JSON.parse(stored);
        // Solo se lee "preferences" (versiones anteriores guardaban usuario,
        // publicaciones, reservaciones, etc.; ya no se usan)
        return { preferences: { ...initialData.preferences, ...parsed.preferences } };
    } catch {
        return initialData;
    }
}

export function AppDataProvider({ children }) {
    const [data, setData] = useState(readStoredData);
    // Sesión: "loading" mientras se consulta me; luego "authenticated" o "guest"
    const [user, setUser] = useState(null);
    const [authStatus, setAuthStatus] = useState("loading");
    // Feed: "loading" | "ready" | "error"
    const [posts, setPosts] = useState([]);
    const [postsStatus, setPostsStatus] = useState("loading");
    const [postsError, setPostsError] = useState("");

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        document.documentElement.dataset.theme = data.preferences.theme;
        document.documentElement.dataset.fontSize = data.preferences.fontSize;
    }, [data]);

    // Si la API responde 401 (sesión vencida, cuenta baneada...) se cierra la sesión local
    useEffect(() => {
        setUnauthorizedHandler(() => {
            setUser(null);
            setAuthStatus("guest");
            setPosts([]);
        });
        return () => setUnauthorizedHandler(null);
    }, []);

    // Al cargar la app se recupera la sesión del servidor
    useEffect(() => {
        let cancelled = false;
        api("usuarios", "me", { skipAuthHandler: true })
            .then((response) => {
                if (cancelled) return;
                setUser(mapUser(response.user));
                setAuthStatus("authenticated");
            })
            .catch(() => {
                if (cancelled) return;
                setUser(null);
                setAuthStatus("guest");
            });
        return () => { cancelled = true; };
    }, []);

    const login = async (correo, contrasenia) => {
        const response = await api("usuarios", "login", { method: "POST", body: { correo, contrasenia }, skipAuthHandler: true });
        const sessionUser = mapUser(response.user);
        setUser(sessionUser);
        setAuthStatus("authenticated");
        return sessionUser;
    };

    const logout = async () => {
        try {
            await api("usuarios", "logout", { method: "POST", skipAuthHandler: true });
        } finally {
            setUser(null);
            setAuthStatus("guest");
            setPosts([]);
        }
    };

    // Actualiza el usuario con la respuesta de la API (avatarVersion evita la caché del navegador)
    const setSessionUser = (apiUser, avatarVersion) => {
        setUser(mapUser(apiUser, avatarVersion));
    };

    // Cierra la sesión local sin llamar a la API (p. ej. tras eliminar la cuenta)
    const clearSession = () => {
        setUser(null);
        setAuthStatus("guest");
        setPosts([]);
    };

    // ---------- Publicaciones (publicaciones.php / reacciones.php) ----------
    const loadPosts = useCallback(() => {
        return api("publicaciones", "listar")
            .then((response) => {
                setPosts(response.publicaciones.map(mapPost));
                setPostsStatus("ready");
                setPostsError("");
            })
            .catch((err) => {
                setPostsStatus("error");
                setPostsError(err.message);
            });
    }, []);

    // El feed se carga al tener sesión (y no mientras haya clave temporal)
    const puedeCargarFeed = authStatus === "authenticated" && !user?.debeCambiarContrasena;
    useEffect(() => {
        if (puedeCargarFeed) loadPosts();
    }, [puedeCargarFeed, loadPosts]);

    // Inserta o reemplaza una publicación en el feed
    const upsertPost = (post) => {
        setPosts((current) => current.some((item) => item.id === post.id)
            ? current.map((item) => item.id === post.id ? post : item)
            : [post, ...current]);
    };

    // Da o quita like; regresa { liked, likes } para quien muestre la publicación fuera del feed
    const toggleLike = async (postId) => {
        const response = await api("reacciones", "reaccionar", { method: "POST", body: { id_publicacion: postId } });
        const resultado = { liked: response.liked, likes: response.total_likes };
        setPosts((current) => current.map((post) => post.id === postId ? { ...post, ...resultado } : post));
        return resultado;
    };

    // formData: titulo, descripcion, id_etiqueta, imagen | video_url
    const createPost = async (formData) => {
        const response = await api("publicaciones", "crear", { method: "POST", body: formData });
        const post = mapPost(response.publicacion);
        upsertPost(post);
        return post;
    };

    // formData: id_publicacion + campos a cambiar (+ quitar_multimedia=1)
    const updatePost = async (formData) => {
        const response = await api("publicaciones", "editar", { method: "POST", body: formData });
        const post = mapPost(response.publicacion);
        upsertPost(post);
        return post;
    };

    const deletePost = async (postId) => {
        await api("publicaciones", "eliminar", { method: "POST", body: { id_publicacion: postId } });
        setPosts((current) => current.filter((post) => post.id !== postId));
    };

    // Ajusta el conteo de comentarios en el feed (lo usa Publicacion al comentar/eliminar)
    const setPostCommentCount = (postId, total) => {
        setPosts((current) => current.map((post) => post.id === postId ? { ...post, comentarios: total } : post));
    };

    const updatePreferences = (updates) => {
        setData((current) => ({ ...current, preferences: { ...current.preferences, ...updates } }));
    };


    return (
        <AppDataContext.Provider value={{ ...data, user, authStatus, login, logout, setSessionUser, clearSession, updatePreferences, posts, postsStatus, postsError, loadPosts, upsertPost, toggleLike, createPost, updatePost, deletePost, setPostCommentCount }}>
            {children}
        </AppDataContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData() {
    const context = useContext(AppDataContext);
    if (!context) throw new Error("useAppData debe usarse dentro de AppDataProvider");
    return context;
}
