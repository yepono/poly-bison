import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "polybison-app-data";

const initialPosts = [
    {
        id: 1,
        authorId: "admin",
        autor: "Admin FCFM",
        avatar: "https://ui-avatars.com/api/?name=Admin+FCFM&background=cc0000&color=fff",
        fecha: "Hace 2 horas",
        titulo: "Suspensión de clases por mantenimiento",
        contenido: "Se les informa que el día de mañana no habrá clases en el edificio 2 debido a labores de mantenimiento en la red eléctrica. Favor de revisar sus correos universitarios para más detalles.",
        imagen: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1000&auto=format&fit=crop",
        etiqueta: "Aviso",
        likes: 124,
        liked: false,
        comentarios: [
            { id: 1, autor: "Coordinación FCFM", texto: "Gracias por mantenerse al pendiente.", fecha: "Hace 1 hora" },
            { id: 2, autor: "Ana López", texto: "¿También se suspende el laboratorio?", fecha: "Hace 50 min" },
        ],
    },
    {
        id: 2,
        authorId: "juan-perez",
        autor: "Juan Pérez",
        avatar: "",
        fecha: "Hace 5 horas",
        titulo: "¿Alguien entiende Grafos?",
        contenido: "Llevo tres días intentando resolver la tarea de matemáticas discretas y no logro implementar el algoritmo de Dijkstra. Si alguien tiene un buen tutorial o me puede explicar, invito los tacos.",
        imagen: null,
        etiqueta: "Ayuda",
        likes: 12,
        liked: false,
        comentarios: [
            { id: 3, autor: "María González", texto: "Te recomiendo revisar la explicación de la semana pasada.", fecha: "Hace 4 horas" },
        ],
    },
    {
        id: 3,
        authorId: "sociedad-alumnos",
        autor: "Sociedad de Alumnos",
        avatar: "https://ui-avatars.com/api/?name=SA&background=003366&color=fff",
        fecha: "Ayer a las 14:30",
        titulo: "Torneo de Super Smash Bros",
        contenido: "¡Bizontes! Ya están abiertas las inscripciones para el torneo de aniversario. El primer lugar se lleva una tarjeta de regalo de $500 y mercancía oficial de la facultad. Registros en la explanada principal.",
        imagen: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000&auto=format&fit=crop",
        etiqueta: "General",
        likes: 89,
        liked: false,
        comentarios: [],
    },
    {
        id: 4,
        authorId: "maria-gonzalez",
        autor: "María González",
        avatar: "",
        fecha: "Ayer a las 16:00",
        titulo: null,
        contenido: "Acabo de encontrar una memoria USB negra de 64GB en el laboratorio 3 de LSTI. La dejé con el guardia de la entrada por si alguien la busca.",
        imagen: null,
        etiqueta: "General",
        likes: 5,
        liked: false,
        comentarios: [],
    },
];

const initialData = {
    user: {
        nombre: "Usuario PolyBison",
        alias: "Bisonte",
        correo: "",
        carrera: "LSTI",
        semestre: "1",
        avatar: "",
        fechaRegistro: new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }),
    },
    preferences: { theme: "dark", fontSize: "normal" },
    posts: initialPosts,
};

const AppDataContext = createContext(null);

function readStoredData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return initialData;
        const parsed = JSON.parse(stored);
        return {
            ...initialData,
            ...parsed,
            user: { ...initialData.user, ...parsed.user },
            preferences: { ...initialData.preferences, ...parsed.preferences },
            posts: Array.isArray(parsed.posts) ? parsed.posts : initialPosts,
        };
    } catch {
        return initialData;
    }
}

export function AppDataProvider({ children }) {
    const [data, setData] = useState(readStoredData);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        document.documentElement.dataset.theme = data.preferences.theme;
        document.documentElement.dataset.fontSize = data.preferences.fontSize;
    }, [data]);

    const updateUser = (updates) => {
        setData((current) => ({ ...current, user: { ...current.user, ...updates } }));
    };

    const updatePreferences = (updates) => {
        setData((current) => ({ ...current, preferences: { ...current.preferences, ...updates } }));
    };

    const toggleLike = (postId) => {
        setData((current) => ({
            ...current,
            posts: current.posts.map((post) => post.id === postId
                ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) }
                : post),
        }));
    };

    const addComment = (postId, text) => {
        const now = new Date();
        const comment = {
            id: Date.now(),
            alias: data.user.alias || data.user.nombre,
            autor: data.user.alias || data.user.nombre,
            avatar: data.user.avatar,
            texto: text,
            fecha: new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(now),
        };
        setData((current) => ({
            ...current,
            posts: current.posts.map((post) => post.id === postId
                ? { ...post, comentarios: [...(post.comentarios || []), comment] }
                : post),
        }));
    };

    const addPost = (post) => {
        setData((current) => ({
            ...current,
            posts: [{
                ...post,
                id: Date.now(),
                authorId: "current-user",
                autor: current.user.alias || current.user.nombre,
                avatar: current.user.avatar,
                fecha: "Ahora",
                likes: 0,
                liked: false,
                comentarios: [],
            }, ...current.posts],
        }));
    };

    const deleteAccount = () => {
        const clearedData = {
            ...initialData,
            user: { nombre: "", alias: "", correo: "", carrera: "", semestre: "", avatar: "", fechaRegistro: "" },
            posts: [],
        };
        localStorage.removeItem(STORAGE_KEY);
        setData(clearedData);
    };

    return (
        <AppDataContext.Provider value={{ ...data, updateUser, updatePreferences, toggleLike, addComment, addPost, deleteAccount }}>
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
