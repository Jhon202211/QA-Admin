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
      <TextField source="id" />
      <TextField source="name" />
      <DateField source="date" />
      <TextField source="status" />
      <TextField source="duration" />
      <TextField source="error" />
      <ShowButton />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
); 