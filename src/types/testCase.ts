export type TestCaseStatus = 'active' | 'deprecated' | 'draft' | 'archived';
export type TestCaseType = 'functional' | 'performance' | 'security' | 'integration' | 'e2e' | 'api';
export type TestCasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface TestStep {
  id: string;
  order: number;
  description: string;
  expectedResult: string;
  actualResult?: string;
  attachments?: string[];
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  type: TestCaseType;
  status: TestCaseStatus;
  priority: TestCasePriority;
  prerequisites?: string[];
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