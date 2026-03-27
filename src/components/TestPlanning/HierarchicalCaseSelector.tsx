import { useState, useMemo } from 'react';
import {
  Box, Typography, Checkbox, Accordion, AccordionSummary, AccordionDetails,
  TextField, InputAdornment, Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import SearchIcon from '@mui/icons-material/Search';
import { useGetList } from 'react-admin';

const CAT_COLORS: Record<string, string> = {
  Smoke: '#FF6B35',
  Funcionales: '#3CCF91',
  'No Funcionales': '#2196F3',
  Regresión: '#FF9800',
  UAT: '#9C27B0',
};

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
}

export const HierarchicalCaseSelector = ({ value, onChange }: Props) => {
  const [search, setSearch] = useState('');
  const { data: all = [] } = useGetList('test_cases', { pagination: { page: 1, perPage: 1000 } });

  const active = (all as any[]).filter((tc: any) => !tc.projectArchived);

  const filtered = search.trim()
    ? active.filter((tc: any) =>
        (tc.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (tc.testProject || '').toLowerCase().includes(search.toLowerCase())
      )
    : active;

  const grouped = useMemo(() => {
    const g: Record<string, Record<string, any[]>> = {};
    for (const tc of filtered) {
      const p = tc.testProject || 'Sin proyecto';
      const c = tc.category || 'Sin categoría';
      if (!g[p]) g[p] = {};
      if (!g[p][c]) g[p][c] = [];
      g[p][c].push(tc);
    }
    return g;
  }, [filtered]);

  const sel = useMemo(() => new Set(value), [value]);

  const toggleCase = (id: string) =>
    onChange(sel.has(id) ? value.filter(v => v !== id) : [...value, id]);

  const toggleCat = (cases: any[]) => {
    const ids = cases.map((c: any) => c.id);
    const allSel = ids.every((id: string) => sel.has(id));
    onChange(allSel ? value.filter(id => !ids.includes(id)) : [...new Set([...value, ...ids])]);
  };

  const toggleProj = (cats: Record<string, any[]>) => {
    const ids = Object.values(cats).flat().map((c: any) => c.id);
    const allSel = ids.every((id: string) => sel.has(id));
    onChange(allSel ? value.filter(id => !ids.includes(id)) : [...new Set([...value, ...ids])]);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: value.length > 0 ? '#FF6B35' : 'text.secondary' }}>
          {value.length} caso{value.length !== 1 ? 's' : ''} seleccionado{value.length !== 1 ? 's' : ''}
        </Typography>
        {value.length > 0 && (
          <Typography
            variant="body2"
            onClick={() => onChange([])}
            sx={{ fontSize: 12, color: '#FF6B35', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            Limpiar todo
          </Typography>
        )}
      </Box>

      <TextField
        size="small" fullWidth placeholder="Buscar casos o proyectos..."
        value={search} onChange={e => setSearch(e.target.value)} sx={{ mb: 1.5 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }}
      />

      <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
        {Object.entries(grouped).map(([project, cats]) => {
          const allIds = Object.values(cats).flat().map((c: any) => c.id);
          const selCount = allIds.filter((id: string) => sel.has(id)).length;
          const allSel = selCount === allIds.length && allIds.length > 0;
          const someSel = selCount > 0 && !allSel;

          return (
            <Accordion key={project} defaultExpanded disableGutters elevation={0}
              sx={{ mb: 1, border: '1px solid #e0e0e0', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, pr: 1 }}>
                  <Checkbox
                    checked={allSel} indeterminate={someSel}
                    onChange={() => toggleProj(cats)} onClick={e => e.stopPropagation()}
                    size="small"
                    sx={{ p: 0.5, '&.Mui-checked,&.MuiCheckbox-indeterminate': { color: '#FF6B35' } }}
                  />
                  <FolderIcon sx={{ color: '#FF6B35', fontSize: 17 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, fontSize: 13 }}>{project}</Typography>
                  <Chip
                    label={`${selCount}/${allIds.length}`} size="small"
                    sx={{ height: 20, fontSize: 11, fontWeight: 700, mr: 1, bgcolor: selCount > 0 ? '#FF6B35' : '#eee', color: selCount > 0 ? '#fff' : '#888' }}
                  />
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                {Object.entries(cats).map(([cat, cases]) => {
                  const color = CAT_COLORS[cat] || '#777';
                  const cIds = cases.map((c: any) => c.id);
                  const cSel = cIds.filter((id: string) => sel.has(id)).length;

                  return (
                    <Box key={cat} sx={{ mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1, py: 0.4, bgcolor: color + '18', borderRadius: 1 }}>
                        <Checkbox
                          checked={cSel === cIds.length && cIds.length > 0}
                          indeterminate={cSel > 0 && cSel < cIds.length}
                          onChange={() => toggleCat(cases)} size="small"
                          sx={{ p: 0.5, '&.Mui-checked,&.MuiCheckbox-indeterminate': { color } }}
                        />
                        <FolderIcon sx={{ color, fontSize: 14 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, fontSize: 12, color }}>{cat}</Typography>
                        <Chip label={`${cSel}/${cIds.length}`} size="small"
                          sx={{ height: 17, fontSize: 10, fontWeight: 600, bgcolor: color + '28', color, mr: 1 }} />
                      </Box>

                      {cases.map((tc: any) => (
                        <Box key={tc.id}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 4, py: 0.25, borderRadius: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                          onClick={() => toggleCase(tc.id)}
                        >
                          <Checkbox checked={sel.has(tc.id)} size="small"
                            onClick={e => e.stopPropagation()} onChange={() => toggleCase(tc.id)}
                            sx={{ p: 0.5, '&.Mui-checked': { color } }}
                          />
                          <Typography variant="body2" sx={{ flex: 1, fontSize: 12 }}>{tc.name}</Typography>
                          {tc.priority && (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10, mr: 1 }}>{tc.priority}</Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  );
                })}
              </AccordionDetails>
            </Accordion>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {search ? 'Sin resultados para la búsqueda' : 'No hay casos de prueba disponibles'}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
