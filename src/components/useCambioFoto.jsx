import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import AvatarCropper from "./AvatarCropper";
import { useAppData } from "../context/AppDataContext";
import { api, IMAGEN_TIPOS, validarImagen } from "../api/client";

// La original puede pesar más que el límite del servidor (2 MB): lo que se sube
// es el recorte de 512 px, que pesa decenas de KB.
const ORIGINAL_MAX_BYTES = 15 * 1024 * 1024;

// Todo el proceso para cambiar la foto de perfil: elegir el archivo, recortarlo y subirlo.
// Regresa la función para abrir el selector y los elementos que hay que mostrar en la página.
export function useCambioFoto() {
    const { setSessionUser } = useAppData();
    const input = useRef(null);
    const [archivo, setArchivo] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const seleccionar = () => input.current?.click();

    const onArchivo = (event) => {
        const file = event.target.files?.[0];
        event.target.value = ""; // permite elegir el mismo archivo otra vez
        if (!file) return;
        setMensaje("");
        if (!IMAGEN_TIPOS.includes(file.type)) {
            setError("La imagen debe ser JPG, PNG o WebP.");
            return;
        }
        if (file.size > ORIGINAL_MAX_BYTES) {
            setError("La imagen no puede pesar más de 15 MB.");
            return;
        }
        setError("");
        setArchivo(file);
    };

    const subir = async (recorte) => {
        const problema = validarImagen(recorte);
        if (problema) throw new Error(problema);
        const body = new FormData();
        body.append("foto", recorte);
        const response = await api("usuarios", "actualizar_foto", { method: "POST", body });
        setSessionUser(response.user, Date.now());
        setArchivo(null);
        setMensaje("Foto de perfil actualizada.");
    };

    const elementos = (
        <>
            <input
                ref={input}
                type="file"
                accept={IMAGEN_TIPOS.join(",")}
                onChange={onArchivo}
                className="sr-only"
                tabIndex={-1}
                aria-label="Seleccionar foto de perfil"
            />
            <AnimatePresence>
                {archivo && <AvatarCropper key="cropper" file={archivo} onCancel={() => setArchivo(null)} onConfirm={subir} />}
            </AnimatePresence>
        </>
    );

    return { seleccionar, elementos, mensaje, error };
}
