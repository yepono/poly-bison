<?php
// Plantilla de configuración. Copia este archivo como config.local.php
// y llena los valores reales. config.local.php NO se sube a git.
return [
    "env" => "dev", // "dev" en tu computadora o "prod" en el servidor

    // Zona horaria de PHP (debe coincidir con la de MySQL: fechas "pasadas", horarios de hoy)
    "timezone" => "America/Monterrey",

    "db" => [
        "host" => "127.0.0.1",
        "user" => "USUARIO_MYSQL",
        "pass" => "CONTRASENA_MYSQL",
        "name" => "poly_bison",
        "port" => 3306,
    ],

    // Envío de correos con la API de Brevo: clave temporal de moderadores
    // nuevos y "Olvidé mi contraseña". Sin api_key no se envían correos y esas
    // acciones responden 503.
    "brevo" => [
        "api_key"          => "",              // se obtiene en Brevo, en SMTP & API > API Keys
        "remitente_correo" => "",              // remitente verificado en Brevo
        "remitente_nombre" => "PolyBison",
    ],

    // URL del front para el botón de los correos
    "app_url" => "http://localhost:5173/poly-bison/login",

    // Orígenes que pueden llamar a la API con cookies (CORS)
    // En local es http://localhost:5173; en producción, el dominio donde se publique el front
    "cors_origins" => [
        "http://localhost:5173",
    ],

    // Cookie de sesión. En producción con HTTPS, secure debe ser true. Si el front y la API están en
    // dominios distintos, samesite debe ser "None" (y entonces secure también debe ser true).
    "cookie_secure"   => false,
    "cookie_samesite" => "Lax",
];
