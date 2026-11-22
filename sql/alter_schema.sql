-- ============================================================
-- alter_schema.sql - Cambios al esquema existente (table_creation.sql)
-- Se puede ejecutar más de una vez. MySQL Server 8.0 (Workbench, como root)
-- MySQL 8 no tiene "ADD COLUMN IF NOT EXISTS" ni "DROP CONSTRAINT IF EXISTS",
-- así que cada cambio revisa information_schema y arma el ALTER dinámico.
-- ============================================================
USE poly_bison;

-- ------------------------------------------------------------
-- [Paso 1] Rol por defecto = 'Estudiante' (rol "Usuario" de la app)
-- Usuario.id_rol no tenía DEFAULT. Un DEFAULT debe ser un valor literal,
-- así que se busca el id y se arma el ALTER.
-- Si no existe el rol 'Estudiante' el script falla (no aplica nada).
-- Lo usa: usuarios.php (registro) vía sp_usuario REGISTRAR.
-- ------------------------------------------------------------
SET @id_estudiante := (SELECT id_rol FROM Rol WHERE nombre = 'Estudiante');
SET @sql := CONCAT('ALTER TABLE Usuario ALTER COLUMN id_rol SET DEFAULT ', @id_estudiante);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- [Paso 2 - D3] Semestre válido: 1 a 10 (antes 1 a 12)
-- Si alguna fila tiene semestre 11 o 12 el ADD CONSTRAINT falla.
-- Esta consulta debe regresar 0:
-- ------------------------------------------------------------
SELECT COUNT(*) AS usuarios_con_semestre_mayor_a_10
FROM Usuario WHERE semestre > 10;

-- Quita el CHECK anterior solo si existe
SET @existe := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA = 'poly_bison' AND TABLE_NAME = 'Usuario'
                  AND CONSTRAINT_NAME = 'chk_usuario_semestre' AND CONSTRAINT_TYPE = 'CHECK');
SET @sql := IF(@existe > 0,
               'ALTER TABLE Usuario DROP CHECK chk_usuario_semestre',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE Usuario
  ADD CONSTRAINT chk_usuario_semestre CHECK (semestre IS NULL OR semestre BETWEEN 1 AND 10);

-- ------------------------------------------------------------
-- [Paso 2 - D9] Bloque_Horario.activo
-- Permite que el administrador desactive un horario sin borrarlo
-- (borrarlo fallaría si ya tiene reservaciones).
-- Lo usan: sp_bloque_horario, fn_aula_disponible, reservaciones.php
-- ------------------------------------------------------------
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = 'poly_bison' AND TABLE_NAME = 'Bloque_Horario'
                  AND COLUMN_NAME = 'activo');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Bloque_Horario ADD COLUMN activo BOOL NOT NULL DEFAULT TRUE',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- [Paso 2 - D12] Estado 'Eliminado' para borrado lógico de cuentas
-- Al eliminar una cuenta se anonimiza (sp_usuario, acción ELIMINAR)
-- y se conserva la fila para no romper las llaves foráneas.
-- ------------------------------------------------------------
ALTER TABLE Usuario
  MODIFY COLUMN estado ENUM('Pendiente','Aprobado','Rechazado','Baneado','Eliminado')
  NOT NULL DEFAULT 'Pendiente';

-- ------------------------------------------------------------
-- [Paso 3 - Prueba 8, opción A] Usuario.debe_cambiar_contrasena
-- TRUE cuando la cuenta tiene una clave temporal (moderador recién creado).
-- Mientras sea TRUE, la API solo permite: me, logout y cambiar_contrasena.
-- La ponen: sp_usuario CREAR_MODERADOR (TRUE) y CAMBIAR_CONTRASENA (FALSE).
-- La leen: vw_usuario_publico -> usuarios.php (me, login, requireLogin)
-- ------------------------------------------------------------
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = 'poly_bison' AND TABLE_NAME = 'Usuario'
                  AND COLUMN_NAME = 'debe_cambiar_contrasena');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Usuario ADD COLUMN debe_cambiar_contrasena BOOL NOT NULL DEFAULT FALSE',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- [R12 - Recuperar contraseña, Q2-A] Contraseña temporal separada
--   contrasena_temporal : hash de la clave enviada por correo (o NULL)
--   temporal_expira     : vence 30 minutos después de pedirla
-- La contraseña actual SIGUE funcionando hasta que se usa la temporal;
-- al usarla, la temporal pasa a ser la contraseña y se exige cambiarla.
-- La usan: sp_usuario (SOLICITAR_RECUPERACION, DATOS_LOGIN, USAR_TEMPORAL,
--          CAMBIAR_CONTRASENA) -> usuarios.php (recuperar_contrasena, login)
-- ------------------------------------------------------------
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = 'poly_bison' AND TABLE_NAME = 'Usuario'
                  AND COLUMN_NAME = 'contrasena_temporal');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Usuario ADD COLUMN contrasena_temporal VARCHAR(255) NULL',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = 'poly_bison' AND TABLE_NAME = 'Usuario'
                  AND COLUMN_NAME = 'temporal_expira');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Usuario ADD COLUMN temporal_expira DATETIME NULL',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Verificación
-- ------------------------------------------------------------
SELECT COLUMN_NAME, COLUMN_DEFAULT, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'poly_bison'
  AND ((TABLE_NAME = 'Usuario' AND COLUMN_NAME IN ('id_rol', 'estado', 'debe_cambiar_contrasena',
                                                   'contrasena_temporal', 'temporal_expira'))
    OR (TABLE_NAME = 'Bloque_Horario' AND COLUMN_NAME = 'activo'));

SELECT CONSTRAINT_NAME, CHECK_CLAUSE
FROM information_schema.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'poly_bison' AND CONSTRAINT_NAME = 'chk_usuario_semestre';

-- ------------------------------------------------------------
-- [Paso 1 - OPCIONAL, recomendado] Cambiar la contraseña del usuario MySQL
-- La contraseña anterior quedó en el historial de git, así que conviene
-- cambiarla. Quita los comentarios, escribe la nueva clave aquí y la MISMA
-- en php/config.local.php ("pass"). No guardes este archivo con la clave real.
-- ------------------------------------------------------------
-- ALTER USER 'Bison'@'localhost' IDENTIFIED BY 'NUEVA_CLAVE_AQUI';
-- FLUSH PRIVILEGES;
