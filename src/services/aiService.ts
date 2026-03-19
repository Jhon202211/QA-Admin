import { knowledgeService } from './knowledgeService';
import type { KnowledgeChunk } from './knowledgeService';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface AICondition {
  name: string;
  description: string;
  equivalence_partitions: string[];
  boundary_values: string[];
  notes: string;
}

export interface AIDecisionTable {
  applicable: boolean;
  headers: string[];
  rows: string[][];
}

export interface AITestCaseDetail {
  id: string;
  title: string;
  category:
    | 'positive'
    | 'negative'
    | 'boundary'
    | 'state_transition'
    | 'high_risk'
    | 'regression'
    | 'security'
    | 'performance';
  preconditions: string[];
  steps: string[];
  expected_result: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  technique_applied: string[];
  risk_rationale: string;
  regression_links: string[];
  integration_impact: string[];
  data: {
    inputs: Record<string, unknown>;
    expected_outputs: Record<string, unknown>;
  };
}

export interface AITestCaseSuggestion {
  project: string;
  module: string;
  submodule: string;
  test_type: string;
  conditions: AICondition[];
  decision_table: AIDecisionTable;
  test_cases: AITestCaseDetail[];
}

// ── Prompt del sistema ───────────────────────────────────────────────────────

const AI_PROMPT_BASE = `Eres un QA Lead experto en diseño avanzado de casos de prueba manuales.

Aplica explícitamente estas 7 técnicas QA:
- Partición de equivalencia: agrupa valores de entrada en clases que se comportan igual
- Valores límite: prueba en los bordes de cada partición
- Tabla de decisión: combina condiciones y acciones relevantes en una tabla
- Transición de estados: verifica comportamiento ante cambios de estado del sistema
- Pruebas negativas: escenarios con datos inválidos o históricamente fallidos
- Análisis basado en riesgo: prioriza casos donde el impacto de un fallo es mayor
- Regresión basada en historial de bugs: genera casos que verifiquen que bugs conocidos no reaparezcan

A partir de la información proporcionada (historia de usuario, criterios de aceptación, reglas de negocio, bugs históricos), genera:
1. Identificación de condiciones y variables (particiones de equivalencia, valores límite)
2. Tabla de decisiones (si aplica al flujo)
3. Casos de prueba: positivos, negativos, valores límite, transición de estados, riesgo alto, regresión

Reglas:
- No inventar reglas de negocio que no estén en el contexto dado
- Usar lenguaje claro y profesional orientado a QA manual
- El módulo y submódulo deben reflejar el área funcional real de la historia
- El test_type debe ser uno de: Funcionales, Regresión, Smoke, No Funcionales, UAT
- Cada caso debe tener al menos 3 pasos detallados

Responde SOLO en JSON válido con esta estructura exacta:
{
  "project": "Nombre del sistema o aplicación al que pertenece la historia (ej: 'Control de Acceso', 'Reservas', 'Gestión de Visitantes'). Debe ser conciso, basado en el dominio de la historia, sin usar términos genéricos como 'Sistema' o 'App'.",
  "module": "Nombre del módulo",
  "submodule": "Nombre del submódulo",
  "test_type": "Funcionales|Regresión|Smoke|No Funcionales|UAT",
  "conditions": [
    {
      "name": "",
      "description": "",
      "equivalence_partitions": [""],
      "boundary_values": [""],
      "notes": ""
    }
  ],
  "decision_table": {
    "applicable": true,
    "headers": [""],
    "rows": [[""]]
  },
  "test_cases": [
    {
      "id": "TC-001",
      "title": "",
      "category": "positive|negative|boundary|state_transition|high_risk|regression|security|performance",
      "preconditions": [""],
      "steps": [""],
      "expected_result": "",
      "priority": "P0|P1|P2|P3",
      "technique_applied": [""],
      "risk_rationale": "",
      "regression_links": [""],
      "integration_impact": [""],
      "data": {
        "inputs": {},
        "expected_outputs": {}
      }
    }
  ]
}`;

/**
 * Construye el prompt del sistema inyectando los chunks recuperados por BM25.
 * Si no hay contexto, omite la sección (igual que el backend Python cuando no
 * hay documentos en el store).
 */
function buildSystemPrompt(contextChunks: KnowledgeChunk[]): string {
  if (contextChunks.length === 0) return AI_PROMPT_BASE;

  const contextSection =
    '\nContexto del sistema (knowledge base):\n' +
    contextChunks.map((c) => `[${c.source}] ${c.content}`).join('\n\n') +
    '\n';

  return AI_PROMPT_BASE.replace(
    'Responde SOLO en JSON válido',
    contextSection + '\nResponde SOLO en JSON válido'
  );
}

