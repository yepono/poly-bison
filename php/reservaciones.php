<?php
// Reservación de aulas. Con sesión se pueden ver las aulas, los horarios y su disponibilidad,
// reservar (quien reserva se agrega solo y puede sumar acompañantes) y ver o cancelar las
// reservaciones propias. Administradores y moderadores ven el historial completo, y solo el
// administrador puede crear, editar, activar o desactivar horarios.
require __DIR__ . "/config.php";

const ROLES_STAFF = ["Administrador", "Moderador"];
const DUPLICADOS_RESERVACION = [
    "uq_user_dia"    => "Ya tienes una reservación ese día (máximo una por día)",
    "uq_aula_slot"   => "Ese horario ya está ocupado",
    "id_reservacion" => "Hay matrículas repetidas entre los asistentes",
    "codigo_ticket"  => "No se pudo generar el ticket, intenta de nuevo",
    "hora_inicio"    => "Ese horario ya existe",
];

// Funciones de apoyo
function spReservacion(mysqli $conn, string $accion, array $p): array {
    return callProcedure($conn, "sp_reservacion", "siiisiss", [
        $accion,
        $p["id_reservacion"] ?? null,
        $p["id_actor"]       ?? null,
        $p["id_aula"]        ?? null,
        $p["fecha"]          ?? null,
        $p["id_bloque"]      ?? null,
        $p["matricula"]      ?? null,
        $p["nombre"]         ?? null,
    ]);
}

function spBloque(mysqli $conn, string $accion, array $p): array {
    return callProcedure($conn, "sp_bloque_horario", "siiss", [
        $accion,
        $p["id_bloque"]   ?? null,
        $p["id_actor"]    ?? null,
        $p["hora_inicio"] ?? null,
        $p["hora_fin"]    ?? null,
    ]);
}

// Fecha AAAA-MM-DD válida o null
function leerFecha(?string $valor): ?string {
    if ($valor === null || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $valor)) return null;
    [$a, $m, $d] = array_map("intval", explode("-", $valor));
    return checkdate($m, $d, $a) ? $valor : null;
}

// Convierte una hora HH:MM al formato de MySQL, o null si no es válida
function leerHora(string $valor): ?string {
    return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $valor) ? $valor . ":00" : null;
}

function reservacionResponse(array $r): array {
    return [
        "id_reservacion"   => (int)$r["id_reservacion"],
        "codigo_ticket"    => $r["codigo_ticket"],
        "fecha_reserva"    => $r["fecha_reserva"],
        "estado"           => $r["estado"],
        "fecha_creacion"   => $r["fecha_creacion"],
        "id_aula"          => (int)$r["id_aula"],
        "aula"             => $r["aula"],
        "capacidad"        => (int)$r["capacidad"],
        "id_bloque"        => (int)$r["id_bloque"],
        "hora_inicio"      => substr($r["hora_inicio"], 0, 5),
        "hora_fin"         => substr($r["hora_fin"], 0, 5),
        "id_usuario"       => (int)$r["id_usuario"],
        "alias"            => $r["alias"],
        "matricula"        => $r["matricula"],
        "total_asistentes" => (int)$r["total_asistentes"],
    ];
}

function bloqueResponse(array $r): array {
    return [
        "id_bloque"   => (int)$r["id_bloque"],
        "hora_inicio" => substr($r["hora_inicio"], 0, 5),
        "hora_fin"    => substr($r["hora_fin"], 0, 5),
        "activo"      => (bool)$r["activo"],
    ];
}

// Un bloque de HOY cuya hora de inicio ya pasó no se puede reservar
function bloqueYaPaso(string $fecha, string $horaInicio): bool {
    return $fecha === date("Y-m-d") && substr($horaInicio, 0, 5) <= date("H:i");
}

// Acciones
function accionAulas(mysqli $conn): never {
    requireMethod("GET");
    requireLogin($conn);
    $rows = $conn->query("SELECT id_aula, nombre, capacidad FROM Aula WHERE activo = 1 ORDER BY id_aula")
                 ->fetch_all(MYSQLI_ASSOC);
    $aulas = array_map(fn($r) => [
        "id_aula"   => (int)$r["id_aula"],
        "nombre"    => $r["nombre"],
        "capacidad" => (int)$r["capacidad"],
    ], $rows);
    jsonResponse(["success" => true, "aulas" => $aulas]);
}

