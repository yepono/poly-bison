-- ============================================================
-- procedures.sql - Rutinas globales: UNA por entidad, acciones con CASE
-- Se puede ejecutar más de una vez. MySQL Server 8.0 (Workbench, como root)
-- Requiere: alter_schema.sql, functions.sql, triggers.sql
--
-- Reglas comunes:
--  * Escrituras con rutinas; lecturas con vistas.
--  * p_id_actor = usuario de la sesión (lo manda PHP, nunca el cliente).
--    Las rutinas vuelven a validar permisos (defensa en profundidad).
--  * Errores de negocio:
--      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '<código HTTP>|<mensaje>'
--    Duplicados (UNIQUE) llegan a PHP como error 1062 -> HTTP 409.
--  * Las rutinas NO abren transacciones; cuando una operación usa varias
--    llamadas (o varias tablas), PHP la envuelve en una transacción.
--  * Cada acción termina con un SELECT (id creado o filas afectadas).
-- ============================================================
USE poly_bison;

DROP PROCEDURE IF EXISTS sp_usuario;
DROP PROCEDURE IF EXISTS sp_publicacion;
DROP PROCEDURE IF EXISTS sp_multimedia;
DROP PROCEDURE IF EXISTS sp_comentario;
DROP PROCEDURE IF EXISTS sp_reaccion;
DROP PROCEDURE IF EXISTS sp_reservacion;
DROP PROCEDURE IF EXISTS sp_bloque_horario;
DROP PROCEDURE IF EXISTS sp_evento;
DROP PROCEDURE IF EXISTS sp_producto;

DELIMITER $$

