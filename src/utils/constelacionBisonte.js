// Constelación del bisonte (mascota de la FCFM, UANL) que se dibuja en las pantallas de acceso.
//
// Coordenadas en un lienzo de 420 x 280 (el bisonte mira a la izquierda).
// Las estrellas con `dato` se pueden pulsar y muestran su significado.
//
// Fuentes del texto (para cambiarlo o ampliarlo, edita solo `dato`):
//  - "El bisonte fue elegido por su fortaleza, valor y sagacidad, virtudes esenciales del
//    estudiante." — ABC Noticias, "Conoce el significado de las mascotas de la UANL" (8 ago 2022).
//  - La FCFM "nace el 23 de septiembre de 1953, en el ala norte del Colegio Civil" y el bisonte
//    representa su "Identidad deportiva" en las medallas del 62 aniversario — UANL, "Aniversario
//    de FCFM" (23 sep 2015).
//  - "La maldición de la integral" (dato.leyenda) es una leyenda que cuentan los estudiantes;
//    se muestra marcada como leyenda, no como dato oficial.

export const ESTRELLAS = [
    // Cabeza (baja, como la lleva el bisonte)
    { id: "hocico", x: 30, y: 180 },
    { id: "nariz", x: 36, y: 152 },
    { id: "frente", x: 60, y: 114 },
    { id: "cuerno", x: 54, y: 84, dato: {
        titulo: "Valor",
        texto: "El bisonte fue elegido como mascota de la FCFM por su valor, una de las tres virtudes que la facultad considera esenciales en sus estudiantes.",
    } },
    { id: "ojo", x: 70, y: 138, dato: {
        titulo: "Sagacidad",
        texto: "Astucia y buen juicio para leer el entorno antes de actuar. Es otra de las virtudes por las que se eligió al bisonte.",
    } },
    { id: "melena", x: 100, y: 76 },
    { id: "mandibula", x: 52, y: 200 },
    { id: "barba", x: 84, y: 218 },

    // Lomo
    { id: "joroba", x: 152, y: 34, dato: {
        titulo: "Fortaleza",
        texto: "La joroba del bisonte es músculo que sostiene su enorme cabeza. La FCFM lo eligió por su fortaleza, la primera de las virtudes que representa.",
    } },
    { id: "lomo", x: 224, y: 60 },
    { id: "espalda", x: 290, y: 78 },
    { id: "grupa", x: 338, y: 92 },
    { id: "cola", x: 354, y: 104, dato: {
        titulo: "Desde 1953",
        texto: "La Facultad de Ciencias Físico Matemáticas nació el 23 de septiembre de 1953, en el ala norte del Colegio Civil de la UANL.",
    } },
    { id: "punta-cola", x: 366, y: 154 },

    // Cuerpo y patas
    { id: "pecho", x: 112, y: 204, dato: {
        titulo: "Virtudes del estudiante",
        texto: "«El bisonte fue elegido por su fortaleza, valor y sagacidad, virtudes esenciales del estudiante.»",
    } },
    { id: "rodilla-del", x: 136, y: 210 },
    { id: "pata-del", x: 138, y: 252, dato: {
        titulo: "Identidad deportiva",
        texto: "En el 62 aniversario de la FCFM (2015) se entregaron medallas con las identidades de la facultad: el escudo, la fachada, el mural «El hombre y la ciencia» y el bisonte, que representa su identidad deportiva.",
    } },
    { id: "codo-del", x: 186, y: 204 },
    { id: "pezuna-del", x: 180, y: 252 },
    { id: "vientre", x: 250, y: 196 },
    { id: "rodilla-tras", x: 300, y: 196 },
    { id: "pezuna-tras", x: 304, y: 252 },
    { id: "anca", x: 346, y: 140 },
    { id: "corvejon", x: 342, y: 196 },
    { id: "pezuna-tras2", x: 336, y: 252 },

    // Leyenda estudiantil
    { id: "testiculos", x: 322, y: 214, dato: {
        titulo: "La maldición de la integral",
        leyenda: true,
        texto: "Cuenta la leyenda que si alguien pisa la integral del pozo, este no pasara sus materias. Para romper la maldición hay un solo remedio: tocarle los testículos al bisonte. Por si acaso, ya sabes dónde están.",
    } },
];

// Líneas entre estrellas (por id): el contorno del bisonte
export const LINEAS = [
    ["hocico", "nariz"], ["nariz", "frente"], ["frente", "cuerno"], ["frente", "melena"], ["frente", "ojo"],
    ["melena", "joroba"], ["joroba", "lomo"], ["lomo", "espalda"], ["espalda", "grupa"],
    ["grupa", "cola"], ["cola", "punta-cola"],
    ["grupa", "anca"], ["anca", "corvejon"], ["corvejon", "pezuna-tras2"],
    ["pezuna-tras", "rodilla-tras"], ["rodilla-tras", "vientre"], ["vientre", "codo-del"], ["codo-del", "pezuna-del"],
    ["rodilla-tras", "testiculos"], ["testiculos", "corvejon"],
    ["pata-del", "rodilla-del"], ["rodilla-del", "pecho"], ["pecho", "barba"], ["barba", "mandibula"], ["mandibula", "hocico"],
];

export const FUENTES = [
    { texto: "ABC Noticias (2022)", url: "https://abcnoticias.mx/local/2022/8/8/cual-es-el-significado-de-las-mascotas-de-la-uanl-168369.html" },
    { texto: "UANL (2015)", url: "https://www.uanl.mx/noticias/conmemoran-aniversario-de-fcfm/" },
];