function accionBloques(mysqli $conn): never {
    requireMethod("GET");
    $u = requireLogin($conn);
    $todos = inputStr($_GET, "todos") === "1";
    if ($todos && $u["rol"] !== "Administrador") jsonError(403, "No tienes permiso para realizar esta acción");

    $sql = "SELECT id_bloque, hora_inicio, hora_fin, activo FROM Bloque_Horario"
         . ($todos ? "" : " WHERE activo = 1")
         . " ORDER BY hora_inicio, hora_fin";
    $rows = $conn->query($sql)->fetch_all(MYSQLI_ASSOC);
    jsonResponse(["success" => true, "bloques" => array_map("bloqueResponse", $rows)]);
}

function accionDisponibilidad(mysqli $conn): never {
    requireMethod("GET");
    requireLogin($conn);
    $idAula = inputInt($_GET, "id_aula");
    $fecha = leerFecha(inputStr($_GET, "fecha"));
    if ($idAula === null || $idAula <= 0) jsonError(400, "Aula no válida");
    if ($fecha === null) jsonError(400, "Fecha no válida");

    $stmt = $conn->prepare(
        "SELECT id_bloque, hora_inicio, hora_fin, activo,
                fn_aula_disponible(?, ?, id_bloque) AS disponible
         FROM Bloque_Horario
         WHERE activo = 1
         ORDER BY hora_inicio, hora_fin"
    );
    $stmt->bind_param("is", $idAula, $fecha);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $pasada = $fecha < date("Y-m-d");
    $bloques = array_map(fn($r) => bloqueResponse($r) + [
        "disponible" => !$pasada && (bool)$r["disponible"] && !bloqueYaPaso($fecha, $r["hora_inicio"]),
    ], $rows);
    jsonResponse(["success" => true, "bloques" => $bloques]);
}

function accionCrear(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $actor = (int)$u["id_usuario"];
    $data = readJsonBody();

    $idAula   = inputInt($data, "id_aula");
    $idBloque = inputInt($data, "id_bloque");
    $fecha    = leerFecha(inputStr($data, "fecha"));
    if ($idAula === null || $idAula <= 0) jsonError(400, "Selecciona un aula", "aula");
    if ($fecha === null) jsonError(400, "Selecciona una fecha válida", "fecha");
    if ($fecha < date("Y-m-d")) jsonError(400, "No puedes reservar en una fecha pasada", "fecha");
    if ($idBloque === null || $idBloque <= 0) jsonError(400, "Selecciona un horario", "horario");

    // Quien reserva se agrega solo, con su nombre y matrícula de la base de datos
    $stmt = $conn->prepare("SELECT nombre_completo, matricula FROM Usuario WHERE id_usuario = ?");
    $stmt->bind_param("i", $actor);
    $stmt->execute();
    $titular = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$titular || !preg_match('/^\d{7}$/', (string)$titular["matricula"])) {
        jsonError(400, "Tu cuenta no tiene una matrícula registrada; no puedes reservar");
    }

    // Acompañantes (opcionales)
    $lista = $data["asistentes"] ?? [];
    if (!is_array($lista)) jsonError(400, "Lista de asistentes no válida", "asistentes");
    $acompanantes = [];
    $matriculas = [$titular["matricula"] => true];
    foreach ($lista as $i => $a) {
        if (!is_array($a)) jsonError(400, "Lista de asistentes no válida", "asistentes");
        $nombre = inputStr($a, "nombre");
        $matricula = inputStr($a, "matricula");
        $n = $i + 1;
        if ($nombre === "") jsonError(400, "Escribe el nombre del acompañante {$n}", "asistentes");
        if (mb_strlen($nombre) > 250) jsonError(400, "El nombre del acompañante {$n} es demasiado largo", "asistentes");
        if (!preg_match('/^\d{7}$/', $matricula)) jsonError(400, "La matrícula del acompañante {$n} debe tener 7 dígitos", "asistentes");
        if (isset($matriculas[$matricula])) jsonError(400, "La matrícula {$matricula} está repetida", "asistentes");
        $matriculas[$matricula] = true;
        $acompanantes[] = ["nombre" => $nombre, "matricula" => $matricula];
    }

    // El bloque de hoy que ya empezó no se puede reservar
    $stmt = $conn->prepare("SELECT hora_inicio FROM Bloque_Horario WHERE id_bloque = ?");
    $stmt->bind_param("i", $idBloque);
    $stmt->execute();
    $bloque = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($bloque && bloqueYaPaso($fecha, $bloque["hora_inicio"])) {
        jsonError(400, "Ese horario ya pasó", "horario");
    }

    $conn->begin_transaction();
    try {
        $res = spReservacion($conn, "CREAR", [
            "id_actor"  => $actor,
            "id_aula"   => $idAula,
            "fecha"     => $fecha,
            "id_bloque" => $idBloque,
        ])[0];
        $idReservacion = (int)$res["id_reservacion"];

        $asistentes = array_merge(
            [["nombre" => $titular["nombre_completo"], "matricula" => $titular["matricula"]]],
            $acompanantes
        );
        foreach ($asistentes as $a) {
            // trg_asistente_capacidad_bi valida la capacidad del aula
            spReservacion($conn, "AGREGAR_ASISTENTE", [
                "id_reservacion" => $idReservacion,
                "id_actor"       => $actor,
                "matricula"      => $a["matricula"],
                "nombre"         => $a["nombre"],
            ]);
        }
        $conn->commit();
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        throw $e;
    }

    $stmt = $conn->prepare("SELECT * FROM vw_reservaciones_detalle WHERE id_reservacion = ?");
    $stmt->bind_param("i", $idReservacion);
    $stmt->execute();
    $detalle = reservacionResponse($stmt->get_result()->fetch_assoc());
    $stmt->close();

    jsonResponse(["success" => true, "reservacion" => $detalle, "asistentes" => $asistentes], 201);
}

