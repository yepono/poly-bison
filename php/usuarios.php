<?php
// ============================================================
// usuarios.php - Sección Usuarios y autenticación
// Acción por parámetro: usuarios.php?accion=...
//
// Públicas:
//   POST registro            (multipart) alta de estudiante -> sp_usuario REGISTRAR
//   POST login               (JSON)      inicia sesión      -> sp_usuario DATOS_LOGIN
//                                        (acepta la clave temporal vigente -> USAR_TEMPORAL)
//   POST recuperar_contrasena (JSON)     envía una clave temporal por correo con la
//                                        API de Brevo -> SOLICITAR_RECUPERACION (R12)
//   GET  carreras                        catálogo para el registro
// Con sesión:
//   POST logout
//   GET  me                              usuario de la sesión (vw_usuario_publico + correo)
//   (Con clave temporal solo se permiten me, logout y cambiar_contrasena; el
//    resto responde 403 desde requireLogin.)
//   GET  perfil&id=                      perfil público      (vw_usuario_publico)
//   GET  foto&id=                        avatar (BLOB)
//   POST actualizar_perfil   (JSON)      correo, carrera, semestre -> ACTUALIZAR_PERFIL
//   POST cambiar_contrasena  (JSON)      pide la actual           -> CAMBIAR_CONTRASENA
//   POST actualizar_foto     (multipart)                          -> ACTUALIZAR_FOTO
//   POST eliminar_cuenta                 borrado lógico           -> ELIMINAR
//                                        (dispara trg_usuario_estado_au -> bitácora)
// Administrador / Moderador:
//   GET  listar                          usuarios con conteos (vw_usuarios_admin)
//   POST cambiar_estado      (JSON)      aprobar/rechazar/banear  -> CAMBIAR_ESTADO
//                                        (dispara trg_usuario_estado_au -> Event_Log,
//                                         que se consulta en reportes.php con vw_bitacora)
// Solo Administrador:
//   POST crear_moderador     (JSON)      clave temporal ENVIADA POR CORREO (Brevo);
//                                        el administrador no la ve -> CREAR_MODERADOR
// ============================================================
require __DIR__ . "/config.php";
require __DIR__ . "/correo.php"; // API externa de correo (Brevo, R12)

const ROLES_STAFF      = ["Administrador", "Moderador"];
const ESTADOS_GESTION   = ["Pendiente", "Aprobado", "Rechazado", "Baneado"];
const CORREO_UANL_REGEX = '/^[a-z0-9._%+\-]+@uanl\.edu\.mx$/';
const DUPLICADOS_USUARIO = [
    "matricula" => "Esa matrícula ya está registrada",
    "alias"     => "Ese alias ya está en uso",
    "correo"    => "Ese correo ya está registrado",
];

// ---------- Helpers de la sección ----------

// Llama a sp_usuario con los parámetros por nombre (los que falten van NULL)
function spUsuario(mysqli $conn, string $accion, array $p = []): array {
    return callProcedure($conn, "sp_usuario", "siisssssiibsss", [
        $accion,
        $p["id_usuario"] ?? null,
        $p["id_actor"]   ?? null,
        $p["matricula"]  ?? null,
        $p["nombre"]     ?? null,
        $p["alias"]      ?? null,
        $p["correo"]     ?? null,
        $p["contrasena"] ?? null,
        $p["id_carrera"] ?? null,
        $p["semestre"]   ?? null,
        $p["foto"]       ?? null,
        $p["foto_mime"]  ?? null,
        $p["estado"]     ?? null,
        $p["motivo"]     ?? null,
    ]);
}

