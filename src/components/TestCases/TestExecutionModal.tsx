import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ErrorIcon from '@mui/icons-material/Error';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import BlockIcon from '@mui/icons-material/Block';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useNotify, useUpdate } from 'react-admin';
import type { EvidenceFile, EvidenceGroup, TestCase, TestStep } from '../../types/testCase';
import {
  getExecutionColor,
  getExecutionLabel,
  getPriorityColor,
  getPriorityLabel,
  summarizeExecutionFromSteps,
} from './testCaseUi';
import {
  deleteEvidence,
  uploadEvidence,
  validateEvidence,
} from '../../services/evidenceService';
import { EvidenceManager } from './EvidenceManager';
import { flattenEvidenceGroups, normalizeEvidenceGroups } from './evidenceGroups';
import { executionDraftService } from '../../services/executionDraftService';
import { dataProvider } from '../../firebase/dataProvider';

interface TestExecutionModalProps {
  open: boolean;
  testCase: TestCase | null;
  onClose: () => void;
  onExecuted?: () => void;
}

interface TimestampLike {
  toDate?: () => Date;
}

interface ExecutionDraftStep {
  id: string;
  status?: TestStep['status'];
  actualResult?: string;
  evidences?: EvidenceFile[];
  evidenceGroups?: EvidenceGroup[];
}

interface ExecutionDraftData {
  steps?: ExecutionDraftStep[];
  activeStepIndex?: number;
  notes?: string;
  noStepsStatus?: TestStep['status'];
  noStepsActualResult?: string;
  noStepsEvidences?: EvidenceFile[];
  noStepsEvidenceGroups?: EvidenceGroup[];
  updatedAt?: string | Date | TimestampLike;
}

const STEP_STATUSES: Array<TestStep['status']> = ['passed', 'failed', 'blocked', 'retest', 'in_progress', 'not_executed'];

