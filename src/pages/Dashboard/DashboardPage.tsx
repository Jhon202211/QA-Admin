import { Card, CardContent, Typography, Grid, Box, List, ListItem, ListItemText, Button } from '@mui/material';
import { useGetList } from 'react-admin';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import React, { useState } from 'react';

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
  const recentTests = testResults.slice(0, 5);
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
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  // Calcular tests por semana (últimas 3 semanas o rango seleccionado)
  const now = new Date();
  const baseResults = (startDate || endDate) ? filteredResults : testResults;
  const weeks = [2, 1, 0].map(i => {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - (i * 7));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  });
  const weeklyData = weeks.map(({ start, end }) => {
    const count = baseResults.filter(test => {
      const d = test.date ? new Date(test.date) : null;
      return d && d >= start && d <= end;
    }).length;
    return {
      semana: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      ejecuciones: count
    };
  }).reverse();

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
            const pageHeight = pdf.internal.pageSize.getHeight();
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
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ minHeight: 440, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom sx={{ color: '#2B2D42' }}>
                Éxito vs Fallos
              </Typography>
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flex={1}>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={140} label>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <Box mt={4}>
                  <Typography variant="body2" align="center" color="textSecondary">
                    Total de pruebas: <b>{total}</b> | Exitosas: <b>{passedTests}</b> | Fallidas: <b>{failedTests}</b>
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ minHeight: 420, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography color="textSecondary" gutterBottom sx={{ color: '#2B2D42' }}>
                Ejecuciones por rango de fecha
              </Typography>
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
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weeklyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ejecuciones" stroke="#4B3C9D" strokeWidth={3} />
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