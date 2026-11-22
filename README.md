# PolyBison — Red social FCFM

Plataforma social exclusiva para estudiantes de la Facultad de Ciencias Físico Matemáticas (UANL): feed de publicaciones con imágenes y video, comentarios y likes, reservación de aulas de estudio, calendario de eventos, tienda (catálogo) y panel de administración con reportes.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, Framer Motion, React Router |
| Backend | API en PHP 8.2 (mysqli con consultas preparadas), servida por Apache (XAMPP) |
| Base de datos | MySQL Server 8.0 (`poly_bison`) con vistas, funciones, triggers y procedimientos almacenados |
| API externa | [Brevo](https://www.brevo.com/) (envío de correos transaccionales) |

## Arquitectura

```
React (Vite, :5173)  ──fetch + cookie de sesión──▶  Apache /api  (php/*.php)
                                                        │
                                   lecturas: vistas     │   escrituras: rutinas globales
                                                        ▼
                                                   MySQL 8.0 (poly_bison)
                                                        ▲
                                             triggers y funciones
                                                        
php/usuarios.php ──cURL──▶ API de Brevo (correo con contraseña temporal)
```

- **Un archivo PHP por sección**; la acción se indica con `?accion=...`.
- **Lecturas con vistas, escrituras con una rutina global por entidad** (`CALL sp_<entidad>('ACCION', ...)`, con `CASE` por acción).
- Los errores de negocio se lanzan en la BD con `SIGNAL ... '409|mensaje'` y PHP los convierte en el código HTTP correspondiente (400, 401, 403, 404, 409).
- La sesión vive en el servidor (cookie `HttpOnly`); el rol se valida **en PHP y otra vez en la rutina**, no solo en React.

## Estructura

```
php/                 API (un archivo por sección)
  config.php           conexión, sesión, CORS, helpers, requireLogin()/requireRole()
  config.example.php   plantilla de configuración (copiar como config.local.php)
  correo.php           cliente de la API de Brevo + plantillas de correo
  usuarios.php  publicaciones.php  comentarios.php  reacciones.php  multimedia.php
  reservaciones.php  eventos.php  productos.php  reportes.php
sql/                 scripts de base de datos (ver "Instalación")
src/
  api/client.js        fetch con cookies, manejo de errores, conversión de datos
  context/             sesión del usuario y feed
  pages/               Login, Registro, Recuperar, Feed, Publicacion, Perfil,
                       Configuracion, Aulas, Calendario, Bisontstore, Mapa, Admin
  components/          PostCard, CreatePost, AdminSecciones, ...
```

## Instalación (local)

### Requisitos
- XAMPP (solo **Apache** con PHP 8.2; la extensión `curl` viene activa).
- MySQL Server 8.0.19 o superior (por ejemplo, administrado con MySQL Workbench) en el puerto 3306.
- Node.js 20.19 o superior (o 22.12+), requerido por Vite 8.

### 1. Base de datos
Los scripts funcionan en **MySQL 8.0.19+** (local) y en **MariaDB 10.5+** (hosting). En MySQL Workbench, **conectado como root**:

1. Ejecuta `sql/00_local_bd_y_usuario.sql` (crea el esquema `poly_bison` y el usuario de MySQL de la app). **Antes, cambia `CAMBIA_ESTA_CLAVE` por una contraseña propia** y pon la misma en `config.local.php`.
2. Haz doble clic en `poly_bison` para dejarlo como esquema por defecto (los demás scripts no llevan `USE`, para poder ejecutarse también en el hosting).
3. Ejecuta en este orden:

| # | Script | Contenido |
|---|---|---|
| 1 | `sql/table_creation.sql` | Tablas (utf8mb4) y catálogos iniciales |
| 2 | `sql/alter_schema.sql` | Ajustes al esquema (rol por defecto, semestre 1–10, horarios activos, borrado lógico, contraseñas temporales) |
| 3 | `sql/seed.sql` | Etiquetas, aulas y categorías de la tienda |
| 4 | `sql/functions.sql` | 4 funciones |
| 5 | `sql/views.sql` | 12 vistas |
| 6 | `sql/triggers.sql` | 3 triggers |
| 7 | `sql/procedures.sql` | 9 rutinas globales |

Todos los scripts (excepto `table_creation.sql`) se pueden ejecutar más de una vez y terminan con una consulta de verificación.

### 2. API PHP
1. Copiar `php/config.example.php` como `php/config.local.php` y llenar la conexión a MySQL. Este archivo **no se sube a git**.
2. Publicar la carpeta `php/` en Apache como `/api`. Al final de `C:\xampp\apache\conf\extra\httpd-xampp.conf`:
   ```apache
   Alias /api "C:/ruta/a/poly-bison/php"
   <Directory "C:/ruta/a/poly-bison/php">
       Options -Indexes
       AllowOverride All
       Require all granted
   </Directory>
   ```
3. Reiniciar Apache. Comprobación: `http://localhost/api/usuarios.php?accion=me` responde `401` en JSON.

### 3. Correo (Brevo)
Necesario para dar de alta moderadores y para "Olvidé mi contraseña"; sin él, esas dos acciones responden `503`.
1. Crear una cuenta gratuita en Brevo y verificar un remitente.
2. Generar una API key (*SMTP & API → API Keys*).
3. Llenar la sección `brevo` de `php/config.local.php` (`api_key`, `remitente_correo`).

### 4. Frontend
```bash
npm install
npm run dev
```
Abrir `http://localhost:5173/poly-bison/`. La URL de la API y la ruta base se toman de `.env.development` (`VITE_API_URL=http://localhost/api`, `VITE_BASE=/poly-bison/`); el build de producción usa `.env.production` (`/api` y `/`).

## Roles

| Rol | Puede |
|---|---|
| Estudiante | Publicar, comentar, dar like, reservar aulas, ver calendario y tienda, editar su perfil |
| Moderador | Lo anterior + aprobar/rechazar/banear estudiantes, eliminar publicaciones y comentarios, gestionar eventos, ver historial de rentas |
| Administrador | Todo lo anterior + dar de alta moderadores, gestionar horarios y tienda, ver Resumen (dashboard) y Bitácora |

El registro crea cuentas de **Estudiante en estado Pendiente**; un administrador o moderador las aprueba. Todas las cuentas usan correo `@uanl.edu.mx`.

## API (resumen)

| Archivo | Acciones |
|---|---|
| `usuarios.php` | `registro`, `login`, `logout`, `me`, `carreras`, `perfil`, `foto`, `actualizar_perfil`, `cambiar_contrasena`, `actualizar_foto`, `eliminar_cuenta`, `recuperar_contrasena`; staff: `listar`, `cambiar_estado`; admin: `crear_moderador` |
| `publicaciones.php` | `listar`, `detalle`, `por_usuario`, `etiquetas`, `crear`, `editar`, `eliminar` |
| `comentarios.php` | `listar`, `crear`, `eliminar` |
| `reacciones.php` | `reaccionar` |
| `multimedia.php` | `ver` |
| `reservaciones.php` | `aulas`, `bloques`, `disponibilidad`, `crear`, `mis_reservaciones`, `cancelar`; staff: `historial`; admin: `bloque_crear`, `bloque_editar`, `bloque_activar`, `bloque_desactivar` |
| `eventos.php` | `listar`; staff: `admin_listar`, `crear`, `editar`, `ocultar`, `mostrar`, `eliminar` |
| `productos.php` | `listar`, `categorias`, `foto`; admin: `crear`, `editar`, `desactivar` |
| `reportes.php` | admin: `resumen`, `mas_activos`, `mayor_interaccion`, `bitacora` |

## Objetos de base de datos

Cada objeto incluye en su script un comentario con su propósito y el PHP que lo usa.

**Vistas (12):** `vw_usuario_publico`, `vw_usuarios_admin`, `vw_feed_publicaciones`, `vw_comentarios_activos`, `vw_resumen_usuarios`, `vw_usuarios_mas_activos`, `vw_publicaciones_mayor_interaccion`, `vw_reservaciones_detalle`, `vw_eventos_visibles`, `vw_eventos_ocultos`, `vw_catalogo_productos`, `vw_bitacora`.

**Funciones (4):**

| Función | Uso |
|---|---|
| `fn_total_reacciones` | Likes de una publicación (feed, reacciones) |
| `fn_aula_disponible` | Si un aula está libre en fecha y horario (disponibilidad, crear reservación) |
| `fn_generar_ticket` | Código único del ticket de reservación |
| `fn_asistentes_reservacion` | Asistentes de una reservación (trigger de capacidad, historial) |

**Triggers (3):**

| Trigger | Uso |
|---|---|
| `trg_usuario_estado_au` | Registra en la bitácora cada cambio de estado de una cuenta |
| `trg_asistente_capacidad_bi` | Impide exceder la capacidad del aula |
| `trg_reservacion_fecha_bi` | Impide reservar en fechas pasadas |

**Rutinas globales (9):** `sp_usuario`, `sp_publicacion`, `sp_multimedia`, `sp_comentario`, `sp_reaccion`, `sp_reservacion`, `sp_bloque_horario`, `sp_evento`, `sp_producto`.

## Seguridad

- Consultas preparadas en todo el PHP (sin SQL concatenado con datos del usuario).
- Contraseñas con `password_hash` / `password_verify`; las respuestas JSON nunca incluyen hashes.
- Sesión en el servidor con `session_regenerate_id`, cookie `HttpOnly` y `SameSite`; control de sesión y rol en cada endpoint (`requireLogin` / `requireRole`).
- Credenciales fuera del repositorio (`config.local.php` en `.gitignore`); `.htaccess` bloquea el acceso por URL a los archivos de configuración y al cliente de correo.
- Errores sin detalles internos (`display_errors` apagado; el detalle va al log de Apache).
- CORS limitado a los orígenes configurados.
- Imágenes validadas por contenido real (`finfo` + `getimagesize`), JPG/PNG/WebP, máximo 2 MB; se guardan como BLOB.
- Contraseñas temporales (moderadores nuevos y recuperación) que solo viajan por correo, vencen en 30 minutos y obligan a cambiarse.
- Validación en el front **y** en el PHP, y de nuevo en las rutinas de la BD.

## Scripts de npm

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run lint` | ESLint |
| `npm run deploy` | Publica `dist/` en GitHub Pages. **Ya no aplica:** el sitio se publica en IONOS con la ruta base `/`, y GitHub Pages no ejecuta PHP ni MySQL |

## Despliegue

El sitio se publica en **IONOS Web Hosting** (https://poly-bison.com): front y API en el mismo dominio, base de datos MariaDB 11. Pasos completos en [docs/DESPLIEGUE_IONOS.md](docs/DESPLIEGUE_IONOS.md).

## Licencia

MIT — ver [LICENSE](LICENSE).
