# QA Admin Dashboard

Panel de administración para gestionar pruebas de calidad, planificación de testing, automatización con Playwright y generación inteligente de casos de prueba mediante IA.

---

## Funcionalidades principales

| Módulo | Descripción |
|---|---|
| **Pruebas Manuales** | Gestión jerárquica de casos de prueba (Proyecto → Módulo → Submódulo → Tipo) |
| **QA Test Case Architect Agent** | Agente IA que genera casos de prueba siguiendo la Taxonomía Oficial de QA con RAG (BM25) |
| **Planificación** | Creación y seguimiento de planes de prueba |
| **Automatización** | Gestión y ejecución local de scripts Playwright con logs en vivo |
| **Vista de Resultados** | Historial detallado de ejecuciones manuales y automáticas con evidencias (screenshots) |
| **Dashboard** | Métricas y estado general del QA |

---

## Arquitectura de ejecución

1. **Frontend (React-Admin)**: Interfaz para gestionar casos, lanzar ejecuciones y visualizar resultados.
2. **Servidor Backend (`server/index.js`)**: Servidor Express centralizado que gestiona la autenticación personalizada, el proxy de datos hacia Firestore y la ejecución de automatizaciones.
3. **Socket.io**: Comunicación bidireccional para transmitir logs de ejecución en tiempo real al navegador.
4. **Firebase Firestore**: Almacenamiento persistente de usuarios, sesiones, resultados de ejecución (`test_results`) y estado de tests (`automation`).

### Autenticación Personalizada

El sistema ha migrado de Firebase Auth a un sistema de autenticación propio basado en sesiones persistentes en Firestore y cookies `httpOnly`.

- **Usuarios**: Almacenados en la colección `users` con contraseñas hasheadas (scrypt).
- **Sesiones**: Almacenadas en la colección `sessions` con expiración configurable.
- **Seguridad**: Todas las peticiones al backend requieren una sesión válida gestionada vía cookies seguras.

### Configuración del Servidor

Para que el sistema funcione, debes configurar las variables de entorno en `.env`:

```env
# Frontend. En local puede quedar vacío; en producción debe apuntar al backend.
VITE_API_BASE_URL=https://api.example.com

# Configuración del servidor
AUTH_SERVER_PORT=9000
FRONTEND_ORIGIN=http://localhost:3000,https://your-cloudflare-pages-domain.pages.dev
SESSION_COOKIE_NAME=qa_session
SESSION_TTL_DAYS=30
SESSION_COOKIE_SAMESITE=None
SESSION_COOKIE_SECURE=true

# Credenciales de Firebase Admin (Requerido para el backend)
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'

# Usuario Administrador Inicial
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=tu_password_seguro
ADMIN_NAME=Admin
ADMIN_ROLE=admin
```

### Inicialización del Administrador

Para crear el primer usuario administrador, ejecuta:

```bash
npm run auth:seed
```

---

## Automatización con Playwright

### Configuración de Automatización

Para que la automatización funcione en local, debes configurar las variables de entorno específicas en `.env.automation`:

```env
BASE_URL=https://tu-sitio-a-testear.com
# Otras variables necesarias para tus tests de Playwright
```

### Ejecución del Servidor de Automatización

Es necesario tener corriendo el servidor backend para poder listar y ejecutar los archivos `.spec.ts`:

```bash
npm run server
```

---

## QA Test Case Architect Agent

El agente de IA está integrado en la sección **Pruebas Manuales** (botón `Agente IA`). Genera casos de prueba a partir de una Historia de Usuario siguiendo la **Taxonomía Oficial de QA** en tres niveles:

### 1. Tipos de Prueba — *What* (qué validar)

| Tipo | Enfoque | Descripción |
|---|---|---|
| **Pre-QA / Quality Gate** | Mixto | Verificación técnica previa: tests unitarios, code review, changelog, sync master, migraciones |
| **Funcionales** | Caja Negra | Validación de reglas de negocio y flujos del sistema |
| **No Funcionales** | Mixto | Performance, Seguridad, Usabilidad, Compatibilidad |
| **Smoke** | Caja Negra | Happy path — flujo principal crítico |
| **Regresión** | Caja Negra + automatización | Verificación de bugs históricos y estabilidad |
| **UAT** | Caja Negra + experiencia | Aceptación, escenarios E2E, validación de negocio |
| **Integración** | Caja Negra / Gris | Interfaces entre módulos, transición de estados |
| **Unitarias** | Caja Blanca | Cobertura de lógica y decisiones de código |
| **Exploratorias** | Basadas en experiencia | Error guessing, checklist, sesiones exploratorias |

