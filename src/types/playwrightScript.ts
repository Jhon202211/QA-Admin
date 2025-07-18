export interface PlaywrightStep {
  id: string;
  action: 'goto' | 'click' | 'fill' | 'wait' | 'screenshot' | 'select' | 'type' | 'hover';
  target: string;
  value?: string;
  description?: string;
  order: number;
}

export interface PlaywrightScript {
  id: string;
  name: string;
  description?: string;
  url: string;
  steps: PlaywrightStep[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isPublic: boolean;
  executionCount: number;
  lastExecuted?: string;
  status: 'draft' | 'active' | 'archived';
}

export interface ScriptExecutionResult {
  id: string;
  scriptId: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  startTime: string;
  endTime?: string;
  duration?: number;
  error?: string;
  screenshots?: string[];
  logs: string[];
} 