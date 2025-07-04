import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, List, ListItem, ListItemText, IconButton, Snackbar, Alert } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// Casos automatizados simulados
const automatedCases = [
  { id: 'test_create_user.py', name: 'Crear usuario', description: 'Prueba de creación de usuario.' },
  { id: 'test_create_visitor.py', name: 'Crear visitante', description: 'Prueba de creación de visitante.' },
  { id: 'test_create_company.py', name: 'Crear empresa', description: 'Prueba de creación de empresa.' },
];

const API_URL = 'http://localhost:8000/tests/execute';
const API_TOKEN = 'valid_token'; // Token fijo para pruebas

export const AutomationRunnerPage = () => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, 'success' | 'error' | null>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleRun = async (id: string) => {
    setRunningId(id);
    setResults(prev => ({ ...prev, [id]: null }));
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        },
        body: JSON.stringify({ test_file: id })
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