<?php
// ============================================================
// reacciones.php - Sección Reacciones (likes)
// Acción por parámetro: reacciones.php?accion=...
// Requiere sesión.
//
//   POST reaccionar (JSON)   id_publicacion; da o quita "Like"
//                            -> sp_reaccion ALTERNAR (usa fn_total_reacciones)
//                            Regresa { liked, total_likes }
// ============================================================
require __DIR__ . "/config.php";

function accionReaccionar(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $id = inputInt(readJsonBody(), "id_publicacion");
    if ($id === null || $id <= 0) jsonError(400, "Publicación no válida");

    $row = callProcedure($conn, "sp_reaccion", "sii", ["ALTERNAR", $id, (int)$u["id_usuario"]])[0] ?? null;

    jsonResponse([
        "success"     => true,
        "liked"       => (bool)($row["liked"] ?? false),
        "total_likes" => (int)($row["total_likes"] ?? 0),
    ]);
}

$accion = inputStr($_GET, "accion");

try {
    $conn = getConnection();
    switch ($accion) {
        case "reaccionar": accionReaccionar($conn);
        default:           jsonError(404, "Acción no encontrada");
    }
} catch (mysqli_sql_exception $e) {
    dbError($e);
}
