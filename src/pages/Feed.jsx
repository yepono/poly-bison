import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";

const mockPosts = [
    {
        id: 1,
        autor: "Admin FCFM",
        avatar: "https://ui-avatars.com/api/?name=Admin+FCFM&background=cc0000&color=fff",
        fecha: "Hace 2 horas",
        titulo: "Suspensión de clases por mantenimiento",
        contenido: "Se les informa que el día de mañana no habrá clases en el edificio 2 debido a labores de mantenimiento en la red eléctrica. Favor de revisar sus correos universitarios para más detalles.",
        imagen: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1000&auto=format&fit=crop",
        etiqueta: "Aviso",
        likes: 124,
        comentarios: 45
    },
    {
        id: 2,
        autor: "Juan Pérez",
        avatar: "",
        fecha: "Hace 5 horas",
        titulo: "¿Alguien entiende Grafos?",
        contenido: "Llevo tres días intentando resolver la tarea de matemáticas discretas y no logro implementar el algoritmo de Dijkstra. Si alguien tiene un buen tutorial o me puede explicar, invito los tacos.",
        imagen: null,
        etiqueta: "Ayuda",
        likes: 12,
        comentarios: 8
    },
    {
        id: 3,
        autor: "Sociedad de Alumnos",
        avatar: "https://ui-avatars.com/api/?name=SA&background=003366&color=fff",
        fecha: "Ayer a las 14:30",
        titulo: "Torneo de Super Smash Bros",
        contenido: "¡Bizontes! Ya están abiertas las inscripciones para el torneo de aniversario. El primer lugar se lleva una tarjeta de regalo de $500 y mercancía oficial de la facultad. Registros en la explanada principal.",
        imagen: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000&auto=format&fit=crop",
        etiqueta: "General",
        likes: 89,
        comentarios: 21
    },
    {
        id: 4,
        autor: "María González",
        avatar: "",
        fecha: "Ayer a las 16:00",
        titulo: null,
        contenido: "Acabo de encontrar una memoria USB negra de 64GB en el laboratorio 3 de LSTI. La dejé con el guardia de la entrada por si alguien la busca.",
        imagen: null,
        etiqueta: "General",
        likes: 5,
        comentarios: 1
    }
];

function Feed() {
    return (
        <div className="w-full">
            <CreatePost />


            <div className="flex flex-col gap-2">
                {mockPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>
        </div>
    );
}

export default Feed;