export const TestExecutionModal = ({
  open,
  testCase,
  onClose,
  onExecuted,
}: TestExecutionModalProps) => {
  const notify = useNotify();
  const [update, { isPending }] = useUpdate();
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [executionNotes, setExecutionNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isNoStepsDragging, setIsNoStepsDragging] = useState(false);

  // Estado para casos sin pasos
  const [noStepsStatus, setNoStepsStatus] = useState<TestStep['status']>('not_executed');
  const [noStepsActualResult, setNoStepsActualResult] = useState('');
  const [noStepsEvidences, setNoStepsEvidences] = useState<EvidenceFile[]>([]);
  const [noStepsEvidenceGroups, setNoStepsEvidenceGroups] = useState<EvidenceGroup[]>([]);

  // Clave para el draft en localStorage
  const draftKey = useMemo(() => 
    testCase ? `execution_draft_${testCase.id}` : null
  , [testCase]);

  // Ref con los handlers actuales para el listener de paste (evita closures obsoletos)
  const uploadHandlerRef = useRef<{
    forStep: (f: File) => Promise<void>;
    forNoSteps: (f: File) => Promise<void>;
    hasSteps: boolean;
    isUploading: boolean;
  } | null>(null);
  const persistedDraftSnapshotRef = useRef('');
  const isDraftSyncReadyRef = useRef(false);
  const remoteDraftSaveTimeoutRef = useRef<number | null>(null);
  const testCaseAutosaveTimeoutRef = useRef<number | null>(null);
  const testCaseAutosaveSnapshotRef = useRef('');
  const testCaseAutosaveSequenceRef = useRef(0);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const buildPersistedDraftData = (currentTestCase: TestCase) => ({
    steps: (currentTestCase.steps || []).map((step, index) => ({
      id: step.id || `step-${index}`,
      status: step.status || 'not_executed',
      actualResult: step.actualResult || '',
      evidences: step.evidences || [],
      evidenceGroups: normalizeEvidenceGroups(step.evidenceGroups, step.evidences || []),
    })),
    activeStepIndex: 0,
    notes: currentTestCase.notes || '',
    noStepsStatus: (currentTestCase.executionResult as TestStep['status']) || 'not_executed',
    noStepsActualResult: currentTestCase.actualResult || '',
    noStepsEvidences: currentTestCase.generalEvidences || [],
    noStepsEvidenceGroups: normalizeEvidenceGroups(
      currentTestCase.generalEvidenceGroups,
      currentTestCase.generalEvidences || []
    ),
  });

  const buildCurrentDraftData = useCallback(() => ({
    steps: steps.map((step) => ({
      id: step.id,
      status: step.status || 'not_executed',
      actualResult: step.actualResult || '',
      evidences: flattenEvidenceGroups(normalizeEvidenceGroups(step.evidenceGroups, step.evidences || [])),
      evidenceGroups: normalizeEvidenceGroups(step.evidenceGroups, step.evidences || []),
    })),
    activeStepIndex,
    notes: executionNotes,
    noStepsStatus,
    noStepsActualResult,
    noStepsEvidences,
    noStepsEvidenceGroups,
  }), [activeStepIndex, executionNotes, noStepsActualResult, noStepsEvidenceGroups, noStepsEvidences, noStepsStatus, steps]);

  const normalizeDraftSnapshot = (draftData: ExecutionDraftData) => JSON.stringify({
    steps: (draftData.steps || []).map((step, index) => {
      const groups = normalizeEvidenceGroups(step.evidenceGroups, step.evidences || []);
      return {
        id: step.id || `step-${index}`,
        status: step.status || 'not_executed',
        actualResult: step.actualResult || '',
        evidences: flattenEvidenceGroups(groups),
        evidenceGroups: groups,
      };
    }),
    activeStepIndex: draftData.activeStepIndex || 0,
    notes: draftData.notes || '',
    noStepsStatus: draftData.noStepsStatus || 'not_executed',
    noStepsActualResult: draftData.noStepsActualResult || '',
    noStepsEvidences: draftData.noStepsEvidences || [],
    noStepsEvidenceGroups: normalizeEvidenceGroups(
      draftData.noStepsEvidenceGroups,
      draftData.noStepsEvidences || []
    ),
  });

  const getDraftUpdatedAtTime = (value: ExecutionDraftData['updatedAt']) => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') return new Date(value).getTime() || 0;
    
    // Para objetos tipo Timestamp de Firebase
    const maybeTimestamp = value as TimestampLike;
    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate().getTime();
    }
    
    return 0;
  };

  useEffect(() => {
    if (!open || !testCase || !draftKey) return;

    isDraftSyncReadyRef.current = false;
    const persistedDraftData = buildPersistedDraftData(testCase);
    persistedDraftSnapshotRef.current = JSON.stringify(persistedDraftData);
    let cancelled = false;

    const hydrate = (draftData: ExecutionDraftData, hasDraft: boolean) => {
      if (cancelled) return;

      setSteps(
        (testCase.steps || []).map((step, index) => {
          const stepId = step.id || `step-${index}`;
          const draftStep = draftData?.steps?.find((s) => s.id === stepId || s.id === step.id);
          return {
            ...step,
            id: stepId,
            order: step.order || index + 1,
            status: draftStep?.status || step.status || 'not_executed',
            actualResult: draftStep?.actualResult || step.actualResult || '',
            evidences: draftStep?.evidences || step.evidences || [],
            evidenceGroups: normalizeEvidenceGroups(
              draftStep?.evidenceGroups || step.evidenceGroups,
              draftStep?.evidences || step.evidences || []
            ),
          };
        })
      );
      
      setActiveStepIndex(draftData?.activeStepIndex || 0);
      setExecutionNotes(draftData?.notes || testCase.notes || '');
      setUploadProgress(null);
      setNoStepsStatus(draftData?.noStepsStatus || (testCase.executionResult as TestStep['status']) || 'not_executed');
      setNoStepsActualResult(draftData?.noStepsActualResult || testCase.actualResult || '');
      setNoStepsEvidences(draftData?.noStepsEvidences || testCase.generalEvidences || []);
      setNoStepsEvidenceGroups(
        normalizeEvidenceGroups(
          draftData?.noStepsEvidenceGroups || testCase.generalEvidenceGroups,
          draftData?.noStepsEvidences || testCase.generalEvidences || []
        )
      );
      testCaseAutosaveSnapshotRef.current = hasDraft ? '' : normalizeDraftSnapshot(draftData);
      setAutosaveStatus('idle');
      isDraftSyncReadyRef.current = true;
    };

    const loadDraft = async () => {
      let draftData: ExecutionDraftData = persistedDraftData;
      let hasDraft = false;
      let localUpdatedAt = 0;

      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft) as ExecutionDraftData;
          draftData = { ...persistedDraftData, ...parsedDraft };
          localUpdatedAt = getDraftUpdatedAtTime(parsedDraft?.updatedAt);
          hasDraft = true;
        } catch (e) {
          console.error('Error parsing draft:', e);
          localStorage.removeItem(draftKey);
        }
      }

      try {
        const remoteDraft = await executionDraftService.get(testCase.id);
        const remoteUpdatedAt = getDraftUpdatedAtTime(remoteDraft?.updatedAt);
        if (remoteDraft?.data && remoteUpdatedAt >= localUpdatedAt) {
          draftData = { ...persistedDraftData, ...remoteDraft.data };
          hasDraft = true;
          localStorage.setItem(
            draftKey,
            JSON.stringify({
              ...remoteDraft.data,
              updatedAt: remoteUpdatedAt ? new Date(remoteUpdatedAt).toISOString() : new Date().toISOString(),
            })
          );
        }
      } catch (e) {
        console.error('Error loading remote execution draft:', e);
      }

      hydrate(draftData, hasDraft);
    };

    void loadDraft();

    return () => {
      cancelled = true;
      isDraftSyncReadyRef.current = false;
    };
  }, [open, testCase, draftKey]);

  // Guardar draft automáticamente cuando cambian los datos
  useEffect(() => {
    if (!open || !draftKey || !testCase || !isDraftSyncReadyRef.current) return;

    const draftData = buildCurrentDraftData();
    const currentSnapshot = JSON.stringify(draftData);
    const hasUnsavedChanges = currentSnapshot !== persistedDraftSnapshotRef.current;

    if (hasUnsavedChanges) {
      const draftWithTimestamp = {
        ...draftData,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draftWithTimestamp));

      if (remoteDraftSaveTimeoutRef.current) {
        window.clearTimeout(remoteDraftSaveTimeoutRef.current);
      }
      remoteDraftSaveTimeoutRef.current = window.setTimeout(() => {
        executionDraftService.save(testCase.id, draftWithTimestamp).catch((e) => {
          console.error('Error saving remote execution draft:', e);
        });
      }, 800);
    } else {
      localStorage.removeItem(draftKey);
      if (remoteDraftSaveTimeoutRef.current) {
        window.clearTimeout(remoteDraftSaveTimeoutRef.current);
        remoteDraftSaveTimeoutRef.current = null;
      }
      executionDraftService.remove(testCase.id).catch((e) => {
        console.error('Error removing remote execution draft:', e);
      });
    }

    // Refrescar token de Firebase proactivamente al detectar actividad en el modal
    // para evitar que la sesión expire mientras el usuario está trabajando
    import('../../firebase/config').then(({ auth }) => {
      const user = auth.currentUser;
      if (user) {
        user.getIdToken(false).catch(() => {});
      }
    });
  }, [buildCurrentDraftData, open, draftKey, testCase]);

  const hasSteps = steps.length > 0;
  const activeStep = steps[activeStepIndex];
  const completedSteps = steps.filter((step) => step.status && step.status !== 'not_executed').length;
  const progress = hasSteps
    ? (completedSteps / steps.length) * 100
    : noStepsStatus !== 'not_executed' ? 100 : 0;
  const executionResult = useMemo(
    () => hasSteps ? summarizeExecutionFromSteps(steps) : noStepsStatus ?? 'not_executed',
    [steps, hasSteps, noStepsStatus]
  );

  const buildExecutionRecordData = useCallback((mode: 'draft' | 'finished') => {
    if (!testCase) return null;

    const nextTags = [
      ...(testCase.tags || []).filter((tag) => tag !== 'borrador' && tag !== 'test guardado' && tag !== 'terminado'),
    ];
    const executionTag = mode === 'finished' ? 'terminado' : 'borrador';
    if (!nextTags.includes(executionTag)) {
      nextTags.push(executionTag);
    }

    if (hasSteps) {
      return {
        steps: steps.map((step) => {
          const groups = normalizeEvidenceGroups(step.evidenceGroups, step.evidences || []);
          return {
            ...step,
            evidenceGroups: groups,
            evidences: flattenEvidenceGroups(groups),
          };
        }),
        actualResult:
          executionResult === 'passed'
            ? 'Todos los pasos fueron aprobados.'
            : executionResult === 'failed'
              ? 'La ejecución contiene uno o más pasos fallidos.'
              : executionResult === 'blocked'
                ? 'La ejecución quedó bloqueada en uno o más pasos.'
                : executionResult === 'retest'
                  ? 'Uno o más pasos requieren retest.'
                  : executionResult === 'in_progress'
                    ? 'La ejecución fue iniciada y quedó en progreso.'
                    : '',
        executionResult,
        notes: executionNotes,
        tags: nextTags,
      };
    }

    return {
      executionResult: noStepsStatus,
      actualResult: noStepsActualResult,
      generalEvidences: noStepsEvidences,
      generalEvidenceGroups: normalizeEvidenceGroups(noStepsEvidenceGroups, noStepsEvidences),
      notes: executionNotes,
      tags: nextTags,
    };
  }, [
    executionNotes,
    executionResult,
    hasSteps,
    noStepsActualResult,
    noStepsEvidenceGroups,
    noStepsEvidences,
    noStepsStatus,
    steps,
    testCase,
  ]);

  useEffect(() => {
    if (!open || !testCase || !isDraftSyncReadyRef.current) return;

    const draftData = buildCurrentDraftData();
    const currentSnapshot = JSON.stringify(draftData);
    if (currentSnapshot === testCaseAutosaveSnapshotRef.current) return;

    const dataToSave = buildExecutionRecordData('draft');
    if (!dataToSave) return;

    if (testCaseAutosaveTimeoutRef.current) {
      window.clearTimeout(testCaseAutosaveTimeoutRef.current);
    }

    setAutosaveStatus('saving');
    testCaseAutosaveTimeoutRef.current = window.setTimeout(() => {
      const sequence = ++testCaseAutosaveSequenceRef.current;
      dataProvider.update('test_cases', {
        id: testCase.id,
        data: dataToSave,
        previousData: testCase,
      })
        .then(() => {
          testCaseAutosaveSnapshotRef.current = currentSnapshot;
          if (sequence === testCaseAutosaveSequenceRef.current) {
            setAutosaveStatus('saved');
          }
        })
        .catch((e) => {
          console.error('Error auto-saving execution on test case:', e);
          if (sequence === testCaseAutosaveSequenceRef.current) {
            setAutosaveStatus('error');
          }
        });
    }, 800);

    return () => {
      if (testCaseAutosaveTimeoutRef.current) {
        window.clearTimeout(testCaseAutosaveTimeoutRef.current);
      }
    };
  }, [buildCurrentDraftData, buildExecutionRecordData, open, testCase]);

  const aiArtifacts = testCase?.aiArtifacts;
  const techniqueTags = testCase?.tags ?? [];
  const decisionRows = (aiArtifacts?.decisionTable?.rows ?? []).map((row: unknown, index: number) => {
    if (Array.isArray(row)) return { id: `legacy-${index}`, cells: row as string[] };
    const r = row as { id?: string; cells?: string[] };
    return { id: r.id ?? `row-${index}`, cells: r.cells ?? [] };
  });

  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const ref = uploadHandlerRef.current;
      if (!ref || ref.isUploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            if (ref.hasSteps) {
              void ref.forStep(file);
            } else {
              void ref.forNoSteps(file);
            }
          }
          break;
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [open]);

  useEffect(() => () => {
    if (remoteDraftSaveTimeoutRef.current) {
      window.clearTimeout(remoteDraftSaveTimeoutRef.current);
    }
    if (testCaseAutosaveTimeoutRef.current) {
      window.clearTimeout(testCaseAutosaveTimeoutRef.current);
    }
  }, []);

  if (!testCase) return null;

  const setStepValue = (field: keyof TestStep, value: unknown) => {
    setSteps((prev) =>
      prev.map((step, index) => (index === activeStepIndex ? { ...step, [field]: value } : step))
    );
  };

  const setActiveStepEvidenceGroups = (groups: EvidenceGroup[]) => {
    const normalizedGroups = normalizeEvidenceGroups(groups);
    setSteps((prev) =>
      prev.map((step, index) =>
        index === activeStepIndex
          ? {
              ...step,
              evidenceGroups: normalizedGroups,
              evidences: flattenEvidenceGroups(normalizedGroups),
            }
          : step
      )
    );
  };

  const setGeneralEvidenceGroups = (groups: EvidenceGroup[]) => {
    const normalizedGroups = normalizeEvidenceGroups(groups);
    setNoStepsEvidenceGroups(normalizedGroups);
    setNoStepsEvidences(flattenEvidenceGroups(normalizedGroups));
  };

  const getStepIcon = (status?: TestStep['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
      case 'failed':
        return <ErrorOutlineIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
      case 'blocked':
        return <BlockIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
      case 'retest':
        return <AutorenewIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
      case 'in_progress':
        return <AutorenewIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
      default:
        return <RadioButtonUncheckedIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
    }
  };

  const processFileForActiveStep = async (file: File, groupId?: string) => {
    if (!activeStep || !testCase) return;
    const validationError = validateEvidence(file);
    if (validationError) {
      notify(validationError, { type: 'error' });
      return;
    }
    setUploadProgress(0);
    try {
      const evidenceFile = await uploadEvidence(
        file,
        testCase.id,
        activeStep.id,
        (percent) => setUploadProgress(percent)
      );
      const groups = normalizeEvidenceGroups(activeStep.evidenceGroups, activeStep.evidences || []);
      const targetGroupId = groupId || groups[0]?.id;
      const updatedGroups = groups.map((group) =>
        group.id === targetGroupId
          ? { ...group, evidences: [...(group.evidences || []), evidenceFile] }
          : group
      );
      setActiveStepEvidenceGroups(updatedGroups);
      notify('Evidencia cargada exitosamente', { type: 'success' });
    } catch {
      notify('Error al subir la evidencia. Intenta de nuevo.', { type: 'error' });
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDeleteEvidence = async (evidence: EvidenceFile) => {
    setDeletingPath(evidence.path);
    try {
      await deleteEvidence(evidence);
      const updatedGroups = normalizeEvidenceGroups(activeStep.evidenceGroups, activeStep.evidences || []).map((group) => ({
        ...group,
        evidences: (group.evidences || []).filter((ev) => ev.path !== evidence.path),
      }));
      setActiveStepEvidenceGroups(updatedGroups);
      notify('Evidencia eliminada', { type: 'success' });
    } catch {
      notify('Error al eliminar la evidencia', { type: 'error' });
    } finally {
      setDeletingPath(null);
    }
  };

  const processFileForNoSteps = async (file: File, groupId?: string) => {
    if (!testCase) return;
    const validationError = validateEvidence(file);
    if (validationError) {
      notify(validationError, { type: 'error' });
      return;
    }
    setUploadProgress(0);
    try {
      const evidenceFile = await uploadEvidence(file, testCase.id, 'general', (p) => setUploadProgress(p));
      const groups = normalizeEvidenceGroups(noStepsEvidenceGroups, noStepsEvidences);
      const targetGroupId = groupId || groups[0]?.id;
      const updatedGroups = groups.map((group) =>
        group.id === targetGroupId
          ? { ...group, evidences: [...(group.evidences || []), evidenceFile] }
          : group
      );
      setGeneralEvidenceGroups(updatedGroups);
      notify('Evidencia cargada exitosamente', { type: 'success' });
    } catch {
      notify('Error al subir la evidencia. Intenta de nuevo.', { type: 'error' });
    } finally {
      setUploadProgress(null);
    }
  };

  const handleNoStepsDeleteEvidence = async (evidence: EvidenceFile) => {
    setDeletingPath(evidence.path);
    try {
      await deleteEvidence(evidence);
      const updatedGroups = normalizeEvidenceGroups(noStepsEvidenceGroups, noStepsEvidences).map((group) => ({
        ...group,
        evidences: (group.evidences || []).filter((ev) => ev.path !== evidence.path),
      }));
      setGeneralEvidenceGroups(updatedGroups);
      notify('Evidencia eliminada', { type: 'success' });
    } catch {
      notify('Error al eliminar la evidencia', { type: 'error' });
    } finally {
      setDeletingPath(null);
    }
  };

  const handleSaveExecution = async () => {
    try {
      if (hasSteps) {
        const pendingSteps = steps.filter(s => !s.status || s.status === 'not_executed').length;
        if (pendingSteps > 0) {
          if (!window.confirm(`Aún tienes ${pendingSteps} paso(s) sin evaluar. ¿Estás seguro de que deseas finalizar la ejecución?`)) {
            return;
          }
        }
      }

      const dataToSave = buildExecutionRecordData('finished');
      if (!dataToSave) return;

      persistedDraftSnapshotRef.current = JSON.stringify(buildCurrentDraftData());
      if (remoteDraftSaveTimeoutRef.current) {
        window.clearTimeout(remoteDraftSaveTimeoutRef.current);
        remoteDraftSaveTimeoutRef.current = null;
      }
      if (testCaseAutosaveTimeoutRef.current) {
        window.clearTimeout(testCaseAutosaveTimeoutRef.current);
        testCaseAutosaveTimeoutRef.current = null;
      }

      await update('test_cases', {
        id: testCase.id,
        data: dataToSave,
        previousData: testCase,
      });

      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      await executionDraftService.remove(testCase.id);

      testCase.tags = dataToSave.tags;
      testCaseAutosaveSnapshotRef.current = persistedDraftSnapshotRef.current;
      setAutosaveStatus('saved');
      notify('Ejecución guardada exitosamente', { type: 'success' });
      onExecuted?.();
      onClose();
    } catch {
      notify('Error al guardar la ejecución del caso de prueba', { type: 'error' });
    }
  };

  // Mantener el ref sincronizado con los valores más recientes del render
  uploadHandlerRef.current = {
    forStep: processFileForActiveStep,
    forNoSteps: processFileForNoSteps,
    hasSteps,
    isUploading: uploadProgress !== null,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PlayArrowIcon sx={{ color: '#FF6B35' }} />
          Ejecutar caso de prueba
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {autosaveStatus !== 'idle' && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mr: 1 }}>
              {autosaveStatus === 'saving' ? (
                <CloudUploadIcon sx={{ fontSize: 16, color: 'text.secondary', animation: 'pulse 1.5s infinite' }} />
              ) : autosaveStatus === 'saved' ? (
                <CloudDoneIcon sx={{ fontSize: 16, color: '#3CCF91' }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  color: autosaveStatus === 'error' ? 'error.main' : 'text.secondary',
                  fontSize: '0.75rem',
                  fontStyle: 'italic',
                }}
              >
                {autosaveStatus === 'saving'
                  ? 'Guardando...'
                  : autosaveStatus === 'saved'
                    ? 'Cambios guardados'
                    : 'Error al guardar'}
              </Typography>
            </Stack>
          )}
        </Box>
        <style>
          {`
            @keyframes pulse {
              0% { opacity: 0.6; }
              50% { opacity: 1; }
              100% { opacity: 0.6; }
            }
          `}
        </style>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, minHeight: 540 }}>
          {/* Panel izquierdo: lista de pasos */}
          <Box sx={{ borderRight: { md: '1px solid' }, borderColor: 'divider', p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {testCase.caseKey} - {testCase.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={getPriorityLabel(testCase.priority)}
                sx={{ backgroundColor: getPriorityColor(testCase.priority), color: '#fff', fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={getExecutionLabel(executionResult)}
                sx={{ backgroundColor: getExecutionColor(executionResult), color: '#fff', fontWeight: 700 }}
              />
              {testCase.tags?.filter(tag => tag !== 'borrador' && tag !== 'test guardado' && tag !== 'terminado').map((tag) => (
                <Chip
                  key={tag}
                  size="small"
                  label={tag}
                  variant="outlined"
                  sx={{ 
                    fontWeight: 600,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    backgroundColor: 'transparent'
                  }}
                />
              ))}
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Progreso de ejecución
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 999, mt: 0.5, mb: 2 }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {hasSteps
                ? `${completedSteps} de ${steps.length} pasos evaluados`
                : 'Sin pasos · Resultado general'}
            </Typography>

            {/* Información adicional del caso de prueba - Colapsable */}
            <Box sx={{ mb: 2 }}>
              <Accordion 
                elevation={0} 
                sx={{ 
                  bgcolor: 'rgba(0,0,0,0.02)', 
                  border: '1px solid', 
                  borderColor: 'divider',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    Detalles y Precondiciones
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: 2, pb: 1.5 }}>
                  {testCase.description && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5, fontSize: '0.6rem' }}>
                        DESCRIPCIÓN
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                        {testCase.description}
                      </Typography>
                    </Box>
                  )}
                  {testCase.prerequisites && (
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5, fontSize: '0.6rem' }}>
                        PRECONDICIONES
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                        {Array.isArray(testCase.prerequisites) ? testCase.prerequisites.join('\n') : testCase.prerequisites}
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </Box>

            <Stack spacing={1}>
              {steps.map((step, index) => (
                <Card
                  key={step.id}
                  onClick={() => setActiveStepIndex(index)}
                  sx={{
                    cursor: 'pointer',
                    border: '1px solid',
                    borderLeft: `4px solid ${index === activeStepIndex ? '#FF6B35' : getExecutionColor(step.status) || 'transparent'}`,
                    borderColor: index === activeStepIndex ? '#FF6B35' : 'divider',
                    boxShadow: index === activeStepIndex ? '0 2px 8px rgba(255,107,53,0.15)' : 'none',
                    mb: 0.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#FF6B35',
                      bgcolor: 'rgba(255,107,53,0.02)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getStepIcon(step.status)}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}>
                          Paso {step.order || index + 1}
                          {step.evidences && step.evidences.length > 0 && (
                            <Tooltip title={`${step.evidences.length} evidencia(s)`}>
                              <AttachFileIcon sx={{ fontSize: 12, ml: 0.5, verticalAlign: 'middle', color: '#FF6B35' }} />
                            </Tooltip>
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.3 }}>
                          {step.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>

          {/* Panel derecho: detalle del paso activo o formulario general */}
          <Box sx={{ p: 3, overflowY: 'auto', maxHeight: 640 }}>
            {(techniqueTags.length > 0 || aiArtifacts?.decisionTable?.applicable) && (
              <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                {techniqueTags.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>
                      Técnicas aplicadas
                    </Typography>
                    <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', rowGap: 0.8 }}>
                      {techniqueTags.filter(tag => tag !== 'borrador' && tag !== 'test guardado' && tag !== 'terminado').map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" color="secondary" />
                      ))}
                    </Stack>
                  </Box>
                )}

                {aiArtifacts?.decisionTable?.applicable && (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Elementos de tabla de decisión
                      </Typography>
                      {aiArtifacts.decisionElements && (
                        <Stack spacing={0.6} sx={{ mb: 1.5 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            <strong>Causas:</strong> {aiArtifacts.decisionElements.causes.join(', ') || 'N/A'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            <strong>Efectos:</strong> {aiArtifacts.decisionElements.effects.join(', ') || 'N/A'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            <strong>Alternativas:</strong> {aiArtifacts.decisionElements.conditionAlternatives.join(', ') || 'N/A'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            <strong>Reglas:</strong> {aiArtifacts.decisionElements.rules.length}
                          </Typography>
                        </Stack>
                      )}
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {aiArtifacts.decisionTable.headers.map((header) => (
                                <TableCell key={header} sx={{ fontWeight: 700 }}>
                                  {header}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {decisionRows.map((row, rowIndex) => (
                              <TableRow key={row.id ?? `rule-${rowIndex}`}>
                                {row.cells.map((cell, cellIndex) => (
                                  <TableCell key={`cell-${rowIndex}-${cellIndex}`}>{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            )}

            {!hasSteps ? (
              <Stack spacing={2.5}>
                <Box sx={{ bgcolor: 'rgba(255, 107, 53, 0.04)', p: 2, borderRadius: 2, border: '1px dashed rgba(255, 107, 53, 0.3)' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <InfoOutlinedIcon sx={{ color: '#FF6B35', fontSize: 18 }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#FF6B35', textTransform: 'uppercase' }}>
                      Resultado general del caso
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Este caso no tiene pasos definidos. Registra el resultado de la ejecución directamente.
                  </Typography>
                </Box>

                <Box sx={{ bgcolor: 'rgba(0,0,0,0.015)', p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <AssignmentTurnedInIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Tu respuesta
                    </Typography>
                  </Stack>

                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}>
                        Estado de la ejecución
                      </Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={noStepsStatus || 'not_executed'}
                        onChange={(e) => setNoStepsStatus(e.target.value as TestStep['status'])}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        {STEP_STATUSES.map((status) => (
                          <MenuItem key={status} value={status}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {getStepIcon(status)}
                              <span>{getExecutionLabel(status)}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      label="Resultado real / hallazgos"
                      placeholder="Describe el resultado obtenido, hallazgos o bugs encontrados..."
                      value={noStepsActualResult}
                      onChange={(e) => setNoStepsActualResult(e.target.value)}
                      sx={{ bgcolor: 'background.paper' }}
                    />
                  </Stack>
                </Box>

                <EvidenceManager
                  title="Evidencias"
                  groups={normalizeEvidenceGroups(noStepsEvidenceGroups, noStepsEvidences)}
                  onGroupsChange={setGeneralEvidenceGroups}
                  uploadProgress={uploadProgress}
                  deletingPath={deletingPath}
                  isDragging={isNoStepsDragging}
                  onDraggingChange={setIsNoStepsDragging}
                  onUpload={processFileForNoSteps}
                  onDeleteEvidence={handleNoStepsDeleteEvidence}
                />

                <Divider />

                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Notas generales de la ejecución"
                  placeholder="Notas generales, observaciones o bloqueos encontrados..."
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                />
              </Stack>
            ) : activeStep ? (
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                    Paso {activeStep.order || activeStepIndex + 1}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {activeStep.description}
                  </Typography>
                </Box>

                {activeStep.expectedResult && (
                  <Box sx={{ bgcolor: 'rgba(30, 136, 229, 0.04)', p: 2, borderRadius: 2, border: '1px dashed rgba(30, 136, 229, 0.3)' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <InfoOutlinedIcon sx={{ color: '#1E88E5', fontSize: 18 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#1E88E5', textTransform: 'uppercase' }}>
                        Resultado esperado
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.5 }}>
                      {activeStep.expectedResult}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ bgcolor: 'rgba(0,0,0,0.015)', p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <AssignmentTurnedInIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Tu respuesta
                    </Typography>
                  </Stack>

                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}>
                        Estado del paso
                      </Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={activeStep.status || 'not_executed'}
                        onChange={(e) => setStepValue('status', e.target.value)}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        {STEP_STATUSES.map((status) => (
                          <MenuItem key={status} value={status}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {getStepIcon(status)}
                              <span>{getExecutionLabel(status)}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>

                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Resultado real / hallazgos"
                      placeholder="Describe lo que ocurrió al ejecutar este paso..."
                      value={activeStep.actualResult || ''}
                      onChange={(e) => setStepValue('actualResult', e.target.value)}
                      sx={{ bgcolor: 'background.paper' }}
                    />
                  </Stack>
                </Box>

                <EvidenceManager
                  title="Evidencias del paso"
                  groups={normalizeEvidenceGroups(activeStep.evidenceGroups, activeStep.evidences || [])}
                  onGroupsChange={setActiveStepEvidenceGroups}
                  uploadProgress={uploadProgress}
                  deletingPath={deletingPath}
                  isDragging={isDragging}
                  onDraggingChange={setIsDragging}
                  onUpload={processFileForActiveStep}
                  onDeleteEvidence={handleDeleteEvidence}
                />

                <Divider />

                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Notas generales de la ejecución"
                  placeholder="Notas generales, observaciones o bloqueos encontrados..."
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                />
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Selecciona un paso de la lista para evaluarlo.
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<NavigateBeforeIcon />}
            disabled={activeStepIndex === 0 || isPending}
            onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
          >
            Anterior
          </Button>
          <Button
            endIcon={<NavigateNextIcon />}
            disabled={activeStepIndex >= steps.length - 1 || isPending}
            onClick={() => setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
          >
            Siguiente
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveExecution}
            disabled={isPending || uploadProgress !== null}
            sx={{
              backgroundColor: '#3CCF91',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#2eb37a' },
            }}
          >
            Finalizar ejecución
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
