import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button,
  CircularProgress,
  Paper,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useState, useEffect, useCallback } from 'react';
import { TestExecutionModal } from './TestExecutionModal';
import type { TestCase } from '../../types/testCase';
import { dataProvider } from '../../firebase/dataProvider';
import { executionDraftService, type ExecutionDraftRecord } from '../../services/executionDraftService';

export const DraftsView = () => {
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [remoteDrafts, setRemoteDrafts] = useState<ExecutionDraftRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getLocalDraftIds = useCallback(() => {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('execution_draft_')) {
        ids.push(key.replace('execution_draft_', ''));
      }
    }
    return ids;
  }, []);

  const syncDraftIds = useCallback((drafts = remoteDrafts) => {
    const ids = Array.from(new Set([...getLocalDraftIds(), ...drafts.map((draft) => draft.testCaseId)]));
    setDraftIds(ids);
    return ids;
  }, [getLocalDraftIds, remoteDrafts]);

  const loadDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const localIds = getLocalDraftIds();
      
      const drafts = await executionDraftService.list();
      setRemoteDrafts(drafts);
      
      const ids = Array.from(new Set([...localIds, ...drafts.map((draft) => draft.testCaseId)]));
      setDraftIds(ids);

      const response = await dataProvider.getList('test_cases', {
        pagination: { page: 1, perPage: 1000 },
      });
      setTestCases(response.data as TestCase[]);
    } catch (err: any) {
      console.error('Error loading drafts:', err);
      setError(err instanceof Error ? err : new Error('No se pudieron cargar los borradores'));
    } finally {
      setIsLoading(false);
    }
  }, [getLocalDraftIds]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const draftCases = testCases?.filter((tc) => draftIds.includes(tc.id)) || [];
  const fallbackDrafts = draftIds
    .filter((id) => !draftCases.some((tc) => tc.id === id))
    .map((id) => {
      const rawDraft = localStorage.getItem(`execution_draft_${id}`);
      const remoteDraft = remoteDrafts.find((draft) => draft.testCaseId === id);
      let updatedAt: string | null = null;

      if (rawDraft) {
        try {
          const parsedDraft = JSON.parse(rawDraft);
          updatedAt = parsedDraft?.updatedAt ?? null;
        } catch (e) {
          console.error('Error parsing fallback draft:', e);
        }
      }
      if (!updatedAt && remoteDraft?.updatedAt?.toDate) {
        updatedAt = remoteDraft.updatedAt.toDate().toISOString();
      }

      return { id, updatedAt };
    });

  const handleOpenExecution = (testCase: TestCase) => {
    setSelectedTestCase(testCase);
  };

  const handleCloseExecution = () => {
    setSelectedTestCase(null);
    loadDrafts();
  };

  const handleClearDraft = async (testCaseId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este borrador?')) return;
    
    localStorage.removeItem(`execution_draft_${testCaseId}`);
    await executionDraftService.remove(testCaseId).catch((err) => {
      console.error('Error removing remote execution draft:', err);
    });
    loadDrafts();
  };

  const handleClearAllDrafts = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar TODOS los borradores?')) return;

    await Promise.all(draftIds.map((id) => executionDraftService.remove(id).catch((err) => {
      console.error('Error removing remote execution draft:', err);
    })));
    draftIds.forEach((id) => {
      localStorage.removeItem(`execution_draft_${id}`);
    });
    loadDrafts();
  };

  if (isLoading && draftIds.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={40} sx={{ color: '#FF6B35' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Gestiona tus ejecuciones de prueba guardadas como borrador.
        </Typography>
        {draftIds.length > 0 && (
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteOutlineIcon />}
            onClick={handleClearAllDrafts}
            size="small"
          >
            Limpiar todos
          </Button>
        )}
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#FFF3E0', border: '1px solid #FFE0B2' }}>
          <Typography variant="body2" color="warning.main">
            {error.message}. Algunos borradores locales podrían estar disponibles.
          </Typography>
        </Paper>
      )}

      {draftCases.length === 0 && fallbackDrafts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
          <SaveIcon sx={{ fontSize: 48, color: 'divider', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay borradores pendientes
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Tus ejecuciones de prueba se guardarán aquí automáticamente si no las completas.
          </Typography>
        </Paper>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2 }}>
          {draftCases.map((tc) => (
            <ListItem
              key={tc.id}
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title="Continuar ejecución">
                    <IconButton 
                      onClick={() => handleOpenExecution(tc)} 
                      sx={{ 
                        color: '#43A047',
                        '&:hover': { bgcolor: 'rgba(67, 160, 71, 0.1)' }
                      }}
                    >
                      <PlayArrowIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar borrador">
                    <IconButton 
                      onClick={() => handleClearDraft(tc.id)} 
                      sx={{ 
                        color: '#E53935',
                        '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.1)' }
                      }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1.5,
                p: 2,
                '&:hover': { 
                  borderColor: '#FF6B35',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <ListItemIcon>
                <SaveIcon sx={{ color: '#FF6B35' }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {tc.caseKey} - {tc.name}
                  </Typography>
                }
                secondary={
                  <Box sx={{ mt: 1, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      Proyecto: {tc.testProject}
                    </Typography>
                    <Chip
                      label={remoteDrafts.some((draft) => draft.testCaseId === tc.id) ? 'Sincronizado' : 'Local'}
                      size="small"
                      sx={{ 
                        height: 20, 
                        fontSize: '0.65rem', 
                        bgcolor: remoteDrafts.some((draft) => draft.testCaseId === tc.id) ? 'rgba(67, 160, 71, 0.1)' : 'rgba(255, 107, 53, 0.1)',
                        color: remoteDrafts.some((draft) => draft.testCaseId === tc.id) ? '#2E7D32' : '#FF6B35',
                        border: 'none',
                        fontWeight: 700
                      }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
          {fallbackDrafts.map((draft) => (
            <ListItem
              key={draft.id}
              secondaryAction={
                <Tooltip title="Eliminar borrador">
                  <IconButton 
                    onClick={() => handleClearDraft(draft.id)} 
                    sx={{ 
                      color: '#E53935',
                      '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.1)' }
                    }}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Tooltip>
              }
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1.5,
                p: 2,
                opacity: 0.8,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' }
              }}
            >
              <ListItemIcon>
                <SaveIcon sx={{ color: 'text.disabled' }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="subtitle1" color="text.secondary">
                    Borrador pendiente - ID: {draft.id}
                  </Typography>
                }
                secondary={
                  <Box sx={{ mt: 1, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {draft.updatedAt
                        ? `Última actualización: ${new Date(draft.updatedAt).toLocaleString()}`
                        : 'Disponible para recuperar cuando vuelvas a iniciar sesión'}
                    </Typography>
                    <Chip
                      label="Borrador técnico"
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem', color: 'text.disabled' }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {selectedTestCase && (
        <TestExecutionModal
          open={Boolean(selectedTestCase)}
          testCase={selectedTestCase}
          onClose={handleCloseExecution}
          onExecuted={handleCloseExecution}
        />
      )}
    </Box>
  );
};
