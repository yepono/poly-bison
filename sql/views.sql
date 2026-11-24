-- views
-- Ejecutar con la base de datos destino seleccionada (ver table_creation.sql).

SELECT DATABASE() AS base_de_datos_actual;

-- 1. vw_usuario_publico
-- Datos públicos de un usuario: SIN correo, matrícula ni contraseña.
-- debe_cambiar_contrasena solo se envía al propio usuario (me/login) y lo
-- usa requireLogin() para limitar la API mientras tenga clave temporal.
-- La usa: usuarios.php (me, perfil propio y de otros, requireLogin)

DROP VIEW IF EXISTS vw_usuario_publico;
CREATE VIEW vw_usuario_publico AS
SELECT u.id_usuario,
       u.alias,
       u.nombre_completo,
       r.nombre               AS rol,
       c.nombre               AS carrera,
       u.semestre,
       u.fecha_registro,
       u.estado,
       (u.foto_blob IS NOT NULL) AS tiene_foto,
       u.debe_cambiar_contrasena
FROM Usuario u
JOIN Rol r           ON r.id_rol = u.id_rol
LEFT JOIN Carreras c ON c.id_carrera = u.id_carrera;

-- 2. vw_usuarios_admin
-- Usuarios con datos de gestión y conteos (publicaciones activas y
-- likes recibidos). Solo para Administrador/Moderador.
-- La usa: usuarios.php (accion=listar, panel Estudiantes y Administradores)
DROP VIEW IF EXISTS vw_usuarios_admin;
CREATE VIEW vw_usuarios_admin AS
SELECT u.id_usuario,
       u.matricula,
       u.nombre_completo,
       u.alias,
       u.correo,
       r.nombre               AS rol,
       c.nombre               AS carrera,
       u.semestre,
       u.estado,
       u.motivo,
       u.fecha_registro,
       u.fecha_revision,
       (u.foto_blob IS NOT NULL) AS tiene_foto,
       (SELECT COUNT(*) FROM Publicacion p
         WHERE p.id_usuario = u.id_usuario AND p.estado = 'Activa') AS total_publicaciones,
       (SELECT COUNT(*) FROM Reaccion re
          JOIN Publicacion p ON p.id_publicacion = re.id_publicacion
         WHERE p.id_usuario = u.id_usuario AND p.estado = 'Activa'
           AND re.tipo = 'Like')                                     AS total_likes,
       (SELECT COUNT(*) FROM Comentario co
         WHERE co.id_usuario = u.id_usuario AND co.estado = 'Activo') AS total_comentarios
FROM Usuario u
JOIN Rol r           ON r.id_rol = u.id_rol
LEFT JOIN Carreras c ON c.id_carrera = u.id_carrera
WHERE u.estado <> 'Eliminado';

-- 3. vw_feed_publicaciones
-- Publicaciones activas con autor, etiqueta, multimedia y conteos.
-- La usa: publicaciones.php (listar, detalle, por_usuario)
DROP VIEW IF EXISTS vw_feed_publicaciones;
CREATE VIEW vw_feed_publicaciones AS
SELECT p.id_publicacion,
       p.id_usuario,
       u.alias,
       u.nombre_completo                AS autor_nombre,
       (u.foto_blob IS NOT NULL)        AS autor_tiene_foto,
       p.titulo,
       p.descripcion,
       p.fecha_creacion,
       (SELECT e.id_etiqueta FROM Publicacion_Etiqueta pe
          JOIN Etiqueta e ON e.id_etiqueta = pe.id_etiqueta
         WHERE pe.id_publicacion = p.id_publicacion
         ORDER BY e.id_etiqueta LIMIT 1) AS id_etiqueta,
       (SELECT e.nombre FROM Publicacion_Etiqueta pe
          JOIN Etiqueta e ON e.id_etiqueta = pe.id_etiqueta
         WHERE pe.id_publicacion = p.id_publicacion
         ORDER BY e.id_etiqueta LIMIT 1) AS etiqueta,
       (SELECT e.color FROM Publicacion_Etiqueta pe
          JOIN Etiqueta e ON e.id_etiqueta = pe.id_etiqueta
         WHERE pe.id_publicacion = p.id_publicacion
         ORDER BY e.id_etiqueta LIMIT 1) AS etiqueta_color,
       (SELECT m.id_multimedia FROM Multimedia m
         WHERE m.id_publicacion = p.id_publicacion AND m.tipo = 'Imagen'
         ORDER BY m.id_multimedia LIMIT 1) AS id_imagen,
       (SELECT m.video_url FROM Multimedia m
         WHERE m.id_publicacion = p.id_publicacion AND m.tipo = 'Video'
         ORDER BY m.id_multimedia LIMIT 1) AS video_url,
       fn_total_reacciones(p.id_publicacion, 'Like') AS total_likes,
       (SELECT COUNT(*) FROM Comentario c
         WHERE c.id_publicacion = p.id_publicacion AND c.estado = 'Activo') AS total_comentarios
