<?php
require __DIR__ . "/config.php";

function fail(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $message]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") fail(405, "Método no permitido");

$data   = json_decode(file_get_contents("php://input"), true) ?? [];
$correo = strtolower(trim($data["correo"] ?? ""));
$pass   = $data["contrasenia"] ?? "";

if ($correo === "" || $pass === "") fail(400, "Ingresa tu correo y contraseña");

try {
    $conn = getConnection();

    $stmt = $conn->prepare("SELECT id_usuario, contrasena, estado, motivo FROM Usuario WHERE correo = ?");
    $stmt->bind_param("s", $correo);
    $stmt->execute();
    $u = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Same message for "no such email" and "wrong password"
    if (!$u || !password_verify($pass, $u["contrasena"])) {
        fail(401, "Correo o contraseña incorrectos");
    }

    switch ($u["estado"]) {
        case "Pendiente":
            fail(403, "Tu cuenta aún está pendiente de aprobación");
        case "Rechazado":
            fail(403, "Tu solicitud fue rechazada" . ($u["motivo"] ? ": " . $u["motivo"] : ""));
        case "Baneado":
            fail(403, "Tu cuenta fue suspendida" . ($u["motivo"] ? ": " . $u["motivo"] : ""));
    }

    // Approved: start the session
    startSession();
    session_regenerate_id(true); // prevents session fixation
    $_SESSION["id_usuario"] = (int)$u["id_usuario"];

    $user = getUserById($conn, (int)$u["id_usuario"]);
    $conn->close();

    echo json_encode(["success" => true, "user" => $user]);

} catch (mysqli_sql_exception $e) {
    error_log($e->getMessage());
    fail(500, "Error del servidor");
}