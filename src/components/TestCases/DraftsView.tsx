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
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useState, useEffect, useCallback } from 'react';
import { TestExecutionModal } from './TestExecutionModal';
import { AIAgent } from './AIAgent';
import { CreateTestCaseWizard } from './CreateTestCaseWizard';
import type { TestCase } from '../../types/testCase';
import { dataProvider } from '../../firebase/dataProvider';
import { executionDraftService, type ExecutionDraftRecord } from '../../services/executionDraftService';
import {
  buildTestCaseDraftTitle,
  listLocalTestCaseDraftIds,
  readLocalTestCaseDraft,
  removeLocalTestCaseDraft,
  testCaseDraftService,
  type TestCaseDraftRecord,
  type TestCaseDraftSource,
} from '../../services/testCaseDraftService';

type ConstructionDraftListItem = {
  draftId: string;
  source: TestCaseDraftSource;
  title: string;
  updatedAt: string | null;
  synced: boolean;
};

export const DraftsView = ({ projectSearch = '' }: { projectSearch?: string }) => {
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [remoteDrafts, setRemoteDrafts] = useState<ExecutionDraftRecord[]>([]);
  const [constructionDrafts, setConstructionDrafts] = useState<ConstructionDraftListItem[]>([]);
  const [selectedConstructionDraft, setSelectedConstructionDraft] = useState<{
    draftId: string;
    source: TestCaseDraftSource;
  } | null>(null);
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

      const localConstructionIds = listLocalTestCaseDraftIds();
      let remoteConstruction: TestCaseDraftRecord[] = [];
      try {
        remoteConstruction = await testCaseDraftService.list();
      } catch (remoteError) {
        console.warn('No se pudieron cargar borradores remotos de construcción:', remoteError);
      }

      const constructionMap = new Map<string, ConstructionDraftListItem>();

      for (const remote of remoteConstruction) {
        const data = remote.data;
        if (!data) continue;
        const updatedAt =
          data.updatedAt ||
          (remote.updatedAt?.toDate ? remote.updatedAt.toDate().toISOString() : null);
        constructionMap.set(remote.draftId, {
          draftId: remote.draftId,
          source: data.source,
          title: buildTestCaseDraftTitle(data),
          updatedAt,
          synced: true,
        });
      }

      for (const draftId of localConstructionIds) {
        const local = readLocalTestCaseDraft(draftId);
        if (!local) continue;
        const existing = constructionMap.get(draftId);
        const localUpdated = local.updatedAt ? Date.parse(local.updatedAt) : 0;
        const existingUpdated = existing?.updatedAt ? Date.parse(existing.updatedAt) : 0;
        if (!existing || localUpdated >= existingUpdated) {
          constructionMap.set(draftId, {
            draftId,
            source: local.source,
            title: buildTestCaseDraftTitle(local),
            updatedAt: local.updatedAt || existing?.updatedAt || null,
            synced: Boolean(existing),
          });
        }
      }

      setConstructionDrafts(
        Array.from(constructionMap.values()).sort((a, b) => {
          const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
          const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
          return bTime - aTime;
        })
      );
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

  const searchQuery = projectSearch.trim().toLowerCase();
  const filteredDraftCases = searchQuery
    ? draftCases.filter((tc) => (tc.testProject || '').toLowerCase().includes(searchQuery))
    : draftCases;
  const filteredFallbackDrafts = searchQuery ? [] : fallbackDrafts;
  const filteredConstructionDrafts = searchQuery
    ? constructionDrafts.filter((draft) => draft.title.toLowerCase().includes(searchQuery))
    : constructionDrafts;

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

  const handleClearConstructionDraft = async (draftId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este borrador?')) return;
    removeLocalTestCaseDraft(draftId);
    await testCaseDraftService.remove(draftId).catch((err) => {
      console.error('Error removing remote construction draft:', err);
    });
    loadDrafts();
  };

  const handleClearAllDrafts = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar TODOS los borradores?')) return;

    await Promise.all(
      draftIds.map((id) =>
        executionDraftService.remove(id).catch((err) => {
          console.error('Error removing remote execution draft:', err);
        })
      )
    );
    draftIds.forEach((id) => {
      localStorage.removeItem(`execution_draft_${id}`);
    });

    await Promise.all(
      constructionDrafts.map((draft) =>
        testCaseDraftService.remove(draft.draftId).catch((err) => {
          console.error('Error removing remote construction draft:', err);
        })
      )
    );
    constructionDrafts.forEach((draft) => {
      removeLocalTestCaseDraft(draft.draftId);
    });

    loadDrafts();
  };

  const totalDrafts =
    draftIds.length + constructionDrafts.length;
  const hasVisibleDrafts =
    filteredDraftCases.length > 0 ||
    filteredFallbackDrafts.length > 0 ||
    filteredConstructionDrafts.length > 0;
  const hasAnyDrafts =
    draftCases.length > 0 || fallbackDrafts.length > 0 || constructionDrafts.length > 0;

  if (isLoading && totalDrafts === 0) {
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
          Gestiona borradores de ejecuciones y de casos de prueba en construcción.
        </Typography>
        {totalDrafts > 0 && (
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

      {!hasAnyDrafts ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
          <SaveIcon sx={{ fontSize: 48, color: 'divider', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay borradores pendientes
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Las ejecuciones incompletas y los casos en construcción se guardarán aquí automáticamente.
          </Typography>
        </Paper>
      ) : !hasVisibleDrafts ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
          <SaveIcon sx={{ fontSize: 48, color: 'divider', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No se encontraron proyectos
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Ningún borrador coincide con "{projectSearch}"
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {filteredConstructionDrafts.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Casos de prueba en construcción
              </Typography>
              <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2 }}>
                {filteredConstructionDrafts.map((draft) => (
                  <ListItem
                    key={draft.draftId}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="Continuar creación">
                          <IconButton
                            onClick={() =>
                              setSelectedConstructionDraft({
                                draftId: draft.draftId,
                                source: draft.source,
                              })
                            }
                            sx={{
                              color: '#43A047',
                              '&:hover': { bgcolor: 'rgba(67, 160, 71, 0.1)' },
                            }}
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar borrador">
                          <IconButton
                            onClick={() => handleClearConstructionDraft(draft.draftId)}
                            sx={{
                              color: '#E53935',
                              '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.1)' },
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
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ListItemIcon>
                      {draft.source === 'ai_agent' ? (
                        <AutoAwesomeIcon sx={{ color: '#FF6B35' }} />
                      ) : (
                        <EditNoteIcon sx={{ color: '#FF6B35' }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {draft.title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {draft.updatedAt
                              ? `Última actualización: ${new Date(draft.updatedAt).toLocaleString()}`
                              : 'Borrador disponible'}
                          </Typography>
                          <Chip
                            label={draft.source === 'ai_agent' ? 'Agente IA' : 'Wizard'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: 'rgba(255, 107, 53, 0.1)',
                              color: '#FF6B35',
                              border: 'none',
                              fontWeight: 700,
                            }}
                          />
                          <Chip
                            label={draft.synced ? 'Sincronizado' : 'Local'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: draft.synced
                                ? 'rgba(67, 160, 71, 0.1)'
                                : 'rgba(255, 107, 53, 0.08)',
                              color: draft.synced ? '#2E7D32' : '#FF6B35',
                              border: 'none',
                              fontWeight: 700,
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {(filteredDraftCases.length > 0 || filteredFallbackDrafts.length > 0) && (
            <Box>
              {filteredConstructionDrafts.length > 0 && <Divider sx={{ mb: 2 }} />}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Ejecuciones en borrador
              </Typography>
              <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2 }}>
                {filteredDraftCases.map((tc) => (
                  <ListItem
                    key={tc.id}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="Continuar ejecución">
                          <IconButton
                            onClick={() => handleOpenExecution(tc)}
                            sx={{
                              color: '#43A047',
                              '&:hover': { bgcolor: 'rgba(67, 160, 71, 0.1)' },
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
                              '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.1)' },
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
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      },
                      transition: 'all 0.2s ease',
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
                            label={
                              remoteDrafts.some((draft) => draft.testCaseId === tc.id)
                                ? 'Sincronizado'
                                : 'Local'
                            }
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: remoteDrafts.some((draft) => draft.testCaseId === tc.id)
                                ? 'rgba(67, 160, 71, 0.1)'
                                : 'rgba(255, 107, 53, 0.1)',
                              color: remoteDrafts.some((draft) => draft.testCaseId === tc.id)
                                ? '#2E7D32'
                                : '#FF6B35',
                              border: 'none',
                              fontWeight: 700,
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
                {filteredFallbackDrafts.map((draft) => (
                  <ListItem
                    key={draft.id}
                    secondaryAction={
                      <Tooltip title="Eliminar borrador">
                        <IconButton
                          onClick={() => handleClearDraft(draft.id)}
                          sx={{
                            color: '#E53935',
                            '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.1)' },
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
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' },
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
            </Box>
          )}
        </Box>
      )}

      {selectedTestCase && (
        <TestExecutionModal
          open={Boolean(selectedTestCase)}
          testCase={selectedTestCase}
          onClose={handleCloseExecution}
          onExecuted={handleCloseExecution}
        />
      )}

      <AIAgent
        open={selectedConstructionDraft?.source === 'ai_agent'}
        draftId={
          selectedConstructionDraft?.source === 'ai_agent'
            ? selectedConstructionDraft.draftId
            : null
        }
        onClose={() => {
          setSelectedConstructionDraft(null);
          loadDrafts();
        }}
        onCasesCreated={() => {
          setSelectedConstructionDraft(null);
          loadDrafts();
        }}
        onDraftChange={loadDrafts}
      />

      <CreateTestCaseWizard
        open={selectedConstructionDraft?.source === 'wizard'}
        draftId={
          selectedConstructionDraft?.source === 'wizard'
            ? selectedConstructionDraft.draftId
            : null
        }
        onClose={() => {
          setSelectedConstructionDraft(null);
          loadDrafts();
        }}
        onDraftChange={loadDrafts}
      />
    </Box>
  );
};
