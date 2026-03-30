export type TestCaseStatus = 'active' | 'deprecated' | 'draft' | 'archived';

export interface EvidenceFile {
  url: string;
  path: string;
  name: string;
  mimeType: string;
}
export interface DecisionRule {
  id: string;
  conditions: Record<string, string>;
  action: string;
}

export interface DecisionElements {
  causes: string[];
  effects: string[];
  conditionAlternatives: string[];
  rules: DecisionRule[];
}

export interface DecisionTableRow {
  id: string;
  cells: string[];
}

export interface TestCaseAIArtifacts {
  generatedBy: string;
  conditions?: Array<{
    name: string;
    description: string;
    equivalence_partitions: string[];
    boundary_values: string[];
    notes: string;
  }>;
  decisionTable?: {
    applicable: boolean;
    headers: string[];
    rows: DecisionTableRow[];
  };
  decisionElements?: DecisionElements;
}
export type TestCaseType = 'functional' | 'performance' | 'security' | 'integration' | 'e2e' | 'api' | 'unit' | 'system' | 'acceptance';
export type TestCasePriority = 'low' | 'medium' | 'high' | 'critical';
export type TestCaseCategory = 'Smoke' | 'Funcionales' | 'No Funcionales' | 'Regresión' | 'UAT' | 'Integración' | 'Unitarias' | 'Exploratorias';

export interface TestStep {
  id: string;
  order: number;
  description: string;
  expectedResult: string;
  actualResult?: string;
  attachments?: string[];
  evidences?: EvidenceFile[];
  status?: 'passed' | 'failed' | 'blocked' | 'in_progress' | 'not_executed';
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
  executionResult?: 'passed' | 'failed' | 'blocked' | 'in_progress' | 'not_executed';
  notes?: string;
  type: TestCaseType;
  status: TestCaseStatus;
  priority: TestCasePriority;
  steps: TestStep[];
  tags: string[];
  aiArtifacts?: TestCaseAIArtifacts;
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
  projectArchived?: boolean;
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