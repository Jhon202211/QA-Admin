export type TestCaseStatus = 'active' | 'deprecated' | 'draft' | 'archived';
export type TestCaseType = 'functional' | 'performance' | 'security' | 'integration' | 'e2e' | 'api';
export type TestCasePriority = 'low' | 'medium' | 'high' | 'critical';
export type TestCaseCategory = 'Smoke' | 'Funcionales' | 'No Funcionales' | 'Regresión' | 'UAT';

export interface TestStep {
  id: string;
  order: number;
  description: string;
  expectedResult: string;
  actualResult?: string;
  attachments?: string[];
  evidences?: string[];
  status?: 'passed' | 'failed' | 'blocked' | 'not_executed';
}

export interface TestCase {
  id: string;
  caseKey: string;
  title: string;
  description: string;
  testProject?: string; // Nuevo campo: Proyecto de prueba
  category?: TestCaseCategory; // Nuevo campo: Categoría (Smoke, Funcionales, etc.)
  prerequisites?: string[];
  testData?: string;
  expectedResult?: string;
  actualResult?: string;
  module?: string;
  responsible?: string;
  executionResult?: 'passed' | 'failed' | 'blocked' | 'not_executed';
  notes?: string;
  type: TestCaseType;
  status: TestCaseStatus;
  priority: TestCasePriority;
  steps: TestStep[];
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  version: number;
  requirementId?: string;
  estimatedDuration: number; // en minutos
  attachments?: string[];
  automated: boolean;
  automationScript?: string;
} 