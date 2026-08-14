import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNotify } from 'react-admin';
import {
  getAgentInstructions,
  saveAgentInstructions,
} from '../../services/lailaKnowledgeAdminService';
import { invalidateLailaInstructionsCache } from '../../services/lailaChatService';

export const AgentInstructionsPage = () => {
  const notify = useNotify();
  const [content, setContent] = useState('');
  const [source, setSource] = useState<'firestore' | 'fallback'>('fallback');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAgentInstructions();
      setContent(result.content);
      setSource(result.source);
      setUpdatedAt(result.updatedAt);
      setDirty(false);
    } catch {
      notify('No se pudieron cargar las instrucciones', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAgentInstructions(content);
      invalidateLailaInstructionsCache();
      setSource('firestore');
      setUpdatedAt(new Date());
      setDirty(false);
      notify('Instrucciones del agente guardadas', { type: 'success' });
    } catch {
      notify('Error al guardar las instrucciones', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ pt: { xs: 1.5, sm: 3 }, pr: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pl: 0 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif" }}>
            Instrucciones del agente
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Define la personalidad, reglas y comportamiento del chatbot. Se guarda en Firestore.
            Usa <code>{'{user_rol}'}</code> para inyectar el rol simulado.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={source === 'firestore' ? 'Firestore' : 'Sin guardar aún'}
            color={source === 'firestore' ? 'success' : 'warning'}
          />
          {updatedAt && (
            <Typography variant="caption" color="text.secondary">
              Actualizado: {updatedAt.toLocaleString()}
            </Typography>
          )}
          <Button startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading || saving}>
            Recargar
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => void handleSave()}
            disabled={loading || saving || !dirty}
            sx={{ backgroundColor: '#FF6B35', '&:hover': { backgroundColor: '#e55a28' } }}
          >
            Guardar
          </Button>
        </Stack>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <TextField
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            fullWidth
            multiline
            minRows={18}
            placeholder="Instrucciones del sistema para el agente…"
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 13,
                lineHeight: 1.5,
              },
            }}
          />
        )}
      </Paper>
    </Box>
  );
};
