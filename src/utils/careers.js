export const CAREERS = [
    "Lic. en Multimedia y Animación Digital",
    "Lic. en Seguridad y Tecnologías de la Información",
    "Lic. en Física",
    "Lic. en Matemáticas",
    "Lic. en Actuaría",
    "Lic. en Ciencias Computacionales",
    "Ingeniería en Ciberseguridad",
];

// Convierte el código de la carrera guardado en la base de datos en su nombre completo
const LEGACY_CAREERS = {
    LSTI: CAREERS[1],
    LMAD: CAREERS[0],
    LF: CAREERS[2],
    LM: CAREERS[3],
    LA: CAREERS[4],
    LCC: CAREERS[5],
    IC: CAREERS[6],
};

export function getCareerName(career = "") {
    return LEGACY_CAREERS[career] || career || "Sin especificar";
}
