import { useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, List, ListItem, ListItemText, IconButton, Snackbar, Alert } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// Casos automatizados simulados
const automatedCases = [
  { id: 'test_create_user.py', name: 'Crear usuario', description: 'Prueba de creación de usuario.' },
  { id: 'test_create_visitor.py', name: 'Crear visitante', description: 'Prueba de creación de visitante.' },
  { id: 'test_create_company.py', name: 'Crear empresa', description: 'Prueba de creación de empresa.' },
  { id: 'test_create_room_reservation.py', name: 'Reservar sala', description: 'Prueba de reserva de sala.' },
  { id: 'test_deactivate_user_company.py', name: 'Desactivar usuario/empresa', description: 'Prueba de desactivación de usuario o empresa.' },
  { id: 'test_restore_user_company.py', name: 'Restaurar usuario/empresa', description: 'Prueba de restauración de usuario o empresa.' },
  { id: 'test_create_property.py', name: 'Crear Copropiedad', description: 'Prueba de creación de copropiedad.' },
  { id: 'test_edit_property.py', name: 'Editar Copropiedad', description: 'Prueba de edición de copropiedad.' },
  { id: 'test_deactivate_property.py', name: 'Desactivar Copropiedad', description: 'Prueba de desactivación de copropiedad.' },
];

const API_URL = '/api/tests/execute';
const API_TOKEN = 'valid_token'; // Token fijo para pruebas

export const AutomationRunnerPage = () => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, 'success' | 'error' | null>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleRun = async (id: string) => {
    console.log('Enviando ejecución:', { test_file: id });
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
        setResults(prev => ({ ...prev, [id]: 'error' }));
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        return;
      }

      // Intentar parsear JSON solo si la respuesta es exitosa
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        setResults(prev => ({ ...prev, [id]: 'error' }));
        setSnackbar({ open: true, message: 'Error: Respuesta inválida del servidor', severity: 'error' });
        return;
      }

      if (data.status === 'started') {
        setResults(prev => ({ ...prev, [id]: 'success' }));
        setSnackbar({ open: true, message: 'Ejecución iniciada correctamente', severity: 'success' });
      } else {
        setResults(prev => ({ ...prev, [id]: 'error' }));
        setSnackbar({ open: true, message: data.message || 'Error al iniciar la ejecución', severity: 'error' });
      }
    } catch (error: any) {
      console.error('Error en handleRun:', error);
      setResults(prev => ({ ...prev, [id]: 'error' }));
      const errorMessage = error.message || 'Error de conexión. Verifica que el servidor backend esté corriendo en el puerto 9000.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setRunningId(null);
    }
  };

  return (
    <Box sx={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Automatización
      </Typography>
      
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
                    <IconButton edge="end" color="primary" onClick={() => handleRun(caso.id)}>
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