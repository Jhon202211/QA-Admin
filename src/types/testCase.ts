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
  name: string; // Nombre del caso de prueba
  title?: string; // Alias para compatibilidad
  description: string;
  testProject?: string; // Proyecto de prueba
  module?: string; // Módulo / Feature
  submodule?: string; // Submódulo / Flujo
  category?: TestCaseCategory; // Categoría (Smoke, Funcionales, etc.) - ahora mapea a "Tipo de prueba"
  prerequisites?: string[];
  testData?: string;
  expectedResult?: string;
  actualResult?: string;
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

// Interfaz para la respuesta del agente IA
export interface AITestCaseSuggestion {
  module: string;
  submodule: string;
  test_type: string; // Mapea a category
  test_cases: Array<{
    title: string;
    preconditions: string[];
    steps: string[];
    expected_result: string;
  }>;
} 