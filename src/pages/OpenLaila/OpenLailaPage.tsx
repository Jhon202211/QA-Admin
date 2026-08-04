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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PersonIcon from '@mui/icons-material/Person';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import HistoryIcon from '@mui/icons-material/History';
import ChatIcon from '@mui/icons-material/Chat';
import { useNotify } from 'react-admin';
import { auth } from '../../firebase/config';
import { askLaila, LAILA_USER_ROLE_LABELS } from '../../services/lailaChatService';
import type { LailaUserRole } from '../../services/lailaChatService';
import { lailaKnowledgeService } from '../../services/lailaKnowledgeService';
import {
  addLailaMessage,
  subscribeToLailaMessages,
  subscribeToLailaConversations,
  createLailaConversation,
  archiveLailaConversation,
  migrateLegacyLailaMessages,
  updateLailaConversationTitle,
} from '../../services/lailaConversationService';
import type { LailaMessage, LailaConversation } from '../../types/openLaila';

const ROLE_STORAGE_KEY = 'openlaila_user_role';
const conversationStorageKey = (userId: string) => `openlaila_current_conversation_${userId}`;

const WELCOME_MESSAGE =
  '¡Hola! Soy **OpenLaila**, tu asistente de soporte. Puedo responder preguntas basándome en la base de conocimiento de la plataforma. ¿En qué puedo ayudarte hoy?';