// Respuesta pública del usuario: nunca contraseña ni BLOB.
// correo y debe_cambiar_contrasena solo se agregan cuando la respuesta es
// para el propio usuario ($correo !== null).
function userResponse(array $u, ?string $correo = null): array {
    $out = [
        "id_usuario"      => (int)$u["id_usuario"],
        "alias"           => $u["alias"],
        "nombre_completo" => $u["nombre_completo"],
        "rol"             => $u["rol"],
        "carrera"         => $u["carrera"],
        "semestre"        => $u["semestre"] !== null ? (int)$u["semestre"] : null,
        "fecha_registro"  => $u["fecha_registro"],
        "estado"          => $u["estado"],
        "tiene_foto"      => (bool)$u["tiene_foto"],
    ];
    if ($correo !== null) {
        $out["correo"] = $correo;
        $out["debe_cambiar_contrasena"] = (bool)($u["debe_cambiar_contrasena"] ?? false);
    }
    return $out;
}

function getCorreo(mysqli $conn, int $id): string {
    $stmt = $conn->prepare("SELECT correo FROM Usuario WHERE id_usuario = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row["correo"] ?? "";
}

function validarCorreoUanl(string $correo, string $campo = "correo"): void {
    if (mb_strlen($correo) > 150 || !preg_match(CORREO_UANL_REGEX, $correo)) {
        jsonError(400, "Usa tu correo institucional @uanl.edu.mx", $campo);
    }
}

function validarContrasena(string $pass, string $campo): void {
    if (mb_strlen($pass) < 8) {
        jsonError(400, "La contraseña debe tener al menos 8 caracteres", $campo);
    }
    if (strlen($pass) > 72) {
        jsonError(400, "La contraseña no puede tener más de 72 caracteres", $campo);
    }
}

// Un usuario solo es visible si está aprobado, salvo para staff o para sí mismo
function puedeVerUsuario(array $viewer, ?array $u): bool {
    if (!$u || $u["estado"] === "Eliminado") return false;
    if ($u["estado"] === "Aprobado") return true;
    return in_array($viewer["rol"], ROLES_STAFF, true)
        || (int)$viewer["id_usuario"] === (int)$u["id_usuario"];
}

function cerrarSesion(): void {
    startSession();
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), "", [
        "expires"  => time() - 42000,
        "path"     => $p["path"],
        "domain"   => $p["domain"],
        "secure"   => $p["secure"],
        "httponly" => $p["httponly"],
        "samesite" => $p["samesite"],
    ]);
    session_destroy();
}

// Clave temporal legible (sin 0/O, 1/l/I)
function generarClaveTemporal(int $largo = 12): string {
    $alfabeto = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    $clave = "";
    for ($i = 0; $i < $largo; $i++) {
        $clave .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
    }
    return $clave;
}

// ---------- Acciones ----------

function accionRegistro(mysqli $conn): never {
    requireMethod("POST");
    $nombre    = inputStr($_POST, "nombre");
    $alias     = inputStr($_POST, "alias");
    $matricula = inputStr($_POST, "matricula");
    $correo    = strtolower(inputStr($_POST, "correo"));
    $pass      = inputRaw($_POST, "contrasenia");
    $idCarrera = inputInt($_POST, "id_carrera");
    $semestre  = inputInt($_POST, "semestre");

    if ($nombre === "" || $alias === "" || $matricula === "" || $correo === "" || $pass === "") {
        jsonError(400, "Faltan campos obligatorios");
    }
    if (mb_strlen($nombre) > 250) jsonError(400, "El nombre es demasiado largo", "nombre");
    if (mb_strlen($alias) > 50)   jsonError(400, "El alias no puede tener más de 50 caracteres", "alias");
    if (!preg_match('/^\d{7}$/', $matricula)) {
        jsonError(400, "La matrícula debe tener 7 dígitos", "matricula");
    }
    validarCorreoUanl($correo);
    validarContrasena($pass, "contrasenia");
    if ($idCarrera === null || $idCarrera <= 0) jsonError(400, "Selecciona tu carrera", "carrera");
    if ($semestre === null || $semestre < 1 || $semestre > 10) jsonError(400, "Semestre no válido", "semestre");

    $foto = validarImagen("foto");

    $rows = spUsuario($conn, "REGISTRAR", [
        "matricula"  => $matricula,
        "nombre"     => $nombre,
        "alias"      => $alias,
        "correo"     => $correo,
        "contrasena" => password_hash($pass, PASSWORD_DEFAULT),
        "id_carrera" => $idCarrera,
        "semestre"   => $semestre,
        "foto"       => $foto["blob"] ?? null,
        "foto_mime"  => $foto["mime"] ?? null,
    ]);

    jsonResponse([
        "success"    => true,
        "message"    => "Registro exitoso. Tu cuenta está pendiente de aprobación.",
        "id_usuario" => (int)($rows[0]["id_usuario"] ?? 0),
    ], 201);
}

