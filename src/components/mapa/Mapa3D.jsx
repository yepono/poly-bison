import { Component, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, OrbitControls, useCursor } from "@react-three/drei";
import * as THREE from "three";
import {
    ALTURA_PISO, CAMPUS, LUGARES_POR_ID, TAMANO_CAMPUS, VISTAS_POR_ID,
    aEscena, edificioDeVista, encuadreLugar, encuadreVista,
} from "../../utils/mapaDatos";
import { useColoresTema } from "./useColoresTema";

const GROSOR_LOSA = 0.18;
const ALTURA_CUARTO_ACTIVO = 2.6;   // el piso activo se ve "cortado" para leerlo mejor
const SEPARACION_CUARTOS = 0.14;    // hueco entre cuartos vecinos (m)

// Geometría
function crearGeometria(poly, alto, hueco = 0) {
    const pts = poly.map(aEscena);
    let xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // Encoge un poco el polígono para que los cuartos vecinos no se peguen
    const sx = hueco ? Math.max(0.6, 1 - (2 * hueco) / Math.max(x1 - x0, 0.01)) : 1;
    const sz = hueco ? Math.max(0.6, 1 - (2 * hueco) / Math.max(z1 - z0, 0.01)) : 1;
    // La figura se dibuja de pie y luego se acuesta en el suelo, por eso aquí se usa -z
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(cx + (x - cx) * sx, -(cz + (z - cz) * sz))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: alto, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
}

function useGeometria(poly, alto, hueco) {
    const geo = useMemo(() => crearGeometria(poly, alto, hueco), [poly, alto, hueco]);
    useEffect(() => () => geo.dispose(), [geo]);
    return geo;
}

const sinRaycast = () => null;

// Un clic que en realidad fue arrastrar para girar no debe seleccionar
const esClic = (e) => e.delta <= 4;

// Etiquetas
// Una sola capa DOM encima del canvas; cada frame se proyectan las posiciones 3D.
// (drei <Html> crea una raíz de React por etiqueta y desmontar decenas a la vez
// al cambiar de vista provoca errores en React 19.)
const _v = new THREE.Vector3();

function ProyectorEtiquetas({ etiquetas, nodos }) {
    const camera = useThree((s) => s.camera);
    const size = useThree((s) => s.size);
    const invalidate = useThree((s) => s.invalidate);

    // Etiquetas nuevas necesitan un frame para colocarse
    useEffect(() => invalidate(), [etiquetas, invalidate]);

    useFrame(() => {
        for (const e of etiquetas) {
            const el = nodos.current.get(e.id);
            if (!el) continue;
            _v.set(...e.posicion).project(camera);
            if (_v.z > 1) {
                el.style.visibility = "hidden";
                continue;
            }
            const x = (_v.x * 0.5 + 0.5) * size.width;
            const y = (-_v.y * 0.5 + 0.5) * size.height;
            el.style.visibility = "visible";
            el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        }
    });
    return null;
}

function CapaEtiquetas({ etiquetas, nodos }) {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {etiquetas.map((e) => (
                <div
                    key={e.id}
                    ref={(el) => { if (el) nodos.current.set(e.id, el); else nodos.current.delete(e.id); }}
                    style={{ visibility: "hidden", zIndex: e.destacada ? 2 : 1 }}
                    className={`absolute left-0 top-0 whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-2xs shadow-md backdrop-blur-sm ${e.destacada
                        ? "border-accent bg-surface/95 font-semibold text-ink"
                        : "border-line bg-surface/80 text-ink-soft"
                        }`}
                >
                    {e.texto}
                </div>
            ))}
        </div>
    );
}

const tieneEtiquetaCampus = (c) => c.id !== "e1-oeste" && !c.id.startsWith("basquet-");

