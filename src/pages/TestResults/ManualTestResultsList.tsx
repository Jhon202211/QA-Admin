import {
  List,
  Datagrid,
  TextField,
  DateField,
  FunctionField,
  SelectInput,
  TextInput,
  ExportButton,
  TopToolbar,
  FilterButton,
} from 'react-admin';
import { Chip } from '@mui/material';

export const ManualTestResultsList = () => {

  // Filtros
  const filters = [
    <TextInput label="Buscar por nombre" source="name" alwaysOn />,
    <TextInput label="Buscar por proyecto" source="testProject" alwaysOn />,
    <SelectInput
      label="Categoría"
      source="category"
      choices={[
        { id: 'Smoke', name: 'Smoke' },
        { id: 'Funcionales', name: 'Funcionales' },
        { id: 'No Funcionales', name: 'No Funcionales' },
        { id: 'Regresión', name: 'Regresión' },
        { id: 'UAT', name: 'UAT' }
      ]}
      alwaysOn
    />,
    <SelectInput
      label="Resultado de ejecución"
      source="executionResult"
      choices={[
        { id: 'passed', name: 'Aprobado' },
        { id: 'failed', name: 'Fallido' },
        { id: 'blocked', name: 'Bloqueado' },
        { id: 'not_executed', name: 'No ejecutado' }
      ]}
      alwaysOn
    />,
    <SelectInput
      label="Prioridad"
      source="priority"
      choices={[
        { id: 'Alta', name: 'Alta' },
        { id: 'Media', name: 'Media' },
        { id: 'Baja', name: 'Baja' }
      ]}
      alwaysOn
    />
  ];

  const ListActions = () => (
    <TopToolbar>
      <FilterButton />
      <ExportButton />
    </TopToolbar>
  );

  return (
    <List
      filters={filters}
      actions={<ListActions />}
      sort={{ field: 'updatedAt', order: 'DESC' }}
    >
      <Datagrid>
        <TextField source="caseKey" label="ID" />
        <TextField source="name" label="Nombre" />
        <TextField source="testProject" label="Proyecto" />
        <TextField source="category" label="Categoría" />
        <FunctionField
          label="Resultado de ejecución"
          render={record => (
            <Chip
              label={
                record.executionResult === 'passed' ? 'Aprobado' :
                record.executionResult === 'failed' ? 'Fallido' :
                record.executionResult === 'blocked' ? 'Bloqueado' :
                record.executionResult === 'not_executed' ? 'No ejecutado' : record.executionResult || 'No ejecutado'
              }
              sx={{
                backgroundColor:
                  record.executionResult === 'passed' ? '#4caf50' :
                  record.executionResult === 'failed' ? '#E53935' :
                  record.executionResult === 'blocked' ? '#ff9800' :
                  '#bdbdbd',
                color: '#fff',
                fontWeight: 600
              }}
            />
          )}
        />
        <FunctionField
          label="Prioridad"
          render={record => (
            <Chip
              label={record.priority || 'Sin prioridad'}
              sx={{
                backgroundColor:
                  record.priority === 'Alta' ? '#E53935' :
                  record.priority === 'Media' ? '#ff9800' :
                  record.priority === 'Baja' ? '#4caf50' : '#bdbdbd',
                color: '#fff',
                fontWeight: 600
              }}
            />
          )}
        />
        <TextField source="responsible" label="Responsable" />
        <DateField source="updatedAt" label="Última actualización" />
      </Datagrid>
    </List>
  );
};

