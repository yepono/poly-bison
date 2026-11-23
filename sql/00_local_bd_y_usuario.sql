-- local set up
CREATE DATABASE IF NOT EXISTS poly_bison
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'Bison'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE';
GRANT ALL PRIVILEGES ON poly_bison.* TO 'Bison'@'localhost';
FLUSH PRIVILEGES;