function calcularEtiquetas(vista, seleccionId, hoverId) {
    const edificio = edificioDeVista(vista);
    if (!edificio) {
        return CAMPUS.filter(tieneEtiquetaCampus).map((c) => {
            const id = `campus:${c.id}`;
            const [x, z] = aEscena(c.centro);
            return { id, texto: c.nombre, posicion: [x, c.altura + 1.5, z], destacada: id === seleccionId || id === hoverId };
        });
    }
    const piso = edificio.pisos[vista.piso];
    return piso.cuartos.flatMap((c) => {
        const destacada = c.id === seleccionId || c.id === hoverId;
        const texto = destacada ? c.nombre : c.numero;
        if (!texto) return [];
        const [x, z] = aEscena(c.centro);
        const y = piso.indice * ALTURA_PISO + GROSOR_LOSA + ALTURA_CUARTO_ACTIVO + (c.id === seleccionId ? 0.6 : 0) + 0.6;
        return [{ id: c.id, texto, posicion: [x, y, z], destacada }];
    });
}

// Campus
function EdificioCampus({ edificio, modo, colores, seleccionado, hover, onHover, onSeleccionar, onAbrir }) {
    const esSuelo = edificio.forma === "suelo";
    const altoPiso = esSuelo ? edificio.altura : ALTURA_PISO - 0.12;
    const geo = useGeometria(edificio.poly, altoPiso, 0);
    const interactivo = modo === "solido";

    const color = useMemo(() => {
        const base = new THREE.Color(colores.tipos[edificio.tipo] ?? colores["--brand"]);
        // Las canchas y la plaza van más apagadas que los edificios
        return esSuelo ? base.lerp(new THREE.Color(colores["--field"]), 0.55) : base.lerp(new THREE.Color(colores["--surface"]), 0.2);
    }, [colores, edificio.tipo, esSuelo]);
    const borde = useMemo(() => color.clone().multiplyScalar(0.5), [color]);

    const pisos = esSuelo ? 1 : edificio.pisos;
    const fantasma = modo === "fantasma";

    const handlers = interactivo ? {
        onPointerOver: (e) => { e.stopPropagation(); onHover(`campus:${edificio.id}`); },
        onPointerOut: () => onHover(null),
        onClick: (e) => { if (!esClic(e)) return; e.stopPropagation(); onSeleccionar(`campus:${edificio.id}`); },
        onDoubleClick: (e) => { e.stopPropagation(); if (edificio.planos) onAbrir(edificio.planos); },
    } : { raycast: sinRaycast };

    return (
        <group>
            {Array.from({ length: pisos }, (_, i) => (
                <mesh key={i} geometry={geo} position={[0, i * ALTURA_PISO, 0]} {...handlers}>
                    {/* key: three.js no recompila el material si sólo cambia "transparent" */}
                    <meshStandardMaterial
                        key={modo}
                        color={color}
                        emissive={color}
                        emissiveIntensity={seleccionado ? 0.45 : hover ? 0.25 : 0.04}
                        roughness={0.75}
                        transparent={fantasma}
                        opacity={fantasma ? (esSuelo ? 0.35 : 0.14) : 1}
                        depthWrite={!fantasma}
                    />
                    {!fantasma && !esSuelo && <Edges threshold={25} color={borde} />}
                </mesh>
            ))}
        </group>
    );
}

// Pisos
function Losa({ poly, y, color }) {
    const geo = useGeometria(poly, GROSOR_LOSA, 0);
    return (
        <mesh geometry={geo} position={[0, y, 0]} raycast={sinRaycast}>
            <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
    );
}

