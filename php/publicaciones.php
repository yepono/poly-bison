<?php
// ============================================================
// publicaciones.php - Sección Publicaciones (+ su multimedia)
// Acción por parámetro: publicaciones.php?accion=...
// Todas requieren sesión.
//
//   GET  listar                    feed (vw_feed_publicaciones)
//   GET  detalle&id=               una publicación
//   GET  por_usuario&id=           publicaciones de un usuario (perfil)
//   GET  etiquetas                 catálogo de etiquetas (D6)
//   POST crear      (multipart)    titulo, descripcion, id_etiqueta,
//                                  imagen (archivo) O video_url (YouTube)
//                                  -> sp_publicacion CREAR + sp_multimedia
//   POST editar     (multipart)    solo el autor; además: quitar_multimedia=1
//                                  -> sp_publicacion EDITAR + sp_multimedia
//   POST eliminar   (JSON)         el autor o Administrador/Moderador
//                                  -> sp_publicacion ELIMINAR
// ============================================================
require __DIR__ . "/config.php";

const TITULO_MAX      = 250;
const DESCRIPCION_MAX = 600;
const FEED_LIMITE     = 100;

// ---------- Helpers ----------

function spPublicacion(mysqli $conn, string $accion, array $p): array {
    return callProcedure($conn, "sp_publicacion", "siissi", [
        $accion,
        $p["id_publicacion"] ?? null,
        $p["id_actor"]       ?? null,
        $p["titulo"]         ?? null,
        $p["descripcion"]    ?? null,
        $p["id_etiqueta"]    ?? null,
    ]);
}

function spMultimedia(mysqli $conn, string $accion, array $p): array {
    return callProcedure($conn, "sp_multimedia", "siiibssis", [
        $accion,
        $p["id_multimedia"]  ?? null,
        $p["id_publicacion"] ?? null,
        $p["id_actor"]       ?? null,
        $p["blob"]           ?? null,
        $p["mime"]           ?? null,
        $p["nombre"]         ?? null,
        $p["tamanio"]        ?? null,
        $p["video_url"]      ?? null,
    ]);
}

// Acepta youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID y /embed/ID.
// Regresa la URL normalizada https://www.youtube.com/watch?v=ID o null si no es válida.
function normalizarYoutube(string $url): ?string {
    if ($url === "" || mb_strlen($url) > 500) return null;
    $partes = parse_url($url);
    if (!$partes || !in_array($partes["scheme"] ?? "", ["http", "https"], true)) return null;
    $host = strtolower(preg_replace('/^(www\.|m\.)/', "", $partes["host"] ?? ""));
    $path = $partes["path"] ?? "";
    $id = null;

    if ($host === "youtu.be") {
        $id = ltrim($path, "/");
    } elseif ($host === "youtube.com" || $host === "youtube-nocookie.com") {
        if ($path === "/watch") {
            parse_str($partes["query"] ?? "", $query);
            $id = is_string($query["v"] ?? null) ? $query["v"] : null;
        } elseif (preg_match('#^/(shorts|embed)/([^/?]+)#', $path, $m)) {
            $id = $m[2];
        }
    }
    if ($id === null || !preg_match('/^[A-Za-z0-9_-]{11}$/', $id)) return null;
    return "https://www.youtube.com/watch?v=" . $id;
}

// Fila de vw_feed_publicaciones -> respuesta JSON
function postResponse(array $r): array {
    return [
        "id_publicacion"    => (int)$r["id_publicacion"],
        "id_usuario"        => (int)$r["id_usuario"],
        "alias"             => $r["alias"],
        "autor_tiene_foto"  => (bool)$r["autor_tiene_foto"],
        "titulo"            => $r["titulo"],
        "descripcion"       => $r["descripcion"],
        "fecha_creacion"    => $r["fecha_creacion"],
        "id_etiqueta"       => $r["id_etiqueta"] !== null ? (int)$r["id_etiqueta"] : null,
        "etiqueta"          => $r["etiqueta"],
        "etiqueta_color"    => $r["etiqueta_color"],
        "id_imagen"         => $r["id_imagen"] !== null ? (int)$r["id_imagen"] : null,
        "video_url"         => $r["video_url"],
        "total_likes"       => (int)$r["total_likes"],
        "total_comentarios" => (int)$r["total_comentarios"],
        "liked"             => (bool)$r["liked"],
    ];
}

