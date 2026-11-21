CREATE DATABASE IF NOT EXISTS poly_bison
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE poly_bison;

-- ------------------------------------------------------------
-- 1. Carreras
-- ------------------------------------------------------------
CREATE TABLE Carreras (
  id_carrera INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(200) NOT NULL UNIQUE,
  activo     BOOL NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. Rol
-- ------------------------------------------------------------
CREATE TABLE Rol (
  id_rol      INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(200)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. Usuario
-- matricula, id_carrera y semestre son NULL para admins/moderadores.
-- "estado" reemplaza a "activo" (ya incluye Baneado).
-- ------------------------------------------------------------
CREATE TABLE Usuario (
  id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
  id_rol          INT NOT NULL,
  matricula       VARCHAR(10) NULL UNIQUE,
  nombre_completo VARCHAR(250) NOT NULL,
  alias           VARCHAR(50) NOT NULL UNIQUE,
  correo          VARCHAR(150) NOT NULL UNIQUE,
  contrasena      VARCHAR(255) NOT NULL,          -- guardar hash (password_hash)
  id_carrera      INT NULL,
  semestre        INT NULL,
  fecha_registro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado          ENUM('Pendiente','Aprobado','Rechazado','Baneado')
                  NOT NULL DEFAULT 'Pendiente',
  motivo          VARCHAR(300) NULL,              -- motivo de rechazo o baneo
  id_revisor      INT NULL,                       -- admin que aprobó/rechazó/baneó
  fecha_revision  DATETIME NULL,
  CONSTRAINT fk_usuario_rol      FOREIGN KEY (id_rol)     REFERENCES Rol(id_rol),
  CONSTRAINT fk_usuario_carrera  FOREIGN KEY (id_carrera) REFERENCES Carreras(id_carrera),
  CONSTRAINT fk_usuario_revisor  FOREIGN KEY (id_revisor) REFERENCES Usuario(id_usuario),
  CONSTRAINT chk_usuario_semestre CHECK (semestre IS NULL OR semestre BETWEEN 1 AND 12)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. Publicacion
-- ------------------------------------------------------------
CREATE TABLE Publicacion (
  id_publicacion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario     INT NOT NULL,
  titulo         VARCHAR(250) NOT NULL,
  descripcion    VARCHAR(600),
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado         ENUM('Activa','Eliminada','Oculta') NOT NULL DEFAULT 'Activa',
  CONSTRAINT fk_pub_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
  INDEX idx_pub_feed (estado, fecha_creacion),
  INDEX idx_pub_usuario (id_usuario)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. Etiqueta
-- ------------------------------------------------------------
CREATE TABLE Etiqueta (
  id_etiqueta INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL UNIQUE,
  color       VARCHAR(7) NOT NULL DEFAULT '#1E3A8A',   -- formato #RRGGBB
  activo      BOOL NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. Publicacion_Etiqueta (PK compuesta)
-- ------------------------------------------------------------
CREATE TABLE Publicacion_Etiqueta (
  id_publicacion INT NOT NULL,
  id_etiqueta    INT NOT NULL,
  PRIMARY KEY (id_publicacion, id_etiqueta),
  CONSTRAINT fk_pe_pub FOREIGN KEY (id_publicacion) REFERENCES Publicacion(id_publicacion) ON DELETE CASCADE,
  CONSTRAINT fk_pe_eti FOREIGN KEY (id_etiqueta)    REFERENCES Etiqueta(id_etiqueta)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. Multimedia
-- Imagen -> BLOB en BD | Video -> solo enlace externo
-- ------------------------------------------------------------
CREATE TABLE Multimedia (
  id_multimedia  INT AUTO_INCREMENT PRIMARY KEY,
  id_publicacion INT NOT NULL,
  tipo           ENUM('Imagen','Video') NOT NULL,
  mult_blob      LONGBLOB NULL,
  mult_mime      VARCHAR(50) NULL,
  mult_nombre    VARCHAR(200) NULL,
  mult_tamanio   INT NULL,
  video_url      VARCHAR(500) NULL,
  CONSTRAINT fk_mult_pub FOREIGN KEY (id_publicacion) REFERENCES Publicacion(id_publicacion) ON DELETE CASCADE,
  CONSTRAINT chk_mult_tipo CHECK (
    (tipo = 'Imagen' AND mult_blob IS NOT NULL AND mult_mime IS NOT NULL AND video_url IS NULL)
    OR
    (tipo = 'Video'  AND video_url IS NOT NULL AND mult_blob IS NULL)
  ),
  INDEX idx_mult_pub (id_publicacion)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. Comentario
-- ------------------------------------------------------------
CREATE TABLE Comentario (
  id_comentario  INT AUTO_INCREMENT PRIMARY KEY,
  id_publicacion INT NOT NULL,
  id_usuario     INT NOT NULL,
  contenido      VARCHAR(500) NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado         ENUM('Activo','Eliminado') NOT NULL DEFAULT 'Activo',
  CONSTRAINT fk_com_pub     FOREIGN KEY (id_publicacion) REFERENCES Publicacion(id_publicacion) ON DELETE CASCADE,
  CONSTRAINT fk_com_usuario FOREIGN KEY (id_usuario)     REFERENCES Usuario(id_usuario),
  INDEX idx_com_pub (id_publicacion, fecha_creacion),
  INDEX idx_com_usuario (id_usuario)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. Reaccion (likes/dislikes) - alimenta "mayor interacción"
-- ------------------------------------------------------------
CREATE TABLE Reaccion (
  id_usuario     INT NOT NULL,
  id_publicacion INT NOT NULL,
  tipo           ENUM('Like','Dislike') NOT NULL DEFAULT 'Like',
  fecha          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, id_publicacion),
  CONSTRAINT fk_reac_usuario FOREIGN KEY (id_usuario)     REFERENCES Usuario(id_usuario),
  CONSTRAINT fk_reac_pub     FOREIGN KEY (id_publicacion) REFERENCES Publicacion(id_publicacion) ON DELETE CASCADE,
  INDEX idx_reac_pub (id_publicacion)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. Ubicacion (mapa interactivo)
-- ------------------------------------------------------------
CREATE TABLE Ubicacion (
  id_ubicacion INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(250) NOT NULL,
  tipo         ENUM('Salon','Laboratorio','Area') NOT NULL,
  edificio     VARCHAR(100),
  piso         INT NOT NULL DEFAULT 1,
  coord_x      DECIMAL(6,2) NULL,     -- posición en el mapa (%)
  coord_y      DECIMAL(6,2) NULL,
  activo       BOOL NOT NULL DEFAULT TRUE,
  INDEX idx_ubic_tipo (tipo)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 11. Aula (inventario de 3 aulas de estudio)
-- ------------------------------------------------------------
CREATE TABLE Aula (
  id_aula      INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(250) NOT NULL UNIQUE,
  capacidad    INT NOT NULL,
  id_ubicacion INT NULL,
  activo       BOOL NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_aula_ubic FOREIGN KEY (id_ubicacion) REFERENCES Ubicacion(id_ubicacion),
  CONSTRAINT chk_aula_cap CHECK (capacidad > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 12. Bloque_Horario
-- ------------------------------------------------------------
CREATE TABLE Bloque_Horario (
  id_bloque   INT AUTO_INCREMENT PRIMARY KEY,
  hora_inicio TIME NOT NULL,
  hora_fin    TIME NOT NULL,
  UNIQUE (hora_inicio, hora_fin),
  CONSTRAINT chk_bloque CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 13. Reservacion
-- Columna generada "ocupa": vale 1 si la reserva está Activa o Completada
-- y NULL si fue Cancelada. Como UNIQUE permite varios NULL, las
-- cancelaciones no bloquean nuevas reservas.
--   - uq_aula_slot : evita empalmes (misma aula, fecha y bloque)
--   - uq_user_dia  : máximo 1 hora diaria por estudiante
-- ------------------------------------------------------------
CREATE TABLE Reservacion (
  id_reservacion INT AUTO_INCREMENT PRIMARY KEY,
  id_aula        INT NOT NULL,
  id_usuario     INT NOT NULL,
  id_bloque      INT NOT NULL,
  fecha_reserva  DATE NOT NULL,
  codigo_ticket  VARCHAR(20) NOT NULL UNIQUE,
  estado         ENUM('Activa','Cancelada','Completada') NOT NULL DEFAULT 'Activa',
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ocupa TINYINT GENERATED ALWAYS AS (IF(estado IN ('Activa','Completada'), 1, NULL)) STORED,
  CONSTRAINT fk_res_aula    FOREIGN KEY (id_aula)    REFERENCES Aula(id_aula),
  CONSTRAINT fk_res_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
  CONSTRAINT fk_res_bloque  FOREIGN KEY (id_bloque)  REFERENCES Bloque_Horario(id_bloque),
  UNIQUE KEY uq_aula_slot (id_aula, fecha_reserva, id_bloque, ocupa),
  UNIQUE KEY uq_user_dia  (id_usuario, fecha_reserva, ocupa),
  INDEX idx_res_fecha (fecha_reserva)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 14. Estudiantes_Reservacion (asistentes)
-- El SP de reserva debe validar que no excedan Aula.capacidad.
-- ------------------------------------------------------------
CREATE TABLE Estudiantes_Reservacion (
  id_asistente   INT AUTO_INCREMENT PRIMARY KEY,
  id_reservacion INT NOT NULL,
  matricula      VARCHAR(10) NOT NULL,
  nombre         VARCHAR(250) NOT NULL,
  UNIQUE (id_reservacion, matricula),
  CONSTRAINT fk_asis_res FOREIGN KEY (id_reservacion) REFERENCES Reservacion(id_reservacion) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 15. Eventos (calendario)
-- ------------------------------------------------------------
CREATE TABLE Eventos (
  id_evento         INT AUTO_INCREMENT PRIMARY KEY,
  titulo            VARCHAR(200) NOT NULL,
  descripcion       TEXT,
  tipo              ENUM('Académico','Examen','Asueto','Cultural','Deportivo') NOT NULL,
  fecha_inicio      DATETIME NOT NULL,
  fecha_fin         DATETIME NOT NULL,
  lugar             VARCHAR(150),
  id_creador        INT NOT NULL,
  fecha_publicacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visible           BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_evento_creador FOREIGN KEY (id_creador) REFERENCES Usuario(id_usuario),
  CONSTRAINT chk_evento_fechas CHECK (fecha_fin >= fecha_inicio),
  INDEX idx_evento_fecha (fecha_inicio)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 16. Categoria_Producto
-- ------------------------------------------------------------
CREATE TABLE Categoria_Producto (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL UNIQUE,
  activo       BOOL NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 17. Productos (Bison Store - solo catálogo)
-- ------------------------------------------------------------
CREATE TABLE Productos (
  id_producto  INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria INT NOT NULL,
  nombre       VARCHAR(200) NOT NULL,
  descripcion  VARCHAR(500),
  precio       DECIMAL(8,2) NOT NULL,
  stock        INT NOT NULL DEFAULT 0,
  foto_blob    LONGBLOB NULL,
  foto_mime    VARCHAR(50) NULL,
  estado       BOOL NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_prod_cat FOREIGN KEY (id_categoria) REFERENCES Categoria_Producto(id_categoria),
  CONSTRAINT chk_prod_precio CHECK (precio >= 0),
  CONSTRAINT chk_prod_stock  CHECK (stock >= 0),
  INDEX idx_prod_cat (id_categoria)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 18. Event_Log (bitácora)
-- id_usuario NULL = acción automática del sistema (triggers)
-- ------------------------------------------------------------
CREATE TABLE Event_Log (
  id_log               INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario           INT NULL,
  accion               VARCHAR(100) NOT NULL,
  tabla_afectada       VARCHAR(50),
  id_registro_afectado INT,
  detalle              TEXT,
  fecha                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_usuario FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario),
  INDEX idx_log_fecha (fecha)
) ENGINE=InnoDB;

-- ============================================================
-- Datos iniciales
-- ============================================================
INSERT INTO Rol (nombre, descripcion) VALUES
  ('Estudiante',    'Alumno de la FCFM'),
  ('Moderador',     'Gestiona contenido, cuentas y eventos'),
  ('Administrador', 'Acceso total al sistema');

INSERT INTO Bloque_Horario (hora_inicio, hora_fin) VALUES
  ('08:00:00','09:00:00'), ('09:00:00','10:00:00'), ('10:00:00','11:00:00'),
  ('11:00:00','12:00:00'), ('12:00:00','13:00:00'), ('13:00:00','14:00:00'),
  ('14:00:00','15:00:00'), ('15:00:00','16:00:00'), ('16:00:00','17:00:00'),
  ('17:00:00','18:00:00'), ('18:00:00','19:00:00'), ('19:00:00','20:00:00');

  INSERT INTO Carreras (nombre, activo) VALUES
  ('IC', 1), ('LA', 1),  ('LCC', 1),  ('LF', 1),  ('LM', 1),  ('LMAD', 1),  ('LSTI', 1);


CREATE USER 'Bison'@'localhost' IDENTIFIED BY 'MySQLsuck5455';
GRANT ALL PRIVILEGES ON poly_bison.* TO 'Bison'@'localhost';
FLUSH PRIVILEGES;

-- foto de perfil 
USE poly_bison;

ALTER TABLE Usuario
  ADD COLUMN foto_blob LONGBLOB NULL,
  ADD COLUMN foto_mime VARCHAR(50) NULL;

SELECT * FROM Usuario;

UPDATE Usuario SET estado = 'Aprobado' WHERE correo = 'luzma.garciah@uanl.edu.mx';
UPDATE Usuario SET estado = 'Aprobado' WHERE correo = 'estudiante@uanl.edu.mx';


