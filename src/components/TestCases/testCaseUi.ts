import type { TestCasePriority, TestStep } from '../../types/testCase';

export type ExecutionStatus =
  | TestStep['status']
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'in_progress'
  | 'not_executed';

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
  Alta: 'Alta',
  Media: 'Media',
  Baja: 'Baja',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#B71C1C',
  high: '#E53935',
  medium: '#FB8C00',
  low: '#43A047',
  Alta: '#E53935',
  Media: '#FB8C00',
  Baja: '#43A047',
};

const EXECUTION_LABELS: Record<string, string> = {
  passed: 'Aprobado',
  failed: 'Fallido',
  blocked: 'Bloqueado',
  in_progress: 'En progreso',
  not_executed: 'No ejecutado',
};

const EXECUTION_COLORS: Record<string, string> = {
  passed: '#43A047',
  failed: '#E53935',
  blocked: '#FB8C00',
  in_progress: '#1E88E5',
  not_executed: '#9E9E9E',
};

export const getPriorityLabel = (priority?: TestCasePriority | 'Alta' | 'Media' | 'Baja' | string) =>
  PRIORITY_LABELS[priority || ''] || priority || 'Sin prioridad';

export const getPriorityColor = (priority?: TestCasePriority | 'Alta' | 'Media' | 'Baja' | string) =>
  PRIORITY_COLORS[priority || ''] || '#9E9E9E';

export const getExecutionLabel = (status?: ExecutionStatus) =>
  EXECUTION_LABELS[status || 'not_executed'] || 'No ejecutado';

export const getExecutionColor = (status?: ExecutionStatus) =>
  EXECUTION_COLORS[status || 'not_executed'] || '#9E9E9E';

export const normalizePriority = (priority?: string): 'Alta' | 'Media' | 'Baja' => {
  if (priority === 'critical' || priority === 'high' || priority === 'Alta') return 'Alta';
  if (priority === 'low' || priority === 'Baja') return 'Baja';
  return 'Media';
};

export const summarizeExecutionFromSteps = (steps: TestStep[] = []): ExecutionStatus => {
  const statuses = steps.map((step) => step.status || 'not_executed');

  if (statuses.length === 0 || statuses.every((status) => status === 'not_executed')) {
    return 'not_executed';
  }
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.every((status) => status === 'passed')) return 'passed';
  if (statuses.includes('in_progress') || statuses.includes('passed')) return 'in_progress';
  return 'not_executed';
};
