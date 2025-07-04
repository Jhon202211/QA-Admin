import {
  List,
  Datagrid,
  TextField,
  ChipField,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterButton,
  EditButton,
  DeleteButton,
  TextInput,
  SelectInput,
  DateField,
  SimpleForm,
  Create,
  Edit
} from 'react-admin';
import { Box, Typography } from '@mui/material';

const caseFilters = [
  <TextInput label="Buscar por nombre" source="name" alwaysOn />,
  <SelectInput label="Prioridad" source="priority" choices={[
    { id: 'Alta', name: 'Alta' },
    { id: 'Media', name: 'Media' },
    { id: 'Baja', name: 'Baja' }
  ]} alwaysOn />,
];

const Empty = () => (
  <Box sx={{ minHeight: '100vh', boxSizing: 'border-box', padding: '32px 32px 0 0', margin: 0, textAlign: 'center' }}>
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
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

export const TestCasesPage = () => (
  <List
    actions={<ListActions />}
    empty={<Empty />}
    title="Casos de Prueba"
    filters={caseFilters}
  >
    <Datagrid>
      <TextField source="id" label="ID" />
      <TextField source="name" label="Nombre" />
      <TextField source="description" label="Descripción" />
      <ChipField source="priority" label="Prioridad" />
      <TextField source="status" label="Estado" />
      <DateField source="updatedAt" label="Última actualización" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const TestCaseCreate = (props: any) => (
  <Create {...props} title="Nuevo Caso de Prueba">
    <SimpleForm>
      <TextInput source="name" label="Nombre" fullWidth required />
      <TextInput source="description" label="Descripción" multiline fullWidth />
      <SelectInput source="priority" label="Prioridad" choices={[
        { id: 'Alta', name: 'Alta' },
        { id: 'Media', name: 'Media' },
        { id: 'Baja', name: 'Baja' }
      ]} required />
      <SelectInput source="status" label="Estado" choices={[
        { id: 'Activo', name: 'Activo' },
        { id: 'Inactivo', name: 'Inactivo' }
      ]} required />
    </SimpleForm>
  </Create>
);

export const TestCaseEdit = (props: any) => (
  <Edit {...props} title="Editar Caso de Prueba">
    <SimpleForm>
      <TextInput source="name" label="Nombre" fullWidth required />
      <TextInput source="description" label="Descripción" multiline fullWidth />
      <SelectInput source="priority" label="Prioridad" choices={[
        { id: 'Alta', name: 'Alta' },
        { id: 'Media', name: 'Media' },
        { id: 'Baja', name: 'Baja' }
      ]} required />
      <SelectInput source="status" label="Estado" choices={[
        { id: 'Activo', name: 'Activo' },
        { id: 'Inactivo', name: 'Inactivo' }
      ]} required />
    </SimpleForm>
  </Edit>
); 