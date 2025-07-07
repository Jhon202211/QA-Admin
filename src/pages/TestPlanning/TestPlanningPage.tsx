import {
  List,
  useListContext,
  EditButton,
  DeleteButton,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterButton,
  TextInput,
  SelectInput,
  DateField,
  DateInput,
  SimpleForm,
  Create,
  Edit,
  SelectArrayInput,
  useGetList
} from 'react-admin';
import { Box, Typography, Card, CardContent, Chip, Grid, IconButton, Modal, Paper, Divider, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { useState, useEffect, useRef } from 'react';
import { dataProvider } from '../../firebase/dataProvider';

const planFilters = [
  <TextInput label="Buscar por nombre" source="name" alwaysOn />,
  <SelectInput label="Estado" source="status" choices={[
    { id: 'draft', name: 'Borrador' },
    { id: 'active', name: 'Activo' },
    { id: 'in_progress', name: 'En Progreso' },
    { id: 'completed', name: 'Completado' },
    { id: 'cancelled', name: 'Cancelado' }
  ]} alwaysOn />,
];

const statusColors = {
  draft: '#9e9e9e',
  active: '#2196f3',
  in_progress: '#ff9800',
  completed: '#4caf50',
  cancelled: '#f44336'
};

const statusLabels = {
  draft: 'Borrador',
  active: 'Activo',
  in_progress: 'En Progreso',
  completed: 'Completado',
  cancelled: 'Cancelado'
};

const Empty = () => (
  <Box sx={{ minHeight: '100vh', boxSizing: 'border-box', padding: '32px 32px 0 0', margin: 0, textAlign: 'center' }}>
    <Typography variant="h5" paragraph>
      No hay planes de prueba
    </Typography>
    <Typography variant="body1">
      Crea tu primer plan de pruebas para empezar a organizar tu testing.
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

function TestPlanningCardList() {
  const { data, isLoading } = useListContext();
  const { data: testResults = [], refetch: refetchTestResults } = useGetList('test_results');
  const { data: manualCases = [] } = useGetList('test_cases');
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [openRun, setOpenRun] = useState(false);
  const [selectedPlanRun, setSelectedPlanRun] = useState<any>(null);
  const [manualResults, setManualResults] = useState<Record<string, string>>({});
  const [autoStatus, setAutoStatus] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const pollingRefs = useRef<Record<string, any>>({});

  const handleOpen = (plan: any) => {
    setSelectedPlan(plan);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setSelectedPlan(null);
  };

  const handleOpenRun = (plan: any) => {
    setSelectedPlanRun(plan);
    setManualResults({});
    setAutoStatus({});
    setOpenRun(true);
  };
  const handleCloseRun = () => {
    setOpenRun(false);
    setSelectedPlanRun(null);
    setManualResults({});
    setAutoStatus({});
    setRunning(false);
  };

  // Mapeo de test automatizado a caseId (ajusta según tu correspondencia real)
  const testToCaseId: Record<string, string> = {
    'test_create_user.py': 'TC001',
    'test_create_company.py': 'TC002',
    'test_create_visitor.py': 'TC003',
    'test_create_room_reservation.py': 'TC004',
    'test_deactivate_user_company.py': 'TC005',
    'test_restore_user_company.py': 'TC006',
  };

  // Mapeo de alias de nombre de test automatizado
  const testNameAliases: Record<string, string[]> = {
    'test_create_company.py': ['test_create_company', 'pytest'],
    'test_create_user.py': ['test_create_user', 'pytest'],
    'test_create_visitor.py': ['test_create_visitor', 'pytest'],
    'test_create_room_reservation.py': ['test_create_room_reservation', 'pytest'],
    'test_deactivate_user_company.py': ['test_deactivate_user_company', 'pytest'],
    'test_restore_user_company.py': ['test_restore_user_company', 'pytest'],
    // Agrega más alias si es necesario
  };

  // Función para obtener el estado del último resultado de un test automatizado
  const getAutomatedTestStatus = (testId: string, planId?: string) => {
    const pid = planId || selectedPlan?.id;
    const baseName = testId.replace('.py', '');
    const caseId = testToCaseId[testId] || null;
    const aliases = [baseName, ...(testNameAliases[testId] || [])];
    const results = testResults.filter((r: any) => {
      const rName = (r.name || '').replace('.py', '');
      // Acepta si el nombre coincide con alguno de los alias
      const nameMatch = aliases.includes(rName);
      return r.planId === pid && nameMatch && (!caseId || r.caseId === caseId);
    });
    if (results.length === 0) return null;
    // Tomar el más reciente por fecha
    const last = results.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return last.status;
  };

  // Función para obtener el estado de un test manual
  const getManualTestStatus = (testId: string) => {
    const test = manualCases.find((t: any) => t.id === testId);
    return test?.executionResult || null;
  };

  // Polling para cada test automatizado
  const startPolling = (executionId: string, testId: string, planId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutos
    const interval = setInterval(async () => {
      attempts++;
      try {
        const statusResponse = await fetch(`http://localhost:9000/tests/status/${executionId}`, {
          headers: { 'Authorization': 'Bearer valid_token' }
        });
        if (!statusResponse.ok) throw new Error('Error status');
        const status = await statusResponse.json();
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'error') {
          clearInterval(interval);
          pollingRefs.current[testId] = null;
          // Esperar 2s y refrescar resultados desde Firestore
          setTimeout(() => {
            refetchTestResults && refetchTestResults();
            setAutoStatus(s => ({ ...s }));
          }, 2000);
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          pollingRefs.current[testId] = null;
        }
      } catch {
        clearInterval(interval);
        pollingRefs.current[testId] = null;
      }
    }, 5000);
    pollingRefs.current[testId] = interval;
  };

  // Ejecutar todos los tests automatizados con polling
  const handleRunAutomated = async () => {
    if (!selectedPlanRun) return;
    setRunning(true);
    for (const testId of selectedPlanRun.automatedTests || []) {
      setAutoStatus(s => ({ ...s, [testId]: 'running' }));
      try {
        const caseId = testToCaseId[testId] || '';
        const planId = selectedPlanRun?.id || '';
        // Log para validar cada petición
        console.log('Enviando ejecución desde plan:', { test_file: testId, planId, caseId });
        const response = await fetch('http://localhost:9000/tests/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid_token'
          },
          body: JSON.stringify({
            test_file: testId,
            planId: planId,
            caseId: caseId
          })
        });
        const data = await response.json();
        if (data.execution_id) {
          startPolling(data.execution_id, testId, selectedPlanRun.id);
        }
      } catch {
        setAutoStatus(s => ({ ...s, [testId]: 'error' }));
      }
    }
    setRunning(false);
  };

  // Guardar resultados de manuales
  const handleSaveManuals = async () => {
    // Limpiar arrays para evitar undefined
    const cleanManualTestCases = (selectedPlanRun.manualTestCases || []).filter(Boolean);
    const cleanAutomatedTests = (selectedPlanRun.automatedTests || []).filter(Boolean);
    for (const testId of Object.keys(manualResults)) {
      const test = manualCases.find((t: any) => t.id === testId);
      if (test) {
        await dataProvider.update('test_cases', { id: testId, data: { ...test, executionResult: manualResults[testId] } });
      }
    }
    // Actualizar el plan de pruebas sin undefined
    await dataProvider.update('test_planning', {
      id: selectedPlanRun.id,
      data: {
        ...selectedPlanRun,
        manualTestCases: cleanManualTestCases,
        automatedTests: cleanAutomatedTests
      }
    });
    handleCloseRun();
  };

  if (isLoading) return <Typography>Cargando...</Typography>;
  if (!data || data.length === 0) return <Empty />;
  return (
    <>
      <Grid container direction="column" spacing={3} sx={{ background: 'transparent', boxShadow: 'none' }}>
        {data.map((plan: any) => (
          <Grid key={plan.id} sx={{ width: '100%', maxWidth: 700, ml: 0 }}>
            <Card
              sx={{
                borderRadius: 3,
                background: '#fff',
                border: '1px solid #e0e0e0',
                boxShadow: '0 4px 16px 0 rgba(80,80,120,0.13)',
                transition: 'box-shadow 0.2s, transform 0.2s',
                '&:hover': {
                  boxShadow: '0 8px 32px 0 rgba(80,80,120,0.22)',
                  transform: 'translateY(-4px) scale(1.02)'
                },
                p: 0,
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => handleOpen(plan)}
            >
              <CardContent sx={{ p: 3, background: '#fff' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} sx={{ background: '#fff' }}>
                  <Box sx={{ background: '#fff' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2B2D42', mb: 0.5, background: '#fff' }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 32, background: '#fff' }}>
                      {plan.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={statusLabels[(plan.status as keyof typeof statusLabels)] || plan.status}
                    size="small"
                    sx={{
                      backgroundColor: statusColors[(plan.status as keyof typeof statusColors)] || '#ccc',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: 13,
                      px: 1.5,
                      borderRadius: 1
                    }}
                  />
                </Box>
                <Box display="flex" alignItems="center" gap={2} mb={2} sx={{ background: '#fff' }}>
                  <Box display="flex" alignItems="center" gap={0.5} sx={{ background: '#fff' }}>
                    <CalendarIcon fontSize="small" sx={{ color: '#4B3C9D', background: '#fff' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ background: '#fff' }}>
                      Inicio: <DateField source="startDate" record={plan} showTime={false} />
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5} sx={{ background: '#fff' }}>
                    <CalendarIcon fontSize="small" sx={{ color: '#4B3C9D', background: '#fff' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ background: '#fff' }}>
                      Fin: <DateField source="endDate" record={plan} showTime={false} />
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" gap={2} mt={2} sx={{ background: '#fff' }}>
                  <EditButton record={plan} label="Editar" sx={{ color: '#4B3C9D', fontWeight: 600, background: '#fff' }} />
                  <DeleteButton record={plan} label="Eliminar" sx={{ color: '#e53935', fontWeight: 600, background: '#fff' }} />
                  <Button variant="contained" color="primary" sx={{ ml: 'auto', fontWeight: 600 }} onClick={e => { e.stopPropagation(); handleOpenRun(plan); }}>Ejecutar plan</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {/* Modal de detalle de plan de pruebas */}
      <Modal open={open} onClose={handleClose}>
        <Paper sx={{ position: 'absolute', top: '50%', left: '60%', transform: 'translate(-50%, -50%)', minWidth: 420, maxWidth: 600, p: 4, borderRadius: 4, outline: 'none' }}>
          {selectedPlan && (
            <>
              <Typography variant="h5" sx={{ mb: 2 }}>Detalle del Plan: {selectedPlan.name}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6">Test Automatizados</Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                {(selectedPlan.automatedTests || []).map((testId: string, idx: number) => {
                  const status = getAutomatedTestStatus(testId, selectedPlan.id);
                  return (
                    <li key={testId} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                      <span style={{ minWidth: 32 }}>{idx + 1}.</span> {testId.replace('test_', '').replace('.py', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {status === 'passed' && (
                        <Chip label="Pasó" sx={{ ml: 2, backgroundColor: '#4caf50', color: '#fff', fontWeight: 600 }} />
                      )}
                      {status === 'failed' && (
                        <Chip label="Falló" sx={{ ml: 2, backgroundColor: '#e53935', color: '#fff', fontWeight: 600 }} />
                      )}
                      {status === null && (
                        <Chip label="Pendiente" sx={{ ml: 2, backgroundColor: '#bdbdbd', color: '#fff', fontWeight: 600 }} />
                      )}
                    </li>
                  );
                })}
              </Box>
              <Typography variant="h6">Test manuales</Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                {(selectedPlan.manualTestCases || []).map((testId: string, idx: number) => {
                  const test = manualCases.find((t: any) => t.id === testId);
                  const status = test?.executionResult;
                  return (
                    <li key={testId} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                      <span style={{ minWidth: 32 }}>{idx + 1}.</span> {test?.name || testId}
                      {status && (
                        <Chip
                          label={status === 'passed' ? 'Pasó' : status === 'failed' ? 'Falló' : status}
                          sx={{
                            ml: 2,
                            backgroundColor: status === 'passed' ? '#4caf50' : status === 'failed' ? '#e53935' : '#bdbdbd',
                            color: '#fff',
                            fontWeight: 600
                          }}
                        />
                      )}
                    </li>
                  );
                })}
              </Box>
            </>
          )}
        </Paper>
      </Modal>
      {/* Modal de ejecución de plan */}
      <Modal open={openRun} onClose={handleCloseRun}>
        <Paper sx={{ position: 'absolute', top: '50%', left: '60%', transform: 'translate(-50%, -50%)', minWidth: 420, maxWidth: 600, p: 4, borderRadius: 4, outline: 'none' }}>
          {selectedPlanRun && (
            <>
              <Typography variant="h5" sx={{ mb: 2 }}>Ejecutar Plan: {selectedPlanRun.name}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6">Test Automatizados</Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                {(selectedPlanRun.automatedTests || []).map((testId: string, idx: number) => {
                  const status = getAutomatedTestStatus(testId, selectedPlanRun.id);
                  return (
                    <li key={testId} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                      <span style={{ minWidth: 32 }}>{idx + 1}.</span> {testId.replace('test_', '').replace('.py', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {status === 'passed' && (
                        <Chip label="Pasó" sx={{ ml: 2, backgroundColor: '#4caf50', color: '#fff', fontWeight: 600 }} />
                      )}
                      {status === 'failed' && (
                        <Chip label="Falló" sx={{ ml: 2, backgroundColor: '#e53935', color: '#fff', fontWeight: 600 }} />
                      )}
                      {status === null && (
                        <Chip label="Pendiente" sx={{ ml: 2, backgroundColor: '#bdbdbd', color: '#fff', fontWeight: 600 }} />
                      )}
                    </li>
                  );
                })}
              </Box>
              {selectedPlanRun.automatedTests?.length > 0 && (
                <Button variant="contained" color="primary" onClick={handleRunAutomated} disabled={running} sx={{ mb: 3 }}>
                  Ejecutar todos los automatizados
                </Button>
              )}
              <Typography variant="h6">Test manuales</Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                {(selectedPlanRun.manualTestCases || []).map((testId: string, idx: number) => {
                  const test = manualCases.find((t: any) => t.id === testId);
                  const status = manualResults[testId] || test?.executionResult;
                  return (
                    <li key={testId} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                      <span style={{ minWidth: 32 }}>{idx + 1}.</span> {test?.name || testId}
                      <ToggleButtonGroup
                        exclusive
                        value={status || ''}
                        onChange={(_, value) => setManualResults(r => ({ ...r, [testId]: value }))}
                        sx={{ ml: 2 }}
                        size="small"
                      >
                        <ToggleButton value="passed" sx={{ color: '#4caf50', borderColor: '#4caf50' }}>Pasó</ToggleButton>
                        <ToggleButton value="failed" sx={{ color: '#e53935', borderColor: '#e53935' }}>Falló</ToggleButton>
                      </ToggleButtonGroup>
                      {status === 'passed' && <Chip label="Pasó" sx={{ ml: 2, backgroundColor: '#4caf50', color: '#fff', fontWeight: 600 }} />}
                      {status === 'failed' && <Chip label="Falló" sx={{ ml: 2, backgroundColor: '#e53935', color: '#fff', fontWeight: 600 }} />}
                    </li>
                  );
                })}
              </Box>
              <Button variant="contained" color="success" onClick={handleSaveManuals} sx={{ mt: 2 }}>
                Guardar resultados manuales
              </Button>
            </>
          )}
        </Paper>
      </Modal>
    </>
  );
}

export const TestPlanningPage = () => (
  <Box sx={{ padding: '20px' }}>
    <Typography variant="h4" gutterBottom>
      Planificación de Pruebas
    </Typography>
    <List
      actions={<ListActions />}
      empty={<Empty />}
      filters={planFilters}
      pagination={false}
      sx={{
        background: 'transparent',
        boxShadow: 'none',
        padding: 0,
        '& .RaList-content': {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
        },
        '& .MuiPaper-root': {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
        }
      }}
    >
      <TestPlanningCardList />
    </List>
  </Box>
);

export const TestPlanningCreate = (props: any) => {
  const { data: manualCases = [] } = useGetList('test_cases');
  return (
    <Create {...props} title="Nuevo Plan de Pruebas" redirect="list">
      <SimpleForm>
        <TextInput source="name" label="Nombre" fullWidth required />
        <TextInput source="description" label="Descripción" multiline fullWidth />
        <SelectInput source="status" label="Estado" choices={[
          { id: 'draft', name: 'Borrador' },
          { id: 'active', name: 'Activo' },
          { id: 'in_progress', name: 'En Progreso' },
          { id: 'completed', name: 'Completado' },
          { id: 'cancelled', name: 'Cancelado' }
        ]} required />
        <DateInput source="startDate" label="Fecha de inicio" />
        <DateInput source="endDate" label="Fecha de fin" />
        <SelectArrayInput
          source="manualTestCases"
          label="Casos de prueba manuales"
          choices={manualCases.map(tc => ({ id: tc.id, name: tc.name }))}
        />
        <SelectArrayInput
          source="automatedTests"
          label="Tests automatizados"
          choices={[
            { id: 'test_create_user.py', name: 'Crear usuario' },
            { id: 'test_create_visitor.py', name: 'Crear visitante' },
            { id: 'test_create_company.py', name: 'Crear empresa' },
            { id: 'test_create_room_reservation.py', name: 'Reservar sala' },
            { id: 'test_deactivate_user_company.py', name: 'Desactivar usuario/empresa' },
            { id: 'test_restore_user_company.py', name: 'Restaurar usuario/empresa' },
          ]}
        />
      </SimpleForm>
    </Create>
  );
};

export const TestPlanningEdit = (props: any) => {
  const { data: manualCases = [] } = useGetList('test_cases');
  return (
    <Edit {...props} title="Editar Plan de Pruebas">
      <SimpleForm>
        <TextInput source="name" label="Nombre" fullWidth required />
        <TextInput source="description" label="Descripción" multiline fullWidth />
        <SelectInput source="status" label="Estado" choices={[
          { id: 'draft', name: 'Borrador' },
          { id: 'active', name: 'Activo' },
          { id: 'in_progress', name: 'En Progreso' },
          { id: 'completed', name: 'Completado' },
          { id: 'cancelled', name: 'Cancelado' }
        ]} required />
        <DateInput source="startDate" label="Fecha de inicio" />
        <DateInput source="endDate" label="Fecha de fin" />
        <SelectArrayInput
          source="manualTestCases"
          label="Casos de prueba manuales"
          choices={manualCases.map(tc => ({ id: tc.id, name: tc.name }))}
        />
        <SelectArrayInput
          source="automatedTests"
          label="Tests automatizados"
          choices={[
            { id: 'test_create_user.py', name: 'Crear usuario' },
            { id: 'test_create_visitor.py', name: 'Crear visitante' },
            { id: 'test_create_company.py', name: 'Crear empresa' },
            { id: 'test_create_room_reservation.py', name: 'Reservar sala' },
            { id: 'test_deactivate_user_company.py', name: 'Desactivar usuario/empresa' },
            { id: 'test_restore_user_company.py', name: 'Restaurar usuario/empresa' },
          ]}
        />
      </SimpleForm>
    </Edit>
  );
}; 