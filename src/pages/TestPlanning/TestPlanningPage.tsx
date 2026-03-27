import {
  List, useListContext, EditButton, DeleteButton,
  TopToolbar, CreateButton, ExportButton, FilterButton,
  TextInput, SelectInput, DateField, useGetList,
  Create, Edit, useRecordContext, useSaveContext, useRedirect,
} from 'react-admin';
import {
  Box, Typography, Card, CardContent, Chip, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tab, Tabs, Stepper, Step, StepLabel,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Checkbox, IconButton, CircularProgress,
  ToggleButtonGroup, ToggleButton, Accordion, AccordionSummary,
  AccordionDetails, LinearProgress, Tooltip,
} from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState, useEffect, useRef } from 'react';
import { dataProvider } from '../../firebase/dataProvider';
import { HierarchicalCaseSelector } from '../../components/TestPlanning/HierarchicalCaseSelector';

// ??? Constantes ???????????????????????????????????????????????????????????????

const STATUS_CHOICES = [
  { id: 'draft', name: 'Borrador' },
  { id: 'active', name: 'Activo' },
  { id: 'in_progress', name: 'En Progreso' },
  { id: 'completed', name: 'Completado' },
  { id: 'cancelled', name: 'Cancelado' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: '#9e9e9e', active: '#2196f3', in_progress: '#ff9800',
  completed: '#4caf50', cancelled: '#f44336',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', active: 'Activo', in_progress: 'En Progreso',
  completed: 'Completado', cancelled: 'Cancelado',
};

const CAT_COLORS: Record<string, string> = {
  Smoke: '#FF6B35', Funcionales: '#3CCF91', 'No Funcionales': '#2196F3',
  'Regresión': '#FF9800', UAT: '#9C27B0',
};

const AUTOMATED_CHOICES = [
  { id: 'test_create_user.py', name: 'Crear usuario' },
  { id: 'test_create_visitor.py', name: 'Crear visitante' },
  { id: 'test_create_company.py', name: 'Crear empresa' },
  { id: 'test_create_room_reservation.py', name: 'Reservar sala' },
  { id: 'test_deactivate_user_company.py', name: 'Desactivar usuario/empresa' },
  { id: 'test_restore_user_company.py', name: 'Restaurar usuario/empresa' },
  { id: 'test_create_property.py', name: 'Crear Copropiedad' },
  { id: 'test_edit_property.py', name: 'Editar Copropiedad' },
  { id: 'test_deactivate_property.py', name: 'Desactivar Copropiedad' },
];

const TEST_TO_CASE_ID: Record<string, string> = {
  'test_create_user.py': 'TC001', 'test_create_company.py': 'TC002',
  'test_create_visitor.py': 'TC003', 'test_create_room_reservation.py': 'TC004',
  'test_deactivate_user_company.py': 'TC005', 'test_restore_user_company.py': 'TC006',
};

const TEST_ALIASES: Record<string, string[]> = {
  'test_create_company.py': ['test_create_company', 'pytest'],
  'test_create_user.py': ['test_create_user', 'pytest'],
  'test_create_visitor.py': ['test_create_visitor', 'pytest'],
  'test_create_room_reservation.py': ['test_create_room_reservation', 'pytest'],
  'test_deactivate_user_company.py': ['test_deactivate_user_company', 'pytest'],
  'test_restore_user_company.py': ['test_restore_user_company', 'pytest'],
};

const RESULT_LABELS: Record<string, { label: string; color: string }> = {
  passed: { label: 'Pas?', color: '#4caf50' },
  failed: { label: 'Fall?', color: '#e53935' },
  blocked: { label: 'Bloqueado', color: '#ff9800' },
};

interface PlanFormData {
  name: string; description: string; status: string;
  startDate: string; endDate: string;
  manualTestCases: string[]; automatedTests: string[];
}

// ??? Utilidades ???????????????????????????????????????????????????????????????

const getPlanProgress = (plan: any, testCases: any[]) => {
  const ids: string[] = plan.manualTestCases || [];
  if (ids.length === 0) return null;
  const cases = testCases.filter(tc => ids.includes(tc.id));
  const passed = cases.filter(tc => tc.executionResult === 'passed').length;
  const failed = cases.filter(tc => tc.executionResult === 'failed').length;
  const blocked = cases.filter(tc => tc.executionResult === 'blocked').length;
  const pending = ids.length - passed - failed - blocked;
  const pct = Math.round(((passed + failed + blocked) / ids.length) * 100);
  return { total: ids.length, passed, failed, blocked, pending, pct };
};

const groupCasesByHierarchy = (caseIds: string[], allCases: any[]) => {
  const g: Record<string, Record<string, any[]>> = {};
  for (const id of caseIds) {
    const tc = allCases.find((t: any) => t.id === id);
    if (!tc) continue;
    const p = tc.testProject || 'Sin proyecto';
    const c = tc.category || 'Sin categor?a';
    if (!g[p]) g[p] = {};
    if (!g[p][c]) g[p][c] = [];
    g[p][c].push(tc);
  }
  return g;
};

// ??? ProgressBar ??????????????????????????????????????????????????????????????

const ProgressBar = ({ progress }: { progress: NonNullable<ReturnType<typeof getPlanProgress>> }) => (
  <Box sx={{ mt: 1.5 }}>
    <Box sx={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', bgcolor: '#f0f0f0', mb: 0.75 }}>
      {progress.passed > 0 && <Box sx={{ flex: progress.passed, bgcolor: '#4caf50', transition: 'flex 0.3s' }} />}
      {progress.failed > 0 && <Box sx={{ flex: progress.failed, bgcolor: '#e53935', transition: 'flex 0.3s' }} />}
      {progress.blocked > 0 && <Box sx={{ flex: progress.blocked, bgcolor: '#ff9800', transition: 'flex 0.3s' }} />}
      {progress.pending > 0 && <Box sx={{ flex: progress.pending, bgcolor: '#e0e0e0' }} />}
    </Box>
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>? {progress.passed} pasaron</Typography>
      <Typography variant="caption" sx={{ color: '#e53935', fontWeight: 600 }}>? {progress.failed} fallaron</Typography>
      {progress.blocked > 0 && <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>? {progress.blocked} bloqueados</Typography>}
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>? {progress.pending} pendientes</Typography>
      <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary', fontWeight: 600 }}>{progress.pct}%</Typography>
    </Box>
  </Box>
);

// ??? RunPlanDialog ????????????????????????????????????????????????????????????

function RunPlanDialog({ plan, allCases, testResults, onClose, onSaved }: {
  plan: any; allCases: any[]; testResults: any[];
  onClose: () => void; onSaved: () => void;
}) {
  const [tab, setTab] = useState(0);
  const [manualResults, setManualResults] = useState<Record<string, string>>({});
  const [autoStatus, setAutoStatus] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const pollingRefs = useRef<Record<string, any>>({});

  const manualGrouped = groupCasesByHierarchy(plan.manualTestCases || [], allCases);

  const getAutoStatus = (testId: string) => {
    const baseName = testId.replace('.py', '');
    const caseId = TEST_TO_CASE_ID[testId] || null;
    const aliases = [baseName, ...(TEST_ALIASES[testId] || [])];
    let results = testResults.filter((r: any) => {
      const rName = (r.name || '').replace('.py', '');
      return r.planId === plan.id && aliases.includes(rName) && (!caseId || r.caseId === caseId);
    });
    if (results.length === 0) {
      results = testResults.filter((r: any) => {
        const rName = (r.name || '').replace('.py', '');
        return aliases.includes(rName) && (!caseId || r.caseId === caseId);
      });
    }
    if (results.length === 0) return null;
    return results.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].status;
  };

  const startPolling = (executionId: string, testId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/tests/status/${executionId}`, { headers: { Authorization: 'Bearer valid_token' } });
        if (!res.ok) throw new Error();
        const s = await res.json();
        if (['completed', 'failed', 'error'].includes(s.status)) {
          clearInterval(interval);
          pollingRefs.current[testId] = null;
          setTimeout(() => setAutoStatus(prev => ({ ...prev })), 2000);
        }
        if (attempts >= 60) { clearInterval(interval); pollingRefs.current[testId] = null; }
      } catch { clearInterval(interval); pollingRefs.current[testId] = null; }
    }, 5000);
    pollingRefs.current[testId] = interval;
  };

  const handleRunAll = async () => {
    setRunning(true);
    for (const testId of plan.automatedTests || []) {
      setAutoStatus(s => ({ ...s, [testId]: 'running' }));
      try {
        const res = await fetch('/api/tests/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid_token' },
          body: JSON.stringify({ test_file: testId, planId: plan.id, caseId: TEST_TO_CASE_ID[testId] || '' }),
        });
        const data = await res.json();
        if (data.execution_id) startPolling(data.execution_id, testId);
      } catch { setAutoStatus(s => ({ ...s, [testId]: 'error' })); }
    }
    setRunning(false);
  };

  const handleSaveManuals = async () => {
    setSaving(true);
    try {
      for (const testId of Object.keys(manualResults)) {
        const tc = allCases.find((t: any) => t.id === testId);
        if (tc) await dataProvider.update('test_cases', { id: testId, data: { ...tc, executionResult: manualResults[testId] } });
      }
      await dataProvider.update('test_planning', {
        id: plan.id,
        data: {
          ...plan,
          manualTestCases: (plan.manualTestCases || []).filter(Boolean),
          automatedTests: (plan.automatedTests || []).filter(Boolean),
        },
      });
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  const manualTotal = (plan.manualTestCases || []).length;
  const manualDone = (plan.manualTestCases || []).filter((id: string) => {
    const r = manualResults[id] || allCases.find((t: any) => t.id === id)?.executionResult;
    return r && r !== 'not_executed';
  }).length;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{plan.name}</Typography>
            <Typography variant="body2" color="text.secondary">{plan.description}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}><CloseIcon /></IconButton>
        </Box>

        {/* Barra de progreso general */}
        {manualTotal > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Progreso manuales</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{manualDone}/{manualTotal}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={manualTotal > 0 ? (manualDone / manualTotal) * 100 : 0}
              sx={{ height: 6, borderRadius: 3, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: '#FF6B35' } }}
            />
          </Box>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 1.5, borderBottom: '1px solid #e0e0e0' }}>
          <Tab label={`Manuales (${manualTotal})`} />
          <Tab label={`Automatizados (${(plan.automatedTests || []).length})`} />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
        {/* Tab Manuales */}
        {tab === 0 && (
          <Box>
            {Object.keys(manualGrouped).length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Este plan no tiene casos manuales asignados.
              </Typography>
            ) : Object.entries(manualGrouped).map(([project, cats]) => (
              <Accordion key={project} defaultExpanded disableGutters elevation={0}
                sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderIcon sx={{ color: '#FF6B35', fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{project}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {Object.entries(cats as Record<string, any[]>).map(([cat, cases]) => {
                    const color = CAT_COLORS[cat] || '#777';
                    return (
                      <Box key={cat} sx={{ mb: 1.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <FolderIcon sx={{ fontSize: 12 }} />{cat}
                        </Typography>
                        {cases.map((tc: any) => {
                          const result = manualResults[tc.id] || tc.executionResult;
                          return (
                            <Box key={tc.id}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, pl: 2,
                                borderBottom: '1px solid #f5f5f5', flexWrap: 'wrap' }}>
                              <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }}>{tc.name}</Typography>
                              <ToggleButtonGroup exclusive size="small"
                                value={result || ''}
                                onChange={(_, v) => { if (v) setManualResults(r => ({ ...r, [tc.id]: v })); }}>
                                <ToggleButton value="passed"
                                  sx={{ fontSize: 11, py: 0.4, px: 1.2, '&.Mui-selected': { bgcolor: '#e8f5e9', color: '#4caf50', borderColor: '#4caf50' } }}>
                                  Pas?
                                </ToggleButton>
                                <ToggleButton value="failed"
                                  sx={{ fontSize: 11, py: 0.4, px: 1.2, '&.Mui-selected': { bgcolor: '#fdecea', color: '#e53935', borderColor: '#e53935' } }}>
                                  Fall?
                                </ToggleButton>
                                <ToggleButton value="blocked"
                                  sx={{ fontSize: 11, py: 0.4, px: 1.2, '&.Mui-selected': { bgcolor: '#fff3e0', color: '#ff9800', borderColor: '#ff9800' } }}>
                                  Bloq.
                                </ToggleButton>
                              </ToggleButtonGroup>
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Tab Automatizados */}
        {tab === 1 && (
          <Box>
            {(plan.automatedTests || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Este plan no tiene tests automatizados asignados.
              </Typography>
            ) : (
              <>
                <Button
                  variant="contained" startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                  onClick={handleRunAll} disabled={running}
                  sx={{ mb: 2, bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A2B' }, textTransform: 'none', fontWeight: 600 }}
                >
                  {running ? 'Ejecutando...' : 'Ejecutar todos'}
                </Button>

                {(plan.automatedTests || []).map((testId: string, idx: number) => {
                  const status = autoStatus[testId] === 'running' ? 'running' : getAutoStatus(testId);
                  const info = AUTOMATED_CHOICES.find(c => c.id === testId);
                  const name = info?.name || testId.replace('test_', '').replace('.py', '').replace(/_/g, ' ');
                  const resultInfo = status && RESULT_LABELS[status];

                  return (
                    <Box key={testId} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.25,
                      borderBottom: '1px solid #f5f5f5' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 24 }}>{idx + 1}.</Typography>
                      <PlayCircleOutlineIcon sx={{ color: '#FF6B35', fontSize: 20, flexShrink: 0 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                        <Typography variant="caption" color="text.secondary">{testId}</Typography>
                      </Box>
                      {status === 'running' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={14} sx={{ color: '#ff9800' }} />
                          <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>Ejecutando?</Typography>
                        </Box>
                      ) : resultInfo ? (
                        <Chip label={resultInfo.label} size="small"
                          sx={{ bgcolor: resultInfo.color + '20', color: resultInfo.color, fontWeight: 700, fontSize: 11 }} />
                      ) : (
                        <Chip label="Pendiente" size="small" sx={{ bgcolor: '#f5f5f5', color: '#999', fontSize: 11 }} />
                      )}
                    </Box>
                  );
                })}
              </>
            )}
          </Box>
        )}
      </DialogContent>

      {tab === 0 && (
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f0f0f0' }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>Cerrar</Button>
          <Button variant="contained" onClick={handleSaveManuals} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A2B' }, textTransform: 'none', fontWeight: 600 }}>
            Guardar resultados
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

// ??? TestPlanningCardList ??????????????????????????????????????????????????????

function TestPlanningCardList() {
  const { data, isLoading } = useListContext();
  const { data: allCases = [] } = useGetList('test_cases', { pagination: { page: 1, perPage: 1000 } });
  const { data: testResults = [], refetch } = useGetList('test_results');
  const [runPlan, setRunPlan] = useState<any>(null);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!data || data.length === 0) return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h5" color="text.secondary" gutterBottom>No hay planes de prueba</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Crea tu primer plan para empezar a organizar tu testing.</Typography>
      <CreateButton />
    </Box>
  );

  return (
    <>
      <Grid container direction="column" spacing={2.5}>
        {data.map((plan: any) => {
          const progress = getPlanProgress(plan, allCases as any[]);
          return (
            <Grid key={plan.id} sx={{ width: '100%', maxWidth: { xs: '100%', md: 760 } }}>
              <Card sx={{
                borderRadius: 3, border: '1px solid #e0e0e0',
                boxShadow: '0 2px 12px rgba(80,80,120,0.09)',
                transition: 'box-shadow 0.2s, transform 0.2s',
                '&:hover': { boxShadow: '0 6px 24px rgba(80,80,120,0.18)', transform: 'translateY(-2px)' },
              }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '1rem', sm: '1.1rem' }, wordBreak: 'break-word' }}>
                        {plan.name}
                      </Typography>
                      {plan.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, wordBreak: 'break-word' }}>
                          {plan.description}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={STATUS_LABELS[plan.status as keyof typeof STATUS_LABELS] || plan.status}
                      size="small"
                      sx={{ bgcolor: STATUS_COLORS[plan.status as keyof typeof STATUS_COLORS] || '#ccc', color: '#fff', fontWeight: 700, flexShrink: 0, fontSize: 11 }}
                    />
                  </Box>

                  {/* Fechas */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarIcon sx={{ color: '#FF6B35', fontSize: 15 }} />
                      <Typography variant="caption" color="text.secondary">
                        Inicio: <DateField source="startDate" record={plan} showTime={false} />
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarIcon sx={{ color: '#FF6B35', fontSize: 15 }} />
                      <Typography variant="caption" color="text.secondary">
                        Fin: <DateField source="endDate" record={plan} showTime={false} />
                      </Typography>
                    </Box>
                    {(plan.manualTestCases || []).length > 0 && (
                      <Chip label={`${(plan.manualTestCases || []).length} manuales`} size="small"
                        sx={{ height: 18, fontSize: 10, bgcolor: '#f5f5f5' }} />
                    )}
                    {(plan.automatedTests || []).length > 0 && (
                      <Chip label={`${(plan.automatedTests || []).length} automatizados`} size="small"
                        sx={{ height: 18, fontSize: 10, bgcolor: '#fff3e0', color: '#ff9800' }} />
                    )}
                  </Box>

                  {/* Barra de progreso */}
                  {progress && <ProgressBar progress={progress} />}

                  {/* Acciones */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, alignItems: 'center' }}>
                    <EditButton record={plan} label="Editar" sx={{ color: '#FF6B35', fontWeight: 600 }} />
                    <DeleteButton record={plan} label="Eliminar" sx={{ color: '#e53935', fontWeight: 600 }} />
                    <Tooltip title="Ejecutar y registrar resultados">
                      <Button
                        variant="contained" size="small"
                        startIcon={<PlayArrowIcon />}
                        sx={{ ml: { xs: 0, sm: 'auto' }, bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A2B' }, textTransform: 'none', fontWeight: 600 }}
                        onClick={() => setRunPlan(plan)}
                      >
                        Ejecutar plan
                      </Button>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {runPlan && (
        <RunPlanDialog
          plan={runPlan}
          allCases={allCases as any[]}
          testResults={testResults as any[]}
          onClose={() => setRunPlan(null)}
          onSaved={() => { refetch(); setRunPlan(null); }}
        />
      )}
    </>
  );
}

// ??? PlanWizard (Create / Edit) ???????????????????????????????????????????????

const WIZARD_STEPS = ['Informaci?n b?sica', 'Casos manuales', 'Tests automatizados'];

function PlanWizardContent({ mode }: { mode: 'create' | 'edit' }) {
  const record = useRecordContext();
  const { save, saving } = useSaveContext() as any;
  const redirect = useRedirect();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PlanFormData>({
    name: '', description: '', status: 'draft',
    startDate: '', endDate: '', manualTestCases: [], automatedTests: [],
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (record && !initialized) {
      setForm({
        name: record.name || '',
        description: record.description || '',
        status: record.status || 'draft',
        startDate: record.startDate || '',
        endDate: record.endDate || '',
        manualTestCases: record.manualTestCases || [],
        automatedTests: record.automatedTests || [],
      });
      setInitialized(true);
    }
  }, [record, initialized]);

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'El nombre es requerido';
    if (!form.status) e.status = 'El estado es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (step === 0 && !validate1()) return; setStep(s => s + 1); };
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = () => {
    if (step === 0 && !validate1()) return;
    save(form, { onSuccess: () => redirect('list', 'test_planning') });
  };

  const toggleAuto = (id: string) => {
    setForm(f => ({
      ...f,
      automatedTests: f.automatedTests.includes(id)
        ? f.automatedTests.filter(t => t !== id)
        : [...f.automatedTests, id],
    }));
  };

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pr: { xs: 2, sm: 3 }, pb: 5, pl: 0, maxWidth: 860 }}>
      {/* Header con back */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={() => redirect('list', 'test_planning')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {mode === 'create' ? 'Nuevo plan de pruebas' : `Editar: ${record?.name || ''}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === 'create' ? 'Completa los 3 pasos para crear el plan' : 'Modifica los campos que necesites'}
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {WIZARD_STEPS.map(label => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {/* ?? Paso 1: Info ?? */}
      {step === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 600 }}>
          <TextField
            label="Nombre del plan *" fullWidth value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={!!errors.name} helperText={errors.name}
          />
          <TextField
            label="Descripci?n" fullWidth multiline rows={3} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <FormControl fullWidth error={!!errors.status}>
            <InputLabel>Estado *</InputLabel>
            <Select value={form.status} label="Estado *" onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUS_CHOICES.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Fecha de inicio" type="date" fullWidth value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }} />
            <TextField label="Fecha de fin" type="date" fullWidth value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }} />
          </Box>
        </Box>
      )}

      {/* ?? Paso 2: Casos manuales ?? */}
      {step === 1 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Selecciona los casos manuales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Haz clic en un proyecto o categor?a para seleccionar todos sus casos a la vez.
          </Typography>
          <HierarchicalCaseSelector
            value={form.manualTestCases}
            onChange={ids => setForm(f => ({ ...f, manualTestCases: ids }))}
          />
        </Box>
      )}

      {/* ?? Paso 3: Tests automatizados ?? */}
      {step === 2 && (
        <Box sx={{ maxWidth: 600 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Tests automatizados</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecciona los scripts Playwright a incluir en la ejecuci?n del plan.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {form.automatedTests.length} / {AUTOMATED_CHOICES.length} seleccionados
            </Typography>
          </Box>
          {AUTOMATED_CHOICES.map(choice => {
            const selected = form.automatedTests.includes(choice.id);
            return (
              <Box key={choice.id}
                onClick={() => toggleAuto(choice.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1,
                  borderRadius: 2, border: '1px solid', cursor: 'pointer',
                  borderColor: selected ? '#FF6B35' : '#e0e0e0',
                  bgcolor: selected ? 'rgba(255,107,53,0.05)' : 'transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: 'rgba(255,107,53,0.04)', borderColor: '#FF6B35' },
                }}>
                <Checkbox checked={selected} size="small"
                  onClick={e => e.stopPropagation()} onChange={() => toggleAuto(choice.id)}
                  sx={{ '&.Mui-checked': { color: '#FF6B35' } }} />
                <PlayCircleOutlineIcon sx={{ color: selected ? '#FF6B35' : '#bbb', fontSize: 20 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{choice.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{choice.id}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Botones de navegaci?n */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
        <Button onClick={step === 0 ? () => redirect('list', 'test_planning') : handleBack}
          startIcon={step > 0 ? <ArrowBackIcon /> : undefined}
          sx={{ color: 'text.secondary', textTransform: 'none' }}>
          {step === 0 ? 'Cancelar' : 'Atr?s'}
        </Button>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {step === 1 && form.manualTestCases.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {form.manualTestCases.length} caso{form.manualTestCases.length !== 1 ? 's' : ''} seleccionado{form.manualTestCases.length !== 1 ? 's' : ''}
            </Typography>
          )}
          {step < WIZARD_STEPS.length - 1 ? (
            <Button variant="contained" onClick={handleNext} endIcon={<ChevronRightIcon />}
              sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A2B' }, textTransform: 'none', fontWeight: 600 }}>
              Siguiente
            </Button>
          ) : (
            <Button variant="contained" onClick={handleSubmit} disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A2B' }, textTransform: 'none', fontWeight: 600 }}>
              {mode === 'create' ? 'Crear plan' : 'Guardar cambios'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ??? Filtros de la lista ??????????????????????????????????????????????????????

const planFilters = [
  <TextInput label="Buscar por nombre" source="name" alwaysOn />,
  <SelectInput label="Estado" source="status" choices={STATUS_CHOICES} alwaysOn />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

// ??? Exports ??????????????????????????????????????????????????????????????????

export const TestPlanningPage = () => (
  <Box sx={{ pt: { xs: '12px', sm: '20px' }, pr: { xs: '12px', sm: '20px' }, pb: '20px', pl: 0 }}>
    <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif" }}>
      Planificaci?n de Pruebas
    </Typography>
    <List
      actions={<ListActions />}
      filters={planFilters}
      pagination={false}
      sx={{
        background: 'transparent', boxShadow: 'none', padding: 0,
        '& .RaList-content': { background: 'transparent', boxShadow: 'none', padding: 0 },
        '& .MuiPaper-root': { background: 'transparent', boxShadow: 'none', padding: 0 },
      }}
    >
      <TestPlanningCardList />
    </List>
  </Box>
);

export const TestPlanningCreate = (props: any) => (
  <Create {...props} title="Nuevo Plan de Pruebas" redirect="list">
    <PlanWizardContent mode="create" />
  </Create>
);

export const TestPlanningEdit = (props: any) => (
  <Edit {...props} title="Editar Plan de Pruebas" redirect="list">
    <PlanWizardContent mode="edit" />
  </Edit>
);