function Cuarto({ cuarto, activo, colores, seleccionado, hover, onHover, onSeleccionar }) {
    const alto = activo ? ALTURA_CUARTO_ACTIVO : ALTURA_PISO - GROSOR_LOSA - 0.1;
    const geo = useGeometria(cuarto.poly, alto, SEPARACION_CUARTOS);

    const color = useMemo(() => {
        const superficie = new THREE.Color(colores["--surface"]);
        if (!activo) return superficie.lerp(new THREE.Color(colores["--line"]), 0.5);
        if (!cuarto.nombre || cuarto.tipo === "Servicio") return superficie.lerp(new THREE.Color(colores["--ink-muted"]), 0.25);
        return new THREE.Color(colores.tipos[cuarto.tipo]).lerp(superficie, 0.15);
    }, [colores, activo, cuarto.nombre, cuarto.tipo]);
    const borde = useMemo(() => color.clone().multiplyScalar(0.45), [color]);

    const y = cuarto.piso * ALTURA_PISO + GROSOR_LOSA + (seleccionado ? 0.6 : hover ? 0.25 : 0);
    const handlers = activo && cuarto.nombre ? {
        onPointerOver: (e) => { e.stopPropagation(); onHover(cuarto.id); },
        onPointerOut: () => onHover(null),
        onClick: (e) => { if (!esClic(e)) return; e.stopPropagation(); onSeleccionar(cuarto.id); },
    } : { raycast: sinRaycast };

    return (
        <group position={[0, y, 0]}>
            <mesh geometry={geo} {...handlers}>
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={seleccionado ? 0.5 : hover ? 0.3 : 0.05}
                    roughness={0.7}
                />
                <Edges threshold={25} color={borde} />
            </mesh>
        </group>
    );
}

// Cámara
function ControlCamara({ encuadre }) {
    const controles = useRef(null);
    const camera = useThree((s) => s.camera);
    const invalidate = useThree((s) => s.invalidate);
    const animacion = useRef(null);

    useEffect(() => {
        animacion.current = {
            objetivo: new THREE.Vector3(...encuadre.objetivo),
            posicion: new THREE.Vector3(...encuadre.posicion),
        };
        invalidate();
    }, [encuadre, invalidate]);

    useFrame((_, dt) => {
        const a = animacion.current;
        const c = controles.current;
        if (!a || !c) return;
        const k = 1 - Math.pow(0.004, Math.min(dt, 0.1));
        camera.position.lerp(a.posicion, k);
        c.target.lerp(a.objetivo, k);
        c.update();
        if (camera.position.distanceToSquared(a.posicion) < 0.01 && c.target.distanceToSquared(a.objetivo) < 0.01) {
            animacion.current = null;
        } else {
            invalidate();
        }
    });

    return (
        <OrbitControls
            ref={controles}
            makeDefault
            enableDamping
            dampingFactor={0.12}
            maxPolarAngle={Math.PI * 0.46}
            minDistance={6}
            maxDistance={TAMANO_CAMPUS * 2.2}
            // Si el usuario toma el control, se cancela el vuelo de la cámara
            onStart={() => { animacion.current = null; }}
        />
    );
}

// Escena
function Escena({ vista, seleccionId, hoverId, setHoverId, onSeleccionar, onAbrirVista, colores }) {
    useCursor(Boolean(hoverId));

    const edificio = edificioDeVista(vista);
    const colorLosa = useMemo(
        () => new THREE.Color(colores["--field"]).lerp(new THREE.Color(colores["--line"]), 0.35),
        [colores],
    );

    const abrir = (edificioId) => {
        const primerPiso = Object.values(VISTAS_POR_ID).find((v) => v.edificio === edificioId && v.piso === 0);
        if (primerPiso) onAbrirVista(primerPiso.id);
    };

    return (
        <>
            {/* Terreno */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} raycast={sinRaycast}>
                <planeGeometry args={[TAMANO_CAMPUS * 4, TAMANO_CAMPUS * 4]} />
                <meshStandardMaterial color={colores["--field"]} roughness={1} />
            </mesh>

            {CAMPUS.map((c) => {
                // En vista de piso, el edificio explorado se reemplaza por sus cuartos
                if (edificio && c.planos === edificio.id) return null;
                return (
                    <EdificioCampus
                        key={c.id}
                        edificio={c}
                        modo={edificio ? "fantasma" : "solido"}
                        colores={colores}
                        seleccionado={seleccionId === `campus:${c.id}`}
                        hover={hoverId === `campus:${c.id}`}
                        onHover={setHoverId}
                        onSeleccionar={onSeleccionar}
                        onAbrir={abrir}
                    />
                );
            })}

            {edificio && edificio.pisos
                .filter((p) => p.indice <= vista.piso)
                .map((p) => (
                    <group key={p.id}>
                        {edificio.huella.map((poly, i) => (
                            <Losa key={i} poly={poly} y={p.indice * ALTURA_PISO} color={colorLosa} />
                        ))}
                        {p.cuartos.map((c) => (
                            <Cuarto
                                key={c.id}
                                cuarto={c}
                                activo={p.indice === vista.piso}
                                colores={colores}
                                seleccionado={seleccionId === c.id}
                                hover={hoverId === c.id}
                                onHover={setHoverId}
                                onSeleccionar={onSeleccionar}
                            />
                        ))}
                    </group>
                ))}
        </>
    );
}

