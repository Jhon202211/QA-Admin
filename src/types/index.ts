export interface TestResult {
  id: string;
  name: string;
  date: Date;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
  details?: {
    steps: TestStep[];
    screenshots: string[];
  };
}

export interface TestStep {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
} 