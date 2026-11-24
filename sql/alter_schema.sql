
SELECT DATABASE() AS base_de_datos_actual;

--cambiar rol default
SET @id_estudiante := (SELECT id_rol FROM Rol WHERE nombre = 'Estudiante');
SET @sql := CONCAT('ALTER TABLE Usuario ALTER COLUMN id_rol SET DEFAULT ', @id_estudiante);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

--cambiar limite semestre
SELECT COUNT(*) AS usuarios_con_semestre_mayor_a_10
FROM Usuario WHERE semestre > 10;

-- Quita el CHECK anterior solo si existe
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

--bloque horario activo
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Bloque_Horario'
                  AND COLUMN_NAME = 'activo');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Bloque_Horario ADD COLUMN activo BOOL NOT NULL DEFAULT TRUE',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

--estado eliminado en usuario para borrado logico
ALTER TABLE Usuario
  MODIFY COLUMN estado ENUM('Pendiente','Aprobado','Rechazado','Baneado','Eliminado')
  NOT NULL DEFAULT 'Pendiente';

-- cambiar contraseña temporal y flag de cambio obligatorio
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario'
                  AND COLUMN_NAME = 'debe_cambiar_contrasena');
SET @sql := IF(@existe = 0,
               'ALTER TABLE Usuario ADD COLUMN debe_cambiar_contrasena BOOL NOT NULL DEFAULT FALSE',
               'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- contra temporal (hash generado)
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

-- verificacion de cambio de contra
SELECT COLUMN_NAME, COLUMN_DEFAULT, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'Usuario' AND COLUMN_NAME IN ('id_rol', 'estado', 'debe_cambiar_contrasena',
                                                   'contrasena_temporal', 'temporal_expira'))
    OR (TABLE_NAME = 'Bloque_Horario' AND COLUMN_NAME = 'activo'));

SELECT CONSTRAINT_NAME, CHECK_CLAUSE
FROM information_schema.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_usuario_semestre';

