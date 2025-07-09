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
  Show,
  SimpleShowLayout,
  Edit,
  SimpleForm,
  TextInput,
  DateInput,
  NumberInput,
  FunctionField,
  useGetList,
  SelectInput,
  ExportButton,
} from 'react-admin';
import { Typography, Chip } from '@mui/material';

const ActionsGroup = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    <ExportButton />
    <ShowButton label="Ver" />
    <EditButton label="Editar" />
    <DeleteButton label="Eliminar" />
  </div>
);

export const TestResultsList = () => {
  const { data: plans = [] } = useGetList('test_planning');
  // Mapeo rápido de id a nombre
  const planIdToName = Object.fromEntries((plans || []).map((p: any) => [p.id, p.name]));

  // Filtros
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
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Resultados
      </Typography>
      <List filters={filters} actions={<ExportButton />}>
        <Datagrid>
          <TextField source="name" label="Nombre" />
          <DateField source="date" label="Fecha" />
          <FunctionField
            label="Plan de Pruebas"
            render={record => planIdToName[record.planId] || record.planId || '-'}
          />
          <FunctionField
            label="Tipo de Ejecución"
            render={record => record.executionType === 'individual' ? 'Individual' : 'Plan'}
          />
          <FunctionField
            label="Estado"
            render={record => (
              <Chip
                label={record.status === 'passed' ? 'Pasó' : 'Falló'}
                sx={{
                  backgroundColor: record.status === 'passed' ? '#4caf50' : '#e53935',
                  color: '#fff',
                  fontWeight: 600
                }}
              />
            )}
          />
          <TextField source="duration" label="Duración (s)" />
          <TextField source="error" label="Error" />
        </Datagrid>
      </List>
    </div>
  );
};

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