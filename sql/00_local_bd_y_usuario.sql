-- ============================================================
-- 00_local_bd_y_usuario.sql - SOLO PARA INSTALACIÓN LOCAL
-- Crea el esquema y el usuario de MySQL que usa la API.
--
-- NO se ejecuta en el hosting (IONOS): ahí la base de datos y su
-- usuario los crea el panel, y CREATE DATABASE / CREATE USER / GRANT
-- no están permitidos.
--
-- Antes de ejecutarlo: cambia CAMBIA_ESTA_CLAVE por una contraseña
-- propia y pon la MISMA en php/config.local.php ("pass").
-- Ejecutar como root. Se puede ejecutar más de una vez.
-- ============================================================

CREATE DATABASE IF NOT EXISTS poly_bison
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'Bison'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE';
GRANT ALL PRIVILEGES ON poly_bison.* TO 'Bison'@'localhost';
FLUSH PRIVILEGES;

-- Después de esto, selecciona "poly_bison" como esquema por defecto
-- (en Workbench: doble clic sobre poly_bison) y ejecuta los demás
-- scripts en el orden del README.
