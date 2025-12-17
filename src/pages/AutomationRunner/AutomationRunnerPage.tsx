import { useState, useEffect } from 'react';
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
} from 'react-admin';
import { Box, Typography, IconButton, Chip, CircularProgress, Snackbar, Alert } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { seedAutomationCases } from '../../firebase/seedData';

const API_URL = '/api/tests/execute';
const API_TOKEN = 'valid_token'; // Token fijo para pruebas

// Componente para el botón de ejecutar
const RunButton = ({ record }: { record: any }) => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const notify = useNotify();

  const handleRun = async () => {
    if (!record?.test_file) {
      notify('Error: El caso no tiene un archivo de test definido', { type: 'error' });
      return;
    }

    setRunning(true);
    setResult(null);
    
    try {
      const response = await fetch(API_URL, {
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

      // Verificar si la respuesta es exitosa antes de parsear JSON
      if (!response.ok) {
        let errorMessage = `Error del servidor (${response.status})`;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch {
          errorMessage = `Error del servidor (${response.status} ${response.statusText})`;
        }
        setResult('error');
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        notify(errorMessage, { type: 'error' });
        return;
      }

      // Intentar parsear JSON solo si la respuesta es exitosa
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        setResult('error');
        const errorMsg = 'Error: Respuesta inválida del servidor';
        setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        notify(errorMsg, { type: 'error' });
        return;
      }

      if (data.status === 'started') {
        setResult('success');
        setSnackbar({ open: true, message: 'Ejecución iniciada correctamente', severity: 'success' });
        notify('Ejecución iniciada correctamente', { type: 'success' });
      } else {
        setResult('error');
        const errorMsg = data.message || 'Error al iniciar la ejecución';
        setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        notify(errorMsg, { type: 'error' });
      }
    } catch (error: any) {
      console.error('Error en handleRun:', error);
      setResult('error');
      const errorMessage = error.message || 'Error de conexión. Verifica que el servidor backend esté corriendo en el puerto 9000.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      notify(errorMessage, { type: 'error' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      {running ? (
        <CircularProgress size={24} />
      ) : result === 'success' ? (
        <CheckCircleIcon color="success" />
      ) : result === 'error' ? (
        <ErrorIcon color="error" />
      ) : (
        <IconButton edge="end" color="primary" onClick={handleRun} title="Ejecutar test">
          <PlayArrowIcon />
        </IconButton>
      )}
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

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

export const AutomationRunnerPage = () => {
  const dataProvider = useDataProvider();
  const [initialized, setInitialized] = useState(false);

  // Inicializar casos por defecto si no existen
  useEffect(() => {
    const initializeDefaultCases = async () => {
      if (initialized) return;
      
      try {
        const { data } = await dataProvider.getList('automation', {
          pagination: { page: 1, perPage: 1 },
        });
        
        // Si no hay casos, inicializar los por defecto
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
    <Box sx={{ paddingTop: '20px', paddingRight: '20px', paddingBottom: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Automatización
      </Typography>
      <List
        actions={<ListActions />}
        empty={<Empty />}
        filters={automationFilters}
      >
        <Datagrid>
          <TextField source="name" label="Nombre" />
          <TextField source="description" label="Descripción" />
          <TextField source="test_file" label="Archivo de Test" />
          <FunctionField
            label="Estado"
            render={record => (
              <Chip
                label={record.status === 'active' ? 'Activo' : 'Inactivo'}
                sx={{
                  backgroundColor: record.status === 'active' ? '#4caf50' : '#bdbdbd',
                  color: '#fff',
                  fontWeight: 600
                }}
              />
            )}
          />
          <FunctionField
            label="Ejecutar"
            render={record => <RunButton record={record} />}
          />
          <EditButton />
          <DeleteButton />
        </Datagrid>
      </List>
    </Box>
  );
};

export const AutomationCaseCreate = (props: any) => (
  <Box sx={{ padding: '20px' }}>
    <Typography variant="h4" gutterBottom>
      Nuevo Caso Automatizado
    </Typography>
    <Box sx={{ maxWidth: 800, mt: 3 }}>
      <Create {...props} title="Nuevo Caso Automatizado" redirect="list">
        <SimpleForm defaultValues={{ status: 'active' }}>
          <TextInput source="name" label="Nombre" fullWidth required />
          <TextInput source="description" label="Descripción" multiline fullWidth />
          <TextInput 
            source="test_file" 
            label="Archivo de Test (ej: test_create_user.py)" 
            fullWidth 
            required
            helperText="Nombre del archivo de test que se ejecutará en el backend"
          />
          <TextInput 
            source="prompts" 
            label="Prompts / Parámetros" 
            multiline 
            fullWidth 
            rows={6}
            helperText="Parámetros y metadatos que Cursor leerá para enlazar este test con el backend. Puedes incluir información sobre endpoints, datos de prueba, configuración, etc."
          />
          <SelectInput source="status" label="Estado" choices={[
            { id: 'active', name: 'Activo' },
            { id: 'inactive', name: 'Inactivo' }
          ]} required />
        </SimpleForm>
      </Create>
    </Box>
  </Box>
);

export const AutomationCaseEdit = (props: any) => (
  <Box sx={{ padding: '20px' }}>
    <Typography variant="h4" gutterBottom>
      Editar Caso Automatizado
    </Typography>
    <Box sx={{ maxWidth: 800, mt: 3 }}>
      <Edit {...props} title="Editar Caso Automatizado">
        <SimpleForm>
          <TextInput source="name" label="Nombre" fullWidth required />
          <TextInput source="description" label="Descripción" multiline fullWidth />
          <TextInput 
            source="test_file" 
            label="Archivo de Test (ej: test_create_user.py)" 
            fullWidth 
            required
            helperText="Nombre del archivo de test que se ejecutará en el backend"
          />
          <TextInput 
            source="prompts" 
            label="Prompts / Parámetros" 
            multiline 
            fullWidth 
            rows={6}
            helperText="Parámetros y metadatos que Cursor leerá para enlazar este test con el backend. Puedes incluir información sobre endpoints, datos de prueba, configuración, etc."
          />
          <SelectInput source="status" label="Estado" choices={[
            { id: 'active', name: 'Activo' },
            { id: 'inactive', name: 'Inactivo' }
          ]} required />
        </SimpleForm>
      </Edit>
    </Box>
  </Box>
);
