import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useGetList, useRefresh } from 'react-admin';
import { useState, useEffect } from 'react';
import { TestExecutionModal } from '../TestCases/TestExecutionModal';
import type { TestCase } from '../../types/testCase';

interface DraftsListModalProps {
  open: boolean;
  onClose: () => void;
}

export const DraftsListModal = ({ open, onClose }: DraftsListModalProps) => {
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const refresh = useRefresh();

  const syncDraftIds = () => {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('execution_draft_')) {
        ids.push(key.replace('execution_draft_', ''));
      }
    }
    setDraftIds(ids);
    return ids;
  };

  // Obtener todos los casos de prueba para filtrar los que tienen drafts
  const { data: testCases, isLoading } = useGetList('test_cases', {
    pagination: { page: 1, perPage: 1000 },
  });

  useEffect(() => {
    if (open) {
      syncDraftIds();
    }
  }, [open]);

  const draftCases = testCases?.filter((tc) => draftIds.includes(tc.id)) || [];

  const handleOpenExecution = (testCase: TestCase) => {
    setSelectedTestCase(testCase);
  };

  const handleCloseExecution = () => {
    setSelectedTestCase(null);
    // Actualizar la lista de drafts después de cerrar el modal de ejecución
    const ids = syncDraftIds();
    if (ids.length === 0) {
      onClose();
    }
    refresh();
  };

  const handleClearDraft = (testCaseId: string) => {
    localStorage.removeItem(`execution_draft_${testCaseId}`);
    const ids = syncDraftIds();
    if (selectedTestCase?.id === testCaseId) {
      setSelectedTestCase(null);
    }
    if (ids.length === 0) {
      onClose();
    }
  };

  const handleClearAllDrafts = () => {
    draftIds.forEach((id) => {
      localStorage.removeItem(`execution_draft_${id}`);
    });
    setSelectedTestCase(null);
    setDraftIds([]);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !selectedTestCase} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SaveIcon sx={{ color: '#FF6B35' }} />
          Ejecuciones pendientes de guardar
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Las siguientes ejecuciones tienen cambios locales que no han sido guardados en la base de datos.
            Selecciona una para revisarla y guardarla, o limpia el borrador si ya no lo necesitas.
          </Typography>
          {isLoading ? (
            <Typography variant="body2">Cargando...</Typography>
          ) : draftCases.length === 0 ? (
            <Typography variant="body2" sx={{ py: 2, textAlign: 'center' }}>
              No se encontraron ejecuciones pendientes.
            </Typography>
          ) : (
            <List>
              {draftCases.map((tc) => (
                <ListItem
                  key={tc.id}
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tooltip title="Continuar ejecución">
                        <IconButton edge="end" onClick={() => handleOpenExecution(tc)} sx={{ color: '#43A047' }}>
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Limpiar borrador">
                        <IconButton edge="end" onClick={() => handleClearDraft(tc.id)} sx={{ color: '#E53935' }}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                  }}
                >
                  <ListItemIcon>
                    <PlayArrowIcon sx={{ color: '#FF6B35' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${tc.caseKey} - ${tc.name}`}
                    secondary={
                      <Box sx={{ mt: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {tc.testProject}
                        </Typography>
                        <Chip
                          label="Borrador local"
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem', color: '#FF6B35', borderColor: '#FF6B35' }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          {draftCases.length > 0 && (
            <Button color="error" onClick={handleClearAllDrafts}>
              Limpiar todos
            </Button>
          )}
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {selectedTestCase && (
        <TestExecutionModal
          open={Boolean(selectedTestCase)}
          testCase={selectedTestCase}
          onClose={handleCloseExecution}
          onExecuted={handleCloseExecution}
        />
      )}
    </>
  );
};
