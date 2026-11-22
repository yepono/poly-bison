-- ============================================================
-- seed.sql - Datos de catálogo que la app necesita
-- Se puede ejecutar más de una vez (no duplica filas).
-- Ejecutar DESPUÉS de alter_schema.sql.
-- ============================================================
USE poly_bison;

-- ------------------------------------------------------------
-- [D6] Etiquetas de publicaciones (las 4 del front)
-- Las usa: publicaciones.php (accion=etiquetas, crear, editar)
-- ------------------------------------------------------------
INSERT INTO Etiqueta (nombre, color, activo) VALUES
  ('General',   '#828282', TRUE),
  ('Académico', '#002791', TRUE),
  ('Ayuda',     '#FFD92E', TRUE),
  ('Aviso',     '#960000', TRUE) AS nuevo
ON DUPLICATE KEY UPDATE color = nuevo.color, activo = TRUE;

-- ------------------------------------------------------------
-- [D8] Aulas de estudio (las 3 del front) con su capacidad
-- Las usa: reservaciones.php (accion=aulas, disponibilidad, crear)
-- ------------------------------------------------------------
INSERT INTO Aula (nombre, capacidad, id_ubicacion, activo) VALUES
  ('Sala de Estudio A', 8,  NULL, TRUE),
  ('Sala de Estudio B', 8,  NULL, TRUE),
  ('Laboratorio Web',   15, NULL, TRUE) AS nuevo
ON DUPLICATE KEY UPDATE capacidad = nuevo.capacidad, activo = TRUE;

-- ------------------------------------------------------------
-- [D10] Categorías de la Bisontstore
-- Las usa: productos.php (accion=categorias, crear, editar)
-- ------------------------------------------------------------
INSERT INTO Categoria_Producto (nombre, activo) VALUES
  ('Ropa',       TRUE),
  ('Accesorios', TRUE),
  ('Papelería',  TRUE),
  ('Otros',  TRUE)
ON DUPLICATE KEY UPDATE activo = TRUE;

-- Verificación
SELECT 'Etiqueta' AS tabla, COUNT(*) AS filas FROM Etiqueta
UNION ALL SELECT 'Aula', COUNT(*) FROM Aula
UNION ALL SELECT 'Categoria_Producto', COUNT(*) FROM Categoria_Producto;
