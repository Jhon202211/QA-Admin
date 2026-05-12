import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { DragEvent } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VideocamIcon from '@mui/icons-material/Videocam';
import type { EvidenceFile, EvidenceGroup, EvidenceGroupType } from '../../types/testCase';
import { ALLOWED_EVIDENCE_EXTENSIONS } from '../../services/evidenceService';
import { EvidencePreview } from './EvidencePreview';
import { flattenEvidenceGroups, normalizeEvidenceGroups } from './evidenceGroups';

interface EvidenceManagerProps {
  title: string;
  groups: EvidenceGroup[];
  onGroupsChange: (groups: EvidenceGroup[]) => void;
  uploadProgress: number | null;
  deletingPath: string | null;
  isDragging: boolean;
  onDraggingChange: (value: boolean) => void;
  onUpload: (file: File, groupId: string) => Promise<void>;
  onDeleteEvidence: (evidence: EvidenceFile) => Promise<void>;
}

const DEFAULT_GROUP_ID = 'default';

const reorderGroups = (groups: EvidenceGroup[]) =>
  groups.map((group, index) => ({ ...group, order: index }));

const moveItem = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export const EvidenceManager = ({
  title,
  groups,
  onGroupsChange,
  uploadProgress,
  deletingPath,
  isDragging,
  onDraggingChange,
  onUpload,
  onDeleteEvidence,
}: EvidenceManagerProps) => {
  const orderedGroups = normalizeEvidenceGroups(groups);
  const totalEvidences = flattenEvidenceGroups(orderedGroups).length;
  const activeGroupId = orderedGroups[0]?.id || DEFAULT_GROUP_ID;

  const handleCreateGroup = (type: EvidenceGroupType) => {
    const name = window.prompt(type === 'cycle' ? 'Nombre del ciclo de prueba' : 'Nombre de la carpeta');
    if (!name?.trim()) return;

    onGroupsChange(
      reorderGroups([
        ...orderedGroups,
        {
          id: `${type}-${Date.now()}`,
          name: name.trim(),
          type,
          order: orderedGroups.length,
          evidences: [],
        },
      ])
    );
  };

  const handleRenameGroup = (group: EvidenceGroup) => {
    const name = window.prompt('Nuevo nombre', group.name);
    if (!name?.trim()) return;

    onGroupsChange(
      orderedGroups.map((item) =>
        item.id === group.id ? { ...item, name: name.trim() } : item
      )
    );
  };

  const handleDeleteGroup = (group: EvidenceGroup) => {
    if (orderedGroups.length === 1) return;
    const shouldDelete = window.confirm(
      `¿Eliminar "${group.name}"? Sus evidencias se moverán a "General" para no perder archivos.`
    );
    if (!shouldDelete) return;

    const remaining = orderedGroups.filter((item) => item.id !== group.id);
    const firstGroup = remaining[0];
    const next = remaining.map((item) =>
      item.id === firstGroup.id
        ? { ...item, evidences: [...(item.evidences || []), ...(group.evidences || [])] }
        : item
    );

    onGroupsChange(reorderGroups(next));
  };

  const handleMoveGroup = (index: number, direction: -1 | 1) => {
    const to = index + direction;
    if (to < 0 || to >= orderedGroups.length) return;
    onGroupsChange(reorderGroups(moveItem(orderedGroups, index, to)));
  };

  const handleMoveEvidence = (evidence: EvidenceFile, targetGroupId: string) => {
    onGroupsChange(
      orderedGroups.map((group) => {
        const withoutEvidence = (group.evidences || []).filter((item) => item.path !== evidence.path);
        if (group.id === targetGroupId) {
          return { ...group, evidences: [...withoutEvidence, evidence] };
        }
        return { ...group, evidences: withoutEvidence };
      })
    );
  };

  const handleMoveEvidenceOrder = (group: EvidenceGroup, evidenceIndex: number, direction: -1 | 1) => {
    const to = evidenceIndex + direction;
    if (to < 0 || to >= group.evidences.length) return;

    onGroupsChange(
      orderedGroups.map((item) =>
        item.id === group.id
          ? { ...item, evidences: moveItem(item.evidences || [], evidenceIndex, to) }
          : item
      )
    );
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDraggingChange(false);
    if (uploadProgress !== null) return;
    const file = event.dataTransfer.files[0];
    if (file) void onUpload(file, activeGroupId);
  };

  return (
    <Box
      onDragOver={(event) => {
        event.preventDefault();
        if (!isDragging) onDraggingChange(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) onDraggingChange(false);
      }}
      onDrop={handleDrop}
      sx={{
        borderRadius: 2,
        outline: isDragging ? '2px dashed #FF6B35' : '2px dashed transparent',
        bgcolor: isDragging ? 'rgba(255,107,53,0.04)' : 'transparent',
        transition: 'outline 0.15s, background-color 0.15s',
        p: isDragging ? 0.5 : 0,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2">
          {title}
          {totalEvidences > 0 && (
            <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              ({totalEvidences})
            </Typography>
          )}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button size="small" variant="text" startIcon={<AddIcon />} onClick={() => handleCreateGroup('folder')} sx={{ textTransform: 'none' }}>
            Carpeta
          </Button>
          <Button size="small" variant="text" startIcon={<AddIcon />} onClick={() => handleCreateGroup('cycle')} sx={{ textTransform: 'none' }}>
            Ciclo
          </Button>
        </Stack>
      </Stack>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        Formatos: JPG, JPEG, PNG, MP4 · Máximo 200 MB
      </Typography>

      {uploadProgress !== null && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Subiendo archivo...
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {Math.round(uploadProgress)}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{ height: 6, borderRadius: 999, bgcolor: 'rgba(255,107,53,0.15)', '& .MuiLinearProgress-bar': { bgcolor: '#FF6B35' } }}
          />
        </Box>
      )}

      <Stack spacing={1.5}>
        {orderedGroups.map((group, groupIndex) => (
          <Card key={group.id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, gap: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  <FolderIcon sx={{ color: group.type === 'cycle' ? '#4B3C9D' : '#FF6B35', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {group.name}
                  </Typography>
                  <Chip size="small" label={group.type === 'cycle' ? 'Ciclo' : 'Carpeta'} variant="outlined" />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {(group.evidences || []).length}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.25}>
                  <Tooltip title="Subir posición">
                    <span>
                      <IconButton size="small" disabled={groupIndex === 0} onClick={() => handleMoveGroup(groupIndex, -1)}>
                        <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Bajar posición">
                    <span>
                      <IconButton size="small" disabled={groupIndex === orderedGroups.length - 1} onClick={() => handleMoveGroup(groupIndex, 1)}>
                        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Editar nombre">
                    <IconButton size="small" onClick={() => handleRenameGroup(group)}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar grupo">
                    <span>
                      <IconButton size="small" disabled={orderedGroups.length === 1} onClick={() => handleDeleteGroup(group)}>
                        <DeleteOutlineIcon sx={{ fontSize: 16, color: orderedGroups.length === 1 ? 'inherit' : '#f44336' }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={uploadProgress !== null ? <CircularProgress size={14} /> : <AttachFileIcon />}
                    onClick={() => document.getElementById(`evidence-input-${group.id}`)?.click()}
                    disabled={uploadProgress !== null}
                    sx={{ textTransform: 'none', borderColor: '#FF6B35', color: '#FF6B35', ml: 0.5 }}
                  >
                    Cargar
                  </Button>
                  <input
                    id={`evidence-input-${group.id}`}
                    type="file"
                    accept={ALLOWED_EVIDENCE_EXTENSIONS}
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void onUpload(file, group.id);
                      event.target.value = '';
                    }}
                  />
                </Stack>
              </Stack>

              {(group.evidences || []).length > 0 ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1.5 }}>
                  {group.evidences.map((ev, evidenceIndex) => (
                    <Box
                      key={ev.path}
                      sx={{
                        position: 'relative',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        bgcolor: 'background.paper',
                        '&:hover .evidence-actions': { opacity: 1 },
                      }}
                    >
                      {ev.mimeType === 'video/mp4' ? (
                        <Stack alignItems="center" justifyContent="center" spacing={0.5} sx={{ p: 1.5, minHeight: 90 }}>
                          <VideocamIcon sx={{ fontSize: 32, color: '#1E88E5' }} />
                          <Typography variant="caption" sx={{ wordBreak: 'break-all', textAlign: 'center', fontSize: 10, lineHeight: 1.3 }}>
                            {ev.name}
                          </Typography>
                        </Stack>
                      ) : (
                        <EvidencePreview evidence={ev} height={90} />
                      )}

                      <Stack
                        className="evidence-actions"
                        direction="row"
                        justifyContent="center"
                        spacing={0.25}
                        sx={{ position: 'absolute', bottom: 35, left: 0, right: 0, bgcolor: 'rgba(0,0,0,0.55)', opacity: 0, transition: 'opacity 0.2s', py: 0.5 }}
                      >
                        <Tooltip title="Abrir en nueva pestaña">
                          <IconButton size="small" component="a" href={ev.url} target="_blank" rel="noopener noreferrer" sx={{ color: '#fff', p: 0.4 }}>
                            <OpenInNewIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Subir evidencia">
                          <span>
                            <IconButton size="small" disabled={evidenceIndex === 0} onClick={() => handleMoveEvidenceOrder(group, evidenceIndex, -1)} sx={{ color: '#fff', p: 0.4 }}>
                              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Bajar evidencia">
                          <span>
                            <IconButton size="small" disabled={evidenceIndex === group.evidences.length - 1} onClick={() => handleMoveEvidenceOrder(group, evidenceIndex, 1)} sx={{ color: '#fff', p: 0.4 }}>
                              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Eliminar evidencia">
                          <IconButton size="small" onClick={() => onDeleteEvidence(ev)} disabled={deletingPath === ev.path} sx={{ color: '#f44336', p: 0.4 }}>
                            {deletingPath === ev.path ? <CircularProgress size={14} sx={{ color: '#f44336' }} /> : <DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ p: 0.75 }}>
                        <DriveFileMoveIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <FormControl size="small" fullWidth>
                          <Select value={group.id} onChange={(event) => handleMoveEvidence(ev, String(event.target.value))} sx={{ fontSize: 11, height: 26 }}>
                            {orderedGroups.map((item) => (
                              <MenuItem key={item.id} value={item.id}>
                                {item.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ border: '2px dashed', borderColor: isDragging ? '#FF6B35' : 'divider', borderRadius: 2, p: 2.5, textAlign: 'center', color: isDragging ? '#FF6B35' : 'text.disabled' }}>
                  <AttachFileIcon sx={{ fontSize: 28, mb: 0.5, opacity: isDragging ? 0.8 : 0.4 }} />
                  <Typography variant="caption" display="block">
                    {isDragging ? 'Suelta aquí para adjuntar' : 'Sin evidencias en este grupo'}
                  </Typography>
                  {!isDragging && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.6 }}>
                      Arrastra, pega (Ctrl+V) o usa el botón Cargar
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};
