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
  useTheme
} from '@mui/material';
import { useCreate, useNotify } from 'react-admin';

type TestCaseCategory = 'Smoke' | 'Funcionales' | 'No Funcionales' | 'Regresión' | 'UAT';

interface WizardStepProps {
  activeStep: number;
  formData: any;
  setFormData: (data: any) => void;
  theme: any;
}

const Step1Project = ({ formData, setFormData, isReadOnly }: WizardStepProps & { isReadOnly?: boolean }) => (
  <Box sx={{ mt: 3 }}>
    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
      Paso 1: Crear o Seleccionar Proyecto
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
    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
      Este será el proyecto principal que agrupará todos los casos de prueba relacionados.
    </Typography>
  </Box>
);

const Step2Category = ({ formData, setFormData, isReadOnly }: WizardStepProps & { isReadOnly?: boolean }) => (
  <Box sx={{ mt: 3 }}>
    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
      Paso 4: Tipo de Prueba
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
      </Select>
    </FormControl>
    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
      Selecciona el tipo de prueba que mejor describe este caso.
    </Typography>
  </Box>
);

const Step3TestCase = ({ formData, setFormData }: WizardStepProps) => (
  <Box sx={{ mt: 3 }}>
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
      label="ID del Caso (ej: CP001)"
      value={formData.caseKey || ''}
      onChange={(e) => setFormData({ ...formData, caseKey: e.target.value })}
      sx={{ mb: 2 }}
      placeholder="CP001"
    />
    <TextField
      fullWidth
      label="Nombre del Caso de Prueba"
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
      rows={3}
      sx={{ mb: 2 }}
      placeholder="Describe el caso de prueba..."
    />
    <FormControl fullWidth sx={{ mb: 2 }}>
      <InputLabel>Prioridad</InputLabel>
      <Select
        value={formData.priority || ''}
        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
        label="Prioridad"
      >
        <MenuItem value="Alta">Alta</MenuItem>
        <MenuItem value="Media">Media</MenuItem>
        <MenuItem value="Baja">Baja</MenuItem>
      </Select>
    </FormControl>
  </Box>
);

const steps = ['Proyecto', 'Categoría', 'Caso de Prueba'];

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
  initialCategory 
}: CreateTestCaseWizardProps) => {
  const theme = useTheme();
  // Si hay proyecto y categoría iniciales, empezar en el paso 3 (caso de prueba)
  // Si solo hay proyecto, empezar en el paso 2 (categoría)
  // Si no hay nada, empezar en el paso 1 (proyecto)
  const getInitialStep = () => {
    if (initialProject && initialCategory) return 2;
    if (initialProject) return 1;
    return 0;
  };
  
  const [activeStep, setActiveStep] = useState(getInitialStep());
  const [formData, setFormData] = useState({
    testProject: initialProject || '',
    module: '',
    submodule: '',
    category: initialCategory || '',
    caseKey: '',
    name: '',
    description: '',
    priority: 'Media',
    executionResult: 'not_executed',
    status: 'Activo',
  });
  const [create] = useCreate();
  const notify = useNotify();

  // Resetear cuando cambian los valores iniciales
  React.useEffect(() => {
    if (open) {
      const step = initialProject && initialCategory ? 2 : initialProject ? 1 : 0;
      setActiveStep(step);
      setFormData({
        testProject: initialProject || '',
        module: '',
        submodule: '',
        category: initialCategory || '',
        caseKey: '',
        name: '',
        description: '',
        priority: 'Media',
        executionResult: 'not_executed',
        status: 'Activo',
      });
    }
  }, [open, initialProject, initialCategory]);

  const handleNext = () => {
    if (activeStep === 0 && !formData.testProject) {
      notify('Por favor ingresa un nombre de proyecto', { type: 'warning' });
      return;
    }
    if (activeStep === 1 && !formData.category) {
      notify('Por favor selecciona una categoría', { type: 'warning' });
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleFinish = async () => {
    if (!formData.name) {
      notify('Por favor ingresa un nombre para el caso de prueba', { type: 'warning' });
      return;
    }

    try {
      await create('test_cases', {
        data: formData,
      });
      notify('Caso de prueba creado exitosamente', { type: 'success' });
      handleClose();
      setActiveStep(0);
      setFormData({
        testProject: initialProject || '',
        module: '',
        submodule: '',
        category: initialCategory || '',
        caseKey: '',
        name: '',
        description: '',
        priority: 'Media',
        executionResult: 'not_executed',
        status: 'Activo',
      });
    } catch (error) {
      notify('Error al crear el caso de prueba', { type: 'error' });
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFormData({
        testProject: initialProject || '',
        module: '',
        submodule: '',
        category: initialCategory || '',
        caseKey: '',
        name: '',
        description: '',
        priority: 'Media',
        executionResult: 'not_executed',
        status: 'Activo',
      });
    onClose();
  };

  const renderStepContent = (step: number) => {
    const isProjectReadOnly = !!initialProject;
    const isCategoryReadOnly = !!initialCategory;
    
    switch (step) {
      case 0:
        return <Step1Project activeStep={activeStep} formData={formData} setFormData={setFormData} theme={theme} isReadOnly={isProjectReadOnly} />;
      case 1:
        return <Step2Category activeStep={activeStep} formData={formData} setFormData={setFormData} theme={theme} isReadOnly={isCategoryReadOnly} />;
      case 2:
        return <Step3TestCase activeStep={activeStep} formData={formData} setFormData={setFormData} theme={theme} />;
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
        }
      }}
    >
      <DialogTitle sx={{ color: 'text.primary', fontWeight: 600 }}>
        Crear Nuevo Caso de Prueba
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
          {steps.map((label) => (
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
        {activeStep > 0 && (
          <Button onClick={handleBack} sx={{ color: 'text.primary' }}>
            Atrás
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            sx={{
              backgroundColor: '#FF6B35',
              color: '#FFFFFF',
              '&:hover': { backgroundColor: '#E55A2B' },
            }}
          >
            Siguiente
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            variant="contained"
            sx={{
              backgroundColor: '#FF6B35',
              color: '#FFFFFF',
              '&:hover': { backgroundColor: '#E55A2B' },
            }}
          >
            Crear Caso de Prueba
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

