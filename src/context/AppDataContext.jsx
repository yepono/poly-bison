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
        id: "demo-admin",
        nombre: "Usuario PolyBison",
        alias: "Bisonte",
        correo: "",
        carrera: "LSTI",
        semestre: "1",
        rol: "Administrador",
        estado: "Aprobado",
        avatar: "",
        fechaRegistro: new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }),
    },
    preferences: { theme: "dark", fontSize: "normal" },
    posts: initialPosts,
    users: [
        { id: "demo-admin", nombre: "Usuario PolyBison", alias: "Bisonte", correo: "admin@polybison.demo", carrera: "LSTI", semestre: 1, rol: "Administrador", estado: "Aprobado", fechaRegistro: "2026-08-18" },
        { id: 2, nombre: "Ana López", alias: "analop", correo: "ana@fcfm.edu.mx", carrera: "LMAD", semestre: 4, rol: "Estudiante", estado: "Aprobado", fechaRegistro: "2026-08-21" },
        { id: 3, nombre: "Juan Pérez", alias: "juanp", correo: "juan@fcfm.edu.mx", carrera: "LSTI", semestre: 6, rol: "Estudiante", estado: "Pendiente", fechaRegistro: "2026-09-01" },
        { id: 4, nombre: "María González", alias: "mariag", correo: "maria@fcfm.edu.mx", carrera: "LCC", semestre: 3, rol: "Estudiante", estado: "Baneado", fechaRegistro: "2026-07-12" },
        { id: 5, nombre: "Luis Garza", alias: "lgarza", correo: "luis@fcfm.edu.mx", carrera: "LF", semestre: 2, rol: "Estudiante", estado: "Aprobado", fechaRegistro: "2026-09-04" },
    ],
    reservations: [
        { id: 1, aula: "Sala de Estudio A", alias: "analop", matricula: "2045123", fecha: "2026-09-10", hora: "10:00 - 11:00", estado: "Completada" },
        { id: 2, aula: "Sala de Estudio B", alias: "juanp", matricula: "2019876", fecha: "2026-09-11", hora: "12:00 - 13:00", estado: "Cancelada" },
        { id: 3, aula: "Laboratorio Web", alias: "lgarza", matricula: "2094521", fecha: "2026-09-14", hora: "14:00 - 15:00", estado: "Activa" },
    ],
    schedules: ["10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "14:00 - 15:00", "15:00 - 16:00"],
    products: [
        { id: 1, titulo: "Sudadera Oficial Bizonte", precio: "$450 MXN", categoria: "Ropa", imagen: "https://shop.chamarra.com/wp-content/uploads/2022/08/Chamarra-College-FCFM-UANL-2.jpg", descripcionCorta: "Sudadera azul marino con logo bordado.", descripcionLarga: "Sudadera oficial de la facultad." },
        { id: 2, titulo: "Termo Inteligente FCFM", precio: "$280 MXN", categoria: "Accesorios", imagen: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=600&auto=format&fit=crop", descripcionCorta: "Termo de acero inoxidable con indicador de temperatura.", descripcionLarga: "Termo de 500ml con pantalla LED." },
        { id: 3, titulo: "Paquete de Stickers", precio: "$50 MXN", categoria: "Papelería", imagen: "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=600&auto=format&fit=crop", descripcionCorta: "Colección de 5 stickers holográficos.", descripcionLarga: "Stickers oficiales de la facultad." },
        { id: 4, titulo: "Libreta Profesional Universitaria", precio: "$120 MXN", categoria: "Papelería", imagen: "https://images.unsplash.com/photo-1531346878377-a541e4ba1eb2?q=80&w=600&auto=format&fit=crop", descripcionCorta: "Cuaderno de 100 hojas de cuadro chico.", descripcionLarga: "Libreta de pasta dura con diseño de la facultad." },
    ],
    events: [
        { id_evento: 1, titulo: "Examen Medio Término", descripcion: "Examen parcial de Ecuaciones Diferenciales.", tipo: "Examen", fecha_inicio: "2026-09-18T10:00:00", fecha_fin: "2026-09-18T12:00:00", lugar: "Aula 105", visible: true },
        { id_evento: 2, titulo: "Feria de Software FCFM", descripcion: "Presentación de proyectos finales.", tipo: "Académico", fecha_inicio: "2026-09-24T14:00:00", fecha_fin: "2026-09-24T18:00:00", lugar: "Explanada Principal", visible: true },
        { id_evento: 3, titulo: "Torneo de Ajedrez", descripcion: "Torneo relámpago inter-facultades.", tipo: "Deportivo", fecha_inicio: "2026-09-24T10:00:00", fecha_fin: "2026-09-24T13:00:00", lugar: "Cafetería", visible: true },
    ],
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
            users: Array.isArray(parsed.users) ? parsed.users : initialData.users,
            reservations: Array.isArray(parsed.reservations) ? parsed.reservations : initialData.reservations,
            schedules: Array.isArray(parsed.schedules) ? parsed.schedules : initialData.schedules,
            products: Array.isArray(parsed.products) ? parsed.products : initialData.products,
            events: Array.isArray(parsed.events) ? parsed.events : initialData.events,
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

    const addManagedUser = (newUser) => {
        setData((current) => ({
            ...current,
            users: [{ ...newUser, id: Date.now(), fechaRegistro: new Date().toISOString().slice(0, 10), estado: "Aprobado" }, ...current.users],
        }));
    };

    const registerStudent = (newUser) => {
        const student = { ...newUser, id: Date.now(), rol: "Estudiante", estado: "Pendiente", fechaRegistro: new Date().toISOString().slice(0, 10) };
        setData((current) => ({
            ...current,
            user: { ...current.user, ...student },
            users: [student, ...current.users],
        }));
    };

    const updateManagedUser = (userId, updates) => {
        setData((current) => ({ ...current, users: current.users.map((item) => item.id === userId ? { ...item, ...updates } : item) }));
    };

    const deletePost = (postId) => {
        setData((current) => ({ ...current, posts: current.posts.filter((post) => post.id !== postId) }));
    };

    const updateSchedules = (schedules) => setData((current) => ({ ...current, schedules }));
    const updateProducts = (products) => setData((current) => ({ ...current, products }));
    const updateEvents = (events) => setData((current) => ({ ...current, events }));
    const addReservation = (reservation) => setData((current) => ({
        ...current,
        reservations: [{ ...reservation, id: Date.now(), estado: "Activa" }, ...current.reservations],
    }));

    return (
        <AppDataContext.Provider value={{ ...data, updateUser, updatePreferences, toggleLike, addComment, addPost, deleteAccount, addManagedUser, registerStudent, updateManagedUser, deletePost, updateSchedules, updateProducts, updateEvents, addReservation }}>
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
