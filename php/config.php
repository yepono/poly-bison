<?php
// ============================================================
// config.php - base de la API (no es un endpoint)
// - Carga credenciales desde config.local.php (fuera de git)
// - Manejo de errores sin filtrar información interna
// - CORS por entorno
// - Sesión, respuestas JSON y control de acceso (login / rol)
// ============================================================

// ---------- Configuración local ----------
function appConfig(): array {
    static $config = null;
    if ($config === null) {
        $file = __DIR__ . "/config.local.php";
        if (!is_file($file)) {
            error_log("PolyBison: falta php/config.local.php (copia config.example.php)");
            http_response_code(500);
            header("Content-Type: application/json; charset=utf-8");
            echo json_encode(["success" => false, "message" => "Error del servidor"]);
            exit;
        }
        $config = require $file;
    }
    return $config;
}

// ---------- Errores: nunca se muestran al cliente, solo se registran ----------
ini_set("display_errors", "0");
ini_set("log_errors", "1");
error_reporting(E_ALL);

// Warnings/notices -> excepción (respeta el operador @)
set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) return false;
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// Cualquier excepción no capturada -> 500 genérico
set_exception_handler(function (Throwable $e): void {
    error_log("PolyBison: " . $e);
    if (!headers_sent()) {
        http_response_code(500);
        header("Content-Type: application/json; charset=utf-8");
    }
    echo json_encode(["success" => false, "message" => "Error del servidor"]);
});

// Errores fatales -> 500 genérico
register_shutdown_function(function (): void {
    $err = error_get_last();
    if ($err && in_array($err["type"], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        error_log("PolyBison fatal: {$err['message']} en {$err['file']}:{$err['line']}");
        if (!headers_sent()) {
            http_response_code(500);
            header("Content-Type: application/json; charset=utf-8");
        }
        echo json_encode(["success" => false, "message" => "Error del servidor"]);
    }
});

// ---------- CORS por entorno ----------
function applyCors(): void {
    $origin  = $_SERVER["HTTP_ORIGIN"] ?? "";
    $allowed = appConfig()["cors_origins"] ?? [];

    if ($origin !== "" && in_array($origin, $allowed, true)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type");
    }
    header("Vary: Origin");

    if (($_SERVER["REQUEST_METHOD"] ?? "") === "OPTIONS") {
        http_response_code(204);
        exit;
    }
}

applyCors();
// Zona horaria (XAMPP trae Europe/Berlin; MySQL usa la del sistema)
date_default_timezone_set(appConfig()["timezone"] ?? "America/Monterrey");
header("Content-Type: application/json; charset=utf-8");
header("X-Content-Type-Options: nosniff");

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// ---------- Conexión ----------
function getConnection(): mysqli {
    $db = appConfig()["db"];
    $conn = new mysqli($db["host"], $db["user"], $db["pass"], $db["name"], (int)$db["port"]);
    $conn->set_charset("utf8mb4");
    return $conn;
}

// ---------- Sesión ----------
function startSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        $cfg = appConfig();
        session_set_cookie_params([
            "lifetime" => 0,        // se borra sesion cuando se cierra el nav
            "path"     => "/",
            "httponly" => true,
            "secure"   => (bool)($cfg["cookie_secure"] ?? false),
            "samesite" => $cfg["cookie_samesite"] ?? "Lax",
        ]);
        session_start();
    }
}

