import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetOne, useUpdate, useNotify } from 'react-admin';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Divider,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Block,
  PlayArrow,
  Pause,
  Save,
  Edit,
  ArrowBack,
  CheckCircleOutline,
  RadioButtonUnchecked,
  AddPhotoAlternate,
  Note,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { TestCase, TestStep } from '../../types/testCase';

const getStepStatusIcon = (status?: string) => {
  switch (status) {
    case 'passed':
      return <CheckCircle sx={{ color: '#4caf50', fontSize: 28 }} />;
    case 'failed':
      return <Cancel sx={{ color: '#E53935', fontSize: 28 }} />;
    case 'blocked':
      return <Block sx={{ color: '#ff9800', fontSize: 28 }} />;
    default:
      return <RadioButtonUnchecked sx={{ color: '#bdbdbd', fontSize: 28 }} />;
  }
};

const getStepStatusColor = (status?: string) => {
  switch (status) {
    case 'passed':
      return '#4caf50';
    case 'failed':
      return '#E53935';
    case 'blocked':
      return '#ff9800';
    default:
      return '#bdbdbd';
  }
};

const getExecutionResultLabel = (result?: string) => {
  const labels: Record<string, string> = {
    passed: 'Aprobado',
    failed: 'Fallido',
    blocked: 'Bloqueado',
    not_executed: 'No ejecutado',
  };
  return labels[result || 'not_executed'] || 'No ejecutado';
};

const getExecutionResultColor = (result?: string) => {
  const colors: Record<string, string> = {
    passed: '#4caf50',
    failed: '#E53935',
    blocked: '#ff9800',
    not_executed: '#bdbdbd',
  };
  return colors[result || 'not_executed'] || '#bdbdbd';
};

