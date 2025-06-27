import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  ShowButton,
  EditButton,
  DeleteButton,
  Show,
  SimpleShowLayout,
  Edit,
  SimpleForm,
  TextInput,
  DateInput,
  NumberInput,
  SelectInput,
  TopToolbar,
  ExportButton
} from 'react-admin';
import { Box, Typography } from '@mui/material';

const ListActions = () => (
    <TopToolbar>
        <ExportButton />
    </TopToolbar>
);

const Empty = () => (
  <Box sx={{ width: '100%', backgroundColor: '#f5f5f5', minHeight: '100vh', boxSizing: 'border-box', padding: '32px 32px 0 32px', margin: 0, textAlign: 'center' }}>
    <Typography variant="h5" paragraph>
      No hay resultados de pruebas todavía
    </Typography>
    <Typography variant="body1">
      Los resultados de las pruebas aparecerán aquí una vez que se ejecuten.
    </Typography>
  </Box>
);

export const TestResultsList = () => (
  <List actions={<ListActions />} empty={<Empty />} title="Resultados">
    <Datagrid rowClick="show">
      <TextField source="id" label="Id" />
      <TextField source="name" label="Nombre" />
      <DateField source="date" label="Fecha" />
      <TextField source="status" label="Estado" />
      <NumberField source="duration" label="Duración (s)" options={{ maximumFractionDigits: 2 }} />
      <TextField source="error" label="Error" />
      <ShowButton />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const TestResultShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" />
      <DateField source="date" />
      <TextField source="status" />
      <NumberField source="duration" options={{ maximumFractionDigits: 2 }} />
      <TextField source="error" />
    </SimpleShowLayout>
  </Show>
);

export const TestResultEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="id" disabled />
      <TextInput source="name" />
      <DateInput source="date" />
      <SelectInput source="status" choices={[
        { id: 'passed', name: 'Passed' },
        { id: 'failed', name: 'Failed' },
        { id: 'skipped', name: 'Skipped' },
      ]} />
      <NumberInput source="duration" />
      <TextInput source="error" multiline />
    </SimpleForm>
  </Edit>
); 