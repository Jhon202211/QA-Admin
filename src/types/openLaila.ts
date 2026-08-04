export type LailaMessageRole = 'user' | 'assistant';

export interface LailaConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  archived: boolean;
  lastMessageAt: Date;
}

export interface LailaMessage {
  id: string;
  userId: string;
  conversationId: string;
  role: LailaMessageRole;
  content: string;
  createdAt: Date;
  /** Fuentes (nombres de PDF) usadas como contexto para esta respuesta. */
  sources?: string[];
}
