import type { EvidenceFile, EvidenceGroup } from '../../types/testCase';

const DEFAULT_GROUP_ID = 'default';

export const normalizeEvidenceGroups = (
  groups?: EvidenceGroup[],
  evidences: EvidenceFile[] = []
): EvidenceGroup[] => {
  const normalized = (groups || [])
    .map((group, index) => ({
      ...group,
      id: group.id || `${DEFAULT_GROUP_ID}-${index}`,
      name: group.name || 'General',
      type: group.type || 'folder',
      order: typeof group.order === 'number' ? group.order : index,
      evidences: group.evidences || [],
    }))
    .sort((a, b) => a.order - b.order);

  if (normalized.length > 0) return normalized;

  return [
    {
      id: DEFAULT_GROUP_ID,
      name: 'General',
      type: 'folder',
      order: 0,
      evidences,
    },
  ];
};

export const flattenEvidenceGroups = (groups: EvidenceGroup[]): EvidenceFile[] =>
  groups
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((group) => group.evidences || []);