FROM Publicacion p
JOIN Usuario u ON u.id_usuario = p.id_usuario
WHERE p.estado = 'Activa';

-- 4. vw_comentarios_activos
-- Comentarios visibles con el alias del autor.
-- La usa: comentarios.php (accion=listar)
DROP VIEW IF EXISTS vw_comentarios_activos;
CREATE VIEW vw_comentarios_activos AS
SELECT c.id_comentario,
       c.id_publicacion,
       c.id_usuario,
       u.alias,
       (u.foto_blob IS NOT NULL) AS autor_tiene_foto,
       c.contenido,
       c.fecha_creacion
FROM Comentario c
JOIN Usuario u     ON u.id_usuario = c.id_usuario
JOIN Publicacion p ON p.id_publicacion = c.id_publicacion
WHERE c.estado = 'Activo'
  AND p.estado = 'Activa';

-- 5. vw_resumen_usuarios
-- Una fila con los conteos del panel "Resumen".
-- La usa: reportes.php (accion=resumen)
DROP VIEW IF EXISTS vw_resumen_usuarios;
CREATE VIEW vw_resumen_usuarios AS
SELECT SUM(r.nombre = 'Estudiante')                             AS total_estudiantes,
       SUM(u.estado = 'Aprobado')                               AS usuarios_activos,
       SUM(u.estado = 'Pendiente')                              AS pendientes,
       SUM(u.estado = 'Rechazado')                              AS rechazados,
       SUM(u.estado = 'Baneado')                                AS baneados,
       SUM(r.nombre IN ('Administrador', 'Moderador'))          AS administradores,
       (SELECT COUNT(*) FROM Publicacion WHERE estado = 'Activa') AS publicaciones_activas,
       (SELECT COUNT(*) FROM Reservacion WHERE estado = 'Activa') AS reservaciones_activas
FROM Usuario u
JOIN Rol r ON r.id_rol = u.id_rol
WHERE u.estado <> 'Eliminado';

-- 6. vw_usuarios_mas_activos
-- Estudiantes aprobados con actividad (base: vw_usuarios_admin).
-- reportes.php ordena por publicaciones/likes y toma el top 5.
-- La usa: reportes.php (accion=mas_activos)
DROP VIEW IF EXISTS vw_usuarios_mas_activos;
CREATE VIEW vw_usuarios_mas_activos AS
SELECT id_usuario,
       alias,
       nombre_completo,
       carrera,
       semestre,
       total_publicaciones,
       total_likes,
       total_comentarios,
       (total_publicaciones + total_comentarios + total_likes) AS interaccion_total
FROM vw_usuarios_admin
WHERE rol = 'Estudiante'
  AND estado = 'Aprobado'
  AND (total_publicaciones + total_comentarios) > 0;

-- 7. vw_publicaciones_mayor_interaccion
-- Publicaciones activas con likes + comentarios (base: vw_feed_publicaciones).
-- La usa: reportes.php (accion=mayor_interaccion)
DROP VIEW IF EXISTS vw_publicaciones_mayor_interaccion;
CREATE VIEW vw_publicaciones_mayor_interaccion AS
SELECT id_publicacion,
       id_usuario,
       alias,
       titulo,
       etiqueta,
       fecha_creacion,
       total_likes,
       total_comentarios,
       (total_likes + total_comentarios) AS interaccion_total
