import { Box, Typography, Tabs, Tab, Button } from '@mui/material';
import { useState } from 'react';
import { AutomatedMetrics } from './AutomatedMetrics';
import { ManualMetrics } from './ManualMetrics';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

export const Dashboard = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleExportPDF = async () => {
    const input = document.getElementById('dashboard-content');
    if (!input) return;
    
    try {
      const canvas = await html2canvas(input, { 
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pageWidth;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`dashboard-${tabValue === 0 ? 'automatizados' : 'manuales'}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
    }
  };

  return (
    <Box sx={{ padding: '20px', backgroundColor: 'transparent' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} width="100%">
        <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportPDF}
          sx={{
            backgroundColor: '#FF6B35',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#E55A2B'
            }
          }}
        >
          Exportar a PDF
        </Button>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Automatizados" />
          <Tab label="Pruebas Manuales" />
        </Tabs>
      </Box>
      <Box id="dashboard-content">
        <TabPanel value={tabValue} index={0}>
          <AutomatedMetrics />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <ManualMetrics />
        </TabPanel>
      </Box>
    </Box>
  );
}; 