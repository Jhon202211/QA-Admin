import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNotify } from 'react-admin';
import {
  ALLOWED_KNOWLEDGE_EXTENSIONS,
  KNOWLEDGE_CATEGORY_META,
  deleteKnowledgeDoc,
  fetchKnowledgeDocText,
  listKnowledgeDocs,
  replaceKnowledgeDoc,
  resolveKnowledgeReadUrl,
  saveKnowledgeDocText,
  setKnowledgeDocEnabled,
  uploadKnowledgeDoc,
  type KnowledgeCategory,
  type LailaKnowledgeDoc,
} from '../../services/lailaKnowledgeAdminService';
import { getS3Config } from '../../services/evidenceService';
import { lailaKnowledgeService } from '../../services/lailaKnowledgeService';
import { knowledgeService } from '../../services/knowledgeService';

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const refreshIndexes = async () => {
  await Promise.all([lailaKnowledgeService.reinitialize(), knowledgeService.reinitialize()]);
};

const CategoryTable = ({
  title,
  description,
  docs,
  expectedCount,
  onToggle,
  onOpen,
  onReplace,
  onDelete,
}: {
  title: string;
  description: string;
  docs: LailaKnowledgeDoc[];
  expectedCount: number;
  onToggle: (doc: LailaKnowledgeDoc, enabled: boolean) => void;
  onOpen: (doc: LailaKnowledgeDoc, mode: 'view' | 'edit') => void;
  onReplace: (doc: LailaKnowledgeDoc) => void;
  onDelete: (doc: LailaKnowledgeDoc) => void;
}) => {
  const isPdf = (docMeta: LailaKnowledgeDoc) => docMeta.name.toLowerCase().endsWith('.pdf');
  const countColor =
    docs.length === expectedCount ? 'success' : docs.length < expectedCount ? 'warning' : 'default';

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto', mb: 2 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Chip size="small" color={countColor} label={`${docs.length} / ${expectedCount}`} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>

      {docs.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No hay documentos en este bloque. Súbelos a S3 o créalos editando y guardando contenido.
          </Typography>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Origen</TableCell>
              <TableCell>Tamaño</TableCell>
              <TableCell align="center">Activo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {docs.map((docMeta) => (
              <TableRow key={docMeta.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {docMeta.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={
                      docMeta.source === 's3'
                        ? 'S3'
                        : docMeta.inlineContent
                          ? 'Firestore'
                          : 'Sin archivo'
                    }
                    color={docMeta.source === 's3' || docMeta.inlineContent ? 'default' : 'warning'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{formatBytes(docMeta.size)}</TableCell>
                <TableCell align="center">
                  <Switch
                    checked={docMeta.enabled}
                    onChange={(_, checked) => onToggle(docMeta, checked)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={isPdf(docMeta) ? 'Ver PDF' : 'Ver contenido'}>
                    <IconButton size="small" onClick={() => onOpen(docMeta, 'view')}>
                      <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!isPdf(docMeta) && (
                    <Tooltip title="Editar contenido">
                      <IconButton size="small" onClick={() => onOpen(docMeta, 'edit')}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Reemplazar archivo (S3)">
                    <IconButton size="small" onClick={() => onReplace(docMeta)}>
                      <UploadFileIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton color="error" size="small" onClick={() => onDelete(docMeta)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export const KnowledgeBasePage = () => {
  const notify = useNotify();
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<LailaKnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadCategory, setUploadCategory] = useState<KnowledgeCategory>('plataforma');
  const [selectedDoc, setSelectedDoc] = useState<LailaKnowledgeDoc | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [documentContent, setDocumentContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [replacingDoc, setReplacingDoc] = useState<LailaKnowledgeDoc | null>(null);
  const s3Ready = Boolean(getS3Config());

  const plataformaDocs = useMemo(
    () => docs.filter((d) => d.category === 'plataforma'),
    [docs]
  );
  const historialDocs = useMemo(
    () => docs.filter((d) => d.category === 'historial_reglas'),
    [docs]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await listKnowledgeDocs());
    } catch (e) {
      console.error(e);
      notify('No se pudo cargar el catálogo de conocimiento', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    if (!s3Ready) {
      notify('Configura AWS S3 en Configuración → Integraciones antes de subir archivos', {
        type: 'warning',
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      for (const file of Array.from(fileList)) {
        await uploadKnowledgeDoc(file, uploadCategory, setProgress);
      }
      await refreshIndexes();
      notify('Documento(s) subidos a la base de conocimiento', { type: 'success' });
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error al subir el archivo', { type: 'error' });
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleToggle = async (docMeta: LailaKnowledgeDoc, enabled: boolean) => {
    try {
      await setKnowledgeDocEnabled(docMeta.id, enabled);
      setDocs((prev) => prev.map((d) => (d.id === docMeta.id ? { ...d, enabled } : d)));
      await refreshIndexes();
    } catch {
      notify('No se pudo actualizar el documento', { type: 'error' });
    }
  };

  const handleDelete = async (docMeta: LailaKnowledgeDoc) => {
    if (!window.confirm(`¿Eliminar "${docMeta.name}" de la base de conocimiento?`)) return;
    try {
      await deleteKnowledgeDoc(docMeta);
      await refreshIndexes();
      notify('Documento eliminado', { type: 'info' });
      await refresh();
    } catch {
      notify('No se pudo eliminar el documento', { type: 'error' });
    }
  };

  const isPdf = (docMeta: LailaKnowledgeDoc) => docMeta.name.toLowerCase().endsWith('.pdf');

  const handleOpenDocument = async (docMeta: LailaKnowledgeDoc, mode: 'view' | 'edit') => {
    if (isPdf(docMeta)) {
      try {
        const url = await resolveKnowledgeReadUrl(docMeta);
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (e) {
        notify(e instanceof Error ? e.message : 'No se pudo abrir el PDF', { type: 'error' });
      }
      return;
    }

    setSelectedDoc(docMeta);
    setDialogMode(mode);
    setDocumentContent('');
    setLoadingContent(true);
    try {
      setDocumentContent(await fetchKnowledgeDocText(docMeta));
    } catch (e) {
      if (mode === 'edit') {
        setDocumentContent('');
        notify(
          'Sin contenido remoto. Puedes pegar el texto y guardar (Firestore) o subir el archivo a S3.',
          { type: 'warning' }
        );
      } else {
        notify(e instanceof Error ? e.message : 'No se pudo cargar el contenido', { type: 'error' });
        setSelectedDoc(null);
      }
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSaveContent = async () => {
    if (!selectedDoc) return;
    setSavingContent(true);
    try {
      await saveKnowledgeDocText(selectedDoc, documentContent);
      await refreshIndexes();
      notify('Contenido actualizado correctamente', { type: 'success' });
      setSelectedDoc(null);
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo guardar el contenido', {
        type: 'error',
      });
    } finally {
      setSavingContent(false);
    }
  };

  const handleReplaceClick = (docMeta: LailaKnowledgeDoc) => {
    if (!s3Ready) {
      notify('Configura AWS S3 para reemplazar archivos', { type: 'warning' });
      return;
    }
    setReplacingDoc(docMeta);
    replaceInputRef.current?.click();
  };

  const handleReplace = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !replacingDoc) return;
    setUploading(true);
    setProgress(0);
    try {
      await replaceKnowledgeDoc(replacingDoc, file, setProgress);
      await refreshIndexes();
      notify('Documento reemplazado correctamente', { type: 'success' });
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo reemplazar el documento', {
        type: 'error',
      });
    } finally {
      setUploading(false);
      setProgress(0);
      setReplacingDoc(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ pt: { xs: 1.5, sm: 3 }, pr: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pl: 0 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif" }}>
            Base de conocimiento
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Catálogo en Firestore; archivos en S3. Alimenta el chatbot y el agente de casos de prueba.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <Chip
            label={s3Ready ? 'S3 configurado' : 'S3 no configurado'}
            color={s3Ready ? 'success' : 'warning'}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="kb-upload-category-label">Bloque al subir</InputLabel>
            <Select
              labelId="kb-upload-category-label"
              label="Bloque al subir"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as KnowledgeCategory)}
            >
              <MenuItem value="plataforma">{KNOWLEDGE_CATEGORY_META.plataforma.label}</MenuItem>
              <MenuItem value="historial_reglas">{KNOWLEDGE_CATEGORY_META.historial_reglas.label}</MenuItem>
            </Select>
          </FormControl>
          <Button startIcon={<RefreshIcon />} onClick={() => void refresh()} disabled={loading}>
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            sx={{ backgroundColor: '#FF6B35', '&:hover': { backgroundColor: '#e55a28' } }}
          >
            Subir documento
          </Button>
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            accept={ALLOWED_KNOWLEDGE_EXTENSIONS.join(',')}
            onChange={(e) => void handleUpload(e.target.files)}
          />
          <input
            ref={replaceInputRef}
            type="file"
            hidden
            accept={ALLOWED_KNOWLEDGE_EXTENSIONS.join(',')}
            onChange={(e) => void handleReplace(e.target.files)}
          />
        </Stack>
      </Box>

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {loading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <>
          <CategoryTable
            title={KNOWLEDGE_CATEGORY_META.plataforma.label}
            description={KNOWLEDGE_CATEGORY_META.plataforma.description}
            docs={plataformaDocs}
            expectedCount={KNOWLEDGE_CATEGORY_META.plataforma.expectedCount}
            onToggle={(doc, enabled) => void handleToggle(doc, enabled)}
            onOpen={(doc, mode) => void handleOpenDocument(doc, mode)}
            onReplace={handleReplaceClick}
            onDelete={(doc) => void handleDelete(doc)}
          />
          <CategoryTable
            title={KNOWLEDGE_CATEGORY_META.historial_reglas.label}
            description={KNOWLEDGE_CATEGORY_META.historial_reglas.description}
            docs={historialDocs}
            expectedCount={KNOWLEDGE_CATEGORY_META.historial_reglas.expectedCount}
            onToggle={(doc, enabled) => void handleToggle(doc, enabled)}
            onOpen={(doc, mode) => void handleOpenDocument(doc, mode)}
            onReplace={handleReplaceClick}
            onDelete={(doc) => void handleDelete(doc)}
          />
        </>
      )}

      <Dialog
        open={Boolean(selectedDoc)}
        onClose={() => !savingContent && setSelectedDoc(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {dialogMode === 'edit' ? 'Editar' : 'Ver'}: {selectedDoc?.name}
        </DialogTitle>
        <DialogContent dividers>
          {loadingContent ? (
            <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <TextField
              value={documentContent}
              onChange={(event) => setDocumentContent(event.target.value)}
              fullWidth
              multiline
              minRows={20}
              maxRows={28}
              slotProps={{ input: { readOnly: dialogMode === 'view' } }}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: 13,
                  lineHeight: 1.5,
                },
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedDoc(null)} disabled={savingContent}>
            Cerrar
          </Button>
          {dialogMode === 'edit' && (
            <Button
              variant="contained"
              onClick={() => void handleSaveContent()}
              disabled={loadingContent || savingContent}
              sx={{
                backgroundColor: '#FF6B35',
                '&:hover': { backgroundColor: '#e55a28' },
              }}
            >
              {savingContent ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
