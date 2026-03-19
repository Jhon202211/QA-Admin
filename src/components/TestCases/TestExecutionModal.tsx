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
  }, [open, testCase]);

  const activeStep = steps[activeStepIndex];
  const completedSteps = steps.filter((step) => step.status && step.status !== 'not_executed').length;
  const progress = steps.length ? (completedSteps / steps.length) * 100 : 0;
  const executionResult = useMemo(() => summarizeExecutionFromSteps(steps), [steps]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStep || !testCase) return;

    const validationError = validateEvidence(file);
    if (validationError) {
      notify(validationError, { type: 'error' });
      e.target.value = '';
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
      const updated = [...(activeStep.evidences || []), evidenceFile];
      setStepValue('evidences', updated);
      notify('Evidencia cargada exitosamente', { type: 'success' });
    } catch {
      notify('Error al subir la evidencia. Intenta de nuevo.', { type: 'error' });
    } finally {
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  const handleDeleteEvidence = async (evidence: EvidenceFile) => {
    setDeletingPath(evidence.path);
    try {
      await deleteEvidence(evidence.path);
      const updated = (activeStep.evidences || []).filter((ev) => ev.path !== evidence.path);
      setStepValue('evidences', updated);
      notify('Evidencia eliminada', { type: 'success' });
    } catch {
      notify('Error al eliminar la evidencia', { type: 'error' });
    } finally {
      setDeletingPath(null);
    }
  };

  const handleSaveExecution = async () => {
    try {
      await update('test_cases', {
        id: testCase.id,
        data: {
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
        },
        previousData: testCase,
      });

      notify('Ejecución guardada exitosamente', { type: 'success' });
      onExecuted?.();
      onClose();
    } catch {
      notify('Error al guardar la ejecución del caso de prueba', { type: 'error' });
    }
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
              {completedSteps} de {steps.length} pasos evaluados
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

          {/* Panel derecho: detalle del paso activo */}
          <Box sx={{ p: 3, overflowY: 'auto', maxHeight: 640 }}>
            {activeStep ? (
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
                <Box>
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
                            <Box
                              component="a"
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: 'block', cursor: 'zoom-in' }}
                            >
                              <Box
                                component="img"
                                src={ev.url}
                                alt={ev.name}
                                sx={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
                              />
                            </Box>
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
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        color: 'text.disabled',
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 28, mb: 0.5, opacity: 0.4 }} />
                      <Typography variant="caption" display="block">
                        Sin evidencias adjuntas
                      </Typography>
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
                Este caso no tiene pasos configurados.
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
