import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, IconButton, useTheme, Button, Tooltip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useGetList, useRefresh } from 'react-admin';
import { useState } from 'react';
import { CreateTestCaseWizard } from './CreateTestCaseWizard';

type TestCaseCategory = 'Smoke' | 'Funcionales' | 'No Funcionales' | 'Regresión' | 'UAT';

interface TestCase {
  id: string;
  caseKey: string;
  name: string;
  testProject?: string;
  category?: TestCaseCategory;
  priority?: string;
  executionResult?: string;
}

export const HierarchicalView = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<TestCaseCategory | undefined>();
  
  const refresh = useRefresh();
  const { data: testCases = [], isLoading } = useGetList('test_cases', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'testProject', order: 'ASC' }
  });

  // Agrupar casos de prueba por proyecto y categoría
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

  if (isLoading) {
    return <Box sx={{ p: 3 }}>Cargando...</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
          Pruebas Manuales
        </Typography>
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
                            onClick={() => navigate(`/test_cases/${testCase.id}`)}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
                                {testCase.caseKey} - {testCase.name}
                              </Typography>
                            </Box>
                            <Chip
                              label={testCase.priority || 'Sin prioridad'}
                              size="small"
                              sx={{
                                backgroundColor:
                                  testCase.priority === 'Alta' ? '#E53935' :
                                  testCase.priority === 'Media' ? '#ff9800' :
                                  testCase.priority === 'Baja' ? '#4caf50' : '#bdbdbd',
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
    </Box>
  );
};

