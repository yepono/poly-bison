<?php
// ============================================================
// eventos.php - Sección Eventos (calendario)
// Acción por parámetro: eventos.php?accion=...
// Todas requieren sesión.
//
//   GET  listar&mes=AAAA-MM          eventos visibles del mes (vw_eventos_visibles)
// Administrador / Moderador (D15):
//   GET  admin_listar                visibles + ocultos (vw_eventos_visibles
//                                    UNION vw_eventos_ocultos)
//   POST crear    (JSON)             titulo, tipo, fecha_inicio, fecha_fin, lugar, descripcion
//   POST editar   (JSON)             id_evento + campos a cambiar
//   POST ocultar | mostrar | eliminar (JSON)  id_evento
//                                    -> sp_evento
// ============================================================
require __DIR__ . "/config.php";

const ROLES_STAFF   = ["Administrador", "Moderador"];
const TIPOS_EVENTO  = ["Académico", "Examen", "Asueto", "Cultural", "Deportivo"];
const TITULO_MAX    = 200;
const LUGAR_MAX     = 150;
const DESC_MAX      = 1000;

function spEvento(mysqli $conn, string $accion, array $p): array {
    return callProcedure($conn, "sp_evento", "siissssss", [
        $accion,
        $p["id_evento"]   ?? null,
        $p["id_actor"]    ?? null,
        $p["titulo"]      ?? null,
        $p["descripcion"] ?? null,
        $p["tipo"]        ?? null,
        $p["inicio"]      ?? null,
        $p["fin"]         ?? null,
        $p["lugar"]       ?? null,
    ]);
}

// "AAAA-MM-DDTHH:MM" (datetime-local) -> "AAAA-MM-DD HH:MM:00", o null si no es válida
function leerFechaHora(string $valor): ?string {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/', $valor, $m)) return null;
    if (!checkdate((int)$m[2], (int)$m[3], (int)$m[1]) || (int)$m[4] > 23 || (int)$m[5] > 59) return null;
    return "{$m[1]}-{$m[2]}-{$m[3]} {$m[4]}:{$m[5]}:00";
}

function eventoResponse(array $r, ?bool $visible = null): array {
    $out = [
        "id_evento"         => (int)$r["id_evento"],
        "titulo"            => $r["titulo"],
        "descripcion"       => $r["descripcion"],
        "tipo"              => $r["tipo"],
        "fecha_inicio"      => $r["fecha_inicio"],
        "fecha_fin"         => $r["fecha_fin"],
        "lugar"             => $r["lugar"],
        "fecha_publicacion" => $r["fecha_publicacion"],
        "creador"           => $r["creador"],
    ];
    if ($visible !== null) $out["visible"] = $visible;
    return $out;
}

// Valida los campos de un evento. $parcial = true (editar) permite omitirlos.
function leerCamposEvento(array $data, bool $parcial): array {
    $c = [];
    if (!$parcial || array_key_exists("titulo", $data)) {
        $titulo = inputStr($data, "titulo");
        if ($titulo === "") jsonError(400, "El título es obligatorio", "titulo");
        if (mb_strlen($titulo) > TITULO_MAX) jsonError(400, "El título no puede tener más de " . TITULO_MAX . " caracteres", "titulo");
        $c["titulo"] = $titulo;
    }
    if (!$parcial || array_key_exists("tipo", $data)) {
        $tipo = inputStr($data, "tipo");
        if (!in_array($tipo, TIPOS_EVENTO, true)) jsonError(400, "Tipo de evento no válido", "tipo");
        $c["tipo"] = $tipo;
    }
    foreach (["fecha_inicio" => "inicio", "fecha_fin" => "fin"] as $campo => $clave) {
        if ($parcial && !array_key_exists($campo, $data)) continue;
        $valor = leerFechaHora(inputStr($data, $campo));
        if ($valor === null) jsonError(400, "Fecha y hora no válidas", $campo);
        $c[$clave] = $valor;
    }
    if (isset($c["inicio"], $c["fin"]) && $c["fin"] < $c["inicio"]) {
        jsonError(400, "La fecha de fin debe ser posterior a la de inicio", "fecha_fin");
    }
    if (!$parcial || array_key_exists("lugar", $data)) {
        $lugar = inputStr($data, "lugar");
        if (mb_strlen($lugar) > LUGAR_MAX) jsonError(400, "El lugar no puede tener más de " . LUGAR_MAX . " caracteres", "lugar");
        $c["lugar"] = $lugar;
    }
    if (!$parcial || array_key_exists("descripcion", $data)) {
        $descripcion = inputStr($data, "descripcion");
        if (mb_strlen($descripcion) > DESC_MAX) jsonError(400, "La descripción no puede tener más de " . DESC_MAX . " caracteres", "descripcion");
        $c["descripcion"] = $descripcion;
    }
    return $c;
}

