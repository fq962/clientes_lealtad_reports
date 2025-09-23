# Configuración de Base de Datos - Clientes Lealtad Reports

## 📦 Comandos de Instalación

Ejecuta estos comandos para instalar las dependencias necesarias:

```bash
npm install drizzle-orm pg
npm install -D @types/pg
```

## 🔧 Configuración Inicial

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con tu configuración de PostgreSQL:

```env
# Configuración de la base de datos PostgreSQL
XDB_HOST=192.168.1.253
DB_DATABASE=allasdb
DB_PORT=6432
DB_USER=usuario_vpc_allas
DB_PASSWORD=pD9!xWZ2qL@7uY#bR4^tM1&sE8*KaQ5
ES_PRODUCCION=true
USAR_CERTIFICADOS=false
```

**NOTA IMPORTANTE:** Esta aplicación solo realiza consultas SELECT a tu base de datos existente. No modificará, creará ni alterará ninguna tabla.

## 🗃️ Esquema de la Base de Datos

La tabla `clientes_lealtad` contiene las siguientes columnas:

- `id` (UUID) - Clave primaria
- `fecha_usuario_digital` (TIMESTAMP) - Fecha del usuario digital
- `id_usuario_digital` (VARCHAR) - ID único del usuario digital
- `nombre_preferido` (VARCHAR) - Nombre preferido del usuario
- `id_contacto` (VARCHAR) - ID del contacto
- `nombre_completo_contacto` (VARCHAR) - Nombre completo del contacto
- `identificacion` (VARCHAR) - Número de identificación
- `tipo_identificacion` (VARCHAR) - Tipo de identificación (Cédula, Pasaporte, etc.)
- `correo_app` (VARCHAR) - Correo electrónico de la app
- `telefono_app` (VARCHAR) - Teléfono de la app
- `foto_perfil_app` (TEXT) - URL o path de la foto de perfil
- `creado_en` (TIMESTAMP) - Fecha de creación del registro
- `actualizado_en` (TIMESTAMP) - Fecha de última actualización

## 🚀 Scripts Disponibles

```bash
# Iniciar la aplicación en modo desarrollo
npm run dev

# Construir la aplicación para producción
npm run build

# Iniciar la aplicación en modo producción
npm run start

# Ejecutar linter
npm run lint
```

## 🔌 API Endpoints

### GET /api/clientes

Obtiene la lista de clientes con filtros opcionales:

**Parámetros de consulta:**
- `fechaInicio` (opcional) - Fecha inicio en formato YYYY-MM-DD
- `fechaFin` (opcional) - Fecha fin en formato YYYY-MM-DD

**Ejemplo:**
```
GET /api/clientes?fechaInicio=2024-01-01&fechaFin=2024-01-31
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fechaUsuarioDigital": "2024-01-15T00:00:00.000Z",
      "idUsuarioDigital": "UD001",
      "nombrePreferido": "María",
      // ... otros campos
    }
  ],
  "total": 5
}
```

## 📊 Estructura de Datos Esperada

La aplicación espera que tu tabla `clientes_lealtad` tenga esta estructura. Asegúrate de que los nombres de las columnas coincidan:

## 🔍 Troubleshooting

### Error de Conexión
- Verifica que PostgreSQL esté ejecutándose
- Confirma que las credenciales en `DATABASE_URL` sean correctas
- Para conexiones SSL, asegúrate de incluir `?sslmode=require` en la URL

### Fallback a Datos de Ejemplo
- Si hay problemas de conexión, la aplicación mostrará datos de ejemplo
- Revisa la consola del navegador para ver errores específicos
- Verifica que la tabla `clientes_lealtad` exista en tu base de datos
- Asegúrate de que los nombres de las columnas coincidan con el schema definido

## 🛠️ Desarrollo

La aplicación incluye:
- ✅ Conexión robusta con Drizzle ORM (solo lectura)
- ✅ Manejo de errores y fallback a datos de ejemplo  
- ✅ API REST para consultar datos filtrados
- ✅ Interfaz reactiva que se actualiza automáticamente
- ✅ Loading states y mensajes de error
- ✅ Soporte para filtros de rango de fechas
- ✅ **SEGURA**: Solo realiza consultas SELECT, no modifica la base de datos
