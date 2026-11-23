<?php
// Muestra la imagen de una publicación activa. Los videos no pasan por aquí porque son enlaces
// de YouTube; las imágenes se suben y se reemplazan desde publicaciones.php.
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
