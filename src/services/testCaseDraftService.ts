import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { AITestCaseSuggestion } from './aiService';

export type TestCaseDraftSource = 'wizard' | 'ai_agent';

export interface TestCaseWizardStepItem {
  id: string;
  order: number;
  description: string;
  expectedResult: string;
}

export interface TestCaseConstructionDraftData {
  source: TestCaseDraftSource;
  activeStep?: number;
  formData?: Record<string, unknown>;
  testSteps?: TestCaseWizardStepItem[];
  aiInput?: {
    userStory: string;
    acceptanceCriteria: string;
    businessRules: string;
    historicalBugs: string;
    topK: number;
  };
  editableLocation?: {
    project: string;
    module: string;
    submodule: string;
    testType: string;
  };
  suggestion?: AITestCaseSuggestion | null;
  title?: string;
  updatedAt?: string;
}

export interface TestCaseDraftRecord {
  id: string;
  draftId: string;
  userId: string;
  userEmail?: string | null;
  data: TestCaseConstructionDraftData;
  updatedAt?: any;
  createdAt?: any;
}

export const TEST_CASE_DRAFT_PREFIX = 'test_case_draft_';
const COLLECTION = 'test_case_drafts';

const requireUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No hay usuario autenticado para guardar el borrador');
  }
  return user;
};

const draftDocId = (userId: string, draftId: string) =>
  `${encodeURIComponent(userId)}_${encodeURIComponent(draftId)}`;

export const createTestCaseDraftId = () =>
  `tcd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const testCaseDraftStorageKey = (draftId: string) =>
  `${TEST_CASE_DRAFT_PREFIX}${draftId}`;

export const listLocalTestCaseDraftIds = (): string[] => {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TEST_CASE_DRAFT_PREFIX)) {
        ids.push(key.slice(TEST_CASE_DRAFT_PREFIX.length));
      }
    }
  } catch (error) {
    console.error('Error listing local test case drafts:', error);
  }
  return ids;
};

export const readLocalTestCaseDraft = (
  draftId: string
): TestCaseConstructionDraftData | null => {
  try {
    const raw = localStorage.getItem(testCaseDraftStorageKey(draftId));
    if (!raw) return null;
    return JSON.parse(raw) as TestCaseConstructionDraftData;
  } catch (error) {
    console.error('Error reading local test case draft:', error);
    return null;
  }
};

export const writeLocalTestCaseDraft = (
  draftId: string,
  data: TestCaseConstructionDraftData
) => {
  localStorage.setItem(
    testCaseDraftStorageKey(draftId),
    JSON.stringify({
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString(),
    })
  );
};

export const removeLocalTestCaseDraft = (draftId: string) => {
  localStorage.removeItem(testCaseDraftStorageKey(draftId));
};

export const hasMeaningfulTestCaseDraft = (
  data: Partial<TestCaseConstructionDraftData> | null | undefined
): boolean => {
  if (!data) return false;

  if (data.source === 'ai_agent') {
    const input = data.aiInput;
    return Boolean(
      input?.userStory?.trim() ||
        input?.acceptanceCriteria?.trim() ||
        input?.businessRules?.trim() ||
        input?.historicalBugs?.trim() ||
        data.suggestion
    );
  }

  const formData = data.formData || {};
  const hasFormContent = [
    formData.testProject,
    formData.module,
    formData.submodule,
    formData.caseKey,
    formData.name,
    formData.description,
    formData.prerequisites,
    formData.expectedResult,
    formData.responsible,
  ].some((value) => typeof value === 'string' && value.trim().length > 0);

  const hasSteps = (data.testSteps || []).some(
    (step) => step.description.trim() || step.expectedResult.trim()
  );

  return hasFormContent || hasSteps || Boolean(data.activeStep && data.activeStep > 0);
};

export const buildTestCaseDraftTitle = (
  data: TestCaseConstructionDraftData
): string => {
  if (data.title?.trim()) return data.title.trim();

  if (data.source === 'ai_agent') {
    const story = data.aiInput?.userStory?.trim();
    if (story) {
      const firstLine = story.split('\n').map((line) => line.trim()).find(Boolean) || story;
      return firstLine.length > 72 ? `${firstLine.slice(0, 72)}…` : firstLine;
    }
    return data.suggestion
      ? `Agente IA · ${data.suggestion.test_cases?.length || 0} caso(s)`
      : 'Borrador del Agente IA';
  }

  const name = typeof data.formData?.name === 'string' ? data.formData.name.trim() : '';
  if (name) return name;
  const project =
    typeof data.formData?.testProject === 'string' ? data.formData.testProject.trim() : '';
  return project ? `Wizard · ${project}` : 'Borrador del wizard';
};

export const testCaseDraftService = {
  async save(draftId: string, data: TestCaseConstructionDraftData) {
    const user = requireUser();
    const id = draftDocId(user.uid, draftId);
    const ref = doc(db, COLLECTION, id);

    await setDoc(
      ref,
      {
        draftId,
        userId: user.uid,
        userEmail: user.email ?? null,
        data,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  async get(draftId: string): Promise<TestCaseDraftRecord | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const ref = doc(db, COLLECTION, draftDocId(user.uid, draftId));
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<TestCaseDraftRecord, 'id'>),
    };
  },

  async list(): Promise<TestCaseDraftRecord[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const q = query(collection(db, COLLECTION), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...(snapshotDoc.data() as Omit<TestCaseDraftRecord, 'id'>),
    }));
  },

  async remove(draftId: string) {
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, COLLECTION, draftDocId(user.uid, draftId)));
  },
};
