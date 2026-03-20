import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  useTheme,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { useGetList, useRefresh, useUpdateMany, useNotify } from 'react-admin';
import { useState } from 'react';
import { getExecutionColor, getExecutionLabel, getPriorityColor, getPriorityLabel } from './testCaseUi';
import type { TestCase, TestCaseCategory } from '../../types/testCase';

export const ArchivedView = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [updateMany] = useUpdateMany();

  const [unarchiveDialog, setUnarchiveDialog] = useState<{ open: boolean; project: string; count: number }>({
    open: false,
    project: '',
    count: 0,
  });

  const { data: testCases = [], isLoading } = useGetList('test_cases', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'testProject', order: 'ASC' },
  });

  const archivedCases = testCases.filter((tc: TestCase) => tc.projectArchived);

  const groupedData = archivedCases.reduce((acc: any, testCase: TestCase) => {
    const project = testCase.testProject || 'Sin proyecto';
    const category = testCase.category || 'Sin categoría';
    if (!acc[project]) acc[project] = {};
    if (!acc[project][category]) acc[project][category] = [];
    acc[project][category].push(testCase);
    return acc;
  }, {});

  const categories: TestCaseCategory[] = ['Smoke', 'Funcionales', 'No Funcionales', 'Regresión', 'UAT'];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Smoke: '#FF6B35',
      Funcionales: '#3CCF91',
      'No Funcionales': '#2196F3',
      Regresión: '#FF9800',
      UAT: '#9C27B0',
    };
    return colors[category] || '#6B6B6B';
  };

  const handleUnarchiveProject = (project: string) => {
    const count = archivedCases.filter(
      (tc: TestCase) => (tc.testProject || 'Sin proyecto') === project
    ).length;
    setUnarchiveDialog({ open: true, project, count });
  };

  const handleConfirmUnarchive = async () => {
    const casesToUnarchive = archivedCases.filter(
      (tc: TestCase) => (tc.testProject || 'Sin proyecto') === unarchiveDialog.project
    );
    const close = () => setUnarchiveDialog({ open: false, project: '', count: 0 });

    try {
      if (casesToUnarchive.length > 0) {
        await updateMany('test_cases', {
          ids: casesToUnarchive.map((tc: TestCase) => tc.id),
          data: { projectArchived: false },
        });
      }
      notify(`Proyecto "${unarchiveDialog.project}" restaurado`, { type: 'success' });
      close();
      refresh();
    } catch {
      notify('Error al desarchivar el proyecto', { type: 'error' });
    }
  };

  if (isLoading) {
    return <Box sx={{ p: 3 }}>Cargando...</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {Object.keys(groupedData).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
            No hay proyectos archivados
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Los proyectos que archives aparecerán aquí
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
              opacity: 0.85,
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <AccordionSummary
              component="div"
              expandIcon={<ExpandMoreIcon sx={{ color: 'text.primary' }} />}
              sx={{
                cursor: 'pointer',
                backgroundColor: isDark ? '#1A1C2E' : '#F5F5F5',
                '&:hover': { backgroundColor: isDark ? '#2B2D42' : '#E0E0E0' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <FolderIcon sx={{ color: '#9E9E9E' }} />
                <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600, flex: 1 }}>
                  {project}
                </Typography>
                <Chip
                  label="Archivado"
                  size="small"
                  sx={{ backgroundColor: '#9E9E9E', color: '#FFFFFF', fontWeight: 600, mr: 1 }}
                />
                <Chip
                  label={`${Object.values(categoriesData).flat().length} casos`}
                  size="small"
                  sx={{ backgroundColor: '#616161', color: '#FFFFFF', fontWeight: 600 }}
                />
                <Tooltip title="Desarchivar proyecto">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnarchiveProject(project);
                    }}
                    sx={{ color: '#43A047' }}
                  >
                    <UnarchiveIcon fontSize="small" />
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
                      component="div"
                      expandIcon={<ExpandMoreIcon sx={{ color: 'text.primary' }} />}
                      sx={{
                        cursor: 'pointer',
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
                          sx={{ backgroundColor: getCategoryColor(category), color: '#FFFFFF', fontWeight: 600 }}
                        />
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
                              opacity: 0.8,
                              '&:hover': {
                                backgroundColor: isDark ? '#4A4D6B' : '#F5F5F5',
                                cursor: 'pointer',
                              },
                            }}
                            onClick={() => navigate(`/test_cases/${testCase.id}`)}
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
                              label={getPriorityLabel(testCase.priority)}
                              size="small"
                              sx={{ backgroundColor: getPriorityColor(testCase.priority), color: '#fff', fontWeight: 600 }}
                            />
                            <Chip
                              label={getExecutionLabel(testCase.executionResult)}
                              size="small"
                              sx={{ backgroundColor: getExecutionColor(testCase.executionResult), color: '#fff', fontWeight: 600 }}
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

      {/* Diálogo para desarchivar proyecto */}
      <Dialog open={unarchiveDialog.open} onClose={() => setUnarchiveDialog({ open: false, project: '', count: 0 })}>
        <DialogTitle>Desarchivar Proyecto</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            ¿Deseas restaurar el proyecto <strong>"{unarchiveDialog.project}"</strong>?
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            El proyecto y sus <strong>{unarchiveDialog.count} caso(s) de prueba</strong> volverán a la vista activa.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnarchiveDialog({ open: false, project: '', count: 0 })}>Cancelar</Button>
          <Button
            onClick={handleConfirmUnarchive}
            variant="contained"
            sx={{ backgroundColor: '#43A047', '&:hover': { backgroundColor: '#2E7D32' } }}
          >
            Desarchivar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
