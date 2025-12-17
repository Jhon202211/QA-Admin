import { Card, CardContent, Typography, Grid, Box, List, ListItem, ListItemText, Button } from '@mui/material';
import { useGetList } from 'react-admin';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { differenceInCalendarDays, startOfDay, endOfDay, format } from 'date-fns';

const COLORS = ['#3CCF91', '#e53935'];

export const Dashboard = () => {
  const { data: testResults = [], total } = useGetList('test_results', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'date', order: 'DESC' }
  });

  const passedTests = testResults.filter(test => test.status === 'passed').length;
  const failedTests = testResults.filter(test => test.status === 'failed').length;
  const successRate = total ? ((passedTests / total) * 100).toFixed(2) : '0';
  const avgDuration = testResults.length ? (testResults.reduce((acc, t) => acc + (t.duration || 0), 0) / testResults.length).toFixed(2) : '0';
  const recentTests = [...testResults]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  const recentErrors = testResults.filter(test => test.status === 'failed' && test.error).slice(0, 5);

  const pieData = [
    { name: 'Exitosas', value: passedTests },
    { name: 'Fallidas', value: failedTests }
  ];

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Filtrar testResults por rango de fechas seleccionado
  const filteredResults = testResults.filter(test => {
    if (!test.date) return false;
    const d = new Date(test.date);
    if (startDate && d < startOfDay(startDate)) return false;
    if (endDate && d > endOfDay(endDate)) return false;
    return true;
  });

  // --- Nueva lógica: solo mostrar días seleccionados, o solo hoy si no hay selección ---
  let chartData: any[] = [];

  if (startDate && endDate) {
    const days = differenceInCalendarDays(endOfDay(endDate), startOfDay(startDate)) + 1;
    const daysArr = Array.from({ length: days }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
    chartData = daysArr.map(d => {
      const count = filteredResults.filter(test => {
        const tDate = test.date ? new Date(test.date) : null;
        return tDate && tDate >= startOfDay(d) && tDate <= endOfDay(d);
      }).length;
      return {
        día: format(d, 'd/M/yyyy'),
        ejecuciones: count
      };
    });
  } else {
    // Sin rango: solo mostrar el día de hoy
    const today = startOfDay(new Date());
    chartData = [{
      día: format(today, 'd/M/yyyy'),
      ejecuciones: testResults.filter(test => {
        const tDate = test.date ? new Date(test.date) : null;
        return tDate && tDate >= today && tDate <= endOfDay(today);
      }).length
    }];
  }

  return (
    <div style={{ padding: '20px' }} id="dashboard-pdf-export">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" gutterBottom sx={{ color: '#2B2D42' }}>
          Dashboard
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ backgroundColor: '#4B3C9D', color: '#fff', '&:hover': { backgroundColor: '#3a2e7a' } }}
          onClick={async () => {
            const input = document.getElementById('dashboard-pdf-export');
            if (!input) return;
            const canvas = await html2canvas(input, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pageWidth;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('dashboard.pdf');
          }}
        >
          Exportar a PDF
        </Button>
      </Box>
      <Grid container spacing={3}>
        {/* Fila 1: Gráfica de pastel y gráfica de línea */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ minHeight: 440, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: 400, height: 400, mx: 'auto' }}>
            <CardContent sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 0 }}>
              <Typography color="textSecondary" gutterBottom sx={{ color: '#2B2D42', mt: 2 }}>
                Éxito vs Fallos
              </Typography>
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flex={1} width="100%" height="100%">
                <ResponsiveContainer width={350} height={320}>
                  <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                    <Pie 
                      data={pieData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={100}
                      labelLine={{ stroke: '#2B2D42', strokeWidth: 1 }}
                      label={({ value, percent }: any) => `${value} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
                <Box mt={2}>
                  <Typography variant="body2" align="center" color="textSecondary">
                    Total de pruebas: <b>{total}</b> | Exitosas: <b>{passedTests}</b> | Fallidas: <b>{failedTests}</b>
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ minHeight: 440, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: 400, height: 400, mx: 'auto' }}>
            <CardContent sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 0 }}>
              <Typography color="textSecondary" gutterBottom sx={{ color: '#2B2D42', mt: 2 }}>
                Ejecuciones por rango de fecha
              </Typography>
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flex={1} width="100%" height="100%">
                <Box display="flex" gap={2} mb={2}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                      label="Fecha inicio"
                      value={startDate}
                      onChange={setStartDate}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                    <DatePicker
                      label="Fecha fin"
                      value={endDate}
                      onChange={setEndDate}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </LocalizationProvider>
                </Box>
                <ResponsiveContainer width={350} height={320}>
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="día" 
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      width={40}
                      domain={[0, 'auto']}
                    />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="ejecuciones" 
                      name="Ejecuciones" 
                      stroke="#4B3C9D" 
                      strokeWidth={2} 
                      dot={{ r: 4 }}
                      activeDot={{ r: 6, stroke: '#4B3C9D', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Fila 2: KPIs pequeñas */}
      <Box mt={3} display="flex" justifyContent="flex-start" alignItems="stretch" gap={2}>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: '#2B2D42' }}>
              % Éxito
            </Typography>
            <Typography variant="h5" sx={{ color: '#3CCF91' }}>
              {successRate}%
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: '#2B2D42' }}>
              Prom. Duración (s)
            </Typography>
            <Typography variant="h5">
              {avgDuration}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: '#2B2D42' }}>
              Total de Pruebas
            </Typography>
            <Typography variant="h5">
              {total}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: '#2B2D42' }}>
              Exitosas
            </Typography>
            <Typography variant="h5" sx={{ color: '#3CCF91' }}>
              {passedTests}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: '#2B2D42' }}>
              Fallidas
            </Typography>
            <Typography variant="h5" sx={{ color: '#e53935' }}>
              {failedTests}
            </Typography>
          </CardContent>
        </Card>
      </Box>
      {/* Lista de pruebas recientes */}
      <Box mt={4}>
        <Typography variant="h6" sx={{ color: '#2B2D42' }}>Pruebas Recientes</Typography>
        <List>
          {recentTests.map((test, idx) => (
            <ListItem key={idx} divider>
              <ListItemText
                primary={`${test.name || 'Sin nombre'} (${test.status})`}
                secondary={`Duración: ${test.duration || 0}s | Fecha: ${test.date ? new Date(test.date).toLocaleString() : 'Sin fecha'}`}
              />
            </ListItem>
          ))}
        </List>
      </Box>
      {/* Lista de errores recientes */}
      <Box mt={4}>
        <Typography variant="h6" sx={{ color: '#e53935' }}>Errores Recientes</Typography>
        <List>
          {recentErrors.length === 0 && <ListItem><ListItemText primary="Sin errores recientes" /></ListItem>}
          {recentErrors.map((test, idx) => (
            <ListItem key={idx} divider>
              <ListItemText
                primary={test.name || 'Sin nombre'}
                secondary={test.error}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </div>
  );
}; 