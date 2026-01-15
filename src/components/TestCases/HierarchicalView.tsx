import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, IconButton, useTheme, Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import { useGetList, useRefresh, useUpdateMany, useDeleteMany, useNotify } from 'react-admin';
import { useState } from 'react';
import { CreateTestCaseWizard } from './CreateTestCaseWizard';
import { AIAgent } from './AIAgent';
import type { TestCase, TestCaseCategory } from '../../types/testCase';

export const HierarchicalView = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const notify = useNotify();
  const [updateMany] = useUpdateMany();
  const [deleteMany] = useDeleteMany();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [aiAgentOpen, setAiAgentOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<TestCaseCategory | undefined>();
  
  // Estados para editar/borrar
  const [editProjectDialog, setEditProjectDialog] = useState<{ open: boolean; project: string; newName: string }>({ open: false, project: '', newName: '' });
  const [editCategoryDialog, setEditCategoryDialog] = useState<{ open: boolean; project: string; category: string; newCategory: string }>({ open: false, project: '', category: '', newCategory: '' });
  const [deleteProjectDialog, setDeleteProjectDialog] = useState<{ open: boolean; project: string; count: number }>({ open: false, project: '', count: 0 });
  const [deleteCategoryDialog, setDeleteCategoryDialog] = useState<{ open: boolean; project: string; category: string; count: number }>({ open: false, project: '', category: '', count: 0 });
  
  const refresh = useRefresh();
  const { data: testCases = [], isLoading } = useGetList('test_cases', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'testProject', order: 'ASC' }
  });

  // Agrupar casos de prueba por proyecto y categoría (jerarquía original)
  const groupedData = testCases.reduce((acc: any, testCase: TestCase) => {
    const project = testCase.testProject || 'Sin proyecto';
    const category = testCase.category || 'Sin categoría';
    
    if (!acc[project]) {
      acc[project] = {};
    }
    if (!acc[project][category]) {
      acc[project][category] = [];
    }
    acc[project][category].push(testCase);
    return acc;
  }, {});

  const categories: TestCaseCategory[] = ['Smoke', 'Funcionales', 'No Funcionales', 'Regresión', 'UAT'];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Smoke': '#FF6B35',
      'Funcionales': '#3CCF91',
      'No Funcionales': '#2196F3',
      'Regresión': '#FF9800',
      'UAT': '#9C27B0',
    };
    return colors[category] || '#6B6B6B';
  };

  const getExecutionResultColor = (result?: string) => {
    const colors: Record<string, string> = {
      'passed': '#4caf50',
      'failed': '#E53935',
      'blocked': '#ff9800',
      'not_executed': '#bdbdbd',
    };
    return colors[result || 'not_executed'] || '#bdbdbd';
  };

  const getExecutionResultLabel = (result?: string) => {
    const labels: Record<string, string> = {
      'passed': 'Aprobado',
      'failed': 'Fallido',
      'blocked': 'Bloqueado',
      'not_executed': 'No ejecutado',
    };
    return labels[result || 'not_executed'] || 'No ejecutado';
  };

  // Funciones para editar proyecto
  const handleEditProject = (project: string) => {
    setEditProjectDialog({ open: true, project, newName: project });
  };

  const handleSaveProjectEdit = async () => {
    if (!editProjectDialog.newName.trim()) {
      notify('El nombre del proyecto no puede estar vacío', { type: 'warning' });
      return;
    }

    const casesToUpdate = testCases.filter(tc => tc.testProject === editProjectDialog.project);
    if (casesToUpdate.length === 0) {
      setEditProjectDialog({ open: false, project: '', newName: '' });
      return;
    }

    try {
      await updateMany('test_cases', {
        ids: casesToUpdate.map(tc => tc.id),
        data: { testProject: editProjectDialog.newName.trim() }
      });
      notify(`Proyecto "${editProjectDialog.project}" renombrado a "${editProjectDialog.newName}"`, { type: 'success' });
      setEditProjectDialog({ open: false, project: '', newName: '' });
      refresh();
    } catch (error) {
      notify('Error al renombrar el proyecto', { type: 'error' });
    }
  };

  // Funciones para borrar proyecto
  const handleDeleteProject = (project: string) => {
    const casesInProject = testCases.filter(tc => tc.testProject === project);
    setDeleteProjectDialog({ open: true, project, count: casesInProject.length });
  };

  const handleConfirmDeleteProject = async () => {
    const casesToDelete = testCases.filter(tc => tc.testProject === deleteProjectDialog.project);
    
    try {
      await deleteMany('test_cases', { ids: casesToDelete.map(tc => tc.id) });
      notify(`Proyecto "${deleteProjectDialog.project}" y ${deleteProjectDialog.count} caso(s) eliminado(s)`, { type: 'success' });
      setDeleteProjectDialog({ open: false, project: '', count: 0 });
      refresh();
    } catch (error) {
      notify('Error al eliminar el proyecto', { type: 'error' });
    }
  };

  // Funciones para editar categoría
  const handleEditCategory = (project: string, category: string) => {
    setEditCategoryDialog({ open: true, project, category, newCategory: category });
  };

  const handleSaveCategoryEdit = async () => {
    if (!editCategoryDialog.newCategory.trim()) {
      notify('El nombre de la categoría no puede estar vacío', { type: 'warning' });
      return;
    }

    const casesToUpdate = testCases.filter(
      tc => tc.testProject === editCategoryDialog.project && tc.category === editCategoryDialog.category
    );
    
    if (casesToUpdate.length === 0) {
      setEditCategoryDialog({ open: false, project: '', category: '', newCategory: '' });
      return;
    }

    try {
      await updateMany('test_cases', {
        ids: casesToUpdate.map(tc => tc.id),
        data: { category: editCategoryDialog.newCategory.trim() as TestCaseCategory }
      });
      notify(`Categoría "${editCategoryDialog.category}" renombrada a "${editCategoryDialog.newCategory}"`, { type: 'success' });
      setEditCategoryDialog({ open: false, project: '', category: '', newCategory: '' });
      refresh();
    } catch (error) {
      notify('Error al renombrar la categoría', { type: 'error' });
    }
  };

  // Funciones para borrar categoría
  const handleDeleteCategory = (project: string, category: string) => {
    const casesInCategory = testCases.filter(
      tc => tc.testProject === project && tc.category === category
    );
    setDeleteCategoryDialog({ open: true, project, category, count: casesInCategory.length });
  };

  const handleConfirmDeleteCategory = async () => {
    const casesToDelete = testCases.filter(
      tc => tc.testProject === deleteCategoryDialog.project && tc.category === deleteCategoryDialog.category
    );
    
    try {
      await deleteMany('test_cases', { ids: casesToDelete.map(tc => tc.id) });
      notify(`Categoría "${deleteCategoryDialog.category}" y ${deleteCategoryDialog.count} caso(s) eliminado(s)`, { type: 'success' });
      setDeleteCategoryDialog({ open: false, project: '', category: '', count: 0 });
      refresh();
    } catch (error) {
      notify('Error al eliminar la categoría', { type: 'error' });
    }
  };

  if (isLoading) {
    return <Box sx={{ p: 3 }}>Cargando...</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
          Pruebas Manuales
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setAiAgentOpen(true)}
            sx={{
              borderColor: '#FF6B35',
              color: '#FF6B35',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#E55A2B',
                backgroundColor: 'rgba(255, 107, 53, 0.05)'
              }
            }}
          >
            Agente IA
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedProject(undefined);
              setSelectedCategory(undefined);
              setWizardOpen(true);
            }}
            sx={{
              backgroundColor: '#FF6B35',
              color: '#FFFFFF',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#E55A2B'
              }
            }}
          >
            Nuevo Caso de Prueba
          </Button>
        </Box>
      </Box>

      {Object.keys(groupedData).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
            No hay casos de prueba
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Crea tu primer proyecto y caso de prueba para empezar
          </Typography>
        </Box>
      ) : (
        Object.entries(groupedData).map(([project, categoriesData]: [string, any]) => (
          <Accordion
            key={project}
            defaultExpanded
            sx={{
              mb: 2,
              backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: 'text.primary' }} />}
              sx={{
                backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5',
                '&:hover': { backgroundColor: isDark ? '#2B2D42' : '#E0E0E0' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <FolderIcon sx={{ color: '#FF6B35' }} />
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, flex: 1 }}>
                  {project}
                </Typography>
                <Chip
                  label={`${Object.values(categoriesData).flat().length} casos`}
                  size="small"
                  sx={{ backgroundColor: '#FF6B35', color: '#FFFFFF', fontWeight: 600 }}
                />
                <Tooltip title="Editar proyecto">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProject(project);
                    }}
                    sx={{ color: '#2196F3' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar proyecto">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project);
                    }}
                    sx={{ color: '#E53935' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Agregar caso de prueba a este proyecto">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(project);
                      setSelectedCategory(undefined);
                      setWizardOpen(true);
                    }}
                    sx={{ color: '#FF6B35' }}
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {categories.map((category) => {
                const cases = categoriesData[category] || [];
                if (cases.length === 0) return null;

                return (
                  <Accordion
                    key={category}
                    sx={{
                      mb: 1,
                      backgroundColor: isDark ? '#1A1C2E' : '#FAFAFA',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: 'text.primary' }} />}
                      sx={{
                        backgroundColor: isDark ? '#2B2D42' : '#F5F5F5',
                        '&:hover': { backgroundColor: isDark ? '#1A1C2E' : '#E0E0E0' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <FolderOpenIcon sx={{ color: getCategoryColor(category) }} />
                        <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, flex: 1 }}>
                          {category}
                        </Typography>
                        <Chip
                          label={`${cases.length} casos`}
                          size="small"
                          sx={{
                            backgroundColor: getCategoryColor(category),
                            color: '#FFFFFF',
                            fontWeight: 600,
                          }}
                        />
                        <Tooltip title="Editar categoría">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCategory(project, category);
                            }}
                            sx={{ color: '#2196F3' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar categoría">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(project, category);
                            }}
                            sx={{ color: '#E53935' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Agregar caso de prueba a esta categoría">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                              setSelectedCategory(category);
                              setWizardOpen(true);
                            }}
                            sx={{ color: getCategoryColor(category) }}
                          >
                            <AddIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ pl: 2 }}>
                        {cases.map((testCase: TestCase) => (
                          <Box
                            key={testCase.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              p: 1.5,
                              mb: 1,
                              borderRadius: '8px',
                              backgroundColor: isDark ? '#2B2D42' : '#FFFFFF',
                              border: `1px solid ${isDark ? '#4A4D6B' : '#E0E0E0'}`,
                              '&:hover': {
                                backgroundColor: isDark ? '#4A4D6B' : '#F5F5F5',
                                cursor: 'pointer',
                              },
                            }}
                            onClick={() => navigate(`/test_cases/${testCase.id}/execute`)}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
                                {testCase.caseKey} - {testCase.name}
                              </Typography>
                              {(testCase.module || testCase.submodule) && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                                  {testCase.module && testCase.submodule 
                                    ? `${testCase.module} > ${testCase.submodule}`
                                    : testCase.module || testCase.submodule}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              label={testCase.priority || 'Sin prioridad'}
                              size="small"
                              sx={{
                                backgroundColor:
                                  testCase.priority === 'high' || testCase.priority === 'critical' ? '#E53935' :
                                  testCase.priority === 'medium' ? '#ff9800' :
                                  testCase.priority === 'low' ? '#4caf50' : '#bdbdbd',
                                color: '#fff',
                                fontWeight: 600,
                              }}
                            />
                            <Chip
                              label={getExecutionResultLabel(testCase.executionResult)}
                              size="small"
                              sx={{
                                backgroundColor: getExecutionResultColor(testCase.executionResult),
                                color: '#fff',
                                fontWeight: 600,
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/test_cases/${testCase.id}/edit`);
                              }}
                              sx={{ color: '#FF6B35' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </AccordionDetails>
          </Accordion>
        ))
      )}
      <CreateTestCaseWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          refresh();
        }}
        initialProject={selectedProject}
        initialCategory={selectedCategory}
      />
      <AIAgent
        open={aiAgentOpen}
        onClose={() => {
          setAiAgentOpen(false);
          refresh();
        }}
        onCasesCreated={refresh}
      />

      {/* Diálogo para editar proyecto */}
      <Dialog open={editProjectDialog.open} onClose={() => setEditProjectDialog({ open: false, project: '', newName: '' })}>
        <DialogTitle>Editar Proyecto</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre del Proyecto"
            fullWidth
            variant="outlined"
            value={editProjectDialog.newName}
            onChange={(e) => setEditProjectDialog({ ...editProjectDialog, newName: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProjectDialog({ open: false, project: '', newName: '' })}>Cancelar</Button>
          <Button onClick={handleSaveProjectEdit} variant="contained" sx={{ backgroundColor: '#FF6B35', '&:hover': { backgroundColor: '#E55A2B' } }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para borrar proyecto */}
      <Dialog open={deleteProjectDialog.open} onClose={() => setDeleteProjectDialog({ open: false, project: '', count: 0 })}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            ¿Estás seguro de que deseas eliminar el proyecto <strong>"{deleteProjectDialog.project}"</strong>?
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Esta acción eliminará <strong>{deleteProjectDialog.count} caso(s) de prueba</strong> asociado(s) a este proyecto.
            <br />
            <strong>Esta acción no se puede deshacer.</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteProjectDialog({ open: false, project: '', count: 0 })}>Cancelar</Button>
          <Button 
            onClick={handleConfirmDeleteProject} 
            variant="contained" 
            color="error"
            sx={{ '&:hover': { backgroundColor: '#C62828' } }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para editar categoría */}
      <Dialog open={editCategoryDialog.open} onClose={() => setEditCategoryDialog({ open: false, project: '', category: '', newCategory: '' })}>
        <DialogTitle>Editar Categoría</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Nueva Categoría</InputLabel>
            <Select
              value={editCategoryDialog.newCategory}
              onChange={(e) => setEditCategoryDialog({ ...editCategoryDialog, newCategory: e.target.value })}
              label="Nueva Categoría"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCategoryDialog({ open: false, project: '', category: '', newCategory: '' })}>Cancelar</Button>
          <Button onClick={handleSaveCategoryEdit} variant="contained" sx={{ backgroundColor: '#FF6B35', '&:hover': { backgroundColor: '#E55A2B' } }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para borrar categoría */}
      <Dialog open={deleteCategoryDialog.open} onClose={() => setDeleteCategoryDialog({ open: false, project: '', category: '', count: 0 })}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            ¿Estás seguro de que deseas eliminar la categoría <strong>"{deleteCategoryDialog.category}"</strong> del proyecto <strong>"{deleteCategoryDialog.project}"</strong>?
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Esta acción eliminará <strong>{deleteCategoryDialog.count} caso(s) de prueba</strong> asociado(s) a esta categoría.
            <br />
            <strong>Esta acción no se puede deshacer.</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCategoryDialog({ open: false, project: '', category: '', count: 0 })}>Cancelar</Button>
          <Button 
            onClick={handleConfirmDeleteCategory} 
            variant="contained" 
            color="error"
            sx={{ '&:hover': { backgroundColor: '#C62828' } }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

