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
  Edit,
  ArrayInput,
  SimpleFormIterator,
  FileInput,
  FileField
} from 'react-admin';
import { Box, Typography } from '@mui/material';
import { RichTextInput } from 'ra-input-rich-text';

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
  <Box sx={{ padding: '20px' }}>
    <Typography variant="h4" gutterBottom>
      Casos de Prueba
    </Typography>
    <List
      actions={<ListActions />}
      empty={<Empty />}
      filters={caseFilters}
    >
      <Datagrid>
        <TextField source="caseKey" label="ID" />
        <TextField source="name" label="Nombre" />
        <TextField source="description" label="Descripción" />
        <ChipField source="priority" label="Prioridad" />
        <TextField source="status" label="Estado" />
        <TextField source="module" label="Módulo" />
        <TextField source="responsible" label="Responsable" />
        <TextField source="executionResult" label="Resultado de ejecución" />
        <DateField source="updatedAt" label="Última actualización" />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  </Box>
);

export const TestCaseCreate = (props: any) => (
  <Create {...props} title="Nuevo Caso de Prueba" redirect="list">
    <SimpleForm>
      <TextInput source="caseKey" label="ID (ej: CP001)" fullWidth />
      <TextInput source="name" label="Nombre" fullWidth required />
      <TextInput source="description" label="Descripción" multiline fullWidth />
      <TextInput source="prerequisites" label="Precondiciones" multiline fullWidth />
      <TextInput source="testData" label="Datos de prueba" multiline fullWidth />
      <TextInput source="expectedResult" label="Resultado esperado" multiline fullWidth />
      <TextInput source="actualResult" label="Resultado real" multiline fullWidth />
      <TextInput source="module" label="Módulo o funcionalidad" fullWidth />
      <TextInput source="responsible" label="Responsable" fullWidth />
      <SelectInput source="executionResult" label="Resultado de ejecución" choices={[
        { id: 'passed', name: 'Aprobado' },
        { id: 'failed', name: 'Fallido' },
        { id: 'blocked', name: 'Bloqueado' },
        { id: 'not_executed', name: 'No ejecutado' },
      ]} />
      <TextInput source="notes" label="Notas adicionales" multiline fullWidth />
      <FileInput source="attachments" label="Evidencias adjuntas" multiple>
        <FileField source="src" title="title" />
      </FileInput>
      <ArrayInput source="steps" label="Pasos del caso de prueba">
        <SimpleFormIterator>
          <RichTextInput source="description" label="Descripción del paso (puedes usar viñetas y numeración)" fullWidth />
          <TextInput source="expectedResult" label="Resultado esperado" fullWidth />
          <TextInput source="actualResult" label="Resultado real" fullWidth />
          <SelectInput source="status" label="Estado" choices={[
            { id: 'passed', name: 'Aprobado' },
            { id: 'failed', name: 'Fallido' },
            { id: 'blocked', name: 'Bloqueado' },
            { id: 'not_executed', name: 'No ejecutado' },
          ]} />
          <FileInput source="evidences" label="Evidencias del paso" multiple>
            <FileField source="src" title="title" />
          </FileInput>
        </SimpleFormIterator>
      </ArrayInput>
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
      <TextInput source="caseKey" label="ID (ej: CP001)" fullWidth />
      <TextInput source="name" label="Nombre" fullWidth required />
      <TextInput source="description" label="Descripción" multiline fullWidth />
      <TextInput source="prerequisites" label="Precondiciones" multiline fullWidth />
      <TextInput source="testData" label="Datos de prueba" multiline fullWidth />
      <TextInput source="expectedResult" label="Resultado esperado" multiline fullWidth />
      <TextInput source="actualResult" label="Resultado real" multiline fullWidth />
      <TextInput source="module" label="Módulo o funcionalidad" fullWidth />
      <TextInput source="responsible" label="Responsable" fullWidth />
      <SelectInput source="executionResult" label="Resultado de ejecución" choices={[
        { id: 'passed', name: 'Aprobado' },
        { id: 'failed', name: 'Fallido' },
        { id: 'blocked', name: 'Bloqueado' },
        { id: 'not_executed', name: 'No ejecutado' },
      ]} />
      <TextInput source="notes" label="Notas adicionales" multiline fullWidth />
      <FileInput source="attachments" label="Evidencias adjuntas" multiple>
        <FileField source="src" title="title" />
      </FileInput>
      <ArrayInput source="steps" label="Pasos del caso de prueba">
        <SimpleFormIterator>
          <RichTextInput source="description" label="Descripción del paso (puedes usar viñetas y numeración)" fullWidth />
          <TextInput source="expectedResult" label="Resultado esperado" fullWidth />
          <TextInput source="actualResult" label="Resultado real" fullWidth />
          <SelectInput source="status" label="Estado" choices={[
            { id: 'passed', name: 'Aprobado' },
            { id: 'failed', name: 'Fallido' },
            { id: 'blocked', name: 'Bloqueado' },
            { id: 'not_executed', name: 'No ejecutado' },
          ]} />
          <FileInput source="evidences" label="Evidencias del paso" multiple>
            <FileField source="src" title="title" />
          </FileInput>
        </SimpleFormIterator>
      </ArrayInput>
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