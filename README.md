# MiniTrabajo

## 1. Descripción
* **Qué hace:** MiniTrabajo es una aplicación móvil diseñada como una plataforma intermediaria para la coordinación de tareas y trabajos puntuales ("pololitos")[cite: 4, 7]. Cuenta con una interf[...]
* **A quién va dirigido:** 
  * **Publicadores de tareas:** Personas o pequeños comercios que requieren resolver necesidades inmediatas (hogar, mudanza, mascotas, reparaciones menores) contactando a usuarios cercanos y confiabl[...]
  * **Ejecutores de tareas:** Personas interesadas en generar ingresos adicionales realizando labores esporádicas según sus tiempos, habilidades y cercanía geográfica[cite: 4, 7, 12].
* **Qué problema resuelve:** Centraliza y formaliza acuerdos informales en Chile que no encajan en los portales de empleo tradicionales, eliminando la dispersión y otorgando un marco estructurado, [...]

---

## 2. Tecnologías utilizadas

| Tecnología | Rol en el Proyecto |
| :---: | :--- |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="React Native" width="40" height="40"/> <br> **React Native** | Framework principal para el de[...] |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/expo/expo-original.svg" alt="Expo" width="40" height="40"/> <br> **Expo** | Entorno y conjunto de herramientas para la compi[...] |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" alt="TypeScript" width="40" height="40"/> <br> **TypeScript** | Lenguaje de desarrollo p[...] |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/supabase/supabase-original.svg" alt="Supabase" width="40" height="40"/> <br> **Supabase** | Backend as a Service (BaaS) que [...] |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" width="40" height="40"/> <br> **PostgreSQL** | Motor de base de datos r[...] |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg" alt="Git" width="40" height="40"/> <br> **Git** | Sistema de control de versiones distribuido del equi[...] |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/github/github-original.svg" alt="GitHub" width="40" height="40"/> <br> **GitHub** | Plataforma de alojamiento de repositorio[...] |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/trello/trello-plain.svg" alt="Trello" width="40" height="40"/> <br> **Trello** | Tablero Kanban para la gestión ágil del s[...] |
| <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vscode/vscode-original.svg" alt="VS Code" width="40" height="40"/> <br> **VS Code** | Entorno de desarrollo integrado (IDE) [...]|

---

## 3. Instrucciones para ejecutar el proyecto localmente

### Requisitos previos
* Tener instalado **Node.js** (versión LTS 18 o superior).
* Gestor de paquetes **npm** o **pnpm**.
* Dispositivo móvil con la aplicación **Expo Go** instalada (Android o iOS) o un emulador de desarrollo configurado[cite: 7].

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
