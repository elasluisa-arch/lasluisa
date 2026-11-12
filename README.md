# MotorCare

Proyecto académico de frontend para gestionar solicitudes de mantenimiento automotriz. No necesita servidor de aplicaciones ni base de datos.

## Inicio

Abre `index.html` en un navegador moderno o sirve la carpeta con `python -m http.server 8000` y visita `http://localhost:8000`. Bootstrap y SweetAlert2 se cargan desde CDN, por lo que requieren conexión; si SweetAlert2 no está disponible, los mensajes y la confirmación utilizan los cuadros nativos del navegador.

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Cliente | `cliente1` | `cliente123` |
| Cliente | `cliente2` | `cliente123` |
| Administrador | `admin` | `admin123` |
| Cuenta deshabilitada | `inactivo` | `cliente123` |

Son datos ficticios de demostración. Usa **Crear cuenta** para registrar más clientes con nombre, correo ficticio, usuario y contraseña de prueba. El usuario debe tener de 3 a 30 letras sin acentos, números o guiones bajos; la contraseña, al menos 6 caracteres. La cuenta creada siempre tiene rol de cliente y luego permite iniciar sesión.

Las cuentas nuevas y solicitudes se guardan en `localStorage` del navegador y no se comparten entre navegadores o dispositivos. Las contraseñas se guardan sin protección: no uses contraseñas reales. La sesión solo dura mientras la página está abierta.

## Uso y reglas de demostración

El cliente registra y consulta sus propias solicitudes. El administrador también puede registrar para cualquier cuenta habilitada, consultar todos los registros, editarlos, cambiar su estado y eliminarlos con confirmación. El cliente propietario se selecciona entre las cuentas habilitadas; el nombre y correo del formulario son datos de contacto de la solicitud.

Para acceder, pulsa **Mi cuenta** o **Agendar cita**: el inicio de sesión y el panel se abren en una ventana. En el panel, **Registrar solicitud** muestra el formulario y el resumen cuenta solo las solicitudes visibles para el usuario. Cerrar la ventana no cierra la sesión; usa **Cerrar sesión** para salir.

La placa acepta tres letras, un guion y tres o cuatro dígitos; el teléfono, de 7 a 15 dígitos. El año debe estar entre 1900 y el año actual más uno; el kilometraje debe ser un entero no negativo. Las citas nuevas no pueden ser anteriores al día actual y el horario de demostración es de 08:00 a 18:00. Al editar una cita pasada se permite mantener su fecha original.

## Limitaciones importantes

Este proyecto no proporciona seguridad real: cualquiera con acceso al navegador puede modificar los datos, el código, las credenciales o los roles. No se debe usar para información real o sensible. Para producción se requiere un servidor, autenticación y autorización verificadas en el servidor, persistencia segura y protección de datos.

La entrega académica también requiere el registro de uso de IA y referencias externas verificadas por el estudiante. No se deben incluir fuentes no consultadas ni datos personales de terceros.
