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

export const TestResultsList = () => (
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
); 