import { Box, Typography, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import { AutomatedMetrics } from './AutomatedMetrics';
import { ManualMetrics } from './ManualMetrics';

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

export const Dashboard = () => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box sx={{ padding: '20px', backgroundColor: 'transparent' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} width="100%">
        <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
          Dashboard
        </Typography>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Automatizados" />
          <Tab label="Pruebas Manuales" />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <AutomatedMetrics />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ManualMetrics />
      </TabPanel>
    </Box>
  );
}; 