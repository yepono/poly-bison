-- alters al esquema de la base de datos (poly_bison) para que coincida con la app
SELECT DATABASE() AS base_de_datos_actual;

SET @id_estudiante := (SELECT id_rol FROM Rol WHERE nombre = 'Estudiante');
SET @sql := CONCAT('ALTER TABLE Usuario ALTER COLUMN id_rol SET DEFAULT ', @id_estudiante);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COUNT(*) AS usuarios_con_semestre_mayor_a_10
FROM Usuario WHERE semestre > 10;

SET @existe := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario'
                  AND CONSTRAINT_NAME = 'chk_usuario_semestre' AND CONSTRAINT_TYPE = 'CHECK');
SET @sql := IF(@existe > 0,
               'ALTER TABLE Usuario DROP CONSTRAINT chk_usuario_semestre',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE Usuario
  ADD CONSTRAINT chk_usuario_semestre CHECK (semestre IS NULL OR semestre BETWEEN 1 AND 10);

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Bloque_Horario'
                  AND COLUMN_NAME = 'activo');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Bloque_Horario ADD COLUMN activo BOOL NOT NULL DEFAULT TRUE',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE Usuario
  MODIFY COLUMN estado ENUM('Pendiente','Aprobado','Rechazado','Baneado','Eliminado')
  NOT NULL DEFAULT 'Pendiente';


SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario'
                  AND COLUMN_NAME = 'debe_cambiar_contrasena');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Usuario ADD COLUMN debe_cambiar_contrasena BOOL NOT NULL DEFAULT FALSE',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cambiar contraseña temporal (para recuperación de cuenta)
--   contrasena_temporal : hash de la clave enviada por correo (o NULL)
--   temporal_expira     : vence 30 minutos después de pedirla
-- La contraseña actual SIGUE funcionando hasta que se usa la temporal;
-- al usarla, la temporal pasa a ser la contraseña y se exige cambiarla.

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario'
                  AND COLUMN_NAME = 'contrasena_temporal');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Usuario ADD COLUMN contrasena_temporal VARCHAR(255) NULL',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario'
                  AND COLUMN_NAME = 'temporal_expira');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Usuario ADD COLUMN temporal_expira DATETIME NULL',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificación
SELECT COLUMN_NAME, COLUMN_DEFAULT, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'Usuario' AND COLUMN_NAME IN ('id_rol', 'estado', 'debe_cambiar_contrasena',
                                                   'contrasena_temporal', 'temporal_expira'))
    OR (TABLE_NAME = 'Bloque_Horario' AND COLUMN_NAME = 'activo'));

SELECT CONSTRAINT_NAME, CHECK_CLAUSE
FROM information_schema.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_usuario_semestre';