-- ------------------------------------------------------------
-- sp_usuario  -> usuarios.php
-- Acciones:
--   REGISTRAR           alta de estudiante (rol por DEFAULT, estado Pendiente)
--   CREAR_MODERADOR     solo Administrador (D14); pide matrícula, carrera y
--                       semestre (todos son estudiantes); queda Aprobado y con
--                       debe_cambiar_contrasena = TRUE (clave temporal)
--   DATOS_LOGIN         id, hash, estado y motivo por correo (o por id si
--                       p_correo es NULL), más el hash de la clave temporal
--                       de recuperación y si sigue vigente. Los hashes nunca
--                       salen de PHP.
--   SOLICITAR_RECUPERACION  (R12, Q2-A) guarda el hash de una clave temporal
--                       que vence en 30 min. Solo cuentas Aprobadas; máximo
--                       una solicitud cada 5 min. Regresa enviar = 1/0 (PHP
--                       responde igual en ambos casos). Registra en Event_Log.
--   USAR_TEMPORAL       al entrar con la clave temporal: pasa a ser la
--                       contraseña, se borra la temporal y se exige cambiarla
--   ACTUALIZAR_PERFIL   correo, carrera, semestre (D13) - solo la propia cuenta
--   CAMBIAR_CONTRASENA  guarda el nuevo hash y quita la marca de clave
--                       temporal y cualquier recuperación pendiente - solo la
--                       propia cuenta
--   ACTUALIZAR_FOTO     guarda/quita el avatar (BLOB) - solo la propia cuenta
--   CAMBIAR_ESTADO      Admin/Moderador: Pendiente/Aprobado/Rechazado/Baneado (D15)
--   ELIMINAR            borrado lógico + anonimización de la propia cuenta (D12)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_usuario(
  IN p_accion      VARCHAR(30),
  IN p_id_usuario  INT,
  IN p_id_actor    INT,
  IN p_matricula   VARCHAR(10),
  IN p_nombre      VARCHAR(250),
  IN p_alias       VARCHAR(50),
  IN p_correo      VARCHAR(150),
  IN p_contrasena  VARCHAR(255),
  IN p_id_carrera  INT,
  IN p_semestre    INT,
  IN p_foto        LONGBLOB,
  IN p_foto_mime   VARCHAR(50),
  IN p_estado      VARCHAR(20),
  IN p_motivo      VARCHAR(300)
)
BEGIN
  DECLARE v_rol_actor  VARCHAR(50);
  DECLARE v_rol_obj    VARCHAR(50);
  DECLARE v_estado_obj VARCHAR(20);

  -- Para la bitácora (trg_usuario_estado_au)
  SET @pb_id_actor = p_id_actor;

  SET v_rol_actor = (SELECT r.nombre FROM Usuario u JOIN Rol r ON r.id_rol = u.id_rol
                     WHERE u.id_usuario = p_id_actor AND u.estado = 'Aprobado');
  SET v_rol_obj    = (SELECT r.nombre FROM Usuario u JOIN Rol r ON r.id_rol = u.id_rol
                      WHERE u.id_usuario = p_id_usuario);
  SET v_estado_obj = (SELECT estado FROM Usuario WHERE id_usuario = p_id_usuario);

  CASE p_accion

  WHEN 'REGISTRAR' THEN
    IF NOT EXISTS (SELECT 1 FROM Carreras WHERE id_carrera = p_id_carrera AND activo = TRUE) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Carrera no válida';
    END IF;
    IF p_semestre IS NULL OR p_semestre NOT BETWEEN 1 AND 10 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Semestre no válido';
    END IF;
    IF p_matricula IS NULL OR p_matricula NOT REGEXP '^[0-9]{7}$' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|La matrícula debe tener 7 dígitos';
    END IF;
    -- id_rol y estado toman su DEFAULT (Estudiante / Pendiente)
    INSERT INTO Usuario (matricula, nombre_completo, alias, correo, contrasena,
                         id_carrera, semestre, foto_blob, foto_mime)
    VALUES (p_matricula, p_nombre, p_alias, p_correo, p_contrasena,
            p_id_carrera, p_semestre, p_foto, p_foto_mime);
    SELECT LAST_INSERT_ID() AS id_usuario;

  WHEN 'CREAR_MODERADOR' THEN
    IF v_rol_actor IS NULL OR v_rol_actor <> 'Administrador' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo un administrador puede dar de alta moderadores';
    END IF;
    -- Todos los usuarios son estudiantes: matrícula, carrera y semestre obligatorios (P3)
    IF p_matricula IS NULL OR p_matricula NOT REGEXP '^[0-9]{7}$' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|La matrícula debe tener 7 dígitos';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM Carreras WHERE id_carrera = p_id_carrera AND activo = TRUE) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Carrera no válida';
    END IF;
    IF p_semestre IS NULL OR p_semestre NOT BETWEEN 1 AND 10 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Semestre no válido';
    END IF;
    -- Clave temporal: debe cambiarla en su primer inicio de sesión
    INSERT INTO Usuario (id_rol, matricula, nombre_completo, alias, correo, contrasena,
                         id_carrera, semestre,
                         estado, id_revisor, fecha_revision, debe_cambiar_contrasena)
    VALUES ((SELECT id_rol FROM Rol WHERE nombre = 'Moderador'),
            p_matricula, p_nombre, p_alias, p_correo, p_contrasena,
            p_id_carrera, p_semestre,
            'Aprobado', p_id_actor, NOW(), TRUE);
    SELECT LAST_INSERT_ID() AS id_usuario;

  WHEN 'DATOS_LOGIN' THEN
    SELECT id_usuario, contrasena, estado, motivo,
           contrasena_temporal,
           (contrasena_temporal IS NOT NULL AND temporal_expira > NOW()) AS temporal_vigente
    FROM Usuario
    WHERE (p_correo IS NOT NULL AND correo = p_correo)
       OR (p_correo IS NULL AND id_usuario = p_id_usuario);

  WHEN 'SOLICITAR_RECUPERACION' THEN
    -- p_contrasena = hash de la clave temporal generada por PHP
    SET p_id_usuario = (SELECT id_usuario FROM Usuario
                        WHERE correo = p_correo AND estado = 'Aprobado');
    IF p_id_usuario IS NULL THEN
      -- No existe o no está aprobada: no se envía nada (PHP responde igual)
      SELECT 0 AS enviar, NULL AS id_usuario, NULL AS nombre_completo;
    ELSEIF EXISTS (SELECT 1 FROM Usuario
                   WHERE id_usuario = p_id_usuario
                     AND temporal_expira > NOW() + INTERVAL 25 MINUTE) THEN
      -- Ya se pidió una hace menos de 5 minutos
      SELECT 0 AS enviar, NULL AS id_usuario, NULL AS nombre_completo;
    ELSE
      UPDATE Usuario
         SET contrasena_temporal = p_contrasena,
             temporal_expira     = NOW() + INTERVAL 30 MINUTE
       WHERE id_usuario = p_id_usuario;
      INSERT INTO Event_Log (id_usuario, accion, tabla_afectada, id_registro_afectado, detalle)
      VALUES (p_id_usuario, 'Recuperación de contraseña', 'Usuario', p_id_usuario,
              'Se envió una contraseña temporal por correo (vence en 30 minutos)');
      SELECT 1 AS enviar, id_usuario, nombre_completo
      FROM Usuario WHERE id_usuario = p_id_usuario;
    END IF;

  WHEN 'USAR_TEMPORAL' THEN
    -- PHP ya verificó la clave temporal vigente con password_verify
    UPDATE Usuario
       SET contrasena              = contrasena_temporal,
           contrasena_temporal     = NULL,
           temporal_expira         = NULL,
           debe_cambiar_contrasena = TRUE
     WHERE id_usuario = p_id_usuario
       AND contrasena_temporal IS NOT NULL
       AND temporal_expira > NOW();
    SELECT ROW_COUNT() AS afectados;

  WHEN 'ACTUALIZAR_PERFIL' THEN
    IF v_estado_obj IS NULL OR v_estado_obj = 'Eliminado' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Usuario no encontrado';
    END IF;
    IF p_id_actor IS NULL OR p_id_actor <> p_id_usuario THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo puedes editar tu propia cuenta';
    END IF;
    IF p_id_carrera IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM Carreras WHERE id_carrera = p_id_carrera AND activo = TRUE) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Carrera no válida';
    END IF;
    IF p_semestre IS NOT NULL AND p_semestre NOT BETWEEN 1 AND 10 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Semestre no válido';
    END IF;
    UPDATE Usuario
       SET correo     = COALESCE(p_correo, correo),
           id_carrera = COALESCE(p_id_carrera, id_carrera),
           semestre   = COALESCE(p_semestre, semestre)
     WHERE id_usuario = p_id_usuario;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'CAMBIAR_CONTRASENA' THEN
    IF p_id_actor IS NULL OR p_id_actor <> p_id_usuario THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo puedes cambiar tu propia contraseña';
    END IF;
    IF p_contrasena IS NULL OR p_contrasena = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Contraseña no válida';
    END IF;
    UPDATE Usuario
       SET contrasena = p_contrasena,
           debe_cambiar_contrasena = FALSE,
           contrasena_temporal = NULL,
           temporal_expira = NULL
     WHERE id_usuario = p_id_usuario;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'ACTUALIZAR_FOTO' THEN
    IF p_id_actor IS NULL OR p_id_actor <> p_id_usuario THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo puedes cambiar tu propia foto';
    END IF;
    UPDATE Usuario
       SET foto_blob = p_foto,
           foto_mime = IF(p_foto IS NULL, NULL, p_foto_mime)
     WHERE id_usuario = p_id_usuario;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'CAMBIAR_ESTADO' THEN
    IF v_rol_actor IS NULL OR v_rol_actor NOT IN ('Administrador', 'Moderador') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|No tienes permiso para realizar esta acción';
    END IF;
    IF p_estado IS NULL OR p_estado NOT IN ('Pendiente', 'Aprobado', 'Rechazado', 'Baneado') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Estado no válido';
    END IF;
    IF v_estado_obj IS NULL OR v_estado_obj = 'Eliminado' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Usuario no encontrado';
    END IF;
    IF p_id_usuario = p_id_actor THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|No puedes cambiar el estado de tu propia cuenta';
    END IF;
    IF v_rol_obj = 'Administrador' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|No se puede cambiar el estado de un administrador';
    END IF;
    IF v_rol_obj = 'Moderador' AND v_rol_actor <> 'Administrador' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo un administrador puede cambiar el estado de un moderador';
    END IF;
    UPDATE Usuario
       SET estado         = p_estado,
           motivo         = IF(p_estado IN ('Rechazado', 'Baneado'), p_motivo, NULL),
           id_revisor     = p_id_actor,
           fecha_revision = NOW()
     WHERE id_usuario = p_id_usuario;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'ELIMINAR' THEN
    IF v_estado_obj IS NULL OR v_estado_obj = 'Eliminado' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Usuario no encontrado';
    END IF;
    IF p_id_actor IS NULL OR p_id_actor <> p_id_usuario THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo puedes eliminar tu propia cuenta';
    END IF;
    IF v_rol_obj = 'Administrador' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Las cuentas de administrador no se pueden eliminar';
    END IF;
    -- Contenido del usuario: se oculta (borrado lógico)
    UPDATE Publicacion SET estado = 'Eliminada'
     WHERE id_usuario = p_id_usuario AND estado = 'Activa';
    UPDATE Comentario SET estado = 'Eliminado'
     WHERE id_usuario = p_id_usuario AND estado = 'Activo';
    DELETE FROM Reaccion WHERE id_usuario = p_id_usuario;
    UPDATE Reservacion SET estado = 'Cancelada'
     WHERE id_usuario = p_id_usuario AND estado = 'Activa' AND fecha_reserva >= CURDATE();
    -- Anonimización: se conserva la fila por las llaves foráneas
    UPDATE Usuario
       SET estado          = 'Eliminado',
           matricula       = NULL,
           nombre_completo = 'Usuario eliminado',
           alias           = CONCAT('eliminado_', id_usuario),
           correo          = CONCAT('eliminado_', id_usuario, '@eliminado.local'),
           contrasena      = '',
           foto_blob       = NULL,
           foto_mime       = NULL,
           motivo          = NULL
     WHERE id_usuario = p_id_usuario;
    SELECT ROW_COUNT() AS afectados;

  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Acción no válida';
  END CASE;

  SET @pb_id_actor = NULL;
