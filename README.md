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
| **OpenLaila** | Chatbot de soporte conversacional con base de conocimiento propia en PDF (RAG con BM25) e historial persistente en Firestore |
| **Dashboard** | Métricas y estado general del QA |

---

## Automatización con Playwright

El sistema permite integrar y ejecutar pruebas automatizadas de Playwright directamente desde la interfaz.

### Arquitectura de ejecución

1. **Frontend (React-Admin)**: Interfaz para gestionar casos, lanzar ejecuciones y visualizar resultados.
2. **Servidor Local (`automation-server.js`)**: Servidor Express que actúa como puente entre la web y el sistema local.
3. **Socket.io**: Comunicación bidireccional para transmitir logs de ejecución en tiempo real al navegador.
4. **Firebase Firestore**: Almacenamiento persistente de los resultados de cada ejecución (`test_results`) y actualización del estado de salud de cada test (`automation`).

### Configuración de Automatización

Para que la automatización funcione en local, debes configurar las variables de entorno específicas en `.env.automation`:

```env
BASE_URL=https://tu-sitio-a-testear.com
# Otras variables necesarias para tus tests de Playwright
```

### Ejecución del Servidor de Automatización

Es necesario tener corriendo el servidor local para poder listar y ejecutar los archivos `.spec.ts`:

```bash
npm run automation:server
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
├── features_mejoras.txt    ← nuevas funcionalidades y mejoras (UX/Performance)
└── Laila/
    ├── manifest.json       ← documentos funcionales adicionales
    └── *.md                ← manuales, roles, errores y preguntas frecuentes
```

El agente de casos de prueba combina automáticamente los documentos de
`public/knowledge/manifest.json` y `public/knowledge/Laila/manifest.json` en un
único índice. Conserva el prefijo `Laila/` en las fuentes para mantener la
trazabilidad. `Laila/instructions.md` se excluye expresamente porque contiene
la personalidad del chatbot, no conocimiento funcional.

### Agregar o actualizar conocimiento

1. Agregar o editar archivos `.md`, `.txt` o `.pdf` en `public/knowledge/` o
   `public/knowledge/Laila/`
2. Actualizar el `manifest.json` correspondiente con el nombre del nuevo archivo
3. No requiere recompilación — los archivos se sirven como assets estáticos

```json
["bugs_historicos.txt", "reglas_negocio.txt", "criterios_acceso.txt", "nuevo_archivo.txt"]
```

---

## OpenLaila (Chatbot de soporte)

**OpenLaila** es un chatbot conversacional de soporte, independiente del agente de generación de casos de prueba, disponible en el menú lateral (`/openlaila`).

- **Modelo de IA**: reutiliza exactamente la misma configuración de proveedor/modelo de **Configuración → Integraciones** que usa el agente de Pruebas Manuales (`getLLMConfig()` en `src/services/aiService.ts`). No requiere configuración adicional.
- **Base de conocimiento propia**: indexa archivos ubicados en `public/knowledge/Laila/`, usando el mismo motor BM25 (`src/services/bm25.ts`). Soporta dos formatos:
  - **`.md` / `.txt` (recomendado)**: se cargan como texto plano directamente, sin procesamiento adicional.
  - **`.pdf`**: se extrae el texto en el navegador vía `pdfjs-dist` (más pesado y con menor fidelidad de formato que un `.md`).
- **Historial persistente**: cada mensaje se guarda en Firestore, colección `openlaila_messages`, asociado al `uid` del usuario autenticado (`src/services/lailaConversationService.ts`).
- **Instrucciones / personalidad del bot**: el system prompt (identidad "Laila", reglas anti-alucinación, permisos por rol, reglas de escalamiento, cierre de conversación, etc.) vive en `public/knowledge/Laila/instructions.md` — **no** se lista en `manifest.json` (no se indexa por BM25, se inyecta siempre completo al inicio del prompt). Se puede editar sin recompilar la app.
- **Rol simulado**: el selector "Rol simulado" en la UI del chat reemplaza el placeholder `{user_rol}` de `instructions.md`, permitiendo probar cómo respondería Laila según el nivel de permisos del usuario (Admin, Property Owner, Coordinador, Recepción, Centro de Control, Empleado).

### Agregar documentos a la base de conocimiento de OpenLaila

Los PDFs originales se guardan como fuente en `knowledge-sources/Laila/` (fuera de `public/`, para no inflar el bundle servido al navegador con binarios). Solo los `.md` convertidos viven en `public/knowledge/Laila/` y son los que realmente se indexan.

1. Copiar el/los archivo(s) `.pdf` dentro de `knowledge-sources/Laila/`.
2. Convertirlos a Markdown:

   ```bash
   npm run knowledge:laila:convert
   ```

   Esto usa `@opendocsg/pdf2md` (script en `scripts/convertLailaPdfsToMarkdown.mjs`) para leer cada `.pdf` de `knowledge-sources/Laila/` y generar el `.md` correspondiente en `public/knowledge/Laila/`.

3. Agregar el nombre del archivo `.md` generado a `public/knowledge/Laila/manifest.json`, por ejemplo:

```json
["manual_usuario.md", "politicas_soporte.md"]
```

4. No requiere recompilación — el índice BM25 se construye en el navegador la primera vez que se abre el chat.

> También se puede colocar un `.pdf` o `.txt` directamente en `public/knowledge/Laila/` y listarlo en el manifest sin convertir — `lailaKnowledgeService.ts` detecta la extensión y extrae el texto en el navegador (`.pdf` vía `pdfjs-dist`) o lo lee tal cual (`.md`/`.txt`). Se recomienda `.md` por mejor calidad y rendimiento.

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
| Firebase (Firestore + Auth) | Base de datos y autenticación |
| OpenAI API | LLM para generación de casos de prueba |
| BM25 (TypeScript) | Retrieval del knowledge base en el browser |
| Playwright | Automatización de pruebas |
| Socket.io | Logs en tiempo real para automatización |
| Express | Servidor de ejecución local |

---

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Iniciar servidor de automatización (necesario para correr tests)
npm run automation:server

# Construir para producción
npm run build
```

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
│   ├── dataProvider.ts          ← Adaptador de datos para Firestore
│   └── fixAutomationData.ts     ← Script de sincronización de tests
├── automation-server.js         ← Servidor local de ejecución
├── playwright.config.ts         ← Configuración de Playwright
└── .env.automation              ← Variables para tests automáticos
```