function accionLogin(mysqli $conn): never {
    requireMethod("POST");
    $data   = readJsonBody();
    $correo = strtolower(inputStr($data, "correo"));
    $pass   = inputRaw($data, "contrasenia");

    if ($correo === "" || $pass === "") jsonError(400, "Ingresa tu correo y contraseña");
    validarCorreoUanl($correo); // todas las cuentas usan correo @uanl.edu.mx

    $u = spUsuario($conn, "DATOS_LOGIN", ["correo" => $correo])[0] ?? null;

    // Contraseña normal, o la temporal de recuperación si sigue vigente (Q2-A)
    $usaTemporal = false;
    $valida = $u && $u["estado"] !== "Eliminado" && password_verify($pass, $u["contrasena"]);
    if (!$valida && $u && $u["estado"] !== "Eliminado" && $u["temporal_vigente"]
        && $u["contrasena_temporal"] !== null && password_verify($pass, $u["contrasena_temporal"])) {
        $valida = true;
        $usaTemporal = true;
    }

    // Mismo mensaje para "no existe" y "contraseña incorrecta"
    if (!$valida) {
        jsonError(401, "Correo o contraseña incorrectos");
    }

    switch ($u["estado"]) {
        case "Pendiente":
            jsonError(403, "Tu cuenta aún está pendiente de aprobación");
        case "Rechazado":
            jsonError(403, "Tu solicitud fue rechazada" . ($u["motivo"] ? ": " . $u["motivo"] : ""));
        case "Baneado":
            jsonError(403, "Tu cuenta fue suspendida" . ($u["motivo"] ? ": " . $u["motivo"] : ""));
    }

    // La temporal pasa a ser la contraseña y se exige cambiarla (un solo uso)
    if ($usaTemporal) {
        spUsuario($conn, "USAR_TEMPORAL", ["id_usuario" => (int)$u["id_usuario"]]);
    }

    startSession();
    session_regenerate_id(true); // evita fijación de sesión
    $_SESSION["id_usuario"] = (int)$u["id_usuario"];

    $user = getUserById($conn, (int)$u["id_usuario"]);
    jsonResponse(["success" => true, "user" => userResponse($user, $correo)]);
}

function accionLogout(): never {
    requireMethod("POST");
    cerrarSesion();
    jsonResponse(["success" => true]);
}

function accionMe(mysqli $conn): never {
    requireMethod("GET");
    $u = requireLogin($conn, true); // permitido con clave temporal
    $id = (int)$u["id_usuario"];
    jsonResponse(["success" => true, "user" => userResponse($u, getCorreo($conn, $id))]);
}

function accionCarreras(mysqli $conn): never {
    requireMethod("GET");
    $rows = $conn->query("SELECT id_carrera, nombre FROM Carreras WHERE activo = 1 ORDER BY nombre")
                 ->fetch_all(MYSQLI_ASSOC);
    $carreras = array_map(fn($r) => ["id_carrera" => (int)$r["id_carrera"], "nombre" => $r["nombre"]], $rows);
    jsonResponse(["success" => true, "carreras" => $carreras]);
}

function accionPerfil(mysqli $conn): never {
    requireMethod("GET");
    $viewer = requireLogin($conn);
    $id = inputInt($_GET, "id");
    if ($id === null || $id <= 0) jsonError(400, "Usuario no válido");

    $u = getUserById($conn, $id);
    if (!puedeVerUsuario($viewer, $u)) jsonError(404, "Perfil no encontrado");

    jsonResponse(["success" => true, "user" => userResponse($u)]);
}

