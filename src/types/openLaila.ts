export type LailaMessageRole = 'user' | 'assistant';

export interface LailaMessage {
  id: string;
  userId: string;
  role: LailaMessageRole;
  content: string;
  createdAt: Date;
  /** Fuentes (nombres de PDF) usadas como contexto para esta respuesta. */
  sources?: string[];
}
