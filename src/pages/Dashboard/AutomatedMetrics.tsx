import { Card, CardContent, Typography, Grid, Box, List, ListItem, ListItemText } from '@mui/material';
import { useGetList } from 'react-admin';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { differenceInCalendarDays, startOfDay, endOfDay, format } from 'date-fns';

const COLORS = ['#FF6B35', '#4A90E2'];

interface AutomatedMetricsProps {
  startDate?: Date | null;
  endDate?: Date | null;
}

export const AutomatedMetrics = ({ startDate, endDate }: AutomatedMetricsProps) => {
  const { data: allResults = [], total } = useGetList('test_results', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'date', order: 'DESC' }
  });

  const filteredResults = (startDate && endDate)
    ? allResults.filter(test => {
        if (!test.date) return false;
        const d = new Date(test.date);
        return d >= startDate && d <= endDate;
      })
    : allResults;

  const passedTests = filteredResults.filter(test => test.status === 'passed').length;
  const failedTests = filteredResults.filter(test => test.status === 'failed').length;
  const totalFiltered = filteredResults.length;
  const successRate = totalFiltered ? ((passedTests / totalFiltered) * 100).toFixed(2) : '0';
  const avgDuration = filteredResults.length
    ? (filteredResults.reduce((acc, t) => acc + (t.duration || 0), 0) / filteredResults.length).toFixed(2)
    : '0';

  const recentTests = [...filteredResults]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  const recentErrors = filteredResults.filter(test => test.status === 'failed' && test.error).slice(0, 5);

  const pieData = [
    { name: 'Exitosas', value: passedTests },
    { name: 'Fallidas', value: failedTests }
  ];

  let chartData: any[] = [];
  if (startDate && endDate) {
    const days = differenceInCalendarDays(endOfDay(endDate), startOfDay(startDate)) + 1;
    chartData = Array.from({ length: days }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const count = filteredResults.filter(test => {
        const tDate = test.date ? new Date(test.date) : null;
        return tDate && tDate >= startOfDay(d) && tDate <= endOfDay(d);
      }).length;
      return { día: format(d, 'd/M/yyyy'), ejecuciones: count };
    });
  } else {
    const today = startOfDay(new Date());
    chartData = [{
      día: format(today, 'd/M/yyyy'),
      ejecuciones: allResults.filter(test => {
        const tDate = test.date ? new Date(test.date) : null;
        return tDate && tDate >= today && tDate <= endOfDay(today);
      }).length
    }];
  }

  return (
    <>
      <Grid container spacing={3} width="100%">
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ minHeight: 440, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <CardContent sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 0 }}>
              <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', mt: 2, fontWeight: 600, fontFamily: "'Ubuntu Sans', sans-serif" }}>
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
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
                <Box mt={2}>
                  <Typography variant="body2" align="center" color="textSecondary">
                    Total: <b>{totalFiltered}</b> | Exitosas: <b>{passedTests}</b> | Fallidas: <b>{failedTests}</b>
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ minHeight: 440, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <CardContent sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 0 }}>
              <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', mt: 2, fontWeight: 600, fontFamily: "'Ubuntu Sans', sans-serif" }}>
                Ejecuciones por fecha
              </Typography>
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flex={1} width="100%" height="100%">
                <ResponsiveContainer width={350} height={320}>
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="día" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={40} domain={[0, 'auto']} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="ejecuciones"
                      name="Ejecuciones"
                      stroke="#FF6B35"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#FF6B35' }}
                      activeDot={{ r: 6, stroke: '#FF6B35', strokeWidth: 2, fill: '#FFFFFF' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3} display="flex" justifyContent="flex-start" alignItems="stretch" gap={2}>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: "'Ubuntu Sans', sans-serif" }}>
              % Éxito
            </Typography>
            <Typography variant="h5" sx={{ color: '#3CCF91', fontWeight: 600 }}>
              {successRate}%
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: "'Ubuntu Sans', sans-serif" }}>
              Prom. Duración (s)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {avgDuration}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: "'Ubuntu Sans', sans-serif" }}>
              Total de Pruebas
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {total}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: "'Ubuntu Sans', sans-serif" }}>
              Exitosas
            </Typography>
            <Typography variant="h5" sx={{ color: '#3CCF91', fontWeight: 600 }}>
              {passedTests}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom sx={{ color: 'text.primary', fontWeight: 500, fontFamily: "'Ubuntu Sans', sans-serif" }}>
              Fallidas
            </Typography>
            <Typography variant="h5" sx={{ color: '#E53935', fontWeight: 600 }}>
              {failedTests}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box mt={4}>
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, fontFamily: "'Ubuntu Sans', sans-serif" }}>Pruebas Recientes</Typography>
        <List>
          {recentTests.length === 0 && <ListItem><ListItemText primary="Sin pruebas en el rango seleccionado" /></ListItem>}
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

      <Box mt={4}>
        <Typography variant="h6" sx={{ color: '#E53935', fontWeight: 600, fontFamily: "'Ubuntu Sans', sans-serif" }}>Errores Recientes</Typography>
        <List>
          {recentErrors.length === 0 && <ListItem><ListItemText primary="Sin errores recientes" /></ListItem>}
          {recentErrors.map((test, idx) => (
            <ListItem key={idx} divider>
              <ListItemText primary={test.name || 'Sin nombre'} secondary={test.error} />
            </ListItem>
          ))}
        </List>
      </Box>
    </>
  );
};
