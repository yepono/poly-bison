# Despliegue en IONOS (Web Hosting Essential) — https://poly-bison.com

Guía para publicar PolyBison completo (frontend React + API PHP + base de datos MariaDB con vistas, funciones, triggers y procedimientos) en el hosting compartido de IONOS.

**Estructura final en el servidor**

```
(carpeta del dominio poly-bison.com)
├── .htaccess            ← del build (HTTPS + rutas de React)
├── index.html           ← del build
├── assets/ ...          ← del build
├── favicon.svg, icons.svg
└── api/                 ← contenido de la carpeta php/ del proyecto
    ├── .htaccess
    ├── config.php, correo.php
    ├── config.local.php ← SE CREA EN EL SERVIDOR (no se sube el de tu equipo)
    └── usuarios.php, publicaciones.php, ... (todos los endpoints)
```

Front y API quedan en el **mismo dominio**: no hay problemas de CORS ni de cookies de terceros.

---

## 1. Panel de IONOS

1. **Dominio → webspace:** en *Dominios y SSL*, revisa a qué **carpeta del webspace** apunta `poly-bison.com` (y `www.poly-bison.com`). Esa es la "carpeta del dominio" de esta guía.
2. **SSL:** confirma que el certificado SSL (incluido en el plan) esté **activo** para `poly-bison.com` y `www.poly-bison.com`. Sin HTTPS no funciona el inicio de sesión (la cookie de sesión es `secure`).
3. **PHP:** en *Hosting → PHP*, selecciona **PHP 8.2 o 8.3** para el dominio.
4. **Acceso SFTP:** en *Hosting → SFTP & SSH* anota servidor, usuario y contraseña.

## 2. Base de datos (phpMyAdmin)

IONOS no permite conexiones remotas a la BD: todo se hace desde **phpMyAdmin** en el panel. Ya comprobamos que el plan permite funciones, procedimientos y triggers (MariaDB 11, `log_bin_trust_function_creators = 1`).

1. Anota de la BD (panel → *Bases de datos*): **nombre de host**, **nombre de la BD**, **usuario** y **contraseña**.
2. Abre la BD en phpMyAdmin (selecciónala en el panel izquierdo).
3. Ejecuta los scripts de `sql/` **en este orden**, con la pestaña **Importar** (elegir archivo → *Continuar*) o pegándolos en la pestaña **SQL**:

   | # | Script | Verificación esperada |
   |---|---|---|
   | 1 | `table_creation.sql` | Muestra el nombre de tu BD al inicio; crea 18 tablas |
   | 2 | `alter_schema.sql` | Columnas `debe_cambiar_contrasena`, `contrasena_temporal`, `temporal_expira`, `activo` |
   | 3 | `seed.sql` | 4 etiquetas, 3 aulas, 3 categorías |
   | 4 | `functions.sql` | 4 funciones |
   | 5 | `views.sql` | 12 vistas |
   | 6 | `triggers.sql` | 3 triggers |
   | 7 | `procedures.sql` | 9 procedimientos |

   > **No ejecutes** `00_local_bd_y_usuario.sql` en IONOS: es solo para instalación local (crea la BD y el usuario, cosa que en IONOS hace el panel).

4. Comprueba el juego de caracteres (debe decir `utf8mb4`; si dice `utf8mb3`, los emojis fallarán):
   ```sql
   SELECT @@character_set_database, @@collation_database;
   ```
5. **Administrador inicial:** la base de datos nueva no tiene ningún administrador. Créalo **una sola vez** en phpMyAdmin con un `INSERT` en `Usuario`:
   - rol `Administrador`, estado `Aprobado`, `debe_cambiar_contrasena = TRUE`;
   - correo `@uanl.edu.mx`, matrícula de 7 dígitos, carrera y semestre;
   - en `contrasena`, el **hash** de una contraseña temporal generado con
     `C:\xampp\php\php.exe -r "echo password_hash('CLAVE', PASSWORD_DEFAULT), PHP_EOL;"`.

   Al entrar por primera vez, la app obliga a cambiar esa contraseña (escribe la temporal como *Contraseña actual*). Los moderadores se crean después desde el panel.

## 3. Compilar el frontend (en tu equipo)

```bash
npm install
npm run build
```

Genera la carpeta `dist/` usando `.env.production` (`VITE_API_URL=/api`, `VITE_BASE=/`). Incluye `dist/.htaccess` (archivo oculto).

## 4. Subir archivos por SFTP

Con FileZilla, WinSCP o similar. **Activa "mostrar archivos ocultos"** para que se suban los `.htaccess`.

1. **Front:** sube **el contenido** de `dist/` (no la carpeta) a la carpeta del dominio.
2. **API:** crea la carpeta `api` dentro de la carpeta del dominio y sube ahí **el contenido** de `php/`, incluido `.htaccess`.
   - **No subas** tu `config.local.php` (tiene los datos de tu equipo).
3. **Configuración de producción:** en el servidor, dentro de `api/`, crea `config.local.php` a partir de `php/config.production.example.php` y llena:
   - los 4 datos de la BD del paso 2;
   - la `api_key` y el `remitente_correo` de Brevo.

## 5. Brevo (correos)

- Usa la misma API key y el mismo remitente verificado.
- Si en Brevo está activa la opción **"Authorized IPs"** (*Security*), Brevo rechazará las llamadas desde el servidor de IONOS: agrega la IP del servidor o desactiva la restricción para esa API key.

## 6. Pruebas en línea

| # | Prueba | Esperado |
|---|---|---|
| 1 | Abrir `http://poly-bison.com` | Redirige a `https://` y muestra el login |
| 2 | `https://poly-bison.com/api/usuarios.php?accion=me` | `401` en JSON |
| 3 | `https://poly-bison.com/api/config.local.php` | `403` |
| 4 | Registrarse con un correo `@uanl.edu.mx` | "Pendiente de aprobación" |
| 5 | Entrar como administrador y aprobar la cuenta | Aparece en la Bitácora |
| 6 | Publicar con imagen y con emoji 🎉 | Se guarda y se ve |
| 7 | Estar en `/feed` y recargar la página (F5) | Sigue en el feed (no da 404) |
| 8 | Reservar un aula para hoy | Los horarios que ya pasaron (hora de México) aparecen tachados |
| 9 | "¿Olvidaste tu contraseña?" | Llega el correo |

## 7. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Error 500 en todo el sitio o en `/api` | Una directiva del `.htaccess` no permitida | Quita la línea `Options -Indexes` del `.htaccess` correspondiente |
| 404 al recargar en `/feed` | No se subió `dist/.htaccess` | Súbelo (archivo oculto) |
| "Error del servidor" en la API | Datos de BD incorrectos en `config.local.php`, o falta un script SQL | Revisa los datos y los logs de PHP del panel de IONOS |
| El login regresa al formulario | El sitio se abrió sin HTTPS | Usa `https://` (el `.htaccess` lo fuerza) |
| Error al guardar texto con emoji | La BD quedó en `utf8mb3` | Ejecuta `ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;` y vuelve a ejecutar los scripts 1–7 en una BD vacía |
| No llegan correos (503) | Falta la API key o Brevo bloquea la IP | Revisa `config.local.php` y "Authorized IPs" en Brevo |

## 8. Actualizar el sitio después

- **Cambios en el front:** `npm run build` y vuelve a subir el contenido de `dist/`.
- **Cambios en la API:** sube solo los `.php` modificados a `api/` (nunca reemplaces el `config.local.php` del servidor).
- **Cambios en la BD:** ejecuta en phpMyAdmin solo el script modificado (todos excepto `table_creation.sql` se pueden volver a ejecutar).
