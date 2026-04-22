import { useState, useEffect, useRef, useMemo } from 'react';
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
  useListContext,
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
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  TextField as MuiTextField,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import LinkIcon from '@mui/icons-material/Link';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
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
  const [browserError, setBrowserError] = useState<{ message: string, command: string } | null>(null);
  const notify = useNotify();
  const [update] = useUpdate();

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!record?.test_file) {
      notify('Error: El caso no tiene un archivo de test definido', { type: 'error' });
      return;
    }

    setBrowserError(null);
    setRunning(true);
    // No llamamos a onShowLogs todavía para evitar que cuente como test ejecutado si falla la validación inicial
    
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
        const data = await response.json().catch(() => ({}));
        
        if (data.error_type === 'browser_missing') {
          setBrowserError({ message: data.message, command: data.suggestion });
          setShowServerModal(true);
          setRunning(false);
          return;
        }

        let errorMessage = data.message || `Error del servidor (${response.status})`;
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        notify(errorMessage, { type: 'error' });
        setRunning(false);
        return;
      }

      const data = await response.json();

      if (data.status === 'started') {
        // Ahora sí actualizamos el estado a running y mostramos los logs
        onShowLogs(record.id, record.name);
        setSnackbar({ open: true, message: 'Ejecución iniciada correctamente', severity: 'success' });
        
        await update('automation', {
          id: record.id,
          data: { last_status: 'running' },
          previousData: record,
        });
      } else {
        const errorMsg = data.message || 'Error al iniciar la ejecución';
        setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        notify(errorMsg, { type: 'error' });
        setRunning(false);
      }
    } catch (error: any) {
      console.error('Error en handleRun:', error);
      setRunning(false);
      
      // Detectar si es un error de conexión (servidor apagado)
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        setBrowserError(null);
        setShowServerModal(true);
      } else {
        const errorMessage = error.message || 'Error de conexión.';
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        notify(errorMessage, { type: 'error' });
      }
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

      {/* Modal de sugerencia de servidor / navegador */}
      <Dialog open={showServerModal} onClose={() => setShowServerModal(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          {browserError ? 'Navegador no encontrado' : 'Servidor de Automatización Apagado'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {browserError 
              ? browserError.message 
              : `No se pudo establecer conexión con el servidor de automatización en localhost:9000.`}
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, position: 'relative' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {browserError 
                ? 'Para instalar Chromium y sus dependencias, ejecuta:' 
                : 'Para ejecutar tests automáticos, debes iniciar el servidor local ejecutando:'}
              <Box component="code" sx={{ display: 'block', mt: 1, fontWeight: 'bold', color: '#d32f2f' }}>
                {browserError ? browserError.command : 'npm run automation:server'}
              </Box>
            </Typography>
            <Tooltip title="Copiar comando">
              <IconButton 
                size="small" 
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => {
                  const cmd = browserError ? browserError.command : 'npm run automation:server';
                  navigator.clipboard.writeText(cmd);
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
            startIcon={browserError ? <PlayArrowIcon /> : <SettingsRemoteIcon />}
            sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A2B' } }}
            onClick={() => {
              setShowServerModal(false);
              const msg = browserError 
                ? `Ejecuta "${browserError.command}" en tu terminal.`
                : 'Por favor, ejecuta "npm run automation:server" en tu terminal.';
              notify(msg, { type: 'info' });
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

const MODULE_CHOICES = MODULES_STRUCTURE.map(m => ({ id: m.name, name: m.name }));

const PlaceholderActionModal = ({ 
  open, 
  onClose, 
  testName, 
  moduleName, 
  existingTests, 
  onCreate, 
  onAssociate 
}: { 
  open: boolean, 
  onClose: () => void, 
  testName: string, 
  moduleName: string,
  existingTests: any[],
  onCreate: (name: string) => void,
  onAssociate: (testId: string) => void
}) => {
  const [selectedTest, setSelectedTest] = useState<any>(null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Acción para: {testName}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Este test es un marcador de posición para el módulo <strong>{moduleName}</strong>.
          </Typography>
          
          <Box sx={{ mt: 4, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AddCircleOutlineIcon fontSize="small" /> Opción 1: Crear nuevo test
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Crea un nuevo registro en la base de datos vinculado a este módulo.
            </Typography>
            <Button variant="outlined" onClick={() => onCreate(testName)} fullWidth>
              Crear como nuevo test
            </Button>
          </Box>

          <Box sx={{ mt: 3, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinkIcon fontSize="small" /> Opción 2: Asociar test existente
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Selecciona un test existente para moverlo a este grupo y renombrarlo como <strong>{testName}</strong>.
            </Typography>
            <Autocomplete
              options={existingTests}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => <MuiTextField {...params} label="Buscar test existente..." variant="outlined" size="small" />}
              onChange={(_, newValue) => setSelectedTest(newValue)}
              sx={{ mb: 2 }}
            />
            <Button 
              variant="outlined" 
              color="secondary" 
              disabled={!selectedTest} 
              onClick={() => selectedTest && onAssociate(selectedTest.id)}
              fullWidth
            >
              Asociar y mover a este grupo
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
};

const ModuleDatagrid = ({ 
  module, 
  onShowLogs, 
  onConfigure 
}: { 
  module: any, 
  onShowLogs: (id: string, name: string) => void,
  onConfigure: (testName: string, moduleName: string) => void
}) => {
  return (
    <Datagrid 
      data={module.testsData}
      rowClick={(id, _resource, record) => {
        if (record.isPlaceholder) return false;
        onShowLogs(id.toString(), record.name);
        return false;
      }}
      sx={{
        '& .MuiTableCell-head': { backgroundColor: '#f5f5f5', fontWeight: 700 },
        '& .MuiTableRow-root': {
          '&:hover': {
            backgroundColor: '#f9f9f9',
          }
        }
      }}
      bulkActionButtons={false}
    >
      <TextField 
        source="name" 
        label="Nombre" 
        sx={{
          opacity: (record: any) => record.isPlaceholder ? 0.6 : 1
        }}
      />
      
      <FunctionField 
        label="Archivo de Test" 
        render={(record: any) => (
          <Box sx={{ opacity: record.isPlaceholder ? 0.6 : 1 }}>
            {record.isPlaceholder ? (
              <Button 
                size="small" 
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => onConfigure(record.name, module.name)} 
                sx={{ textTransform: 'none' }}
              >
                Configurar
              </Button>
            ) : (
              <code style={{ backgroundColor: '#eee', padding: '2px 4px', borderRadius: '4px' }}>
                {(record.test_file || '').replace('.py', '.spec.ts')}
              </code>
            )}
          </Box>
        )} 
      />

      <FunctionField
        label="Último Resultado"
        render={(record: any) => (
          <Box sx={{ opacity: record.isPlaceholder ? 0.6 : 1 }}>
            {record.isPlaceholder ? <StatusChip status="no_executed" /> : <StatusChip status={record.last_status} />}
          </Box>
        )}
      />

      <FunctionField
        label="Duración"
        render={(record: any) => (
          <Box sx={{ opacity: record.isPlaceholder ? 0.6 : 1 }}>
            {!record.isPlaceholder && record.last_duration ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TimerIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">{record.last_duration}s</Typography>
              </Stack>
            ) : '-'}
          </Box>
        )}
      />

      <FunctionField
        label="Config"
        render={(record: any) => (
          <Box sx={{ opacity: record.isPlaceholder ? 0.6 : 1 }}>
            <Chip 
              label={record.status === 'active' ? 'Activo' : 'Inactivo'} 
              variant="outlined"
              size="small"
              color={record.status === 'active' ? 'success' : 'default'}
            />
          </Box>
        )}
      />

      <FunctionField
        label="Ejecutar"
        render={(record: any) => !record.isPlaceholder ? <RunButton record={record} onShowLogs={onShowLogs} /> : null}
      />
      <Box sx={{ display: 'flex' }}>
        <FunctionField render={(record: any) => !record.isPlaceholder ? (
          <Box sx={{ display: 'flex' }}>
            <EditButton record={record} label="" />
            <DeleteButton record={record} label="" />
          </Box>
        ) : null} />
      </Box>
    </Datagrid>
  );
};

const GroupedAutomationList = ({ onShowLogs }: { onShowLogs: (id: string, name: string) => void }) => {
  const { data, isLoading } = useListContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update] = useUpdate();

  // Estado para el modal de placeholder
  const [placeholderModal, setPlaceholderModal] = useState<{ open: boolean, testName: string, moduleName: string }>({
    open: false,
    testName: '',
    moduleName: ''
  });

  // Función para normalizar nombres y comparar
  const normalize = (str: string) => str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const groupedData = useMemo(() => {
    if (!data) return [];

    const assignedIds = new Set();
    const modules = MODULES_STRUCTURE.map(module => {
      const moduleTests: any[] = [];
      
      // 1. Primero, agregar tests que tienen este módulo asignado explícitamente en el campo 'module'
      const explicitTestsInModule = data.filter(t => !assignedIds.has(t.id) && t.module === module.name);
      explicitTestsInModule.forEach(t => {
        assignedIds.add(t.id);
        moduleTests.push({ ...t, isPlaceholder: false });
      });

      // 2. Luego, para los nombres de tests definidos en la estructura que aún no están asignados
      module.tests.forEach(testName => {
        // Buscar si ya se asignó por el paso 1 (por nombre)
        const alreadyAssigned = moduleTests.find((t: any) => normalize(t.name) === normalize(testName));
        if (alreadyAssigned) return;

        // Intentar encontrar un test que no tenga módulo pero coincida por nombre (retrocompatibilidad)
        const existingTest = data.find(t => {
          if (assignedIds.has(t.id)) return false;
          if (t.module && t.module !== 'Otros / Sin Clasificar') return false;
          
          const n1 = normalize(t.name);
          const n2 = normalize(testName);
          return n1 === n2 || (n1.length > 5 && n2.length > 5 && (n1.includes(n2) || n2.includes(n1)));
        });

        if (existingTest) {
          assignedIds.add(existingTest.id);
          moduleTests.push({ ...existingTest, isPlaceholder: false });
        } else {
          // Si no existe, crear el placeholder
          moduleTests.push({ 
            id: `placeholder-${testName}`, 
            name: testName, 
            status: 'inactive', 
            last_status: 'no_executed',
            isPlaceholder: true,
            module: module.name
          });
        }
      });

      return {
        ...module,
        testsData: moduleTests,
        hasActiveTests: moduleTests.some((t: any) => !t.isPlaceholder && t.status === 'active')
      };
    });

    // Agregar tests que no coincidieron con ningún módulo
    const unassignedTests = data.filter(t => !assignedIds.has(t.id)).map(t => ({ ...t, isPlaceholder: false }));
    if (unassignedTests.length > 0) {
      modules.push({
        name: 'Otros / Sin Clasificar',
        tests: unassignedTests.map(t => t.name),
        testsData: unassignedTests,
        hasActiveTests: unassignedTests.some(t => t.status === 'active')
      });
    }

    return modules;
  }, [data]);

  const handleCreatePlaceholder = async (testName: string) => {
    try {
      await dataProvider.create('automation', {
        data: {
          name: testName,
          status: 'inactive',
          module: placeholderModal.moduleName,
          description: `Test auto-generado para el módulo ${placeholderModal.moduleName}.`,
          test_file: `${normalize(testName).replace(/\s+/g, '_')}.spec.ts`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      notify('Test creado exitosamente', { type: 'success' });
      setPlaceholderModal(prev => ({ ...prev, open: false }));
      refresh();
    } catch (error) {
      notify('Error al crear el test', { type: 'error' });
    }
  };

  const handleAssociateTest = async (testId: string) => {
    try {
      await update('automation', {
        id: testId,
        data: { 
          module: placeholderModal.moduleName,
          name: placeholderModal.testName // Reemplazar el nombre para que coincida con la estructura
        },
        previousData: data ? data.find((t: any) => t.id === testId) : undefined
      });
      notify('Test asociado y renombrado correctamente', { type: 'success' });
      setPlaceholderModal(prev => ({ ...prev, open: false }));
      refresh();
    } catch (error) {
      notify('Error al asociar el test', { type: 'error' });
    }
  };

  // Tests disponibles para asociar (los que están en 'Otros' o no tienen módulo)
  const availableTestsToAssociate = useMemo(() => {
    return data?.filter(t => !t.module || t.module === 'Otros / Sin Clasificar') || [];
  }, [data]);

  if (isLoading) return <CircularProgress />;

  return (
    <Box>
      {groupedData.map((module, index) => (
        <Accordion key={index} defaultExpanded={false} sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={2} alignItems="center">
              <FolderIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{module.name}</Typography>
              <Chip size="small" label={`${module.testsData.filter(t => !t.isPlaceholder).length} / ${module.tests.length}`} variant="outlined" />
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <ModuleDatagrid 
              module={module} 
              onShowLogs={onShowLogs} 
              onConfigure={(testName, moduleName) => setPlaceholderModal({ open: true, testName, moduleName })} 
            />
          </AccordionDetails>
        </Accordion>
      ))}

      <PlaceholderActionModal 
        open={placeholderModal.open}
        onClose={() => setPlaceholderModal(prev => ({ ...prev, open: false }))}
        testName={placeholderModal.testName}
        moduleName={placeholderModal.moduleName}
        existingTests={availableTestsToAssociate}
        onCreate={handleCreatePlaceholder}
        onAssociate={handleAssociateTest}
      />
    </Box>
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

  const handleCloseLogs = async () => {
    setShowLogs(false);
    if (activeStatus === 'running' && activeTest) {
      // Si se cierra mientras está ejecutando, marcar como fallido/interrumpido
      // pero SOLO si el estado sigue siendo 'running' (es decir, no ha llegado 'test-finished')
      try {
        // Obtenemos el registro actual para validar su estado real en la BD
        const record = await dataProvider.getOne('automation', { id: activeTest.id });
        
        if (record.data.last_status === 'running') {
          await update('automation', {
            id: activeTest.id,
            data: { last_status: 'failed' },
            previousData: record.data,
          });
          setActiveStatus('idle');
          refresh();
        }
      } catch (e) {
        console.error('Error updating status on modal close:', e);
      }
    }
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
          perPage={100}
        >
          <GroupedAutomationList onShowLogs={handleShowLogs} />
        </List>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mt: -3 }}>
          <TestResultsList hideTitle />
        </Box>
      </TabPanel>

      <ExecutionLogsModal 
        open={showLogs} 
        onClose={handleCloseLogs} 
        logs={logs} 
        testName={activeTest?.name || ''}
        status={activeStatus}
      />
    </Box>
  );
};

export const AutomationCaseCreate = (props: any) => {
  const { files, loading } = useTestFiles();

  const [initialized, setInitialized] = useState(false);

  // Clave para el draft en localStorage
  const draftKey = useMemo(() => 
    props.record?.id ? `automation_edit_draft_${props.record.id}` : (props.mode === 'create' ? 'automation_create_draft' : null)
  , [props.record?.id, props.mode]);

  useEffect(() => {
    if (props.record && !initialized && draftKey) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          // const draftData = JSON.parse(savedDraft);
          // Solo aplicamos si el draft es reciente (opcional)
          // Aquí react-admin maneja el form, pero podemos usar defaultValues o reset
        } catch (e) { console.error(e); }
      }
      setInitialized(true);
    }
  }, [props.record, initialized, draftKey]);

  return (
    <Box sx={{ pt: '20px', pr: '20px', pb: '20px', pl: 0 }}>
      <Typography variant="h4" gutterBottom>
        Nuevo Caso Automatizado
      </Typography>
      <Paper sx={{ p: 3, mt: 3 }}>
        <Create {...props} title="Nuevo Caso Automatizado" redirect="list">
          <SimpleForm 
            defaultValues={{ status: 'active' }}
            onChange={(values) => {
              if (draftKey) localStorage.setItem(draftKey, JSON.stringify(values));
            }}
            onSubmit={() => {
              if (draftKey) localStorage.removeItem(draftKey);
            }}
          >
            <TextInput source="name" label="Nombre" fullWidth required />
            <SelectInput source="module" label="Módulo / Agrupación" choices={MODULE_CHOICES} fullWidth />
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
          <SimpleForm
            onChange={(values) => {
              const id = props.id || (window.location.hash.split('/').pop());
              if (id) localStorage.setItem(`automation_edit_draft_${id}`, JSON.stringify(values));
            }}
            onSubmit={() => {
              const id = props.id || (window.location.hash.split('/').pop());
              if (id) localStorage.removeItem(`automation_edit_draft_${id}`);
            }}
          >
            <TextInput source="name" label="Nombre" fullWidth required />
            <SelectInput source="module" label="Módulo / Agrupación" choices={MODULE_CHOICES} fullWidth />
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