END$$

-- ------------------------------------------------------------
-- sp_publicacion  -> publicaciones.php
-- Acciones:
--   CREAR     título (obligatorio, D4), descripción (D5) y una etiqueta (D6)
--   EDITAR    solo el autor; parámetros NULL = no cambiar
--   ELIMINAR  borrado lógico; el autor o Administrador/Moderador (D15)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_publicacion(
  IN p_accion          VARCHAR(30),
  IN p_id_publicacion  INT,
  IN p_id_actor        INT,
  IN p_titulo          VARCHAR(250),
  IN p_descripcion     VARCHAR(600),
  IN p_id_etiqueta     INT
)
BEGIN
  DECLARE v_rol_actor VARCHAR(50);
  DECLARE v_autor     INT;
  DECLARE v_id        INT;

  SET v_rol_actor = (SELECT r.nombre FROM Usuario u JOIN Rol r ON r.id_rol = u.id_rol
                     WHERE u.id_usuario = p_id_actor AND u.estado = 'Aprobado');
  IF v_rol_actor IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '401|Sesión no válida';
  END IF;

  SET v_autor = (SELECT id_usuario FROM Publicacion
                 WHERE id_publicacion = p_id_publicacion AND estado = 'Activa');

  CASE p_accion

  WHEN 'CREAR' THEN
    IF p_titulo IS NULL OR TRIM(p_titulo) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El título es obligatorio';
    END IF;
    IF p_descripcion IS NULL OR TRIM(p_descripcion) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El contenido es obligatorio';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM Etiqueta WHERE id_etiqueta = p_id_etiqueta AND activo = TRUE) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Etiqueta no válida';
    END IF;
    INSERT INTO Publicacion (id_usuario, titulo, descripcion)
    VALUES (p_id_actor, TRIM(p_titulo), TRIM(p_descripcion));
    SET v_id = LAST_INSERT_ID();
    INSERT INTO Publicacion_Etiqueta (id_publicacion, id_etiqueta) VALUES (v_id, p_id_etiqueta);
    SELECT v_id AS id_publicacion;

  WHEN 'EDITAR' THEN
    IF v_autor IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Publicación no encontrada';
    END IF;
    IF v_autor <> p_id_actor THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo el autor puede editar la publicación';
    END IF;
    IF p_titulo IS NOT NULL AND TRIM(p_titulo) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El título es obligatorio';
    END IF;
    IF p_descripcion IS NOT NULL AND TRIM(p_descripcion) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El contenido es obligatorio';
    END IF;
    IF p_id_etiqueta IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM Etiqueta WHERE id_etiqueta = p_id_etiqueta AND activo = TRUE) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Etiqueta no válida';
    END IF;
    UPDATE Publicacion
       SET titulo      = COALESCE(TRIM(p_titulo), titulo),
           descripcion = COALESCE(TRIM(p_descripcion), descripcion)
     WHERE id_publicacion = p_id_publicacion;
    IF p_id_etiqueta IS NOT NULL THEN
      DELETE FROM Publicacion_Etiqueta WHERE id_publicacion = p_id_publicacion;
      INSERT INTO Publicacion_Etiqueta (id_publicacion, id_etiqueta)
      VALUES (p_id_publicacion, p_id_etiqueta);
    END IF;
    SELECT p_id_publicacion AS id_publicacion;

  WHEN 'ELIMINAR' THEN
    IF v_autor IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Publicación no encontrada';
    END IF;
    IF v_autor <> p_id_actor AND v_rol_actor NOT IN ('Administrador', 'Moderador') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|No puedes eliminar esta publicación';
    END IF;
    UPDATE Publicacion SET estado = 'Eliminada' WHERE id_publicacion = p_id_publicacion;
    SELECT ROW_COUNT() AS afectados;

  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Acción no válida';
  END CASE;