### 2. Enfoques de Prueba — *How* (cómo diseñar)

- **Caja Negra** — comportamiento externo, sin conocer implementación interna.
- **Caja Blanca** — estructura interna, cobertura de código.
- **Caja Gris** — combinación de ambos enfoques.
- **Basado en Experiencia** — criterio y conocimiento del tester.

### 3. Técnicas de Diseño — *How Exact* (cómo generar casos)

| Técnica | Enfoque | Tipos de prueba que la usan |
|---|---|---|
| Checklist de calidad técnica | Mixto | Pre-QA / Quality Gate |
| Partición de equivalencia | Caja Negra | Funcionales, Regresión |
| Valores límite | Caja Negra | Funcionales, No Funcionales, Regresión |
| Transición de estados | Caja Negra | Funcionales, Integración |
| Tablas de decisión | Caja Negra | Funcionales, Integración |
| Casos de uso / Escenarios E2E | Caja Negra | UAT, Integración |
| Reglas de negocio | Caja Negra | Funcionales |
| Cobertura de sentencias/decisiones | Caja Blanca | Unitarias |
| Exploratory testing | Experiencia | Exploratorias |
| Error guessing | Experiencia | Exploratorias, Regresión |

### Campos de entrada

| Campo | Requerido | Descripción |
|---|---|---|
| Historia de usuario | Sí | Formato estándar: Como [rol] / Quiero [funcionalidad] / Para [beneficio] |
| Criterios de aceptación | No | Condiciones que debe cumplir la historia |
| Reglas de negocio | No | Restricciones y validaciones del dominio |
| Bugs históricos | No | Bugs conocidos relacionados con la funcionalidad |
| Top K | No (default: 3) | Número de chunks del knowledge base a recuperar (1–20) |

### Salida generada

El agente produce:
- **Condiciones identificadas**: particiones de equivalencia y valores límite por variable
- **Tabla de decisiones**: causas, efectos, alternativas y reglas (cuando aplica al flujo)
- **Casos de prueba**: con ID, tipo, prioridad (P0–P3), técnicas aplicadas, justificación de riesgo, impacto en integración y referencias de regresión

Los casos se guardan en Firebase Firestore con `category` (tipo de prueba), `tags` (técnicas) y `aiArtifacts` (tabla de decisión estructurada).

---

## Knowledge Base (RAG con BM25)

El agente implementa un pipeline **RAG (Retrieval-Augmented Generation)** completo ejecutándose en el browser, sin dependencias de servidor externo.

### Arquitectura del pipeline

```
Query enriquecida (historia + criterios + reglas + bugs)
    → BM25Retriever  (public/knowledge/)
    → buildSystemPrompt()  ← inyecta chunks relevantes en el system message
    → OpenAI GPT
    → JSON estructurado con casos de prueba
```

### Implementación BM25

- **Motor**: BM25 (Okapi BM25) implementado en TypeScript puro (`src/services/knowledgeService.ts`)
- **Parámetros**: `k1=1.5`, `b=0.75` (estándar)
- **Chunking**: 400 palabras por chunk, 50 palabras de solapamiento (igual que el backend Python de referencia)
- **Tokenización**: lowercase + eliminación de puntuación + filtro de tokens cortos (preserva caracteres españoles)
- **Carga**: lazy al primer uso, índice en memoria (se reconstruye en cada sesión)

### Archivos del knowledge base

```
public/knowledge/
├── manifest.json           ← lista de archivos a indexar
├── bugs_historicos.txt     ← 390+ bugs reales del sistema (63 KB)
├── reglas_negocio.txt      ← reglas del dominio de negocio
├── criterios_acceso.txt    ← criterios de acceso al sistema
└── features_mejoras.txt    ← nuevas funcionalidades y mejoras (UX/Performance)
```

### Agregar o actualizar conocimiento