export const OpenLailaPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const notify = useNotify();

  const uid = auth.currentUser?.uid ?? null;

  const [activeTab, setActiveTab] = useState(0); // 0: Chat actual, 1: Archivados
  const [conversations, setConversations] = useState<LailaConversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<LailaConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LailaMessage[]>([]);
  const [archivedPreviewId, setArchivedPreviewId] = useState<string | null>(null);
  const [archivedMessages, setArchivedMessages] = useState<LailaMessage[]>([]);
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
  const migrationStartedRef = useRef(false);

  useEffect(() => {
    lailaKnowledgeService.initialize().then(() => {
      setKbStatus({
        ready: lailaKnowledgeService.isReady,
        docs: lailaKnowledgeService.documentCount,
        chunks: lailaKnowledgeService.chunkCount,
      });
    });
  }, []);

  // Suscribirse a conversaciones activas
  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToLailaConversations(
      uid,
      false,
      (convs) => {
        setConversations(convs);
        setCurrentConversationId((selectedId) => {
          if (selectedId && convs.some((conversation) => conversation.id === selectedId)) {
            return selectedId;
          }

          const storedId = localStorage.getItem(conversationStorageKey(uid));
          if (!selectedId && storedId && convs.some((conversation) => conversation.id === storedId)) {
            return storedId;
          }

          localStorage.removeItem(conversationStorageKey(uid));
          return null;
        });
      },
      () => notify('Error al cargar conversaciones', { type: 'error' })
    );
    return unsubscribe;
  }, [uid, notify]);

  // Suscribirse a conversaciones archivadas
  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToLailaConversations(
      uid,
      true,
      (convs) => {
        setArchivedConversations(convs);
        setArchivedPreviewId((selectedId) =>
          selectedId && convs.some((conversation) => conversation.id === selectedId)
            ? selectedId
            : null
        );
      },
      () => notify('Error al cargar archivados', { type: 'error' })
    );
    return unsubscribe;
  }, [uid, notify]);

  // Suscribirse a los mensajes de la conversación actual
  useEffect(() => {
    if (!uid || !currentConversationId) {
      setMessages([]);
      return;
    }
    const unsubscribe = subscribeToLailaMessages(
      uid,
      currentConversationId,
      (msgs) => setMessages(msgs),
      () => notify('No se pudo cargar el historial', { type: 'error' })
    );
    return unsubscribe;
  }, [uid, currentConversationId, notify]);

  // Convierte una sola vez el historial anterior al modelo de conversaciones reales.
  useEffect(() => {
    if (!uid || migrationStartedRef.current) return;
    migrationStartedRef.current = true;

    migrateLegacyLailaMessages(uid)
      .then((result) => {
        if (result && !result.archived) {
          localStorage.setItem(conversationStorageKey(uid), result.id);
          setCurrentConversationId((selectedId) => selectedId ?? result.id);
        }
      })
      .catch(() => notify('No se pudo migrar el historial anterior', { type: 'warning' }));
  }, [uid, notify]);

  useEffect(() => {
    if (!uid || !archivedPreviewId) {
      setArchivedMessages([]);
      return;
    }

    return subscribeToLailaMessages(
      uid,
      archivedPreviewId,
      setArchivedMessages,
      () => notify('No se pudo cargar la conversación archivada', { type: 'error' })
    );
  }, [uid, archivedPreviewId, notify]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !uid || sending) return;

    let convId = currentConversationId;
    
    // Si no hay conversación, crear una nueva
    if (!convId) {
      try {
        convId = await createLailaConversation(uid, text.substring(0, 30) + (text.length > 30 ? '...' : ''));
        setCurrentConversationId(convId);
        localStorage.setItem(conversationStorageKey(uid), convId);
      } catch (error) {
        notify('Error al crear la conversación', { type: 'error' });
        return;
      }
    } else {
      // Si es el primer mensaje real, actualizar el título
      const userMsgs = messages.filter(m => m.role === 'user');
      if (userMsgs.length === 0) {
        await updateLailaConversationTitle(convId, text.substring(0, 30) + (text.length > 30 ? '...' : ''));
      }
    }

    setInput('');
    setSending(true);

    try {
      await addLailaMessage(uid, convId, 'user', text);
      const reply = await askLaila(text, messages, userRole);
      await addLailaMessage(uid, convId, 'assistant', reply.content, reply.sources);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await addLailaMessage(
        uid,
        convId,
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
    if (!uid) return;
    try {
      const newId = await createLailaConversation(uid);
      setCurrentConversationId(newId);
      localStorage.setItem(conversationStorageKey(uid), newId);
      setActiveTab(0);
      notify('Nueva conversación iniciada', { type: 'info' });
    } catch {
      notify('No se pudo iniciar la conversación', { type: 'error' });
    }
  };

  const handleArchive = async () => {
    if (!currentConversationId || !uid) return;
    try {
      await archiveLailaConversation(currentConversationId, true);
      setCurrentConversationId(null);
      setMessages([]);
      localStorage.removeItem(conversationStorageKey(uid));
      notify('Conversación archivada', { type: 'info' });
    } catch (error) {
      console.error('Error al archivar:', error);
      notify('No se pudo archivar la conversación', { type: 'error' });
    }
  };

  const handleUnarchive = async (id: string) => {
    if (!uid) return;
    try {
      await archiveLailaConversation(id, false);
      setCurrentConversationId(id);
      localStorage.setItem(conversationStorageKey(uid), id);
      setArchivedPreviewId(null);
      setActiveTab(0);
      notify('Conversación restaurada', { type: 'info' });
    } catch {
      notify('No se pudo restaurar la conversación', { type: 'error' });
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
          
          <Tooltip title="Nuevo Chat">
            <IconButton onClick={handleNewChat} color="primary" sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
              <AddIcon />
            </IconButton>
          </Tooltip>

          {currentConversationId && (
            <Tooltip title="Archivar chat actual">
              <IconButton
                onClick={handleArchive}
                color="warning"
                disabled={sending}
                sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              >
                <ArchiveIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<ChatIcon sx={{ fontSize: 18, mr: 1 }} />} iconPosition="start" label="Chat Actual" />
          <Tab icon={<HistoryIcon sx={{ fontSize: 18, mr: 1 }} />} iconPosition="start" label={`Archivados (${archivedConversations.length})`} />
        </Tabs>
      </Box>

      {activeTab === 0 && conversations.length > 0 && (
        <FormControl size="small" sx={{ mb: 2, minWidth: 280 }}>
          <InputLabel id="openlaila-conversation-label">Conversación activa</InputLabel>
          <Select
            labelId="openlaila-conversation-label"
            label="Conversación activa"
            value={currentConversationId ?? ''}
            onChange={(event) => {
              const conversationId = event.target.value;
              setCurrentConversationId(conversationId);
              if (uid) localStorage.setItem(conversationStorageKey(uid), conversationId);
            }}
          >
            {conversations.map((conversation) => (
              <MenuItem key={conversation.id} value={conversation.id}>
                {conversation.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 320px)',
          minHeight: 420,
          overflow: 'hidden',
          bgcolor: isDark ? '#1e1e1e' : '#fff',
        }}
      >
        {activeTab === 0 ? (
          <>
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
                sx={{ 
                  bgcolor: '#FF6B35', 
                  color: '#fff', 
                  '&:hover': { bgcolor: '#E85A2A' }, 
                  '&.Mui-disabled': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' } 
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {archivedConversations.length === 0 ? (
              <Box sx={{ p: 4, width: '100%', textAlign: 'center' }}>
                <Typography color="text.secondary">No tienes chats archivados.</Typography>
              </Box>
            ) : (
              <>
                <List sx={{ width: { xs: '45%', md: '32%' }, overflowY: 'auto', borderRight: 1, borderColor: 'divider' }}>
                  {archivedConversations.map((conv) => (
                    <ListItem
                      key={conv.id}
                      disablePadding
                      divider
                      secondaryAction={
                        <Tooltip title="Restaurar chat">
                          <IconButton edge="end" onClick={() => handleUnarchive(conv.id)}>
                            <UnarchiveIcon />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemButton
                        selected={archivedPreviewId === conv.id}
                        onClick={() => setArchivedPreviewId(conv.id)}
                      >
                        <ListItemText
                          primary={conv.title}
                          secondary={conv.lastMessageAt.toLocaleString()}
                          sx={{ pr: 4 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                  {archivedPreviewId ? (
                    <Stack spacing={2}>
                      {archivedMessages.length > 0 ? (
                        archivedMessages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            role={message.role}
                            content={message.content}
                            sources={message.sources}
                            isDark={isDark}
                          />
                        ))
                      ) : (
                        <Typography color="text.secondary">Esta conversación no contiene mensajes.</Typography>
                      )}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">
                      Selecciona una conversación para visualizarla.
                    </Typography>
                  )}
                </Box>
              </>
            )}
          </Box>
        )}
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
