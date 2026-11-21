<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

function getConnection(): mysqli {
    $conn = new mysqli("127.0.0.1", "Bison", "MySQLsuck5455", "poly_bison", 3306);
    $conn->set_charset("utf8mb4");
    return $conn;
}

function startSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            "lifetime" => 0,        // se borra sesion cuando se cierra el nav
            "path"     => "/",
            "httponly" => true,     
            "samesite" => "Lax",
        ]);
        session_start();
    }
}

// regresa la info del usuario sin exponer contraseña
function getUserById(mysqli $conn, int $id): ?array {
    $stmt = $conn->prepare(
        "SELECT u.id_usuario, u.nombre_completo, u.alias, u.correo, u.semestre,
                u.fecha_registro, u.estado,
                (u.foto_blob IS NOT NULL) AS tiene_foto,
                r.nombre AS rol, c.nombre AS carrera
         FROM Usuario u
         JOIN Rol r ON r.id_rol = u.id_rol
         LEFT JOIN Carreras c ON c.id_carrera = u.id_carrera
         WHERE u.id_usuario = ?"
    );
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}