SELECT DATABASE() AS base_de_datos_actual;

-- Etiquetas de publicaciones

INSERT INTO Etiqueta (nombre, color, activo) VALUES
  ('General',   '#828282', TRUE),
  ('Académico', '#002791', TRUE),
  ('Ayuda',     '#FFD92E', TRUE),
  ('Aviso',     '#960000', TRUE)
ON DUPLICATE KEY UPDATE color = VALUES(color), activo = TRUE;

-- Aulas de estudio con su capacidad

INSERT INTO Aula (nombre, capacidad, id_ubicacion, activo) VALUES
  ('Sala de Estudio A', 8,  NULL, TRUE),
  ('Sala de Estudio B', 8,  NULL, TRUE),
  ('Laboratorio Web',   15, NULL, TRUE)
ON DUPLICATE KEY UPDATE capacidad = VALUES(capacidad), activo = TRUE;

-- Categorías de la Bisontstore

INSERT INTO Categoria_Producto (nombre, activo) VALUES
  ('Ropa',       TRUE),
  ('Accesorios', TRUE),
  ('Papelería',  TRUE),
  ('Otros',  TRUE)
ON DUPLICATE KEY UPDATE activo = TRUE;


