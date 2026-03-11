import { Box, Chip, Typography } from '@mui/material';
import {
  Create,
  CreateButton,
  Datagrid,
  DateField,
  DateInput,
  DeleteButton,
  Edit,
  EditButton,
  FilterButton,
  FunctionField,
  List,
  NumberField,
  NumberInput,
  SelectInput,
  SimpleForm,
  TextField,
  TextInput,
  TopToolbar,
  required,
} from 'react-admin';
import {
  CAUSE_TYPE_CHOICES,
  CONTROL_SCOPE_CHOICES,
  SEVERITY_CHOICES,
  STATUS_CHOICES,
  getCauseTypeLabel,
  getControlScopeLabel,
  getSeverityLabel,
  getStatusLabel,
} from './reliabilityUtils';

const incidentFilters = [
  <TextInput key="system" source="system" label="Sistema" alwaysOn />,
  <TextInput key="subsystem" source="subsystem" label="Subsistema" />,
  <SelectInput key="causeType" source="causeType" label="Causa" choices={CAUSE_TYPE_CHOICES} />,
  <SelectInput key="controlScope" source="controlScope" label="Alcance" choices={CONTROL_SCOPE_CHOICES} />,
  <SelectInput key="status" source="status" label="Estado" choices={STATUS_CHOICES} />,
];

const ListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
  </TopToolbar>
);

const Empty = () => (
  <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', px: 3 }}>
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        No hay incidentes registrados
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Usa este listado para registrar caídas, degradaciones y fallos por causa o subsistema.
      </Typography>
      <CreateButton />
    </Box>
  </Box>
);

export const SystemIncidentsPage = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: 'Inter, sans-serif', mb: 2 }}>
      Incidentes
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
      Registro central de eventos de reliability para QA, con clasificación por causa, alcance e impacto.
    </Typography>
    <List
      actions={<ListActions />}
      filters={incidentFilters}
      empty={<Empty />}
      sort={{ field: 'date', order: 'DESC' }}
      perPage={25}
      sx={{
        '& .RaList-content': {
          background: 'transparent',
          boxShadow: 'none',
        },
      }}
    >
      <Datagrid bulkActionButtons={false} rowClick="edit">
        <DateField source="date" label="Fecha" />
        <TextField source="system" label="Sistema" />
        <TextField source="subsystem" label="Subsistema" />
        <TextField source="description" label="Descripción" />
        <FunctionField
          label="Causa"
          render={(record: any) => getCauseTypeLabel(record?.causeType)}
        />
        <FunctionField
          label="Alcance"
          render={(record: any) => getControlScopeLabel(record?.controlScope)}
        />
        <NumberField source="durationMin" label="Duración (min)" />
        <FunctionField
          label="Severidad"
          render={(record: any) => getSeverityLabel(record?.severity)}
        />
        <FunctionField
          label="Estado"
          render={(record: any) => (
            <Chip
              label={getStatusLabel(record?.status)}
              size="small"
              color={record?.status === 'resolved' ? 'success' : record?.status === 'investigating' ? 'warning' : 'default'}
            />
          )}
        />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  </Box>
);

const IncidentForm = () => (
  <SimpleForm>
    <DateInput source="date" label="Fecha del incidente" validate={[required()]} />
    <TextInput source="system" label="Sistema" validate={[required()]} fullWidth />
    <TextInput source="subsystem" label="Subsistema" fullWidth />
    <SelectInput source="causeType" label="Tipo de causa" choices={CAUSE_TYPE_CHOICES} validate={[required()]} />
    <SelectInput source="controlScope" label="Alcance" choices={CONTROL_SCOPE_CHOICES} validate={[required()]} />
    <SelectInput source="severity" label="Severidad" choices={SEVERITY_CHOICES} validate={[required()]} />
    <SelectInput source="status" label="Estado" choices={STATUS_CHOICES} validate={[required()]} />
    <NumberInput source="durationMin" label="Duración en minutos" min={0} validate={[required()]} />
    <TextInput source="owner" label="Responsable" fullWidth />
    <TextInput source="description" label="Descripción" multiline fullWidth validate={[required()]} />
    <TextInput source="rootCause" label="Causa raíz / notas" multiline fullWidth />
  </SimpleForm>
);

export const SystemIncidentCreate = (props: any) => (
  <Create {...props} title="Nuevo incidente" redirect="list">
    <IncidentForm />
  </Create>
);

export const SystemIncidentEdit = (props: any) => (
  <Edit {...props} title="Editar incidente">
    <IncidentForm />
  </Edit>
);
