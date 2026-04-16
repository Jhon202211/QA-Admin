import { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
  List, useListContext, EditButton, DeleteButton,
  TopToolbar, CreateButton, ExportButton, FilterButton,
  TextInput, SelectInput, DateField, useGetList,
  Create, Edit, useRecordContext, useSaveContext, useRedirect, useNotify,
  useUpdate, useRefresh,
} from 'react-admin';
import {
  Box, Typography, Card, CardContent, Chip, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tab, Tabs, Stepper, Step, StepLabel,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Checkbox, IconButton, CircularProgress,
  ToggleButtonGroup, ToggleButton, Accordion, AccordionSummary,
  AccordionDetails, LinearProgress, Tooltip, Stack,
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import { CalendarMonth as CalendarIcon, Archive as ArchiveIcon, Unarchive as UnarchiveIcon } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { dataProvider } from '../../firebase/dataProvider';
import { HierarchicalCaseSelector } from '../../components/TestPlanning/HierarchicalCaseSelector';

const SOCKET_URL = 'http://localhost:9000';

interface LogEntry {
  type: 'stdout' | 'stderr';
  data: string;
}

// Modal para mostrar logs en tiempo real (Sincronizado con AutomationRunnerPage)
const ExecutionLogsModal = ({ open, onClose, logs, testName, status }: { open: boolean, onClose: () => void, logs: LogEntry[], testName: string, status: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1e1e1e', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
        <TerminalIcon />
        Ejecución en vivo: {testName}
        {status === 'running' && <CircularProgress size={16} sx={{ ml: 2, color: '#fff' }} />}
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1e1e1e', p: 0 }}>
        <Box 
          ref={scrollRef}
          sx={{ 
            height: 400, 
            overflowY: 'auto', 
            p: 2, 
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            color: '#d4d4d4',
            whiteSpace: 'pre-wrap'
          }}
        >
          {logs.length === 0 ? (
            <Typography sx={{ color: '#666', fontStyle: 'italic' }}>Esperando salida del test...</Typography>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ color: log.type === 'stderr' ? '#f44336' : 'inherit', marginBottom: 2 }}>
                {log.data}
              </div>
            ))
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#1e1e1e', color: '#fff' }}>
        <Button onClick={onClose} sx={{ color: '#fff' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Estructura de Módulos (Sincronizada con AutomationRunnerPage) ---
const MODULES_STRUCTURE = [
  {
    name: 'Autenticación',
    tests: [
      'Login con usuario y contraseña',
      'Login con proveedor social (Socialite)',
      'Logout',
      'Recuperación de contraseña (forgot password)',
      'Bienvenida de usuario (establecer contraseña inicial)'
    ]
  },
  {
    name: 'ORGANIZACIÓN - Copropiedades',
    tests: [
      'Listar copropiedades',
      'Buscar copropiedades',
      'Crear copropiedades',
      'Editar copropiedades',
      'Eliminar copropiedades',
      'Configurar proveedores'
    ]
  },
  {
    name: 'ORGANIZACIÓN - Empresas',
    tests: [
      'Listar empresas',
      'Buscar empresas',
      'Crear empresas',
      'Editar empresas',
      'Eliminar empresas',
      'Exportar usuarios por empresa'
    ]
  },
  {
    name: 'Roles y permisos',
    tests: [
      'Listar roles',
      'Crear roles',
      'Editar roles',
      'Eliminar roles',
      'Listar permisos',
      'Cambiar estado on/off de un permiso',
      'Crear permisos',
      'Editar permisos',
      'Eliminar permisos'
    ]
  },
  {
    name: 'Actividades',
    tests: [
      'Listar actividades',
      'Filtrar actividades',
      'Exportar actividades'
    ]
  },
  {
    name: 'CONTROL DE ACCESO - Resumen',
    tests: [
      'Ver resumenes',
      'Filtrar resumenes'
    ]
  },
  {
    name: 'CONTROL DE ACCESO - Usuarios',
    tests: [
      'Listar usuarios',
      'Crear usuarios',
      'Ver información de usuarios',
      'Editar usuarios',
      'Ver vehículos de usuarios',
      'Desactivar empresa',
      'Restaurar empresa',
      'Desactivar copropiedad',
      'Restaurar copropiedad',
      'Eliminar permanentemente usuarios',
      'Desactivar usuarios masivamente',
      'Importar usuarios desde Directorio Activo',
      'Importar usuarios desde Excel',
      'Exportar usuarios'
    ]
  },
  {
    name: 'CONTROL DE ACCESO - Visitantes',
    tests: [
      'Ver visitantes en modo enfoque',
      'Listar visitantes',
      'Ver detalle de visitantes',
      'Filtrar visitantes',
      'Importar visitantes',
      'Crear visitante',
      'Editar visitante',
      'Eliminar visitante',
      'Crear autorización para un visitante (Pre-registro. Anunciar. Autorizar)',
      'Editar autorización para un visitante',
      'Denegar autorización para un visitante',
      'Anunciar autorizaciones'
    ]
  },
  {
    name: 'CONTROL DE ACCESO - Vehículos',
    tests: [
      'Listar vehículos',
      'Filtrar vehículos',
      'Crear vehículos',
      'Editar vehículos',
      'Eliminar vehículos'
    ]
  },
  {
    name: 'CONTROL DE ACCESO - Historial de accesos',
    tests: [
      'Listar historial de accesos',
      'Filtrar historial de accesos',
      'Exportar historial de accesos',
      'Crear comentarios en historial de accesos'
    ]
  },
  {
    name: 'CONTROL DE ACCESO - Lista restrictiva',
    tests: [
      'Listar lista restrictiva',
      'Agregar registro en lista restrictiva',
      'Editar registro en lista restrictiva',
      'Eliminar registro en lista restrictiva'
    ]
  },
  {
    name: 'ESPACIOS DE TRABAJO - Resumen',
    tests: [
      'Ver resumenes',
      'Filtrar resumenes'
    ]
  },
  {
    name: 'ESPACIOS DE TRABAJO - Áreas de trabajo',
    tests: [
      'Listar áreas de trabajo',
      'Crear áreas de trabajo',
      'Ver mapa de un área de trabajo',
      'Reservar puestos',
      'Editar áreas de trabajo',
      'Eliminar áreas de trabajo'
    ]
  },
  {
    name: 'ESPACIOS DE TRABAJO - Reservaciones',
    tests: [
      'Listar reservaciones',
      'Filtrar reservaciones',
      'Exportar reservaciones',
      'Importar reservaciones',
      'Ver detalle de una reserva',
      'Ver accesos',
      'Volver a reservar'
    ]
  },
  {
    name: 'SALAS - Resumen',
    tests: [
      'Ver resumenes',
      'Filtrar resumenes'
    ]
  },
  {
    name: 'SALAS - Lista de salas',
    tests: [
      'Listar salas',
      'Filtra salas',
      'Reserva sala',
      'Ver reservas'
    ]
  },
  {
    name: 'SALAS - Disponibilidad de salas',
    tests: [
      'Ver disponibilidad de salas',
      'Configurar pantalla completa',
      'Filtrar salas'
    ]
  },
  {
    name: 'LOCKERS',
    tests: [
      'Listar lockers',
      'Bloquear lockers',
      'Desbloquear lockers',
      'Filtrar lockers'
    ]
  },
  {
    name: 'AFOROS',
    tests: [
      'Listar zonas con aforo',
      'Filtrar zonas con aforo',
      'Ver aforo por empresas'
    ]
  },
  {
    name: 'COMUNICACIÓN - Formularios de salubridad',
    tests: [
      'Listar respuestas de formularios',
      'Filtrar respuestas de formularios',
      'Exportar respuestas de formularios'
    ]
  },
  {
    name: 'COMUNICACIÓN - Formularios de reservas',
    tests: [
      'Listar usuarios que respondieron un form de reserva',
      'Filtrar usuarios que respondieron un form de reserva',
      'Exportar usuarios que respondieron un form de reserva',
      'Ver respuestas de un form de reserva de un usuario',
      'Añadir observaciones a respuestas',
      'Eliminar respuestas'
    ]
  },
  {
    name: 'PERFIL DEL USUARIO',
    tests: [
      'Ver perfil de usuario',
      'Actualizar avatar',
      'Actualizar datos',
      'Cambiar contraseña'
    ]
  }
];

// ??? Constantes ???????????????????????????????????????????????????????????????

const STATUS_CHOICES = [
  { id: 'draft', name: 'Borrador' },
  { id: 'active', name: 'Activo' },
  { id: 'in_progress', name: 'En Progreso' },
  { id: 'completed', name: 'Completado' },
  { id: 'cancelled', name: 'Cancelado' },
  { id: 'archived', name: 'Archivado' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: '#9e9e9e', active: '#2196f3', in_progress: '#ff9800',
  completed: '#4caf50', cancelled: '#f44336', archived: '#607d8b',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', active: 'Activo', in_progress: 'En Progreso',
  completed: 'Completado', cancelled: 'Cancelado', archived: 'Archivado',
};

const CAT_COLORS: Record<string, string> = {
  Smoke: '#FF6B35', Funcionales: '#3CCF91', 'No Funcionales': '#2196F3',
  'Regresión': '#FF9800', UAT: '#9C27B0',
};

const RESULT_LABELS: Record<string, { label: string; color: string }> = {
  passed: { label: 'Pasó', color: '#4caf50' },
  failed: { label: 'Falló', color: '#e53935' },
  blocked: { label: 'Bloqueado', color: '#ff9800' },
  retest: { label: 'Retest', color: '#9c27b0' },
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
  const retest = cases.filter(tc => tc.executionResult === 'retest').length;
  const pending = ids.length - passed - failed - blocked - retest;
  const pct = Math.round(((passed + failed + blocked + retest) / ids.length) * 100);
  return { total: ids.length, passed, failed, blocked, retest, pending, pct };
};

const groupCasesByHierarchy = (caseIds: string[], allCases: any[]) => {
  const g: Record<string, Record<string, any[]>> = {};
  for (const id of caseIds) {
    const tc = allCases.find((t: any) => t.id === id);
    if (!tc) continue;
    const p = tc.testProject || 'Sin proyecto';
    const c = tc.category || 'Sin categoría';
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
      {progress.retest > 0 && <Box sx={{ flex: progress.retest, bgcolor: '#9c27b0', transition: 'flex 0.3s' }} />}
      {progress.pending > 0 && <Box sx={{ flex: progress.pending, bgcolor: '#e0e0e0' }} />}
    </Box>
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>✓ {progress.passed} pasaron</Typography>
      <Typography variant="caption" sx={{ color: '#e53935', fontWeight: 600 }}>✗ {progress.failed} fallaron</Typography>
      {progress.blocked > 0 && <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>⚠ {progress.blocked} bloqueados</Typography>}
      {progress.retest > 0 && <Typography variant="caption" sx={{ color: '#9c27b0', fontWeight: 600 }}>⟳ {progress.retest} retest</Typography>}
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>○ {progress.pending} pendientes</Typography>
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
  const notify = useNotify();

  // Estados para logs en vivo
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [activeTestName, setActiveTestName] = useState('');
  const [activeStatus, setActiveStatus] = useState<'idle' | 'running'>('idle');

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('test-log', (newLog: LogEntry) => {
      setLogs((prev) => [...prev, newLog]);
    });

    socket.on('test-finished', async (data) => {
      setActiveStatus('idle');
      notify(`Test finalizado: ${data.status === 'passed' ? 'Éxito' : 'Fallo'}`, { 
        type: data.status === 'passed' ? 'success' : 'error' 
      });
      
      // Actualizar el estado local para reflejar que terminó
      if (data.test_file) {
        // Intentar encontrar el testId por el archivo o nombre
        const testId = Object.keys(autoStatus).find(id => {
          const testRecord = automationTests.find((t: any) => t.id === id);
          return id.includes(data.test_file) || data.test_file.includes(id) || 
                 (testRecord && (testRecord.test_file === data.test_file || testRecord.name === data.name));
        });
        
        if (testId) {
          setAutoStatus(prev => {
            const newState = { ...prev };
            newState[testId] = data.status;
            return newState;
          });
        }
      }

      // Limpiar el estado de "running" global si todos terminaron (para handleRunAll)
      setRunning(false);

      // Forzar un refetch de los resultados para que getAutoStatus obtenga el último
      setTimeout(() => {
        onSaved(); // Esto dispara el refetch en el padre
      }, 1000);
    });

    return () => {
      socket.disconnect();
    };
  }, [notify, autoStatus]);

  const manualGrouped = groupCasesByHierarchy(plan.manualTestCases || [], allCases);

  const { data: automationTests = [] } = useGetList('automation', {
    pagination: { page: 1, perPage: 1000 },
  });

  const getAutoStatus = (testId: string) => {
    const testRecord = automationTests.find((t: any) => t.id === testId);
    if (!testRecord) return null;
    
    const baseName = testId.replace('.py', '').replace('.spec.ts', '');
    const aliases = [baseName, testRecord.name];
    
    let results = testResults.filter((r: any) => {
      const rName = (r.name || '').replace('.py', '').replace('.spec.ts', '');
      return r.planId === plan.id && (aliases.includes(rName) || r.name === testRecord.name);
    });

    if (results.length === 0) {
      results = testResults.filter((r: any) => {
        const rName = (r.name || '').replace('.py', '').replace('.spec.ts', '');
        return aliases.includes(rName) || r.name === testRecord.name;
      });
    }
    if (results.length === 0) return null;
    return results.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].status;
  };

  const handleRunTest = async (testId: string) => {
    const testRecord = automationTests.find((t: any) => t.id === testId);
    if (!testRecord) return;

    setActiveTestName(testRecord.name);
    setLogs([]);
    setShowLogs(true);
    setActiveStatus('running');
    setAutoStatus(s => ({ ...s, [testId]: 'running' }));

    try {
      const res = await fetch('http://localhost:9000/api/tests/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid_token' },
        body: JSON.stringify({ 
          test_file: testRecord.test_file || testId, 
          planId: plan.id, 
          caseId: testId 
        }),
      });
      const data = await res.json();
      if (data.status !== 'started') {
        notify(data.message || 'Error al iniciar el test', { type: 'error' });
        setAutoStatus(s => ({ ...s, [testId]: 'failed' }));
        setActiveStatus('idle');
      }
    } catch (error) {
      notify('Error de conexión con el servidor', { type: 'error' });
      setAutoStatus(s => ({ ...s, [testId]: 'failed' }));
      setActiveStatus('idle');
    }
  };

  const handleRunAll = async () => {
    setRunning(true);
    for (const testId of plan.automatedTests || []) {
      const testRecord = automationTests.find((t: any) => t.id === testId);
      if (!testRecord) continue;

      setAutoStatus(s => ({ ...s, [testId]: 'running' }));
      try {
        const res = await fetch('http://localhost:9000/api/tests/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid_token' },
          body: JSON.stringify({ 
            test_file: testRecord.test_file || testId, 
            planId: plan.id, 
            caseId: testId 
          }),
        });
        const data = await res.json();
        // En ejecución masiva no abrimos el modal automáticamente para cada uno,
        // pero el socket actualizará los estados.
      } catch { 
        setAutoStatus(s => ({ ...s, [testId]: 'error' })); 
      }
      // Pequeña espera entre ejecuciones para no saturar
      await new Promise(resolve => setTimeout(resolve, 1000));
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
                                  Pasó
                                </ToggleButton>
                                <ToggleButton value="failed"
                                  sx={{ fontSize: 11, py: 0.4, px: 1.2, '&.Mui-selected': { bgcolor: '#fdecea', color: '#e53935', borderColor: '#e53935' } }}>
                                  Falló
                                </ToggleButton>
                                <ToggleButton value="blocked"
                                  sx={{ fontSize: 11, py: 0.4, px: 1.2, '&.Mui-selected': { bgcolor: '#fff3e0', color: '#ff9800', borderColor: '#ff9800' } }}>
                                  Bloq.
                                </ToggleButton>
                                <ToggleButton value="retest"
                                  sx={{ fontSize: 11, py: 0.4, px: 1.2, '&.Mui-selected': { bgcolor: '#f3e5f5', color: '#9c27b0', borderColor: '#9c27b0' } }}>
                                  Retest
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
                  const testRecord = automationTests.find((t: any) => t.id === testId);
                  const name = testRecord?.name || testId.replace('test_', '').replace('.py', '').replace('.spec.ts', '').replace(/_/g, ' ');
                  const resultInfo = status && RESULT_LABELS[status];

                  return (
                    <Box key={testId} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.25,
                      borderBottom: '1px solid #f5f5f5' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 24 }}>{idx + 1}.</Typography>
                      
                      <Tooltip title="Ver logs en vivo">
                        <IconButton 
                          size="small" 
                          onClick={() => handleRunTest(testId)}
                          disabled={status === 'running'}
                          sx={{ color: '#FF6B35' }}
                        >
                          {status === 'running' ? (
                            <CircularProgress size={20} sx={{ color: '#ff9800' }} />
                          ) : (
                            <PlayCircleOutlineIcon />
                          )}
                        </IconButton>
                      </Tooltip>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
                        <Typography variant="caption" color="text.secondary">{testRecord?.test_file || testId}</Typography>
                      </Box>
                      {status === 'running' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>Ejecutando...</Typography>
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

      <ExecutionLogsModal 
        open={showLogs} 
        onClose={() => setShowLogs(false)} 
        logs={logs} 
        testName={activeTestName}
        status={activeStatus}
      />

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

function TestPlanningCardList({ showArchived = false }: { showArchived?: boolean }) {
  const { data, isLoading } = useListContext();
  const { data: allCases = [] } = useGetList('test_cases', { pagination: { page: 1, perPage: 1000 } });
  const { data: testResults = [], refetch } = useGetList('test_results');
  const [runPlan, setRunPlan] = useState<any>(null);
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  
  const filteredData = data?.filter((plan: any) => 
    showArchived ? plan.status === 'archived' : plan.status !== 'archived'
  );

  if (!filteredData || filteredData.length === 0) return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        {showArchived ? 'No hay planes archivados' : 'No hay planes de prueba'}
      </Typography>
      {!showArchived && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Crea tu primer plan para empezar a organizar tu testing.</Typography>
          <CreateButton />
        </>
      )}
    </Box>
  );

  const handleToggleArchive = async (plan: any) => {
    const newStatus = plan.status === 'archived' ? 'active' : 'archived';
    try {
      await update('test_planning', {
        id: plan.id,
        data: { ...plan, status: newStatus },
        previousData: plan
      });
      notify(newStatus === 'archived' ? 'Plan archivado' : 'Plan restaurado', { type: 'success' });
      refresh();
    } catch (error) {
      notify('Error al actualizar el plan', { type: 'error' });
    }
  };

  return (
    <>
      <Grid container direction="column" spacing={2.5}>
        {filteredData.map((plan: any) => {
          const progress = getPlanProgress(plan, allCases as any[]);
          return (
            <Grid key={plan.id} sx={{ width: '100%', maxWidth: { xs: '100%', md: 760 } }}>
              <Card sx={{
                borderRadius: 3, border: '1px solid #e0e0e0',
                boxShadow: '0 2px 12px rgba(80,80,120,0.09)',
                transition: 'box-shadow 0.2s, transform 0.2s',
                '&:hover': { boxShadow: '0 6px 24px rgba(80,80,120,0.18)', transform: 'translateY(-2px)' },
                opacity: plan.status === 'archived' ? 0.8 : 1
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
                    
                    <Button
                      size="small"
                      startIcon={plan.status === 'archived' ? <UnarchiveIcon /> : <ArchiveIcon />}
                      onClick={() => handleToggleArchive(plan)}
                      sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'none' }}
                    >
                      {plan.status === 'archived' ? 'Restaurar' : 'Archivar'}
                    </Button>

                    {plan.status !== 'archived' && (
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
                    )}
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

const WIZARD_STEPS = ['Información básica', 'Casos manuales', 'Tests automatizados'];

function PlanWizardContent({ mode }: { mode: 'create' | 'edit' }) {
  const record = useRecordContext();
  const { save, saving: raSaving } = useSaveContext() as any;
  const redirect = useRedirect();
  const notify = useNotify();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [form, setForm] = useState<PlanFormData>({
    name: '', description: '', status: 'draft',
    startDate: '', endDate: '', manualTestCases: [], automatedTests: [],
  });
  const [initialized, setInitialized] = useState(false);

  const saving = mode === 'edit' ? editSaving : raSaving;

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

  const handleSubmit = async () => {
    if (step === 0 && !validate1()) return;

    if (mode === 'edit') {
      if (!record?.id) return;
      setEditSaving(true);
      try {
        await dataProvider.update('test_planning', {
          id: record.id,
          data: form,
          previousData: record,
        });
        notify('Plan guardado correctamente', { type: 'success' });
        redirect('list', 'test_planning');
      } catch (error: any) {
        notify(`Error al guardar: ${error?.message || 'Error desconocido'}`, { type: 'error' });
        console.error('[TestPlanning] Error al actualizar plan:', error);
      } finally {
        setEditSaving(false);
      }
    } else {
      save(form, { onSuccess: () => redirect('list', 'test_planning') });
    }
  };

  const toggleAuto = (id: string) => {
    setForm(f => ({
      ...f,
      automatedTests: f.automatedTests.includes(id)
        ? f.automatedTests.filter(t => t !== id)
        : [...f.automatedTests, id],
    }));
  };

  // Lógica de agrupación para tests automatizados
  const { data: automationTests = [], isLoading: loadingAutomation } = useGetList('automation', {
    pagination: { page: 1, perPage: 1000 },
  });

  const groupedAutomationData = useMemo(() => {
    if (!automationTests) return [];

    const assignedIds = new Set();
    const modules = MODULES_STRUCTURE.map(module => {
      const moduleTests: any[] = [];
      
      // 1. Tests con módulo asignado explícitamente
      const explicitTestsInModule = automationTests.filter(t => !assignedIds.has(t.id) && t.module === module.name);
      explicitTestsInModule.forEach(t => {
        assignedIds.add(t.id);
        moduleTests.push(t);
      });

      // 2. Tests que coinciden por nombre (retrocompatibilidad)
      module.tests.forEach(testName => {
        const normalize = (str: string) => str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const alreadyAssigned = moduleTests.find((t: any) => normalize(t.name) === normalize(testName));
        if (alreadyAssigned) return;

        const existingTest = automationTests.find(t => {
          if (assignedIds.has(t.id)) return false;
          if (t.module && t.module !== 'Otros / Sin Clasificar') return false;
          
          const n1 = normalize(t.name);
          const n2 = normalize(testName);
          return n1 === n2 || (n1.length > 5 && n2.length > 5 && (n1.includes(n2) || n2.includes(n1)));
        });

        if (existingTest) {
          assignedIds.add(existingTest.id);
          moduleTests.push(existingTest);
        }
      });

      return {
        ...module,
        testsData: moduleTests,
      };
    }).filter(m => m.testsData.length > 0);

    // Tests sin clasificar
    const unassignedTests = automationTests.filter(t => !assignedIds.has(t.id));
    if (unassignedTests.length > 0) {
      modules.push({
        name: 'Otros / Sin Clasificar',
        tests: [],
        testsData: unassignedTests,
      });
    }

    return modules;
  }, [automationTests]);

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
            label="Descripción" fullWidth multiline rows={3} value={form.description}
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
            Haz clic en un proyecto o categoría para seleccionar todos sus casos a la vez.
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
            Selecciona los scripts Playwright a incluir en la ejecución del plan.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {form.automatedTests.length} / {automationTests.length} seleccionados
            </Typography>
          </Box>
          
          {loadingAutomation ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : (
            groupedAutomationData.map((module, mIdx) => (
              <Accordion key={mIdx} disableGutters elevation={0} sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FolderIcon sx={{ color: '#FF6B35', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{module.name}</Typography>
                    <Chip size="small" label={module.testsData.length} sx={{ height: 20, fontSize: 10 }} />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {module.testsData.map((test: any) => {
                    const selected = form.automatedTests.includes(test.id);
                    return (
                      <Box key={test.id}
                        onClick={() => toggleAuto(test.id)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, p: 1, mb: 0.5,
                          borderRadius: 2, border: '1px solid', cursor: 'pointer',
                          borderColor: selected ? '#FF6B35' : 'transparent',
                          bgcolor: selected ? 'rgba(255,107,53,0.05)' : 'transparent',
                          transition: 'all 0.15s',
                          '&:hover': { bgcolor: 'rgba(255,107,53,0.04)', borderColor: '#FF6B35' },
                        }}>
                        <Checkbox checked={selected} size="small"
                          onClick={e => e.stopPropagation()} onChange={() => toggleAuto(test.id)}
                          sx={{ '&.Mui-checked': { color: '#FF6B35' } }} />
                        <PlayCircleOutlineIcon sx={{ color: selected ? '#FF6B35' : '#bbb', fontSize: 18 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{test.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{test.test_file}</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>
      )}

      {/* Botones de navegación */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
        <Button onClick={step === 0 ? () => redirect('list', 'test_planning') : handleBack}
          startIcon={step > 0 ? <ArrowBackIcon /> : undefined}
          sx={{ color: 'text.secondary', textTransform: 'none' }}>
          {step === 0 ? 'Cancelar' : 'Atrás'}
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

export const TestPlanningPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ pt: { xs: '12px', sm: '20px' }, pr: { xs: '12px', sm: '20px' }, pb: '20px', pl: 0 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif" }}>
        Planificación de Pruebas
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Planes Activos" />
          <Tab label="Archivados" />
        </Tabs>
      </Box>

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
        <TestPlanningCardList showArchived={tab === 1} />
      </List>
    </Box>
  );
};

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
