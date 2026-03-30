import { useState } from 'react';
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Divider,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useCreate, useNotify } from 'react-admin';

type TestCaseCategory = 'Smoke' | 'Funcionales' | 'No Funcionales' | 'Regresión' | 'UAT' | 'Integración' | 'Unitarias' | 'Exploratorias';

interface StepItem {
  id: string;
  order: number;
  description: string;
  expectedResult: string;
}

// ── Step 1: Proyecto ──────────────────────────────────────────────────────────
const Step1Project = ({ formData, setFormData, isReadOnly }: any) => (
  <Box sx={{ mt: 2 }}>
    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
      Paso 1: Proyecto
    </Typography>
    <TextField
      fullWidth
      label="Nombre del Proyecto"
      value={formData.testProject || ''}
      onChange={(e) => setFormData({ ...formData, testProject: e.target.value })}
      required
      disabled={isReadOnly}
      sx={{ mb: 2 }}
      placeholder="Ej: Sistema de Reservas"
    />
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      Este será el proyecto principal que agrupará todos los casos de prueba relacionados.
    </Typography>
  </Box>
);

// ── Step 2: Categoría ─────────────────────────────────────────────────────────
const Step2Category = ({ formData, setFormData, isReadOnly }: any) => (
  <Box sx={{ mt: 2 }}>
    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
      Paso 2: Tipo de Prueba
    </Typography>
    <FormControl fullWidth sx={{ mb: 2 }} disabled={isReadOnly}>
      <InputLabel>Tipo de Prueba</InputLabel>
      <Select
        value={formData.category || ''}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        label="Tipo de Prueba"
        required
      >
        <MenuItem value="Smoke">Smoke</MenuItem>
        <MenuItem value="Funcionales">Funcionales</MenuItem>
        <MenuItem value="No Funcionales">No Funcionales</MenuItem>
        <MenuItem value="Regresión">Regresión</MenuItem>
        <MenuItem value="UAT">UAT</MenuItem>
        <MenuItem value="Integración">Integración</MenuItem>
        <MenuItem value="Unitarias">Unitarias</MenuItem>
        <MenuItem value="Exploratorias">Exploratorias</MenuItem>
      </Select>
    </FormControl>
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      Selecciona el tipo de prueba que mejor describe este caso.
    </Typography>
  </Box>
);

// ── Step 3: Detalles del caso ─────────────────────────────────────────────────
const Step3TestCase = ({ formData, setFormData }: any) => (
  <Box sx={{ mt: 2 }}>
    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
      Paso 3: Detalles del Caso de Prueba
    </Typography>
    <TextField
      fullWidth
      label="Módulo / Feature (Opcional)"
      value={formData.module || ''}
      onChange={(e) => setFormData({ ...formData, module: e.target.value })}
      sx={{ mb: 2 }}
      placeholder="Ej: Accesos, Reservas, Pagos"
    />
    <TextField
      fullWidth
      label="Submódulo / Flujo (Opcional)"
      value={formData.submodule || ''}
      onChange={(e) => setFormData({ ...formData, submodule: e.target.value })}
      sx={{ mb: 2 }}
      placeholder="Ej: Acceso QR, Reserva de sala"
    />
    <TextField
      fullWidth
      label="ID del Caso (se genera automáticamente si lo dejas vacío)"
      value={formData.caseKey || ''}
      onChange={(e) => setFormData({ ...formData, caseKey: e.target.value })}
      sx={{ mb: 2 }}
      placeholder="CP001"
    />
    <TextField
      fullWidth
      label="Nombre del Caso de Prueba *"
      value={formData.name || ''}
      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      required
      sx={{ mb: 2 }}
      placeholder="Ej: Verificar login de usuario"
    />
    <TextField
      fullWidth
      label="Descripción"
      value={formData.description || ''}
      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      multiline
      rows={2}
      sx={{ mb: 2 }}
      placeholder="Describe el caso de prueba..."
    />
    <TextField
      fullWidth
      label="Precondiciones"
      value={formData.prerequisites || ''}
      onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
      multiline
      rows={2}
      sx={{ mb: 2 }}
      placeholder="Ej: Usuario autenticado, datos de prueba cargados..."
    />
    <TextField
      fullWidth
      label="Resultado Esperado General"
      value={formData.expectedResult || ''}
      onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
      multiline
      rows={2}
      sx={{ mb: 2 }}
      placeholder="Ej: El sistema muestra el mensaje de confirmación..."
    />
    <FormControl fullWidth sx={{ mb: 2 }}>
      <InputLabel>Prioridad</InputLabel>
      <Select
        value={formData.priority || 'Media'}
        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
        label="Prioridad"
      >
        <MenuItem value="Alta">Alta</MenuItem>
        <MenuItem value="Media">Media</MenuItem>
        <MenuItem value="Baja">Baja</MenuItem>
      </Select>
    </FormControl>
    <TextField
      fullWidth
      label="Responsable (Opcional)"
      value={formData.responsible || ''}
      onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
      sx={{ mb: 2 }}
      placeholder="Nombre del QA responsable"
    />
  </Box>
);

