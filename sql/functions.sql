
SELECT DATABASE() AS base_de_datos_actual;

DROP FUNCTION IF EXISTS fn_total_reacciones;
DROP FUNCTION IF EXISTS fn_aula_disponible;
DROP FUNCTION IF EXISTS fn_generar_ticket;
DROP FUNCTION IF EXISTS fn_asistentes_reservacion;

DELIMITER $$

-- fn_total_reacciones(id_publicacion, tipo)
-- Cuenta las reacciones ('Like' o 'Dislike') de una publicación.

CREATE FUNCTION fn_total_reacciones(p_id_publicacion INT, p_tipo VARCHAR(10))
RETURNS INT
NOT DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total INT DEFAULT 0;
  SELECT COUNT(*) INTO v_total
  FROM Reaccion
  WHERE id_publicacion = p_id_publicacion
    AND tipo = p_tipo;
  RETURN v_total;
END$$

-- fn_aula_disponible(id_aula, fecha, id_bloque)
-- 1 si el aula y el bloque están activos y nadie ocupa ese horario (reservación Activa o Completada); 0 en caso contrario.

CREATE FUNCTION fn_aula_disponible(p_id_aula INT, p_fecha DATE, p_id_bloque INT)
RETURNS TINYINT(1)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
  IF NOT EXISTS (SELECT 1 FROM Aula WHERE id_aula = p_id_aula AND activo = TRUE) THEN
    RETURN 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM Bloque_Horario WHERE id_bloque = p_id_bloque AND activo = TRUE) THEN
    RETURN 0;
  END IF;

  IF EXISTS (SELECT 1 FROM Reservacion
             WHERE id_aula = p_id_aula
               AND fecha_reserva = p_fecha
               AND id_bloque = p_id_bloque
               AND ocupa = 1) THEN
    RETURN 0;
  END IF;

  RETURN 1;
END$$

-- fn_generar_ticket()
-- Genera un código único para Reservacion.codigo_ticket
-- Formato: PB-AAMMDD-XXXXXX (16 caracteres; la columna admite 20).

CREATE FUNCTION fn_generar_ticket()
RETURNS VARCHAR(20)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_ticket VARCHAR(20);
  REPEAT
    SET v_ticket = CONCAT('PB-', DATE_FORMAT(CURDATE(), '%y%m%d'), '-',
                          UPPER(SUBSTRING(MD5(RAND()), 1, 6)));
  UNTIL NOT EXISTS (SELECT 1 FROM Reservacion WHERE codigo_ticket = v_ticket)
  END REPEAT;
  RETURN v_ticket;
END$$

-- fn_asistentes_reservacion(id_reservacion)
-- Número de asistentes registrados en una reservación.

CREATE FUNCTION fn_asistentes_reservacion(p_id_reservacion INT)
RETURNS INT
NOT DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total INT DEFAULT 0;
  SELECT COUNT(*) INTO v_total
  FROM Estudiantes_Reservacion
  WHERE id_reservacion = p_id_reservacion;
  RETURN v_total;
END$$

DELIMITER ;

-- Verificación: deben aparecer 4 funciones

SHOW FUNCTION STATUS WHERE Db = DATABASE();
