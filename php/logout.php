<?php
require __DIR__ . "/config.php";
startSession();
$_SESSION = [];
session_destroy();
echo json_encode(["success" => true]);