// ── Configuración multi-proveedor ────────────────────────────────────────────

export type LLMProvider = 'openai' | 'ollama_cloud' | 'deepseek';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

const PROVIDER_DEFAULTS: Record<LLMProvider, { model: string; baseUrl: string }> = {
  openai:       { model: 'gpt-4o-mini',    baseUrl: 'https://api.openai.com/v1' },
  ollama_cloud: { model: 'llama3.2',        baseUrl: 'https://ollama.com/v1' },
  deepseek:     { model: 'deepseek-chat',   baseUrl: 'https://api.deepseek.com/v1' },
};

/**
 * URLs del proxy de Vite que evitan el error CORS al llamar a APIs externas
 * directamente desde el browser. El dev server reescribe estas rutas hacia
 * el endpoint real del proveedor.
 */
const PROXY_PATHS: Record<LLMProvider, string> = {
  openai:       '/proxy/openai/v1',
  ollama_cloud: '/proxy/ollama/v1',
  deepseek:     '/proxy/deepseek/v1',
};

/**
 * Si la URL configurada es la misma que el endpoint externo por defecto,
 * usamos el proxy de Vite para evitar CORS. Si el usuario configuró una URL
 * personalizada (ej: Ollama self-hosted en localhost:11434), la usamos
 * directamente ya que no tiene restricciones CORS.
 */
function resolveBaseUrl(provider: LLMProvider, configuredUrl: string): string {
  const isDefault = configuredUrl === PROVIDER_DEFAULTS[provider].baseUrl;
  return isDefault ? PROXY_PATHS[provider] : configuredUrl;
}

/**
 * Lee la configuración LLM activa desde localStorage.
 * Soporta el formato nuevo (llmEnabled + llmProvider) y el antiguo (openaiEnabled)
 * para mantener compatibilidad con configuraciones previas.
 */
export const getLLMConfig = (): LLMConfig | null => {
  try {
    const raw = localStorage.getItem('qaScopeConfig');
    if (!raw) return null;
    const cfg = JSON.parse(raw);

    // Compatibilidad con formato anterior (solo OpenAI)
    const enabled = cfg.llmEnabled ?? cfg.openaiEnabled ?? false;
    if (!enabled) return null;

    const provider: LLMProvider = cfg.llmProvider ?? 'openai';
    const defaults = PROVIDER_DEFAULTS[provider];

    const keyMap: Record<LLMProvider, string> = {
      openai:       cfg.openaiApiKey?.trim()   ?? '',
      ollama_cloud: cfg.ollamaApiKey?.trim()   ?? '',
      deepseek:     cfg.deepseekApiKey?.trim() ?? '',
    };
    const modelMap: Record<LLMProvider, string> = {
      openai:       cfg.openaiModel    || defaults.model,
      ollama_cloud: cfg.ollamaModel    || defaults.model,
      deepseek:     cfg.deepseekModel  || defaults.model,
    };
    const rawUrlMap: Record<LLMProvider, string> = {
      openai:       defaults.baseUrl,
      ollama_cloud: cfg.ollamaBaseUrl   || defaults.baseUrl,
      deepseek:     cfg.deepseekBaseUrl || defaults.baseUrl,
    };
    const urlMap: Record<LLMProvider, string> = {
      openai:       resolveBaseUrl('openai',       rawUrlMap.openai),
      ollama_cloud: resolveBaseUrl('ollama_cloud', rawUrlMap.ollama_cloud),
      deepseek:     resolveBaseUrl('deepseek',     rawUrlMap.deepseek),
    };

    const apiKey = keyMap[provider];
    if (!apiKey) return null;

    return { provider, apiKey, model: modelMap[provider], baseUrl: urlMap[provider] };
  } catch (e) {
    console.error('Error al leer configuración LLM:', e);
    return null;
  }
};

// ── Modo simulación (sin API key) ────────────────────────────────────────────