// Consulta la vista con el "liked" del usuario de la sesión.
// $where usa placeholders; $types/$params son los de ese WHERE.
function consultarPosts(mysqli $conn, int $viewerId, string $where = "", string $types = "", array $params = [], string $extra = ""): array {
    $sql = "SELECT v.*,
                   EXISTS(SELECT 1 FROM Reaccion r
                           WHERE r.id_publicacion = v.id_publicacion
                             AND r.id_usuario = ? AND r.tipo = 'Like') AS liked
            FROM vw_feed_publicaciones v
            {$where}
            ORDER BY v.fecha_creacion DESC, v.id_publicacion DESC {$extra}";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i" . $types, $viewerId, ...$params);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return array_map("postResponse", $rows);
}

function getPost(mysqli $conn, int $id, int $viewerId): ?array {
    return consultarPosts($conn, $viewerId, "WHERE v.id_publicacion = ?", "i", [$id])[0] ?? null;
}

// Valida título/descripción/etiqueta. $parcial = true permite omitirlos (editar)
function leerCamposPost(bool $parcial): array {
    $campos = [];
    foreach (["titulo" => TITULO_MAX, "descripcion" => DESCRIPCION_MAX] as $campo => $max) {
        if ($parcial && !array_key_exists($campo, $_POST)) continue;
        $valor = inputStr($_POST, $campo);
        if ($valor === "") {
            jsonError(400, $campo === "titulo" ? "El título es obligatorio" : "El contenido es obligatorio", $campo);
        }
        if (mb_strlen($valor) > $max) {
            jsonError(400, ($campo === "titulo" ? "El título" : "El contenido") . " no puede tener más de {$max} caracteres", $campo);
        }
        $campos[$campo] = $valor;
    }
    if (!$parcial || array_key_exists("id_etiqueta", $_POST)) {
        $idEtiqueta = inputInt($_POST, "id_etiqueta");
        if ($idEtiqueta === null || $idEtiqueta <= 0) jsonError(400, "Selecciona una etiqueta", "etiqueta");
        $campos["id_etiqueta"] = $idEtiqueta;
    }
    return $campos;
}

// Imagen o video (no ambos). Regresa ["imagen" => ?array, "video" => ?string]
function leerMultimedia(): array {
    $imagen = validarImagen("imagen");
    $videoTexto = inputStr($_POST, "video_url");
    $video = null;
    if ($videoTexto !== "") {
        $video = normalizarYoutube($videoTexto);
        if ($video === null) jsonError(400, "El enlace debe ser un video de YouTube válido", "video_url");
    }
    if ($imagen !== null && $video !== null) {
        jsonError(400, "Solo puedes agregar una imagen o un video, no ambos", "imagen");
    }
    return ["imagen" => $imagen, "video" => $video];
}

function agregarMultimedia(mysqli $conn, int $idPublicacion, int $actor, array $media): void {
    if ($media["imagen"] !== null) {
        spMultimedia($conn, "AGREGAR_IMAGEN", [
            "id_publicacion" => $idPublicacion,
            "id_actor"       => $actor,
            "blob"           => $media["imagen"]["blob"],
            "mime"           => $media["imagen"]["mime"],
            "nombre"         => $media["imagen"]["nombre"],
            "tamanio"        => $media["imagen"]["tamanio"],
        ]);
    } elseif ($media["video"] !== null) {
        spMultimedia($conn, "AGREGAR_VIDEO", [
            "id_publicacion" => $idPublicacion,
            "id_actor"       => $actor,
            "video_url"      => $media["video"],
        ]);
    }
}

// ---------- Acciones ----------

function accionListar(mysqli $conn): never {
    requireMethod("GET");
    $u = requireLogin($conn);
    $posts = consultarPosts($conn, (int)$u["id_usuario"], "", "", [], "LIMIT " . FEED_LIMITE);
    jsonResponse(["success" => true, "publicaciones" => $posts]);
}

function accionDetalle(mysqli $conn): never {
    requireMethod("GET");
    $u = requireLogin($conn);
    $id = inputInt($_GET, "id");
    if ($id === null || $id <= 0) jsonError(400, "Publicación no válida");
    $post = getPost($conn, $id, (int)$u["id_usuario"]);
    if (!$post) jsonError(404, "Publicación no encontrada");
    jsonResponse(["success" => true, "publicacion" => $post]);
}

