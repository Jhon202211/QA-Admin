# QA Admin Dashboard

Panel de administración para gestionar pruebas de calidad, planificación de testing, automatización con Playwright y generación inteligente de casos de prueba mediante IA.

---

## Funcionalidades principales

| Módulo | Descripción |
|---|---|
| **Pruebas Manuales** | Gestión jerárquica de casos de prueba (Proyecto → Módulo → Submódulo → Tipo) |
| **QA Test Case Architect Agent** | Agente IA que genera casos de prueba aplicando 7 técnicas QA con RAG (BM25) |
| **Planificación** | Creación y seguimiento de planes de prueba |
| **Resultados** | Registro y visualización de ejecuciones |
| **Automatización** | Editor y runner de scripts Playwright |
| **Dashboard** | Métricas y estado general del QA |

---

## QA Test Case Architect Agent

El agente de IA está integrado en la sección **Pruebas Manuales** (botón `Agente IA`). Genera casos de prueba a partir de una Historia de Usuario y contexto adicional, aplicando automáticamente 7 técnicas QA estándar.

### Técnicas aplicadas

1. **Partición de equivalencia** — agrupa valores de entrada en clases que se comportan igual
2. **Valores límite** — prueba en los bordes de cada partición
3. **Tabla de decisión** — combina condiciones y acciones relevantes
4. **Transición de estados** — verifica comportamiento ante cambios de estado
5. **Pruebas negativas** — escenarios con datos inválidos o históricamente fallidos
6. **Análisis basado en riesgo** — prioriza casos donde el impacto de un fallo es mayor
7. **Regresión basada en historial de bugs** — genera casos para verificar que bugs conocidos no reaparezcan

### Campos de entrada

| Campo | Requerido | Descripción |
|---|---|---|
| Historia de usuario | Sí | Formato estándar: Como [rol] / Quiero [funcionalidad] / Para [beneficio] |
| Criterios de aceptación | No | Condiciones que debe cumplir la historia |
| Reglas de negocio | No | Restricciones y validaciones del dominio |
| Bugs históricos | No | Bugs conocidos relacionados con la funcionalidad |
| Top K | No (default: 5) | Número de chunks del knowledge base a recuperar (1–20) |

### Salida generada

El agente produce:
- **Condiciones identificadas**: particiones de equivalencia y valores límite por variable
- **Tabla de decisiones**: si aplica al flujo analizado
- **Casos de prueba**: con ID, categoría, prioridad (P0–P3), técnicas aplicadas, justificación de riesgo, impacto en integración y referencias de regresión

Los casos se crean directamente en Firebase Firestore con prioridad y tags mapeados desde el JSON del LLM.

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
└── criterios_acceso.txt    ← criterios de acceso al sistema
```

### Agregar o actualizar conocimiento

1. Agregar o editar archivos `.txt` en `public/knowledge/`
2. Actualizar `public/knowledge/manifest.json` con el nombre del nuevo archivo
3. No requiere recompilación — los archivos se sirven como assets estáticos

```json
["bugs_historicos.txt", "reglas_negocio.txt", "criterios_acceso.txt", "nuevo_archivo.txt"]
```

---

## Configuración de OpenAI

El agente requiere una API key de OpenAI. Se configura desde **Configuración → Integraciones** en la UI (se almacena en `localStorage` bajo la clave `qaScopeConfig`).

| Parámetro | Descripción |
|---|---|
| `openaiEnabled` | Activa/desactiva el agente IA |
| `openaiApiKey` | API key de OpenAI |
| `openaiModel` | Modelo a usar (default: `gpt-4o-mini`) |

Modelos soportados: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`.

> Si no hay API key configurada, el agente opera en **modo simulación** devolviendo casos de prueba básicos generados localmente.

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

---

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

---

## Estructura relevante del proyecto

```
src/
├── components/TestCases/
│   ├── AIAgent.tsx              ← Modal del agente IA (UI completa)
│   └── HierarchicalView.tsx     ← Vista jerárquica con botón "Agente IA"
├── services/
│   ├── aiService.ts             ← Lógica RAG + llamada a OpenAI
│   └── knowledgeService.ts      ← BM25 + chunking + carga de knowledge base
├── pages/
│   ├── TestCases/               ← Sección Pruebas Manuales
│   └── Configuration/           ← Configuración de API key
public/
└── knowledge/
    ├── manifest.json
    ├── bugs_historicos.txt
    ├── reglas_negocio.txt
    └── criterios_acceso.txt
```
