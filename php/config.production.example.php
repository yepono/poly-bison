<?php
// Plantilla de configuración para el servidor de producción. Súbela como /api/config.local.php
// y llénala con los datos reales; nunca subas a git el archivo con esos datos.
// Los datos de la base de datos están en el panel de IONOS, en Hosting > Bases de datos.
return [
    "env" => "prod",

    // Zona horaria de PHP; config.php la aplica también a cada conexión de
    // MariaDB (el servidor de IONOS está en America/New_York)
    "timezone" => "America/Monterrey",

    "db" => [
        "host" => "HOST_DE_IONOS",          // p. ej. db5000000000.hosting-data.io
        "user" => "USUARIO_DE_IONOS",       // p. ej. dbu0000000
        "pass" => "CONTRASENA_DE_IONOS",
        "name" => "NOMBRE_BD_DE_IONOS",     // p. ej. dbs0000000
        "port" => 3306,
    ],

    "brevo" => [
        "api_key"          => "",           // la misma clave de la API de Brevo
        "remitente_correo" => "",           // remitente verificado en Brevo
        "remitente_nombre" => "PolyBison",
    ],

    // Botón "Ir a PolyBison" de los correos
    "app_url" => "https://poly-bison.com/login",

    // Front y API en el mismo dominio: las peticiones son del mismo origen.
    // Se listan por si se entra con o sin www.
    "cors_origins" => [
        "https://poly-bison.com",
        "https://www.poly-bison.com",
    ],

    // HTTPS obligatorio en producción: la cookie de sesión solo viaja cifrada
    "cookie_secure"   => true,
    "cookie_samesite" => "Lax",
];