function accionPorUsuario(mysqli $conn): never {
    requireMethod("GET");
    $u = requireLogin($conn);
    $id = inputInt($_GET, "id");
    if ($id === null || $id <= 0) jsonError(400, "Usuario no válido");
    $posts = consultarPosts($conn, (int)$u["id_usuario"], "WHERE v.id_usuario = ?", "i", [$id]);
    jsonResponse(["success" => true, "publicaciones" => $posts]);
}

function accionEtiquetas(mysqli $conn): never {
    requireMethod("GET");
    requireLogin($conn);
    $rows = $conn->query("SELECT id_etiqueta, nombre, color FROM Etiqueta WHERE activo = 1 ORDER BY id_etiqueta")
                 ->fetch_all(MYSQLI_ASSOC);
    $etiquetas = array_map(fn($r) => [
        "id_etiqueta" => (int)$r["id_etiqueta"],
        "nombre"      => $r["nombre"],
        "color"       => $r["color"],
    ], $rows);
    jsonResponse(["success" => true, "etiquetas" => $etiquetas]);
}

function accionCrear(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $actor = (int)$u["id_usuario"];
    $campos = leerCamposPost(false);
    $media = leerMultimedia();

    $conn->begin_transaction();
    try {
        $rows = spPublicacion($conn, "CREAR", ["id_actor" => $actor] + $campos);
        $id = (int)($rows[0]["id_publicacion"] ?? 0);
        agregarMultimedia($conn, $id, $actor, $media);
        $conn->commit();
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        throw $e;
    }

    jsonResponse(["success" => true, "publicacion" => getPost($conn, $id, $actor)], 201);
}

function accionEditar(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $actor = (int)$u["id_usuario"];
    $id = inputInt($_POST, "id_publicacion");
    if ($id === null || $id <= 0) jsonError(400, "Publicación no válida");

    $campos = leerCamposPost(true);
    $media = leerMultimedia();
    $quitar = inputStr($_POST, "quitar_multimedia") === "1";
    $cambiaMedia = $quitar || $media["imagen"] !== null || $media["video"] !== null;

    $conn->begin_transaction();
    try {
        // EDITAR valida existencia (404) y autoría (403)
        spPublicacion($conn, "EDITAR", ["id_publicacion" => $id, "id_actor" => $actor] + $campos);

        if ($cambiaMedia) {
            $stmt = $conn->prepare("SELECT id_multimedia FROM Multimedia WHERE id_publicacion = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $actuales = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            foreach ($actuales as $m) {
                spMultimedia($conn, "ELIMINAR", ["id_multimedia" => (int)$m["id_multimedia"], "id_actor" => $actor]);
            }
            agregarMultimedia($conn, $id, $actor, $media);
        }
        $conn->commit();
    } catch (mysqli_sql_exception $e) {
        $conn->rollback();
        throw $e;
    }

    jsonResponse(["success" => true, "publicacion" => getPost($conn, $id, $actor)]);
}

function accionEliminar(mysqli $conn): never {
    requireMethod("POST");
    $u = requireLogin($conn);
    $id = inputInt(readJsonBody(), "id_publicacion");
    if ($id === null || $id <= 0) jsonError(400, "Publicación no válida");

    // ELIMINAR valida: existe (404), autor o Administrador/Moderador (403)
    spPublicacion($conn, "ELIMINAR", ["id_publicacion" => $id, "id_actor" => (int)$u["id_usuario"]]);
    jsonResponse(["success" => true, "message" => "Publicación eliminada"]);
}

// ---------- Ruteo ----------
$accion = inputStr($_GET, "accion");

try {
    $conn = getConnection();
    switch ($accion) {
        case "listar":      accionListar($conn);
        case "detalle":     accionDetalle($conn);
        case "por_usuario": accionPorUsuario($conn);
        case "etiquetas":   accionEtiquetas($conn);
        case "crear":       accionCrear($conn);
        case "editar":      accionEditar($conn);
        case "eliminar":    accionEliminar($conn);
        default:            jsonError(404, "Acción no encontrada");
    }
} catch (mysqli_sql_exception $e) {
    dbError($e);
}
