import { useState } from "react";
import CustomSelect from "./CustomSelect";

function CreatePost() {
    const [titulo, setTitulo] = useState("");
    const [contenido, setContenido] = useState("");
    const [imagen, setImagen] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const [etiqueta, setEtiqueta] = useState("General");

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Publicación creada:", { titulo, contenido, imagen, etiqueta });
        
        setTitulo("");
        setContenido("");
        setImagen(null);
        setPreviewURL(null);
        setEtiqueta("General");
    };

    const handleImagen = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImagen(file);
            setPreviewURL(URL.createObjectURL(file)); 
        }
    };

    const removerImagen = () => {
        setImagen(null);
        setPreviewURL(null);
    };

    return (
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 shadow-[0_5px_15px_rgba(0,0,0,0.5)] mb-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
               
                <div className={`relative w-full rounded-xl overflow-hidden transition-all duration-300 ${previewURL ? 'h-64 sm:h-72' : 'h-auto border-b border-border-dark'}`}>
                    
                    {previewURL && (
                        <>
                            <img 
                                src={previewURL} 
                                alt="Vista previa" 
                                className="absolute inset-0 w-full h-full object-cover" 
                            />
                            
                            <div className="absolute inset-0 bg-linear-to-b from-bg-deep/90 via-bg-deep/30 to-transparent"></div>
                            
                            <button 
                                type="button" 
                                onClick={removerImagen}
                                className="absolute top-3 right-3 bg-bg-deep/60 hover:bg-secondary/80 text-white rounded-full p-2 backdrop-blur-sm transition-colors z-20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </>
                    )}

                    <input
                        type="text"
                        placeholder="Título de la publicación (Opcional)"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className={`w-full bg-transparent font-bold focus:outline-none relative z-10 transition-all
                            ${previewURL 
                                ? 'absolute top-4 left-4 right-4 text-2xl sm:text-3xl text-white placeholder-white/70 drop-shadow-md w-[calc(100%-2rem)]' 
                                : 'p-2 text-xl sm:text-2xl text-text-title-dark placeholder-text-muted-dark'
                            }`}
                    />
                </div>
                
                <textarea 
                    className="w-full min-h-20 p-2 bg-transparent text-text-title-dark placeholder-text-muted-dark focus:outline-none resize-none custom-scrollbar text-sm sm:text-base"
                    placeholder="¿Qué está pasando en la facultad?"
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                ></textarea>
                
                <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-border-dark">
                    
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        
                        <label className="cursor-pointer text-text-body-dark hover:text-neon-blue transition-colors flex items-center gap-2 p-2 rounded-lg hover:bg-primary/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm font-semibold hidden sm:inline">Añadir Foto</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImagen} />
                        </label>

                        <div className="w-36 sm:w-40 z-20">
                            <CustomSelect 
                                value={etiqueta}
                                onChange={(val) => setEtiqueta(val)}
                                options={[
                                    {value: "General", label: "General"},
                                    {value: "Académico", label: "Académico"},
                                    {value: "Ayuda", label: "Ayuda"},
                                    {value: "Aviso", label: "Aviso"}
                                ]}
                            />
                        </div>
                    </div>

                    <button type="submit" className="bg-linear-to-r from-primary to-secondary hover:from-primary-hover hover:to-secondary-hover text-white font-bold py-2 px-6 rounded-lg transition-colors w-full sm:w-auto">
                        Publicar
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreatePost;