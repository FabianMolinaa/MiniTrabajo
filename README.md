# MiniTrabajo

## Descripción
* **Qué hace:** MiniTrabajo es una aplicación móvil diseñada como una plataforma intermediaria para la coordinación de tareas y trabajos puntuales ("pololitos"). Cuenta con una interfaz intuitiva con vista de lista y mapa interactivo para localizar labores cercanas a la ubicación del usuario, gestionar postulaciones, controlar el ciclo de vida de los acuerdos y registrar calificaciones mutuas con estrellas y comentarios para construir una reputación verificable.
* **A quién va dirigido:** 
  * **Publicadores de tareas:** Personas o pequeños comercios que requieren resolver necesidades inmediatas (hogar, mudanza, mascotas, reparaciones menores) contactando a usuarios cercanos y confiables.
  * **Ejecutores de tareas:** Personas interesadas en generar ingresos adicionales realizando labores esporádicas según sus tiempos, habilidades y cercanía geográfica.
* **Qué problema resuelve:** Centraliza y formaliza acuerdos informales en Chile que no encajan en los portales de empleo tradicionales, eliminando la dispersión y otorgando un marco estructurado, ágil y transparente para convenir tareas puntuales en comunidades locales.

---

## Tecnologías utilizadas

| Tecnología | Rol en el Proyecto |
| :---: | :--- |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="React Native" width="40" height="40"/> <br> **React Native** | Framework principal para el desarrollo de la aplicación móvil multiplataforma. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/expo/expo-original.svg" alt="Expo" width="40" height="40"/> <br> **Expo** | Entorno y conjunto de herramientas para la compilación, ejecución y APIs nativas. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" alt="TypeScript" width="40" height="40"/> <br> **TypeScript** | Lenguaje de desarrollo para tipado estático robusto y mantenimiento del código. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/supabase/supabase-original.svg" alt="Supabase" width="40" height="40"/> <br> **Supabase** | Backend as a Service (BaaS) que provee autenticación JWT, API REST y almacenamiento. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" width="40" height="40"/> <br> **PostgreSQL** | Motor de base de datos relacional para la persistencia e integridad de perfiles, tareas y reseñas. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg" alt="Git" width="40" height="40"/> <br> **Git** | Sistema de control de versiones distribuido del equipo. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/github/github-original.svg" alt="GitHub" width="40" height="40"/> <br> **GitHub** | Plataforma de alojamiento de repositorios y trabajo colaborativo. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/trello/trello-plain.svg" alt="Trello" width="40" height="40"/> <br> **Trello** | Tablero Kanban para la gestión ágil del sprint, backlog e historias de usuario. |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vscode/vscode-original.svg" alt="VS Code" width="40" height="40"/> <br> **VS Code** | Entorno de desarrollo integrado (IDE) utilizado por el equipo. |

---

## Instrucciones para ejecutar el proyecto localmente

### Requisitos previos
* Tener instalado **Node.js** (versión LTS 18 o superior).
* Gestor de paquetes **npm** o **pnpm**.
* Dispositivo móvil con la aplicación **Expo Go** instalada (Android o iOS) o un emulador de desarrollo configurado.

### Instalación de dependencias

1. **Clonar el repositorio**:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   ```

2. **Acceder al directorio del proyecto**:
   
   Nota importante: Asegúrate de situarte dentro de la carpeta donde reside el archivo `package.json`.

   ```bash
   cd "Fase 2\MiniTrabajo"
   ```

3. **Instalar dependencias**:
   ```bash
   npm install
   ```

### Configuración de variables de entorno

El proyecto requiere credenciales de conexión con el backend en Supabase. Dado que el archivo `.env` contiene información sensible y está protegido por el archivo `.gitignore`, debe crearse localmente:

1. **Crear un archivo llamado exactamente `.env`** en la raíz de la carpeta del proyecto (al mismo nivel que `package.json`).

2. **Copiar como base la estructura del archivo `.env.example`**:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```

3. **Reemplazar los valores** por la URL y la clave anónima pública (anon / publishable key) correspondientes a la instancia de Supabase.

### Ejecución de la aplicación

