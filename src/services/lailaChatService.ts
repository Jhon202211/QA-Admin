import { callChatCompletion, getLLMConfig } from './aiService';
import type { ChatMessage } from './aiService';
import { lailaKnowledgeService } from './lailaKnowledgeService';
import type { LailaMessage } from '../types/openLaila';

const INSTRUCTIONS_URL = '/knowledge/Laila/instructions.md';

/**
 * Fallback usado solo si `instructions.md` no está disponible (ej: no se
 * subió el archivo todavía). El archivo real vive como asset estático en
 * `public/knowledge/Laila/instructions.md` para poder ajustar el
 * comportamiento del bot sin recompilar la app.
 */
const FALLBACK_INSTRUCTIONS = `Eres "OpenLaila", el asistente virtual de soporte de QAScope.

Tu objetivo es ayudar a los usuarios de la plataforma respondiendo sus dudas de forma clara, amable y profesional, basándote PRINCIPALMENTE en la base de conocimiento que se te proporciona como contexto.

Reglas:
- Responde siempre en español.
- Si la respuesta está en el contexto proporcionado, básate en él y cita el documento fuente entre corchetes cuando sea relevante (ej: "[manual_usuario.md]").
- Si la pregunta no puede responderse con el contexto disponible, dilo honestamente y sugiere contactar al equipo de soporte humano; no inventes información.
- Sé conciso pero completo. Usa listas o pasos numerados cuando ayuden a la claridad.
- Mantén un tono cercano y servicial, como el de una asistente de soporte experta.`;

export type LailaUserRole =
  | 'admin'
  | 'property_owner'
  | 'coordinador'
  | 'recepcion'
  | 'centro_control'
  | 'empleado';

export const LAILA_USER_ROLE_LABELS: Record<LailaUserRole, string> = {
  admin: 'Admin',
  property_owner: 'Property Owner',
  coordinador: 'Coordinador',
  recepcion: 'Recepción',
  centro_control: 'Centro de Control',
  empleado: 'Empleado',
};

const MAX_HISTORY_MESSAGES = 16;

// Cache en memoria: las instrucciones son estáticas durante la sesión.
let instructionsPromise: Promise<string> | null = null;

async function loadInstructions(): Promise<string> {
  if (!instructionsPromise) {
    instructionsPromise = fetch(INSTRUCTIONS_URL)
      .then((res) => (res.ok ? res.text() : FALLBACK_INSTRUCTIONS))
      .catch(() => FALLBACK_INSTRUCTIONS);
  }
  return instructionsPromise;
}

function buildSystemPrompt(
  instructions: string,
  userRole: LailaUserRole,
  contextChunks: { source: string; content: string }[]
): string {
  const withRole = instructions.replace(/\{user_rol\}/g, LAILA_USER_ROLE_LABELS[userRole]);

  if (contextChunks.length === 0) return withRole;

  const contextSection =
    '\n\n# CONTEXTO RECUPERADO DE LA BASE DE CONOCIMIENTO\n' +
    contextChunks.map((c) => `[${c.source}]\n${c.content}`).join('\n\n---\n\n');

  return withRole + contextSection;
}

export interface LailaReply {
  content: string;
  sources: string[];
}

/**
 * Genera la respuesta de OpenLaila para un nuevo mensaje del usuario,
 * recuperando contexto relevante de la base de conocimiento (BM25) y usando
 * el mismo proveedor/modelo de IA configurado para "Pruebas manuales".
 *
 * Las pautas de comportamiento (identidad, anti-alucinaciones, permisos por
 * rol, reglas de escalamiento, etc.) se cargan desde
 * `public/knowledge/Laila/instructions.md`.
 */
export const askLaila = async (
  userMessage: string,
  history: LailaMessage[],
  userRole: LailaUserRole = 'empleado',
  topK = 5
): Promise<LailaReply> => {
  const [instructions, contextChunks] = await Promise.all([
    loadInstructions(),
    lailaKnowledgeService.retrieve(userMessage, topK),
  ]);
  const sources = Array.from(new Set(contextChunks.map((c) => c.source)));

  const config = getLLMConfig();

  if (!config) {
    return {
      content:
        'Todavía no tengo un modelo de IA configurado. Pide a un administrador que active y configure la IA en **Configuración → Integraciones** (es la misma configuración que usa el generador de casos de prueba). Mientras tanto, no puedo responder preguntas basadas en la base de conocimiento.',
      sources: [],
    };
  }

  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(instructions, userRole, contextChunks) },
    ...recentHistory.map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
    { role: 'user', content: userMessage },
  ];

  const content = await callChatCompletion(messages, config);
  return { content, sources };
};
