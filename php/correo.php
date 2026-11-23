<?php
// Envío de correos con la API de Brevo. No se llama directamente: lo usa usuarios.php para
// mandar la clave temporal de los moderadores nuevos y la de "Olvidé mi contraseña".
// La clave de Brevo y el remitente se configuran en config.local.php.

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

function correoConfigurado(): bool {
    $c = appConfig()["brevo"] ?? [];
    return trim((string)($c["api_key"] ?? "")) !== "" && trim((string)($c["remitente_correo"] ?? "")) !== "";
}

// Envía un correo. Regresa true si Brevo lo aceptó (HTTP 2xx).
// Los errores se registran en el log de Apache; nunca se muestran al usuario.
function enviarCorreo(string $paraCorreo, string $paraNombre, string $asunto, string $html, string $texto): bool {
    if (!correoConfigurado()) return false;
    $c = appConfig()["brevo"];

    $payload = json_encode([
        "sender"      => ["name" => $c["remitente_nombre"] ?? "PolyBison", "email" => $c["remitente_correo"]],
        "to"          => [["email" => $paraCorreo, "name" => $paraNombre]],
        "subject"     => $asunto,
        "htmlContent" => $html,
        "textContent" => $texto,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init(BREVO_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            "accept: application/json",
            "content-type: application/json",
            "api-key: " . $c["api_key"],
        ],
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 15,
    ]);
    $respuesta = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $errorCurl = curl_error($ch);
    curl_close($ch);

    if ($respuesta === false || $status < 200 || $status >= 300) {
        error_log("PolyBison correo: HTTP {$status} {$errorCurl} " . substr((string)$respuesta, 0, 300));
        return false;
    }
    return true;
}

// Plantillas
function plantillaCorreo(string $titulo, string $saludo, string $parrafo, string $clave, string $nota): array {
    $e = fn(string $t) => htmlspecialchars($t, ENT_QUOTES, "UTF-8");
    $url = appConfig()["app_url"] ?? "";
    $boton = $url !== ""
        ? "<p><a href=\"{$e($url)}\" style=\"display:inline-block;background:#003366;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none\">Ir a PolyBison</a></p>"
        : "";

    $html = "<div style=\"font-family:Arial,sans-serif;max-width:520px;color:#1f2937\">"
          . "<h2 style=\"color:#003366\">{$e($titulo)}</h2>"
          . "<p>{$e($saludo)}</p>"
          . "<p>{$e($parrafo)}</p>"
          . "<p style=\"font-size:22px;font-family:monospace;letter-spacing:2px;background:#f3f4f6;padding:12px;border-radius:6px;text-align:center\">{$e($clave)}</p>"
          . "<p>{$e($nota)}</p>"
          . $boton
          . "<p style=\"font-size:12px;color:#6b7280\">Si no solicitaste este correo, ignóralo. Nadie de PolyBison te pedirá esta contraseña.</p>"
          . "</div>";

    $texto = "{$titulo}\n\n{$saludo}\n\n{$parrafo}\n\n    {$clave}\n\n{$nota}\n"
           . ($url !== "" ? "\nPolyBison: {$url}\n" : "")
           . "\nSi no solicitaste este correo, ignóralo.";

    return [$html, $texto];
}

function correoRecuperacion(string $correo, string $nombre, string $clave): bool {
    [$html, $texto] = plantillaCorreo(
        "Recupera tu acceso a PolyBison",
        "Hola, {$nombre}:",
        "Recibimos una solicitud para recuperar tu cuenta. Inicia sesión con esta contraseña temporal:",
        $clave,
        "Vence en 30 minutos y solo funciona una vez. Al entrar te pediremos cambiarla. Tu contraseña anterior sigue funcionando mientras no uses esta."
    );
    return enviarCorreo($correo, $nombre, "PolyBison: contraseña temporal", $html, $texto);
}

function correoModerador(string $correo, string $nombre, string $clave): bool {
    [$html, $texto] = plantillaCorreo(
        "Bienvenido al equipo de moderación de PolyBison",
        "Hola, {$nombre}:",
        "Un administrador creó tu cuenta de moderador. Inicia sesión con tu correo institucional y esta contraseña temporal:",
        $clave,
        "Al entrar por primera vez deberás cambiarla antes de usar PolyBison."
    );
    return enviarCorreo($correo, $nombre, "PolyBison: tu cuenta de moderador", $html, $texto);
}
