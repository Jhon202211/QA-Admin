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
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { useCreate, useNotify, useGetList } from 'react-admin';
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
  
  // Estados para campos editables de ubicación
  const [editableProject, setEditableProject] = useState<string>('QAScope');
  const [editableModule, setEditableModule] = useState<string>('');
  const [editableSubmodule, setEditableSubmodule] = useState<string>('');
  const [editableTestType, setEditableTestType] = useState<string>('Funcionales');
  
  // Obtener proyectos existentes para autocomplete
  const { data: existingTestCases = [] } = useGetList('test_cases', {
    pagination: { page: 1, perPage: 1000 },
  });
  
  const existingProjects = Array.from(
    new Set(existingTestCases.map((tc: any) => tc.testProject).filter(Boolean))
  ).sort();

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
      // Inicializar campos editables con valores sugeridos
      setEditableProject('QAScope');
      setEditableModule(result.module);
      setEditableSubmodule(result.submodule);
      setEditableTestType(result.test_type);
      notify('Casos de prueba generados exitosamente', { type: 'success' });
    } catch (err: any) {
      const errorMessage = err.message || 'Error al generar casos de prueba';
      setError(errorMessage);
      notify(errorMessage, { type: 'error' });
      console.error('Error en generateTestCasesFromUserStory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCases = async () => {
    if (!suggestion) return;
    
    // Validar campos requeridos
    if (!editableProject.trim()) {
      notify('Por favor ingresa un nombre de proyecto', { type: 'warning' });
      return;
    }
    if (!editableModule.trim()) {
      notify('Por favor ingresa un módulo', { type: 'warning' });
      return;
    }
    if (!editableSubmodule.trim()) {
      notify('Por favor ingresa un submódulo', { type: 'warning' });
      return;
    }
    if (!editableTestType) {
      notify('Por favor selecciona un tipo de prueba', { type: 'warning' });
      return;
    }

    try {
      for (const testCase of suggestion.test_cases) {
        await create('test_cases', {
          data: {
            name: testCase.title,
            description: `Caso generado automáticamente desde historia de usuario`,
            testProject: editableProject.trim(),
            module: editableModule.trim(),
            submodule: editableSubmodule.trim(),
            category: editableTestType as any,
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
    setEditableProject('QAScope');
    setEditableModule('');
    setEditableSubmodule('');
    setEditableTestType('Funcionales');
    onClose();
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  📁 Ubicación Propuesta
                </Typography>
                <EditIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              </Box>
              <Card sx={{ backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5', mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <TextField
                        fullWidth
                        label="Proyecto"
                        value={editableProject}
                        onChange={(e) => setEditableProject(e.target.value)}
                        size="small"
                        required
                        helperText="Puedes seleccionar un proyecto existente o crear uno nuevo"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
                          }
                        }}
                        inputProps={{
                          list: 'projects-list'
                        }}
                      />
                      {existingProjects.length > 0 && (
                        <datalist id="projects-list">
                          {existingProjects.map((project: string) => (
                            <option key={project} value={project} />
                          ))}
                        </datalist>
                      )}
                    </Box>
                    <TextField
                      fullWidth
                      label="Módulo / Feature"
                      value={editableModule}
                      onChange={(e) => setEditableModule(e.target.value)}
                      size="small"
                      required
                      placeholder={suggestion.module}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
                        }
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Submódulo / Flujo"
                      value={editableSubmodule}
                      onChange={(e) => setEditableSubmodule(e.target.value)}
                      size="small"
                      required
                      placeholder={suggestion.submodule}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
                        }
                      }}
                    />
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Tipo de Prueba</InputLabel>
                      <Select
                        value={editableTestType}
                        onChange={(e) => setEditableTestType(e.target.value)}
                        label="Tipo de Prueba"
                        sx={{
                          backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
                        }}
                      >
                        <MenuItem value="Smoke">Smoke</MenuItem>
                        <MenuItem value="Funcionales">Funcionales</MenuItem>
                        <MenuItem value="No Funcionales">No Funcionales</MenuItem>
                        <MenuItem value="Regresión">Regresión</MenuItem>
                        <MenuItem value="UAT">UAT</MenuItem>
                      </Select>
                    </FormControl>
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

