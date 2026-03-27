import { Box, Typography, Tabs, Tab, Button } from '@mui/material';
import { useState } from 'react';
import { AutomatedMetrics } from './AutomatedMetrics';
import { ManualMetrics } from './ManualMetrics';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { startOfDay, endOfDay } from 'date-fns';

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

export const Dashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [startDate, setStartDate] = useState<Date | null>(startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfDay(new Date()));

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
      pdf.save(`dashboard-${tabValue === 0 ? 'manuales' : 'automatizados'}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
    }
  };

  return (
    <Box sx={{ pt: { xs: '12px', sm: '20px' }, pr: { xs: '12px', sm: '20px' }, pb: { xs: '12px', sm: '20px' }, pl: 0, backgroundColor: 'transparent' }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={1}
        mb={2}
        width="100%"
      >
        <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 700, fontFamily: "'Ubuntu Sans', sans-serif", fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportPDF}
          size="small"
          sx={{
            backgroundColor: '#FF6B35',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '8px',
            alignSelf: { xs: 'flex-start', sm: 'auto' },
            '&:hover': {
              backgroundColor: '#E55A2B'
            }
          }}
        >
          Exportar a PDF
        </Button>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Pruebas Manuales" />
          <Tab label="Automatizados" />
        </Tabs>
      </Box>

      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <DatePicker
            label="Desde"
            value={startDate}
            onChange={(date) => setStartDate(date ? startOfDay(date) : null)}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="Hasta"
            value={endDate}
            onChange={(date) => setEndDate(date ? endOfDay(date) : null)}
            minDate={startDate ?? undefined}
            slotProps={{ textField: { size: 'small' } }}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setStartDate(startOfDay(new Date()));
              setEndDate(endOfDay(new Date()));
            }}
            sx={{ textTransform: 'none', borderColor: '#FF6B35', color: '#FF6B35', '&:hover': { borderColor: '#E55A2B', backgroundColor: 'rgba(255,107,53,0.05)' } }}
          >
            Hoy
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => { setStartDate(null); setEndDate(null); }}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Ver todos
          </Button>
        </Box>
      </LocalizationProvider>

      <Box id="dashboard-content">
        <TabPanel value={tabValue} index={0}>
          <ManualMetrics startDate={startDate} endDate={endDate} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <AutomatedMetrics startDate={startDate} endDate={endDate} />
        </TabPanel>
      </Box>
    </Box>
  );
}; 