<?php
// ============================================================
// multimedia.php - Sección Multimedia
// Acción por parámetro: multimedia.php?accion=...
// Requiere sesión.
//
//   GET ver&id=   imagen (BLOB) de una publicación ACTIVA
//                 (los videos son enlaces de YouTube: van en video_url)
// La subida y el reemplazo se hacen en publicaciones.php (crear/editar)
// mediante sp_multimedia.
// ============================================================
require __DIR__ . "/config.php";

function accionVer(mysqli $conn): never {
    requireMethod("GET");
    requireLogin($conn);
    $id = inputInt($_GET, "id");
    if ($id === null || $id <= 0) jsonError(400, "Archivo no válido");

    $stmt = $conn->prepare(
        "SELECT m.mult_blob, m.mult_mime
         FROM Multimedia m
         JOIN Publicacion p ON p.id_publicacion = m.id_publicacion
         WHERE m.id_multimedia = ? AND m.tipo = 'Imagen' AND p.estado = 'Activa'"
    );
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || $row["mult_blob"] === null) jsonError(404, "Archivo no encontrado");
    sendImage($row["mult_blob"], (string)$row["mult_mime"]);
}

$accion = inputStr($_GET, "accion");

try {
    $conn = getConnection();
    switch ($accion) {
        case "ver": accionVer($conn);
        default:    jsonError(404, "Acción no encontrada");
    }
} catch (mysqli_sql_exception $e) {
    dbError($e);
}
