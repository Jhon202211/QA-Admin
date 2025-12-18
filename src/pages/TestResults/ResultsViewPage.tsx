import { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { TestResultsList } from './TestResultsPage';
import { ManualTestResultsList } from './ManualTestResultsList';

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

export const ResultsViewPage = (props: any) => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box sx={{ paddingTop: '20px', paddingRight: '20px', paddingBottom: '20px' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
        Vista de Resultados
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Automatizados" />
          <Tab label="Manuales" />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <TestResultsList />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ManualTestResultsList />
      </TabPanel>
    </Box>
  );
};