function accionFoto(mysqli $conn): never {
    requireMethod("GET");
    $viewer = requireLogin($conn);
    $id = inputInt($_GET, "id");
    if ($id === null || $id <= 0) jsonError(400, "Usuario no válido");
    if (!puedeVerUsuario($viewer, getUserById($conn, $id))) jsonError(404, "Foto no encontrada");

    $stmt = $conn->prepare("SELECT foto_blob, foto_mime FROM Usuario WHERE id_usuario = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || $row["foto_blob"] === null) jsonError(404, "Foto no encontrada");
    sendImage($row["foto_blob"], (string)$row["foto_mime"]);
}

function accionActualizarPerfil(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $id = (int)$u["id_usuario"];
    $data = readJsonBody();

    $cambios = ["id_usuario" => $id, "id_actor" => $id];

    if (array_key_exists("correo", $data)) {
        $correo = strtolower(inputStr($data, "correo"));
        validarCorreoUanl($correo);
        $cambios["correo"] = $correo;
    }
    // Todos los usuarios (estudiantes, moderadores y administradores) son
    // alumnos de la FCFM: cualquiera puede editar carrera y semestre
    if (array_key_exists("id_carrera", $data)) {
        $idCarrera = inputInt($data, "id_carrera");
        if ($idCarrera === null || $idCarrera <= 0) jsonError(400, "Selecciona tu carrera", "carrera");
        $cambios["id_carrera"] = $idCarrera;
    }
    if (array_key_exists("semestre", $data)) {
        $semestre = inputInt($data, "semestre");
        if ($semestre === null || $semestre < 1 || $semestre > 10) jsonError(400, "Semestre no válido", "semestre");
        $cambios["semestre"] = $semestre;
    }
    if (count($cambios) === 2) jsonError(400, "No hay cambios para guardar");

    spUsuario($conn, "ACTUALIZAR_PERFIL", $cambios);

    $user = getUserById($conn, $id);
    jsonResponse(["success" => true, "user" => userResponse($user, getCorreo($conn, $id))]);
}

function accionCambiarContrasena(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn, true); // permitido con clave temporal
    $id = (int)$u["id_usuario"];
    $data = readJsonBody();
    $actual = inputRaw($data, "actual");
    $nueva  = inputRaw($data, "nueva");

    if ($actual === "") jsonError(400, "Escribe tu contraseña actual", "actual");
    validarContrasena($nueva, "nueva");
    if ($actual === $nueva) jsonError(400, "La nueva contraseña debe ser diferente a la actual", "nueva");

    $datos = spUsuario($conn, "DATOS_LOGIN", ["id_usuario" => $id])[0] ?? null;
    if (!$datos || !password_verify($actual, $datos["contrasena"])) {
        jsonError(400, "La contraseña actual no es correcta", "actual");
    }

    spUsuario($conn, "CAMBIAR_CONTRASENA", [
        "id_usuario" => $id,
        "id_actor"   => $id,
        "contrasena" => password_hash($nueva, PASSWORD_DEFAULT),
    ]);
    session_regenerate_id(true);
    // Se regresa el usuario para que el front quite la marca de clave temporal
    $user = getUserById($conn, $id);
    jsonResponse([
        "success" => true,
        "message" => "Contraseña actualizada",
        "user"    => userResponse($user, getCorreo($conn, $id)),
    ]);
}

function accionActualizarFoto(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $id = (int)$u["id_usuario"];

    $foto = validarImagen("foto");
    if ($foto === null) jsonError(400, "Selecciona una imagen", "foto");

    spUsuario($conn, "ACTUALIZAR_FOTO", [
        "id_usuario" => $id,
        "id_actor"   => $id,
        "foto"       => $foto["blob"],
        "foto_mime"  => $foto["mime"],
    ]);

    $user = getUserById($conn, $id);
    jsonResponse(["success" => true, "user" => userResponse($user, getCorreo($conn, $id))]);
}

