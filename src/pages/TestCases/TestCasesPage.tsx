import {
  List,
  Datagrid,
  TextField,
  ChipField,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterButton
} from 'react-admin';
import { Box, Typography } from '@mui/material';

const Empty = () => (
  <Box textAlign="center" m={2}>
    <Typography variant="h5" paragraph>
      No hay casos de prueba
    </Typography>
    <Typography variant="body1">
      Crea tu primer caso de prueba para empezar a organizar tu testing.
    </Typography>
    <CreateButton />
  </Box>
);

const ListActions = () => (
    <TopToolbar>
        <FilterButton/>
        <CreateButton/>
        <ExportButton/>
    </TopToolbar>
);

export const TestCasesPage = () => (
  <List actions={<ListActions />} empty={<Empty />} title="Casos de Prueba">
    <Datagrid>
      <TextField source="id" label="ID" />
      <TextField source="name" label="Nombre" />
      <TextField source="description" label="Descripción" />
      <ChipField source="priority" label="Prioridad" />
    </Datagrid>
  </List>
); 