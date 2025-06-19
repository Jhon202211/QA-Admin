import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import type { TestPlan, TestPlanStatus } from '../../types/testPlanning';

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

export const TestPlanningPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TestPlanStatus | ''>('');

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Planificación de Pruebas
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {/* TODO: Implementar creación */}}
        >
          Nuevo Plan de Pruebas
        </Button>
      </Box>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Buscar planes de prueba..."
          variant="outlined"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <IconButton>
          <FilterListIcon />
        </IconButton>
      </Box>

      <Grid container spacing={2}>
        {/* TODO: Implementar lista de planes de prueba */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6">
                    Sprint 23 - Testing Plan
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Plan de pruebas para el sprint 23
                  </Typography>
                </Box>
                <Box display="flex" gap={1} alignItems="center">
                  <Chip
                    label="En Progreso"
                    size="small"
                    style={{ backgroundColor: statusColors.in_progress, color: 'white' }}
                  />
                  <IconButton size="small">
                    <CalendarIcon />
                  </IconButton>
                </Box>
              </Box>
              
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Progreso</Typography>
                  <Typography variant="body2">75%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={75}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                  }}
                />
              </Box>

              <Box display="flex" gap={2} mt={2}>
                <Typography variant="body2" color="textSecondary">
                  Casos totales: 40
                </Typography>
                <Typography variant="body2" color="success.main">
                  Pasados: 30
                </Typography>
                <Typography variant="body2" color="error.main">
                  Fallidos: 5
                </Typography>
                <Typography variant="body2" color="warning.main">
                  Pendientes: 5
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TestPlanningPage; 