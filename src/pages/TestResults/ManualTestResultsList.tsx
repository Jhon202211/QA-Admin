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
import { getExecutionColor, getExecutionLabel, getPriorityColor, getPriorityLabel } from '../../components/TestCases/testCaseUi';

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
        { id: 'retest', name: 'Retest' },
        { id: 'in_progress', name: 'En progreso' },
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
              label={getExecutionLabel(record.executionResult)}
              sx={{
                backgroundColor: getExecutionColor(record.executionResult),
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
              label={getPriorityLabel(record.priority)}
              sx={{
                backgroundColor: getPriorityColor(record.priority),
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