END$$

-- ------------------------------------------------------------
-- sp_multimedia  -> publicaciones.php (crear / editar)
-- Una imagen O un video por publicación (D7). Solo el autor.
-- Acciones:
--   AGREGAR_IMAGEN  BLOB + MIME (PHP ya validó tipo y tamaño)
--   AGREGAR_VIDEO   URL externa (PHP ya validó que sea YouTube)
--   ELIMINAR        quita el archivo (para reemplazarlo al editar)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_multimedia(
  IN p_accion          VARCHAR(30),
  IN p_id_multimedia   INT,
  IN p_id_publicacion  INT,
  IN p_id_actor        INT,
  IN p_blob            LONGBLOB,
  IN p_mime            VARCHAR(50),
  IN p_nombre          VARCHAR(200),
  IN p_tamanio         INT,
  IN p_video_url       VARCHAR(500)
)
BEGIN
  DECLARE v_autor INT;
  DECLARE v_pub   INT;

  IF p_accion = 'ELIMINAR' THEN
    SET v_pub = (SELECT id_publicacion FROM Multimedia WHERE id_multimedia = p_id_multimedia);
  ELSE
    SET v_pub = p_id_publicacion;
  END IF;

  SET v_autor = (SELECT id_usuario FROM Publicacion
                 WHERE id_publicacion = v_pub AND estado = 'Activa');
  IF v_autor IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Publicación no encontrada';
  END IF;
  IF p_id_actor IS NULL OR v_autor <> p_id_actor THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo el autor puede modificar la multimedia';
  END IF;

  CASE p_accion

  WHEN 'AGREGAR_IMAGEN' THEN
    IF EXISTS (SELECT 1 FROM Multimedia WHERE id_publicacion = v_pub) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '409|La publicación ya tiene un archivo multimedia';
    END IF;
    IF p_blob IS NULL OR p_mime NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Imagen no válida';
    END IF;
    INSERT INTO Multimedia (id_publicacion, tipo, mult_blob, mult_mime, mult_nombre, mult_tamanio)
    VALUES (v_pub, 'Imagen', p_blob, p_mime, p_nombre, p_tamanio);
    SELECT LAST_INSERT_ID() AS id_multimedia;

  WHEN 'AGREGAR_VIDEO' THEN
    IF EXISTS (SELECT 1 FROM Multimedia WHERE id_publicacion = v_pub) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '409|La publicación ya tiene un archivo multimedia';
    END IF;
    IF p_video_url IS NULL OR TRIM(p_video_url) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|URL de video no válida';
    END IF;
    INSERT INTO Multimedia (id_publicacion, tipo, video_url)
    VALUES (v_pub, 'Video', TRIM(p_video_url));
    SELECT LAST_INSERT_ID() AS id_multimedia;

  WHEN 'ELIMINAR' THEN
    DELETE FROM Multimedia WHERE id_multimedia = p_id_multimedia;
    SELECT ROW_COUNT() AS afectados;

  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Acción no válida';
  END CASE;
