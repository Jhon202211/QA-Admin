import type { TestCase } from './testCase';

export type TestPlanStatus = 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled';
export type TestEnvironment = 'development' | 'qa' | 'staging' | 'production';

export interface Assignee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TestPlanExecution {
  id: string;
  testCaseId: string;
  testCase: TestCase;
  assignedTo?: Assignee;
  scheduledDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  environment: TestEnvironment;
  result?: 'passed' | 'failed' | 'blocked';
  notes?: string;
  attachments?: string[];
}

export interface TestPlan {
  id: string;
  name: string;
  description: string;
  status: TestPlanStatus;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  executions: TestPlanExecution[];
  environment: TestEnvironment;
  tags: string[];
  attachments?: string[];
  totalTestCases: number;
  completedTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
} 