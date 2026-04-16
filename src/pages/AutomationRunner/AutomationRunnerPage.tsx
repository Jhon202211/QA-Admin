import { useState, useEffect, useRef } from 'react';
import {
  List,
  Datagrid,
  TextField,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterButton,
  EditButton,
  DeleteButton,
  TextInput,
  SelectInput,
  FunctionField,
  useNotify,
  SimpleForm,
  Create,
  Edit,
  useDataProvider,
  useUpdate,
  useRefresh,
} from 'react-admin';
import { 
  Box, 
  Typography, 
  IconButton, 
  Chip, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Tooltip,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HistoryIcon from '@mui/icons-material/History';
import TimerIcon from '@mui/icons-material/Timer';
import TerminalIcon from '@mui/icons-material/Terminal';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { seedAutomationCases } from '../../firebase/seedData';
import { io } from 'socket.io-client';
import { cleanAndSeedAutomation } from '../../firebase/fixAutomationData';
import { TestResultsList } from '../TestResults/TestResultsPage';

const API_BASE_URL = 'http://localhost:9000/api/tests';
const SOCKET_URL = 'http://localhost:9000';
const API_TOKEN = 'valid_token';

interface LogEntry {
  type: 'stdout' | 'stderr';
  data: string;
}

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

// Modal para mostrar logs en tiempo real
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

// Componente para el botón de ejecutar
const RunButton = ({ record, onShowLogs }: { record: any, onShowLogs: (id: string, name: string) => void }) => {
  const [running, setRunning] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [showServerModal, setShowServerModal] = useState(false);
  const notify = useNotify();
  const [update] = useUpdate();

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!record?.test_file) {
      notify('Error: El caso no tiene un archivo de test definido', { type: 'error' });
      return;
    }

    setRunning(true);
    onShowLogs(record.id, record.name);
    
    try {
      await update('automation', {
        id: record.id,
        data: { last_status: 'running' },
        previousData: record,
      });
    } catch (e) {
      console.error('Error updating status to running:', e);
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        },
        body: JSON.stringify({
          test_file: record.test_file,
          executionType: 'individual'
        })
      });

      if (!response.ok) {
        let errorMessage = `Error del servidor (${response.status})`;
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        notify(errorMessage, { type: 'error' });
        
        await update('automation', {
          id: record.id,
          data: { last_status: 'failed' },
          previousData: record,
        });
        return;
      }

      const data = await response.json();

      if (data.status === 'started') {
        setSnackbar({ open: true, message: 'Ejecución iniciada correctamente', severity: 'success' });
      } else {
        const errorMsg = data.message || 'Error al iniciar la ejecución';
        setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        notify(errorMsg, { type: 'error' });
        
        await update('automation', {
          id: record.id,
          data: { last_status: 'failed' },
          previousData: record,
        });
      }
    } catch (error: any) {
      console.error('Error en handleRun:', error);
      
      // Detectar si es un error de conexión (servidor apagado)
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        setShowServerModal(true);
      } else {
        const errorMessage = error.message || 'Error de conexión.';
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        notify(errorMessage, { type: 'error' });
      }
      
      await update('automation', {
        id: record.id,
        data: { last_status: 'failed' },
        previousData: record,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      {running || record.last_status === 'running' ? (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onShowLogs(record.id, record.name); }}>
          <CircularProgress size={20} />
        </IconButton>
      ) : (
        <Tooltip title="Ejecutar test">
          <IconButton edge="end" color="primary" onClick={handleRun}>
            <PlayArrowIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* Modal de sugerencia de servidor */}
      <Dialog open={showServerModal} onClose={() => setShowServerModal(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Servidor de Automatización Apagado
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            No se pudo establecer conexión con el servidor de automatización en <strong>localhost:9000</strong>.
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, position: 'relative' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              Para ejecutar tests automáticos, debes iniciar el servidor local ejecutando:
              <Box component="code" sx={{ display: 'block', mt: 1, fontWeight: 'bold', color: '#d32f2f' }}>
                npm run automation:server
              </Box>
            </Typography>
            <Tooltip title="Copiar comando">
              <IconButton 
                size="small" 
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => {
                  navigator.clipboard.writeText('npm run automation:server');
                  notify('Comando copiado al portapapeles', { type: 'info' });
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowServerModal(false)}>Cerrar</Button>
          <Button 
            variant="contained" 
            startIcon={<SettingsRemoteIcon />}
            sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A2B' } }}
            onClick={() => {
              setShowServerModal(false);
              notify('Por favor, ejecuta "npm run automation:server" en tu terminal.', { type: 'info' });
            }}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

const StatusChip = ({ status }: { status: string }) => {
  let config = { label: 'No ejecutado', color: '#bdbdbd', icon: <HistoryIcon sx={{ fontSize: 16 }} /> };
  
  if (status === 'passed') config = { label: 'Pasó', color: '#4caf50', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> };
  if (status === 'failed') config = { label: 'Falló', color: '#f44336', icon: <ErrorIcon sx={{ fontSize: 16 }} /> };
  if (status === 'running') config = { label: 'Ejecutando', color: '#2196f3', icon: <CircularProgress size={14} color="inherit" /> };

  return (
    <Chip 
      label={config.label}
      size="small"
      icon={config.icon}
      sx={{ 
        backgroundColor: config.color, 
        color: '#fff', 
        fontWeight: 600,
        '& .MuiChip-icon': { color: 'inherit' }
      }} 
    />
  );
};

const useTestFiles = () => {
  const [files, setFiles] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/files`);
        if (response.ok) {
          const data = await response.json();
          setFiles(data);
        }
      } catch (error) {
        console.error('Error fetching test files:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  return { files, loading };
};

const automationFilters = [
  <TextInput label="Buscar por nombre" source="name" alwaysOn />,
  <TextInput label="Buscar por archivo" source="test_file" />,
  <SelectInput label="Estado" source="status" choices={[
    { id: 'active', name: 'Activo' },
    { id: 'inactive', name: 'Inactivo' }
  ]} />,
];

const Empty = () => (
  <Box sx={{ minHeight: '100vh', boxSizing: 'border-box', padding: '32px 32px 0 0', margin: 0, textAlign: 'center' }}>
    <Typography variant="h5" paragraph>
      No hay casos automatizados
    </Typography>
    <Typography variant="body1">
      Crea tu primer caso automatizado para empezar.
    </Typography>
    <CreateButton />
  </Box>
);

const ListActions = ({ files }: { files: any[] }) => {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);

  const handleFixData = async () => {
    if (window.confirm(`¿Estás seguro? Se detectaron ${files.length} archivos locales. Esto sincronizará la base de datos exactamente con lo que tienes en tu carpeta de tests.`)) {
      setLoading(true);
      const fileNames = files.map(f => f.id);
      const success = await cleanAndSeedAutomation(fileNames);
      setLoading(false);
      if (success) {
        notify('Sincronización completada con éxito', { type: 'success' });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        notify('Error al sincronizar datos', { type: 'error' });
      }
    }
  };

  return (
    <TopToolbar>
      <FilterButton />
      <CreateButton />
      <Button 
        size="small" 
        onClick={handleFixData} 
        disabled={loading}
        startIcon={loading ? <CircularProgress size={16} /> : <HistoryIcon />}
        sx={{ ml: 1, color: '#FF6B35' }}
      >
        Limpiar y Recargar Tests
      </Button>
      <ExportButton />
    </TopToolbar>
  );
};

export const AutomationRunnerPage = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [update] = useUpdate();
  const refresh = useRefresh();
  const [initialized, setInitialized] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const { files } = useTestFiles();
  
  // Estados para logs en vivo
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [activeTest, setActiveTest] = useState<{ id: string, name: string } | null>(null);
  const [activeStatus, setActiveStatus] = useState<'idle' | 'running'>('idle');

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('test-log', (newLog) => {
      setLogs((prev) => [...prev, newLog]);
    });

    socket.on('test-finished', async (data) => {
      setActiveStatus('idle');
      notify(`Test finalizado: ${data.status === 'passed' ? 'Éxito' : 'Fallo'}`, { type: data.status === 'passed' ? 'success' : 'error' });
      
      // Refrescar la lista completa para asegurar que el estado se actualice
      refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [activeTest, update, notify]);

  const handleShowLogs = (id: string, name: string) => {
    setActiveTest({ id, name });
    setLogs([]);
    setShowLogs(true);
    setActiveStatus('running');
  };

  useEffect(() => {
    const initializeDefaultCases = async () => {
      if (initialized) return;
      try {
        const { data } = await dataProvider.getList('automation', {
          pagination: { page: 1, perPage: 1 },
        });
        if (data.length === 0) {
          await seedAutomationCases();
        }
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing automation cases:', error);
        setInitialized(true);
      }
    };
    initializeDefaultCases();
  }, [dataProvider, initialized]);

  return (
    <Box sx={{ pt: { xs: '12px', sm: '20px' }, pr: { xs: '12px', sm: '20px' }, pb: { xs: '12px', sm: '20px' } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif" }}>
          Automatización
        </Typography>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab icon={<PlayCircleIcon />} iconPosition="start" label="Tests" />
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="Vista de Resultados" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <List
          actions={<ListActions files={files} />}
          empty={<Empty />}
          filters={automationFilters}
          sort={{ field: 'last_status', order: 'DESC' }}
        >
          <Datagrid 
            rowClick={(id, _resource, record) => {
              handleShowLogs(id.toString(), record.name);
              return false;
            }}
            sx={{
              '& .MuiTableCell-head': { backgroundColor: '#f5f5f5', fontWeight: 700 },
              '& .MuiTableRow-root:hover': { backgroundColor: '#f9f9f9' }
            }}
          >
            <TextField source="name" label="Nombre" />
            
            <FunctionField 
              label="Archivo de Test" 
              render={record => (
                <code style={{ backgroundColor: '#eee', padding: '2px 4px', borderRadius: '4px' }}>
                  {(record.test_file || '').replace('.py', '.spec.ts')}
                </code>
              )} 
            />

            <FunctionField
              label="Último Resultado"
              render={record => <StatusChip status={record.last_status} />}
            />

            <FunctionField
              label="Duración"
              render={record => record.last_duration ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TimerIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{record.last_duration}s</Typography>
                </Stack>
              ) : '-'}
            />

            <FunctionField
              label="Config"
              render={record => (
                <Chip 
                  label={record.status === 'active' ? 'Activo' : 'Inactivo'} 
                  variant="outlined"
                  size="small"
                  color={record.status === 'active' ? 'success' : 'default'}
                />
              )}
            />

            <FunctionField
              label="Ejecutar"
              render={record => <RunButton record={record} onShowLogs={handleShowLogs} />}
            />
            <Box sx={{ display: 'flex' }}>
              <EditButton label="" />
              <DeleteButton label="" />
            </Box>
          </Datagrid>
        </List>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mt: -3 }}>
          <TestResultsList hideTitle />
        </Box>
      </TabPanel>

      <ExecutionLogsModal 
        open={showLogs} 
        onClose={() => setShowLogs(false)} 
        logs={logs} 
        testName={activeTest?.name || ''}
        status={activeStatus}
      />
    </Box>
  );
};

export const AutomationCaseCreate = (props: any) => {
  const { files, loading } = useTestFiles();

  return (
    <Box sx={{ pt: '20px', pr: '20px', pb: '20px', pl: 0 }}>
      <Typography variant="h4" gutterBottom>
        Nuevo Caso Automatizado
      </Typography>
      <Paper sx={{ p: 3, mt: 3 }}>
        <Create {...props} title="Nuevo Caso Automatizado" redirect="list">
          <SimpleForm defaultValues={{ status: 'active' }}>
            <TextInput source="name" label="Nombre" fullWidth required />
            <TextInput source="description" label="Descripción" multiline fullWidth />
            
            {loading ? (
              <CircularProgress size={20} sx={{ m: 2 }} />
            ) : (
              <SelectInput 
                source="test_file" 
                label="Archivo de Test (Playwright)" 
                choices={files}
                fullWidth 
                required
                helperText="Selecciona uno de los archivos .spec.ts detectados en tu carpeta local"
              />
            )}

            <TextInput 
              source="prompts" 
              label="Configuración / Parámetros" 
              multiline 
              fullWidth 
              rows={4}
              helperText="Parámetros en formato texto o JSON para el test."
            />
            <SelectInput source="status" label="Estado" choices={[
              { id: 'active', name: 'Activo' },
              { id: 'inactive', name: 'Inactivo' }
            ]} required />
          </SimpleForm>
        </Create>
      </Paper>
    </Box>
  );
};

export const AutomationCaseEdit = (props: any) => {
  const { files, loading } = useTestFiles();

  return (
    <Box sx={{ pt: '20px', pr: '20px', pb: '20px', pl: 0 }}>
      <Typography variant="h4" gutterBottom>
        Editar Caso Automatizado
      </Typography>
      <Paper sx={{ p: 3, mt: 3 }}>
        <Edit {...props} title="Editar Caso Automatizado">
          <SimpleForm>
            <TextInput source="name" label="Nombre" fullWidth required />
            <TextInput source="description" label="Descripción" multiline fullWidth />
            
            {loading ? (
              <CircularProgress size={20} sx={{ m: 2 }} />
            ) : (
              <SelectInput 
                source="test_file" 
                label="Archivo de Test (Playwright)" 
                choices={files}
                fullWidth 
                required
              />
            )}

            <TextInput 
              source="prompts" 
              label="Configuración / Parámetros" 
              multiline 
              fullWidth 
              rows={4}
            />
            <SelectInput source="status" label="Estado" choices={[
              { id: 'active', name: 'Activo' },
              { id: 'inactive', name: 'Inactivo' }
            ]} required />
          </SimpleForm>
        </Edit>
      </Paper>
    </Box>
  );
};