const buildSimulation = (userStory: string): AITestCaseSuggestion => {
  const lower = userStory.toLowerCase();
  let project = 'General';
  let module = 'General';
  let submodule = 'Funcionalidad Principal';
  let testType = 'Funcionales';

  if (lower.includes('acceso') || lower.includes('login') || lower.includes('autenticación')) {
    project = 'Control de Acceso';
    module = 'Accesos';
    submodule = lower.includes('qr') ? 'Acceso QR' : 'Autenticación';
  } else if (lower.includes('visitante') || lower.includes('visitor')) {
    project = 'Gestión de Visitantes';
    module = 'Visitantes';
    submodule = 'Registro de Visitantes';
  } else if (lower.includes('reserva') || lower.includes('reservar')) {
    project = 'Reservas';
    module = 'Reservas';
    submodule = 'Gestión de Reservas';
  } else if (lower.includes('pago') || lower.includes('pagar')) {
    project = 'Pagos';
    module = 'Pagos';
    submodule = 'Procesamiento de Pagos';
  } else if (lower.includes('reporte') || lower.includes('reportar')) {
    project = 'Reportes';
    module = 'Reportes';
    submodule = 'Generación de Reportes';
  } else if (lower.includes('usuario') || lower.includes('perfil')) {
    project = 'Gestión de Usuarios';
    module = 'Usuarios';
    submodule = 'Administración de Perfiles';
  } else {
    // Intentar extraer el dominio del "quiero" de la historia
    const paraMatch = userStory.match(/para\s+(.+?)(?:\.|$)/i);
    if (paraMatch) {
      const words = paraMatch[1].trim().split(/\s+/).slice(0, 3);
      project = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  if (lower.includes('regresión') || lower.includes('regresion')) testType = 'Regresión';
  else if (lower.includes('smoke') || lower.includes('humo')) testType = 'Smoke';
  else if (lower.includes('performance') || lower.includes('rendimiento')) testType = 'No Funcionales';
  else if (lower.includes('uat') || lower.includes('aceptación')) testType = 'UAT';

  const wantMatch = userStory.match(/quiero\s+(.+?)(?:\s+para|$)/i);
  const fn = wantMatch ? wantMatch[1].trim() : 'realizar una acción';

  return {
    project,
    module,
    submodule,
    test_type: testType,
    conditions: [
      {
        name: 'Datos de entrada',
        description: `Condición principal relacionada con: ${fn}`,
        equivalence_partitions: ['Datos válidos', 'Datos inválidos', 'Datos vacíos/nulos'],
        boundary_values: ['Valor mínimo permitido', 'Valor máximo permitido'],
        notes: 'Verificar comportamiento en los límites del sistema',
      },
    ],
    decision_table: { applicable: false, headers: [], rows: [] },
    test_cases: [
      {
        id: 'TC-001',
        title: `Validar ${fn} - Caso positivo`,
        category: 'positive',
        preconditions: ['El usuario tiene permisos necesarios', 'El sistema está operativo'],
        steps: [
          'Acceder a la funcionalidad',
          'Completar todos los campos requeridos con datos válidos',
          'Ejecutar la acción principal',
          'Verificar que el resultado sea el esperado',
        ],
        expected_result: 'La funcionalidad se ejecuta correctamente y se muestra el resultado esperado',
        priority: 'P1',
        technique_applied: ['Partición de equivalencia'],
        risk_rationale: 'Flujo principal de la funcionalidad',
        regression_links: [],
        integration_impact: [],
        data: { inputs: {}, expected_outputs: {} },
      },
      {
        id: 'TC-002',
        title: `Validar ${fn} - Caso negativo`,
        category: 'negative',
        preconditions: ['El usuario tiene permisos necesarios', 'El sistema está operativo'],
        steps: [
          'Acceder a la funcionalidad',
          'Ingresar datos inválidos o incompletos',
          'Intentar ejecutar la acción',
          'Verificar el mensaje de error mostrado',
        ],
        expected_result:
          'El sistema muestra un mensaje de error apropiado y no permite continuar con datos inválidos',
        priority: 'P1',
        technique_applied: ['Pruebas negativas', 'Partición de equivalencia'],
        risk_rationale: 'Validación del manejo de errores',
        regression_links: [],
        integration_impact: [],
        data: { inputs: {}, expected_outputs: {} },
      },
      {
        id: 'TC-003',
        title: `Validar ${fn} - Valores límite`,
        category: 'boundary',
        preconditions: ['El usuario tiene permisos necesarios', 'El sistema está operativo'],
        steps: [
          'Acceder a la funcionalidad',
          'Ingresar el valor exactamente en el límite permitido (mínimo o máximo)',
          'Ejecutar la acción',
          'Verificar el comportamiento del sistema',
        ],
        expected_result: 'El sistema maneja correctamente los valores en los límites definidos',
        priority: 'P2',
        technique_applied: ['Valores límite', 'Partición de equivalencia'],
        risk_rationale: 'Los valores límite son propensos a fallos de validación',
        regression_links: [],
        integration_impact: [],
        data: { inputs: {}, expected_outputs: {} },
      },
    ],
  };
};

// ── Función principal ────────────────────────────────────────────────────────

export const generateTestCasesFromUserStory = async (
  userStory: string,
  acceptanceCriteria?: string,
  businessRules?: string,
  historicalBugs?: string,
  topK: number = 5,
  apiKey?: string
): Promise<AITestCaseSuggestion> => {
  // Construir query enriquecida (igual que el backend TestcasesAgent)
  const parts = [`Historia de usuario:\n${userStory.trim()}`];
  if (acceptanceCriteria?.trim()) parts.push(`Criterios de aceptación:\n${acceptanceCriteria.trim()}`);
  if (businessRules?.trim()) parts.push(`Reglas de negocio:\n${businessRules.trim()}`);
  if (historicalBugs?.trim()) parts.push(`Bugs históricos:\n${historicalBugs.trim()}`);
  const enrichedQuery = parts.join('\n\n');

  // Recuperar contexto relevante del knowledge base con BM25
  const contextChunks = await knowledgeService.retrieve(enrichedQuery, topK);
  if (contextChunks.length > 0) {
    console.log(`[KnowledgeService] ${contextChunks.length} chunks recuperados para la query`);
  }

  const llmConfig = getLLMConfig();
  // Permitir override de API key por parámetro (útil en tests o uso programático)
  const activeConfig: LLMConfig | null = apiKey
    ? { provider: 'openai', apiKey, model: 'gpt-4o-mini', baseUrl: PROXY_PATHS.openai }
    : llmConfig;

  if (activeConfig) {
    try {
      return await callLLM(enrichedQuery, activeConfig, contextChunks);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(msg || `Error al generar casos de prueba con ${activeConfig.provider}. Verifica tu API key.`);
    }
  }

  console.log('Usando modo simulación (no hay API key configurada)');
  return new Promise((resolve) => setTimeout(() => resolve(buildSimulation(userStory)), 1500));
};

// ── Llamada al LLM (OpenAI-compatible: OpenAI, Ollama Cloud, DeepSeek) ───────

/**
 * Extrae JSON de la respuesta del LLM, manejando texto envuelto en fences
 * de markdown (```json ... ```) que algunos modelos producen.
 * Replica el método _strip_markdown_fences() del backend Python.
 */
function extractJSON(text: string): string {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.includes('\n') ? t.slice(t.indexOf('\n') + 1) : t.slice(3);
  }
  if (t.endsWith('```')) {
    t = t.slice(0, t.lastIndexOf('```'));
  }
  return t.trim();
}

export const callLLM = async (
  query: string,
  config: LLMConfig,
  contextChunks: KnowledgeChunk[] = []
): Promise<AITestCaseSuggestion> => {
  const systemPrompt = buildSystemPrompt(contextChunks);
  const endpoint = `${config.baseUrl}/chat/completions`;

  console.log(`[callLLM] provider=${config.provider} model=${config.model}`);

  // response_format solo para OpenAI y DeepSeek (Ollama puede no soportarlo)
  const supportsJsonMode = config.provider === 'openai' || config.provider === 'deepseek';

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
    temperature: 0.7,
  };
  if (supportsJsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: { message?: string } }).error?.message || response.statusText;
    throw new Error(`Error de API ${config.provider} (${response.status}): ${errorMessage}`);
  }

  const data = await response.json();
  const raw = data.choices[0]?.message?.content;
  if (!raw) throw new Error('No se recibió respuesta del LLM');

  let parsed: AITestCaseSuggestion;
  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch {
    throw new Error('La respuesta del LLM no es un JSON válido');
  }

  if (!parsed.module || !parsed.submodule || !parsed.test_type || !parsed.test_cases) {
    throw new Error('La respuesta del LLM no tiene la estructura esperada');
  }

  parsed.project        = parsed.project        || parsed.module;
  parsed.conditions     = parsed.conditions     ?? [];
  parsed.decision_table = parsed.decision_table ?? { applicable: false, headers: [], rows: [] };

  return parsed;
};

/** @deprecated Usar callLLM() con un LLMConfig de provider='openai' */
export const callOpenAI = (
  query: string,
  apiKey: string,
  model = 'gpt-4o-mini',
  contextChunks: KnowledgeChunk[] = []
) =>
  callLLM(query, { provider: 'openai', apiKey, model, baseUrl: 'https://api.openai.com/v1' }, contextChunks);
