import type { TestCase } from '../../types/testCase';
import type { ExecutionDraftRecord } from '../../services/executionDraftService';
import {
  countExecutionEvidences,
  type ExecutionRichnessInput,
} from './executionOverwriteGuard';

export type ExecutionDraftVersionSource = 'cloud' | 'local' | 'saved_case' | 'previous';

export interface ExecutionDraftVersion {
  id: string;
  testCaseId: string;
  source: ExecutionDraftVersionSource;
  label: string;
  data: ExecutionRichnessInput;
  photoCount: number;
  updatedAt: string | null;
}

export const buildDraftFromTestCase = (testCase: TestCase): ExecutionRichnessInput => ({
  steps: (testCase.steps || []).map((step, index) => ({
    id: step.id || `step-${index}`,
    status: step.status || 'not_executed',
    actualResult: step.actualResult || '',
    evidences: step.evidences || [],
    evidenceGroups: step.evidenceGroups || [],
  })),
  activeStepIndex: 0,
  notes: testCase.notes || '',
  noStepsStatus: testCase.executionResult || 'not_executed',
  noStepsActualResult: testCase.actualResult || '',
  noStepsEvidences: testCase.generalEvidences || [],
  noStepsEvidenceGroups: testCase.generalEvidenceGroups || [],
});

const fingerprint = (data: ExecutionRichnessInput): string =>
  JSON.stringify({
    notes: data.notes || '',
    noSteps: data.noStepsActualResult || '',
    steps: (data.steps || []).map((step) => ({
      status: step.status || '',
      actualResult: step.actualResult || '',
      photos: countExecutionEvidences({ steps: [step] }),
    })),
    photos: countExecutionEvidences(data),
  });

const toIso = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === 'function') {
    return maybeTimestamp.toDate().toISOString();
  }
  return null;
};

export const collectExecutionDraftVersions = (
  testCaseId: string,
  testCase: TestCase | undefined,
  remote: ExecutionDraftRecord | undefined,
  localData: ExecutionRichnessInput | null
): ExecutionDraftVersion[] => {
  const candidates: ExecutionDraftVersion[] = [];

  if (remote?.data) {
    candidates.push({
      id: `${testCaseId}-cloud`,
      testCaseId,
      source: 'cloud',
      label: 'Borrador en la nube',
      data: remote.data,
      photoCount: countExecutionEvidences(remote.data),
      updatedAt: toIso(remote.data?.updatedAt) || toIso(remote.updatedAt),
    });
  }

  (remote?.versions || []).forEach((snapshot, index) => {
    if (!snapshot?.data) return;
    candidates.push({
      id: `${testCaseId}-previous-${index}`,
      testCaseId,
      source: 'previous',
      label: index === 0 ? 'Versión anterior' : `Versión anterior ${index + 1}`,
      data: snapshot.data,
      photoCount: countExecutionEvidences(snapshot.data),
      updatedAt: snapshot.savedAt || null,
    });
  });

  if (localData) {
    candidates.push({
      id: `${testCaseId}-local`,
      testCaseId,
      source: 'local',
      label: 'Este navegador',
      data: localData,
      photoCount: countExecutionEvidences(localData),
      updatedAt: typeof localData.updatedAt === 'string' ? localData.updatedAt : null,
    });
  }

  if (testCase) {
    const saved = buildDraftFromTestCase(testCase);
    candidates.push({
      id: `${testCaseId}-saved`,
      testCaseId,
      source: 'saved_case',
      label: 'Caso guardado',
      data: saved,
      photoCount: countExecutionEvidences(saved),
      updatedAt: testCase.updatedAt ? new Date(testCase.updatedAt).toISOString() : null,
    });
  }

  const unique: ExecutionDraftVersion[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = fingerprint(candidate.data);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }

  return unique.sort((a, b) => b.photoCount - a.photoCount || scoreFallback(b) - scoreFallback(a));
};

const scoreFallback = (version: ExecutionDraftVersion) =>
  (version.updatedAt ? Date.parse(version.updatedAt) : 0);
