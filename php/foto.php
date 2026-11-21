<?php
require __DIR__ . "/config.php";

$id = (int)($_GET["id"] ?? 0);

$conn = getConnection();
$stmt = $conn->prepare("SELECT foto_blob, foto_mime FROM Usuario WHERE id_usuario = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$stmt->bind_result($blob, $mime);

if (!$stmt->fetch() || $blob === null) {
    http_response_code(404);
    exit;
}

header("Content-Type: " . $mime); 
header("Cache-Control: private, max-age=3600");
echo $blob;