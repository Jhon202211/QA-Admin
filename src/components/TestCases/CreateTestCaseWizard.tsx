import { useState, useEffect, useRef, useCallback } from 'react';
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
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import { useCreate, useNotify } from 'react-admin';
import type { TestCaseCategory } from '../../types/testCase';
import {
  buildTestCaseDraftTitle,
  createTestCaseDraftId,
  hasMeaningfulTestCaseDraft,
  readLocalTestCaseDraft,
  removeLocalTestCaseDraft,
  testCaseDraftService,
  writeLocalTestCaseDraft,
  type TestCaseConstructionDraftData,
  type TestCaseWizardStepItem,
} from '../../services/testCaseDraftService';

interface StepItem extends TestCaseWizardStepItem {}

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
        <MenuItem value="Pre-QA / Quality Gate">Pre-QA / Quality Gate</MenuItem>
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
  /** Si se indica, restaura ese borrador al abrir el modal. */
  draftId?: string | null;
  onDraftChange?: () => void;
}

export const CreateTestCaseWizard = ({
  open,
  onClose,
  initialProject,
  initialCategory,
  draftId = null,
  onDraftChange,
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
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const skipNextAutosaveRef = useRef(false);
  const remoteSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [create] = useCreate();
  const notify = useNotify();

  const clearDraftEverywhere = useCallback(
    async (id: string | null) => {
      if (!id) return;
      removeLocalTestCaseDraft(id);
      await testCaseDraftService.remove(id).catch((err) => {
        console.error('Error removing wizard draft:', err);
      });
      onDraftChange?.();
    },
    [onDraftChange]
  );

  useEffect(() => {
    if (!open) {
      setHydrated(false);
      setActiveDraftId(null);
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      const nextDraftId = draftId || createTestCaseDraftId();
      setActiveDraftId(nextDraftId);

      if (!draftId) {
        skipNextAutosaveRef.current = true;
        setActiveStep(getInitialStep());
        setFormData(EMPTY_FORM(initialProject, initialCategory));
        setTestSteps([]);
        setDraftSavedAt(null);
        setHydrated(true);
        return;
      }

      const localDraft = readLocalTestCaseDraft(draftId);
      let remoteDraft: TestCaseConstructionDraftData | null = null;
      try {
        const remote = await testCaseDraftService.get(draftId);
        remoteDraft = remote?.data || null;
      } catch (err) {
        console.warn('[Wizard] No se pudo cargar el borrador remoto:', err);
      }

      if (cancelled) return;

      const localUpdated = localDraft?.updatedAt ? Date.parse(localDraft.updatedAt) : 0;
      const remoteUpdated = remoteDraft?.updatedAt ? Date.parse(String(remoteDraft.updatedAt)) : 0;
      const preferred =
        remoteDraft && remoteUpdated >= localUpdated ? remoteDraft : localDraft || remoteDraft;

      if (preferred) {
        skipNextAutosaveRef.current = true;
        setActiveStep(
          typeof preferred.activeStep === 'number' ? preferred.activeStep : getInitialStep()
        );
        setFormData({
          ...EMPTY_FORM(initialProject, initialCategory),
          ...(preferred.formData || {}),
        });
        setTestSteps(preferred.testSteps || []);
        setDraftSavedAt(preferred.updatedAt || null);
        if (remoteDraft && remoteUpdated > localUpdated) {
          writeLocalTestCaseDraft(draftId, preferred);
        }
      } else {
        skipNextAutosaveRef.current = true;
        setActiveStep(getInitialStep());
        setFormData(EMPTY_FORM(initialProject, initialCategory));
        setTestSteps([]);
        setDraftSavedAt(null);
      }
      setHydrated(true);
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [open, draftId, initialProject, initialCategory]);

  useEffect(() => {
    if (!open || !hydrated || !activeDraftId) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    const draftData: TestCaseConstructionDraftData = {
      source: 'wizard',
      activeStep,
      formData,
      testSteps,
      updatedAt: new Date().toISOString(),
    };
    draftData.title = buildTestCaseDraftTitle(draftData);

    if (!hasMeaningfulTestCaseDraft(draftData)) {
      removeLocalTestCaseDraft(activeDraftId);
      if (remoteSaveTimerRef.current) clearTimeout(remoteSaveTimerRef.current);
      remoteSaveTimerRef.current = setTimeout(() => {
        testCaseDraftService.remove(activeDraftId).catch(() => undefined);
        onDraftChange?.();
      }, 800);
      setDraftSavedAt(null);
      return;
    }

    writeLocalTestCaseDraft(activeDraftId, draftData);
    setDraftSavedAt(draftData.updatedAt || null);

    if (remoteSaveTimerRef.current) clearTimeout(remoteSaveTimerRef.current);
    remoteSaveTimerRef.current = setTimeout(() => {
      testCaseDraftService.save(activeDraftId, draftData).catch((err) => {
        console.warn('[Wizard] No se pudo sincronizar el borrador:', err);
      });
      onDraftChange?.();
    }, 800);

    return () => {
      if (remoteSaveTimerRef.current) clearTimeout(remoteSaveTimerRef.current);
    };
  }, [open, hydrated, activeDraftId, activeStep, formData, testSteps, onDraftChange]);

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
      await clearDraftEverywhere(activeDraftId);
      notify('Caso de prueba creado exitosamente', { type: 'success' });
      handleClose(true);
    } catch {
      notify('Error al crear el caso de prueba', { type: 'error' });
    }
  };

  const handleClose = (discardDraft = false) => {
    if (discardDraft) {
      void clearDraftEverywhere(activeDraftId);
    }
    setActiveStep(0);
    setFormData(EMPTY_FORM(initialProject, initialCategory));
    setTestSteps([]);
    setActiveDraftId(null);
    setDraftSavedAt(null);
    setHydrated(false);
    onClose();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <Step1Project formData={formData} setFormData={setFormData} isReadOnly={!!initialProject && !draftId} />;
      case 1:
        return <Step2Category formData={formData} setFormData={setFormData} isReadOnly={!!initialCategory && !draftId} />;
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
      onClose={() => handleClose(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.mode === 'dark' ? '#2B2D42' : '#FFFFFF',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ color: 'text.primary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        Crear Nuevo Caso de Prueba
        {draftSavedAt && (
          <Chip
            size="small"
            icon={<SaveIcon sx={{ fontSize: '14px !important' }} />}
            label={`Borrador · ${new Date(draftSavedAt).toLocaleTimeString()}`}
            color="success"
            variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
        )}
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
        <Button onClick={() => handleClose(false)} sx={{ color: 'text.secondary' }}>
          Cancelar
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {activeStep > (initialProject && initialCategory && !draftId ? 2 : initialProject && !draftId ? 1 : 0) && (
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