function accionEliminarCuenta(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $id = (int)$u["id_usuario"];

    // Varias tablas cambian (publicaciones, comentarios, reacciones, reservaciones)
    $conn->begin_transaction();
    try {
        spUsuario($conn, "ELIMINAR", ["id_usuario" => $id, "id_actor" => $id]);
        $conn->commit();
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        throw $e;
    }

    cerrarSesion();
    jsonResponse(["success" => true, "message" => "Tu cuenta fue eliminada"]);
}

function accionListar(mysqli $conn): never {
    requireMethod("GET");
    requireRole($conn, ...ROLES_STAFF);

    $rows = $conn->query(
        "SELECT id_usuario, matricula, nombre_completo, alias, correo, rol, carrera, semestre,
                estado, motivo, fecha_registro, fecha_revision, tiene_foto,
                total_publicaciones, total_likes, total_comentarios
         FROM vw_usuarios_admin
         ORDER BY fecha_registro DESC"
    )->fetch_all(MYSQLI_ASSOC);

    $usuarios = array_map(fn($r) => [
        "id_usuario"          => (int)$r["id_usuario"],
        "matricula"           => $r["matricula"],
        "nombre_completo"     => $r["nombre_completo"],
        "alias"               => $r["alias"],
        "correo"              => $r["correo"],
        "rol"                 => $r["rol"],
        "carrera"             => $r["carrera"],
        "semestre"            => $r["semestre"] !== null ? (int)$r["semestre"] : null,
        "estado"              => $r["estado"],
        "motivo"              => $r["motivo"],
        "fecha_registro"      => $r["fecha_registro"],
        "fecha_revision"      => $r["fecha_revision"],
        "tiene_foto"          => (bool)$r["tiene_foto"],
        "total_publicaciones" => (int)$r["total_publicaciones"],
        "total_likes"         => (int)$r["total_likes"],
        "total_comentarios"   => (int)$r["total_comentarios"],
    ], $rows);

    jsonResponse(["success" => true, "usuarios" => $usuarios]);
}

function accionCambiarEstado(mysqli $conn): never {
    requireMethod("POST");
    $actor = requireRole($conn, ...ROLES_STAFF);
    $data = readJsonBody();

    $id     = inputInt($data, "id_usuario");
    $estado = inputStr($data, "estado");
    $motivo = inputStr($data, "motivo");

    if ($id === null || $id <= 0) jsonError(400, "Usuario no válido");
    if (!in_array($estado, ESTADOS_GESTION, true)) jsonError(400, "Estado no válido", "estado");
    if (mb_strlen($motivo) > 300) jsonError(400, "El motivo no puede tener más de 300 caracteres", "motivo");

    spUsuario($conn, "CAMBIAR_ESTADO", [
        "id_usuario" => $id,
        "id_actor"   => (int)$actor["id_usuario"],
        "estado"     => $estado,
        "motivo"     => $motivo !== "" ? $motivo : null,
    ]);

    jsonResponse(["success" => true, "message" => "Estado actualizado", "estado" => $estado]);
}

