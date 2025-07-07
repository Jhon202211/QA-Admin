import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, List, ListItem, ListItemText, IconButton, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useTestContext } from '../../context/TestContext';
import { useGetList } from 'react-admin';

// Casos automatizados simulados
const automatedCases = [
  { id: 'test_create_user.py', name: 'Crear usuario', description: 'Prueba de creación de usuario.' },
  { id: 'test_create_visitor.py', name: 'Crear visitante', description: 'Prueba de creación de visitante.' },
  { id: 'test_create_company.py', name: 'Crear empresa', description: 'Prueba de creación de empresa.' },
  { id: 'test_create_room_reservation.py', name: 'Reservar sala', description: 'Prueba de reserva de sala.' },
  { id: 'test_deactivate_user_company.py', name: 'Desactivar usuario/empresa', description: 'Prueba de desactivación de usuario o empresa.' },
  { id: 'test_restore_user_company.py', name: 'Restaurar usuario/empresa', description: 'Prueba de restauración de usuario o empresa.' },
];

const API_URL = 'http://localhost:9000/tests/execute';
const API_TOKEN = 'valid_token'; // Token fijo para pruebas

export const AutomationRunnerPage = () => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, 'success' | 'error' | null>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const { currentPlan, currentCase, setCurrentPlan, setCurrentCase } = useTestContext();
  const { data: plans = [] } = useGetList('test_planning');
  const { data: cases = [] } = useGetList('test_cases');

  // Nuevo estado local para el plan y caso seleccionados
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  const handleRun = async (id: string) => {
    if (!selectedPlanId) {
      setSnackbar({ open: true, message: 'Selecciona un plan de pruebas antes de ejecutar.', severity: 'error' });
      return;
    }
    const testToCaseId: Record<string, string> = {
      'test_create_user.py': 'TC001',
      'test_create_company.py': 'TC002',
      'test_create_visitor.py': 'TC003',
      'test_create_room_reservation.py': 'TC004',
      'test_deactivate_user_company.py': 'TC005',
      'test_restore_user_company.py': 'TC006',
    };
    const caseId = testToCaseId[id] || selectedCaseId || "CASE_DEFAULT";
    const planId = selectedPlanId;

    setRunningId(id);
    setResults(prev => ({ ...prev, [id]: null }));
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        },
        body: JSON.stringify({
          test_file: id,
          planId,
          caseId
        })
      });
      const data = await response.json();
      if (response.ok && data.status === 'started') {
        setResults(prev => ({ ...prev, [id]: 'success' }));
        setSnackbar({ open: true, message: 'Ejecución iniciada correctamente', severity: 'success' });
      } else {
        setResults(prev => ({ ...prev, [id]: 'error' }));
        setSnackbar({ open: true, message: data.message || 'Error al iniciar la ejecución', severity: 'error' });
      }
    } catch (error: any) {
      setResults(prev => ({ ...prev, [id]: 'error' }));
      setSnackbar({ open: true, message: error.message || 'Error de red', severity: 'error' });
    } finally {
      setRunningId(null);
    }
  };

  return (
    <Box sx={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Automatización
      </Typography>
      
      {/* Selectores para Plan y Caso */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Plan de Pruebas</InputLabel>
          <Select
            value={selectedPlanId}
            onChange={(e) => {
              setSelectedPlanId(e.target.value);
              const selectedPlan = plans.find(p => p.id === e.target.value);
              setCurrentPlan(selectedPlan || null);
            }}
            label="Plan de Pruebas"
          >
            <MenuItem value="">
              <em>Seleccionar plan...</em>
            </MenuItem>
            {plans.map((plan) => (
              <MenuItem key={plan.id} value={plan.id}>
                {plan.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Caso de Prueba</InputLabel>
          <Select
            value={selectedCaseId}
            onChange={(e) => {
              setSelectedCaseId(e.target.value);
              const selectedCase = cases.find(c => c.id === e.target.value);
              setCurrentCase(selectedCase || null);
            }}
            label="Caso de Prueba"
          >
            <MenuItem value="">
              <em>Seleccionar caso...</em>
            </MenuItem>
            {cases.map((case_) => (
              <MenuItem key={case_.id} value={case_.id}>
                {case_.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {/* Información del contexto actual */}
      {(selectedPlanId || selectedCaseId) && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Contexto actual:
          </Typography>
          {selectedPlanId && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              📋 Plan: <strong>{plans.find(p => p.id === selectedPlanId)?.name || selectedPlanId}</strong>
            </Typography>
          )}
          {selectedCaseId && (
            <Typography variant="body2">
              🧪 Caso: <strong>{cases.find(c => c.id === selectedCaseId)?.name || selectedCaseId}</strong>
            </Typography>
          )}
        </Box>
      )}
      
      <Box sx={{ maxWidth: 420 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Casos automatizados disponibles
            </Typography>
            <List>
              {automatedCases.map(caso => (
                <ListItem key={caso.id} secondaryAction={
                  runningId === caso.id ? (
                    <CircularProgress size={28} />
                  ) : results[caso.id] === 'success' ? (
                    <CheckCircleIcon color="success" />
                  ) : results[caso.id] === 'error' ? (
                    <ErrorIcon color="error" />
                  ) : (
                    <IconButton edge="end" color="primary" onClick={() => handleRun(caso.id)} disabled={!selectedPlanId}>
                      <PlayArrowIcon />
                    </IconButton>
                  )
                }>
                  <ListItemText
                    primary={caso.name}
                    secondary={caso.description}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 