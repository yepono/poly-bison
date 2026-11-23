<?php
// Datos del resumen del panel de administración (solo administrador): conteos de usuarios,
// los estudiantes más activos, las publicaciones con más interacción y la bitácora.
require __DIR__ . "/config.php";

const TOP_LIMITE      = 5;
const BITACORA_LIMITE = 100;

function accionResumen(mysqli $conn): never {
    requireMethod("GET");
    requireRole($conn, "Administrador");
    $r = $conn->query("SELECT * FROM vw_resumen_usuarios")->fetch_assoc() ?: [];
    $campos = ["total_estudiantes", "usuarios_activos", "pendientes", "rechazados", "baneados",
               "administradores", "publicaciones_activas", "reservaciones_activas"];
    $resumen = [];
    foreach ($campos as $campo) {
        $resumen[$campo] = (int)($r[$campo] ?? 0); // SUM() regresa NULL si no hay filas
    }
    jsonResponse(["success" => true, "resumen" => $resumen]);
}

function accionMasActivos(mysqli $conn): never {
    requireMethod("GET");
    requireRole($conn, "Administrador");
    $rows = $conn->query(
        "SELECT id_usuario, alias, nombre_completo, carrera, semestre,
                total_publicaciones, total_likes, total_comentarios, interaccion_total
         FROM vw_usuarios_mas_activos
         ORDER BY total_publicaciones DESC, interaccion_total DESC, alias
         LIMIT " . TOP_LIMITE
    )->fetch_all(MYSQLI_ASSOC);
    $usuarios = array_map(fn($r) => [
        "id_usuario"          => (int)$r["id_usuario"],
        "alias"               => $r["alias"],
        "nombre_completo"     => $r["nombre_completo"],
        "carrera"             => $r["carrera"],
        "semestre"            => $r["semestre"] !== null ? (int)$r["semestre"] : null,
        "total_publicaciones" => (int)$r["total_publicaciones"],
        "total_likes"         => (int)$r["total_likes"],
        "total_comentarios"   => (int)$r["total_comentarios"],
        "interaccion_total"   => (int)$r["interaccion_total"],
    ], $rows);
    jsonResponse(["success" => true, "usuarios" => $usuarios]);
}

function accionMayorInteraccion(mysqli $conn): never {
    requireMethod("GET");
    requireRole($conn, "Administrador");
    $rows = $conn->query(
        "SELECT id_publicacion, alias, titulo, etiqueta, fecha_creacion,
                total_likes, total_comentarios, interaccion_total
         FROM vw_publicaciones_mayor_interaccion
         ORDER BY interaccion_total DESC, fecha_creacion DESC
         LIMIT " . TOP_LIMITE
    )->fetch_all(MYSQLI_ASSOC);
    $publicaciones = array_map(fn($r) => [
        "id_publicacion"    => (int)$r["id_publicacion"],
        "alias"             => $r["alias"],
        "titulo"            => $r["titulo"],
        "etiqueta"          => $r["etiqueta"],
        "fecha_creacion"    => $r["fecha_creacion"],
        "total_likes"       => (int)$r["total_likes"],
        "total_comentarios" => (int)$r["total_comentarios"],
        "interaccion_total" => (int)$r["interaccion_total"],
    ], $rows);
    jsonResponse(["success" => true, "publicaciones" => $publicaciones]);
}

function accionBitacora(mysqli $conn): never {
    requireMethod("GET");
    requireRole($conn, "Administrador");
    $rows = $conn->query(
        "SELECT id_log, fecha, accion, tabla_afectada, id_registro_afectado, detalle, realizado_por
         FROM vw_bitacora
         ORDER BY fecha DESC, id_log DESC
         LIMIT " . BITACORA_LIMITE
    )->fetch_all(MYSQLI_ASSOC);
    $registros = array_map(fn($r) => [
        "id_log"               => (int)$r["id_log"],
        "fecha"                => $r["fecha"],
        "accion"               => $r["accion"],
        "tabla_afectada"       => $r["tabla_afectada"],
        "id_registro_afectado" => $r["id_registro_afectado"] !== null ? (int)$r["id_registro_afectado"] : null,
        "detalle"              => $r["detalle"],
        "realizado_por"        => $r["realizado_por"],
    ], $rows);
    jsonResponse(["success" => true, "registros" => $registros]);
}

$accion = inputStr($_GET, "accion");

try {
    $conn = getConnection();
    switch ($accion) {
        case "resumen":           accionResumen($conn);
        case "mas_activos":       accionMasActivos($conn);
        case "mayor_interaccion": accionMayorInteraccion($conn);
        case "bitacora":          accionBitacora($conn);
        default:                  jsonError(404, "Acción no encontrada");
    }
} catch (mysqli_sql_exception $e) {
    dbError($e);
}