export const TestCaseExecutionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const notify = useNotify();
  const [update] = useUpdate();

  const { data: testCase, isLoading } = useGetOne<TestCase>('test_cases', { id: id || '' });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<number, 'passed' | 'failed' | 'blocked' | 'not_executed'>>({});
  const [stepNotes, setStepNotes] = useState<Record<number, string>>({});
  const [executionResult, setExecutionResult] = useState<'passed' | 'failed' | 'blocked' | 'not_executed'>('not_executed');
  const [notes, setNotes] = useState('');
  const [responsible, setResponsible] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  useEffect(() => {
    if (testCase) {
      setResponsible(testCase.responsible || '');
      setNotes(testCase.notes || '');
      setExecutionResult(testCase.executionResult || 'not_executed');
      
      // Inicializar estados de pasos desde el testCase
      const initialStatuses: Record<number, 'passed' | 'failed' | 'blocked' | 'not_executed'> = {};
      testCase.steps?.forEach((step, index) => {
        if (step.status) {
          initialStatuses[index] = step.status;
        }
      });
      setStepStatuses(initialStatuses);
    }
  }, [testCase]);

  const steps = testCase?.steps || [];
  const activeStep = currentStep;

  const handleStepStatusChange = (stepIndex: number, status: 'passed' | 'failed' | 'blocked' | 'not_executed') => {
    setStepStatuses({ ...stepStatuses, [stepIndex]: status });
    
    // Auto-avanzar al siguiente paso si está pasando
    if (status === 'passed' && stepIndex < steps.length - 1) {
      setTimeout(() => {
        setCurrentStep(stepIndex + 1);
      }, 500);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const calculateOverallResult = (): 'passed' | 'failed' | 'blocked' | 'not_executed' => {
    const stepValues = Object.values(stepStatuses);
    if (stepValues.length === 0) return 'not_executed';
    if (stepValues.some(s => s === 'blocked')) return 'blocked';
    if (stepValues.some(s => s === 'failed')) return 'failed';
    if (stepValues.every(s => s === 'passed')) return 'passed';
    return 'not_executed';
  };

  const handleSave = async () => {
    if (!testCase) return;

    setIsExecuting(true);
    try {
      // Actualizar pasos con sus estados y notas
      const updatedSteps: TestStep[] = steps.map((step, index) => ({
        ...step,
        status: stepStatuses[index] || 'not_executed',
        actualResult: stepNotes[index] || step.actualResult,
      }));

      const finalResult = executionResult !== 'not_executed' ? executionResult : calculateOverallResult();

      await update('test_cases', {
        id: testCase.id,
        data: {
          ...testCase,
          steps: updatedSteps,
          executionResult: finalResult,
          notes: notes,
          responsible: responsible,
          updatedAt: new Date(),
        },
      });

      notify('Ejecución guardada exitosamente', { type: 'success' });
      setSaveDialogOpen(false);
      navigate('/test_cases');
    } catch (error) {
      notify('Error al guardar la ejecución', { type: 'error' });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStartExecution = () => {
    setIsExecuting(true);
    setCurrentStep(0);
  };

  const handlePauseExecution = () => {
    setIsExecuting(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Cargando caso de prueba...</Typography>
      </Box>
    );
  }

  if (!testCase) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Caso de prueba no encontrado</Alert>
      </Box>
    );
  }

  const progressPercentage = steps.length > 0 
    ? (Object.keys(stepStatuses).filter(k => stepStatuses[Number(k)] !== 'not_executed').length / steps.length) * 100 
    : 0;

  return (
    <Box sx={{ p: 3, backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5', minHeight: '100vh' }}>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <IconButton onClick={() => navigate('/test_cases')} sx={{ color: 'text.primary' }}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {testCase.caseKey} - {testCase.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <Chip
                label={testCase.testProject || 'Sin proyecto'}
                size="small"
                sx={{ backgroundColor: '#FF6B35', color: '#FFFFFF' }}
              />
              <Chip
                label={testCase.category || 'Sin categoría'}
                size="small"
                sx={{ backgroundColor: '#2196F3', color: '#FFFFFF' }}
              />
              <Chip
                label={testCase.priority || 'Sin prioridad'}
                size="small"
                sx={{
                  backgroundColor:
                    testCase.priority === 'high' || testCase.priority === 'critical' ? '#E53935' :
                    testCase.priority === 'medium' ? '#ff9800' :
                    testCase.priority === 'low' ? '#4caf50' : '#bdbdbd',
                  color: '#fff',
                }}
              />
              <Chip
                label={getExecutionResultLabel(testCase.executionResult)}
                size="small"
                sx={{
                  backgroundColor: getExecutionResultColor(testCase.executionResult),
                  color: '#fff',
                }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => navigate(`/test_cases/${testCase.id}/edit`)}
              sx={{ borderColor: '#FF6B35', color: '#FF6B35' }}
            >
              Editar
            </Button>
            {!isExecuting ? (
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleStartExecution}
                sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#45a049' } }}
              >
                Iniciar Ejecución
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<Pause />}
                onClick={handlePauseExecution}
                sx={{ borderColor: '#ff9800', color: '#ff9800' }}
              >
                Pausar
              </Button>
            )}
          </Box>
        </Box>

        {testCase.description && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
              Descripción:
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.primary' }}>
              {testCase.description}
            </Typography>
          </Box>
        )}

        {testCase.prerequisites && testCase.prerequisites.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
              Precondiciones:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {testCase.prerequisites.map((preq, idx) => (
                <li key={idx}>
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    {preq}
                  </Typography>
                </li>
              ))}
            </Box>
          </Box>
        )}

        {isExecuting && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Progreso de ejecución
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {Math.round(progressPercentage)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: isDark ? '#1A1C2E' : '#E0E0E0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: progressPercentage === 100 ? '#4caf50' : '#FF6B35',
                },
              }}
            />
          </Box>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Stepper y Pasos */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
              Pasos de Ejecución
            </Typography>

            <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 3 }}>
              {steps.map((step, index) => (
                <Step key={step.id || index} completed={stepStatuses[index] === 'passed'}>
                  <StepLabel
                    onClick={() => handleStepClick(index)}
                    sx={{ cursor: 'pointer' }}
                    StepIconComponent={() => getStepStatusIcon(stepStatuses[index])}
                  >
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      Paso {index + 1}
                    </Typography>
                  </StepLabel>
                  <Box sx={{ ml: 4, mb: 3 }}>
                    <Card
                      sx={{
                        backgroundColor: isDark ? '#1A1C2E' : '#FAFAFA',
                        border: `2px solid ${
                          currentStep === index
                            ? '#FF6B35'
                            : stepStatuses[index]
                            ? getStepStatusColor(stepStatuses[index])
                            : '#E0E0E0'
                        }`,
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: '#FF6B35',
                        },
                      }}
                      onClick={() => handleStepClick(index)}
                    >
                      <CardContent>
                        <Box
                          dangerouslySetInnerHTML={{ __html: step.description }}
                          sx={{
                            color: 'text.primary',
                            mb: 2,
                            '& p': { margin: 0 },
                            '& ul, & ol': { margin: 0, paddingLeft: 2 },
                          }}
                        />
                        {step.expectedResult && (
                          <Box sx={{ mt: 2, p: 1.5, backgroundColor: isDark ? '#2B2D42' : '#E3F2FD', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                              Resultado Esperado:
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              {step.expectedResult}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                </Step>
              ))}
            </Stepper>

            {/* Controles de paso actual */}
            {isExecuting && steps.length > 0 && (
              <Box sx={{ mt: 3, p: 2, backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  Paso {currentStep + 1} de {steps.length}
                </Typography>
                <Box
                  dangerouslySetInnerHTML={{ __html: steps[currentStep]?.description || '' }}
                  sx={{
                    color: 'text.primary',
                    mb: 2,
                    '& p': { margin: 0 },
                    '& ul, & ol': { margin: 0, paddingLeft: 2 },
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant={stepStatuses[currentStep] === 'passed' ? 'contained' : 'outlined'}
                    startIcon={<CheckCircle />}
                    onClick={() => handleStepStatusChange(currentStep, 'passed')}
                    sx={{
                      backgroundColor: stepStatuses[currentStep] === 'passed' ? '#4caf50' : 'transparent',
                      borderColor: '#4caf50',
                      color: stepStatuses[currentStep] === 'passed' ? '#fff' : '#4caf50',
                      '&:hover': {
                        backgroundColor: stepStatuses[currentStep] === 'passed' ? '#45a049' : 'rgba(76, 175, 80, 0.1)',
                      },
                    }}
                  >
                    Pasó
                  </Button>
                  <Button
                    variant={stepStatuses[currentStep] === 'failed' ? 'contained' : 'outlined'}
                    startIcon={<Cancel />}
                    onClick={() => handleStepStatusChange(currentStep, 'failed')}
                    sx={{
                      backgroundColor: stepStatuses[currentStep] === 'failed' ? '#E53935' : 'transparent',
                      borderColor: '#E53935',
                      color: stepStatuses[currentStep] === 'failed' ? '#fff' : '#E53935',
                      '&:hover': {
                        backgroundColor: stepStatuses[currentStep] === 'failed' ? '#C62828' : 'rgba(229, 57, 53, 0.1)',
                      },
                    }}
                  >
                    Falló
                  </Button>
                  <Button
                    variant={stepStatuses[currentStep] === 'blocked' ? 'contained' : 'outlined'}
                    startIcon={<Block />}
                    onClick={() => handleStepStatusChange(currentStep, 'blocked')}
                    sx={{
                      backgroundColor: stepStatuses[currentStep] === 'blocked' ? '#ff9800' : 'transparent',
                      borderColor: '#ff9800',
                      color: stepStatuses[currentStep] === 'blocked' ? '#fff' : '#ff9800',
                      '&:hover': {
                        backgroundColor: stepStatuses[currentStep] === 'blocked' ? '#F57C00' : 'rgba(255, 152, 0, 0.1)',
                      },
                    }}
                  >
                    Bloqueado
                  </Button>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notas del paso (opcional)"
                  value={stepNotes[currentStep] || ''}
                  onChange={(e) => setStepNotes({ ...stepNotes, [currentStep]: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                  <Button
                    disabled={currentStep === 0}
                    onClick={handleBack}
                    sx={{ color: 'text.primary' }}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={currentStep === steps.length - 1}
                    sx={{ backgroundColor: '#FF6B35', '&:hover': { backgroundColor: '#E55A2B' } }}
                  >
                    Siguiente
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Panel lateral de información y resultados */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
              position: 'sticky',
              top: 20,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
              Resultado de Ejecución
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Resultado Final</InputLabel>
              <Select
                value={executionResult}
                onChange={(e) => setExecutionResult(e.target.value as any)}
                label="Resultado Final"
              >
                <MenuItem value="not_executed">No ejecutado</MenuItem>
                <MenuItem value="passed">Aprobado</MenuItem>
                <MenuItem value="failed">Fallido</MenuItem>
                <MenuItem value="blocked">Bloqueado</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Responsable"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notas adicionales"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 600 }}>
                Resumen de Pasos:
              </Typography>
              {steps.map((_, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {getStepStatusIcon(stepStatuses[index])}
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    Paso {index + 1}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Button
              fullWidth
              variant="contained"
              startIcon={<Save />}
              onClick={() => setSaveDialogOpen(true)}
              disabled={!isExecuting && Object.keys(stepStatuses).length === 0}
              sx={{
                backgroundColor: '#4caf50',
                '&:hover': { backgroundColor: '#45a049' },
                mt: 2,
              }}
            >
              Guardar Ejecución
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog de confirmación de guardado */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Confirmar Guardado</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas guardar los resultados de esta ejecución?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" sx={{ backgroundColor: '#4caf50' }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