function accionMisReservaciones(mysqli $conn): never {
    requireMethod("GET");
    $u = requireLogin($conn);
    $id = (int)$u["id_usuario"];
    $stmt = $conn->prepare(
        "SELECT * FROM vw_reservaciones_detalle
         WHERE id_usuario = ?
         ORDER BY fecha_reserva DESC, hora_inicio DESC"
    );
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    jsonResponse(["success" => true, "reservaciones" => array_map("reservacionResponse", $rows)]);
}

function accionCancelar(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $id = inputInt(readJsonBody(), "id_reservacion");
    if ($id === null || $id <= 0) jsonError(400, "Reservación no válida");
    // La rutina revisa que la reservación exista, sea del usuario, siga activa y no haya pasado
    spReservacion($conn, "CANCELAR", ["id_reservacion" => $id, "id_actor" => (int)$u["id_usuario"]]);
    jsonResponse(["success" => true, "message" => "Reservación cancelada"]);
}

function accionHistorial(mysqli $conn): never {
    requireMethod("GET");
    requireRole($conn, ...ROLES_STAFF);
    $rows = $conn->query(
        "SELECT * FROM vw_reservaciones_detalle
         ORDER BY fecha_reserva DESC, hora_inicio DESC
         LIMIT 500"
    )->fetch_all(MYSQLI_ASSOC);
    jsonResponse(["success" => true, "reservaciones" => array_map("reservacionResponse", $rows)]);
}

// Horarios (solo Administrador; sp_bloque_horario también lo valida)
function accionBloque(mysqli $conn, string $accionSp): never {
    requireMethod("POST");
    $u = requireRole($conn, "Administrador");
    $data = readJsonBody();
    $params = ["id_actor" => (int)$u["id_usuario"]];

    if ($accionSp !== "CREAR") {
        $id = inputInt($data, "id_bloque");
        if ($id === null || $id <= 0) jsonError(400, "Horario no válido");
        $params["id_bloque"] = $id;
    }
    if ($accionSp === "CREAR" || $accionSp === "EDITAR") {
        $inicio = leerHora(inputStr($data, "hora_inicio"));
        $fin = leerHora(inputStr($data, "hora_fin"));
        if ($inicio === null || $fin === null) jsonError(400, "Escribe las horas en formato HH:MM");
        if ($fin <= $inicio) jsonError(400, "La hora de fin debe ser posterior a la de inicio");
        $params["hora_inicio"] = $inicio;
        $params["hora_fin"] = $fin;
    }

    spBloque($conn, $accionSp, $params);
    jsonResponse(["success" => true, "message" => "Horario actualizado"]);
}

// Según la acción pedida se llama a la función que corresponde
$accion = inputStr($_GET, "accion");

try {
    $conn = getConnection();
    switch ($accion) {
        case "aulas":             accionAulas($conn);
        case "bloques":           accionBloques($conn);
        case "disponibilidad":    accionDisponibilidad($conn);
        case "crear":             accionCrear($conn);
        case "mis_reservaciones": accionMisReservaciones($conn);
        case "cancelar":          accionCancelar($conn);
        case "historial":         accionHistorial($conn);
        case "bloque_crear":      accionBloque($conn, "CREAR");
        case "bloque_editar":     accionBloque($conn, "EDITAR");
        case "bloque_activar":    accionBloque($conn, "ACTIVAR");
        case "bloque_desactivar": accionBloque($conn, "DESACTIVAR");
        default:                  jsonError(404, "Acción no encontrada");
    }
} catch (mysqli_sql_exception $e) {
    dbError($e, DUPLICADOS_RESERVACION);
}