END$$

-- ------------------------------------------------------------
-- sp_comentario  -> comentarios.php
-- Acciones:
--   CREAR     en una publicación activa (máx. 500 caracteres, D5)
--   ELIMINAR  borrado lógico; el autor o Administrador/Moderador (D15)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_comentario(
  IN p_accion          VARCHAR(30),
  IN p_id_comentario   INT,
  IN p_id_publicacion  INT,
  IN p_id_actor        INT,
  IN p_contenido       VARCHAR(500)
)
BEGIN
  DECLARE v_rol_actor VARCHAR(50);
  DECLARE v_autor     INT;

  SET v_rol_actor = (SELECT r.nombre FROM Usuario u JOIN Rol r ON r.id_rol = u.id_rol
                     WHERE u.id_usuario = p_id_actor AND u.estado = 'Aprobado');
  IF v_rol_actor IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '401|Sesión no válida';
  END IF;

  CASE p_accion

  WHEN 'CREAR' THEN
    IF NOT EXISTS (SELECT 1 FROM Publicacion
                   WHERE id_publicacion = p_id_publicacion AND estado = 'Activa') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Publicación no encontrada';
    END IF;
    IF p_contenido IS NULL OR TRIM(p_contenido) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El comentario no puede estar vacío';
    END IF;
    INSERT INTO Comentario (id_publicacion, id_usuario, contenido)
    VALUES (p_id_publicacion, p_id_actor, TRIM(p_contenido));
    SELECT LAST_INSERT_ID() AS id_comentario;

  WHEN 'ELIMINAR' THEN
    SET v_autor = (SELECT id_usuario FROM Comentario
                   WHERE id_comentario = p_id_comentario AND estado = 'Activo');
    IF v_autor IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Comentario no encontrado';
    END IF;
    IF v_autor <> p_id_actor AND v_rol_actor NOT IN ('Administrador', 'Moderador') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|No puedes eliminar este comentario';
    END IF;
    UPDATE Comentario SET estado = 'Eliminado' WHERE id_comentario = p_id_comentario;
    SELECT ROW_COUNT() AS afectados;

  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Acción no válida';
  END CASE;
END$$

-- ------------------------------------------------------------
-- sp_reaccion  -> reacciones.php
-- Acciones:
--   ALTERNAR  da o quita "Like"; regresa liked (0/1) y el nuevo total
--             (fn_total_reacciones)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_reaccion(
  IN p_accion          VARCHAR(30),
  IN p_id_publicacion  INT,
  IN p_id_actor        INT
)
BEGIN
  DECLARE v_liked TINYINT(1);

  IF NOT EXISTS (SELECT 1 FROM Usuario WHERE id_usuario = p_id_actor AND estado = 'Aprobado') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '401|Sesión no válida';
  END IF;

  CASE p_accion

  WHEN 'ALTERNAR' THEN
    IF NOT EXISTS (SELECT 1 FROM Publicacion
                   WHERE id_publicacion = p_id_publicacion AND estado = 'Activa') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Publicación no encontrada';
    END IF;
    IF EXISTS (SELECT 1 FROM Reaccion
               WHERE id_usuario = p_id_actor AND id_publicacion = p_id_publicacion
                 AND tipo = 'Like') THEN
      DELETE FROM Reaccion
       WHERE id_usuario = p_id_actor AND id_publicacion = p_id_publicacion;
      SET v_liked = 0;
    ELSE
      INSERT INTO Reaccion (id_usuario, id_publicacion, tipo)
      VALUES (p_id_actor, p_id_publicacion, 'Like')
      ON DUPLICATE KEY UPDATE tipo = 'Like', fecha = NOW();
      SET v_liked = 1;
    END IF;
    SELECT v_liked AS liked,
           fn_total_reacciones(p_id_publicacion, 'Like') AS total_likes;

  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Acción no válida';
  END CASE;
