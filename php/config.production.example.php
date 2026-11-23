<?php
// ============================================================
// Plantilla de configuración para PRODUCCIÓN (IONOS, https://poly-bison.com)
// En el servidor, súbela como /api/config.local.php y llena los datos reales.
// Nunca subas a git ni compartas el archivo con datos reales.
// Los datos de la base de datos salen del panel de IONOS:
//   Hosting -> Bases de datos -> (tu BD) -> nombre de host, nombre de BD,
//   nombre de usuario y contraseña.
// ============================================================
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
        "api_key"          => "",           // la misma API key de Brevo
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