1. **Iniciar el servidor de desarrollo de Metro**:
   
   Se recomienda ejecutarlo con el parámetro `-c` para limpiar la memoria caché y garantizar la correcta lectura del archivo `.env`:

   ```bash
   npx expo start -c
   ```

2. **Visualizar la app en el dispositivo**:

   - **Android**: Abre la app Expo Go en tu teléfono y selecciona la opción para escanear el código QR que aparece en la terminal.
   
   - **iOS**: Abre la aplicación de la Cámara nativa, enfoca el código QR desplegado en la terminal y pulsa la notificación para abrirlo dentro de Expo Go.
  
---

## Integrantes del equipo
| Tecnología | Rol en el Proyecto |
| :---: | :--- |
|Kevin Valenzuela|Gestión de proyecto (Scrum Master) y documentación|
|Fabián Molina|Desarrollador Full-Stack|
|Alexsander Atenas|Desarrollador Full-Stack|

---

## Metodología de trabajo del equipo

El equipo implementa un marco de trabajo ágil híbrido combinando **Scrum y Kanban**:

* **Gestión del flujo de trabajo:** Se utiliza un tablero Kanban en **Trello** estructurado con columnas de progreso continuo (*Product Backlog*, *En progreso*, *Hecho*) para visibilizar el avance de cada tarea técnica.
* **Organización funcional en épicas:** El desarrollo del producto se encuentra estructurado en torno a cuatro épicas principales:
  - *Registro, Autenticación y Gestión de Perfil de Usuario:* Autenticación con credenciales seguras, edición de comuna, biografía y avatar.
  - *Publicación y Visualización de Tareas:* Muro de trabajos con filtros por categoría, comuna, distancia y visualización interactiva en mapa.
  - *Flujo de Postulación, Selección y Ciclo de Vida:* Mecanismo de postulación, aceptación por parte del solicitante, coordinación externa vía enlace directo a WhatsApp y cierre con calificación mutua mediante estrellas.
  - *Módulo de Monetización:* Sistema de créditos para destacar publicaciones dentro del listado.
* **Criterios de aceptación:** El paso de una historia a la columna *Hecho* está condicionado al cumplimiento riguroso de la *Definition of Done* (DoD) acordada por el equipo.

---

## Arquitectura de la solución

El proyecto implementa una arquitectura **Cliente-Servidor (BaaS / Serverless)** orientada a dispositivos móviles:

```text
+------------------------------------------------------------------------+
|                      CLIENTE - Dispositivo Móvil                       |
|                                                                        |
|   +----------------------------------------------------------------+   |
|   |            Aplicación Móvil (React Native con Expo)            |   |
|   |      - Interfaces en TypeScript (Vistas / Componentes)         |   |
|   |      - Navegación por pestañas (@react-navigation/bottom-tabs) |   |
|   |      - Persistencia de sesión local (@react-native-async-storage)|   |
|   +----------------------------------------------------------------+   |
|                                   |                                    |
|                                   | Utiliza                            |
|                                   v                                    |
|   +----------------------------------------------------------------+   |
|   |            SDK de Conexión (@supabase/supabase-js)             |   |
|   +----------------------------------------------------------------+   |
+-----------------------------------|------------------------------------+
                                    |
                        HTTPS / REST API / WSS
                                    |
+-----------------------------------v------------------------------------+
|                    SERVIDOR / NUBE - Supabase Cloud                    |
|                                                                        |
|   +----------------------------------------------------------------+   |
|   |       Supabase Auth: Sesiones de usuario y tokens JWT          |   |
|   +----------------------------------------------------------------+   |
|   |       PostgREST: API REST autogenerada sobre la base de datos  |   |
|   +----------------------------------------------------------------+   |
|   |       Supabase Storage: Almacenamiento de multimedia (avatars) |   |
|   +----------------------------------------------------------------+   |
|   |       PostgreSQL + PostGIS: Persistencia de datos relacionales |   |
|   |       (tablas perfiles, trabajos, postulaciones, resenas)      |   |
|   |       con políticas de seguridad de fila (RLS)                 |   |
|   +----------------------------------------------------------------+   |
+------------------------------------------------------------------------+