function leerIdEvento(array $data): int {
    $id = inputInt($data, "id_evento");
    if ($id === null || $id <= 0) jsonError(400, "Evento no válido");
    return $id;
}

// ---------- Acciones ----------

function accionListar(mysqli $conn): never {
    requireMethod("GET");
    requireLogin($conn);
    $mes = inputStr($_GET, "mes");
    if ($mes === "") $mes = date("Y-m");
    if (!preg_match('/^(\d{4})-(\d{2})$/', $mes, $m) || (int)$m[2] < 1 || (int)$m[2] > 12) {
        jsonError(400, "Mes no válido");
    }
    $inicio = "{$mes}-01 00:00:00";
    $fin = date("Y-m-d 00:00:00", strtotime("{$mes}-01 +1 month"));

    // Eventos que se cruzan con el mes
    $stmt = $conn->prepare(
        "SELECT * FROM vw_eventos_visibles
         WHERE fecha_inicio < ? AND fecha_fin >= ?
         ORDER BY fecha_inicio"
    );
    $stmt->bind_param("ss", $fin, $inicio);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    jsonResponse(["success" => true, "eventos" => array_map(fn($r) => eventoResponse($r), $rows)]);
}

function accionAdminListar(mysqli $conn): never {
    requireMethod("GET");
    requireRole($conn, ...ROLES_STAFF);
    $rows = $conn->query(
        "SELECT v.*, 1 AS visible FROM vw_eventos_visibles v
         UNION ALL
         SELECT o.*, 0 AS visible FROM vw_eventos_ocultos o
         ORDER BY fecha_inicio DESC"
    )->fetch_all(MYSQLI_ASSOC);
    jsonResponse(["success" => true, "eventos" => array_map(fn($r) => eventoResponse($r, (bool)$r["visible"]), $rows)]);
}

function accionCrear(mysqli $conn): never {
    requireMethod("POST");
    $u = requireRole($conn, ...ROLES_STAFF);
    $campos = leerCamposEvento(readJsonBody(), false);
    $rows = spEvento($conn, "CREAR", ["id_actor" => (int)$u["id_usuario"]] + $campos);
    jsonResponse(["success" => true, "id_evento" => (int)($rows[0]["id_evento"] ?? 0)], 201);
}

function accionEditar(mysqli $conn): never {
    requireMethod("POST");
    $u = requireRole($conn, ...ROLES_STAFF);
    $data = readJsonBody();
    $id = leerIdEvento($data);
    $campos = leerCamposEvento($data, true);
    if (!$campos) jsonError(400, "No hay cambios para guardar");
    // sp_evento valida fin >= inicio con los valores combinados (nuevos + actuales)
    spEvento($conn, "EDITAR", ["id_evento" => $id, "id_actor" => (int)$u["id_usuario"]] + $campos);
    jsonResponse(["success" => true, "message" => "Evento actualizado"]);
}

function accionSimple(mysqli $conn, string $accionSp, string $mensaje): never {
    requireMethod("POST");
    $u = requireRole($conn, ...ROLES_STAFF);
    $id = leerIdEvento(readJsonBody());
    spEvento($conn, $accionSp, ["id_evento" => $id, "id_actor" => (int)$u["id_usuario"]]);
    jsonResponse(["success" => true, "message" => $mensaje]);
}

$accion = inputStr($_GET, "accion");

try {
    $conn = getConnection();
    switch ($accion) {
        case "listar":       accionListar($conn);
        case "admin_listar": accionAdminListar($conn);
        case "crear":        accionCrear($conn);
        case "editar":       accionEditar($conn);
        case "ocultar":      accionSimple($conn, "OCULTAR", "Evento oculto");
        case "mostrar":      accionSimple($conn, "MOSTRAR", "Evento visible");
        case "eliminar":     accionSimple($conn, "ELIMINAR", "Evento eliminado");
        default:             jsonError(404, "Acción no encontrada");
    }
} catch (mysqli_sql_exception $e) {
    dbError($e);
}
