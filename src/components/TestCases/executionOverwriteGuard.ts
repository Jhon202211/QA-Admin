export interface ExecutionRichnessStep {
  id?: string;
  status?: string;
  actualResult?: string;
  evidences?: unknown[];
  evidenceGroups?: Array<{ evidences?: unknown[] }>;
}

export interface ExecutionRichnessInput {
  steps?: ExecutionRichnessStep[];
  notes?: string;
  activeStepIndex?: number;
  updatedAt?: unknown;
  noStepsStatus?: string;
  noStepsActualResult?: string;
  noStepsEvidences?: unknown[];
  noStepsEvidenceGroups?: Array<{ evidences?: unknown[] }>;
}

const countEvidences = (
  evidences?: unknown[],
  groups?: Array<{ evidences?: unknown[] }>
): number => {
  if (groups && groups.length > 0) {
    return groups.reduce((total, group) => total + (group.evidences?.length || 0), 0);
  }
  return evidences?.length || 0;
};

export const countExecutionEvidences = (data: ExecutionRichnessInput | null | undefined): number => {
  if (!data) return 0;

  let total = countEvidences(data.noStepsEvidences, data.noStepsEvidenceGroups);
  for (const step of data.steps || []) {
    total += countEvidences(step.evidences, step.evidenceGroups);
  }
  return total;
};

export const scoreExecutionRichness = (data: ExecutionRichnessInput | null | undefined): number => {
  if (!data) return 0;

  let score = 0;

  for (const step of data.steps || []) {
    if (step.status && step.status !== 'not_executed') score += 1;
    if (step.actualResult?.trim()) score += 1;
    score += countEvidences(step.evidences, step.evidenceGroups);
  }

  if (data.notes?.trim()) score += 1;
  if (data.noStepsStatus && data.noStepsStatus !== 'not_executed') score += 1;
  if (data.noStepsActualResult?.trim()) score += 1;
  score += countEvidences(data.noStepsEvidences, data.noStepsEvidenceGroups);

  return score;
};

export const isPoorerExecution = (
  incoming: ExecutionRichnessInput | null | undefined,
  persisted: ExecutionRichnessInput | null | undefined
): boolean => scoreExecutionRichness(incoming) < scoreExecutionRichness(persisted);

export const pickRichestExecution = <T extends ExecutionRichnessInput>(
  candidates: Array<T | null | undefined>
): T | null => {
  let richest: T | null = null;
  let richestScore = -1;

  for (const candidate of candidates) {
    if (!candidate) continue;
    const score = scoreExecutionRichness(candidate);
    if (score > richestScore) {
      richest = candidate;
      richestScore = score;
    }
  }

  return richest;
};
