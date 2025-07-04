import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, CircularProgress, List, ListItem, ListItemText, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// Casos automatizados simulados
const automatedCases = [
  { id: 'auto-1', name: 'Login exitoso', description: 'Prueba de login con credenciales válidas.' },
  { id: 'auto-2', name: 'Registro de usuario', description: 'Prueba de registro con datos válidos.' },
  { id: 'auto-3', name: 'Búsqueda de producto', description: 'Prueba de búsqueda en el catálogo.' },
];

export const AutomationRunnerPage = () => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, 'success' | 'error' | null>>({});

  const handleRun = (id: string) => {
    setRunningId(id);
    setResults(prev => ({ ...prev, [id]: null }));
    // Simulación de llamada al backend
    setTimeout(() => {
      // Simula éxito o error aleatorio
      const isSuccess = Math.random() > 0.3;
      setResults(prev => ({ ...prev, [id]: isSuccess ? 'success' : 'error' }));
      setRunningId(null);
    }, 2000);
  };

  return (
    <Box sx={{ padding: '20px', maxWidth: 700, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Automatización
      </Typography>
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
  );
}; 