END$$

-- ------------------------------------------------------------
-- sp_reservacion  -> reservaciones.php
-- Acciones:
--   CREAR              valida aula/bloque/disponibilidad (fn_aula_disponible)
--                      y genera el ticket (fn_generar_ticket).
--                      Fecha pasada -> trg_reservacion_fecha_bi.
--                      1 por día por usuario -> UNIQUE uq_user_dia (1062).
--   AGREGAR_ASISTENTE  matrícula de 7 dígitos (D16); capacidad ->
--                      trg_asistente_capacidad_bi. PHP lo llama una vez por
--                      asistente dentro de la misma transacción que CREAR.
--   CANCELAR           solo el dueño, solo si está Activa y no es pasada
-- ------------------------------------------------------------
CREATE PROCEDURE sp_reservacion(
  IN p_accion          VARCHAR(30),
  IN p_id_reservacion  INT,
  IN p_id_actor        INT,
  IN p_id_aula         INT,
  IN p_fecha           DATE,
  IN p_id_bloque       INT,
  IN p_matricula       VARCHAR(10),
  IN p_nombre          VARCHAR(250)
)
BEGIN
  DECLARE v_dueno  INT;
  DECLARE v_estado VARCHAR(20);
  DECLARE v_fecha  DATE;
  DECLARE v_ticket VARCHAR(20);

  IF NOT EXISTS (SELECT 1 FROM Usuario WHERE id_usuario = p_id_actor AND estado = 'Aprobado') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '401|Sesión no válida';
  END IF;

  CASE p_accion

  WHEN 'CREAR' THEN
    IF NOT EXISTS (SELECT 1 FROM Aula WHERE id_aula = p_id_aula AND activo = TRUE) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Aula no encontrada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM Bloque_Horario WHERE id_bloque = p_id_bloque AND activo = TRUE) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Horario no disponible';
    END IF;
    IF p_fecha IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Fecha no válida';
    END IF;
    IF fn_aula_disponible(p_id_aula, p_fecha, p_id_bloque) = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '409|Ese horario ya está ocupado';
    END IF;
    SET v_ticket = fn_generar_ticket();
    INSERT INTO Reservacion (id_aula, id_usuario, id_bloque, fecha_reserva, codigo_ticket)
    VALUES (p_id_aula, p_id_actor, p_id_bloque, p_fecha, v_ticket);
    SELECT LAST_INSERT_ID() AS id_reservacion, v_ticket AS codigo_ticket;

  WHEN 'AGREGAR_ASISTENTE' THEN
    SET v_dueno = (SELECT id_usuario FROM Reservacion
                   WHERE id_reservacion = p_id_reservacion AND estado = 'Activa');
    IF v_dueno IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Reservación no encontrada';
    END IF;
    IF v_dueno <> p_id_actor THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Esta reservación no es tuya';
    END IF;
    IF p_matricula IS NULL OR p_matricula NOT REGEXP '^[0-9]{7}$' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|La matrícula debe tener 7 dígitos';
    END IF;
    IF p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El nombre del asistente es obligatorio';
    END IF;
    INSERT INTO Estudiantes_Reservacion (id_reservacion, matricula, nombre)
    VALUES (p_id_reservacion, p_matricula, TRIM(p_nombre));
    SELECT LAST_INSERT_ID() AS id_asistente;

  WHEN 'CANCELAR' THEN
    SET v_dueno  = (SELECT id_usuario    FROM Reservacion WHERE id_reservacion = p_id_reservacion);
    SET v_estado = (SELECT estado        FROM Reservacion WHERE id_reservacion = p_id_reservacion);
    SET v_fecha  = (SELECT fecha_reserva FROM Reservacion WHERE id_reservacion = p_id_reservacion);
    IF v_dueno IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Reservación no encontrada';
    END IF;
    IF v_dueno <> p_id_actor THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Esta reservación no es tuya';
    END IF;
    IF v_estado <> 'Activa' OR v_fecha < CURDATE() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '409|La reservación ya no se puede cancelar';
    END IF;
    UPDATE Reservacion SET estado = 'Cancelada' WHERE id_reservacion = p_id_reservacion;
    SELECT ROW_COUNT() AS afectados;

  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Acción no válida';
  END CASE;
END$$

