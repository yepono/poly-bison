-- ============================================================
-- triggers.sql - Triggers
-- Se puede ejecutar más de una vez. MySQL 8.0.19+ (local, Workbench) o MariaDB 10.5+ (hosting, phpMyAdmin)
-- Requiere functions.sql (fn_asistentes_reservacion).
--
-- Convención de errores (igual en procedures.sql):
--   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '<código HTTP>|<mensaje para el usuario>'
--   El PHP separa el código y responde con ese status y ese mensaje.
-- ============================================================
-- Ejecutar con la base de datos destino seleccionada (ver table_creation.sql).
SELECT DATABASE() AS base_de_datos_actual;

DROP TRIGGER IF EXISTS trg_usuario_estado_au;
DROP TRIGGER IF EXISTS trg_asistente_capacidad_bi;
DROP TRIGGER IF EXISTS trg_reservacion_fecha_bi;

DELIMITER $$

-- ------------------------------------------------------------
-- trg_usuario_estado_au  (AFTER UPDATE en Usuario)
-- Si cambia el estado de una cuenta (aprobada, rechazada, baneada,
-- eliminada...) deja registro en Event_Log (bitácora).
-- Quién lo hizo: la variable de sesión @pb_id_actor (la asigna sp_usuario);
-- si no existe, se usa id_revisor; si tampoco, queda NULL = 'Sistema'.
-- Se dispara desde: usuarios.php (cambiar_estado, eliminar_cuenta) vía sp_usuario.
-- Se consulta en: vw_bitacora -> reportes.php (accion=bitacora).
-- ------------------------------------------------------------
CREATE TRIGGER trg_usuario_estado_au
AFTER UPDATE ON Usuario
FOR EACH ROW
BEGIN
  IF NOT (NEW.estado <=> OLD.estado) THEN
    INSERT INTO Event_Log (id_usuario, accion, tabla_afectada, id_registro_afectado, detalle)
    VALUES (
      COALESCE(@pb_id_actor, NEW.id_revisor),
      'Cambio de estado de cuenta',
      'Usuario',
      NEW.id_usuario,
      CONCAT(OLD.estado, ' -> ', NEW.estado,
             IF(NEW.motivo IS NOT NULL AND NEW.estado IN ('Rechazado', 'Baneado'),
                CONCAT('. Motivo: ', NEW.motivo), ''))
    );
  END IF;
END$$

-- ------------------------------------------------------------
-- trg_asistente_capacidad_bi  (BEFORE INSERT en Estudiantes_Reservacion)
-- Impide registrar más asistentes que la capacidad del aula.
-- Se dispara desde: reservaciones.php (crear) vía sp_reservacion AGREGAR_ASISTENTE.
-- Error -> HTTP 409.
-- ------------------------------------------------------------
CREATE TRIGGER trg_asistente_capacidad_bi
BEFORE INSERT ON Estudiantes_Reservacion
FOR EACH ROW
BEGIN
  DECLARE v_capacidad INT;

  SELECT a.capacidad INTO v_capacidad
  FROM Reservacion r
  JOIN Aula a ON a.id_aula = r.id_aula
  WHERE r.id_reservacion = NEW.id_reservacion;

  IF v_capacidad IS NOT NULL
     AND fn_asistentes_reservacion(NEW.id_reservacion) >= v_capacidad THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '409|Se excede la capacidad del aula';
  END IF;
END$$

-- ------------------------------------------------------------
-- trg_reservacion_fecha_bi  (BEFORE INSERT en Reservacion)
-- Impide reservar en una fecha pasada.
-- Se dispara desde: reservaciones.php (crear) vía sp_reservacion CREAR.
-- Error -> HTTP 400.
-- ------------------------------------------------------------
CREATE TRIGGER trg_reservacion_fecha_bi
BEFORE INSERT ON Reservacion
FOR EACH ROW
BEGIN
  IF NEW.fecha_reserva < CURDATE() THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = '400|No puedes reservar en una fecha pasada';
  END IF;
END$$

DELIMITER ;

-- Verificación: deben aparecer 3 triggers
-- (SHOW en lugar del catálogo del sistema: ver nota en functions.sql)
SHOW TRIGGERS;
