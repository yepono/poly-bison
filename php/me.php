<?php
require __DIR__ . "/config.php";
startSession();

// me.php obtiene la info del usuario logeado para mantener la sesion activa

if (empty($_SESSION["id_usuario"])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "No has iniciado sesión"]);
    exit;
}

$conn = getConnection();
$user = getUserById($conn, (int)$_SESSION["id_usuario"]);
$conn->close();

// si se banea la cuenta o se elimina se cierra la sesion 
if (!$user || $user["estado"] !== "Aprobado") {
    session_destroy();
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Sesión no válida"]);
    exit;
}

echo json_encode(["success" => true, "user" => $user]);