-- ------------------------------------------------------------
-- sp_bloque_horario  -> reservaciones.php (panel admin "Horarios", D9)
-- Solo Administrador.
-- Acciones:
--   CREAR       nuevo bloque (hora_fin > hora_inicio; duplicado -> 1062)
--   EDITAR      cambia horas solo si el bloque NO tiene reservaciones
--   ACTIVAR     vuelve a ofrecer el bloque
--   DESACTIVAR  deja de ofrecerlo (no se borra: puede tener reservaciones)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_bloque_horario(
  IN p_accion       VARCHAR(30),
  IN p_id_bloque    INT,
  IN p_id_actor     INT,
  IN p_hora_inicio  TIME,
  IN p_hora_fin     TIME
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM Usuario u JOIN Rol r ON r.id_rol = u.id_rol
                 WHERE u.id_usuario = p_id_actor AND u.estado = 'Aprobado'
                   AND r.nombre = 'Administrador') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo un administrador puede editar horarios';
  END IF;

  IF p_accion <> 'CREAR'
     AND NOT EXISTS (SELECT 1 FROM Bloque_Horario WHERE id_bloque = p_id_bloque) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Horario no encontrado';
  END IF;

  CASE p_accion

  WHEN 'CREAR' THEN
    IF p_hora_inicio IS NULL OR p_hora_fin IS NULL OR p_hora_fin <= p_hora_inicio THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|La hora de fin debe ser posterior a la de inicio';
    END IF;
    INSERT INTO Bloque_Horario (hora_inicio, hora_fin) VALUES (p_hora_inicio, p_hora_fin);
    SELECT LAST_INSERT_ID() AS id_bloque;

  WHEN 'EDITAR' THEN
    IF p_hora_inicio IS NULL OR p_hora_fin IS NULL OR p_hora_fin <= p_hora_inicio THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|La hora de fin debe ser posterior a la de inicio';
    END IF;
    IF EXISTS (SELECT 1 FROM Reservacion WHERE id_bloque = p_id_bloque) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '409|Este horario ya tiene reservaciones; desactívalo y crea uno nuevo';
    END IF;
    UPDATE Bloque_Horario
       SET hora_inicio = p_hora_inicio, hora_fin = p_hora_fin
     WHERE id_bloque = p_id_bloque;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'ACTIVAR' THEN
    UPDATE Bloque_Horario SET activo = TRUE WHERE id_bloque = p_id_bloque;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'DESACTIVAR' THEN
    UPDATE Bloque_Horario SET activo = FALSE WHERE id_bloque = p_id_bloque;
    SELECT ROW_COUNT() AS afectados;

  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Acción no válida';
  END CASE;
END$$

