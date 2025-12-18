import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useCreate, useNotify } from 'react-admin';
import { generateTestCasesFromUserStory } from '../../services/aiService';
import type { AITestCaseSuggestion } from '../../services/aiService';

interface AIAgentProps {
  open: boolean;
  onClose: () => void;
  onCasesCreated?: () => void;
}

export const AIAgent = ({ open, onClose, onCasesCreated }: AIAgentProps) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const notify = useNotify();
  const [create] = useCreate();
  
  const [userStory, setUserStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AITestCaseSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!userStory.trim()) {
      notify('Por favor ingresa una historia de usuario', { type: 'warning' });
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const result = await generateTestCasesFromUserStory(userStory);
      setSuggestion(result);
    } catch (err: any) {
      setError(err.message || 'Error al generar casos de prueba');
      notify('Error al generar casos de prueba', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCases = async () => {
    if (!suggestion) return;

    try {
      for (const testCase of suggestion.test_cases) {
        await create('test_cases', {
          data: {
            name: testCase.title,
            description: `Caso generado automáticamente desde historia de usuario`,
            testProject: 'QAScope', // Proyecto por defecto
            module: suggestion.module,
            submodule: suggestion.submodule,
            category: suggestion.test_type as any,
            prerequisites: testCase.preconditions,
            steps: testCase.steps.map((step, index) => ({
              id: `step-${index}`,
              order: index + 1,
              description: step,
              expectedResult: testCase.expected_result,
            })),
            expectedResult: testCase.expected_result,
            priority: 'Media',
            status: 'Activo',
            executionResult: 'not_executed',
            type: 'functional',
            tags: [],
            createdBy: 'system',
            version: 1,
            estimatedDuration: 15,
            automated: false,
          },
        });
      }

      notify(`${suggestion.test_cases.length} caso(s) de prueba creado(s) exitosamente`, { type: 'success' });
      handleClose();
      if (onCasesCreated) {
        onCasesCreated();
      }
    } catch (err: any) {
      notify('Error al crear los casos de prueba', { type: 'error' });
    }
  };

  const handleClose = () => {
    setUserStory('');
    setSuggestion(null);
    setError(null);
    setEditingCase(null);
    onClose();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Smoke': '#FF6B35',
      'Funcionales': '#3CCF91',
      'No Funcionales': '#2196F3',
      'Regresión': '#FF9800',
      'UAT': '#9C27B0',
    };
    return colors[category] || '#6B6B6B';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
        }
      }}
    >
      <DialogTitle sx={{ color: 'text.primary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeIcon sx={{ color: '#FF6B35' }} />
        QA Test Case Architect Agent
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Ingresa una Historia de Usuario y el agente IA te ayudará a crear casos de prueba en la jerarquía correcta.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={6}
            label="Historia de Usuario"
            placeholder="Como [rol]&#10;Quiero [funcionalidad]&#10;Para [beneficio]"
            value={userStory}
            onChange={(e) => setUserStory(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            fullWidth
            onClick={handleGenerate}
            disabled={loading || !userStory.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
            sx={{
              backgroundColor: '#FF6B35',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              mb: 3,
              '&:hover': {
                backgroundColor: '#E55A2B'
              },
              '&:disabled': {
                backgroundColor: '#FFB399'
              }
            }}
          >
            {loading ? 'Generando casos de prueba...' : 'Generar guía de casos de prueba'}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {suggestion && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                📁 Ubicación Propuesta
              </Typography>
              <Card sx={{ backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5', mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Proyecto:
                      </Typography>
                      <Chip label="QAScope" size="small" sx={{ backgroundColor: '#FF6B35', color: '#FFFFFF' }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Módulo:
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>
                        {suggestion.module}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Submódulo:
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>
                        {suggestion.submodule}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Tipo de Prueba:
                      </Typography>
                      <Chip
                        label={suggestion.test_type}
                        size="small"
                        sx={{
                          backgroundColor: getCategoryColor(suggestion.test_type),
                          color: '#FFFFFF',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                🧪 Casos de Prueba Sugeridos ({suggestion.test_cases.length})
              </Typography>

              {suggestion.test_cases.map((testCase, index) => (
                <Accordion
                  key={index}
                  defaultExpanded={index === 0}
                  sx={{
                    mb: 2,
                    backgroundColor: isDark ? '#1A1C2E' : '#FFFFFF',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: 'text.primary' }} />}
                    sx={{
                      backgroundColor: isDark ? '#2B2D42' : '#F5F5F5',
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600 }}>
                      {testCase.title}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ pl: 2 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                        Precondiciones:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                        {testCase.preconditions.map((precondition, idx) => (
                          <li key={idx}>
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              {precondition}
                            </Typography>
                          </li>
                        ))}
                      </Box>

                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                        Pasos:
                      </Typography>
                      <Box component="ol" sx={{ pl: 2, mb: 2 }}>
                        {testCase.steps.map((step, idx) => (
                          <li key={idx}>
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              {step}
                            </Typography>
                          </li>
                        ))}
                      </Box>

                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
                        Resultado Esperado:
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', mb: 2 }}>
                        {testCase.expected_result}
                      </Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>
          Cancelar
        </Button>
        {suggestion && (
          <Button
            onClick={handleCreateCases}
            variant="contained"
            startIcon={<CheckCircleIcon />}
            sx={{
              backgroundColor: '#FF6B35',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#E55A2B'
              }
            }}
          >
            Crear {suggestion.test_cases.length} Caso(s) de Prueba
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

