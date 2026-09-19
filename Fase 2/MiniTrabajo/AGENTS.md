# AGENTE.MD - Contexto del Proyecto "Mini-Trabajo" (Pololitos)

## 1. Visión General del Producto

Aplicación móvil desarrollada en React Native con Expo y TypeScript, orientada al mercado chileno. Su objetivo es conectar de forma rápida a personas que necesitan ayuda con tareas puntuales ("pololitos": armado de muebles, paseos de mascotas, fletes, etc.) con personas dispuestas a realizarlas a cambio de un pago directo.

---

## 2. Modelo de Negocio y Marco Legal (Intermediario Estricto)

- **Sin Pasarelas de Pago:** La aplicación no procesa pagos en línea ni retiene dinero de los usuarios, evitando complicaciones legales, de custodia de fondos o tributarias (SII).
- **Pago Directo:** El pago se acuerda y se efectúa directamente entre las partes (efectivo o transferencia / CuentaRUT) al finalizar la tarea.
- **Monetización por Créditos de Visibilidad:**
  - Compra in-app de paquetes de créditos digitales (ej. 10 créditos por $2.990).
  - Al publicar, el usuario puede activar un switch para **"Destacar publicación"** consumiendo créditos (ej. 5 créditos) para aparecer en los primeros puestos de búsqueda.

---

## 3. Stack Tecnológico y Arquitectura

- **Framework:** React Native con Expo (TypeScript / JavaScript).
- **Gestor de Paquetes:** pnpm / npm (En este caso npm).
- **Navegación:** `@react-navigation/bottom-tabs` con barra flotante personalizada (estilo cápsula/pill).
- **Estilo Visual:** Dark theme moderno (`#0d1117`, `#161b22`, `#21262d`), con acentos en azul (`#38bdf8`) y verde (`#34d399`).
- **Comunicación Externa:** Deep Linking nativo hacia WhatsApp (`Linking.openURL('https://wa.me/569...')`) tras la aceptación del candidato.

---

## 3.1 Setup del Repositorio (Clone y Dependencias)

El proyecto es gestionado con **Git** y depende del archivo `.gitignore`. Si un compañero clona el repositorio, debe saber lo siguiente:

- **Qué se sube y qué no (role del `.gitignore`):**
  - **SÍ se trackean:** `src/`, `assets/`, `App.tsx`, `app.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `AGENTS.md`, `.gitignore`.
  - **NO se suben (por ser regenerables o locales):** `node_modules/`, `.expo/`, `.kotlin/`, `/ios`, `/android`, `.env*.local`, `dist/`, `web-build/`. Esto es correcto y deseado: evita subir archivos pesados, de caché o secretos local mistakes.
- **Pasos para clonar y dejar funcionando el proyecto:**
  ```bash
  git clone <url-del-repo>
  cd MiniTrabajo
  npm install
  npm start
  ```
  `npm install` regenera `node_modules` a partir de `package-lock.json`, garantizando versiones idénticas entre ambos desarrolladores (por eso el lockfile NUNCA debe ignorarse ni borrarse).
- **No eliminar ni modificar el `.gitignore`** sin coordinarse con el equipo, ni commitear `node_modules` ni el `.env` real con secretos.
- **Variables de entorno:** si se usa `.env` con claves reales, NO se sube. Compartir aparte o documentar un `.env.example` trackeado con las variables requeridas y sus valores de ejemplo.

---

## 4. Estructura de Carpetas Actual (Workspace)

```text
MiniTrabajo/
├── .expo/              # Generado por Expo (no se sube)
├── assets/
├── node_modules/       # Regenerado con npm install (no se sube)
├── src/
│   ├── screens/
│   │   ├── PerfilScreen.tsx
│   │   ├── PublicarScreen.tsx
│   │   └── TrabajosScreen.tsx
│   └── theme/
│       └── colors.ts
├── .gitignore
├── AGENT.md
├── app.json
├── App.tsx
├── index.ts
├── package-lock.json
├── package.json
└── tsconfig.json
```

> Nota: las carpetas `.expo/`, `node_modules/` y las generadas por Expo (**/ios, /android**) aparecen de forma local pero **no existen en el repositorio remoto**. Al clonar, se obtienen a través de `npm install` o se generan automáticamente al ejecutar el proyecto.
