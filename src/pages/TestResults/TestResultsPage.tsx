import {
  List,
  Datagrid,
  TextField,
  DateField,
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
} from 'react-admin';
import { Typography } from '@mui/material';

export const TestResultsList = () => (
  <div style={{ padding: '20px' }}>
    <Typography variant="h4" gutterBottom>
      Resultados
    </Typography>
    <List>
      <Datagrid>
        <TextField source="id" label="Id" />
        <TextField source="name" label="Nombre" />
        <DateField source="date" label="Fecha" />
        <TextField source="status" label="Estado" />
        <TextField source="duration" label="Duración (s)" />
        <TextField source="error" label="Error" />
        <ShowButton />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  </div>
);

export const TestResultShow = (props: any) => (
  <Show {...props}>
    <SimpleShowLayout>
      <TextField source="id" label="Id" />
      <TextField source="name" label="Nombre" />
      <DateField source="date" label="Fecha" />
      <TextField source="status" label="Estado" />
      <TextField source="duration" label="Duración (s)" />
      <TextField source="error" label="Error" />
    </SimpleShowLayout>
  </Show>
);

export const TestResultEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="name" label="Nombre" />
      <DateInput source="date" label="Fecha" />
      <TextInput source="status" label="Estado" />
      <NumberInput source="duration" label="Duración (s)" />
      <TextInput source="error" label="Error" />
    </SimpleForm>
  </Edit>
); 