1. Agregar o editar archivos `.txt` en `public/knowledge/`
2. Actualizar `public/knowledge/manifest.json` con el nombre del nuevo archivo
3. No requiere recompilación — los archivos se sirven como assets estáticos

```json
["bugs_historicos.txt", "reglas_negocio.txt", "criterios_acceso.txt", "nuevo_archivo.txt"]
```

---

## Configuración del Agente IA

El agente se configura desde **Configuración → Integraciones** en la UI (se almacena en `localStorage` bajo la clave `qaScopeConfig`). Soporta múltiples proveedores de LLM:

| Proveedor | Modelos disponibles | Notas |
|---|---|---|
| **OpenAI** | `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo` | Requiere API key |
| **DeepSeek** | `deepseek-chat`, `deepseek-reasoner` | Requiere API key |
| **Ollama Cloud** | Modelos locales expuestos vía API | Requiere URL del servidor |

> Si no hay proveedor configurado, el agente opera en **modo simulación** devolviendo casos de prueba básicos generados localmente.

---

## Variables de entorno (Firebase)

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

---

## Tecnologías

| Tecnología | Uso |
|---|---|
| React + TypeScript | Framework principal |
| React-Admin | UI administrativa (List, Datagrid, Resources) |
| Material UI (MUI) | Componentes de interfaz |
| Vite | Bundler |
| Firebase (Firestore) | Base de datos para usuarios, sesiones y resultados |
| Firebase Admin SDK | Acceso privilegiado desde el servidor |
| OpenAI API | LLM para generación de casos de prueba |
| BM25 (TypeScript) | Retrieval del knowledge base en el browser |
| Playwright | Automatización de pruebas |
| Socket.io | Logs en tiempo real para automatización |
| Express | Servidor backend centralizado |

---

## Instalación y Despliegue

### Desarrollo Local

Para trabajar en local, necesitas tener corriendo tanto el frontend como el servidor backend:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env (ver sección de variables)

# 3. Inicializar usuario admin (solo la primera vez)
npm run auth:seed

# 4. Iniciar el servidor backend (Puerto 9000 por defecto)
npm run server

# 5. En otra terminal, iniciar el frontend (Vite)
npm run dev
```

### Despliegue en Producción

En producción (ej. Cloudflare, VPS, etc.), el flujo es distinto:

1. **Frontend**: Se debe configurar `VITE_API_BASE_URL` con la URL pública del backend antes de generar el build estático:
   ```bash
   VITE_API_BASE_URL=https://api.example.com
   npm run build
   ```
   Los archivos resultantes en la carpeta `dist/` se despliegan en un servicio de hosting estático (como Cloudflare Pages).

2. **Backend**: El servidor Node.js (`npm run server`) **debe estar ejecutándose permanentemente** en un entorno que soporte Node.js (VPS, Docker, Heroku, etc.). No se puede desplegar como un sitio estático.

3. **Proxy/CORS**: Asegúrate de que `FRONTEND_ORIGIN` en el `.env` del servidor incluya la URL final de Cloudflare Pages para permitir las cookies de sesión. Si frontend y backend están en dominios distintos, usa `SESSION_COOKIE_SAMESITE=None` y `SESSION_COOKIE_SECURE=true`.

Si `VITE_API_BASE_URL` no está configurado en Cloudflare Pages, el navegador intentará enviar `POST /auth/login` al propio sitio estático y Cloudflare responderá `405 Method Not Allowed`.

---

## Estructura relevante del proyecto

```
src/
├── components/
│   ├── navigation/AppMenu.tsx   ← Menú principal
│   └── TestCases/               ← Componentes de pruebas manuales
├── pages/
│   ├── AutomationRunner/        ← Módulo de Automatización
│   ├── TestResults/             ← Vista de Resultados (Manual/Auto)
│   └── Configuration/           ← Configuración global
├── firebase/
│   ├── dataProvider.ts          ← Adaptador de datos (API Proxy)
│   └── auth.ts                  ← Proveedor de autenticación (API Proxy)
server/
├── index.js                     ← Punto de entrada del servidor
├── auth.js                      ← Lógica de sesión y rutas de auth
├── dataRoutes.js                ← CRUD de Firestore vía Admin SDK
└── automationRoutes.js          ← Ejecución de Playwright
scripts/
└── seed-admin.js                ← Script para crear usuario inicial
```