// ── Step 4: Pasos de prueba ───────────────────────────────────────────────────
const Step4Steps = ({ steps, setSteps }: { steps: StepItem[]; setSteps: (s: StepItem[]) => void }) => {
  const handleAddStep = () => {
    const newStep: StepItem = {
      id: `step-${Date.now()}`,
      order: steps.length + 1,
      description: '',
      expectedResult: '',
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    const updated = steps
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(updated);
  };

  const handleChange = (id: string, field: keyof StepItem, value: string) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ color: 'text.primary' }}>
          Paso 4: Pasos del Caso de Prueba
        </Typography>
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
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Sin pasos todavía
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Haz clic en "Agregar paso" para definir los pasos de ejecución
          </Typography>
        </Box>
      )}

      {steps.map((step, index) => (
        <Box
          key={step.id}
          sx={{
            mb: 2,
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.paper',
          }}
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
          <TextField
            fullWidth
            label="Descripción del paso *"
            value={step.description}
            onChange={(e) => handleChange(step.id, 'description', e.target.value)}
            multiline
            rows={2}
            sx={{ mb: 1.5 }}
            placeholder="Ej: Navegar a la pantalla de login e ingresar credenciales válidas"
          />
          <TextField
            fullWidth
            label="Resultado esperado"
            value={step.expectedResult}
            onChange={(e) => handleChange(step.id, 'expectedResult', e.target.value)}
            multiline
            rows={2}
            placeholder="Ej: El sistema muestra el dashboard del usuario"
          />
        </Box>
      ))}
    </Box>
  );
};

// ── Wizard principal ──────────────────────────────────────────────────────────
const WIZARD_STEPS = ['Proyecto', 'Categoría', 'Caso de Prueba', 'Pasos'];

const EMPTY_FORM = (initialProject = '', initialCategory = '') => ({
  testProject: initialProject,
  module: '',
  submodule: '',
  category: initialCategory,
  caseKey: '',
  name: '',
  description: '',
  prerequisites: '',
  expectedResult: '',
  responsible: '',
  priority: 'Media',
  executionResult: 'not_executed',
  status: 'Activo',
});

interface CreateTestCaseWizardProps {
  open: boolean;
  onClose: () => void;
  initialProject?: string;
  initialCategory?: TestCaseCategory;
}

export const CreateTestCaseWizard = ({
  open,
  onClose,
  initialProject,
  initialCategory,
}: CreateTestCaseWizardProps) => {
  const theme = useTheme();

  const getInitialStep = () => {
    if (initialProject && initialCategory) return 2;
    if (initialProject) return 1;
    return 0;
  };

  const [activeStep, setActiveStep] = useState(getInitialStep());
  const [formData, setFormData] = useState(EMPTY_FORM(initialProject, initialCategory));
  const [testSteps, setTestSteps] = useState<StepItem[]>([]);
  const [create] = useCreate();
  const notify = useNotify();

  React.useEffect(() => {
    if (open) {
      setActiveStep(getInitialStep());
      setFormData(EMPTY_FORM(initialProject, initialCategory));
      setTestSteps([]);
    }
  }, [open, initialProject, initialCategory]);

  const handleNext = () => {
    if (activeStep === 0 && !formData.testProject.trim()) {
      notify('Por favor ingresa un nombre de proyecto', { type: 'warning' });
      return;
    }
    if (activeStep === 1 && !formData.category) {
      notify('Por favor selecciona una categoría', { type: 'warning' });
      return;
    }
    if (activeStep === 2 && !formData.name.trim()) {
      notify('Por favor ingresa un nombre para el caso de prueba', { type: 'warning' });
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleFinish = async () => {
    if (!formData.name.trim()) {
      notify('Por favor ingresa un nombre para el caso de prueba', { type: 'warning' });
      return;
    }

    const stepsWithValidation = testSteps.filter((s) => s.description.trim());
    if (testSteps.length > 0 && stepsWithValidation.length < testSteps.length) {
      notify('Algunos pasos no tienen descripción. Completa o elimínalos.', { type: 'warning' });
      return;
    }

    try {
      await create('test_cases', {
        data: {
          ...formData,
          steps: stepsWithValidation,
          tags: [],
          createdBy: 'manual',
          version: 1,
          estimatedDuration: 0,
          automated: false,
        },
      });
      notify('Caso de prueba creado exitosamente', { type: 'success' });
      handleClose();
    } catch {
      notify('Error al crear el caso de prueba', { type: 'error' });
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFormData(EMPTY_FORM(initialProject, initialCategory));
    setTestSteps([]);
    onClose();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <Step1Project formData={formData} setFormData={setFormData} isReadOnly={!!initialProject} />;
      case 1:
        return <Step2Category formData={formData} setFormData={setFormData} isReadOnly={!!initialCategory} />;
      case 2:
        return <Step3TestCase formData={formData} setFormData={setFormData} />;
      case 3:
        return <Step4Steps steps={testSteps} setSteps={setTestSteps} />;
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.mode === 'dark' ? '#2B2D42' : '#FFFFFF',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ color: 'text.primary', fontWeight: 600 }}>
        Crear Nuevo Caso de Prueba
      </DialogTitle>
      <DialogContent sx={{ overflowY: 'auto' }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
          {WIZARD_STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {renderStepContent(activeStep)}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>
          Cancelar
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {activeStep > (initialProject && initialCategory ? 2 : initialProject ? 1 : 0) && (
          <Button onClick={handleBack} sx={{ color: 'text.primary' }}>
            Atrás
          </Button>
        )}
        {activeStep < WIZARD_STEPS.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            sx={{ backgroundColor: '#FF6B35', color: '#FFFFFF', '&:hover': { backgroundColor: '#E55A2B' } }}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            variant="contained"
            sx={{ backgroundColor: '#FF6B35', color: '#FFFFFF', '&:hover': { backgroundColor: '#E55A2B' } }}
          >
            Crear Caso de Prueba
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
