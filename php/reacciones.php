<?php
// Da o quita el "me gusta" de una publicación y regresa si quedó marcado y el total.
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
