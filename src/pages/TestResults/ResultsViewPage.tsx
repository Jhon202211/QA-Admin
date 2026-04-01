import { Box, Typography } from '@mui/material';
import { ManualTestResultsList } from './ManualTestResultsList';

export const ResultsViewPage = () => {
  return (
    <Box sx={{ pt: { xs: '12px', sm: '20px' }, pr: { xs: '12px', sm: '20px' }, pb: { xs: '12px', sm: '20px' } }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif" }}>
        Vista de Resultados (Manuales)
      </Typography>
      <Box sx={{ mt: 3 }}>
        <ManualTestResultsList />
      </Box>
    </Box>
  );
};
