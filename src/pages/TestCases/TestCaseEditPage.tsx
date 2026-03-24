import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGetOne, useUpdate, useNotify } from 'react-admin';
import { useParams, useNavigate } from 'react-router-dom';

interface StepItem {
  id: string;
  order: number;
  description: string;
  expectedResult: string;
}

const PRIORITY_CHOICES = ['Alta', 'Media', 'Baja'];
const STATUS_CHOICES = ['Activo', 'Inactivo'];
const CATEGORY_CHOICES = ['Smoke', 'Funcionales', 'No Funcionales', 'Regresión', 'UAT'];
const EXECUTION_CHOICES = [
  { id: 'not_executed', label: 'No ejecutado' },
  { id: 'passed', label: 'Aprobado' },
  { id: 'failed', label: 'Fallido' },
  { id: 'blocked', label: 'Bloqueado' },
  { id: 'in_progress', label: 'En progreso' },
];

const sectionTitle = (text: string) => (
  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#FF6B35', mb: 2, mt: 1 }}>
    {text}
  </Typography>
);

export const TestCaseEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const [update, { isPending }] = useUpdate();

  const { data, isLoading } = useGetOne('test_cases', { id: id! });

  const [form, setForm] = useState<any>(null);
  const [steps, setSteps] = useState<StepItem[]>([]);

  useEffect(() => {
    if (data) {
      setForm({ ...data });
      setSteps(
        (data.steps || []).map((s: any, i: number) => ({
          id: s.id || `step-${i}`,
          order: s.order || i + 1,
          description: s.description || '',
          expectedResult: s.expectedResult || '',
        }))
      );
    }
  }, [data]);

  const setField = (field: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [field]: value }));

  // ── Pasos ──────────────────────────────────────────────────────────────────
  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { id: `step-${Date.now()}`, order: prev.length + 1, description: '', expectedResult: '' },
    ]);
  };

  const handleRemoveStep = (stepId: string) => {
    setSteps((prev) =>
      prev.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 }))
    );
  };

  const handleStepChange = (stepId: string, field: keyof StepItem, value: string) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)));
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form?.name?.trim()) {
      notify('El nombre del caso es obligatorio', { type: 'warning' });
      return;
    }
    const invalidSteps = steps.filter((s) => !s.description.trim());
    if (invalidSteps.length > 0) {
      notify('Todos los pasos deben tener descripción', { type: 'warning' });
      return;
    }

    try {
      await update('test_cases', {
        id: id!,
        data: { ...form, steps },
        previousData: data,
      });
      notify('Caso de prueba actualizado', { type: 'success' });
      navigate('/test_cases');
    } catch {
      notify('Error al guardar los cambios', { type: 'error' });
    }
  };

  if (isLoading || !form) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 3, width: '100%', maxWidth: '100%' }}>
      <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/test_cases')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: "'Ubuntu Sans', sans-serif" }}>
            Editar Caso de Prueba
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isPending}
          sx={{ backgroundColor: '#FF6B35', color: '#fff', textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#E55A2B' } }}
        >
          Guardar cambios
        </Button>
      </Box>

      {/* Sección: Información básica */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {sectionTitle('Información básica')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(280px, 1fr))', xl: 'repeat(3, minmax(220px, 1fr))' }, gap: 2 }}>
            <TextField
              label="Proyecto de Prueba *"
              value={form.testProject || ''}
              onChange={(e) => setField('testProject', e.target.value)}
              fullWidth
            />
            <TextField
              label="ID del Caso"
              value={form.caseKey || ''}
              onChange={(e) => setField('caseKey', e.target.value)}
              fullWidth
            />
            <TextField
              label="Módulo / Feature"
              value={form.module || ''}
              onChange={(e) => setField('module', e.target.value)}
              fullWidth
            />
            <TextField
              label="Submódulo / Flujo"
              value={form.submodule || ''}
              onChange={(e) => setField('submodule', e.target.value)}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Prueba</InputLabel>
              <Select
                value={form.category || ''}
                onChange={(e) => setField('category', e.target.value)}
                label="Tipo de Prueba"
              >
                {CATEGORY_CHOICES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Prioridad</InputLabel>
              <Select
                value={form.priority || 'Media'}
                onChange={(e) => setField('priority', e.target.value)}
                label="Prioridad"
              >
                {PRIORITY_CHOICES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={form.status || 'Activo'}
                onChange={(e) => setField('status', e.target.value)}
                label="Estado"
              >
                {STATUS_CHOICES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Resultado de Ejecución</InputLabel>
              <Select
                value={form.executionResult || 'not_executed'}
                onChange={(e) => setField('executionResult', e.target.value)}
                label="Resultado de Ejecución"
              >
                {EXECUTION_CHOICES.map((e) => <MenuItem key={e.id} value={e.id}>{e.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Responsable"
              value={form.responsible || ''}
              onChange={(e) => setField('responsible', e.target.value)}
              fullWidth
            />
          </Box>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre del Caso de Prueba *"
              value={form.name || ''}
              onChange={(e) => setField('name', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Descripción"
              value={form.description || ''}
              onChange={(e) => setField('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Precondiciones"
              value={form.prerequisites || ''}
              onChange={(e) => setField('prerequisites', e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Ej: Usuario autenticado, datos de prueba cargados..."
            />
            <TextField
              label="Resultado Esperado General"
              value={form.expectedResult || ''}
              onChange={(e) => setField('expectedResult', e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Notas adicionales"
              value={form.notes || ''}
              onChange={(e) => setField('notes', e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Sección: Pasos */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            {sectionTitle('Pasos del Caso de Prueba')}
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={handleAddStep}
              sx={{ textTransform: 'none', borderColor: '#FF6B35', color: '#FF6B35', '&:hover': { borderColor: '#E55A2B', backgroundColor: 'rgba(255,107,53,0.05)' } }}
            >
              Agregar paso
            </Button>
          </Box>

          {steps.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                Sin pasos configurados
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Haz clic en "Agregar paso" para definir los pasos de ejecución
              </Typography>
            </Box>
          )}

          {steps.map((step, index) => (
            <Box
              key={step.id}
              sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, backgroundColor: 'background.paper' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#FF6B35', fontWeight: 700 }}>
                  Paso {index + 1}
                </Typography>
                <IconButton size="small" onClick={() => handleRemoveStep(step.id)} sx={{ color: '#E53935' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                <TextField
                  fullWidth
                  label="Descripción del paso *"
                  value={step.description}
                  onChange={(e) => handleStepChange(step.id, 'description', e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Ej: Navegar a la pantalla de login e ingresar credenciales válidas"
                />
                <TextField
                  fullWidth
                  label="Resultado esperado"
                  value={step.expectedResult}
                  onChange={(e) => handleStepChange(step.id, 'expectedResult', e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Ej: El sistema muestra el dashboard del usuario"
                />
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Footer */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2, flexWrap: 'wrap' }}>
        <Button onClick={() => navigate('/test_cases')} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isPending}
          sx={{ backgroundColor: '#FF6B35', color: '#fff', textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#E55A2B' } }}
        >
          Guardar cambios
        </Button>
      </Box>
      </Box>
    </Box>
  );
};