// Aviso para cuando el navegador no puede mostrar gráficos 3D
class LimiteError extends Component {
    state = { error: false };
    static getDerivedStateFromError() { return { error: true }; }
    render() {
        if (this.state.error) {
            return (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-muted">
                    No se pudo iniciar la vista 3D. Revisa que tu navegador tenga WebGL activado.
                </div>
            );
        }
        return this.props.children;
    }
}

// Componente principal
// Mapa 3D de la facultad. Recibe la vista actual (general o un piso), el lugar seleccionado y
// un objeto `enfoque` que cambia cada vez que la cámara debe volar a un lugar.
export default function Mapa3D({ vistaId, seleccionId, enfoque, onSeleccionar, onAbrirVista }) {
    const colores = useColoresTema();
    const vista = VISTAS_POR_ID[vistaId];

    // El hover se guarda junto con su vista: al cambiar de vista deja de aplicar solo.
    const [hover, setHover] = useState({ vista: null, id: null });
    const hoverId = hover.vista === vistaId ? hover.id : null;
    const setHoverId = (id) => setHover({ vista: vistaId, id });

    const etiquetas = useMemo(() => calcularEtiquetas(vista, seleccionId, hoverId), [vista, seleccionId, hoverId]);
    const nodosEtiquetas = useRef(new Map());

    // La cámara sólo se mueve cuando cambia la vista o cuando se pide enfocar
    // un lugar (desde el directorio); un clic en la escena no mueve la cámara.
    const encuadre = useMemo(() => {
        const lugar = enfoque?.lugarId ? LUGARES_POR_ID[enfoque.lugarId] : null;
        return lugar && lugar.vista === vistaId ? encuadreLugar(lugar) : encuadreVista(vista);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vistaId, enfoque]);

    // Arranca ya en el encuadre inicial (sin vuelo desde el origen)
    const [posicionInicial] = useState(encuadre.posicion);
    const claro = colores.tema === "light";

    return (
        <LimiteError>
            <Canvas
                frameloop="demand"
                dpr={[1, 2]}
                camera={{ fov: 40, near: 0.5, far: TAMANO_CAMPUS * 10, position: posicionInicial }}
                onPointerMissed={(e) => { if (e.type === "click") onSeleccionar(null); }}
            >
                <color attach="background" args={[colores["--canvas"]]} />
                <fog attach="fog" args={[colores["--canvas"], TAMANO_CAMPUS * 1.6, TAMANO_CAMPUS * 4]} />
                <hemisphereLight args={[colores["--surface"], colores["--canvas"], claro ? 1.6 : 1.1]} />
                <ambientLight intensity={claro ? 0.6 : 0.35} />
                <directionalLight position={[60, 140, 90]} intensity={claro ? 1.4 : 1.2} />
                <directionalLight position={[-80, 60, -40]} intensity={0.35} />

                <Escena
                    vista={vista}
                    seleccionId={seleccionId}
                    hoverId={hoverId}
                    setHoverId={setHoverId}
                    onSeleccionar={onSeleccionar}
                    onAbrirVista={onAbrirVista}
                    colores={colores}
                />
                <ControlCamara encuadre={encuadre} />
                <ProyectorEtiquetas etiquetas={etiquetas} nodos={nodosEtiquetas} />
            </Canvas>
            <CapaEtiquetas etiquetas={etiquetas} nodos={nodosEtiquetas} />
        </LimiteError>
    );
}