function accionCrearModerador(mysqli $conn): never {
    requireMethod("POST");
    $actor = requireRole($conn, "Administrador");
    $data = readJsonBody();

    $nombre    = inputStr($data, "nombre");
    $alias     = inputStr($data, "alias");
    $correo    = strtolower(inputStr($data, "correo"));
    $matricula = inputStr($data, "matricula");
    $idCarrera = inputInt($data, "id_carrera");
    $semestre  = inputInt($data, "semestre");

    if ($nombre === "" || $alias === "" || $correo === "" || $matricula === "") {
        jsonError(400, "Faltan campos obligatorios");
    }
    if (mb_strlen($nombre) > 250) jsonError(400, "El nombre es demasiado largo", "nombre");
    if (mb_strlen($alias) > 50)   jsonError(400, "El alias no puede tener más de 50 caracteres", "alias");
    validarCorreoUanl($correo);
    // Todos los usuarios son estudiantes (P3)
    if (!preg_match('/^\d{7}$/', $matricula)) jsonError(400, "La matrícula debe tener 7 dígitos", "matricula");
    if ($idCarrera === null || $idCarrera <= 0) jsonError(400, "Selecciona la carrera", "carrera");
    if ($semestre === null || $semestre < 1 || $semestre > 10) jsonError(400, "Semestre no válido", "semestre");

    // Q3-A: sin servicio de correo no se crea (la clave nunca se muestra)
    if (!correoConfigurado()) {
        jsonError(503, "El envío de correos no está configurado; no se puede crear el moderador");
    }

    $clave = generarClaveTemporal();
    // Si el correo no sale, la cuenta no se crea (rollback)
    $conn->begin_transaction();
    try {
        $rows = spUsuario($conn, "CREAR_MODERADOR", [
            "id_actor"   => (int)$actor["id_usuario"],
            "matricula"  => $matricula,
            "nombre"     => $nombre,
            "alias"      => $alias,
            "correo"     => $correo,
            "contrasena" => password_hash($clave, PASSWORD_DEFAULT),
            "id_carrera" => $idCarrera,
            "semestre"   => $semestre,
        ]);
        if (!correoModerador($correo, $nombre, $clave)) {
            $conn->rollback();
            jsonError(503, "No se pudo enviar el correo con la contraseña temporal; el moderador no se creó. Intenta más tarde.");
        }
        $conn->commit();
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        throw $e;
    }

    // La clave temporal solo viaja por correo; en la BD queda el hash
    jsonResponse([
        "success"    => true,
        "message"    => "Moderador creado. Le enviamos su contraseña temporal a {$correo}.",
        "id_usuario" => (int)($rows[0]["id_usuario"] ?? 0),
    ], 201);
}

// "Olvidé mi contraseña" (R12, Q2-A). Respuesta idéntica exista o no la cuenta.
function accionRecuperarContrasena(mysqli $conn): never {
    requireMethod("POST");
    $correo = strtolower(inputStr(readJsonBody(), "correo"));
    if ($correo === "") jsonError(400, "Escribe tu correo institucional", "correo");
    validarCorreoUanl($correo);
    if (!correoConfigurado()) {
        jsonError(503, "La recuperación de contraseña no está disponible en este momento");
    }

    $mensaje = "Si el correo está registrado, te enviamos una contraseña temporal. Revisa también tu carpeta de spam; si no llega, espera 5 minutos e inténtalo de nuevo.";
    $clave = generarClaveTemporal();

    $conn->begin_transaction();
    try {
        $r = spUsuario($conn, "SOLICITAR_RECUPERACION", [
            "correo"     => $correo,
            "contrasena" => password_hash($clave, PASSWORD_DEFAULT),
        ])[0] ?? null;

        if ($r && (int)$r["enviar"] === 1 && !correoRecuperacion($correo, (string)$r["nombre_completo"], $clave)) {
            $conn->rollback();
            jsonError(503, "No se pudo enviar el correo. Intenta más tarde.");
        }
        $conn->commit();
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        throw $e;
    }

    jsonResponse(["success" => true, "message" => $mensaje]);
}

// ---------- Ruteo ----------
$accion = inputStr($_GET, "accion");

try {
    $conn = getConnection();
    switch ($accion) {
        case "registro":           accionRegistro($conn);
        case "login":              accionLogin($conn);
        case "logout":             accionLogout();
        case "me":                 accionMe($conn);
        case "carreras":           accionCarreras($conn);
        case "perfil":             accionPerfil($conn);
        case "foto":               accionFoto($conn);
        case "actualizar_perfil":  accionActualizarPerfil($conn);
        case "cambiar_contrasena": accionCambiarContrasena($conn);
        case "actualizar_foto":    accionActualizarFoto($conn);
        case "eliminar_cuenta":    accionEliminarCuenta($conn);
        case "listar":             accionListar($conn);
        case "cambiar_estado":     accionCambiarEstado($conn);
        case "crear_moderador":    accionCrearModerador($conn);
        case "recuperar_contrasena": accionRecuperarContrasena($conn);
        default:                   jsonError(404, "Acción no encontrada");
    }
} catch (mysqli_sql_exception $e) {
    dbError($e, DUPLICADOS_USUARIO);
}
