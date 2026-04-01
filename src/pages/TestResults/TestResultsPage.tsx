import { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  TextInput,
  SelectInput,
  ExportButton,
  FunctionField,
  useGetList,
} from 'react-admin';
import { 
  Typography, 
  Chip, 
  Box, 
  Card, 
  CardContent, 
  Divider, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Componente de Detalle dentro de un Modal
const TestResultDetailModal = ({ open, onClose, record }: { open: boolean, onClose: () => void, record: any }) => {
  if (!record) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>Detalles de la Ejecución</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="textSecondary">Nombre del Test</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{record.name}</Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="textSecondary">Fecha de Ejecución</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {record.date ? new Date(record.date).toLocaleString() : '-'}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="textSecondary">Estado</Typography>
              <Chip
                label={record.status === 'passed' ? 'EXITOSO' : 'FALLIDO'}
                sx={{
                  backgroundColor: record.status === 'passed' ? '#4caf50' : '#e53935',
                  color: '#fff',
                  fontWeight: 700,
                  width: '100%',
                  mt: 1
                }}
              />
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="textSecondary">Duración</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{record.duration || 0}</Typography>
                <Typography variant="body2" color="textSecondary">segundos</Typography>
              </Box>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="textSecondary">Tipo de Ejecución</Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {record.executionType === 'automated' ? 'Automatizada' : 'Manual'}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {record.status === 'failed' && (
          <Card sx={{ bgcolor: '#fff5f5', border: '1px solid #feb2b2', mt: 2, mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="error" gutterBottom>Error Detectado:</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {record.error || 'No se capturó un mensaje de error específico.'}
              </Typography>
            </CardContent>
          </Card>
        )}

        {record.screenshotUrl && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Evidencia del Error</Typography>
            <Card variant="outlined">
              <img 
                src={record.screenshotUrl} 
                alt="Screenshot del error" 
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }} 
              />
            </Card>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const TestResultsList = ({ hideTitle = false }: { hideTitle?: boolean }) => {
  const { data: plans = [] } = useGetList('test_planning');
  const planIdToName = Object.fromEntries((plans || []).map((p: any) => [p.id, p.name]));
  
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (_id: any, _resource: string, record: any) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
    return false as const; // Evita la navegación por defecto
  };

  const filters = [
    <TextInput label="Nombre" source="name" alwaysOn />,
    <SelectInput
      label="Plan de Pruebas"
      source="planId"
      choices={plans.map((p: any) => ({ id: p.id, name: p.name }))}
      alwaysOn
    />,
    <SelectInput
      label="Estado"
      source="status"
      choices={[
        { id: 'passed', name: 'Pasó' },
        { id: 'failed', name: 'Falló' }
      ]}
      alwaysOn
    />
  ];

  return (
    <Box sx={{ paddingTop: hideTitle ? 0 : '20px', paddingRight: '20px', paddingBottom: '20px', paddingLeft: 0 }}>
      {!hideTitle && (
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3, fontFamily: "'Ubuntu Sans', sans-serif" }}>
          Resultados
        </Typography>
      )}
      <List 
        filters={filters} 
        actions={<ExportButton />} 
        sort={{ field: 'date', order: 'DESC' }} 
        resource="test_results"
        component="div"
      >
        <Datagrid 
          rowClick={handleRowClick} 
          sx={{
            '& .MuiTableCell-head': { 
              backgroundColor: '#f5f5f5', 
              fontWeight: 700,
              padding: '12px 16px'
            },
            '& .MuiTableRow-root': {
              backgroundColor: '#ffffff',
            },
            '& .MuiTableRow-root:hover': { 
              backgroundColor: '#f9f9f9' 
            },
            '& .MuiTableCell-root': {
              padding: '12px 16px',
              borderBottom: '1px solid #e0e0e0'
            },
            '& .MuiTable-root': {
              borderCollapse: 'collapse'
            }
          }}
        >
          <TextField source="name" label="Nombre" />
          <DateField source="date" label="Fecha" showTime />
          <FunctionField
            label="Plan de Pruebas"
            render={record => record ? (planIdToName[record.planId] || record.planId || '-') : '-'}
          />
          <FunctionField
            label="Tipo"
            render={record => record && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {record.executionType === 'automated' ? '🤖' : '👤'}
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  {record.executionType === 'automated' ? 'Automático' : 'Manual'}
                </Typography>
              </Box>
            )}
          />
          <FunctionField
            label="Estado"
            render={record => record ? (
              <Chip
                label={record.status === 'passed' ? 'Pasó' : 'Falló'}
                size="small"
                variant="filled"
                sx={{
                  backgroundColor: record.status === 'passed' ? '#4caf50' : '#f44336',
                  color: '#fff',
                  fontWeight: 600,
                  borderRadius: '16px',
                  height: '24px',
                  '& .MuiChip-label': { px: 1.5, fontSize: '0.75rem' }
                }}
              />
            ) : null}
          />
          <TextField source="duration" label="Duración (s)" />
        </Datagrid>
      </List>

      <TestResultDetailModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        record={selectedRecord}
      />
    </Box>
  );
};

// Mantenemos estos por compatibilidad con Resource si se usan fuera, pero el flujo principal ahora es el Modal
export const TestResultShow = () => null;
export const TestResultEdit = () => null;
