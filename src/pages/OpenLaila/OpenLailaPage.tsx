import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useNotify } from 'react-admin';
import { auth } from '../../firebase/config';
import { askLaila, LAILA_USER_ROLE_LABELS } from '../../services/lailaChatService';
import type { LailaUserRole } from '../../services/lailaChatService';
import { lailaKnowledgeService } from '../../services/lailaKnowledgeService';
import {
  addLailaMessage,
  clearLailaConversation,
  subscribeToLailaMessages,
} from '../../services/lailaConversationService';
import type { LailaMessage } from '../../types/openLaila';

const ROLE_STORAGE_KEY = 'openlaila_user_role';

const WELCOME_MESSAGE =
  '¡Hola! Soy **OpenLaila**, tu asistente de soporte. Puedo responder preguntas basándome en la base de conocimiento de la plataforma. ¿En qué puedo ayudarte hoy?';

export const OpenLailaPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const notify = useNotify();

  const uid = auth.currentUser?.uid ?? null;

  const [messages, setMessages] = useState<LailaMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [kbStatus, setKbStatus] = useState<{ ready: boolean; docs: number; chunks: number }>({
    ready: false,
    docs: 0,
    chunks: 0,
  });
  const [userRole, setUserRole] = useState<LailaUserRole>(
    () => (localStorage.getItem(ROLE_STORAGE_KEY) as LailaUserRole) || 'empleado'
  );

  const handleRoleChange = (e: SelectChangeEvent) => {
    const role = e.target.value as LailaUserRole;
    setUserRole(role);
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  };

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lailaKnowledgeService.initialize().then(() => {
      setKbStatus({
        ready: lailaKnowledgeService.isReady,
        docs: lailaKnowledgeService.documentCount,
        chunks: lailaKnowledgeService.chunkCount,
      });
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToLailaMessages(
      uid,
      (msgs) => setMessages(msgs),
      () => notify('No se pudo cargar el historial de la conversación', { type: 'error' })
    );
    return unsubscribe;
  }, [uid, notify]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !uid || sending) return;

    setInput('');
    setSending(true);

    try {
      await addLailaMessage(uid, 'user', text);
      const reply = await askLaila(text, messages, userRole);
      await addLailaMessage(uid, 'assistant', reply.content, reply.sources);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await addLailaMessage(
        uid,
        'assistant',
        `Ocurrió un error al generar la respuesta: ${msg}`
      ).catch(() => {});
      notify('Error al consultar a OpenLaila', { type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    if (!uid || messages.length === 0) return;
    try {
      await clearLailaConversation(messages);
      notify('Conversación reiniciada', { type: 'info' });
    } catch {
      notify('No se pudo reiniciar la conversación', { type: 'error' });
    }
  };

  return (
    <Box sx={{ pt: { xs: 1.5, sm: 3 }, pr: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pl: 0 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif" }}>
            OpenLaila
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Chatbot de soporte con base de conocimiento propia (RAG sobre documentos PDF).
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="openlaila-role-label">Rol simulado</InputLabel>
            <Select
              labelId="openlaila-role-label"
              label="Rol simulado"
              value={userRole}
              onChange={handleRoleChange}
            >
              {Object.entries(LAILA_USER_ROLE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip
            icon={<MenuBookIcon />}
            label={
              kbStatus.ready
                ? `Base de conocimiento: ${kbStatus.docs} doc. · ${kbStatus.chunks} fragmentos`
                : 'Base de conocimiento vacía'
            }
            color={kbStatus.ready ? 'success' : 'default'}
            variant="outlined"
            size="small"
          />
          <Tooltip title="Iniciar una conversación nueva">
            <span>
              <IconButton onClick={handleNewChat} disabled={!uid || messages.length === 0}>
                <DeleteSweepIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 260px)',
          minHeight: 420,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          <Stack spacing={2}>
            <MessageBubble role="assistant" content={WELCOME_MESSAGE} isDark={isDark} />

            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} sources={m.sources} isDark={isDark} />
            ))}

            {sending && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: '#FF6B35' }}>
                  <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                </Avatar>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  OpenLaila está escribiendo…
                </Typography>
              </Box>
            )}
            <div ref={bottomRef} />
          </Stack>
        </Box>

        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            display: 'flex',
            gap: 1,
            alignItems: 'flex-end',
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={5}
            placeholder="Escribe tu pregunta para OpenLaila…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            size="small"
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            sx={{ bgcolor: '#FF6B35', color: '#fff', '&:hover': { bgcolor: '#E85A2A' }, '&.Mui-disabled': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' } }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

const MessageBubble = ({
  role,
  content,
  sources,
  isDark,
}: {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  isDark: boolean;
}) => {
  const isUser = role === 'user';
  return (
    <Box sx={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 1.5, alignItems: 'flex-start' }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: isUser ? '#2B2D42' : '#FF6B35' }}>
        {isUser ? <PersonIcon sx={{ fontSize: 18 }} /> : <AutoAwesomeIcon sx={{ fontSize: 18 }} />}
      </Avatar>
      <Box sx={{ maxWidth: '75%' }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: 2.5,
            bgcolor: isUser ? '#FF6B35' : isDark ? 'rgba(255,255,255,0.06)' : '#F0F1F5',
            color: isUser ? '#fff' : 'text.primary',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {content}
          </Typography>
        </Paper>
        {!isUser && sources && sources.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
            {sources.map((s) => (
              <Chip key={s} label={s} size="small" variant="outlined" />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};