// ---------- Respuestas JSON ----------
function jsonResponse(array $data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Error controlado: mensaje para el usuario, sin detalles internos
function jsonError(int $code, string $message, ?string $field = null): never {
    $body = ["success" => false, "message" => $message];
    if ($field !== null) $body["field"] = $field;
    jsonResponse($body, $code);
}

function requireMethod(string ...$methods): void {
    if (!in_array($_SERVER["REQUEST_METHOD"] ?? "", $methods, true)) {
        jsonError(405, "Método no permitido");
    }
}

// Cuerpo JSON de la petición (o [] si no es JSON válido)
function readJsonBody(): array {
    $data = json_decode(file_get_contents("php://input"), true);
    return is_array($data) ? $data : [];
}

// ---------- Lectura segura de entradas ($_GET, $_POST o JSON) ----------
// Texto recortado; "" si no existe o no es un valor simple (p. ej. un arreglo)
function inputStr(array $src, string $key): string {
    $v = $src[$key] ?? "";
    return is_scalar($v) ? trim((string)$v) : "";
}

// Texto sin recortar (contraseñas)
function inputRaw(array $src, string $key): string {
    $v = $src[$key] ?? "";
    return is_scalar($v) ? (string)$v : "";
}

// Entero; null si no existe o no es un entero válido
function inputInt(array $src, string $key): ?int {
    $v = $src[$key] ?? null;
    if (is_int($v)) return $v;
    if (is_string($v) && preg_match('/^-?\d{1,9}$/', trim($v))) return (int)trim($v);
    return null;
}

// ---------- Imágenes subidas (avatar, publicaciones, productos) ----------
const IMAGEN_MAX_BYTES = 2 * 1024 * 1024;          // 2 MB
const IMAGEN_MIMES     = ["image/jpeg", "image/png", "image/webp"];

// Valida $_FILES[$campo]. Regresa null si no se envió archivo, o
// ["blob", "mime", "nombre", "tamanio"]. Si es inválido responde 400.
function validarImagen(string $campo): ?array {
    $f = $_FILES[$campo] ?? null;
    if (!is_array($f) || ($f["error"] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if (is_array($f["error"])) {
        jsonError(400, "Solo se permite una imagen", $campo);
    }
    if ($f["error"] === UPLOAD_ERR_INI_SIZE || $f["error"] === UPLOAD_ERR_FORM_SIZE) {
        jsonError(400, "La imagen no puede pesar más de 2 MB", $campo);
    }
    if ($f["error"] !== UPLOAD_ERR_OK || !is_uploaded_file($f["tmp_name"])) {
        jsonError(400, "No se pudo subir la imagen", $campo);
    }
    if ($f["size"] > IMAGEN_MAX_BYTES) {
        jsonError(400, "La imagen no puede pesar más de 2 MB", $campo);
    }
    // Tipo real por contenido (no por extensión ni por lo que diga el navegador)
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f["tmp_name"]);
    if (!in_array($mime, IMAGEN_MIMES, true)) {
        jsonError(400, "La imagen debe ser JPG, PNG o WebP", $campo);
    }
    if (@getimagesize($f["tmp_name"]) === false) {
        jsonError(400, "El archivo no es una imagen válida", $campo);
    }
    return [
        "blob"    => file_get_contents($f["tmp_name"]),
        "mime"    => $mime,
        "nombre"  => mb_substr(basename((string)$f["name"]), 0, 200),
        "tamanio" => (int)$f["size"],
    ];
}

// Envía un BLOB de imagen como respuesta (reemplaza el Content-Type JSON)
function sendImage(string $blob, string $mime): never {
    if (!in_array($mime, IMAGEN_MIMES, true)) {
        $mime = "application/octet-stream";
    }
    header("Content-Type: " . $mime);
    header("Content-Length: " . strlen($blob));
    header("Cache-Control: private, max-age=3600");
    echo $blob;
    exit;
}

// ---------- Rutinas (stored procedures) ----------
// Llama a una rutina con parámetros preparados y regresa las filas del
// primer resultado. Tipos como en bind_param: i, s, d, b (b = BLOB, se
// envía por partes con send_long_data; null = NULL).
function callProcedure(mysqli $conn, string $name, string $types, array $params): array {
    $params = array_values($params);
    $placeholders = implode(", ", array_fill(0, count($params), "?"));
    $stmt = $conn->prepare("CALL {$name}({$placeholders})");

    $bind = [];
    $blobs = [];
    foreach ($params as $i => $value) {
        if ($types[$i] === "b") {
            $blobs[$i] = $value;
            $bind[$i] = null;
        } else {
            $bind[$i] = $value;
        }
    }
    if ($params) {
        $stmt->bind_param($types, ...$bind);
    }
    foreach ($blobs as $i => $data) {
        if ($data !== null && $data !== "") {
            foreach (str_split($data, 1024 * 1024) as $chunk) {
                $stmt->send_long_data($i, $chunk);
            }
        }
    }

    $stmt->execute();
    $rows = [];
    $result = $stmt->get_result();
    if ($result) {
        $rows = $result->fetch_all(MYSQLI_ASSOC);
        $result->free();
    }
    // Un CALL regresa resultados extra; se consumen para liberar la conexión
    while ($stmt->more_results() && $stmt->next_result()) {
        $extra = $stmt->get_result();
        if ($extra) $extra->free();
    }
    $stmt->close();
    return $rows;
}

// Traduce errores de MySQL a respuestas controladas:
//  - SIGNAL '45000' con MESSAGE_TEXT 'código|mensaje' (rutinas y triggers)
//  - 1062 duplicado -> 409 con el mensaje de $duplicados[nombre_de_llave]
// Cualquier otro error se relanza (el manejador global responde 500 genérico).
function dbError(mysqli_sql_exception $e, array $duplicados = []): never {
    $code = $e->getCode();
    if ($code === 1644 && preg_match('/^([1-5]\d\d)\|(.+)$/s', $e->getMessage(), $m)) {
        jsonError((int)$m[1], $m[2]);
    }
    if ($code === 1062) {
        preg_match("/for key '(?:[^.']+\.)?([^']+)'/", $e->getMessage(), $m);
        $key = $m[1] ?? "";
        if (isset($duplicados[$key])) jsonError(409, $duplicados[$key], $key);
        jsonError(409, "Ya existe un registro con esos datos");
    }
    throw $e;
}

// ---------- Usuario ----------
// Datos públicos del usuario (vw_usuario_publico: sin contraseña, correo ni BLOB)
function getUserById(mysqli $conn, int $id): ?array {
    $stmt = $conn->prepare("SELECT * FROM vw_usuario_publico WHERE id_usuario = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

// ---------- Control de acceso (siempre en el servidor) ----------
// Exige sesión válida. El usuario y su rol se leen de la BD en cada petición,
// así un baneo o cambio de rol aplica de inmediato.
// Si la cuenta tiene clave temporal (debe_cambiar_contrasena) responde 403,
// salvo en las acciones que lo permiten explícitamente ($permitirClaveTemporal):
// me y cambiar_contrasena.
function requireLogin(mysqli $conn, bool $permitirClaveTemporal = false): array {
    startSession();
    $id = (int)($_SESSION["id_usuario"] ?? 0);
    if ($id <= 0) {
        jsonError(401, "No has iniciado sesión");
    }

    $user = getUserById($conn, $id);
    if (!$user || $user["estado"] !== "Aprobado") {
        $_SESSION = [];
        session_destroy();
        jsonError(401, "Sesión no válida");
    }
    if (!$permitirClaveTemporal && !empty($user["debe_cambiar_contrasena"])) {
        jsonError(403, "Debes cambiar tu contraseña temporal antes de continuar", "clave_temporal");
    }
    return $user;
}

// Exige sesión y que el rol esté en la lista. Ej: requireRole($conn, "Administrador", "Moderador")
function requireRole(mysqli $conn, string ...$roles): array {
    $user = requireLogin($conn);
    if (!in_array($user["rol"], $roles, true)) {
        jsonError(403, "No tienes permiso para realizar esta acción");
    }
    return $user;
}
