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
  Edit
} from 'react-admin';
import { Box, Typography, Card, CardContent, Chip, Grid, IconButton } from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';

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
  if (isLoading) return <Typography>Cargando...</Typography>;
  if (!data || data.length === 0) return <Empty />;
  return (
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
              p: 0
            }}
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
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
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

export const TestPlanningCreate = (props: any) => (
  <Create {...props} title="Nuevo Plan de Pruebas">
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
    </SimpleForm>
  </Create>
);

export const TestPlanningEdit = (props: any) => (
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
    </SimpleForm>
  </Edit>
); 