-- ------------------------------------------------------------
-- sp_evento  -> eventos.php
-- Administrador o Moderador (D15).
-- Acciones:
--   CREAR     título, tipo, inicio/fin (fin >= inicio), lugar, descripción
--   EDITAR    parámetros NULL = no cambiar
--   OCULTAR   visible = 0 (botón "Ocultar" del panel)
--   MOSTRAR   visible = 1 (botón "Mostrar" del panel)
--   ELIMINAR  borrado físico (ninguna tabla depende de Eventos)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_evento(
  IN p_accion       VARCHAR(30),
  IN p_id_evento    INT,
  IN p_id_actor     INT,
  IN p_titulo       VARCHAR(200),
  IN p_descripcion  TEXT,
  IN p_tipo         VARCHAR(20),
  IN p_inicio       DATETIME,
  IN p_fin          DATETIME,
  IN p_lugar        VARCHAR(150)
)
BEGIN
  DECLARE v_inicio DATETIME;
  DECLARE v_fin    DATETIME;

  IF NOT EXISTS (SELECT 1 FROM Usuario u JOIN Rol r ON r.id_rol = u.id_rol
                 WHERE u.id_usuario = p_id_actor AND u.estado = 'Aprobado'
                   AND r.nombre IN ('Administrador', 'Moderador')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|No tienes permiso para gestionar eventos';
  END IF;

  IF p_accion <> 'CREAR'
     AND NOT EXISTS (SELECT 1 FROM Eventos WHERE id_evento = p_id_evento) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Evento no encontrado';
  END IF;

  IF p_tipo IS NOT NULL
     AND p_tipo NOT IN ('Académico', 'Examen', 'Asueto', 'Cultural', 'Deportivo') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Tipo de evento no válido';
  END IF;

  CASE p_accion

  WHEN 'CREAR' THEN
    IF p_titulo IS NULL OR TRIM(p_titulo) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El título es obligatorio';
    END IF;
    IF p_tipo IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Tipo de evento no válido';
    END IF;
    IF p_inicio IS NULL OR p_fin IS NULL OR p_fin < p_inicio THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|La fecha de fin debe ser posterior a la de inicio';
    END IF;
    INSERT INTO Eventos (titulo, descripcion, tipo, fecha_inicio, fecha_fin, lugar, id_creador)
    VALUES (TRIM(p_titulo), p_descripcion, p_tipo, p_inicio, p_fin, p_lugar, p_id_actor);
    SELECT LAST_INSERT_ID() AS id_evento;

  WHEN 'EDITAR' THEN
    IF p_titulo IS NOT NULL AND TRIM(p_titulo) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El título es obligatorio';
    END IF;
    SELECT COALESCE(p_inicio, fecha_inicio), COALESCE(p_fin, fecha_fin)
      INTO v_inicio, v_fin
    FROM Eventos WHERE id_evento = p_id_evento;
    IF v_fin < v_inicio THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|La fecha de fin debe ser posterior a la de inicio';
    END IF;
    UPDATE Eventos
       SET titulo       = COALESCE(TRIM(p_titulo), titulo),
           descripcion  = COALESCE(p_descripcion, descripcion),
           tipo         = COALESCE(p_tipo, tipo),
           fecha_inicio = v_inicio,
           fecha_fin    = v_fin,
           lugar        = COALESCE(p_lugar, lugar)
     WHERE id_evento = p_id_evento;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'OCULTAR' THEN
    UPDATE Eventos SET visible = FALSE WHERE id_evento = p_id_evento;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'MOSTRAR' THEN
    UPDATE Eventos SET visible = TRUE WHERE id_evento = p_id_evento;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'ELIMINAR' THEN
    DELETE FROM Eventos WHERE id_evento = p_id_evento;
    SELECT ROW_COUNT() AS afectados;

  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Acción no válida';
  END CASE;
END$$

-- ------------------------------------------------------------
-- sp_producto  -> productos.php
-- Solo Administrador (D15).
-- Acciones:
--   CREAR       categoría, nombre, descripción, precio, stock, foto BLOB (D10)
--   EDITAR      parámetros NULL = no cambiar (la foto solo si se manda)
--   DESACTIVAR  estado = 0 (botón "Eliminar" del panel; no se borra)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_producto(
  IN p_accion        VARCHAR(30),
  IN p_id_producto   INT,
  IN p_id_actor      INT,
  IN p_id_categoria  INT,
  IN p_nombre        VARCHAR(200),
  IN p_descripcion   VARCHAR(500),
  IN p_precio        DECIMAL(8,2),
  IN p_stock         INT,
  IN p_foto          LONGBLOB,
  IN p_foto_mime     VARCHAR(50)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM Usuario u JOIN Rol r ON r.id_rol = u.id_rol
                 WHERE u.id_usuario = p_id_actor AND u.estado = 'Aprobado'
                   AND r.nombre = 'Administrador') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '403|Solo un administrador puede gestionar la tienda';
  END IF;

  IF p_accion <> 'CREAR'
     AND NOT EXISTS (SELECT 1 FROM Productos WHERE id_producto = p_id_producto AND estado = TRUE) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '404|Producto no encontrado';
  END IF;

  IF p_id_categoria IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM Categoria_Producto WHERE id_categoria = p_id_categoria AND activo = TRUE) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Categoría no válida';
  END IF;
  IF p_precio IS NOT NULL AND p_precio < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El precio no puede ser negativo';
  END IF;
  IF p_stock IS NOT NULL AND p_stock < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El stock no puede ser negativo';
  END IF;
  IF p_foto IS NOT NULL AND (p_foto_mime IS NULL OR p_foto_mime NOT IN ('image/jpeg', 'image/png', 'image/webp')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Imagen no válida';
  END IF;

  CASE p_accion

  WHEN 'CREAR' THEN
    IF p_id_categoria IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Categoría no válida';
    END IF;
    IF p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El nombre es obligatorio';
    END IF;
    IF p_precio IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El precio es obligatorio';
    END IF;
    INSERT INTO Productos (id_categoria, nombre, descripcion, precio, stock, foto_blob, foto_mime)
    VALUES (p_id_categoria, TRIM(p_nombre), p_descripcion, p_precio,
            COALESCE(p_stock, 0), p_foto, p_foto_mime);
    SELECT LAST_INSERT_ID() AS id_producto;

  WHEN 'EDITAR' THEN
    IF p_nombre IS NOT NULL AND TRIM(p_nombre) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|El nombre es obligatorio';
    END IF;
    UPDATE Productos
       SET id_categoria = COALESCE(p_id_categoria, id_categoria),
           nombre       = COALESCE(TRIM(p_nombre), nombre),
           descripcion  = COALESCE(p_descripcion, descripcion),
           precio       = COALESCE(p_precio, precio),
           stock        = COALESCE(p_stock, stock),
           foto_blob    = IF(p_foto IS NULL, foto_blob, p_foto),
           foto_mime    = IF(p_foto IS NULL, foto_mime, p_foto_mime)
     WHERE id_producto = p_id_producto;
    SELECT ROW_COUNT() AS afectados;

  WHEN 'DESACTIVAR' THEN
    UPDATE Productos SET estado = FALSE WHERE id_producto = p_id_producto;
    SELECT ROW_COUNT() AS afectados;

  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '400|Acción no válida';
  END CASE;
END$$

DELIMITER ;

-- Verificación: deben aparecer 9 procedimientos
SELECT ROUTINE_NAME FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'poly_bison' AND ROUTINE_TYPE = 'PROCEDURE';
