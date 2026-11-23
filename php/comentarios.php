<?php
// ============================================================
// comentarios.php - Sección Comentarios
// Acción por parámetro: comentarios.php?accion=...
// Todas requieren sesión.
//
//   GET  listar&id_publicacion=    comentarios activos (vw_comentarios_activos)
//   POST crear    (JSON)           id_publicacion, contenido (máx. 500)
//                                  -> sp_comentario CREAR
//   POST eliminar (JSON)           id_comentario; el autor o Administrador/Moderador
//                                  -> sp_comentario ELIMINAR
// ============================================================
require __DIR__ . "/config.php";

const COMENTARIO_MAX = 500;

function spComentario(mysqli $conn, string $accion, array $p): array {
    return callProcedure($conn, "sp_comentario", "siiis", [
        $accion,
        $p["id_comentario"]  ?? null,
        $p["id_publicacion"] ?? null,
        $p["id_actor"]       ?? null,
        $p["contenido"]      ?? null,
    ]);
}

function comentarioResponse(array $r): array {
    return [
        "id_comentario"    => (int)$r["id_comentario"],
        "id_publicacion"   => (int)$r["id_publicacion"],
        "id_usuario"       => (int)$r["id_usuario"],
        "alias"            => $r["alias"],
        "autor_tiene_foto" => (bool)$r["autor_tiene_foto"],
        "contenido"        => $r["contenido"],
        "fecha_creacion"   => $r["fecha_creacion"],
    ];
}

function publicacionActiva(mysqli $conn, int $id): bool {
    $stmt = $conn->prepare("SELECT 1 FROM Publicacion WHERE id_publicacion = ? AND estado = 'Activa'");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $existe = (bool)$stmt->get_result()->fetch_row();
    $stmt->close();
    return $existe;
}

function accionListar(mysqli $conn): never {
    requireMethod("GET");
    requireLogin($conn);
    $id = inputInt($_GET, "id_publicacion");
    if ($id === null || $id <= 0) jsonError(400, "Publicación no válida");
    if (!publicacionActiva($conn, $id)) jsonError(404, "Publicación no encontrada");

    $stmt = $conn->prepare(
        "SELECT * FROM vw_comentarios_activos
         WHERE id_publicacion = ?
         ORDER BY fecha_creacion ASC, id_comentario ASC"
    );
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jsonResponse(["success" => true, "comentarios" => array_map("comentarioResponse", $rows)]);
}

function accionCrear(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $data = readJsonBody();
    $idPublicacion = inputInt($data, "id_publicacion");
    $contenido = inputStr($data, "contenido");

    if ($idPublicacion === null || $idPublicacion <= 0) jsonError(400, "Publicación no válida");
    if ($contenido === "") jsonError(400, "El comentario no puede estar vacío", "contenido");
    if (mb_strlen($contenido) > COMENTARIO_MAX) {
        jsonError(400, "El comentario no puede tener más de " . COMENTARIO_MAX . " caracteres", "contenido");
    }

    $rows = spComentario($conn, "CREAR", [
        "id_publicacion" => $idPublicacion,
        "id_actor"       => (int)$u["id_usuario"],
        "contenido"      => $contenido,
    ]);
    $id = (int)($rows[0]["id_comentario"] ?? 0);

    $stmt = $conn->prepare("SELECT * FROM vw_comentarios_activos WHERE id_comentario = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    jsonResponse(["success" => true, "comentario" => comentarioResponse($row)], 201);
}

function accionEliminar(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $id = inputInt(readJsonBody(), "id_comentario");
    if ($id === null || $id <= 0) jsonError(400, "Comentario no válido");

    // ELIMINAR valida: existe (404), autor o Administrador/Moderador (403)
    spComentario($conn, "ELIMINAR", ["id_comentario" => $id, "id_actor" => (int)$u["id_usuario"]]);
    jsonResponse(["success" => true, "message" => "Comentario eliminado"]);
}

$accion = inputStr($_GET, "accion");

try {
    $conn = getConnection();
    switch ($accion) {
        case "listar":   accionListar($conn);
        case "crear":    accionCrear($conn);
        case "eliminar": accionEliminar($conn);
        default:         jsonError(404, "Acción no encontrada");
    }
} catch (mysqli_sql_exception $e) {
    dbError($e);
}
