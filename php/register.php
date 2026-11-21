<?php
require __DIR__ . "/config.php";

function fail(int $code, string $message, ?string $field = null): void
{
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $message, "field" => $field]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    fail(405, "Método no permitido");
}

$nombre    = trim($_POST["nombre"] ?? "");
$alias     = trim($_POST["alias"] ?? "");
$matricula = trim($_POST["matricula"] ?? "");
$correo    = strtolower(trim($_POST["correo"] ?? ""));
$pass      = $_POST["contrasenia"] ?? "";
$carrera   = trim($_POST["carrera"] ?? "");
$semestre  = (int)($_POST["semestre"] ?? 0);

if ($nombre === "" || $alias === "" || $matricula === "" || $correo === "" || $pass === "" || $carrera === "") {
    fail(400, "Faltan campos obligatorios");
}
if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || mb_strlen($correo) > 150) {
    fail(400, "Correo no válido", "correo");
}
if (mb_strlen($matricula) > 10) fail(400, "La matrícula no puede tener más de 10 caracteres", "matricula");
if (mb_strlen($alias) > 50)     fail(400, "El alias no puede tener más de 50 caracteres", "alias");
if (mb_strlen($nombre) > 250)   fail(400, "El nombre es demasiado largo", "nombre");
if (mb_strlen($pass) < 8)       fail(400, "La contraseña debe tener al menos 8 caracteres", "contrasenia");
if ($semestre < 1 || $semestre > 12) fail(400, "Semestre no válido");
$fotoBlob = null;
$fotoMime = null;

if (isset($_FILES["foto"]) && $_FILES["foto"]["error"] !== UPLOAD_ERR_NO_FILE) {
    $f = $_FILES["foto"];

    if ($f["error"] !== UPLOAD_ERR_OK) {
        fail(400, "No se pudo subir la foto", "foto");
    }
    if ($f["size"] > 2 * 1024 * 1024) {
        fail(400, "La foto no puede pesar más de 2 MB", "foto");
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f["tmp_name"]);
    if (!in_array($mime, ["image/jpeg", "image/png", "image/webp"], true)) {
        fail(400, "La foto debe ser JPG, PNG o WebP", "foto");
    }

    $fotoBlob = file_get_contents($f["tmp_name"]);
    $fotoMime = $mime;
}

try {
    $conn = getConnection();

    // Career name -> id_carrera
    $stmt = $conn->prepare("SELECT id_carrera FROM Carreras WHERE nombre = ? AND activo = 1");
    $stmt->bind_param("s", $carrera);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) fail(400, "Carrera no válida", "carrera");
    $idCarrera = (int)$row["id_carrera"];

    $hash = password_hash($pass, PASSWORD_DEFAULT);

    // rol estudiante = estado pendiente default
    $stmt = $conn->prepare(
        "INSERT INTO Usuario
        (id_rol, matricula, nombre_completo, alias, correo, contrasena, id_carrera, semestre, foto_blob, foto_mime)
     VALUES
        ((SELECT id_rol FROM Rol WHERE nombre = 'Estudiante'), ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $null = null; 
    $stmt->bind_param("sssssiibs", $matricula, $nombre, $alias, $correo, $hash, $idCarrera, $semestre, $null, $fotoMime);

    if ($fotoBlob !== null) {
        $stmt->send_long_data(7, $fotoBlob); 
    }

    $stmt->execute();

    echo json_encode([
        "success"    => true,
        "message"    => "Registro exitoso. Tu cuenta está pendiente de aprobación.",
        "id_usuario" => $stmt->insert_id,
    ]);
    $stmt->close();
    $conn->close();
} catch (mysqli_sql_exception $e) {
    // revisar errores en parametros UNIQUE
    if ($e->getCode() === 1062) {
        preg_match("/for key '(?:[^.']+\.)?([^']+)'/", $e->getMessage(), $m);
        $key = $m[1] ?? "";
        $messages = [
            "matricula" => "Esa matrícula ya está registrada",
            "alias"     => "Ese alias ya está en uso",
            "correo"    => "Ese correo ya está registrado",
        ];
        if (isset($messages[$key])) fail(409, $messages[$key], $key);
        fail(409, "Ya existe un usuario con esos datos");
    }
    error_log($e->getMessage());
    fail(500, "Error del servidor");
}
