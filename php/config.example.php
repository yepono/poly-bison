<?php
// Plantilla de configuración. Copia este archivo como config.local.php
// y llena los valores reales. config.local.php NO se sube a git.
return [
    "env" => "dev", // "dev" | "prod"

    // Zona horaria de PHP (debe coincidir con la de MySQL: fechas "pasadas", horarios de hoy)
    "timezone" => "America/Monterrey",

    "db" => [
        "host" => "127.0.0.1",
        "user" => "USUARIO_MYSQL",
        "pass" => "CONTRASENA_MYSQL",
        "name" => "poly_bison",
        "port" => 3306,
    ],

    // Envío de correos con la API de Brevo (R12): clave temporal de moderadores
    // nuevos y "Olvidé mi contraseña". Sin api_key no se envían correos y esas
    // acciones responden 503.
    "brevo" => [
        "api_key"          => "",              // Brevo > SMTP & API > API Keys
        "remitente_correo" => "",              // remitente verificado en Brevo
        "remitente_nombre" => "PolyBison",
    ],

    // URL del front para el botón de los correos
    "app_url" => "http://localhost:5173/poly-bison/login",

    // Orígenes que pueden llamar a la API con cookies (CORS)
    // dev:  "http://localhost:5173"
    // prod: el dominio donde se publique el front (https://...)
    "cors_origins" => [
        "http://localhost:5173",
    ],

    // Cookie de sesión. En producción con HTTPS: secure => true.
    // Si front y API están en dominios distintos: samesite => "None" (requiere secure => true).
    "cookie_secure"   => false,
    "cookie_samesite" => "Lax",
];
