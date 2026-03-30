import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useNotify, useUpdate } from 'react-admin';
import type { EvidenceFile, TestCase, TestStep } from '../../types/testCase';
import {
  getExecutionColor,
  getExecutionLabel,
  getPriorityColor,
  getPriorityLabel,
  summarizeExecutionFromSteps,
} from './testCaseUi';
import {
  ALLOWED_EVIDENCE_EXTENSIONS,
  deleteEvidence,
  uploadEvidence,
  validateEvidence,
} from '../../services/evidenceService';
import { EvidencePreview } from './EvidencePreview';

interface TestExecutionModalProps {
  open: boolean;
  testCase: TestCase | null;
  onClose: () => void;
  onExecuted?: () => void;
}

const STEP_STATUSES: Array<TestStep['status']> = ['passed', 'failed', 'blocked', 'in_progress', 'not_executed'];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isNoStepsDragging, setIsNoStepsDragging] = useState(false);

  // Estado para casos sin pasos
  const [noStepsStatus, setNoStepsStatus] = useState<TestStep['status']>('not_executed');
  const [noStepsActualResult, setNoStepsActualResult] = useState('');
  const [noStepsEvidences, setNoStepsEvidences] = useState<EvidenceFile[]>([]);
  const noStepsFileInputRef = useRef<HTMLInputElement>(null);

  // Ref con los handlers actuales para el listener de paste (evita closures obsoletos)
  const uploadHandlerRef = useRef<{
    forStep: (f: File) => Promise<void>;
    forNoSteps: (f: File) => Promise<void>;
    hasSteps: boolean;
    isUploading: boolean;
  } | null>(null);

  useEffect(() => {
    if (!open || !testCase) return;
    setSteps(
      (testCase.steps || []).map((step, index) => ({
        ...step,
        id: step.id || `step-${index}`,
        order: step.order || index + 1,
        status: step.status || 'not_executed',
        actualResult: step.actualResult || '',
        evidences: step.evidences || [],
      }))
    );
    setActiveStepIndex(0);
    setExecutionNotes(testCase.notes || '');
    setUploadProgress(null);
    setNoStepsStatus((testCase.executionResult as TestStep['status']) || 'not_executed');
    setNoStepsActualResult(testCase.actualResult || '');
    setNoStepsEvidences((testCase as any).generalEvidences || []);
  }, [open, testCase]);

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
            ref.hasSteps ? ref.forStep(file) : ref.forNoSteps(file);
          }
          break;
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [open]);

  if (!testCase) return null;

  const setStepValue = (field: keyof TestStep, value: unknown) => {
    setSteps((prev) =>
      prev.map((step, index) => (index === activeStepIndex ? { ...step, [field]: value } : step))
    );
  };

  const getStepIcon = (status?: TestStep['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
      case 'failed':
        return <ErrorOutlineIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
      case 'blocked':
        return <BlockIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
      case 'in_progress':
        return <AutorenewIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
      default:
        return <RadioButtonUncheckedIcon sx={{ color: getExecutionColor(status), fontSize: 18 }} />;
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processFileForActiveStep = async (file: File) => {
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
      setStepValue('evidences', [...(activeStep.evidences || []), evidenceFile]);
      notify('Evidencia cargada exitosamente', { type: 'success' });
    } catch {
      notify('Error al subir la evidencia. Intenta de nuevo.', { type: 'error' });
    } finally {
      setUploadProgress(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFileForActiveStep(file);
    e.target.value = '';
  };

  const handleDeleteEvidence = async (evidence: EvidenceFile) => {
    setDeletingPath(evidence.path);
    try {
      await deleteEvidence(evidence);
      const updated = (activeStep.evidences || []).filter((ev) => ev.path !== evidence.path);
      setStepValue('evidences', updated);
      notify('Evidencia eliminada', { type: 'success' });
    } catch {
      notify('Error al eliminar la evidencia', { type: 'error' });
    } finally {
      setDeletingPath(null);
    }
  };

  const processFileForNoSteps = async (file: File) => {
    if (!testCase) return;
    const validationError = validateEvidence(file);
    if (validationError) {
      notify(validationError, { type: 'error' });
      return;
    }
    setUploadProgress(0);
    try {
      const evidenceFile = await uploadEvidence(file, testCase.id, 'general', (p) => setUploadProgress(p));
      setNoStepsEvidences((prev) => [...prev, evidenceFile]);
      notify('Evidencia cargada exitosamente', { type: 'success' });
    } catch {
      notify('Error al subir la evidencia. Intenta de nuevo.', { type: 'error' });
    } finally {
      setUploadProgress(null);
    }
  };

  const handleNoStepsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFileForNoSteps(file);
    e.target.value = '';
  };

  const handleNoStepsDeleteEvidence = async (evidence: EvidenceFile) => {
    setDeletingPath(evidence.path);
    try {
      await deleteEvidence(evidence);
      setNoStepsEvidences((prev) => prev.filter((ev) => ev.path !== evidence.path));
      notify('Evidencia eliminada', { type: 'success' });
    } catch {
      notify('Error al eliminar la evidencia', { type: 'error' });
    } finally {
      setDeletingPath(null);
    }
  };

  const handleSaveExecution = async () => {
    try {
      const dataToSave = hasSteps
        ? {
            steps,
            actualResult:
              executionResult === 'passed'
                ? 'Todos los pasos fueron aprobados.'
                : executionResult === 'failed'
                  ? 'La ejecución contiene uno o más pasos fallidos.'
                  : executionResult === 'blocked'
                    ? 'La ejecución quedó bloqueada en uno o más pasos.'
                    : executionResult === 'in_progress'
                      ? 'La ejecución fue iniciada y quedó en progreso.'
                      : '',
            executionResult,
            notes: executionNotes,
          }
        : {
            executionResult: noStepsStatus,
            actualResult: noStepsActualResult,
            generalEvidences: noStepsEvidences,
            notes: executionNotes,
          };

      await update('test_cases', {
        id: testCase.id,
        data: dataToSave,
        previousData: testCase,
      });

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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PlayArrowIcon sx={{ color: '#FF6B35' }} />
        Ejecutar caso de prueba
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

            <Stack spacing={1}>
              {steps.map((step, index) => (
                <Card
                  key={step.id}
                  onClick={() => setActiveStepIndex(index)}
                  sx={{
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: index === activeStepIndex ? '#FF6B35' : 'divider',
                    boxShadow: index === activeStepIndex ? '0 0 0 2px rgba(255,107,53,0.12)' : 'none',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getStepIcon(step.status)}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          Paso {step.order || index + 1}
                          {step.evidences && step.evidences.length > 0 && (
                            <Tooltip title={`${step.evidences.length} evidencia(s)`}>
                              <AttachFileIcon sx={{ fontSize: 12, ml: 0.5, verticalAlign: 'middle', color: '#FF6B35' }} />
                            </Tooltip>
                          )}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                      {techniqueTags.map((tag) => (
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
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                    Resultado general del caso
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Este caso no tiene pasos definidos. Registra el resultado de la ejecución directamente.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Estado de la ejecución
                  </Typography>
                  <Select
                    fullWidth
                    value={noStepsStatus || 'not_executed'}
                    onChange={(e) => setNoStepsStatus(e.target.value as TestStep['status'])}
                  >
                    {STEP_STATUSES.map((status) => (
                      <MenuItem key={status} value={status}>
                        {getExecutionLabel(status)}
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
                />

                {/* Evidencias generales */}
                <Box
                  onDragOver={(e) => { e.preventDefault(); if (!isNoStepsDragging) setIsNoStepsDragging(true); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsNoStepsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsNoStepsDragging(false);
                    if (uploadProgress !== null) return;
                    const file = e.dataTransfer.files[0];
                    if (file) processFileForNoSteps(file);
                  }}
                  sx={{
                    borderRadius: 2,
                    outline: isNoStepsDragging ? '2px dashed #FF6B35' : '2px dashed transparent',
                    bgcolor: isNoStepsDragging ? 'rgba(255,107,53,0.04)' : 'transparent',
                    transition: 'outline 0.15s, background-color 0.15s',
                    p: isNoStepsDragging ? 0.5 : 0,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2">
                      Evidencias
                      {noStepsEvidences.length > 0 && (
                        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          ({noStepsEvidences.length})
                        </Typography>
                      )}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={uploadProgress !== null ? <CircularProgress size={14} /> : <AttachFileIcon />}
                      onClick={() => noStepsFileInputRef.current?.click()}
                      disabled={uploadProgress !== null}
                      sx={{ textTransform: 'none', borderColor: '#FF6B35', color: '#FF6B35', '&:hover': { borderColor: '#E55A2B', color: '#E55A2B' } }}
                    >
                      Cargar evidencia
                    </Button>
                    <input
                      ref={noStepsFileInputRef}
                      type="file"
                      accept={ALLOWED_EVIDENCE_EXTENSIONS}
                      style={{ display: 'none' }}
                      onChange={handleNoStepsFileChange}
                    />
                  </Stack>

                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                    Formatos: JPG, JPEG, PNG, MP4 · Máximo 200 MB
                  </Typography>

                  {uploadProgress !== null && (
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Subiendo archivo...</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{Math.round(uploadProgress)}%</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={uploadProgress}
                        sx={{ height: 6, borderRadius: 999, bgcolor: 'rgba(255,107,53,0.15)', '& .MuiLinearProgress-bar': { bgcolor: '#FF6B35' } }}
                      />
                    </Box>
                  )}

                  {noStepsEvidences.length > 0 ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1.5 }}>
                      {noStepsEvidences.map((ev) => (
                        <Box
                          key={ev.path}
                          sx={{
                            position: 'relative',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            bgcolor: 'background.paper',
                            '&:hover .evidence-actions': { opacity: 1 },
                          }}
                        >
                          {ev.mimeType === 'video/mp4' ? (
                            <Stack alignItems="center" justifyContent="center" spacing={0.5} sx={{ p: 1.5, minHeight: 90 }}>
                              <VideocamIcon sx={{ fontSize: 32, color: '#1E88E5' }} />
                              <Typography variant="caption" sx={{ wordBreak: 'break-all', textAlign: 'center', fontSize: 10, lineHeight: 1.3 }}>
                                {ev.name}
                              </Typography>
                            </Stack>
                          ) : (
                            <EvidencePreview evidence={ev} height={90} />
                          )}
                          <Stack
                            className="evidence-actions"
                            direction="row"
                            justifyContent="center"
                            spacing={0.5}
                            sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.55)', opacity: 0, transition: 'opacity 0.2s', py: 0.5 }}
                          >
                            <Tooltip title="Abrir en nueva pestaña">
                              <IconButton size="small" component="a" href={ev.url} target="_blank" rel="noopener noreferrer" sx={{ color: '#fff', p: 0.4 }}>
                                <OpenInNewIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar evidencia">
                              <IconButton size="small" onClick={() => handleNoStepsDeleteEvidence(ev)} disabled={deletingPath === ev.path} sx={{ color: '#f44336', p: 0.4 }}>
                                {deletingPath === ev.path ? <CircularProgress size={14} sx={{ color: '#f44336' }} /> : <DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: isNoStepsDragging ? '#FF6B35' : 'divider',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        color: isNoStepsDragging ? '#FF6B35' : 'text.disabled',
                        transition: 'border-color 0.15s, color 0.15s',
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 28, mb: 0.5, opacity: isNoStepsDragging ? 0.8 : 0.4 }} />
                      <Typography variant="caption" display="block">
                        {isNoStepsDragging ? 'Suelta aquí para adjuntar' : 'Sin evidencias adjuntas'}
                      </Typography>
                      {!isNoStepsDragging && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.6 }}>
                          Arrastra, pega (Ctrl+V) o usa el botón
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>

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
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Resultado esperado
                      </Typography>
                      <Typography variant="body1">{activeStep.expectedResult}</Typography>
                    </CardContent>
                  </Card>
                )}

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Estado del paso
                  </Typography>
                  <Select
                    fullWidth
                    value={activeStep.status || 'not_executed'}
                    onChange={(e) => setStepValue('status', e.target.value)}
                  >
                    {STEP_STATUSES.map((status) => (
                      <MenuItem key={status} value={status}>
                        {getExecutionLabel(status)}
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
                />

                {/* Sección de evidencias */}
                <Box
                  onDragOver={(e) => { e.preventDefault(); if (!isDragging) setIsDragging(true); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (uploadProgress !== null) return;
                    const file = e.dataTransfer.files[0];
                    if (file) processFileForActiveStep(file);
                  }}
                  sx={{
                    borderRadius: 2,
                    outline: isDragging ? '2px dashed #FF6B35' : '2px dashed transparent',
                    bgcolor: isDragging ? 'rgba(255,107,53,0.04)' : 'transparent',
                    transition: 'outline 0.15s, background-color 0.15s',
                    p: isDragging ? 0.5 : 0,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2">
                      Evidencias del paso
                      {activeStep.evidences && activeStep.evidences.length > 0 && (
                        <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          ({activeStep.evidences.length})
                        </Typography>
                      )}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={uploadProgress !== null ? <CircularProgress size={14} /> : <AttachFileIcon />}
                      onClick={handleUploadClick}
                      disabled={uploadProgress !== null}
                      sx={{ textTransform: 'none', borderColor: '#FF6B35', color: '#FF6B35', '&:hover': { borderColor: '#E55A2B', color: '#E55A2B' } }}
                    >
                      Cargar evidencia
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_EVIDENCE_EXTENSIONS}
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </Stack>

                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                    Formatos: JPG, JPEG, PNG, MP4 · Máximo 200 MB
                  </Typography>

                  {uploadProgress !== null && (
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Subiendo archivo...
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {Math.round(uploadProgress)}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={uploadProgress}
                        sx={{ height: 6, borderRadius: 999, bgcolor: 'rgba(255,107,53,0.15)', '& .MuiLinearProgress-bar': { bgcolor: '#FF6B35' } }}
                      />
                    </Box>
                  )}

                  {activeStep.evidences && activeStep.evidences.length > 0 ? (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                        gap: 1.5,
                      }}
                    >
                      {activeStep.evidences.map((ev) => (
                        <Box
                          key={ev.path}
                          sx={{
                            position: 'relative',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            bgcolor: 'background.paper',
                            '&:hover .evidence-actions': { opacity: 1 },
                          }}
                        >
                          {ev.mimeType === 'video/mp4' ? (
                            <Stack
                              alignItems="center"
                              justifyContent="center"
                              spacing={0.5}
                              sx={{ p: 1.5, minHeight: 90 }}
                            >
                              <VideocamIcon sx={{ fontSize: 32, color: '#1E88E5' }} />
                              <Typography
                                variant="caption"
                                sx={{
                                  wordBreak: 'break-all',
                                  textAlign: 'center',
                                  fontSize: 10,
                                  lineHeight: 1.3,
                                  maxWidth: '100%',
                                }}
                              >
                                {ev.name}
                              </Typography>
                            </Stack>
                          ) : (
                            <EvidencePreview evidence={ev} height={90} />
                          )}

                          {/* Overlay de acciones */}
                          <Stack
                            className="evidence-actions"
                            direction="row"
                            justifyContent="center"
                            spacing={0.5}
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              bgcolor: 'rgba(0,0,0,0.55)',
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              py: 0.5,
                            }}
                          >
                            <Tooltip title="Abrir en nueva pestaña">
                              <IconButton
                                size="small"
                                component="a"
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ color: '#fff', p: 0.4 }}
                              >
                                <OpenInNewIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar evidencia">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteEvidence(ev)}
                                disabled={deletingPath === ev.path}
                                sx={{ color: '#f44336', p: 0.4 }}
                              >
                                {deletingPath === ev.path ? (
                                  <CircularProgress size={14} sx={{ color: '#f44336' }} />
                                ) : (
                                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: isDragging ? '#FF6B35' : 'divider',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        color: isDragging ? '#FF6B35' : 'text.disabled',
                        transition: 'border-color 0.15s, color 0.15s',
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 28, mb: 0.5, opacity: isDragging ? 0.8 : 0.4 }} />
                      <Typography variant="caption" display="block">
                        {isDragging ? 'Suelta aquí para adjuntar' : 'Sin evidencias adjuntas'}
                      </Typography>
                      {!isDragging && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.6 }}>
                          Arrastra, pega (Ctrl+V) o usa el botón
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>

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
              backgroundColor: '#FF6B35',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#E55A2B' },
            }}
          >
            Guardar ejecución
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
