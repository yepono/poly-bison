<?php
// Catálogo de la Bisontstore. Con sesión se pueden ver los productos, las categorías y las
// fotos. Solo el administrador puede crear, editar o desactivar productos.
require __DIR__ . "/config.php";

const NOMBRE_MAX      = 200;
const DESCRIPCION_MAX = 500;
const PRECIO_MAX      = 999999.99;   // el precio más alto que cabe en la base de datos
const STOCK_MAX       = 100000;

function spProducto(mysqli $conn, string $accion, array $p): array {
    return callProcedure($conn, "sp_producto", "siiisssibs", [
        $accion,
        $p["id_producto"]  ?? null,
        $p["id_actor"]     ?? null,
        $p["id_categoria"] ?? null,
        $p["nombre"]       ?? null,
        $p["descripcion"]  ?? null,
        $p["precio"]       ?? null,   // se envía como texto para no perder centavos
        $p["stock"]        ?? null,
        $p["foto"]         ?? null,
        $p["foto_mime"]    ?? null,
    ]);
}

function productoResponse(array $r): array {
    return [
        "id_producto"  => (int)$r["id_producto"],
        "nombre"       => $r["nombre"],
        "descripcion"  => $r["descripcion"],
        "precio"       => $r["precio"],          // texto con dos decimales
        "stock"        => (int)$r["stock"],
        "id_categoria" => (int)$r["id_categoria"],
        "categoria"    => $r["categoria"],
        "tiene_foto"   => (bool)$r["tiene_foto"],
    ];
}

// Valida campos de $_POST. $parcial = true (editar) permite omitirlos.
function leerCamposProducto(bool $parcial): array {
    $c = [];
    if (!$parcial || array_key_exists("id_categoria", $_POST)) {
        $cat = inputInt($_POST, "id_categoria");
        if ($cat === null || $cat <= 0) jsonError(400, "Selecciona una categoría", "categoria");
        $c["id_categoria"] = $cat;
    }
    if (!$parcial || array_key_exists("nombre", $_POST)) {
        $nombre = inputStr($_POST, "nombre");
        if ($nombre === "") jsonError(400, "El nombre es obligatorio", "nombre");
        if (mb_strlen($nombre) > NOMBRE_MAX) jsonError(400, "El nombre no puede tener más de " . NOMBRE_MAX . " caracteres", "nombre");
        $c["nombre"] = $nombre;
    }
    if (!$parcial || array_key_exists("descripcion", $_POST)) {
        $descripcion = inputStr($_POST, "descripcion");
        if (mb_strlen($descripcion) > DESCRIPCION_MAX) jsonError(400, "La descripción no puede tener más de " . DESCRIPCION_MAX . " caracteres", "descripcion");
        $c["descripcion"] = $descripcion;
    }
    if (!$parcial || array_key_exists("precio", $_POST)) {
        $precio = inputStr($_POST, "precio");
        if (!preg_match('/^\d{1,6}(\.\d{1,2})?$/', $precio) || (float)$precio > PRECIO_MAX) {
            jsonError(400, "Escribe un precio válido (máximo 2 decimales)", "precio");
        }
        $c["precio"] = number_format((float)$precio, 2, ".", "");
    }
    if (!$parcial || array_key_exists("stock", $_POST)) {
        $stock = inputInt($_POST, "stock");
        if ($stock === null || $stock < 0 || $stock > STOCK_MAX) jsonError(400, "El stock debe ser un número entero entre 0 y " . STOCK_MAX, "stock");
        $c["stock"] = $stock;
    }
    $imagen = validarImagen("imagen");
    if ($imagen !== null) {
        $c["foto"] = $imagen["blob"];
        $c["foto_mime"] = $imagen["mime"];
    }
    return $c;
}

function getProducto(mysqli $conn, int $id): ?array {
    $stmt = $conn->prepare("SELECT * FROM vw_catalogo_productos WHERE id_producto = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ? productoResponse($row) : null;
}

// Acciones
function accionListar(mysqli $conn): never {
    requireMethod("GET");
    requireLogin($conn);
    $rows = $conn->query("SELECT * FROM vw_catalogo_productos ORDER BY nombre")->fetch_all(MYSQLI_ASSOC);
    jsonResponse(["success" => true, "productos" => array_map("productoResponse", $rows)]);
}

function accionCategorias(mysqli $conn): never {
    requireMethod("GET");
    requireLogin($conn);
    $rows = $conn->query("SELECT id_categoria, nombre FROM Categoria_Producto WHERE activo = 1 ORDER BY nombre")
                 ->fetch_all(MYSQLI_ASSOC);
    $categorias = array_map(fn($r) => ["id_categoria" => (int)$r["id_categoria"], "nombre" => $r["nombre"]], $rows);
    jsonResponse(["success" => true, "categorias" => $categorias]);
}

function accionFoto(mysqli $conn): never {
    requireMethod("GET");
    requireLogin($conn);
    $id = inputInt($_GET, "id");
    if ($id === null || $id <= 0) jsonError(400, "Producto no válido");
    $stmt = $conn->prepare("SELECT foto_blob, foto_mime FROM Productos WHERE id_producto = ? AND estado = 1");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row || $row["foto_blob"] === null) jsonError(404, "Imagen no encontrada");
    sendImage($row["foto_blob"], (string)$row["foto_mime"]);
}

function accionCrear(mysqli $conn): never {
    requireMethod("POST");
    $u = requireRole($conn, "Administrador");
    $campos = leerCamposProducto(false);
    $rows = spProducto($conn, "CREAR", ["id_actor" => (int)$u["id_usuario"]] + $campos);
    $id = (int)($rows[0]["id_producto"] ?? 0);
    jsonResponse(["success" => true, "producto" => getProducto($conn, $id)], 201);
}

function accionEditar(mysqli $conn): never {
    requireMethod("POST");
    $u = requireRole($conn, "Administrador");
    $id = inputInt($_POST, "id_producto");
    if ($id === null || $id <= 0) jsonError(400, "Producto no válido");
    $campos = leerCamposProducto(true);
    if (!$campos) jsonError(400, "No hay cambios para guardar");
    spProducto($conn, "EDITAR", ["id_producto" => $id, "id_actor" => (int)$u["id_usuario"]] + $campos);
    jsonResponse(["success" => true, "producto" => getProducto($conn, $id)]);
}

function accionDesactivar(mysqli $conn): never {
    requireMethod("POST");
    $u = requireRole($conn, "Administrador");
    $id = inputInt(readJsonBody(), "id_producto");
    if ($id === null || $id <= 0) jsonError(400, "Producto no válido");
    spProducto($conn, "DESACTIVAR", ["id_producto" => $id, "id_actor" => (int)$u["id_usuario"]]);
    jsonResponse(["success" => true, "message" => "Producto eliminado del catálogo"]);
}

$accion = inputStr($_GET, "accion");

try {
    $conn = getConnection();
    switch ($accion) {
        case "listar":     accionListar($conn);
        case "categorias": accionCategorias($conn);
        case "foto":       accionFoto($conn);
        case "crear":      accionCrear($conn);
        case "editar":     accionEditar($conn);
        case "desactivar": accionDesactivar($conn);
        default:           jsonError(404, "Acción no encontrada");
    }
} catch (mysqli_sql_exception $e) {
    dbError($e);
}
