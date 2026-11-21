<?php
require __DIR__ . "/config.php";

try {
    $conn = getConnection();
    echo json_encode(["connected" => true, "message" => "Database connected"]);
    $conn->close();
} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    echo json_encode(["connected" => false, "message" => "Connection failed: " . $e->getMessage()]);
}