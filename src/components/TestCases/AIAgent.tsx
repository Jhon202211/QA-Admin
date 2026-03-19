import { useState, useEffect } from 'react';
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
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TableChartIcon from '@mui/icons-material/TableChart';
import DownloadIcon from '@mui/icons-material/Download';
import { useCreate, useNotify, useGetList } from 'react-admin';
import { generateTestCasesFromUserStory } from '../../services/aiService';
import type { AITestCaseSuggestion } from '../../services/aiService';
import { knowledgeService } from '../../services/knowledgeService';

// ── Helpers de visualización ─────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  positive: 'Positivo',
  negative: 'Negativo',
  boundary: 'Límite',
  state_transition: 'Transición',
  high_risk: 'Alto Riesgo',
  regression: 'Regresión',
  security: 'Seguridad',
  performance: 'Rendimiento',
};

type ChipColor = 'success' | 'error' | 'warning' | 'info' | 'secondary' | 'default';

const CATEGORY_COLORS: Record<string, ChipColor> = {
  positive: 'success',
  negative: 'error',
  boundary: 'warning',
  state_transition: 'info',
  high_risk: 'error',
  regression: 'secondary',
  security: 'error',
  performance: 'info',
};

const PRIORITY_COLORS: Record<string, ChipColor> = {
  P0: 'error',
  P1: 'warning',
  P2: 'info',
  P3: 'default',
};

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'P0 · Crítico',
  P1: 'P1 · Alto',
  P2: 'P2 · Medio',
  P3: 'P3 · Bajo',
};

const mapPriority = (p: string): string => ({ P0: 'Alta', P1: 'Alta', P2: 'Media', P3: 'Baja' }[p] ?? 'Media');

const mapType = (category: string): string => {
  if (category === 'security') return 'security';
  if (category === 'performance') return 'performance';
  return 'functional';
};