FROM vw_feed_publicaciones;

-- 8. vw_reservaciones_detalle
-- Reservación con aula, horario, usuario y número de asistentes.
-- La usa: reservaciones.php (mis_reservaciones, historial)
DROP VIEW IF EXISTS vw_reservaciones_detalle;
CREATE VIEW vw_reservaciones_detalle AS
SELECT r.id_reservacion,
       r.codigo_ticket,
       r.fecha_reserva,
       r.estado,
       r.fecha_creacion,
       a.id_aula,
       a.nombre                 AS aula,
       a.capacidad,
       b.id_bloque,
       b.hora_inicio,
       b.hora_fin,
       u.id_usuario,
       u.alias,
       u.matricula,
       fn_asistentes_reservacion(r.id_reservacion) AS total_asistentes
FROM Reservacion r
JOIN Aula a           ON a.id_aula = r.id_aula
JOIN Bloque_Horario b ON b.id_bloque = r.id_bloque
JOIN Usuario u        ON u.id_usuario = r.id_usuario;

-- 9. vw_eventos_visibles
-- Eventos publicados (visible = 1) con el alias de quien los creó.
-- La usa: eventos.php (accion=listar, calendario)
-- (Los ocultos están en vw_eventos_ocultos.)
DROP VIEW IF EXISTS vw_eventos_visibles;
CREATE VIEW vw_eventos_visibles AS
SELECT e.id_evento,
       e.titulo,
       e.descripcion,
       e.tipo,
       e.fecha_inicio,
       e.fecha_fin,
       e.lugar,
       e.fecha_publicacion,
       u.alias AS creador
FROM Eventos e
JOIN Usuario u ON u.id_usuario = e.id_creador
WHERE e.visible = TRUE;

-- 9b. vw_eventos_ocultos
-- Eventos ocultos (visible = 0); mismas columnas que vw_eventos_visibles.
-- La usa: eventos.php (accion=admin_listar: panel admin "Eventos",
--         une visibles + ocultos para poder volver a mostrarlos)
DROP VIEW IF EXISTS vw_eventos_ocultos;
CREATE VIEW vw_eventos_ocultos AS
SELECT e.id_evento,
       e.titulo,
       e.descripcion,
       e.tipo,
       e.fecha_inicio,
       e.fecha_fin,
       e.lugar,
       e.fecha_publicacion,
       u.alias AS creador
FROM Eventos e
JOIN Usuario u ON u.id_usuario = e.id_creador
WHERE e.visible = FALSE;

-- 10. vw_catalogo_productos
-- Productos activos de categorías activas.
-- La usa: productos.php (accion=listar)
DROP VIEW IF EXISTS vw_catalogo_productos;
CREATE VIEW vw_catalogo_productos AS
SELECT p.id_producto,
       p.nombre,
       p.descripcion,
       p.precio,
       p.stock,
       c.id_categoria,
       c.nombre                  AS categoria,
       (p.foto_blob IS NOT NULL) AS tiene_foto
FROM Productos p
JOIN Categoria_Producto c ON c.id_categoria = p.id_categoria
WHERE p.estado = TRUE
  AND c.activo = TRUE;

-- 11. vw_bitacora
-- Event_Log con el alias de quien hizo la acción ('Sistema' si fue automática).
-- La alimentan los triggers. La usa: reportes.php (accion=bitacora, panel admin)
DROP VIEW IF EXISTS vw_bitacora;
CREATE VIEW vw_bitacora AS
SELECT l.id_log,
       l.fecha,
       l.accion,
       l.tabla_afectada,
       l.id_registro_afectado,
       l.detalle,
       COALESCE(u.alias, 'Sistema') AS realizado_por
FROM Event_Log l
LEFT JOIN Usuario u ON u.id_usuario = l.id_usuario;

-- Verificación: deben aparecer 12 vistas
-- (SHOW en lugar del catálogo del sistema: ver nota en functions.sql)
SHOW FULL TABLES WHERE Table_type = 'VIEW';
