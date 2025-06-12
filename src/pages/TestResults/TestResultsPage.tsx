import {
  List,
  Datagrid,
  TextField,
  DateField,
  BooleanField,
  ReferenceField,
  ShowButton,
  EditButton,
  DeleteButton,
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