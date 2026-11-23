import { useId } from "react";
import SelectorFecha from "./SelectorFecha";
import CustomSelect from "./CustomSelect";

// Horas cada 15 minutos ("07:00" ... "23:45")
const HORAS = Array.from({ length: 96 }, (_, i) => {
    const h = String(Math.floor(i / 4)).padStart(2, "0");
    const m = String((i % 4) * 15).padStart(2, "0");
    return `${h}:${m}`;
});

// Fecha (con el calendario en español) y hora (de una lista) juntas en un solo valor
// "AAAA-MM-DDTHH:MM", que es el formato que espera la API.
function CampoFechaHora({ etiqueta, valor, onCambiar, horaInicial = "09:00" }) {
    const id = useId();
    const [fecha = "", hora = ""] = (valor || "").split("T");
    const horas = hora && !HORAS.includes(hora) ? [...HORAS, hora].sort() : HORAS;

    return (
        <fieldset className="form-label">
            <legend className="mb-2">{etiqueta}</legend>
            <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
                <SelectorFecha
                    id={`${id}-fecha`}
                    value={fecha}
                    onChange={(f) => onCambiar(`${f}T${hora || horaInicial}`)}
                    placeholder="Fecha"
                />
                <CustomSelect
                    ariaLabel={`${etiqueta}: hora`}
                    value={hora}
                    placeholder="Hora"
                    disabled={!fecha}
                    onChange={(h) => onCambiar(`${fecha}T${h}`)}
                    options={horas.map((h) => ({ value: h, label: h }))}
                />
            </div>
        </fieldset>
    );
}

export default CampoFechaHora;