// ── Componente ───────────────────────────────────────────────────────────────

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

  // Estado del knowledge base
  const [kbReady, setKbReady] = useState(false);
  const [kbChunks, setKbChunks] = useState(0);

  // Inicializar el índice BM25 al abrir el modal
  useEffect(() => {
    if (!open) return;
    knowledgeService.initialize().then(() => {
      setKbReady(knowledgeService.isReady);
      setKbChunks(knowledgeService.chunkCount);
    });
  }, [open]);

  // Campos de entrada
  const [userStory, setUserStory] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [businessRules, setBusinessRules] = useState('');
  const [historicalBugs, setHistoricalBugs] = useState('');
  const [topK, setTopK] = useState(3);

  // Estado de la generación
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AITestCaseSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Campos de ubicación editables
  const [editableProject, setEditableProject] = useState('QAScope');
  const [editableModule, setEditableModule] = useState('');
  const [editableSubmodule, setEditableSubmodule] = useState('');
  const [editableTestType, setEditableTestType] = useState('Funcionales');

  const { data: existingTestCases = [] } = useGetList('test_cases', {
    pagination: { page: 1, perPage: 1000 },
  });

  const existingProjects = Array.from(
    new Set(existingTestCases.map((tc: { testProject?: string }) => tc.testProject).filter(Boolean))
  ).sort() as string[];

  const handleGenerate = async () => {
    if (!userStory.trim()) {
      notify('Por favor ingresa una historia de usuario', { type: 'warning' });
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const result = await generateTestCasesFromUserStory(
        userStory,
        acceptanceCriteria,
        businessRules,
        historicalBugs,
        topK
      );
      setSuggestion(result);
      setEditableProject(result.project || result.module);
      setEditableModule(result.module);
      setEditableSubmodule(result.submodule);
      setEditableTestType(result.test_type);
      notify('Casos de prueba generados exitosamente', { type: 'success' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar casos de prueba';
      setError(errorMessage);
      notify(errorMessage, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCases = async () => {
    if (!suggestion) return;

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

    try {
      for (const tc of suggestion.test_cases) {
        const descParts = [
          tc.risk_rationale && `Riesgo: ${tc.risk_rationale}`,
          tc.integration_impact?.length ? `Impacto: ${tc.integration_impact.join(', ')}` : null,
          'Generado automáticamente desde historia de usuario',
        ].filter(Boolean);

        await create('test_cases', {
          data: {
            name: tc.title,
            description: descParts.join(' | '),
            testProject: editableProject.trim(),
            module: editableModule.trim(),
            submodule: editableSubmodule.trim(),
            category: editableTestType,
            prerequisites: tc.preconditions,
            steps: tc.steps.map((step, index) => ({
              id: `step-${index}`,
              order: index + 1,
              description: step,
              expectedResult: tc.expected_result,
            })),
            expectedResult: tc.expected_result,
            priority: mapPriority(tc.priority),
            status: 'Activo',
            executionResult: 'not_executed',
            type: mapType(tc.category),
            tags: tc.technique_applied ?? [],
            createdBy: 'system',
            version: 1,
            estimatedDuration: 15,
            automated: false,
          },
        });
      }

      notify(`${suggestion.test_cases.length} caso(s) de prueba creado(s) exitosamente`, { type: 'success' });
      handleClose();
      onCasesCreated?.();
    } catch {
      notify('Error al crear los casos de prueba', { type: 'error' });
    }
  };

  const handleExportJSON = () => {
    if (!suggestion) return;
    const blob = new Blob([JSON.stringify(suggestion, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test_cases.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setUserStory('');
    setAcceptanceCriteria('');
    setBusinessRules('');
    setHistoricalBugs('');
    setTopK(3);
    setSuggestion(null);
    setError(null);
    setEditableProject('QAScope');
    setEditableModule('');
    setEditableSubmodule('');
    setEditableTestType('Funcionales');
    onClose();
  };

  const cardBg = isDark ? '#1A1C2E' : '#F5F5F5';
  const innerBg = isDark ? '#2B2D42' : '#FFFFFF';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
      PaperProps={{ sx: { backgroundColor: isDark ? '#2B2D42' : '#FFFFFF' } }}
    >
      <DialogTitle sx={{ color: 'text.primary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeIcon sx={{ color: '#FF6B35' }} />
        QA Test Case Architect Agent
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
              Proporciona contexto detallado y el agente aplicará 7 técnicas QA para generar casos de prueba
              completos con análisis de condiciones, tabla de decisiones y priorización por riesgo.
            </Typography>
            <Chip
              size="small"
              icon={
                kbReady
                  ? undefined
                  : <CircularProgress size={12} sx={{ ml: '6px !important' }} />
              }
              label={
                kbReady
                  ? `KB · ${kbChunks} chunks`
                  : 'Cargando KB...'
              }
              color={kbReady ? 'success' : 'default'}
              variant="outlined"
              sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 22 }}
            />
          </Box>

          {/* Historia de usuario */}
          <TextField
            fullWidth
            multiline
            rows={5}
            label="Historia de usuario *"
            placeholder={'Como [rol]\nQuiero [funcionalidad]\nPara [beneficio]'}
            value={userStory}
            onChange={(e) => setUserStory(e.target.value)}
            disabled={loading}
          />

          {/* Criterios de aceptación */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Criterios de aceptación"
            placeholder="Lista los criterios que deben cumplirse para considerar la historia completada..."
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            disabled={loading}
          />

          {/* Reglas de negocio */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reglas de negocio"
            placeholder="Reglas específicas del dominio, restricciones, validaciones del negocio..."
            value={businessRules}
            onChange={(e) => setBusinessRules(e.target.value)}
            disabled={loading}
          />

          {/* Bugs históricos */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Bugs históricos"
            placeholder="Bugs conocidos o recurrentes relacionados con esta funcionalidad..."
            value={historicalBugs}
            onChange={(e) => setHistoricalBugs(e.target.value)}
            disabled={loading}
          />

          {/* Top K */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              label="Top K (contexto)"
              type="number"
              value={topK}
              onChange={(e) => setTopK(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
              disabled={loading}
              inputProps={{ min: 1, max: 20 }}
              sx={{ width: 140 }}
              helperText="Documentos de contexto (1–20)"
              size="small"
            />
          </Box>

          {/* Botón generar */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleGenerate}
            disabled={loading || !userStory.trim()}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
            sx={{
              backgroundColor: '#FF6B35',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              '&:hover': { backgroundColor: '#E55A2B' },
              '&:disabled': { backgroundColor: '#FFB399' },
            }}
          >
            {loading ? 'Generando casos de prueba...' : 'Generar guía de casos de prueba'}
          </Button>

          {error && <Alert severity="error">{error}</Alert>}

          {/* ── Resultados ────────────────────────────────────────────── */}
          {suggestion && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Divider />

              {/* Condiciones identificadas */}
              {suggestion.conditions.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PsychologyIcon sx={{ color: '#7C4DFF' }} />
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                      Condiciones identificadas
                    </Typography>
                  </Box>
                  {suggestion.conditions.map((cond, i) => (
                    <Accordion
                      key={i}
                      defaultExpanded={i === 0}
                      sx={{ backgroundColor: cardBg, '&:before': { display: 'none' }, mb: 1 }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: 'text.primary' }} />}
                        sx={{ backgroundColor: innerBg }}
                      >
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                          {cond.name}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {cond.description && (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {cond.description}
                            </Typography>
                          )}

                          {cond.equivalence_partitions?.length > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Particiones de equivalencia
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {cond.equivalence_partitions.map((p, j) => (
                                  <Chip key={j} label={p} size="small" variant="outlined" color="primary" />
                                ))}
                              </Box>
                            </Box>
                          )}

                          {cond.boundary_values?.length > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                                Valores límite
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {cond.boundary_values.map((v, j) => (
                                  <Chip key={j} label={v} size="small" variant="outlined" color="warning" />
                                ))}
                              </Box>
                            </Box>
                          )}

                          {cond.notes && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                              Nota: {cond.notes}
                            </Typography>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}

              {/* Tabla de decisiones */}
              {suggestion.decision_table?.applicable && suggestion.decision_table.headers?.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TableChartIcon sx={{ color: '#00BCD4' }} />
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                      Tabla de decisiones
                    </Typography>
                  </Box>
                  <Card sx={{ backgroundColor: cardBg }}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: innerBg }}>
                            {suggestion.decision_table.headers.map((h, i) => (
                              <TableCell
                                key={i}
                                sx={{ color: 'text.primary', fontWeight: 700, borderColor: 'divider' }}
                              >
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {suggestion.decision_table.rows.map((row, i) => (
                            <TableRow key={i} sx={{ '&:hover': { backgroundColor: innerBg } }}>
                              {row.map((cell, j) => (
                                <TableCell key={j} sx={{ color: 'text.primary', borderColor: 'divider' }}>
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Box>
              )}

              {/* Ubicación propuesta */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    📁 Ubicación propuesta
                  </Typography>
                  <EditIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                </Box>
                <Card sx={{ backgroundColor: cardBg }}>
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
                          helperText="Puedes seleccionar un proyecto existente o escribir uno nuevo"
                          sx={{ '& .MuiOutlinedInput-root': { backgroundColor: innerBg } }}
                          inputProps={{ list: 'projects-list' }}
                        />
                        {existingProjects.length > 0 && (
                          <datalist id="projects-list">
                            {existingProjects.map((p) => (
                              <option key={p} value={p} />
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
                        sx={{ '& .MuiOutlinedInput-root': { backgroundColor: innerBg } }}
                      />
                      <TextField
                        fullWidth
                        label="Submódulo / Flujo"
                        value={editableSubmodule}
                        onChange={(e) => setEditableSubmodule(e.target.value)}
                        size="small"
                        required
                        sx={{ '& .MuiOutlinedInput-root': { backgroundColor: innerBg } }}
                      />
                      <FormControl fullWidth size="small" required>
                        <InputLabel>Tipo de prueba</InputLabel>
                        <Select
                          value={editableTestType}
                          onChange={(e) => setEditableTestType(e.target.value)}
                          label="Tipo de prueba"
                          sx={{ backgroundColor: innerBg }}
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
              </Box>

              {/* Casos de prueba */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    🧪 Casos de prueba sugeridos ({suggestion.test_cases.length})
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportJSON}
                    sx={{ textTransform: 'none', color: 'text.secondary' }}
                  >
                    Exportar JSON
                  </Button>
                </Box>

                {suggestion.test_cases.map((tc, index) => (
                  <Accordion
                    key={index}
                    defaultExpanded={index === 0}
                    sx={{ mb: 1.5, backgroundColor: cardBg, '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: 'text.primary' }} />}
                      sx={{ backgroundColor: innerBg }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%', pr: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontWeight: 700 }}>
                          {tc.id}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600, flex: 1 }}>
                          {tc.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Chip
                            label={CATEGORY_LABELS[tc.category] ?? tc.category}
                            size="small"
                            color={CATEGORY_COLORS[tc.category] ?? 'default'}
                          />
                          <Chip
                            label={PRIORITY_LABELS[tc.priority] ?? tc.priority}
                            size="small"
                            color={PRIORITY_COLORS[tc.priority] ?? 'default'}
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 1 }}>
                        {/* Técnicas aplicadas */}
                        {tc.technique_applied?.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                              Técnicas aplicadas
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {tc.technique_applied.map((t, i) => (
                                <Chip key={i} label={t} size="small" sx={{ backgroundColor: isDark ? '#3A3C52' : '#EDE7F6', color: '#7C4DFF' }} />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {/* Precondiciones */}
                        <Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                            Precondiciones
                          </Typography>
                          <Box component="ul" sx={{ pl: 2, m: 0 }}>
                            {tc.preconditions.map((p, i) => (
                              <li key={i}>
                                <Typography variant="body2" sx={{ color: 'text.primary' }}>{p}</Typography>
                              </li>
                            ))}
                          </Box>
                        </Box>

                        {/* Pasos */}
                        <Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                            Pasos
                          </Typography>
                          <Box component="ol" sx={{ pl: 2, m: 0 }}>
                            {tc.steps.map((s, i) => (
                              <li key={i}>
                                <Typography variant="body2" sx={{ color: 'text.primary' }}>{s}</Typography>
                              </li>
                            ))}
                          </Box>
                        </Box>

                        {/* Resultado esperado */}
                        <Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                            Resultado esperado
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary' }}>
                            {tc.expected_result}
                          </Typography>
                        </Box>

                        {/* Riesgo */}
                        {tc.risk_rationale && (
                          <Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                              Justificación de riesgo
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.primary', fontStyle: 'italic' }}>
                              {tc.risk_rationale}
                            </Typography>
                          </Box>
                        )}

                        {/* Impacto de integración */}
                        {tc.integration_impact?.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                              Impacto en integración
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {tc.integration_impact.map((imp, i) => (
                                <Chip key={i} label={imp} size="small" variant="outlined" color="info" />
                              ))}
                            </Box>
                          </Box>
                        )}

                        {/* Links de regresión */}
                        {tc.regression_links?.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                              Referencias de regresión
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {tc.regression_links.map((link, i) => (
                                <Chip key={i} label={link} size="small" variant="outlined" color="secondary" />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
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
              '&:hover': { backgroundColor: '#E55A2B' },
            }}
          >
            Crear {suggestion.test_cases.length} caso(s) en Firebase
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
